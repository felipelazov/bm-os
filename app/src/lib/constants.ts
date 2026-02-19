export const DRE_CATEGORY_LABELS: Record<string, string> = {
  receita_bruta: 'Receita Bruta',
  deducao_receita: 'Deduções da Receita',
  custo_produtos: 'CPV / CMV / CSP',
  despesa_administrativa: 'Despesas Administrativas',
  despesa_comercial: 'Despesas Comerciais',
  despesa_geral: 'Despesas Gerais',
  depreciacao_amortizacao: 'Depreciação e Amortização',
  receita_financeira: 'Receitas Financeiras',
  despesa_financeira: 'Despesas Financeiras',
  imposto_renda: 'Imposto de Renda',
  csll: 'CSLL',
};

export const DRE_CATEGORY_ORDER: string[] = [
  'receita_bruta',
  'deducao_receita',
  'custo_produtos',
  'despesa_administrativa',
  'despesa_comercial',
  'despesa_geral',
  'depreciacao_amortizacao',
  'receita_financeira',
  'despesa_financeira',
  'imposto_renda',
  'csll',
];

export const DEFAULT_VALUATION_MULTIPLES: Record<string, number> = {
  'tecnologia': 15,
  'saas': 20,
  'varejo': 8,
  'industria': 6,
  'servicos': 10,
  'saude': 12,
  'educacao': 10,
  'financeiro': 12,
  'default': 8,
};

export const APP_NAME = 'ADM PRO';

// ============================================
// Modulo Compras
// ============================================

export const PURCHASE_CATEGORIES = [
  'Grãos',
  'Massas',
  'Óleos',
  'Molhos',
  'Biscoitos',
  'Bebidas',
  'Mercearia',
  'Temperos',
  'Laticínios',
  'Limpeza geral',
  'Lavagem roupas',
  'Higiene pessoal',
  'Utensílios',
] as const;

export const SEED_PURCHASE_ITEMS: { name: string; category: string; unit: string }[] = [
  // Alimentos (16 itens)
  { name: 'Arroz', category: 'Grãos', unit: 'kg' },
  { name: 'Feijão', category: 'Grãos', unit: 'kg' },
  { name: 'Açúcar', category: 'Mercearia', unit: 'kg' },
  { name: 'Café', category: 'Bebidas', unit: 'un' },
  { name: 'Óleo de Soja', category: 'Óleos', unit: 'un' },
  { name: 'Macarrão', category: 'Massas', unit: 'un' },
  { name: 'Farinha de Trigo', category: 'Mercearia', unit: 'kg' },
  { name: 'Fubá', category: 'Mercearia', unit: 'kg' },
  { name: 'Molho de Tomate', category: 'Molhos', unit: 'un' },
  { name: 'Sal', category: 'Temperos', unit: 'kg' },
  { name: 'Leite em Pó', category: 'Laticínios', unit: 'un' },
  { name: 'Biscoito Cream Cracker', category: 'Biscoitos', unit: 'un' },
  { name: 'Biscoito Recheado', category: 'Biscoitos', unit: 'un' },
  { name: 'Sardinha', category: 'Mercearia', unit: 'un' },
  { name: 'Vinagre', category: 'Temperos', unit: 'un' },
  { name: 'Tempero Completo', category: 'Temperos', unit: 'un' },
  // Limpeza e Higiene (17 itens)
  { name: 'Sabão em Pó', category: 'Lavagem roupas', unit: 'un' },
  { name: 'Sabão em Barra', category: 'Lavagem roupas', unit: 'un' },
  { name: 'Água Sanitária', category: 'Limpeza geral', unit: 'un' },
  { name: 'Detergente', category: 'Limpeza geral', unit: 'un' },
  { name: 'Desinfetante', category: 'Limpeza geral', unit: 'un' },
  { name: 'Esponja', category: 'Utensílios', unit: 'un' },
  { name: 'Papel Higiênico', category: 'Higiene pessoal', unit: 'un' },
  { name: 'Creme Dental', category: 'Higiene pessoal', unit: 'un' },
  { name: 'Escova Dental', category: 'Higiene pessoal', unit: 'un' },
  { name: 'Sabonete', category: 'Higiene pessoal', unit: 'un' },
  { name: 'Shampoo', category: 'Higiene pessoal', unit: 'un' },
  { name: 'Amaciante', category: 'Lavagem roupas', unit: 'un' },
  { name: 'Limpador Multiuso', category: 'Limpeza geral', unit: 'un' },
  { name: 'Palha de Aço', category: 'Utensílios', unit: 'un' },
  { name: 'Saco de Lixo', category: 'Limpeza geral', unit: 'un' },
  { name: 'Pano de Chão', category: 'Utensílios', unit: 'un' },
  { name: 'Alvejante', category: 'Lavagem roupas', unit: 'un' },
];
