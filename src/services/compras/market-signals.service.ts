import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { MarketSignal } from '@/types/compras.types';

export async function getMarketSignals(filters?: { category?: string }): Promise<MarketSignal[]> {
  const supabase = createClient();
  let query = supabase
    .from('market_signals')
    .select('*')
    .order('published_at', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar sinais: ${error.message}`);
  return data ?? [];
}

export async function createMarketSignal(
  signal: Pick<MarketSignal, 'category' | 'source' | 'title' | 'summary' | 'impact' | 'url' | 'published_at'>
): Promise<MarketSignal> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('market_signals')
    .insert({ ...signal, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar sinal: ${error.message}`);
  return data;
}

export async function updateMarketSignal(
  id: string,
  updates: Partial<Pick<MarketSignal, 'category' | 'source' | 'title' | 'summary' | 'impact' | 'url' | 'published_at'>>
): Promise<MarketSignal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('market_signals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar sinal: ${error.message}`);
  return data;
}

export async function deleteMarketSignal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('market_signals').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir sinal: ${error.message}`);
}
