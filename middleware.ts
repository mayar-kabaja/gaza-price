import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth (anonymous sign-in) is handled in the backend:
 * - GET /api/auth/session ensures a session exists (call on app load).
 * - API routes use ensureUser() from @/lib/supabase/ensure-user when they need a user.
 */
export async function middleware(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};