import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/supabase/get-auth-from-request";
import { checkRateLimit, logAttempt } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { getApiBaseUrl, apiPost } from "@/lib/api/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: priceId } = await params;
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
  }
  const { user, accessToken, supabase } = auth;
  const contributorId = user.id;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

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
    try {
      const data = await apiPost<{ confirmed?: boolean; new_confirmation_count?: number; new_trust_score?: number; new_status?: string }>(
        `/reports/${priceId}/confirm`,
        undefined,
        authHeaders,
        { timeoutMs: 60000 }
      );
      await logAttempt({ table: "confirmation_attempts", contributorId, success: true, extraData: { price_id: priceId } });
      return NextResponse.json({
        confirmed: data?.confirmed ?? true,
        new_confirmation_count: data?.new_confirmation_count ?? 0,
        new_trust_score: data?.new_trust_score ?? 0,
        new_status: data?.new_status ?? "pending",
      }, { status: 201 });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "خطأ في التأكيد";
      const isTimeout = rawMessage.includes("aborted") || rawMessage.includes("timeout");
      const is404 = rawMessage.startsWith("API 404");
      const is4xx = rawMessage.startsWith("API 4");
      const status = isTimeout ? 504 : is404 ? 404 : is4xx ? 400 : 500;
      const timeoutMessage = "انتهت المهلة، جرّب مرة أخرى";
      if (isTimeout) {
        return NextResponse.json(
          { error: "GATEWAY_TIMEOUT", message: timeoutMessage, detail: rawMessage },
          { status: 504 }
        );
      }
      const jsonMatch = rawMessage.match(/^API \d+: (\s*\{[\s\S]*\})$/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim()) as { error?: string; message?: string };
          return NextResponse.json(
            { error: parsed.error ?? "BAD_REQUEST", message: parsed.message ?? rawMessage.replace(/^API \d+: /, "") },
            { status }
          );
        } catch {
          // fall through
        }
      }
      return NextResponse.json(
        { error: "SERVER_ERROR", message: rawMessage.replace(/^API \d+: /, ""), detail: rawMessage },
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
