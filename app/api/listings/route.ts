import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

/** GET /api/listings — proxy to backend listings feed */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const token = getTokenFromRequest(req);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${base}/listings?${searchParams.toString()}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" }, { status: 500 });
  }
}

/** POST /api/listings — create a listing (auth required) */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });

  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول" }, { status: 401 });

  const body = await req.json();

  try {
    const res = await fetch(`${base}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" }, { status: 500 });
  }
}
