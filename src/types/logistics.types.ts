export type DeliveryStatus = 'aguardando' | 'em_rota' | 'entregue';

export interface Delivery {
  id: string;
  tenant_id: string;
  sale_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_address: string | null;
  client_address_number: string | null;
  client_neighborhood: string | null;
  client_city: string | null;
  items_summary: string;
  total: number;
  payment_method: string | null;
  status: DeliveryStatus;
  driver_id: string | null;
  route_order: number | null;
  departure_location_id: string | null;
  return_location_id: string | null;
  delivery_confirmed: boolean;
  photo_confirmed: boolean;
  signature_url: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  created_by: string;
  // join
  driver_name?: string;
}

export interface CreateDeliveryData {
  client_name: string;
  client_phone?: string;
  client_address?: string;
  client_address_number?: string;
  client_neighborhood?: string;
  client_city?: string;
  items_summary: string;
  total: number;
  payment_method?: string;
  notes?: string;
}
