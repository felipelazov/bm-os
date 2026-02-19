-- ============================================
-- Modulo Produtos e Estoque
-- Tabelas: stock_locations, products, product_kit_items, stock_levels, stock_movements
-- ============================================

-- 1. Locais de Estoque
CREATE TABLE public.stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_locations_tenant ON public.stock_locations(tenant_id);

ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.stock_locations
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.stock_locations
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.stock_locations
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.stock_locations
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- 2. Produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'avulso' CHECK (product_type IN ('avulso', 'kit')),
  unit TEXT NOT NULL DEFAULT 'un',
  cost_price NUMERIC(12,2),
  sale_price NUMERIC(12,2),
  min_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_products_sku ON public.products(tenant_id, sku);
CREATE INDEX idx_products_type ON public.products(tenant_id, product_type);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.products
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.products
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.products
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.products
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- 3. Composicao de Kit
CREATE TABLE public.product_kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(product_id, item_product_id)
);

CREATE INDEX idx_product_kit_items_product ON public.product_kit_items(product_id);
CREATE INDEX idx_product_kit_items_item ON public.product_kit_items(item_product_id);

ALTER TABLE public.product_kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.product_kit_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation insert" ON public.product_kit_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation update" ON public.product_kit_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation delete" ON public.product_kit_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

-- 4. Niveis de Estoque (produto x local)
CREATE TABLE public.stock_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.stock_locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, location_id)
);

CREATE INDEX idx_stock_levels_product ON public.stock_levels(product_id);
CREATE INDEX idx_stock_levels_location ON public.stock_levels(location_id);

ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.stock_levels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation insert" ON public.stock_levels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation update" ON public.stock_levels
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation delete" ON public.stock_levels
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id())
  );

-- 5. Movimentacoes de Estoque
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('transfer', 'entry', 'exit', 'adjustment')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(tenant_id, created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.stock_movements
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.stock_movements
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.stock_movements
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.stock_movements
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());
