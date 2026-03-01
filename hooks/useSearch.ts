"use client";

import { useState, useEffect, useRef } from "react";
import { Product } from "@/types/app";
import { useProductsSearch } from "@/lib/queries/hooks";
import { useArea } from "@/hooks/useArea";

const DEBOUNCE_MS = 300;

export function useSearch() {
  const { area } = useArea();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      setOpen(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setOpen(true);
      timerRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const { data, isLoading } = useProductsSearch(debouncedQuery, 10, area?.id);
  const results = (data?.products ?? []) as Product[];

  function clear() {
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  }

  return { query, setQuery, results, loading: isLoading, open, setOpen, clear };
}
