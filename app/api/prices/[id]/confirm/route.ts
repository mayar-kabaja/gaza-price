import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl } from "@/lib/api/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: priceId } = await params;
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
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "خطأ في التأكيد";
    const isTimeout = rawMessage.includes("aborted") || rawMessage.includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "GATEWAY_TIMEOUT" : "SERVER_ERROR", message: "انتهت المهلة، جرّب مرة أخرى" },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
