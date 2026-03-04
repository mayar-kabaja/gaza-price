import { NextResponse } from "next/server";
import { apiGet } from "@/lib/api/client";

export const revalidate = 3600; // 1h cache

export async function GET() {
  try {
    const data = await apiGet<{ areas: unknown[]; categories: unknown[]; sections: unknown[] }>("/bootstrap");
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
