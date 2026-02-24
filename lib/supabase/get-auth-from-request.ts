import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { ensureUser } from "@/lib/supabase/ensure-user";

export type AuthFromRequest = {
  user: User;
  accessToken: string;
  supabase: Awaited<ReturnType<typeof createServerClient>>;
};

/**
 * Gets the current user and access token from the request.
 * 1) If Authorization: Bearer <token> is present, verifies the token with Supabase and returns the user.
 * 2) Otherwise uses cookie-based session (ensureUser) and returns user + session access_token.
 * Use accessToken when calling the NestJS backend so it can verify with supabase.auth.getUser(token).
 */
export async function getAuthFromRequest(req: NextRequest): Promise<AuthFromRequest> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    const supabaseVerify = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await supabaseVerify.auth.getUser(token);
    if (error || !user) {
      throw new Error("INVALID_TOKEN");
    }
    const supabase = await createServerClient();
    return { user, accessToken: token, supabase };
  }

  const { user, supabase } = await ensureUser();
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("NO_ACCESS_TOKEN");
  }
  return { user, accessToken, supabase };
}
