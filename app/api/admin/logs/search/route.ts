import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

/** GET /api/admin/logs/search — Search logs. Requires admin JWT. */
export async function GET(req: NextRequest) {
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
  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();
  searchParams.get("area_id") && params.set("area_id", searchParams.get("area_id")!);
  searchParams.get("from") && params.set("from", searchParams.get("from")!);
  searchParams.get("to") && params.set("to", searchParams.get("to")!);
  params.set("limit", searchParams.get("limit") ?? "50");
  params.set("offset", searchParams.get("offset") ?? "0");
  try {
    const res = await fetch(`${base}/admin/logs/search?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
