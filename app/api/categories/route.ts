import { NextResponse } from "next/server";
import { getCategories } from "@/lib/api/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر تحميل التصنيفات";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
