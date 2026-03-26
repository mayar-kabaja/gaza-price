export interface Place {
  id: string;
  name: string;
  section: 'food' | 'store';
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
}

export interface MatchedItem {
  place_id: string;
  item_name: string;
  price: string;
}
