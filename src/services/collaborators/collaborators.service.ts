import { createClient } from '@/services/supabase/client';
import type { Collaborator, AccessLevel, Department } from '@/types/collaborators.types';

export async function getCollaborators(): Promise<Collaborator[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // Get user's tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) throw new Error('Perfil não encontrado');

  // Filter collaborators by tenant_id
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('full_name')
    .limit(200);

  if (error) throw new Error(`Erro ao buscar colaboradores: ${error.message}`);
  return data ?? [];
}

export async function updateCollaborator(
  id: string,
  updates: Partial<{
    role: AccessLevel;
    department: Department | null;
    job_title: string | null;
    is_active: boolean;
  }>
): Promise<Collaborator> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar colaborador: ${error.message}`);
  return data;
}

export async function deleteCollaborator(id: string): Promise<void> {
  const res = await fetch('/api/collaborators/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collaboratorId: id }),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.error || 'Erro ao excluir colaborador');
  }
}
