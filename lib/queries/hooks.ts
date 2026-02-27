"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  queryKeys,
  fetchAreas,
  fetchCategories,
  fetchProducts,
  fetchProduct,
  fetchPrices,
  fetchContributorMe,
} from "@/lib/queries/fetchers";

// ── Areas ──
export function useAreas() {
  return useQuery({
    queryKey: queryKeys.areas,
    queryFn: fetchAreas,
    staleTime: 5 * 60 * 1000, // 5 min — areas change rarely
  });
}

// ── Categories ──
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Products (first category only, newest first) ──
export function useProducts(params?: {
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: string | null;
}) {
  const { limit = 10, offset = 0, search, categoryId } = params ?? {};
  return useQuery({
    queryKey: queryKeys.products({ limit, offset, search, categoryId: categoryId ?? undefined }),
    queryFn: () => fetchProducts({ limit, offset, search, categoryId: categoryId ?? undefined }),
    enabled: true,
  });
}

const PRODUCTS_PAGE_SIZE = 10;

/** Infinite products list for a category (cached per category). */
export function useProductsInfinite(categoryId: string | null, search?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.products({
      categoryId: categoryId ?? undefined,
      search,
      limit: PRODUCTS_PAGE_SIZE,
    }),
    queryFn: async ({ pageParam = 0 }) => {
      return fetchProducts({
        categoryId: categoryId ?? undefined,
        search,
        limit: PRODUCTS_PAGE_SIZE,
        offset: pageParam as number,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.products.length, 0);
      if (lastPage.products.length < PRODUCTS_PAGE_SIZE) return undefined;
      return loaded;
    },
    initialPageParam: 0,
    enabled: !!categoryId,
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: queryKeys.product(id ?? ""),
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}

export function useProductsSearch(search: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.productsSearch(search, limit),
    queryFn: () => fetchProducts({ search, limit }),
    enabled: search.trim().length >= 1,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Prices ──
export function usePrices(params: {
  productId: string | null;
  areaId?: string | null;
  sort?: string;
  limit?: number;
  /** Pass from useSession(); wait for session loading to avoid confirmed_by_me flicker. */
  sessionLoading?: boolean;
  accessToken?: string | null;
}) {
  const { productId, areaId, sort = "price_asc", limit = 20, sessionLoading = false, accessToken } = params;
  return useQuery({
    queryKey: queryKeys.prices(productId ?? "", areaId ?? undefined, sort, limit),
    queryFn: () =>
      fetchPrices({
        product_id: productId!,
        area_id: areaId ?? undefined,
        sort,
        limit,
        accessToken,
      }),
    enabled: !!productId && !sessionLoading,
  });
}

// ── Contributor me (for PATCH we use mutation) ──
export function useContributorMe() {
  return useQuery({
    queryKey: queryKeys.contributorMe,
    queryFn: () => fetchContributorMe(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateContributorMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      area_id?: string;
      display_handle?: string | null;
      headers?: Record<string, string>;
    }) => {
      const { headers: customHeaders, ...body } = payload;
      const res = await fetch("/api/contributors/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...customHeaders },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributorMe });
    },
  });
}

// ── Submit report (invalidate prices + product) ──
export function useSubmitReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      product_id: string;
      price: number;
      area_id: string;
      store_name_raw?: string;
      headers?: Record<string, string>;
    }) => {
      const { headers: customHeaders, ...body } = payload;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...customHeaders },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prices(variables.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(variables.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products({}) });
    },
  });
}

// ── Suggest product (name + category + unit + price + area in one call) ──
export function useSuggestProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name_ar: string;
      category_id: string;
      unit?: string;
      unit_size: number;
      suggestion_note?: string;
      price: number;
      area_id: string;
      store_name_raw?: string;
    }) => {
      const res = await fetch("/api/products/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return data as { suggestion_id: string; pending_report_id: string; status: string; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}
