export type SaleStatus = 'em_aberto' | 'finalizada' | 'cancelada';
export type PaymentStatus = 'pendente' | 'pago';
export type DeliveryType = 'entrega' | 'retirada';

export interface Sale {
  id: string;
  tenant_id: string;
  protocol: string;
  client_id: string;
  status: SaleStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  delivery_type: DeliveryType;
  delivery_location_id: string | null;
  freight_enabled: boolean;
  freight_amount: number;
  items_total: number;
  total: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  finalized_at: string | null;
  cancelled_at: string | null;
  // Join fields
  client_name?: string;
  client_type?: string;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSaleData {
  client_id: string;
  items: Omit<SaleItem, 'id' | 'sale_id'>[];
  delivery_type: DeliveryType;
  delivery_location_id?: string;
  freight_enabled: boolean;
  freight_amount: number;
  payment_status: PaymentStatus;
  payment_method: string;
}

export const SALE_PAYMENT_METHODS = [
  'Pix',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência',
  'Boleto',
] as const;
