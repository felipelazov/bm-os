import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import { adjustStock } from '@/services/products/stock.service';
import type { Sale, SaleItem, SaleStatus, CreateSaleData } from '@/types/sales.types';

// ============================================
// Listar Vendas
// ============================================

export async function getSales(
  filters?: { status?: SaleStatus }
): Promise<Sale[]> {
  const supabase = createClient();
  let query = supabase
    .from('sales')
    .select('*, client:client_id(name, client_type)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar vendas: ${error.message}`);

  return (data ?? []).map((sale: Record<string, unknown>) => {
    const client = sale.client as { name: string; client_type: string } | null;
    return {
      ...sale,
      client_name: client?.name ?? '',
      client_type: client?.client_type ?? '',
    };
  }) as Sale[];
}

// ============================================
// Buscar Venda com Items
// ============================================

export async function getSaleWithItems(
  id: string
): Promise<{ sale: Sale; items: SaleItem[] }> {
  const supabase = createClient();

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*, client:client_id(name, client_type)')
    .eq('id', id)
    .single();

  if (saleError) throw new Error(`Erro ao buscar venda: ${saleError.message}`);

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', id);

  if (itemsError) throw new Error(`Erro ao buscar itens da venda: ${itemsError.message}`);

  const client = sale.client as { name: string; client_type: string } | null;
  const saleWithClient = {
    ...sale,
    client_name: client?.name ?? '',
    client_type: client?.client_type ?? '',
  } as Sale;

  return { sale: saleWithClient, items: items ?? [] };
}

// ============================================
// Gerar Proximo Protocolo
// ============================================

export async function getNextProtocol(): Promise<string> {
  const supabase = createClient();
  const tenantId = await getTenantId();
  const year = new Date().getFullYear().toString().slice(-2);

  const { data, error } = await supabase.rpc('next_sale_protocol', {
    yr: year,
    tenant: tenantId,
  });

  if (error) {
    // Fallback para o método client-side caso a função RPC não exista
    const { data: fallbackData } = await supabase
      .from('sales')
      .select('protocol')
      .like('protocol', `VP%-${year}`)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (fallbackData && fallbackData.length > 0) {
      const match = fallbackData[0].protocol.match(/VP(\d+)-/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `VP${String(nextNumber).padStart(3, '0')}-${year}`;
  }

  return data as string;
}

// ============================================
// Criar Venda
// ============================================

export async function createSale(data: CreateSaleData): Promise<Sale> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const protocol = await getNextProtocol();

  const itemsTotal = data.items.reduce((sum, item) => sum + item.total_price, 0);
  const freightAmount = data.freight_enabled ? data.freight_amount : 0;
  const total = itemsTotal + freightAmount;

  const isPaid = data.payment_status === 'pago';

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      tenant_id: tenantId,
      protocol,
      client_id: data.client_id,
      status: isPaid ? 'finalizada' : 'em_aberto',
      payment_status: data.payment_status,
      payment_method: data.payment_method || null,
      delivery_type: data.delivery_type,
      delivery_location_id: data.delivery_location_id || null,
      freight_enabled: data.freight_enabled,
      freight_amount: freightAmount,
      items_total: itemsTotal,
      total,
      created_by: user.id,
      finalized_at: isPaid ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (saleError) throw new Error(`Erro ao criar venda: ${saleError.message}`);

  // Inserir itens
  const saleItems = data.items.map((item) => ({
    sale_id: sale.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) throw new Error(`Erro ao inserir itens da venda: ${itemsError.message}`);

  // Baixa de estoque se pago + retirada com local definido
  if (isPaid && data.delivery_type === 'retirada' && data.delivery_location_id) {
    for (const item of data.items) {
      await adjustStock(
        item.product_id,
        data.delivery_location_id,
        item.quantity,
        'exit',
        `Venda ${protocol}`
      );
    }
  }

  // Criar entrega automatica se tipo = entrega
  if (data.delivery_type === 'entrega') {
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', data.client_id)
      .single();

    const itemsSummary = data.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ');

    await supabase.from('deliveries').insert({
      tenant_id: tenantId,
      sale_id: sale.id,
      client_name: client?.name || '',
      client_phone: client?.phone || client?.whatsapp || '',
      client_address: client?.address || '',
      client_address_number: client?.address_number || '',
      client_neighborhood: client?.neighborhood || '',
      client_city: client?.city || '',
      items_summary: itemsSummary,
      total,
      payment_method: data.payment_method || null,
      created_by: user.id,
    });
  }

  return sale as Sale;
}

// ============================================
// Atualizar Pagamento da Venda
// ============================================

export async function updateSalePayment(
  id: string,
  updates: { payment_status: 'pendente' | 'pago'; payment_method?: string }
): Promise<void> {
  const supabase = createClient();

  // Buscar venda atual
  const { data: current, error: fetchError } = await supabase
    .from('sales')
    .select('*, items:sale_items(*)')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(`Erro ao buscar venda: ${fetchError.message}`);

  const isFinalizando =
    current.payment_status === 'pendente' && updates.payment_status === 'pago';

  const updateData: Record<string, unknown> = {
    payment_status: updates.payment_status,
    payment_method: updates.payment_method || current.payment_method,
  };

  if (isFinalizando) {
    updateData.status = 'finalizada';
    updateData.finalized_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('sales')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(`Erro ao atualizar venda: ${error.message}`);

  // Baixa de estoque ao finalizar
  if (
    isFinalizando &&
    current.delivery_type === 'retirada' &&
    current.delivery_location_id
  ) {
    const items = current.items as SaleItem[];
    for (const item of items) {
      await adjustStock(
        item.product_id,
        current.delivery_location_id,
        item.quantity,
        'exit',
        `Venda ${current.protocol}`
      );
    }
  }
}

// ============================================
// Cancelar Venda
// ============================================

export async function cancelSale(id: string): Promise<void> {
  const supabase = createClient();

  // 1. Buscar venda com items
  const { sale, items } = await getSaleWithItems(id);

  // 2. Validar: se já cancelada, throw erro
  if (sale.status === 'cancelada') {
    throw new Error('Esta venda já está cancelada');
  }

  // 3. Reverter estoque se venda era finalizada + retirada + tinha local definido
  if (
    sale.status === 'finalizada' &&
    sale.delivery_type === 'retirada' &&
    sale.delivery_location_id
  ) {
    for (const item of items) {
      await adjustStock(
        item.product_id,
        sale.delivery_location_id,
        item.quantity,
        'entry',
        `Cancelamento venda ${sale.protocol}`
      );
    }
  }

  // 4. Remover entrega vinculada se tipo = entrega
  if (sale.delivery_type === 'entrega') {
    await supabase.from('deliveries').delete().eq('sale_id', id);
  }

  // 5. Atualizar status para cancelada
  const { error } = await supabase
    .from('sales')
    .update({ status: 'cancelada', cancelled_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Erro ao cancelar venda: ${error.message}`);
}

// ============================================
// Excluir Venda
// ============================================

export async function deleteSale(id: string): Promise<void> {
  const supabase = createClient();

  // Limpar referência em orçamentos convertidos para esta venda
  await supabase
    .from('quotes')
    .update({ converted_sale_id: null })
    .eq('converted_sale_id', id);

  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir venda: ${error.message}`);
}
