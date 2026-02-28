import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { SubmitPriceRequest } from "@/types/api";
import { getApiBaseUrl, apiPost } from "@/lib/api/client";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export type ReportFilter = "all" | "my_area" | "today" | "trusted";

/** GET — Proxy to backend reports feed. Optional Bearer for is_confirmed_by_me. */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const areaId = searchParams.get("area_id")?.trim() || undefined;
  const filter = (searchParams.get("filter") as ReportFilter) || "all";
  const limit = Math.min(Number(searchParams.get("limit")) || PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Number(searchParams.get("offset")) || 0;

  const token = getTokenFromRequest(req);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const params: Record<string, string | number> = {
      filter: filter === "my_area" ? "all" : filter,
      limit,
      offset,
    };
    if (filter === "my_area" && areaId) params.area_id = areaId;
    else if (areaId) params.area_id = areaId;

    const url = `${base}/reports?${new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString()}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(25000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        data?.message ? { error: data.error ?? "SERVER_ERROR", message: data.message } : data,
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
  }
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const body: SubmitPriceRequest = await req.json();

  const missing =
    !body.product_id ||
    !body.area_id ||
    (body.price === undefined || body.price === null || body.price === "");
  if (missing) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "بيانات ناقصة" }, { status: 400 });
  }
  const priceNum = Number(body.price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "السعر يجب أن يكون أكبر من صفر" },
      { status: 400 }
    );
  }

  try {
    const data = await apiPost<{ id?: string; status?: string; trust_score?: number; expires_at?: string }>(
      "/reports",
      {
        product_id: body.product_id,
        price: priceNum,
        currency: body.currency ?? "ILS",
        area_id: body.area_id,
        store_id: body.store_id ?? null,
        store_name_raw: body.store_name_raw ?? null,
        receipt_photo_url: body.receipt_photo_url ?? null,
      },
      { Authorization: `Bearer ${token}` }
    );
    return NextResponse.json(
      {
        id: data?.id,
        status: data?.status ?? "pending",
        trust_score: data?.trust_score ?? 0,
        expires_at: data?.expires_at,
        message: "شكراً! سيظهر سعرك بعد التأكيدات.",
      },
      { status: 201 }
    );
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "خطأ في الحفظ";
    const status = rawMessage.startsWith("API 4")
      ? rawMessage.startsWith("API 404")
        ? 404
        : 400
      : 500;
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
        // fall through
      }
    }
    return NextResponse.json(
      { error: "SERVER_ERROR", message: rawMessage.replace(/^API \d+: /, "") },
      { status }
    );
  }
}
