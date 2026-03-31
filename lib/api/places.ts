export interface WorkspaceDetailsData {
  price_hour?: string | null;
  price_half_day?: string | null;
  price_day?: string | null;
  price_week?: string | null;
  price_month?: string | null;
  total_seats?: number;
  available_seats?: number;
  opens_at?: string | null;
  closes_at?: string | null;
}

export interface WorkspaceServiceData {
  id: string;
  service: string;
  available: boolean;
  detail?: string | null;
}

export interface Place {
  id: string;
  name: string;
  section: 'food' | 'store' | 'workspace';
  type: string;
  area_id: string;
  area?: { id: string; name_ar: string };
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  is_open: boolean;
  status: string;
  plan?: string;
  avatar_url?: string | null;
  created_at?: string;
  workspace_details?: WorkspaceDetailsData | null;
  workspace_services?: WorkspaceServiceData[];
}

export interface MatchedItem {
  place_id: string;
  item_name: string;
  price: string;
}
