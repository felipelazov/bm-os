// ============================================
// Modulo Produtos e Estoque
// ============================================

export type ProductType = 'avulso' | 'kit';

export type MovementType = 'transfer' | 'entry' | 'exit' | 'adjustment';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string;
  category: string;
  product_type: ProductType;
  unit: string;
  cost_price: number | null;
  sale_price: number | null;
  min_stock: number;
  is_active: boolean;
  created_at: string;
}

export interface StockLocation {
  id: string;
  tenant_id: string;
  name: string;
  cep: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductKitItem {
  id: string;
  product_id: string;
  item_product_id: string;
  quantity: number;
  item_product?: Product;
}

export interface StockLevel {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  location?: StockLocation;
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  movement_type: MovementType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
  from_location?: StockLocation;
  to_location?: StockLocation;
}
