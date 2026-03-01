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
  fetchContributorMeReports,
  fetchReports,
} from "@/lib/queries/fetchers";
import { apiFetch } from "@/lib/api/fetch";
import { setStoredToken } from "@/lib/auth/token";

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

/** Infinite products list for a category (cached per category). With embedPricePreview, each product includes price_preview (confirmation_count, confirmed_by_me) for home. */
export function useProductsInfinite(categoryId: string | null, search?: string, embedPricePreview = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.products({
      categoryId: categoryId ?? undefined,
      search,
      limit: PRODUCTS_PAGE_SIZE,
      embedPricePreview,
    }),
    queryFn: async ({ pageParam = 0 }) => {
      return fetchProducts({
        categoryId: categoryId ?? undefined,
        search,
        limit: PRODUCTS_PAGE_SIZE,
        offset: pageParam as number,
        embedPricePreview,
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

// ── My reports (contributor's own, infinite) ──
const MY_REPORTS_PAGE_SIZE = 20;

export function useContributorMeReportsInfinite(status: string = "all") {
  return useInfiniteQuery({
    queryKey: queryKeys.contributorMeReports(status, MY_REPORTS_PAGE_SIZE),
    queryFn: async ({ pageParam }) =>
      fetchContributorMeReports({
        status,
        limit: MY_REPORTS_PAGE_SIZE,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.reports.length, 0);
      if (lastPage.reports.length < MY_REPORTS_PAGE_SIZE) return undefined;
      return loaded;
    },
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });
}

// ── Reports (infinite, cached) ──
const REPORTS_PAGE_SIZE = 20;

export function useReportsInfinite(filter: string, areaId?: string | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.reports(filter, areaId, REPORTS_PAGE_SIZE),
    queryFn: async ({ pageParam }) =>
      fetchReports({
        filter,
        areaId,
        limit: REPORTS_PAGE_SIZE,
        offset: pageParam as number,
      }),
    staleTime: 60 * 1000,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
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
export function useContributorMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.contributorMe,
    queryFn: () => fetchContributorMe(),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
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
      const res = await apiFetch("/api/contributors/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...customHeaders },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return data;
    },
    onSuccess: (data) => {
      /** Merge PATCH response into cache so report_count etc. are preserved (PATCH only returns display_handle, area). */
      queryClient.setQueryData(queryKeys.contributorMe, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const o = old as Record<string, unknown>;
        const patch = data as Record<string, unknown>;
        return {
          ...o,
          handle: patch.display_handle ?? o.handle,
          display_handle: patch.display_handle ?? o.display_handle,
          area: patch.area ?? o.area,
        };
      });
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
      const res = await apiFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...customHeaders },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      if (typeof (data as { access_token?: string }).access_token === "string") {
        setStoredToken((data as { access_token: string }).access_token);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prices(variables.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(variables.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products({}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contributorMe });
      queryClient.invalidateQueries({ queryKey: ["contributors", "me", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
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
      const res = await apiFetch("/api/products/suggest", {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.contributorMe });
    },
  });
}
