import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

/** POST /api/admin/stores — Create a store. Requires admin JWT. */
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
  if (!body?.area_id || typeof body.area_id !== "string") {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "area_id is required" },
      { status: 400 }
    );
  }
  const payload: Record<string, unknown> = {
    name_ar: body.name_ar,
    area_id: body.area_id,
  };
  if (body.is_verified !== undefined) payload.is_verified = Boolean(body.is_verified);
  if (body.lat != null && typeof body.lat === "number") payload.lat = body.lat;
  if (body.lng != null && typeof body.lng === "number") payload.lng = body.lng;
  try {
    const res = await fetch(`${base}/stores`, {
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
