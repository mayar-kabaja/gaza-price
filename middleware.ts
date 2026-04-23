import { NextResponse, type NextRequest } from "next/server";

/**
 * Decode JWT payload without verifying signature.
 * Used for defense-in-depth: check the role claim before proxying to backend.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Guard all /api/admin/* routes — only allow admin tokens
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Admin authentication required" },
        { status: 401 }
      );
    }
    const token = auth.replace("Bearer ", "");
    const payload = decodeJwtPayload(token);
    if (!payload || (payload.role !== "admin" && payload.is_admin !== true)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Admin access only" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
