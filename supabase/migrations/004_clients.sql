-- ============================================
-- Modulo Clientes
-- Tabela: clients
-- ============================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  client_type TEXT NOT NULL DEFAULT 'varejo' CHECK (client_type IN ('varejo', 'mensalista', 'doacao')),
  cep TEXT,
  address TEXT,
  address_number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX idx_clients_type ON public.clients(tenant_id, client_type);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.clients
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.clients
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.clients
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.clients
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());
