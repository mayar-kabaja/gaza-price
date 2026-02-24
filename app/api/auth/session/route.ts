import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/supabase/ensure-user";

/**
 * GET /api/auth/session
 * Ensures an anonymous session exists (creates one if needed) and returns the user.
 * Call this from the frontend on app load so client-side getSession() sees the session.
 */
export async function GET() {
  try {
    const { user } = await ensureUser();
    return NextResponse.json({
      user: {
        id: user.id,
        is_anonymous: user.is_anonymous,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session error";
    return NextResponse.json({ error: "SESSION_ERROR", message }, { status: 500 });
  }
}
