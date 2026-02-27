import { NextRequest, NextResponse } from "next/server";
import { getProductsFirstCategory, searchProducts } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("category_id") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 30);
  const offset = Number(searchParams.get("offset") ?? 0);

  try {
    const result = categoryId
      ? await searchProducts(search, categoryId, limit, offset)
      : await getProductsFirstCategory(limit, offset, search);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
