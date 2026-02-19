import { createClient } from '@/services/supabase/client';
import type { DreEntry, DrePeriod, DreCategory } from '@/types/dre.types';

export async function getPeriods(): Promise<DrePeriod[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('dre_periods')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw new Error(`Erro ao buscar períodos: ${error.message}`);
  return data ?? [];
}

export async function getPeriodById(periodId: string): Promise<DrePeriod | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('dre_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar período: ${error.message}`);
  }
  return data;
}

export async function createPeriod(
  period: Pick<DrePeriod, 'name' | 'type' | 'start_date' | 'end_date'>
): Promise<DrePeriod> {
  const supabase = createClient();

  // Busca tenant_id do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Perfil de usuário não encontrado');

  const { data, error } = await supabase
    .from('dre_periods')
    .insert({
      ...period,
      tenant_id: profile.tenant_id,
      is_closed: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar período: ${error.message}`);
  return data;
}

export async function getCategories(): Promise<DreCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('dre_categories')
    .select('*')
    .eq('is_active', true)
    .order('order');

  if (error) throw new Error(`Erro ao buscar categorias: ${error.message}`);
  return data ?? [];
}

export async function getEntries(periodId: string): Promise<DreEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('dre_entries')
    .select('*')
    .eq('period_id', periodId);

  if (error) throw new Error(`Erro ao buscar lançamentos: ${error.message}`);
  return data ?? [];
}

export async function upsertEntry(
  entry: { period_id: string; category_id: string; description: string; value: number; notes?: string | null }
): Promise<DreEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('dre_entries')
    .upsert(entry, { onConflict: 'period_id,category_id,description' })
    .select()
    .single();

  if (error) throw new Error(`Erro ao salvar lançamento: ${error.message}`);
  return data;
}

export async function upsertEntries(
  entries: { period_id: string; category_id: string; description: string; value: number; notes?: string | null }[]
): Promise<DreEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('dre_entries')
    .upsert(entries, { onConflict: 'period_id,category_id,description' })
    .select();

  if (error) throw new Error(`Erro ao salvar lançamentos: ${error.message}`);
  return data ?? [];
}

export async function deleteEntry(entryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('dre_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw new Error(`Erro ao excluir lançamento: ${error.message}`);
}

export async function closePeriod(periodId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('dre_periods')
    .update({ is_closed: true })
    .eq('id', periodId);

  if (error) throw new Error(`Erro ao fechar período: ${error.message}`);
}

export async function deletePeriod(periodId: string): Promise<void> {
  const supabase = createClient();
  // Deleta entries primeiro (cascade deveria fazer, mas por segurança)
  await supabase.from('dre_entries').delete().eq('period_id', periodId);
  const { error } = await supabase
    .from('dre_periods')
    .delete()
    .eq('id', periodId);

  if (error) throw new Error(`Erro ao excluir período: ${error.message}`);
}
