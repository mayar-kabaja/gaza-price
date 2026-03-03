import { NextResponse } from "next/server";
import { getSectionsWithCategories } from "@/lib/api/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sections = await getSectionsWithCategories();
    return NextResponse.json(sections);
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر تحميل التصنيفات";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
