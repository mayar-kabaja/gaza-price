import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getProductById, searchProducts } from "@/lib/api/products";
import { getProductById as getProductByIdSupabase } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const useBackend = !!getApiBaseUrl();

  let product = useBackend
    ? await getProductById(id)
    : await getProductByIdSupabase(id);

  if (!product && useBackend) {
    const { products } = await searchProducts(undefined, undefined, 30, 0);
    product = products.find((p) => p.id === id) ?? null;
  }

  if (!product) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(product);
}
