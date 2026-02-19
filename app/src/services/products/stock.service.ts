import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { StockLocation, StockLevel, StockMovement, MovementType } from '@/types/products.types';

// ============================================
// Locais de Estoque
// ============================================

export async function getStockLocations(activeOnly = true): Promise<StockLocation[]> {
  const supabase = createClient();
  let query = supabase
    .from('stock_locations')
    .select('*')
    .order('sort_order')
    .order('name')
    .limit(200);

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar locais de estoque: ${error.message}`);
  return data ?? [];
}

export async function createLocation(name: string): Promise<StockLocation> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('stock_locations')
    .insert({ name, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar local de estoque: ${error.message}`);
  return data;
}

export async function updateLocation(
  id: string,
  updates: Partial<Pick<StockLocation, 'name' | 'is_active' | 'cep' | 'address' | 'address_number' | 'neighborhood' | 'city' | 'state' | 'sort_order'>>
): Promise<StockLocation> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stock_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar local de estoque: ${error.message}`);
  return data;
}

export async function reorderLocations(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('stock_locations')
      .update({ sort_order: i })
      .eq('id', orderedIds[i]);

    if (error) throw new Error(`Erro ao reordenar locais: ${error.message}`);
  }
}

export async function deleteLocation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('stock_locations').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir local de estoque: ${error.message}`);
}

// ============================================
// Niveis de Estoque
// ============================================

export async function getStockLevels(): Promise<StockLevel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stock_levels')
    .select('*, location:location_id(*)')
    .limit(500);

  if (error) throw new Error(`Erro ao buscar niveis de estoque: ${error.message}`);
  return data ?? [];
}

// ============================================
// Transferencia de Estoque
// ============================================

export async function transferStock(
  productId: string,
  fromLocationId: string,
  toLocationId: string,
  quantity: number,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  // Verificar saldo na origem
  const { data: fromLevel } = await supabase
    .from('stock_levels')
    .select('id, quantity')
    .eq('product_id', productId)
    .eq('location_id', fromLocationId)
    .single();

  if (!fromLevel || fromLevel.quantity < quantity) {
    throw new Error('Saldo insuficiente no local de origem');
  }

  // Diminuir na origem
  const { error: decError } = await supabase
    .from('stock_levels')
    .update({ quantity: fromLevel.quantity - quantity })
    .eq('id', fromLevel.id);

  if (decError) throw new Error(`Erro ao atualizar origem: ${decError.message}`);

  // Aumentar no destino (upsert)
  const { data: toLevel } = await supabase
    .from('stock_levels')
    .select('id, quantity')
    .eq('product_id', productId)
    .eq('location_id', toLocationId)
    .maybeSingle();

  if (toLevel) {
    const { error: incError } = await supabase
      .from('stock_levels')
      .update({ quantity: toLevel.quantity + quantity })
      .eq('id', toLevel.id);

    if (incError) throw new Error(`Erro ao atualizar destino: ${incError.message}`);
  } else {
    const { error: insError } = await supabase
      .from('stock_levels')
      .insert({ product_id: productId, location_id: toLocationId, quantity });

    if (insError) throw new Error(`Erro ao criar nivel no destino: ${insError.message}`);
  }

  // Registrar movimentacao
  const { error: movError } = await supabase.from('stock_movements').insert({
    tenant_id: tenantId,
    product_id: productId,
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    quantity,
    movement_type: 'transfer' as MovementType,
    notes: notes || null,
  });

  if (movError) throw new Error(`Erro ao registrar movimentação: ${movError.message}`);
}

// ============================================
// Ajuste de Estoque (entrada/saida/ajuste)
// ============================================

export async function adjustStock(
  productId: string,
  locationId: string,
  quantity: number,
  type: 'entry' | 'exit' | 'adjustment',
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  // Tentar ajuste atômico via RPC
  const rpcType = type === 'exit' ? 'exit' : 'entry';
  const { data: newQty, error: rpcError } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_location_id: locationId,
    p_quantity: quantity,
    p_type: rpcType,
  });

  if (rpcError) {
    // Fallback para o método client-side caso a função RPC não exista
    const { data: level } = await supabase
      .from('stock_levels')
      .select('id, quantity')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .maybeSingle();

    const currentQty = level?.quantity ?? 0;
    const fallbackQty = type === 'exit' ? currentQty - quantity : currentQty + quantity;

    if (fallbackQty < 0) {
      throw new Error('Saldo insuficiente para esta saída');
    }

    if (level) {
      const { error } = await supabase
        .from('stock_levels')
        .update({ quantity: fallbackQty })
        .eq('id', level.id);

      if (error) throw new Error(`Erro ao atualizar estoque: ${error.message}`);
    } else {
      const { error } = await supabase
        .from('stock_levels')
        .insert({ product_id: productId, location_id: locationId, quantity: fallbackQty });

      if (error) throw new Error(`Erro ao criar nivel de estoque: ${error.message}`);
    }
  } else if ((newQty as number) < 0) {
    throw new Error('Saldo insuficiente para esta saída');
  }

  const { error: movError } = await supabase.from('stock_movements').insert({
    tenant_id: tenantId,
    product_id: productId,
    from_location_id: type === 'exit' ? locationId : null,
    to_location_id: type === 'entry' ? locationId : null,
    quantity,
    movement_type: type as MovementType,
    notes: notes || null,
  });

  if (movError) throw new Error(`Erro ao registrar movimentação: ${movError.message}`);
}

// ============================================
// Definir Estoque (overwrite)
// ============================================

export async function setStock(
  productId: string,
  locationId: string,
  newQuantity: number,
  notes?: string
): Promise<void> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  if (newQuantity < 0) {
    throw new Error('A quantidade não pode ser negativa');
  }

  const { data: level } = await supabase
    .from('stock_levels')
    .select('id, quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle();

  const oldQty = level?.quantity ?? 0;
  const diff = newQuantity - oldQty;

  if (level) {
    const { error } = await supabase
      .from('stock_levels')
      .update({ quantity: newQuantity })
      .eq('id', level.id);

    if (error) throw new Error(`Erro ao definir estoque: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('stock_levels')
      .insert({ product_id: productId, location_id: locationId, quantity: newQuantity });

    if (error) throw new Error(`Erro ao criar nivel de estoque: ${error.message}`);
  }

  if (diff !== 0) {
    const { error: movError } = await supabase.from('stock_movements').insert({
      tenant_id: tenantId,
      product_id: productId,
      from_location_id: diff < 0 ? locationId : null,
      to_location_id: diff > 0 ? locationId : null,
      quantity: Math.abs(diff),
      movement_type: 'adjustment' as MovementType,
      notes: notes ? `[Definir] ${notes}` : `[Definir] ${oldQty} → ${newQuantity}`,
    });

    if (movError) throw new Error(`Erro ao registrar movimentação: ${movError.message}`);
  }
}

// ============================================
// Historico de Movimentacoes
// ============================================

export async function getMovements(productId?: string): Promise<StockMovement[]> {
  const supabase = createClient();
  let query = supabase
    .from('stock_movements')
    .select('*, product:product_id(id, name, sku), from_location:from_location_id(id, name), to_location:to_location_id(id, name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (productId) query = query.eq('product_id', productId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar movimentações: ${error.message}`);
  return data ?? [];
}
