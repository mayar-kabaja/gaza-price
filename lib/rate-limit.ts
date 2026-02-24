import { createClient } from "@/lib/supabase/server";

type AttemptTable =
  | "report_attempts"
  | "confirmation_attempts"
  | "flag_attempts"
  | "suggestion_attempts";

interface RateLimitConfig {
  table: AttemptTable;
  contributorId: string;
  windowHours: number;
  maxAttempts: number;
  extraFilters?: Record<string, string>;
}

export async function checkRateLimit({
  table,
  contributorId,
  windowHours,
  maxAttempts,
  extraFilters = {},
}: RateLimitConfig): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = await createClient();
  const windowStart = new Date(
    Date.now() - windowHours * 60 * 60 * 1000
  ).toISOString();

  let query = supabase
    .from(table)
    .select("attempted_at", { count: "exact" })
    .eq("contributor_id", contributorId)
    .eq("success", true)
    .gte("attempted_at", windowStart);

  for (const [key, val] of Object.entries(extraFilters)) {
    query = query.eq(key, val);
  }

  const { count } = await query;

  if ((count ?? 0) >= maxAttempts) {
    // Find the oldest attempt in window to calc retry time
    return { allowed: false, retryAfterSeconds: windowHours * 3600 };
  }

  return { allowed: true };
}

export async function logAttempt({
  table,
  contributorId,
  success,
  extraData = {},
}: {
  table: AttemptTable;
  contributorId: string;
  success: boolean;
  extraData?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from(table).insert({
    contributor_id: contributorId,
    success,
    attempted_at: new Date().toISOString(),
    ...extraData,
  });
}
