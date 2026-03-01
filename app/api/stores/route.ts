import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export const revalidate = 3600; // 1h cache

/** GET /api/stores — Proxy to backend stores. Public. */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const verified = req.nextUrl.searchParams.get("verified");
  const params = verified ? `?verified=${verified}` : "";
  try {
    const res = await fetch(`${base}/stores${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        data?.message ? { error: data.error ?? "API_ERROR", message: data.message } : data,
        { status: res.status }
      );
    }
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
