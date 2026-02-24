import { Price } from "@/types/app";
import { OUTLIER_STD_DEV, STALE_HOURS } from "./constants";

export function getMedian(prices: number[]): number {
  if (!prices.length) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getAverage(prices: number[]): number {
  if (!prices.length) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export function getStdDev(prices: number[], mean: number): number {
  if (prices.length < 2) return 0;
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
    prices.length;
  return Math.sqrt(variance);
}

export function isOutlier(price: number, prices: number[]): boolean {
  if (prices.length < 3) return false;
  const mean = getAverage(prices);
  const std = getStdDev(prices, mean);
  if (std === 0) return false;
  return Math.abs(price - mean) > OUTLIER_STD_DEV * std;
}

export function isStale(reportedAt: string): boolean {
  const diffH =
    (Date.now() - new Date(reportedAt).getTime()) / (1000 * 60 * 60);
  return diffH > STALE_HOURS;
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function markLowest(prices: Price[]): Price[] {
  if (!prices.length) return prices;
  const activePrices = prices.filter(
    (p) => p.status !== "expired" && p.status !== "rejected"
  );
  if (!activePrices.length) return prices;
  const minPrice = Math.min(...activePrices.map((p) => p.price));
  return prices.map((p) => ({ ...p, is_lowest: p.price === minPrice }));
}

export function calcStats(prices: Price[]) {
  const vals = prices
    .filter((p) => p.status !== "expired" && p.status !== "rejected")
    .map((p) => p.price);

  return {
    avg_price: Math.round(getAverage(vals) * 100) / 100,
    median_price: Math.round(getMedian(vals) * 100) / 100,
    min_price: vals.length ? Math.min(...vals) : 0,
    report_count: vals.length,
  };
}

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = {
    ILS: "₪",
    USD: "$",
    EGP: "ج.م",
  };
  return map[currency] ?? currency;
}
