-- ============================================
-- Migration: Modulo de Orcamentos (OP)
-- ============================================

-- Tabela de orcamentos
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  protocol text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id),
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'recusado', 'convertido')),
  is_deleted boolean NOT NULL DEFAULT false,
  delivery_type text NOT NULL DEFAULT 'entrega'
    CHECK (delivery_type IN ('entrega', 'retirada')),
  payment_method text,
  validity_days integer NOT NULL DEFAULT 5,
  discount_enabled boolean NOT NULL DEFAULT false,
  discount_percent numeric NOT NULL DEFAULT 2,
  items_total numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  converted_sale_id uuid REFERENCES sales(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de itens do orcamento
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  product_sku text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_is_deleted ON quotes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Politica quotes: usuarios so veem dados do seu tenant
CREATE POLICY "quotes_tenant_isolation" ON quotes
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Politica quote_items: acesso via quote do mesmo tenant
CREATE POLICY "quote_items_tenant_isolation" ON quote_items
  FOR ALL
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE tenant_id IN (
        SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE tenant_id IN (
        SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();
