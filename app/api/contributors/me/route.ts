import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl, apiGetWithHeaders, apiPatch, apiDelete } from "@/lib/api/client";

function requireAuth(req: NextRequest): string | NextResponse {
  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "انتهت جلستك، حدّث الصفحة" },
      { status: 401 }
    );
  }
  return token;
}

export async function GET(req: NextRequest) {
  const token = requireAuth(req);
  if (token instanceof NextResponse) return token;
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  try {
    const data = await apiGetWithHeaders("/contributors/me", {
      Authorization: `Bearer ${token}`,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const statusMatch = message.match(/^API (\d+):\s*(.*)/s);
    const status = statusMatch
      ? parseInt(statusMatch[1], 10)
      : message.startsWith("API 4") ? 400 : 500;
    const bodyStr = statusMatch?.[2]?.trim() ?? message.replace(/^API \d+: /, "");
    let body: { error?: string; message?: string } = { error: "SERVER_ERROR", message: bodyStr };
    if (bodyStr) {
      try {
        const parsed = JSON.parse(bodyStr) as { error?: string; message?: string };
        if (parsed?.error != null || parsed?.message != null) {
          body = { error: parsed.error ?? "SERVER_ERROR", message: parsed.message ?? bodyStr };
        }
      } catch {
        body.message = bodyStr.length > 200 ? bodyStr.slice(0, 200) + "…" : bodyStr;
      }
    }
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const token = requireAuth(req);
  if (token instanceof NextResponse) return token;
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  const body = await req.json();
  const patchBody: { display_handle?: string | null; area_id?: string } = {};
  if (body.display_handle !== undefined) {
    const v = body.display_handle;
    patchBody.display_handle =
      v === null || (typeof v === "string" && !v.trim())
        ? null
        : typeof v === "string"
          ? v.trim()
          : undefined;
    if (patchBody.display_handle && patchBody.display_handle.length > 30) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "اللقب يجب أن يكون أقل من ٣٠ حرفاً" },
        { status: 400 }
      );
    }
  }
  if (body.area_id !== undefined) patchBody.area_id = body.area_id;
  try {
    const data = await apiPatch(
      "/contributors/me",
      patchBody,
      { Authorization: `Bearer ${token}` }
    );
    return NextResponse.json({ updated: true, ...(data as object) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const status = message.startsWith("API 4") ? 400 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message: message.replace(/^API \d+: /, "") },
      { status }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const token = requireAuth(req);
  if (token instanceof NextResponse) return token;
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }
  try {
    await apiDelete("/contributors/me", { Authorization: `Bearer ${token}` });
    return NextResponse.json({
      deleted: true,
      message: "تم حذف جميع بياناتك نهائياً",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const status = message.startsWith("API 4") ? 400 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message: message.replace(/^API \d+: /, "") },
      { status }
    );
  }
}
