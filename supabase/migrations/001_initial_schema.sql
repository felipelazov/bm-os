-- ============================================
-- GestorPro - Schema Inicial
-- Multi-tenant com schema por tenant
-- ============================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- SCHEMA PÚBLICO (compartilhado)
-- ============================================

-- Tabela de tenants (empresas)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  schema_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurações white-label por tenant
CREATE TABLE public.tenant_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  secondary_color TEXT NOT NULL DEFAULT '#1e40af',
  accent_color TEXT NOT NULL DEFAULT '#3b82f6',
  company_name TEXT NOT NULL,
  favicon_url TEXT,
  UNIQUE(tenant_id)
);

-- Perfis de usuários (vinculados ao auth.users do Supabase)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABELAS DO MÓDULO FINANCEIRO
-- (no schema público com tenant_id para RLS)
-- ============================================

-- Categorias do DRE
CREATE TABLE public.dre_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'receita_bruta', 'deducao_receita', 'custo_produtos',
    'despesa_administrativa', 'despesa_comercial', 'despesa_geral',
    'depreciacao_amortizacao', 'receita_financeira', 'despesa_financeira',
    'imposto_renda', 'csll'
  )),
  parent_id UUID REFERENCES public.dre_categories(id),
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Períodos do DRE
CREATE TABLE public.dre_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'quarterly', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lançamentos manuais do DRE
CREATE TABLE public.dre_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id UUID NOT NULL REFERENCES public.dre_periods(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.dre_categories(id),
  description TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, category_id, description)
);

-- Lotes de importação de extratos
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv', 'ofx', 'xml')),
  bank_name TEXT,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  classified_count INTEGER NOT NULL DEFAULT 0,
  unclassified_count INTEGER NOT NULL DEFAULT 0,
  total_income NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expense NUMERIC(15,2) NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transações financeiras (contas a pagar/receber + importadas)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'received', 'overdue', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import_csv', 'import_ofx', 'import_xml')),
  description TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  category_id UUID,
  dre_category_id UUID REFERENCES public.dre_categories(id),
  bank_name TEXT,
  document_number TEXT,
  notes TEXT,
  is_classified BOOLEAN NOT NULL DEFAULT false,
  import_batch_id UUID REFERENCES public.import_batches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regras de classificação automática
CREATE TABLE public.classification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  dre_category_id UUID NOT NULL REFERENCES public.dre_categories(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Categorias financeiras (complementar, para UI)
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  dre_category_id UUID REFERENCES public.dre_categories(id),
  color TEXT NOT NULL DEFAULT '#6b7280',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX idx_dre_categories_tenant ON public.dre_categories(tenant_id);
CREATE INDEX idx_dre_periods_tenant ON public.dre_periods(tenant_id);
CREATE INDEX idx_dre_periods_dates ON public.dre_periods(start_date, end_date);
CREATE INDEX idx_dre_entries_period ON public.dre_entries(period_id);
CREATE INDEX idx_dre_entries_category ON public.dre_entries(category_id);
CREATE INDEX idx_transactions_tenant ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_type ON public.transactions(tenant_id, type);
CREATE INDEX idx_transactions_date ON public.transactions(tenant_id, date);
CREATE INDEX idx_transactions_status ON public.transactions(tenant_id, status);
CREATE INDEX idx_transactions_dre_cat ON public.transactions(dre_category_id) WHERE is_classified = true;
CREATE INDEX idx_transactions_batch ON public.transactions(import_batch_id);
CREATE INDEX idx_import_batches_tenant ON public.import_batches(tenant_id);
CREATE INDEX idx_classification_rules_tenant ON public.classification_rules(tenant_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

-- Helper: retorna o tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies para tenants
CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id());

-- Policies para tenant_configs
CREATE POLICY "Users can view own tenant config"
  ON public.tenant_configs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can update tenant config"
  ON public.tenant_configs FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

-- Policies para user_profiles
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Policies genéricas para tabelas com tenant_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'dre_categories', 'dre_periods', 'import_batches',
    'transactions', 'classification_rules', 'financial_categories'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Tenant isolation select" ON public.%I FOR SELECT USING (tenant_id = public.get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Tenant isolation insert" ON public.%I FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Tenant isolation update" ON public.%I FOR UPDATE USING (tenant_id = public.get_user_tenant_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Tenant isolation delete" ON public.%I FOR DELETE USING (tenant_id = public.get_user_tenant_id())',
      tbl
    );
  END LOOP;
END $$;

-- Policies para dre_entries (usa period -> tenant)
CREATE POLICY "Tenant isolation select" ON public.dre_entries FOR SELECT
  USING (period_id IN (SELECT id FROM public.dre_periods WHERE tenant_id = public.get_user_tenant_id()));
CREATE POLICY "Tenant isolation insert" ON public.dre_entries FOR INSERT
  WITH CHECK (period_id IN (SELECT id FROM public.dre_periods WHERE tenant_id = public.get_user_tenant_id()));
CREATE POLICY "Tenant isolation update" ON public.dre_entries FOR UPDATE
  USING (period_id IN (SELECT id FROM public.dre_periods WHERE tenant_id = public.get_user_tenant_id()));
CREATE POLICY "Tenant isolation delete" ON public.dre_entries FOR DELETE
  USING (period_id IN (SELECT id FROM public.dre_periods WHERE tenant_id = public.get_user_tenant_id()));

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.dre_periods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.dre_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SEED: Categorias DRE padrão (template)
-- Executar após criar tenant para popular categorias
-- ============================================

CREATE OR REPLACE FUNCTION public.seed_dre_categories(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.dre_categories (tenant_id, name, type, "order") VALUES
    (p_tenant_id, 'Vendas de Produtos', 'receita_bruta', 1),
    (p_tenant_id, 'Prestação de Serviços', 'receita_bruta', 2),
    (p_tenant_id, 'Outras Receitas', 'receita_bruta', 3),
    (p_tenant_id, 'Impostos sobre Vendas (PIS/COFINS/ISS/ICMS)', 'deducao_receita', 4),
    (p_tenant_id, 'Devoluções e Abatimentos', 'deducao_receita', 5),
    (p_tenant_id, 'Custo dos Produtos Vendidos', 'custo_produtos', 6),
    (p_tenant_id, 'Custo dos Serviços Prestados', 'custo_produtos', 7),
    (p_tenant_id, 'Salários e Encargos', 'despesa_administrativa', 8),
    (p_tenant_id, 'Contabilidade e Jurídico', 'despesa_administrativa', 9),
    (p_tenant_id, 'Software e Licenças', 'despesa_administrativa', 10),
    (p_tenant_id, 'Marketing e Publicidade', 'despesa_comercial', 11),
    (p_tenant_id, 'Comissões de Vendas', 'despesa_comercial', 12),
    (p_tenant_id, 'Aluguel e Condomínio', 'despesa_geral', 13),
    (p_tenant_id, 'Energia, Água e Telefone', 'despesa_geral', 14),
    (p_tenant_id, 'Material de Escritório', 'despesa_geral', 15),
    (p_tenant_id, 'Depreciação de Equipamentos', 'depreciacao_amortizacao', 16),
    (p_tenant_id, 'Amortização de Intangíveis', 'depreciacao_amortizacao', 17),
    (p_tenant_id, 'Rendimentos de Aplicações', 'receita_financeira', 18),
    (p_tenant_id, 'Juros Recebidos', 'receita_financeira', 19),
    (p_tenant_id, 'Juros de Empréstimos', 'despesa_financeira', 20),
    (p_tenant_id, 'Tarifas Bancárias', 'despesa_financeira', 21),
    (p_tenant_id, 'IOF', 'despesa_financeira', 22),
    (p_tenant_id, 'IRPJ', 'imposto_renda', 23),
    (p_tenant_id, 'CSLL', 'csll', 24);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Ao criar tenant, popular categorias
-- ============================================

CREATE OR REPLACE FUNCTION public.on_tenant_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria config white-label padrão
  INSERT INTO public.tenant_configs (tenant_id, company_name)
  VALUES (NEW.id, NEW.name);

  -- Popula categorias DRE padrão
  PERFORM public.seed_dre_categories(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.on_tenant_created();

-- ============================================
-- TRIGGER: Ao criar usuário (auth), criar perfil
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_slug TEXT;
BEGIN
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  v_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := v_slug || '-' || substr(NEW.id::text, 1, 8);

  -- Cria tenant para o novo usuário
  INSERT INTO public.tenants (name, slug, schema_name)
  VALUES (v_company_name, v_slug, 'tenant_' || replace(NEW.id::text, '-', '_'))
  RETURNING id INTO v_tenant_id;

  -- Cria perfil com role owner
  INSERT INTO public.user_profiles (id, email, full_name, tenant_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_tenant_id,
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
