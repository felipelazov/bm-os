import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { PurchaseItem } from '@/types/compras.types';
import { SEED_PURCHASE_ITEMS } from '@/lib/constants';

export async function getItems(filters?: { category?: string; activeOnly?: boolean }): Promise<PurchaseItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('purchase_items')
    .select('*')
    .order('category')
    .order('name');

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.activeOnly !== false) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar itens: ${error.message}`);
  return data ?? [];
}

export async function createItem(
  item: Pick<PurchaseItem, 'name' | 'category' | 'unit' | 'brand'>
): Promise<PurchaseItem> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('purchase_items')
    .insert({ ...item, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar item: ${error.message}`);
  return data;
}

export async function updateItem(
  id: string,
  updates: Partial<Pick<PurchaseItem, 'name' | 'category' | 'unit' | 'brand' | 'is_active'>>
): Promise<PurchaseItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar item: ${error.message}`);
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('purchase_items').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir item: ${error.message}`);
}

export async function seedItems(): Promise<number> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const items = SEED_PURCHASE_ITEMS.map((item) => ({
    ...item,
    tenant_id: tenantId,
  }));

  const { error } = await supabase.from('purchase_items').insert(items);
  if (error) throw new Error(`Erro ao importar catálogo: ${error.message}`);
  return items.length;
}

export async function getItemCount(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from('purchase_items')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(`Erro ao contar itens: ${error.message}`);
  return count ?? 0;
}
