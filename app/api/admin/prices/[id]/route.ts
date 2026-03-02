import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/prices/[id] — Update price (e.g. price, area_id). Requires admin JWT. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const payload: Record<string, unknown> = {};
  if (body?.price != null && typeof body.price === "number" && body.price > 0) {
    payload.price = body.price;
  }
  if (body?.area_id != null && typeof body.area_id === "string" && body.area_id.trim()) {
    payload.area_id = body.area_id.trim();
  }
  if (body?.product_id != null && typeof body.product_id === "string" && body.product_id.trim()) {
    payload.product_id = body.product_id.trim();
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Provide price, area_id, or product_id to update" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(`${base}/prices/${id}`, {
      method: "PATCH",
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
