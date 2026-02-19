import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { Supplier, SupplierItem } from '@/types/compras.types';

export async function getSuppliers(activeOnly = true): Promise<Supplier[]> {
  const supabase = createClient();
  let query = supabase
    .from('suppliers')
    .select('*')
    .order('name');

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar fornecedores: ${error.message}`);
  return data ?? [];
}

export async function getSupplier(id: string): Promise<Supplier> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Erro ao buscar fornecedor: ${error.message}`);
  return data;
}

export async function createSupplier(
  supplier: Pick<Supplier, 'name' | 'cnpj' | 'phone' | 'whatsapp' | 'email' | 'contact_person' | 'notes'>
): Promise<Supplier> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar fornecedor: ${error.message}`);
  return data;
}

export async function updateSupplier(
  id: string,
  updates: Partial<Pick<Supplier, 'name' | 'cnpj' | 'phone' | 'whatsapp' | 'email' | 'contact_person' | 'notes' | 'is_active'>>
): Promise<Supplier> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
  return data;
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir fornecedor: ${error.message}`);
}

// ============================================
// Vinculo Fornecedor-Item
// ============================================

export async function getSupplierItems(supplierId: string): Promise<SupplierItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('supplier_items')
    .select('*, purchase_item:purchase_items(*)')
    .eq('supplier_id', supplierId)
    .order('item_id');

  if (error) throw new Error(`Erro ao buscar itens do fornecedor: ${error.message}`);
  return data ?? [];
}

export async function linkItem(supplierId: string, itemId: string): Promise<SupplierItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('supplier_items')
    .insert({ supplier_id: supplierId, item_id: itemId })
    .select('*, purchase_item:purchase_items(*)')
    .single();

  if (error) throw new Error(`Erro ao vincular item: ${error.message}`);
  return data;
}

export async function unlinkItem(supplierId: string, itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('supplier_items')
    .delete()
    .eq('supplier_id', supplierId)
    .eq('item_id', itemId);

  if (error) throw new Error(`Erro ao desvincular item: ${error.message}`);
}

export async function bulkLinkItems(supplierId: string, itemIds: string[]): Promise<void> {
  const supabase = createClient();

  // Remove existing links first
  const { error: delError } = await supabase
    .from('supplier_items')
    .delete()
    .eq('supplier_id', supplierId);

  if (delError) throw new Error(`Erro ao atualizar vínculos: ${delError.message}`);

  if (itemIds.length === 0) return;

  const rows = itemIds.map((itemId) => ({
    supplier_id: supplierId,
    item_id: itemId,
  }));

  const { error } = await supabase.from('supplier_items').insert(rows);
  if (error) throw new Error(`Erro ao vincular itens: ${error.message}`);
}
