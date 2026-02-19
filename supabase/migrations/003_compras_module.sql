-- ============================================
-- Modulo Compras
-- Tabelas: purchase_items, suppliers, supplier_items, purchase_quotes, market_signals
-- ============================================

-- 1. Itens de Compra
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  brand TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_items_tenant ON public.purchase_items(tenant_id);
CREATE INDEX idx_purchase_items_category ON public.purchase_items(tenant_id, category);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.purchase_items
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.purchase_items
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.purchase_items
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.purchase_items
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- 2. Fornecedores
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  contact_person TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_tenant ON public.suppliers(tenant_id);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.suppliers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.suppliers
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.suppliers
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.suppliers
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- 3. Vinculo Fornecedor-Item
CREATE TABLE public.supplier_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
  last_unit_price NUMERIC(12,2),
  last_quote_date DATE,
  UNIQUE(supplier_id, item_id)
);

CREATE INDEX idx_supplier_items_supplier ON public.supplier_items(supplier_id);
CREATE INDEX idx_supplier_items_item ON public.supplier_items(item_id);

ALTER TABLE public.supplier_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.supplier_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation insert" ON public.supplier_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation update" ON public.supplier_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant isolation delete" ON public.supplier_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_id AND s.tenant_id = public.get_user_tenant_id())
  );

-- 4. Cotacoes
CREATE TABLE public.purchase_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.purchase_items(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  quantity NUMERIC(12,3),
  brand TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_quotes_tenant ON public.purchase_quotes(tenant_id);
CREATE INDEX idx_purchase_quotes_item ON public.purchase_quotes(tenant_id, item_id);
CREATE INDEX idx_purchase_quotes_date ON public.purchase_quotes(tenant_id, quote_date DESC);

ALTER TABLE public.purchase_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.purchase_quotes
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.purchase_quotes
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.purchase_quotes
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.purchase_quotes
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- 5. Sinais de Mercado
CREATE TABLE public.market_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('alta', 'baixa', 'estavel')),
  url TEXT,
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_signals_tenant ON public.market_signals(tenant_id);
CREATE INDEX idx_market_signals_date ON public.market_signals(tenant_id, published_at DESC);

ALTER TABLE public.market_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.market_signals
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.market_signals
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.market_signals
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.market_signals
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());
