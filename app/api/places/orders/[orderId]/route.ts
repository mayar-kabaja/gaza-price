import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const url = `${API}/places/orders/${orderId}`;
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const url = `${API}/places/orders/${orderId}/cancel`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
    const res = await fetch(url, { method: "PATCH", headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}
