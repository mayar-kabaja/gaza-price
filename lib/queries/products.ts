/**
 * Products data from backend only (no Supabase).
 */
import type { Product } from "@/types/app";
import {
  getProductById as apiGetProduct,
  searchProducts as apiSearchProducts,
  getProductsFirstCategory as apiGetProductsFirstCategory,
} from "@/lib/api/products";

export async function getProductById(id: string): Promise<Product | null> {
  return apiGetProduct(id);
}

export async function getProductsFirstCategory(
  limit = 10,
  offset = 0,
  search?: string
): Promise<{ products: Product[]; total: number }> {
  return apiGetProductsFirstCategory(limit, offset, search);
}

export async function searchProducts(
  search?: string,
  categoryId?: string,
  limit = 10,
  offset = 0
): Promise<{ products: Product[]; total: number }> {
  return apiSearchProducts(search, categoryId, limit, offset);
}
