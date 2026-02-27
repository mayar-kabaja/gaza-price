import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth/token";
import { getApiBaseUrl, apiPost } from "@/lib/api/client";

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
  try {
    const data = await apiPost<{
      confirmed?: boolean;
      new_confirmation_count?: number;
      new_trust_score?: number;
      new_status?: string;
    }>(`/reports/${priceId}/confirm`, undefined, { Authorization: `Bearer ${token}` }, { timeoutMs: 60000 });
    return NextResponse.json(
      {
        confirmed: data?.confirmed ?? true,
        new_confirmation_count: data?.new_confirmation_count ?? 0,
        new_trust_score: data?.new_trust_score ?? 0,
        new_status: data?.new_status ?? "pending",
      },
      { status: 201 }
    );
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "خطأ في التأكيد";
    const isTimeout = rawMessage.includes("aborted") || rawMessage.includes("timeout");
    const is404 = rawMessage.startsWith("API 404");
    const is4xx = rawMessage.startsWith("API 4");
    const status = isTimeout ? 504 : is404 ? 404 : is4xx ? 400 : 500;
    if (isTimeout) {
      return NextResponse.json(
        { error: "GATEWAY_TIMEOUT", message: "انتهت المهلة، جرّب مرة أخرى" },
        { status: 504 }
      );
    }
    const jsonMatch = rawMessage.match(/^API \d+: (\s*\{[\s\S]*\})$/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim()) as { error?: string; message?: string };
        return NextResponse.json(
          {
            error: parsed.error ?? "BAD_REQUEST",
            message: parsed.message ?? rawMessage.replace(/^API \d+: /, ""),
          },
          { status }
        );
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
