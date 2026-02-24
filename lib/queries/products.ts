import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types/app";

export async function searchProducts(
  search?: string,
  categoryId?: string,
  limit = 10,
  offset = 0
): Promise<{ products: Product[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*, category:categories(*)", { count: "exact" })
    .eq("status", "active")
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("name_ar", `%${search}%`);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return { products: data ?? [], total: count ?? 0 };
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (error) return null;
  return data;
}

export async function getPendingProducts(limit = 20, offset = 0) {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("products")
    .select("*, category:categories(*)", { count: "exact" })
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { products: data ?? [], total: count ?? 0 };
}

export async function approveProduct(id: string, adminId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "active", reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectProduct(id: string, adminId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "rejected", reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function mergeProduct(id: string, mergeInto: string, adminId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      status: "merged",
      merge_into: mergeInto,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
