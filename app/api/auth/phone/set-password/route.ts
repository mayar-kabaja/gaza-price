import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** POST /api/auth/phone/set-password — Set password (requires JWT) */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }
    const res = await fetch(`${base}/auth/phone/set-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set password";
    return NextResponse.json({ error: "SET_PASSWORD_FAILED", message }, { status: 500 });
  }
}
