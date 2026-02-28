import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "الاقتراح غير متاح حالياً" },
      { status: 503 }
    );
  }
  const token = getTokenFromRequest(req);
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const url = `${base}${base.endsWith("/") ? "" : "/"}products/suggest`;
  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
