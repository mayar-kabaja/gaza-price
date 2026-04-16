import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const res = await fetch(`${base}/listings/${id}/sold`, {
      method: "PATCH",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ" }, { status: 500 });
  }
}
