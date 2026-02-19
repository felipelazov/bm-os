import { createClient } from '@/services/supabase/client';
import type { Transaction, ImportBatch, CashFlowSummary, CashFlowPeriod } from '@/types/financial.types';

// ============================================
// Transações
// ============================================

export async function getTransactions(
  filters?: {
    type?: 'income' | 'expense';
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(500);

  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.startDate) query = query.gte('date', filters.startDate);
  if (filters?.endDate) query = query.lte('date', filters.endDate);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar transações: ${error.message}`);
  return data ?? [];
}

export async function createTransaction(
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar transação: ${error.message}`);
  return data;
}

export async function createTransactionWithTenant(
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>
): Promise<Transaction> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Perfil não encontrado');

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...transaction, tenant_id: profile.tenant_id })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar transação: ${error.message}`);
  return data;
}

export async function createTransactionsBatch(
  transactions: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>[]
): Promise<number> {
  const supabase = createClient();
  const { error } = await supabase.from('transactions').insert(transactions);
  if (error) throw new Error(`Erro ao importar transações: ${error.message}`);
  return transactions.length;
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar transação: ${error.message}`);
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir transação: ${error.message}`);
}

// ============================================
// Import Batches
// ============================================

export async function createImportBatch(
  batch: Omit<ImportBatch, 'id' | 'imported_at'>
): Promise<ImportBatch> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('import_batches')
    .insert(batch)
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar lote de importação: ${error.message}`);
  return data;
}

export async function getImportBatches(): Promise<ImportBatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .order('imported_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(`Erro ao buscar importações: ${error.message}`);
  return data ?? [];
}

// ============================================
// Helpers
// ============================================

export async function getTenantId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Perfil não encontrado');
  return profile.tenant_id;
}

// ============================================
// Fluxo de Caixa
// ============================================

export function calculateCashFlow(
  transactions: Transaction[],
  openingBalance: number = 0
): CashFlowSummary {
  const periodMap = new Map<string, CashFlowPeriod>();

  for (const t of transactions) {
    if (t.status === 'cancelled') continue;
    const period = t.date.substring(0, 7); // YYYY-MM

    if (!periodMap.has(period)) {
      periodMap.set(period, {
        period,
        total_income: 0,
        total_expense: 0,
        net_flow: 0,
        cumulative_balance: 0,
      });
    }

    const entry = periodMap.get(period)!;
    if (t.type === 'income') {
      entry.total_income += t.value;
    } else {
      entry.total_expense += t.value;
    }
    entry.net_flow = entry.total_income - entry.total_expense;
  }

  const periods = Array.from(periodMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  let cumulative = openingBalance;
  for (const p of periods) {
    cumulative += p.net_flow;
    p.cumulative_balance = cumulative;
  }

  const total_income = periods.reduce((s, p) => s + p.total_income, 0);
  const total_expense = periods.reduce((s, p) => s + p.total_expense, 0);

  return {
    periods,
    total_income,
    total_expense,
    net_total: total_income - total_expense,
    opening_balance: openingBalance,
    closing_balance: cumulative,
  };
}
