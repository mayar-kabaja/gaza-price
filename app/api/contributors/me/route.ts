import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/supabase/get-auth-from-request";
import { getContributorById, updateContributor, deleteContributor } from "@/lib/queries/contributors";
import { getApiBaseUrl, apiGetWithHeaders, apiPatch, apiDelete } from "@/lib/api/client";

export async function GET(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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
  if (!contributor) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(contributor);
}

export async function PATCH(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { user, accessToken, supabase } = auth;
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const body = await req.json();

  if (body.display_handle && body.display_handle.length > 30) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "اللقب يجب أن يكون أقل من 30 حرف" }, { status: 400 });
  }

  const base = getApiBaseUrl();
  if (base) {
    try {
      const data = await apiPatch("/contributors/me", { display_handle: body.display_handle, area_id: body.area_id }, authHeaders);
      return NextResponse.json({ updated: true, ...(data as object) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ في الخادم";
      const status = message.startsWith("API 4") ? 400 : 500;
      return NextResponse.json({ error: "SERVER_ERROR", message: message.replace(/^API \d+: /, "") }, { status });
    }
  }

  const updated = await updateContributor(user.id, {
    display_handle: body.display_handle,
    area_id: body.area_id,
  });
  return NextResponse.json({ updated: true, ...updated });
}

export async function DELETE(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof getAuthFromRequest>>;
  try {
    auth = await getAuthFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
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
        message: "تم حذف جميع بياناتك بنجاح.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطأ في الخادم";
      const status = message.startsWith("API 4") ? 400 : 500;
      return NextResponse.json({ error: "SERVER_ERROR", message: message.replace(/^API \d+: /, "") }, { status });
    }
  }

  const result = await deleteContributor(user.id);
  await supabase.auth.signOut();
  return NextResponse.json({
    deleted: true,
    deleted_reports: result.deleted_reports,
    deleted_confirmations: result.deleted_confirmations,
    message: "تم حذف جميع بياناتك بنجاح.",
  });
}
