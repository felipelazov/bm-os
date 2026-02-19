-- Migration: Collaborator Documents (Recibos e Atestados)
-- Central de Documentos de Colaboradores

CREATE TABLE public.collaborator_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('recibo', 'atestado')),
  description TEXT NOT NULL,
  reference TEXT,
  amount DECIMAL(12,2),
  payment_method TEXT,
  storage_path TEXT,
  mime_type TEXT,
  registry_code TEXT NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_collab_docs_tenant ON public.collaborator_documents(tenant_id);
CREATE INDEX idx_collab_docs_collaborator ON public.collaborator_documents(collaborator_id);
CREATE INDEX idx_collab_docs_type ON public.collaborator_documents(doc_type);
CREATE INDEX idx_collab_docs_date ON public.collaborator_documents(doc_date DESC);
CREATE UNIQUE INDEX idx_collab_docs_registry ON public.collaborator_documents(registry_code);

-- RLS
ALTER TABLE public.collaborator_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view collaborator documents"
  ON public.collaborator_documents FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert collaborator documents"
  ON public.collaborator_documents FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can delete collaborator documents"
  ON public.collaborator_documents FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());
