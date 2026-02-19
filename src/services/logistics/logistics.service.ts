import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'bin';
}
import type { Delivery, CreateDeliveryData } from '@/types/logistics.types';
import type { Collaborator } from '@/types/collaborators.types';
import type { StockLocation } from '@/types/products.types';

// ============================================
// Buscar Entregas
// ============================================

export async function getDeliveries(): Promise<Delivery[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, driver:driver_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(`Erro ao buscar entregas: ${error.message}`);

  return (data ?? []).map((d: Record<string, unknown>) => {
    const driver = d.driver as { full_name: string } | null;
    return {
      ...d,
      driver_name: driver?.full_name ?? undefined,
    };
  }) as Delivery[];
}

// ============================================
// Criar Entrega Manual
// ============================================

export async function createDelivery(data: CreateDeliveryData): Promise<Delivery> {
  const supabase = createClient();
  const tenantId = await getTenantId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .insert({
      tenant_id: tenantId,
      sale_id: null,
      client_name: data.client_name,
      client_phone: data.client_phone || null,
      client_address: data.client_address || null,
      client_address_number: data.client_address_number || null,
      client_neighborhood: data.client_neighborhood || null,
      client_city: data.client_city || null,
      items_summary: data.items_summary,
      total: data.total,
      payment_method: data.payment_method || null,
      notes: data.notes || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar entrega: ${error.message}`);
  return delivery as Delivery;
}

// ============================================
// Atribuir/Remover Motorista
// ============================================

export async function assignDriver(deliveryId: string, driverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ driver_id: driverId })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao atribuir motorista: ${error.message}`);
}

export async function unassignDriver(deliveryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ driver_id: null, route_order: null })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao remover motorista: ${error.message}`);
}

// ============================================
// Reordenar Entregas do Motorista
// ============================================

export async function updateRouteOrder(deliveryId: string, order: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ route_order: order })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao atualizar ordem: ${error.message}`);
}

export async function reorderDriverDeliveries(driverId: string, orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('deliveries')
      .update({ route_order: i + 1 })
      .eq('id', orderedIds[i])
      .eq('driver_id', driverId);

    if (error) throw new Error(`Erro ao reordenar entregas: ${error.message}`);
  }
}

// ============================================
// Iniciar Rota (muda todos do driver para em_rota)
// ============================================

export async function startRoute(driverId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ status: 'em_rota' })
    .eq('driver_id', driverId)
    .eq('status', 'aguardando');

  if (error) throw new Error(`Erro ao iniciar rota: ${error.message}`);
}

// ============================================
// Toggle Confirmacoes
// ============================================

export async function toggleDeliveryConfirmed(deliveryId: string, current: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ delivery_confirmed: !current })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao atualizar confirmação: ${error.message}`);
}

export async function togglePhotoConfirmed(deliveryId: string, current: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ photo_confirmed: !current })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao atualizar foto: ${error.message}`);
}

// ============================================
// Concluir Entrega
// ============================================

export async function completeDelivery(deliveryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({
      status: 'entregue',
      completed_at: new Date().toISOString(),
    })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao concluir entrega: ${error.message}`);
}

// ============================================
// Excluir Entrega (somente manuais)
// ============================================

export async function deleteDelivery(deliveryId: string): Promise<void> {
  const supabase = createClient();

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('sale_id')
    .eq('id', deliveryId)
    .single();

  if (delivery?.sale_id) {
    throw new Error('Não é possível excluir entregas vinculadas a uma venda');
  }

  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao excluir entrega: ${error.message}`);
}

// ============================================
// Buscar Motoristas (department='logistica')
// ============================================

export async function getDrivers(): Promise<Collaborator[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('department', 'logistica')
    .eq('is_active', true)
    .order('full_name')
    .limit(200);

  if (error) throw new Error(`Erro ao buscar motoristas: ${error.message}`);
  return data ?? [];
}

// ============================================
// Buscar Locais de Estoque
// ============================================

export async function getLocations(): Promise<StockLocation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stock_locations')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(200);

  if (error) throw new Error(`Erro ao buscar locais: ${error.message}`);
  return data ?? [];
}

// ============================================
// Atualizar Local de Saida/Retorno
// ============================================

export async function updateDepartureLocation(deliveryId: string, locationId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ departure_location_id: locationId })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao atualizar local de saída: ${error.message}`);
}

export async function updateReturnLocation(deliveryId: string, locationId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('deliveries')
    .update({ return_location_id: locationId })
    .eq('id', deliveryId);

  if (error) throw new Error(`Erro ao atualizar local de retorno: ${error.message}`);
}

// ============================================
// Upload Assinatura de Entrega
// ============================================

export async function uploadDeliverySignature(deliveryId: string, blob: Blob): Promise<string> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const storagePath = `${tenantId}/deliveries/signatures/${deliveryId}.png`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, blob, { upsert: true, contentType: 'image/png' });

  if (uploadError) throw new Error(`Erro no upload da assinatura: ${uploadError.message}`);

  const { error: updateError } = await supabase
    .from('deliveries')
    .update({ signature_url: storagePath, delivery_confirmed: true })
    .eq('id', deliveryId);

  if (updateError) throw new Error(`Erro ao atualizar entrega: ${updateError.message}`);

  return storagePath;
}

// ============================================
// Upload Foto de Entrega
// ============================================

export async function uploadDeliveryPhoto(deliveryId: string, file: File): Promise<string> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const ext = getFileExtension(file.name);
  const storagePath = `${tenantId}/deliveries/photos/${deliveryId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { upsert: true });

  if (uploadError) throw new Error(`Erro no upload da foto: ${uploadError.message}`);

  const { error: updateError } = await supabase
    .from('deliveries')
    .update({ photo_url: storagePath, photo_confirmed: true })
    .eq('id', deliveryId);

  if (updateError) throw new Error(`Erro ao atualizar entrega: ${updateError.message}`);

  return storagePath;
}

// ============================================
// Signed URL para arquivos de entrega
// ============================================

export async function getDeliveryFileUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 300);

  if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
  return data.signedUrl;
}
