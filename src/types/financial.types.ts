// ============================================
// Transações Financeiras
// ============================================

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'received' | 'overdue' | 'cancelled';
export type TransactionSource = 'manual' | 'import_csv' | 'import_ofx' | 'import_xml' | 'import_xlsx';
export type ImportFileFormat = 'csv' | 'ofx' | 'xml' | 'xlsx';

export interface Transaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  status: TransactionStatus;
  source: TransactionSource;
  description: string;
  value: number;
  date: string;
  due_date: string | null;
  paid_date: string | null;
  category_id: string | null;
  dre_category_id: string | null;
  bank_name: string | null;
  document_number: string | null;
  notes: string | null;
  is_classified: boolean;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Import de Extratos
// ============================================

export interface ImportBatch {
  id: string;
  tenant_id: string;
  file_name: string;
  format: ImportFileFormat;
  bank_name: string | null;
  total_transactions: number;
  classified_count: number;
  unclassified_count: number;
  total_income: number;
  total_expense: number;
  imported_at: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  value: number;
  type: TransactionType;
  document_number: string | null;
  raw_data: string;
}

// ============================================
// Classificação Automática
// ============================================

export interface ClassificationRule {
  id: string;
  tenant_id: string;
  keywords: string[];
  dre_category_id: string;
  transaction_type: TransactionType;
  priority: number;
  is_active: boolean;
}

export interface ClassificationResult {
  transaction: ParsedTransaction;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  confidence: number;
  matched_rule_id: string | null;
}

// ============================================
// Contas a Pagar / Receber
// ============================================

export interface AccountPayable extends Transaction {
  type: 'expense';
  supplier: string | null;
}

export interface AccountReceivable extends Transaction {
  type: 'income';
  customer: string | null;
}

// ============================================
// Fluxo de Caixa
// ============================================

export interface CashFlowPeriod {
  period: string;
  total_income: number;
  total_expense: number;
  net_flow: number;
  cumulative_balance: number;
}

export interface CashFlowSummary {
  periods: CashFlowPeriod[];
  total_income: number;
  total_expense: number;
  net_total: number;
  opening_balance: number;
  closing_balance: number;
}

// ============================================
// Categorias Financeiras (complementar ao DRE)
// ============================================

export interface FinancialCategory {
  id: string;
  tenant_id: string;
  name: string;
  type: TransactionType;
  dre_category_id: string | null;
  color: string;
  icon: string | null;
  is_active: boolean;
}
