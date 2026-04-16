import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

function headers(token?: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** GET /api/chat/conversations/[id]/messages — get messages (also marks read) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });

  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول" }, { status: 401 });

  try {
    const res = await fetch(`${base}/chat/conversations/${id}/messages`, {
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

/** POST /api/chat/conversations/[id]/messages — send a message */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" }, { status: 503 });

  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED", message: "يجب تسجيل الدخول" }, { status: 401 });

  const body = await req.json();

  try {
    const res = await fetch(`${base}/chat/conversations/${id}/messages`, {
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
