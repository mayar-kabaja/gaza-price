import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** POST /api/auth/phone/complete-registration — After OTP verified, set display name and area */
export async function POST(req: NextRequest) {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "CONFIG", message: "NEXT_PUBLIC_API_URL is not set" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization") ?? "";

    // Update contributor profile (display_handle, area_id)
    const res = await fetch(`${base}/contributors/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        display_handle: body.display_handle ?? null,
        area_id: body.area_id ?? null,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({
      message: "تم إكمال التسجيل بنجاح",
      user: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: "REGISTRATION_FAILED", message }, { status: 500 });
  }
}
