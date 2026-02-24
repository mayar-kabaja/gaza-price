import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type EnsureUserResult = {
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Ensures a user session exists. If there is no user (no session cookies),
 * signs in anonymously and sets session cookies. Use this in API routes
 * instead of checking getUser() and returning 401.
 */
export async function ensureUser(): Promise<EnsureUserResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return { user, supabase };
  }

  const { data: { user: newUser }, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(`Anonymous sign-in failed: ${error.message}`);
  }
  if (!newUser) {
    throw new Error("Anonymous sign-in did not return a user");
  }

  return { user: newUser, supabase };
}
