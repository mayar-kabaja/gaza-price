import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, logAttempt } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: priceId } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
  }

  const contributorId = session.user.id;

  // Rate limit check
  const { allowed, retryAfterSeconds } = await checkRateLimit({
    table: "confirmation_attempts",
    contributorId,
    windowHours: 1,
    maxAttempts: RATE_LIMITS.confirmations_per_hour,
    extraFilters: {},
  });

  if (!allowed) {
    await logAttempt({ table: "confirmation_attempts", contributorId, success: false, extraData: { price_id: priceId } });
    return NextResponse.json(
      { error: "RATE_LIMIT_EXCEEDED", message: "تجاوزت الحد المسموح", retry_after_seconds: retryAfterSeconds },
      { status: 429 }
    );
  }

  // Check not own report
  const { data: price } = await supabase.from("prices").select("reported_by, confirmation_count, trust_score").eq("id", priceId).single();
  if (!price) return NextResponse.json({ error: "NOT_FOUND", message: "السعر غير موجود" }, { status: 404 });
  if (price.reported_by === contributorId) {
    return NextResponse.json({ error: "CANNOT_CONFIRM_OWN", message: "لا يمكن تأكيد تقريرك الخاص" }, { status: 400 });
  }

  // Check not already confirmed
  const { data: existing } = await supabase
    .from("price_confirmations")
    .select("id")
    .eq("price_id", priceId)
    .eq("confirmed_by", contributorId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "ALREADY_CONFIRMED", message: "أكّدت هذا السعر سابقاً" }, { status: 409 });
  }

  // Insert confirmation
  await supabase.from("price_confirmations").insert({ price_id: priceId, confirmed_by: contributorId });

  // Update count
  const newCount = (price.confirmation_count ?? 0) + 1;
  const newScore = Math.min(price.trust_score + 20, 100);
  await supabase.from("prices").update({ confirmation_count: newCount, trust_score: newScore }).eq("id", priceId);

  await logAttempt({ table: "confirmation_attempts", contributorId, success: true, extraData: { price_id: priceId } });

  return NextResponse.json({
    confirmed: true,
    new_confirmation_count: newCount,
    new_trust_score: newScore,
    new_status: newCount >= 3 ? "confirmed" : "pending",
  });
}
