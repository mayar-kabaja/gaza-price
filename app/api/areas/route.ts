import { NextResponse } from "next/server";
import { getAreas } from "@/lib/queries/areas";

export const revalidate = 86400; // 24h cache

export async function GET() {
  try {
    const areas = await getAreas();
    return NextResponse.json({ areas });
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR", message: "خطأ في الخادم" }, { status: 500 });
  }
}
