import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import { createSale } from '@/services/sales/sales.service';
import type { Quote, QuoteItem, CreateQuoteData } from '@/types/quotes.types';

// ============================================
// Listar Orcamentos
// ============================================

export async function getQuotes(): Promise<Quote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*, client:client_id(name, client_type)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(`Erro ao buscar orçamentos: ${error.message}`);

  return (data ?? []).map((quote: Record<string, unknown>) => {
    const client = quote.client as { name: string; client_type: string } | null;
    return {
      ...quote,
      client_name: client?.name ?? '',
      client_type: client?.client_type ?? '',
    };
  }) as Quote[];
}

// ============================================
// Buscar Orcamento com Itens
// ============================================

export async function getQuoteWithItems(
  id: string
): Promise<{ quote: Quote; items: QuoteItem[] }> {
  const supabase = createClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*, client:client_id(name, client_type)')
    .eq('id', id)
    .single();

  if (quoteError) throw new Error(`Erro ao buscar orçamento: ${quoteError.message}`);

  const { data: items, error: itemsError } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id);

  if (itemsError) throw new Error(`Erro ao buscar itens do orçamento: ${itemsError.message}`);

  const client = quote.client as { name: string; client_type: string } | null;
  const quoteWithClient = {
    ...quote,
    client_name: client?.name ?? '',
    client_type: client?.client_type ?? '',
  } as Quote;

  return { quote: quoteWithClient, items: items ?? [] };
}

// ============================================
// Gerar Proximo Protocolo OP
// ============================================

export async function getNextQuoteProtocol(): Promise<string> {
  const supabase = createClient();
  const tenantId = await getTenantId();
  const year = new Date().getFullYear().toString().slice(-2);

  const { data, error } = await supabase.rpc('next_quote_protocol', {
    yr: year,
    tenant: tenantId,
  });

  if (error) {
    // Fallback para o método client-side caso a função RPC não exista
    const { data: fallbackData } = await supabase
      .from('quotes')
      .select('protocol')
      .like('protocol', `OP%-${year}`)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (fallbackData && fallbackData.length > 0) {
      const match = fallbackData[0].protocol.match(/OP(\d+)-/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `OP${String(nextNumber).padStart(3, '0')}-${year}`;
  }

  return data as string;
}

// ============================================
// Criar Orcamento
// ============================================

export async function createQuote(data: CreateQuoteData): Promise<Quote> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const protocol = await getNextQuoteProtocol();

  const itemsTotal = data.items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = data.discount_enabled
    ? Math.round(itemsTotal * (data.discount_percent / 100) * 100) / 100
    : 0;
  const total = itemsTotal - discountAmount;

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      tenant_id: tenantId,
      protocol,
      client_id: data.client_id,
      status: 'pendente',
      delivery_type: data.delivery_type,
      payment_method: data.payment_method,
      validity_days: data.validity_days,
      discount_enabled: data.discount_enabled,
      discount_percent: data.discount_percent,
      items_total: itemsTotal,
      discount_amount: discountAmount,
      total,
      notes: data.notes,
      created_by: user.id,
    })
    .select()
    .single();

  if (quoteError) throw new Error(`Erro ao criar orçamento: ${quoteError.message}`);

  const quoteItems = data.items.map((item) => ({
    quote_id: quote.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(quoteItems);

  if (itemsError) throw new Error(`Erro ao inserir itens do orçamento: ${itemsError.message}`);

  return quote as Quote;
}

// ============================================
// Atualizar Orcamento
// ============================================

export async function updateQuote(
  id: string,
  data: CreateQuoteData
): Promise<Quote> {
  const supabase = createClient();

  const itemsTotal = data.items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = data.discount_enabled
    ? Math.round(itemsTotal * (data.discount_percent / 100) * 100) / 100
    : 0;
  const total = itemsTotal - discountAmount;

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .update({
      client_id: data.client_id,
      delivery_type: data.delivery_type,
      payment_method: data.payment_method,
      validity_days: data.validity_days,
      discount_enabled: data.discount_enabled,
      discount_percent: data.discount_percent,
      items_total: itemsTotal,
      discount_amount: discountAmount,
      total,
      notes: data.notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (quoteError) throw new Error(`Erro ao atualizar orçamento: ${quoteError.message}`);

  // Remove itens antigos e insere novos
  const { error: deleteError } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', id);

  if (deleteError) throw new Error(`Erro ao limpar itens: ${deleteError.message}`);

  const quoteItems = data.items.map((item) => ({
    quote_id: id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_amount: item.discount_amount,
    total_price: item.total_price,
  }));

  if (quoteItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems);

    if (itemsError) throw new Error(`Erro ao inserir itens: ${itemsError.message}`);
  }

  return quote as Quote;
}

// ============================================
// Soft Delete / Restore
// ============================================

export async function softDeleteQuote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('quotes')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) throw new Error(`Erro ao excluir orçamento: ${error.message}`);
}

export async function restoreQuote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('quotes')
    .update({ is_deleted: false })
    .eq('id', id);

  if (error) throw new Error(`Erro ao restaurar orçamento: ${error.message}`);
}

// ============================================
// Atualizar Status
// ============================================

export async function updateQuoteStatus(
  id: string,
  status: 'pendente' | 'aprovado' | 'recusado'
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
}

// ============================================
// Converter Orcamento em Venda
// ============================================

export async function convertQuoteToSale(id: string): Promise<void> {
  const { quote, items } = await getQuoteWithItems(id);

  if (!quote.client_id) {
    throw new Error('Orçamento sem cliente vinculado. Vincule um cliente antes de converter.');
  }

  const sale = await createSale({
    client_id: quote.client_id,
    items: items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    })),
    delivery_type: quote.delivery_type as 'entrega' | 'retirada',
    freight_enabled: false,
    freight_amount: 0,
    payment_status: 'pendente',
    payment_method: quote.payment_method || '',
  });

  const supabase = createClient();
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'convertido', converted_sale_id: sale.id })
    .eq('id', id);

  if (error) throw new Error(`Erro ao marcar orçamento como convertido: ${error.message}`);
}
