import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ codeId: string }> }) {
  const { codeId } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API}/places/dashboard/discount-codes/${codeId}${qs ? `?${qs}` : ""}`;
  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ codeId: string }> }) {
  const { codeId } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API}/places/dashboard/discount-codes/${codeId}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}
