import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

/** POST /api/admin/products — Create a product. Requires admin JWT. */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Login required" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body?.name_ar || typeof body.name_ar !== "string") {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "name_ar is required" },
      { status: 400 }
    );
  }
  if (!body?.category_id || typeof body.category_id !== "string") {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "category_id is required" },
      { status: 400 }
    );
  }
  const unit_size = Number(body.unit_size);
  if (Number.isNaN(unit_size) || unit_size < 0) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "unit_size must be a non-negative number" },
      { status: 400 }
    );
  }
  const payload: Record<string, unknown> = {
    name_ar: body.name_ar,
    category_id: body.category_id,
    unit_size,
  };
  if (body.name_en != null && typeof body.name_en === "string") payload.name_en = body.name_en;
  if (body.unit != null && typeof body.unit === "string") payload.unit = body.unit;
  if (body.barcode != null && typeof body.barcode === "string") payload.barcode = body.barcode;
  if (body.status != null && typeof body.status === "string") payload.status = body.status;
  try {
    const res = await fetch(`${base}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        data?.message ? { error: data.error ?? "API_ERROR", message: data.message } : data,
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
