import { createClient } from "@/lib/supabase/server";
import { Price } from "@/types/app";
import { markLowest, calcStats } from "@/lib/price";

export async function getPricesByProduct(
  productId: string,
  areaId?: string,
  sort: "price_asc" | "trust_desc" | "recent" = "price_asc",
  limit = 20,
  offset = 0
) {
  const supabase = await createClient();

  let query = supabase
    .from("prices")
    .select("*, store:stores(*), area:areas(*), product:products(*)", { count: "exact" })
    .eq("product_id", productId)
    .in("status", ["pending", "confirmed"])
    .gt("expires_at", new Date().toISOString())
    .range(offset, offset + limit - 1);

  if (areaId) query = query.eq("area_id", areaId);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "trust_desc") query = query.order("trust_score", { ascending: false });
  else query = query.order("reported_at", { ascending: false });

  const { data, count, error } = await query;
  if (error) throw error;

  const prices = markLowest(data ?? []);
  const stats = calcStats(data ?? []);

  return { prices, stats, total: count ?? 0 };
}

export async function getPriceById(id: string): Promise<Price | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prices")
    .select("*, store:stores(*), area:areas(*), product:products(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getFlaggedPrices(limit = 20, offset = 0) {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("prices")
    .select("*, product:products(*), area:areas(*), price_flags(*)", { count: "exact" })
    .eq("status", "flagged")
    .order("reported_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { prices: data ?? [], total: count ?? 0 };
}
