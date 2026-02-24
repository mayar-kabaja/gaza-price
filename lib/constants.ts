export const PRICE_EXPIRY_HOURS = 48;
export const TRUST_SCORE_MAX = 100;

export const RATE_LIMITS = {
  reports_per_hour: 5,
  reports_per_day_per_product: 3,
  confirmations_per_hour: 10,
  flags_per_hour: 5,
  suggestions_per_day: 3,
} as const;

export const TRUST_THRESHOLDS = {
  new:      { min: 0,  reports_needed: 5  },
  regular:  { min: 5,  reports_needed: 20 },
  trusted:  { min: 20, reports_needed: 50 },
  verified: { min: 50, reports_needed: Infinity },
} as const;

export const TRUST_SCORE_WEIGHTS = {
  confirmation: 20,
  receipt: 25,
  new_contributor: 0.6,
  regular_contributor: 1.0,
  trusted_contributor: 1.5,
  verified_contributor: 2.0,
} as const;

export const OUTLIER_STD_DEV = 2.5;
export const STALE_HOURS = 24;
export const SIMILAR_PRODUCT_THRESHOLD = 0.6;

export const ATTEMPTS_CLEANUP_HOURS = 48;

export const AREAS_CACHE_SECONDS = 86400; // 24h

export const CURRENCIES = ["ILS", "USD", "EGP"] as const;

export const FLAG_REASONS = [
  { value: "wrong_price",  label: "السعر غير صحيح" },
  { value: "wrong_store",  label: "المتجر غير صحيح" },
  { value: "outdated",     label: "السعر قديم" },
  { value: "spam",         label: "محتوى مزعج" },
  { value: "other",        label: "سبب آخر" },
] as const;

export const TRUST_LEVEL_LABELS = {
  new:      "جديد",
  regular:  "منتظم",
  trusted:  "موثوق",
  verified: "موثّق",
} as const;

export const LOCAL_STORAGE_KEYS = {
  area: "gazaprice_area",
  onboarding_done: "gazaprice_onboarding",
  welcome_toast_dismissed: "gazaprice_welcome_dismissed",
} as const;
