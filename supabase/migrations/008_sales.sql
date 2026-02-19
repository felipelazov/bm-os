-- ============================================
-- 008: Modulo de Vendas (Sales)
-- ============================================

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  status TEXT NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'finalizada')),
  payment_status TEXT NOT NULL DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'pago')),
  payment_method TEXT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('entrega', 'retirada')),
  delivery_location_id UUID REFERENCES public.stock_locations(id),
  freight_enabled BOOLEAN NOT NULL DEFAULT false,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  items_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL
);

-- Indices
CREATE INDEX idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_client ON public.sales(client_id);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE UNIQUE INDEX idx_sales_protocol_tenant ON public.sales(tenant_id, protocol);

-- RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Policies (sales)
CREATE POLICY "Tenant can view sales" ON public.sales
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant can insert sales" ON public.sales
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant can update sales" ON public.sales
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant can delete sales" ON public.sales
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- Policies (sale_items via sale's tenant)
CREATE POLICY "Tenant can view sale items" ON public.sale_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.tenant_id = public.get_user_tenant_id())
  );

CREATE POLICY "Tenant can delete sale items" ON public.sale_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.tenant_id = public.get_user_tenant_id())
  );
