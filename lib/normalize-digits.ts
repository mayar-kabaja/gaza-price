const ARABIC_DIGITS = /[٠-٩]/g;
const ARABIC_TO_ENGLISH: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** Convert Arabic/Eastern digits (٠-٩) to English (0-9) */
export function normalizeDigits(value: string): string {
  return value.replace(ARABIC_DIGITS, (d) => ARABIC_TO_ENGLISH[d] ?? d);
}

/** Check if value contains any Arabic/Eastern digits */
export function hasArabicDigits(value: string): boolean {
  return ARABIC_DIGITS.test(value);
}
