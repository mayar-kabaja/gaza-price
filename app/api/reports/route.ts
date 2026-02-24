import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, logAttempt } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { SubmitPriceRequest } from "@/types/api";
import { getApiBaseUrl, apiPost } from "@/lib/api/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
  }

  const contributorId = user.id;

  const body: SubmitPriceRequest = await req.json();

  if (!body.product_id || !body.price || !body.area_id) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "بيانات ناقصة" }, { status: 400 });
  }

  if (body.price <= 0) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "السعر يجب أن يكون أكبر من صفر" }, { status: 400 });
  }

  // Rate limit — 5/hour
  const hourLimit = await checkRateLimit({
    table: "report_attempts",
    contributorId,
    windowHours: 1,
    maxAttempts: RATE_LIMITS.reports_per_hour,
  });

  if (!hourLimit.allowed) {
    await logAttempt({ table: "report_attempts", contributorId, success: false });
    return NextResponse.json(
      { error: "RATE_LIMIT_EXCEEDED", message: "تجاوزت الحد: 5 تقارير/ساعة", retry_after_seconds: hourLimit.retryAfterSeconds },
      { status: 429 }
    );
  }

  // Use backend when NEXT_PUBLIC_API_URL is set
  const backendBase = getApiBaseUrl();
  if (backendBase) {
    try {
      const data = await apiPost<{ id?: string; status?: string; trust_score?: number; expires_at?: string }>(
        "/reports",
        {
          product_id: body.product_id,
          price: body.price,
          currency: body.currency ?? "ILS",
          area_id: body.area_id,
          store_id: body.store_id ?? null,
          store_name_raw: body.store_name_raw ?? null,
          receipt_photo_url: body.receipt_photo_url ?? null,
        },
        { "x-anon-session-id": contributorId }
      );
      await logAttempt({ table: "report_attempts", contributorId, success: true, extraData: { product_id: body.product_id } });
      return NextResponse.json({
        id: data?.id,
        status: data?.status ?? "pending",
        trust_score: data?.trust_score ?? 0,
        expires_at: data?.expires_at,
        message: "شكراً! سيظهر سعرك بعد التأكيدات.",
      }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ في الحفظ";
      const status = message.startsWith("API 4") ? (message.startsWith("API 404") ? 404 : 400) : 500;
      return NextResponse.json(
        { error: "SERVER_ERROR", message: message.replace(/^API \d+: /, ""), detail: message },
        { status }
      );
    }
  }

  // No backend: use Supabase (contributor must exist for FK)
  const { data: contributor } = await supabase
    .from("contributors")
    .select("is_banned, trust_level")
    .eq("id", contributorId)
    .single();

  if (!contributor) {
    return NextResponse.json(
      { error: "ONBOARDING_REQUIRED", message: "يرجى إكمال التهيئة أولاً من الصفحة الرئيسية" },
      { status: 403 }
    );
  }

  if (contributor.is_banned) {
    return NextResponse.json({ error: "BANNED", message: "حسابك محظور" }, { status: 403 });
  }

  const { data: inserted, error } = await supabase
    .from("prices")
    .insert({
      product_id: body.product_id,
      price: body.price,
      currency: body.currency ?? "ILS",
      area_id: body.area_id,
      store_id: body.store_id ?? null,
      store_name_raw: body.store_name_raw ?? null,
      reported_by: contributorId,
      receipt_photo_url: body.receipt_photo_url ?? null,
      status: contributor.trust_level === "trusted" || contributor.trust_level === "verified" ? "confirmed" : "pending",
      trust_score: 0,
      reported_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[reports] insert error:", error.code, error.message, error.details);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "خطأ في الحفظ",
        detail: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }

  await logAttempt({ table: "report_attempts", contributorId, success: true, extraData: { product_id: body.product_id } });

  return NextResponse.json({
    id: inserted.id,
    status: inserted.status,
    trust_score: inserted.trust_score,
    expires_at: inserted.expires_at,
    message: "شكراً! سيظهر سعرك بعد التأكيدات.",
  }, { status: 201 });
}
