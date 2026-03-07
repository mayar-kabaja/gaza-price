/**
 * Upload receipt photo directly to backend. Returns public URL or throws.
 */
export async function uploadReceiptPhoto(
  file: File,
  accessToken?: string | null
): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${base}/upload/receipt`, {
    method: "POST",
    headers,
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data?.message === "string" ? data.message : "فشل رفع الصورة";
    throw new Error(msg);
  }
  if (typeof data?.url !== "string") {
    throw new Error("لم يُرجَع رابط الصورة");
  }
  return data.url;
}
