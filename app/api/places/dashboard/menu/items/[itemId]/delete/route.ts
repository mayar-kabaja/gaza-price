import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const url = `${API}/places/dashboard/menu/items/${itemId}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "PROXY_ERROR", message: "تعذر الاتصال بالخادم" }, { status: 502 });
  }
}
