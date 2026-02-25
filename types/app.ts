// ── Core types ──

export type TrustLevel = "new" | "regular" | "trusted" | "verified";
export type PriceStatus = "pending" | "confirmed" | "flagged" | "rejected" | "expired";
export type ProductStatus = "active" | "pending_review" | "rejected" | "merged";
export type Currency = "ILS" | "USD" | "EGP";
export type FlagReason = "wrong_price" | "wrong_store" | "outdated" | "spam" | "other";
export type AdminRole = "super_admin" | "moderator";
export type Governorate = "north" | "central" | "south";

export interface Area {
  id: string;
  name_ar: string;
  governorate: Governorate;
  is_active: boolean;
  active_reports_count?: number;
}

export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name_ar: string;
  name_en?: string;
  category_id: string;
  category?: Category;
  unit: string;
  unit_size: number;
  status: ProductStatus;
  suggested_by?: string;
  suggestion_note?: string;
  created_at: string;
}

export interface Store {
  id: string;
  name_ar: string;
  area_id: string;
  area?: Area;
  lat?: number;
  lng?: number;
  is_verified: boolean;
  created_by?: string;
}

export interface Contributor {
  id: string;
  anon_session_id: string;
  area_id?: string;
  area?: Area;
  display_handle?: string;
  trust_level: TrustLevel;
  report_count: number;
  confirmation_count: number;
  flag_count: number;
  is_banned: boolean;
  joined_at: string;
  last_active_at: string;
}

export interface Price {
  id: string;
  product_id: string;
  product?: Product;
  store_id?: string;
  store?: Store;
  store_name_raw?: string;
  area_id: string;
  area?: Area;
  price: number;
  currency: Currency;
  reported_by?: string;
  receipt_photo_url?: string;
  status: PriceStatus;
  trust_score: number;
  confirmation_count: number;
  flag_count: number;
  has_receipt: boolean;
  is_lowest?: boolean;
  reported_at: string;
  expires_at: string;
}

export interface PriceStats {
  avg_price: number;
  median_price: number;
  min_price: number;
  report_count: number;
}

export interface PriceConfirmation {
  id: string;
  price_id: string;
  confirmed_by: string;
  confirmed_at: string;
}

export interface PriceFlag {
  id: string;
  price_id: string;
  flagged_by: string;
  reason: FlagReason;
  flagged_at: string;
}

export interface PriceSnapshot {
  id: string;
  product_id: string;
  area_id?: string;
  snapshot_date: string;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  report_count: number;
  currency: Currency;
}

// ── Reports feed (community feed) ──

export interface ReportFeedItem {
  id: string;
  product_id: string;
  price: number;
  currency: Currency;
  store_name_raw?: string | null;
  confirmation_count: number;
  trust_score: number;
  status: PriceStatus;
  reported_at: string;
  has_receipt: boolean;
  is_confirmed_by_me: boolean;
  product?: {
    id: string;
    name_ar: string;
    unit: string;
    unit_size: number;
    category?: { icon: string; name_ar: string };
  } | null;
  store?: { name_ar: string } | null;
  area?: { name_ar: string } | null;
}
