import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { Product, ProductKitItem } from '@/types/products.types';

export async function getProducts(activeOnly = true): Promise<Product[]> {
  const supabase = createClient();
  let query = supabase
    .from('products')
    .select('*')
    .order('name')
    .limit(500);

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);
  return data ?? [];
}

export async function createProduct(
  product: Pick<Product, 'name' | 'sku' | 'category' | 'product_type' | 'unit' | 'cost_price' | 'sale_price' | 'min_stock'>
): Promise<Product> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar produto: ${error.message}`);
  return data;
}

export async function updateProduct(
  id: string,
  updates: Partial<Pick<Product, 'name' | 'sku' | 'category' | 'product_type' | 'unit' | 'cost_price' | 'sale_price' | 'min_stock' | 'is_active'>>
): Promise<Product> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar produto: ${error.message}`);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();

  const { count: salesCount } = await supabase
    .from('sale_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  if (salesCount && salesCount > 0) {
    throw new Error(
      `Este produto está vinculado a ${salesCount} item(ns) de venda e não pode ser excluído. Desative-o em vez de excluir.`
    );
  }

  const { count: quotesCount } = await supabase
    .from('quote_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id);

  if (quotesCount && quotesCount > 0) {
    throw new Error(
      `Este produto está vinculado a ${quotesCount} item(ns) de orçamento e não pode ser excluído. Desative-o em vez de excluir.`
    );
  }

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir produto: ${error.message}`);
}

export async function getKitItems(productId: string): Promise<ProductKitItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_kit_items')
    .select('*, item_product:item_product_id(*)')
    .eq('product_id', productId);

  if (error) throw new Error(`Erro ao buscar itens do kit: ${error.message}`);
  return data ?? [];
}

export async function setKitItems(
  productId: string,
  items: { item_product_id: string; quantity: number }[]
): Promise<void> {
  const supabase = createClient();

  const { error: deleteError } = await supabase
    .from('product_kit_items')
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw new Error(`Erro ao limpar itens do kit: ${deleteError.message}`);

  if (items.length === 0) return;

  const rows = items.map((item) => ({
    product_id: productId,
    item_product_id: item.item_product_id,
    quantity: item.quantity,
  }));

  const { error: insertError } = await supabase
    .from('product_kit_items')
    .insert(rows);

  if (insertError) throw new Error(`Erro ao salvar itens do kit: ${insertError.message}`);
}
