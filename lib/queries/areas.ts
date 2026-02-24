import { createClient } from "@/lib/supabase/server";
import { Area } from "@/types/app";

export async function getAreas(): Promise<Area[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("is_active", true)
    .order("governorate")
    .order("name_ar");

  if (error) throw error;
  return data ?? [];
}

export async function getAreaById(id: string): Promise<Area | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}
