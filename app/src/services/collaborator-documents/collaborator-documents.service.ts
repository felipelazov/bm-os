import { createClient } from '@/services/supabase/client';
import type {
  CollaboratorDocument,
  CreateReceiptData,
  CreateCertificateData,
} from '@/types/collaborator-documents.types';
import { MAX_CERTIFICATE_SIZE, ACCEPTED_CERTIFICATE_TYPES } from '@/types/collaborator-documents.types';

// ============================================
// Helpers
// ============================================

async function getTenantAndUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Perfil não encontrado');
  return { userId: user.id, tenantId: profile.tenant_id };
}

function generateRegistryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'bin';
}

// ============================================
// Listagem
// ============================================

export async function getCollaboratorDocuments(
  filters?: { doc_type?: string; collaborator_id?: string }
): Promise<CollaboratorDocument[]> {
  const supabase = createClient();

  let query = supabase
    .from('collaborator_documents')
    .select(`
      *,
      collaborator:user_profiles!collaborator_id (
        full_name,
        department,
        job_title
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.doc_type) {
    query = query.eq('doc_type', filters.doc_type);
  }

  if (filters?.collaborator_id) {
    query = query.eq('collaborator_id', filters.collaborator_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar documentos: ${error.message}`);

  return (data ?? []).map((doc) => {
    const collab = doc.collaborator as unknown as {
      full_name: string;
      department: string | null;
      job_title: string | null;
    } | null;
    return {
      ...doc,
      collaborator_name: collab?.full_name ?? 'Desconhecido',
      collaborator_department: collab?.department ?? null,
      collaborator_job_title: collab?.job_title ?? null,
      collaborator: undefined,
    } as CollaboratorDocument;
  });
}

// ============================================
// Criar Recibo
// ============================================

export async function createReceipt(
  data: CreateReceiptData
): Promise<CollaboratorDocument> {
  const supabase = createClient();
  const { userId, tenantId } = await getTenantAndUser();

  const { data: doc, error } = await supabase
    .from('collaborator_documents')
    .insert({
      tenant_id: tenantId,
      collaborator_id: data.collaborator_id,
      created_by: userId,
      doc_type: 'recibo',
      description: data.description,
      reference: data.reference,
      amount: data.amount,
      payment_method: data.payment_method,
      doc_date: data.doc_date,
      registry_code: generateRegistryCode(),
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar recibo: ${error.message}`);
  return doc;
}

// ============================================
// Criar Atestado (com upload)
// ============================================

export async function createCertificate(
  file: File,
  data: CreateCertificateData
): Promise<CollaboratorDocument> {
  if (file.size > MAX_CERTIFICATE_SIZE) {
    throw new Error('Arquivo excede o limite de 10MB');
  }

  if (!ACCEPTED_CERTIFICATE_TYPES.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP');
  }

  const supabase = createClient();
  const { userId, tenantId } = await getTenantAndUser();

  const tempId = crypto.randomUUID();
  const ext = getFileExtension(file.name);
  const storagePath = `${tenantId}/certificates/${tempId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

  const { data: doc, error } = await supabase
    .from('collaborator_documents')
    .insert({
      tenant_id: tenantId,
      collaborator_id: data.collaborator_id,
      created_by: userId,
      doc_type: 'atestado',
      description: data.description,
      doc_date: data.doc_date,
      storage_path: storagePath,
      mime_type: file.type,
      registry_code: generateRegistryCode(),
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('documents').remove([storagePath]);
    throw new Error(`Erro ao salvar atestado: ${error.message}`);
  }

  return doc;
}

// ============================================
// Exclusão
// ============================================

export async function deleteCollaboratorDocument(id: string): Promise<void> {
  const supabase = createClient();

  const { data: doc, error: fetchError } = await supabase
    .from('collaborator_documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`Erro ao buscar documento: ${fetchError.message}`);

  if (doc.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.storage_path]);

    if (storageError) throw new Error(`Erro ao remover arquivo: ${storageError.message}`);
  }

  const { error: deleteError } = await supabase
    .from('collaborator_documents')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(`Erro ao excluir documento: ${deleteError.message}`);
}

// ============================================
// Signed URL (para atestados)
// ============================================

export async function getCertificateSignedUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 300);

  if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
  return data.signedUrl;
}
