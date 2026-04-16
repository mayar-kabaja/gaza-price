import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

function headers(token?: string | null) {
  const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const { id } = await params;
  const token = getTokenFromRequest(req);
  try {
    const res = await fetch(`${base}/listings/${id}`, { headers: headers(token), signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json();
  try {
    const res = await fetch(`${base}/listings/${id}`, { method: "PATCH", headers: headers(token), body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "CONFIG" }, { status: 503 });
  const { id } = await params;
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const res = await fetch(`${base}/listings/${id}`, { method: "DELETE", headers: headers(token), signal: AbortSignal.timeout(10000) });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ" }, { status: 500 });
  }
}
