// ============================================
// Módulo de Orçamentos (OP)
// ============================================

export type QuoteStatus = 'pendente' | 'aprovado' | 'recusado' | 'convertido';
export type QuoteDeliveryType = 'entrega' | 'retirada';

export interface Quote {
  id: string;
  tenant_id: string;
  protocol: string;
  client_id: string | null;
  status: QuoteStatus;
  is_deleted: boolean;
  delivery_type: QuoteDeliveryType;
  payment_method: string | null;
  validity_days: number;
  discount_enabled: boolean;
  discount_percent: number;
  items_total: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  converted_sale_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Join fields
  client_name?: string;
  client_type?: string;
}

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
}

export interface CreateQuoteData {
  client_id: string | null;
  items: Omit<QuoteItem, 'id' | 'quote_id'>[];
  delivery_type: QuoteDeliveryType;
  payment_method: string | null;
  validity_days: number;
  discount_enabled: boolean;
  discount_percent: number;
  notes: string | null;
}

export const QUOTE_PAYMENT_METHODS = [
  'Pix',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência',
  'Boleto',
  'A combinar',
] as const;
