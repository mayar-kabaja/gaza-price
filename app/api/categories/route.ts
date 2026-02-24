import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getCategories } from "@/lib/api/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return NextResponse.json([]);
  }
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (err) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "تعذر تحميل التصنيفات" },
      { status: 500 }
    );
  }
}
