-- ============================================
-- MIGRATION 009: Logistics / Deliveries
-- ============================================

CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  client_address_number TEXT,
  client_neighborhood TEXT,
  client_city TEXT,
  items_summary TEXT NOT NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando',  -- aguardando | em_rota | entregue
  driver_id UUID REFERENCES public.user_profiles(id),
  route_order INT,
  departure_location_id UUID REFERENCES public.stock_locations(id),
  return_location_id UUID REFERENCES public.stock_locations(id),
  delivery_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  photo_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant deliveries"
  ON public.deliveries FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert own tenant deliveries"
  ON public.deliveries FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own tenant deliveries"
  ON public.deliveries FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete own tenant deliveries"
  ON public.deliveries FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

CREATE INDEX idx_deliveries_tenant ON public.deliveries(tenant_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(tenant_id, status);
CREATE INDEX idx_deliveries_driver ON public.deliveries(driver_id);
CREATE INDEX idx_deliveries_sale ON public.deliveries(sale_id);
