import { NextRequest, NextResponse } from "next/server";
import { getAreas } from "@/lib/queries/areas";

export const revalidate = 86400; // 24h cache

export async function GET(req: NextRequest) {
  const governorate = req.nextUrl.searchParams.get("governorate") as "north" | "central" | "south" | null;
  try {
    const areas = await getAreas(governorate ?? undefined);
    return NextResponse.json({ areas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
