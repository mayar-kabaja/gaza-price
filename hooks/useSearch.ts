"use client";

import { useState, useEffect, useRef } from "react";
import { Product } from "@/types/app";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);

    if (!query.trim() || query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(query)}&limit=8`
        );
        const data = await res.json();
        setResults(data.products ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer.current);
  }, [query]);

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return { query, setQuery, results, loading, open, setOpen, clear };
}
