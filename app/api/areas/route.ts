import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getAreasFromBackend } from "@/lib/api/areas";
import { getAreas } from "@/lib/queries/areas";

export const revalidate = 86400; // 24h cache

export async function GET(req: NextRequest) {
  const apiBase = getApiBaseUrl();
  try {
    const areas = apiBase
      ? await getAreasFromBackend(req.nextUrl.searchParams.get("governorate") ?? undefined)
      : await getAreas();
    return NextResponse.json({ areas });
  } catch (err) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
