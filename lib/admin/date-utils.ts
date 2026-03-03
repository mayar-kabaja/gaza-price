/**
 * Date validation for admin date filters (from/to).
 * Matches backend validation: YYYY-MM-DD format, real dates only.
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  const trimmed = s.trim();
  if (!DATE_REGEX.test(trimmed)) return false;
  const d = new Date(trimmed + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` === trimmed;
}

export type DateRangeError = "invalid_from" | "invalid_to" | "from_after_to" | null;

export function validateDateRange(from: string, to: string): DateRangeError {
  const fromTrimmed = from?.trim() ?? "";
  const toTrimmed = to?.trim() ?? "";
  if (fromTrimmed && !isValidDateString(fromTrimmed)) return "invalid_from";
  if (toTrimmed && !isValidDateString(toTrimmed)) return "invalid_to";
  if (fromTrimmed && toTrimmed && fromTrimmed > toTrimmed) return "from_after_to";
  return null;
}

export const DATE_RANGE_MESSAGES: Record<Exclude<DateRangeError, null>, string> = {
  invalid_from: "تاريخ البداية غير صالح (استخدم YYYY-MM-DD)",
  invalid_to: "تاريخ النهاية غير صالح (استخدم YYYY-MM-DD)",
  from_after_to: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
};
