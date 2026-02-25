import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/supabase/get-auth-from-request";
import { checkRateLimit, logAttempt } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { SubmitPriceRequest } from "@/types/api";
import { getApiBaseUrl, apiPost } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export type ReportFilter = "all" | "my_area" | "today" | "trusted";

/** GET — Community feed: recent prices with product + area + store. Optional auth for is_confirmed_by_me. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const areaId = searchParams.get("area_id")?.trim() || undefined;
  const filter = (searchParams.get("filter") as ReportFilter) || "all";
  const limit = Math.min(Number(searchParams.get("limit")) || PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Number(searchParams.get("offset")) || 0;

  let query = supabase
    .from("prices")
    .select(
      `
      id, product_id, price, currency, store_name_raw,
      trust_score, status,
      reported_at, receipt_photo_url,
      product:products(id, name_ar, unit, unit_size, category:categories(icon, name_ar)),
      store:stores(name_ar),
      area:areas(name_ar)
    `,
      { count: "exact" }
    )
    .in("status", ["pending", "confirmed"])
    .gt("expires_at", new Date().toISOString())
    .order("reported_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (areaId) {
    query = query.eq("area_id", areaId);
  }

  if (filter === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte("reported_at", today.toISOString());
  }

  if (filter === "trusted") {
    query = query.gte("trust_score", 60);
  }

  const { data: rows, count, error } = await query;

  if (error) {
    console.error("[reports] GET error:", error.message);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }

  const reports = (rows ?? []).map((r: Record<string, unknown>) => {
    const product = r.product as { id: string; name_ar: string; unit: string; unit_size: number; category?: { icon: string; name_ar: string } } | null;
    const has_receipt = !!(r.receipt_photo_url as string | null);
    return {
      ...r,
      id: r.id as string,
      product,
      has_receipt,
      confirmation_count: 0 as number,
      is_confirmed_by_me: false as boolean,
    };
  });

  // Confirmation counts from price_confirmations (prices table may not have confirmation_count column)
  if (reports.length > 0) {
    const ids = reports.map((r) => r.id);
    const { data: confirmationRows } = await supabase
      .from("price_confirmations")
      .select("price_id")
      .in("price_id", ids);

    const countByPriceId = new Map<string, number>();
    for (const row of confirmationRows ?? []) {
      const pid = (row as { price_id: string }).price_id;
      countByPriceId.set(pid, (countByPriceId.get(pid) ?? 0) + 1);
    }
    reports.forEach((r) => {
      r.confirmation_count = countByPriceId.get(r.id) ?? 0;
    });
  }

  // Optional: set is_confirmed_by_me when user is logged in
  let userId: string | null = null;
  try {
    const auth = await getAuthFromRequest(req);
    userId = auth.user.id;
  } catch {
    // no session
  }

  if (userId && reports.length > 0) {
    const ids = reports.map((r) => r.id);
    const { data: confirmations } = await supabase
      .from("price_confirmations")
      .select("price_id")
      .eq("confirmed_by", userId)
      .in("price_id", ids);

    const confirmedSet = new Set((confirmations ?? []).map((c: { price_id: string }) => c.price_id));
    reports.forEach((r) => {
      r.is_confirmed_by_me = confirmedSet.has(r.id);
    });
  }

  const total = count ?? 0;
  const next_offset = offset + limit < total ? offset + limit : null;

  return NextResponse.json({
    reports,
    total,
    next_offset,
  });
}

export async function POST(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
  }
  const { user, accessToken, supabase } = auth;
  const contributorId = user.id;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

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
        authHeaders
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
      const rawMessage = err instanceof Error ? err.message : "خطأ في الحفظ";
      const status = rawMessage.startsWith("API 4") ? (rawMessage.startsWith("API 404") ? 404 : 400) : 500;
      // Forward backend 4xx body so frontend can show message (e.g. outlier: "السعر بعيد جداً عن المتوسط")
      const bodyMatch = rawMessage.match(/^API \d+: ([\s\S]+)$/);
      if (bodyMatch) {
        try {
          const parsed = JSON.parse(bodyMatch[1].trim()) as { error?: string; message?: string };
          if (typeof parsed.message === "string" && (parsed.error != null || parsed.message)) {
            return NextResponse.json(
              { error: parsed.error ?? "BAD_REQUEST", message: parsed.message },
              { status }
            );
          }
        } catch {
          // not JSON, fall through to generic message
        }
      }
      return NextResponse.json(
        { error: "SERVER_ERROR", message: rawMessage.replace(/^API \d+: /, ""), detail: rawMessage },
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
