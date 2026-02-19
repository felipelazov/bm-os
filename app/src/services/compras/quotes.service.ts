import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { PurchaseQuote, ItemPriceStats, PurchaseItem } from '@/types/compras.types';

export async function createQuote(
  quote: Pick<PurchaseQuote, 'item_id' | 'supplier_id' | 'unit_price' | 'quantity' | 'brand' | 'quote_date' | 'source' | 'notes'>
): Promise<PurchaseQuote> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('purchase_quotes')
    .insert({ ...quote, tenant_id: tenantId })
    .select('*, purchase_item:purchase_items(*), supplier:suppliers(*)')
    .single();

  if (error) throw new Error(`Erro ao criar cotação: ${error.message}`);

  // Atualizar last_unit_price no supplier_items se houver fornecedor
  if (quote.supplier_id) {
    await supabase
      .from('supplier_items')
      .update({ last_unit_price: quote.unit_price, last_quote_date: quote.quote_date })
      .eq('supplier_id', quote.supplier_id)
      .eq('item_id', quote.item_id);
  }

  return data;
}

export async function getQuotesByItem(itemId: string): Promise<PurchaseQuote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('purchase_quotes')
    .select('*, purchase_item:purchase_items(*), supplier:suppliers(*)')
    .eq('item_id', itemId)
    .order('quote_date', { ascending: false });

  if (error) throw new Error(`Erro ao buscar cotações: ${error.message}`);
  return data ?? [];
}

export async function getItemPriceStats(): Promise<ItemPriceStats[]> {
  const supabase = createClient();

  // Buscar itens ativos
  const { data: items, error: itemsError } = await supabase
    .from('purchase_items')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (itemsError) throw new Error(`Erro ao buscar itens: ${itemsError.message}`);
  if (!items || items.length === 0) return [];

  // Buscar cotações dos últimos 3 meses
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const dateStr = threeMonthsAgo.toISOString().split('T')[0];

  const { data: quotes, error: quotesError } = await supabase
    .from('purchase_quotes')
    .select('item_id, unit_price, quote_date')
    .gte('quote_date', dateStr)
    .order('quote_date', { ascending: false });

  if (quotesError) throw new Error(`Erro ao buscar cotações: ${quotesError.message}`);

  const quotesByItem = new Map<string, { prices: number[]; latest: number | null }>();
  for (const q of quotes ?? []) {
    if (!quotesByItem.has(q.item_id)) {
      quotesByItem.set(q.item_id, { prices: [], latest: null });
    }
    const entry = quotesByItem.get(q.item_id)!;
    entry.prices.push(Number(q.unit_price));
    if (entry.latest === null) entry.latest = Number(q.unit_price);
  }

  return (items as PurchaseItem[]).map((item) => {
    const stats = quotesByItem.get(item.id);
    const lastPrice = stats?.latest ?? null;
    const avgPrice = stats ? stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length : null;
    let variationPct: number | null = null;
    let status: 'abaixo' | 'normal' | 'acima' = 'normal';

    if (lastPrice !== null && avgPrice !== null && avgPrice > 0) {
      variationPct = ((lastPrice - avgPrice) / avgPrice) * 100;
      if (variationPct < -10) status = 'abaixo';
      else if (variationPct > 15) status = 'acima';
    }

    return {
      item_id: item.id,
      item_name: item.name,
      category: item.category,
      brand: item.brand,
      last_price: lastPrice,
      avg_price_3m: avgPrice ? Math.round(avgPrice * 100) / 100 : null,
      variation_pct: variationPct ? Math.round(variationPct * 10) / 10 : null,
      status,
      quote_count: stats?.prices.length ?? 0,
    };
  });
}

export async function deleteQuote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('purchase_quotes').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir cotação: ${error.message}`);
}
