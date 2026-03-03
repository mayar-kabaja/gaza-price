import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/api/stats";

export const dynamic = "force-dynamic";
export const revalidate = 60; // 1 min

export async function GET() {
  try {
    const stats = await getPublicStats();
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر تحميل الإحصائيات";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
