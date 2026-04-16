"use client";

// Re-export global hooks under market-specific names for backward compatibility
export { useGlobalSidebar as useMarketSidebar, useGlobalContext as useMarketContext } from "@/components/layout/GlobalDesktopShell";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
