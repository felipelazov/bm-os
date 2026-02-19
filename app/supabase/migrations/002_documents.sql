-- ============================================
-- Módulo Documentos
-- Tabela, índices, RLS e bucket storage
-- ============================================

-- Tabela de documentos
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  nature TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX idx_documents_nature ON public.documents(tenant_id, nature);
CREATE INDEX idx_documents_created ON public.documents(tenant_id, created_at DESC);

-- RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation select" ON public.documents
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.documents
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant isolation delete" ON public.documents
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- ============================================
-- Storage Bucket (executar via Dashboard ou API)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('documents', 'documents', false, 10485760);
--
-- Storage RLS policies:
--
-- CREATE POLICY "Tenant upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'documents'
--     AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
--   );
--
-- CREATE POLICY "Tenant download" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'documents'
--     AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
--   );
--
-- CREATE POLICY "Tenant delete" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'documents'
--     AND (storage.foldername(name))[1] = public.get_user_tenant_id()::text
--   );
