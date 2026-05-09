let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  if (typeof window === "undefined") return "server";
  try {
    const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedId = result.visitorId;
    return cachedId;
  } catch {
    // Fallback: random ID stored in sessionStorage (per tab)
    const key = "gp_device_fallback";
    let fallback = sessionStorage.getItem(key);
    if (!fallback) {
      fallback = crypto.randomUUID();
      sessionStorage.setItem(key, fallback);
    }
    cachedId = fallback;
    return cachedId;
  }
}
