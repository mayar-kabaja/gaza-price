import { createClient } from "@/lib/supabase/server";
import { Contributor } from "@/types/app";

export async function getContributorById(id: string): Promise<Contributor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contributors")
    .select("*, area:areas(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createContributor(id: string, areaId?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contributors")
    .insert({
      id,
      anon_session_id: id,
      area_id: areaId ?? null,
      trust_level: "new",
      report_count: 0,
      confirmation_count: 0,
      flag_count: 0,
      is_banned: false,
      joined_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContributor(
  id: string,
  updates: { display_handle?: string | null; area_id?: string }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contributors")
    .update({ ...updates, last_active_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, area:areas(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContributor(id: string) {
  const supabase = await createClient();

  // Count before deleting
  const { count: reportCount } = await supabase
    .from("prices")
    .select("*", { count: "exact", head: true })
    .eq("reported_by", id);

  const { count: confirmCount } = await supabase
    .from("price_confirmations")
    .select("*", { count: "exact", head: true })
    .eq("confirmed_by", id);

  // Delete all related data
  await supabase.from("price_flags").delete().eq("flagged_by", id);
  await supabase.from("price_confirmations").delete().eq("confirmed_by", id);
  await supabase.from("prices").delete().eq("reported_by", id);
  await supabase.from("contributors").delete().eq("id", id);

  return {
    deleted_reports: reportCount ?? 0,
    deleted_confirmations: confirmCount ?? 0,
  };
}

export async function banContributor(
  id: string,
  reason: string,
  hideReports = true
) {
  const supabase = await createClient();

  await supabase
    .from("contributors")
    .update({ is_banned: true, ban_reason: reason })
    .eq("id", id);

  let hiddenReports = 0;
  if (hideReports) {
    const { count } = await supabase
      .from("prices")
      .select("*", { count: "exact", head: true })
      .eq("reported_by", id)
      .in("status", ["pending", "confirmed"]);

    await supabase
      .from("prices")
      .update({ status: "rejected" })
      .eq("reported_by", id)
      .in("status", ["pending", "confirmed"]);

    hiddenReports = count ?? 0;
  }

  return { hidden_reports: hiddenReports };
}

export async function getMyReports(
  contributorId: string,
  status?: string,
  limit = 20,
  offset = 0
) {
  const supabase = await createClient();

  let query = supabase
    .from("prices")
    .select("*, product:products(name_ar, unit)", { count: "exact" })
    .eq("reported_by", contributorId)
    .order("reported_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) throw error;
  return { reports: data ?? [], total: count ?? 0 };
}
