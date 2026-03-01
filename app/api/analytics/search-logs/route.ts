import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** POST /api/analytics/search-logs — Create a search log. Public (no auth). */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  let body: { query?: string; product_id?: string; area_id?: string; count_result?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const query = body?.query?.trim();
  if (!query || query.length > 100) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "query required (max 100 chars)" },
      { status: 400 }
    );
  }
  if (!body?.area_id) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "area_id required" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(`${base}/analytics/search-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query,
        product_id: body.product_id ?? null,
        area_id: body.area_id,
        count_result: body.count_result ?? 0,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        data?.message ? { error: data.error ?? "API_ERROR", message: data.message } : data,
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
