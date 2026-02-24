import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContributorById, updateContributor, deleteContributor } from "@/lib/queries/contributors";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const contributor = await getContributorById(session.user.id);
  if (!contributor) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json(contributor);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();

  if (body.display_handle && body.display_handle.length > 30) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "اللقب يجب أن يكون أقل من 30 حرف" }, { status: 400 });
  }

  const updated = await updateContributor(session.user.id, {
    display_handle: body.display_handle,
    area_id: body.area_id,
  });

  return NextResponse.json({ updated: true, ...updated });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const result = await deleteContributor(session.user.id);
  await supabase.auth.signOut();

  return NextResponse.json({
    deleted: true,
    deleted_reports: result.deleted_reports,
    deleted_confirmations: result.deleted_confirmations,
    message: "تم حذف جميع بياناتك بنجاح.",
  });
}
