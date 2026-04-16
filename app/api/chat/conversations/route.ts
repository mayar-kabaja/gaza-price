import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

function headers(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** GET /api/chat/conversations — list my conversations */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });

  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول" }, { status: 401 });

  try {
    const res = await fetch(`${base}/chat/conversations`, {
      headers: headers(token),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" },
      { status: 500 }
    );
  }
}

/** POST /api/chat/conversations — get or create conversation */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });

  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول" }, { status: 401 });

  const body = await req.json();

  try {
    const res = await fetch(`${base}/chat/conversations`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
