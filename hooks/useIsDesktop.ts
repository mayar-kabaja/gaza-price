"use client";

import { useState, useEffect } from "react";

const QUERY = "(min-width: 1024px)";

/**
 * Returns `null` on the very first render (before mount),
 * then `true`/`false` once the media query is evaluated.
 * Pages should treat `null` as "not ready yet" and show nothing
 * or a skeleton to avoid a mobile→desktop layout flash.
 */
export function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setIsDesktop(mql.matches);
    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
