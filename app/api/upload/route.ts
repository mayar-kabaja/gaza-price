import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

function getAuthHeader(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth;
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/gazaprice_token=([^;]+)/);
    if (match?.[1]) return `Bearer ${match[1]}`;
  }
  return null;
}

/** POST /api/upload — Upload receipt image, proxy to backend. Returns { url }. */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "رفع الصور غير متاح" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "لم يتم إرسال ملف" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "لم يتم إرسال ملف" },
      { status: 400 }
    );
  }

  const token = getAuthHeader(req);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = token;

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);

  try {
    const url = `${base.replace(/\/$/, "")}/upload/receipt`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers },
      body: uploadFormData,
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        data?.message ? { error: data.error ?? "BAD_REQUEST", message: data.message } : data,
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل رفع الصورة";
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
