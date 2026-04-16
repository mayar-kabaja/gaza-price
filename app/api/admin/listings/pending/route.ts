import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  if (searchParams.get("limit")) params.set("limit", searchParams.get("limit")!);
  if (searchParams.get("offset")) params.set("offset", searchParams.get("offset")!);
  try {
    const res = await fetch(`${base}/admin/listings/pending?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ" }, { status: 500 });
  }
}
