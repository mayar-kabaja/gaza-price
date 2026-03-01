"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name_ar: string;
  unit?: string;
  unit_size?: number;
  category?: { name_ar: string; icon?: string };
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const prevSearchRef = useRef(search);
  const limit = 20;

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), all: "1" });
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d?.products ?? []);
        setTotal(d?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (prevSearchRef.current !== search) {
      prevSearchRef.current = search;
      setOffset(0);
      return;
    }
    load();
  }, [search, offset]);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search products (optional)..."
            className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] placeholder-[#4E6070] outline-none focus:border-[#4A7C59]"
          />
          <button
            onClick={() => load()}
            className="rounded-lg bg-[#4A7C59] px-4 py-2 text-sm font-medium text-white hover:bg-[#3A6347]"
          >
            Search
          </button>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-[#243040] bg-[#111820]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#4E6070]">
              {search.trim() ? "No products found. Try a different search." : "No products yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#243040]">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Product</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Category</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">Unit</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#4E6070]">View</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-[#243040] hover:bg-[#18212C]">
                      <td className="px-5 py-3 text-sm font-medium text-[#D8E4F0]">{p.name_ar}</td>
                      <td className="px-5 py-3 text-xs text-[#8FA3B8]">{p.category?.name_ar ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-[#4E6070]">{p.unit ?? "—"} {p.unit_size ?? ""}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/product/${p.id}`}
                          target="_blank"
                          className="text-[11px] text-[#6BA880] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {total > limit && (
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-[#4E6070]">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-[#243040] bg-[#18212C] px-4 py-2 text-sm text-[#D8E4F0] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
}
