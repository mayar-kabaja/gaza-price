/**
 * Frontend validation — UX only. Runs before sending any request.
 * Format errors only; messages in Arabic. Backend is the source of truth.
 */

/** Returns Arabic error message or null if valid. */
export function validateSubmitPrice(params: {
  productId: string | null | undefined;
  price: string;
  areaId: string;
  storeNameRaw?: string;
}): string | null {
  const { productId, price, areaId, storeNameRaw } = params;

  if (!productId || !productId.trim()) {
    return "يرجى اختيار منتج";
  }

  const priceNum = Number(price);
  if (!price.trim() || isNaN(priceNum)) {
    return "يرجى إدخال سعر صحيح";
  }
  if (priceNum <= 0) {
    return "السعر يجب أن يكون أكبر من صفر";
  }

  if (!areaId || !areaId.trim()) {
    return "يرجى اختيار المنطقة";
  }

  const storeTrimmed = (storeNameRaw ?? "").trim();
  if (!storeTrimmed) {
    return "يرجى إدخال اسم المتجر";
  }
  if (storeTrimmed.length < 2) {
    return "اسم المتجر يجب أن يكون حرفين على الأقل";
  }

  return null;
}

/**
 * Phone number validation for Palestinian numbers.
 * Accepts: 059x, 056x (10 digits), with optional +970 / 00970 prefix.
 * Returns Arabic error message or null if valid / empty.
 */
export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null; // optional field

  // Strip spaces, dashes, dots
  const cleaned = trimmed.replace(/[\s\-().]/g, "");

  // Normalize international prefix to local
  const local = cleaned
    .replace(/^(\+970|00970)/, "0");

  // Must be 10 digits starting with 059 or 056
  if (!/^(059|056)\d{7}$/.test(local)) {
    return "رقم الهاتف غير صحيح — يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام (أرقام إنجليزية فقط)";
  }

  return null;
}

/** Handle (display name): not empty, max 30 chars. For account update handle. */
export function validateHandle(handle: string): string | null {
  const trimmed = handle.trim();
  if (!trimmed) {
    return "يرجى إدخال لقب";
  }
  if (trimmed.length > 30) {
    return "اللقب يجب أن يكون أقل من ٣٠ حرفاً";
  }
  return null;
}
