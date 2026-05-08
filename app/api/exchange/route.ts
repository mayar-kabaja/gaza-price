import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // cache 1 hour

interface RateResult {
  currency: string;
  code: string;
  rate: number;
  change: number;
  direction: "up" | "down" | "stable";
}

let cachedRates: { data: RateResult[]; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Return cache if fresh
    if (cachedRates && Date.now() - cachedRates.ts < CACHE_MS) {
      return NextResponse.json(cachedRates.data);
    }

    // Fetch from free API (exchangerate-api.com free tier, no key needed)
    const res = await fetch(
      "https://open.er-api.com/v6/latest/ILS",
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error("Exchange API failed");

    const json = await res.json();
    const ilsRates = json.rates as Record<string, number>;

    // We need: how many ILS per 1 USD, 1 JOD, 1 EUR
    // The API gives us ILS-based rates (1 ILS = X foreign)
    // So 1 USD = 1/ilsRates.USD ILS
    const usdToIls = ilsRates.USD ? +(1 / ilsRates.USD).toFixed(2) : 3.72;
    const jodToIls = ilsRates.JOD ? +(1 / ilsRates.JOD).toFixed(2) : 5.24;
    const eurToIls = ilsRates.EUR ? +(1 / ilsRates.EUR).toFixed(2) : 4.01;

    // Fetch yesterday's rates to compute change
    let prevUsd = usdToIls, prevJod = jodToIls, prevEur = eurToIls;
    try {
      const yesterday = new Date(Date.now() - 86400000);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth() + 1).padStart(2, "0");
      const d = String(yesterday.getDate()).padStart(2, "0");
      const prevRes = await fetch(
        `https://open.er-api.com/v6/latest/ILS`,
        { next: { revalidate: 86400 } }
      );
      // The free API doesn't support historical, so we approximate with small random for now
      // In production, store yesterday's rate in DB
    } catch {
      // ignore — use 0 change
    }

    function direction(current: number, prev: number): "up" | "down" | "stable" {
      const diff = +(current - prev).toFixed(2);
      if (diff > 0) return "up";
      if (diff < 0) return "down";
      return "stable";
    }

    const rates: RateResult[] = [
      { currency: "دولار امريكي", code: "USD", rate: usdToIls, change: 0, direction: "stable" },
      { currency: "دينار اردني", code: "JOD", rate: jodToIls, change: 0, direction: "stable" },
      { currency: "يورو", code: "EUR", rate: eurToIls, change: 0, direction: "stable" },
    ];

    cachedRates = { data: rates, ts: Date.now() };
    return NextResponse.json(rates);
  } catch (err) {
    // Fallback static rates
    const fallback: RateResult[] = [
      { currency: "دولار امريكي", code: "USD", rate: 3.72, change: 0, direction: "stable" },
      { currency: "دينار اردني", code: "JOD", rate: 5.24, change: 0, direction: "stable" },
      { currency: "يورو", code: "EUR", rate: 4.01, change: 0, direction: "stable" },
    ];
    return NextResponse.json(fallback);
  }
}
