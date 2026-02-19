// ============================================
// Clientes
// ============================================

export type ClientType = 'varejo' | 'mensalista' | 'doacao';

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  cpf_cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  client_type: ClientType;
  cep: string | null;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}
