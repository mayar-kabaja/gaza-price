import { Currency, FlagReason } from "./app";

// ── Request types ──

export interface SubmitPriceRequest {
  product_id: string;
  price: number;
  currency?: Currency;
  area_id: string;
  store_id?: string;
  store_name_raw?: string;
  receipt_photo_url?: string;
}

export interface SuggestProductRequest {
  name_ar: string;
  category_id: string;
  unit: string;
  unit_size: number;
  suggestion_note?: string;
  price: number;
  area_id: string;
  store_name_raw?: string;
}

export interface FlagPriceRequest {
  reason: FlagReason;
}

export interface UpdateContributorRequest {
  display_handle?: string | null;
  area_id?: string;
}

export interface ReviewProductRequest {
  action: "approve" | "reject" | "merge";
  merge_into?: string;
  note?: string;
}

export interface BanContributorRequest {
  reason: string;
  hide_reports?: boolean;
}

// ── Response types ──

export interface ApiError {
  error: string;
  message: string;
  retry_after_seconds?: number;
  similar?: Array<{ id: string; name_ar: string; similarity: number }>;
}

export interface SubmitPriceResponse {
  id: string;
  status: string;
  trust_score: number;
  expires_at: string;
  message: string;
}

export interface ConfirmPriceResponse {
  confirmed: boolean;
  new_confirmation_count: number;
  new_trust_score: number;
  new_status: string;
}

export interface FlagPriceResponse {
  flagged: boolean;
  flag_count: number;
  report_status: string;
}

export interface DeleteAccountResponse {
  deleted: boolean;
  deleted_reports: number;
  deleted_confirmations: number;
  message: string;
}
