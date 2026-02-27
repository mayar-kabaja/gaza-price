import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** GET /api/prices — Pure proxy to backend GET /prices. Forwards Authorization. */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const token = getTokenFromRequest(req);
  const headers: HeadersInit = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");
  const areaId = searchParams.get("area_id") ?? undefined;
  const sort = searchParams.get("sort") ?? "price_asc";
  const limit = searchParams.get("limit") ?? "20";
  const offset = searchParams.get("offset") ?? "0";

  if (!productId) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "product_id مطلوب" }, { status: 400 });
  }

  const params = new URLSearchParams({ product_id: productId, sort, limit, offset });
  if (areaId) params.set("area_id", areaId);
  const url = `${base}/prices?${params.toString()}`;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
