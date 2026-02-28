import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl } from "@/lib/api/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: priceId } = await params;
  let token = getTokenFromRequest(req);

  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }

  // No token → create anonymous session so the user can confirm without reloading
  let sessionCreated = false;
  if (!token) {
    try {
      const sessionRes = await fetch(`${base}/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15000),
      });
      const sessionData = (await sessionRes.json()) as { access_token?: string };
      token = sessionData?.access_token ?? null;
      sessionCreated = !!token;
    } catch {
      // fall through
    }
    if (!token) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "لا توجد جلسة" }, { status: 401 });
    }
  }

  const url = `${base}/prices/${priceId}/confirm`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(60000),
    });
    const data = (await res.json()) as Record<string, unknown>;
    const responsePayload = sessionCreated && token
      ? { ...data, access_token: token }
      : data;
    return NextResponse.json(responsePayload, { status: res.status });
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "خطأ في التأكيد";
    const isTimeout = rawMessage.includes("aborted") || rawMessage.includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "GATEWAY_TIMEOUT" : "SERVER_ERROR", message: "انتهت المهلة، جرّب مرة أخرى" },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
