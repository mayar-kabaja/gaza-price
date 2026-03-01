import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl, apiGetWithHeaders } from "@/lib/api/client";

/** GET — Proxy to backend contributors/me/reports. Requires Bearer token. */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "انتهت جلستك، حدّث الصفحة" },
      { status: 401 }
    );
  }
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const offset = Number(searchParams.get("offset")) || 0;

  const path = `/contributors/me/reports?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}`;
  try {
    const data = await apiGetWithHeaders(path, {
      Authorization: `Bearer ${token}`,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const statusMatch = message.match(/^API (\d+):/);
    const httpStatus = statusMatch ? parseInt(statusMatch[1], 10) : 500;
    const bodyStr = statusMatch ? message.slice(message.indexOf(":") + 1).trim() : message;
    return NextResponse.json(
      { error: "SERVER_ERROR", message: bodyStr.length > 200 ? bodyStr.slice(0, 200) + "…" : bodyStr },
      { status: httpStatus }
    );
  }
}
