import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/auth/token";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Proxies to backend POST /auth/session. Backend creates/validates anonymous Supabase session.
 * Optional: send Authorization: Bearer <token> to validate existing token; otherwise backend creates new session.
 */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const token = getTokenFromRequest(req);
  const body = token ? { access_token: token } : {};
  try {
    const res = await fetch(`${base}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        data?.message ? { error: data.error ?? "SESSION_ERROR", message: data.message } : data,
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session error";
    return NextResponse.json(
      { error: "SESSION_ERROR", message },
      { status: 500 }
    );
  }
}
