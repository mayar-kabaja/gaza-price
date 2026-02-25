import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/supabase/get-auth-from-request";
import { getContributorById, updateContributor, deleteContributor } from "@/lib/queries/contributors";
import { getApiBaseUrl, apiGetWithHeaders, apiPatch, apiDelete } from "@/lib/api/client";

export async function GET(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "انتهت جلستك، حدّث الصفحة" },
      { status: 401 }
    );
  }
  const { user, accessToken, supabase } = auth;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const base = getApiBaseUrl();
  if (base) {
    try {
      const data = await apiGetWithHeaders("/contributors/me", authHeaders);
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ في الخادم";
      const status = message.startsWith("API 404") ? 404 : message.startsWith("API 4") ? 400 : 500;
      return NextResponse.json({ error: "SERVER_ERROR", message: message.replace(/^API \d+: /, "") }, { status });
    }
  }

  const contributor = await getContributorById(user.id);
  if (!contributor) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "الحساب غير موجود" },
      { status: 404 }
    );
  }
  return NextResponse.json(contributor);
}

export async function PATCH(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "انتهت جلستك، حدّث الصفحة" },
      { status: 401 }
    );
  }
  const { user, accessToken, supabase } = auth;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const body = await req.json();

  // ── Backend path: proxy (send only defined fields) ──
  const base = getApiBaseUrl();
  if (base) {
    const patchBody: { display_handle?: string | null; area_id?: string } = {};
    if (body.display_handle !== undefined) {
      const v = body.display_handle;
      patchBody.display_handle = v === null || (typeof v === "string" && !v.trim()) ? null : (typeof v === "string" ? v.trim() : undefined);
      if (patchBody.display_handle && patchBody.display_handle.length > 30) {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "اللقب يجب أن يكون أقل من ٣٠ حرفاً" },
          { status: 400 }
        );
      }
    }
    if (body.area_id !== undefined) patchBody.area_id = body.area_id;
    try {
      const data = await apiPatch("/contributors/me", patchBody, authHeaders);
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

  // ── Supabase path: validate then update ──
  if (body.display_handle !== undefined) {
    if (typeof body.display_handle !== "string" && body.display_handle !== null) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "اللقب غير صالح" },
        { status: 400 }
      );
    }
    const trimmed =
      body.display_handle === null ? null : (body.display_handle as string).trim() || null;
    if (body.display_handle !== null && (body.display_handle as string).trim().length === 0) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "اللقب لا يمكن أن يكون فارغاً" },
        { status: 400 }
      );
    }
    if (trimmed && trimmed.length > 30) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "اللقب يجب أن يكون أقل من ٣٠ حرفاً" },
        { status: 400 }
      );
    }
    body.display_handle = trimmed;
  }

  if (body.area_id !== undefined && body.area_id != null && body.area_id !== "") {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", body.area_id)
      .eq("is_active", true)
      .single();
    if (!area) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "المنطقة غير موجودة" },
        { status: 400 }
      );
    }
  }

  try {
    const updates: { display_handle?: string | null; area_id?: string } = {};
    if (body.display_handle !== undefined) updates.display_handle = body.display_handle;
    if (body.area_id !== undefined) updates.area_id = body.area_id;
    const updated = await updateContributor(user.id, updates);
    return NextResponse.json({ updated: true, ...updated });
  } catch {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "حدث خطأ، جرّب مرة أخرى" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "انتهت جلستك، حدّث الصفحة" },
      { status: 401 }
    );
  }
  const { user, accessToken, supabase } = auth;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const base = getApiBaseUrl();
  if (base) {
    try {
      await apiDelete("/contributors/me", authHeaders);
      await supabase.auth.signOut();
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

  await deleteContributor(user.id);
  await supabase.auth.signOut();
  return NextResponse.json({
    deleted: true,
    message: "تم حذف جميع بياناتك نهائياً",
  });
}
