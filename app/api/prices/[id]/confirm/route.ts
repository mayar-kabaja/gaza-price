import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, logAttempt } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { getApiBaseUrl, apiPost } from "@/lib/api/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: priceId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
  }

  const contributorId = user.id;

  // Rate limit check (applies whether we use backend or DB)
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

  const backendBase = getApiBaseUrl();
  if (backendBase) {
    // Proxy to backend API: POST /reports/:id/confirm with x-anon-session-id
    try {
      const data = await apiPost<{ confirmed?: boolean; new_confirmation_count?: number; new_trust_score?: number; new_status?: string }>(
        `/reports/${priceId}/confirm`,
        undefined,
        { "x-anon-session-id": contributorId }
      );
      await logAttempt({ table: "confirmation_attempts", contributorId, success: true, extraData: { price_id: priceId } });
      return NextResponse.json({
        confirmed: data?.confirmed ?? true,
        new_confirmation_count: data?.new_confirmation_count ?? 0,
        new_trust_score: data?.new_trust_score ?? 0,
        new_status: data?.new_status ?? "pending",
      }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ في التأكيد";
      const is404 = message.startsWith("API 404");
      const is4xx = message.startsWith("API 4");
      const status = is404 ? 404 : is4xx ? 400 : 500;
      return NextResponse.json(
        { error: "SERVER_ERROR", message: message.replace(/^API \d+: /, ""), detail: message },
        { status }
      );
    }
  }

  // No backend: use Supabase (DB) directly
  const { data: price, error: priceError } = await supabase
    .from("prices")
    .select("reported_by")
    .eq("id", priceId)
    .single();

  if (priceError) {
    console.error("[confirm] price fetch error:", priceError.code, priceError.message, priceError.details);
    return NextResponse.json(
      {
        error: "NOT_FOUND",
        message: "السعر غير موجود",
        detail: priceError.message,
        code: priceError.code,
      },
      { status: 404 }
    );
  }
  if (!price) return NextResponse.json({ error: "NOT_FOUND", message: "السعر غير موجود" }, { status: 404 });
  if (price.reported_by === contributorId) {
    return NextResponse.json({ error: "CANNOT_CONFIRM_OWN", message: "لا يمكن تأكيد تقريرك الخاص" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("price_confirmations")
    .select("id")
    .eq("price_id", priceId)
    .eq("confirmed_by", contributorId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "ALREADY_CONFIRMED", message: "أكّدت هذا السعر سابقاً" }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from("price_confirmations")
    .insert({ price_id: priceId, confirmed_by: contributorId });

  if (insertError) {
    console.error("[confirm] insert error:", insertError.code, insertError.message);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "خطأ في التأكيد", detail: insertError.message, code: insertError.code },
      { status: 500 }
    );
  }

  const { count: newCount } = await supabase
    .from("price_confirmations")
    .select("id", { count: "exact", head: true })
    .eq("price_id", priceId);

  const count = newCount ?? 0;
  await logAttempt({ table: "confirmation_attempts", contributorId, success: true, extraData: { price_id: priceId } });

  return NextResponse.json({
    confirmed: true,
    new_confirmation_count: count,
    new_trust_score: Math.min(count * 20, 100),
    new_status: count >= 3 ? "confirmed" : "pending",
  });
}
