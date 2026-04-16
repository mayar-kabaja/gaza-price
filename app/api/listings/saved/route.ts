import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json([], { status: 200 });
  try {
    const res = await fetch(`${base}/listings/saved`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
