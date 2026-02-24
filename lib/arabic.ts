/**
 * Normalize Arabic text for consistent search and comparison.
 * Handles alef variants, taa marbuta, hamza, etc.
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArabicNumerals(text: string): string {
  return text
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(d))
    );
}

export function toArabicNumerals(num: number): string {
  return num.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

export function formatPrice(price: number, currency = "₪"): string {
  return `${price.toFixed(2)} ${currency}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor(diffMs / (1000 * 60));
  const diffD = Math.floor(diffH / 24);

  if (diffM < 1) return "الآن";
  if (diffM < 60) return `منذ ${toArabicNumerals(diffM)} دقيقة`;
  if (diffH < 24) return `منذ ${toArabicNumerals(diffH)} ساعة`;
  if (diffD === 1) return "أمس";
  return `منذ ${toArabicNumerals(diffD)} أيام`;
}
