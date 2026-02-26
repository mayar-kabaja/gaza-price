import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(product);
}
