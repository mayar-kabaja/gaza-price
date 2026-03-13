"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  queryKeys,
  fetchAreas,
  fetchBootstrap,
  fetchCategories,
  fetchSectionsWithCategories,
  fetchPublicStats,
  fetchProducts,
  fetchProduct,
  fetchPrices,
  fetchContributorMe,
  fetchContributorMeReports,
  fetchReports,
  fetchAdminStats,
  fetchAdminPendingProducts,
  fetchAdminFlags,
} from "@/lib/queries/fetchers";
import { apiFetch, apiFetchAdmin } from "@/lib/api/fetch";
import { setStoredToken } from "@/lib/auth/token";

// ── Bootstrap (combined areas + categories + sections in one request) ──
export function useBootstrap() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: async () => {
      const data = await fetchBootstrap();
      // Seed individual caches so useAreas/useCategories/useSectionsWithCategories find data already there
      queryClient.setQueryData(queryKeys.areas, data.areas);
      queryClient.setQueryData(queryKeys.categories, data.categories);
      queryClient.setQueryData(queryKeys.sections, data.sections);
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1h
  });
}

// ── Areas ──
export function useAreas(options?: { retry?: number }) {
  return useQuery({
    queryKey: queryKeys.areas,
    queryFn: fetchAreas,
    staleTime: 5 * 60 * 1000, // 5 min — areas change rarely
    ...(options?.retry != null ? { retry: options.retry } : {}),
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

// ── Sections (with nested categories) ──
export function useSectionsWithCategories() {
  return useQuery({
    queryKey: queryKeys.sections,
    queryFn: fetchSectionsWithCategories,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Public stats (categories, products, prices counts) ──
export function usePublicStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: fetchPublicStats,
    staleTime: 2 * 60 * 1000, // 2 min
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

/** Infinite products list for a category (cached per category). With embedPricePreview, each product includes price_preview. Pass areaId to filter prices by user's area. */
export function useProductsInfinite(
  categoryId: string | null,
  search?: string,
  embedPricePreview = true,
  areaId?: string | null,
  pageSize: number = PRODUCTS_PAGE_SIZE
) {
  return useInfiniteQuery({
    queryKey: queryKeys.products({
      categoryId: categoryId ?? undefined,
      search,
      limit: pageSize,
      embedPricePreview,
      areaId: areaId ?? undefined,
    }),
    queryFn: async ({ pageParam = 0 }) => {
      return fetchProducts({
        categoryId: categoryId ?? undefined,
        search,
        limit: pageSize,
        offset: pageParam as number,
        embedPricePreview,
        areaId: areaId ?? undefined,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.products.length, 0);
      if (lastPage.products.length < pageSize || loaded >= lastPage.total) return undefined;
      return loaded;
    },
    initialPageParam: 0,
    enabled: !!categoryId,
    staleTime: 2 * 60 * 1000, // 2 min — show cached data instantly on category switch
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: queryKeys.product(id ?? ""),
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });
}

export function useProductsSearch(search: string, limit = 10, areaId?: string | null) {
  return useQuery({
    queryKey: queryKeys.productsSearch(search, limit, areaId ?? undefined),
    queryFn: () => fetchProducts({ search, limit, areaId: areaId ?? undefined }),
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
      if (lastPage.reports.length < MY_REPORTS_PAGE_SIZE || loaded >= lastPage.total) return undefined;
      return loaded;
    },
    initialPageParam: 0,
    staleTime: 60 * 1000,
  });
}

// ── Reports (infinite, cached) ──
const REPORTS_PAGE_SIZE = 20;

export function useReportsInfinite(filter: string, areaId?: string | null, demoLast?: boolean, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.reports(filter, areaId, REPORTS_PAGE_SIZE),
    queryFn: async ({ pageParam }) =>
      fetchReports({
        filter,
        areaId,
        limit: REPORTS_PAGE_SIZE,
        offset: pageParam as number,
        demoLast,
      }),
    staleTime: 60 * 1000,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    enabled,
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
    staleTime: 60 * 1000, // 1 min
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
      // Merge PATCH response into cached profile so UI updates instantly
      const cached = queryClient.getQueryData(queryKeys.contributorMe) as Record<string, unknown> | undefined;
      if (cached) {
        const merged = { ...cached };
        if (data.display_handle !== undefined) merged.handle = data.display_handle;
        if (data.area !== undefined) merged.area = data.area;
        queryClient.setQueryData(queryKeys.contributorMe, merged);
      }
      // Also re-fetch for full consistency
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
      store_phone?: string;
      store_address?: string;
      receipt_photo_url?: string | null;
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
    mutationFn: async (payload: {
      name_ar: string;
      category_id: string;
      unit?: string;
      unit_size: number;
      suggestion_note?: string;
      price: number;
      area_id: string;
      store_name_raw?: string;
      store_phone?: string;
      store_address?: string;
      receipt_photo_url?: string | null;
      headers?: Record<string, string>;
    }) => {
      const { headers: customHeaders, ...body } = payload;
      const res = await apiFetch("/api/products/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...customHeaders },
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
      queryClient.invalidateQueries({ queryKey: ["contributors", "me", "reports"] });
    },
  });
}

// ── Admin dashboard ──
export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => fetchAdminStats(),
    staleTime: 60 * 1000,
  });
}

export function useAdminPendingProducts(limit = 6, offset = 0) {
  return useQuery({
    queryKey: queryKeys.adminPendingProducts(limit, offset),
    queryFn: () => fetchAdminPendingProducts(limit, offset),
    staleTime: 60 * 1000,
  });
}

export function useAdminFlags(limit = 5, offset = 0) {
  return useQuery({
    queryKey: queryKeys.adminFlags(limit, offset),
    queryFn: () => fetchAdminFlags(limit, offset),
    staleTime: 60 * 1000,
  });
}

export function useReviewProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await apiFetchAdmin(`/api/admin/products/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw { status: res.status, data };
      return { id, action };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats });
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-products"] });
    },
  });
}
