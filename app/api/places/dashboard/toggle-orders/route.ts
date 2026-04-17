import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function PATCH(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API}/places/dashboard/toggle-orders${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}
