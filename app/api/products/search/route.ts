import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** GET /api/products/search?q=... — Proxy to backend GET /products?search=... (accepts q for convenience). */
export async function GET(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const categoryId = searchParams.get("category_id") ?? undefined;
  const limit = searchParams.get("limit") ?? "10";
  const offset = searchParams.get("offset") ?? "0";

  if (!q) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "أدخل كلمة البحث" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams();
  params.set("search", q);
  if (categoryId) params.set("category_id", categoryId);
  params.set("limit", limit);
  params.set("offset", offset);

  const url = `${base}${base.endsWith("/") ? "" : "/"}products?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(25000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
