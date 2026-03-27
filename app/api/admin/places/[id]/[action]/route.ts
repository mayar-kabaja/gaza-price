import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.text();
  const res = await fetch(`${base}/admin/places/${id}/${action}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body || undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
