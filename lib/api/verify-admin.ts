/**
 * Extract and check admin role from a JWT token.
 * JWTs are base64-encoded — we can read the payload without the secret.
 * This provides defense-in-depth on the Next.js proxy layer.
 */
export function isAdminToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    return payload?.role === "admin" || payload?.is_admin === true;
  } catch {
    return false;
  }
}
