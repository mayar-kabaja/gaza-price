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
  if (storeTrimmed.length > 0 && storeTrimmed.length < 2) {
    return "اسم المتجر يجب أن يكون حرفين على الأقل";
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
