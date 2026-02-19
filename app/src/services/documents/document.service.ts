import { createClient } from '@/services/supabase/client';
import type { Document } from '@/types/document.types';
import { MAX_FILE_SIZE, ACCEPTED_MIME_TYPES } from '@/types/document.types';

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

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'bin';
}

// ============================================
// Upload
// ============================================

export async function uploadDocument(
  file: File,
  nature: string
): Promise<Document> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo excede o limite de 10MB');
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
    throw new Error('Tipo de arquivo não permitido. Use PDF, JPG ou PNG');
  }

  const supabase = createClient();
  const { userId, tenantId } = await getTenantAndUser();

  const tempId = crypto.randomUUID();
  const ext = getFileExtension(file.name);
  const storagePath = `${tenantId}/${tempId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      name: file.name,
      nature,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from('documents').remove([storagePath]);
    throw new Error(`Erro ao salvar documento: ${error.message}`);
  }

  return data;
}

// ============================================
// Listagem
// ============================================

export async function getDocuments(
  filters?: { nature?: string }
): Promise<Document[]> {
  const supabase = createClient();
  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.nature) {
    query = query.eq('nature', filters.nature);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar documentos: ${error.message}`);
  return data ?? [];
}

// ============================================
// Signed URL (Download)
// ============================================

export async function getSignedUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 300);

  if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
  return data.signedUrl;
}

// ============================================
// Exclusão
// ============================================

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`Erro ao buscar documento: ${fetchError.message}`);

  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([doc.storage_path]);

  if (storageError) throw new Error(`Erro ao remover arquivo: ${storageError.message}`);

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(`Erro ao excluir documento: ${deleteError.message}`);
}
