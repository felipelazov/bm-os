// ============================================
// Itens de Compra
// ============================================

export interface PurchaseItem {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  unit: string;
  brand: string | null;
  is_active: boolean;
  created_at: string;
}

// ============================================
// Fornecedores
// ============================================

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  contact_person: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// ============================================
// Vinculo Fornecedor-Item
// ============================================

export interface SupplierItem {
  id: string;
  supplier_id: string;
  item_id: string;
  last_unit_price: number | null;
  last_quote_date: string | null;
  // Joins
  purchase_item?: PurchaseItem;
}

// ============================================
// Cotacoes
// ============================================

export interface PurchaseQuote {
  id: string;
  tenant_id: string;
  item_id: string;
  supplier_id: string | null;
  unit_price: number;
  quantity: number | null;
  brand: string | null;
  quote_date: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  // Joins
  purchase_item?: PurchaseItem;
  supplier?: Supplier;
}

// ============================================
// Sinais de Mercado (Newsletter)
// ============================================

export type MarketImpact = 'alta' | 'baixa' | 'estavel';

export interface MarketSignal {
  id: string;
  tenant_id: string;
  category: string | null;
  source: string;
  title: string;
  summary: string;
  impact: MarketImpact;
  url: string | null;
  published_at: string;
  created_at: string;
}

// ============================================
// Estatisticas de Preco
// ============================================

export interface ItemPriceStats {
  item_id: string;
  item_name: string;
  category: string;
  brand: string | null;
  last_price: number | null;
  avg_price_3m: number | null;
  variation_pct: number | null;
  status: 'abaixo' | 'normal' | 'acima';
  quote_count: number;
}
