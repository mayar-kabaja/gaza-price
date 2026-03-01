import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** POST /api/auth/login — Admin login. Proxy to backend POST /auth/login. */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Email and password required" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: String(email).trim(), password: String(password) }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { accessToken?: string; access_token?: string; error?: string; message?: string };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "LOGIN_FAILED", message: data.message ?? "Invalid credentials" },
        { status: res.status }
      );
    }
    // Normalize: backend returns accessToken (camelCase), some clients expect access_token
    const token = data.accessToken ?? data.access_token;
    return NextResponse.json(token ? { access_token: token, ...data } : data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
