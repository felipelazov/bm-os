import { createClient } from '@/services/supabase/client';
import { getTenantId } from '@/services/financial/financial.service';
import type { Client } from '@/types/clients.types';

export async function getClients(activeOnly = true): Promise<Client[]> {
  const supabase = createClient();
  let query = supabase
    .from('clients')
    .select('*')
    .order('name')
    .limit(500);

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar clientes: ${error.message}`);
  return data ?? [];
}

export async function getClient(id: string): Promise<Client> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Erro ao buscar cliente: ${error.message}`);
  return data;
}

export async function createClientRecord(
  client: Pick<Client, 'name' | 'cpf_cnpj' | 'phone' | 'whatsapp' | 'email' | 'client_type' | 'cep' | 'address' | 'address_number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'notes'>
): Promise<Client> {
  const supabase = createClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, tenant_id: tenantId })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar cliente: ${error.message}`);
  return data;
}

export async function updateClient(
  id: string,
  updates: Partial<Pick<Client, 'name' | 'cpf_cnpj' | 'phone' | 'whatsapp' | 'email' | 'client_type' | 'cep' | 'address' | 'address_number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'notes' | 'is_active'>>
): Promise<Client> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar cliente: ${error.message}`);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createClient();

  const { count: salesCount } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id);

  if (salesCount && salesCount > 0) {
    throw new Error(
      `Este cliente possui ${salesCount} venda(s) vinculada(s) e não pode ser excluído. Desative-o em vez de excluir.`
    );
  }

  const { count: quotesCount } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id);

  if (quotesCount && quotesCount > 0) {
    throw new Error(
      `Este cliente possui ${quotesCount} orçamento(s) vinculado(s) e não pode ser excluído. Desative-o em vez de excluir.`
    );
  }

  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir cliente: ${error.message}`);
}
