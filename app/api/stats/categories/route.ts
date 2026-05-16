import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json([], { status: 503 });
  }

  try {
    // Fetch all prices with their product's category_id
    const res = await fetch(
      `${supabaseUrl}/rest/v1/prices?select=product:products(category_id)&is_demo=is.false`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json([], { status: 500 });
    }

    const data: { product: { category_id: string } | null }[] = await res.json();

    // Count per category
    const counts: Record<string, number> = {};
    for (const row of data) {
      const catId = row.product?.category_id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    }

    const result = Object.entries(counts).map(([category_id, count]) => ({
      category_id,
      count,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
