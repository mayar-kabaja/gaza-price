import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getTokenFromRequest } from "@/lib/get-token-from-request";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/prices/[id]/status — Update price status (confirmed/rejected). Requires admin JWT. */
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
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const status = body?.status;
  if (status !== "confirmed" && status !== "rejected") {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "status must be confirmed or rejected" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(`${base}/admin/prices/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
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
