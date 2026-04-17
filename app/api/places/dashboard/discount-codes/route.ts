import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API}/places/dashboard/discount-codes${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API}/places/dashboard/discount-codes${qs ? `?${qs}` : ""}`;
  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}
