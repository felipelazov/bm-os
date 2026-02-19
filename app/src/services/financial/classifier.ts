import type {
  ParsedTransaction,
  ClassificationRule,
  ClassificationResult,
} from '@/types/financial.types';
import type { DreCategory } from '@/types/dre.types';

// Regras padrão de classificação por palavras-chave
const DEFAULT_KEYWORD_MAP: Record<string, { keywords: string[]; dreType: string }> = {
  receita_bruta: {
    keywords: [
      'venda', 'faturamento', 'receita', 'nf-e', 'nota fiscal',
      'pix recebido', 'ted recebida', 'transferencia recebida',
      'deposito', 'crédito', 'pagamento recebido',
    ],
    dreType: 'receita_bruta',
  },
  deducao_receita: {
    keywords: ['imposto', 'icms', 'pis', 'cofins', 'iss', 'darf', 'das', 'simples nacional'],
    dreType: 'deducao_receita',
  },
  custo_produtos: {
    keywords: [
      'materia prima', 'fornecedor', 'compra mercadoria', 'insumo',
      'estoque', 'frete compra', 'embalagem',
    ],
    dreType: 'custo_produtos',
  },
  despesa_administrativa: {
    keywords: [
      'salario', 'folha', 'fgts', 'inss', 'ferias', 'rescisao',
      'contabilidade', 'contador', 'advocacia', 'juridico',
      'software', 'licenca', 'sistema', 'erp',
    ],
    dreType: 'despesa_administrativa',
  },
  despesa_comercial: {
    keywords: [
      'marketing', 'publicidade', 'propaganda', 'google ads',
      'facebook ads', 'meta ads', 'comissao', 'representante',
      'feira', 'evento', 'brinde',
    ],
    dreType: 'despesa_comercial',
  },
  despesa_geral: {
    keywords: [
      'aluguel', 'condominio', 'energia', 'luz', 'agua', 'telefone',
      'internet', 'celular', 'seguro', 'limpeza', 'manutencao',
      'correio', 'material escritorio', 'combustivel',
    ],
    dreType: 'despesa_geral',
  },
  depreciacao_amortizacao: {
    keywords: ['depreciacao', 'amortizacao'],
    dreType: 'depreciacao_amortizacao',
  },
  receita_financeira: {
    keywords: [
      'rendimento', 'juros recebidos', 'cdb', 'lci', 'lca',
      'aplicacao', 'dividendo', 'jcp',
    ],
    dreType: 'receita_financeira',
  },
  despesa_financeira: {
    keywords: [
      'juros', 'iof', 'tarifa bancaria', 'taxa bancaria',
      'emprestimo', 'financiamento', 'multa', 'encargos',
      'cartao credito', 'anuidade',
    ],
    dreType: 'despesa_financeira',
  },
  imposto_renda: {
    keywords: ['irpj', 'imposto renda pessoa juridica', 'ir retido'],
    dreType: 'imposto_renda',
  },
  csll: {
    keywords: ['csll', 'contribuicao social'],
    dreType: 'csll',
  },
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyTransaction(
  transaction: ParsedTransaction,
  customRules: ClassificationRule[],
  dreCategories: DreCategory[]
): ClassificationResult {
  const normalizedDesc = normalizeText(transaction.description);

  // 1. Primeiro tenta regras customizadas do tenant (maior prioridade)
  for (const rule of customRules.sort((a, b) => b.priority - a.priority)) {
    if (!rule.is_active) continue;
    if (rule.transaction_type !== transaction.type) continue;

    const matched = rule.keywords.some((kw) =>
      normalizedDesc.includes(normalizeText(kw))
    );

    if (matched) {
      const category = dreCategories.find((c) => c.id === rule.dre_category_id);
      return {
        transaction,
        suggested_category_id: rule.dre_category_id,
        suggested_category_name: category?.name ?? null,
        confidence: 0.95,
        matched_rule_id: rule.id,
      };
    }
  }

  // 2. Depois tenta regras padrão por palavras-chave
  let bestMatch: { dreType: string; score: number } | null = null;

  for (const [, config] of Object.entries(DEFAULT_KEYWORD_MAP)) {
    for (const keyword of config.keywords) {
      const normalizedKw = normalizeText(keyword);
      if (normalizedDesc.includes(normalizedKw)) {
        const score = normalizedKw.length / normalizedDesc.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { dreType: config.dreType, score };
        }
      }
    }
  }

  if (bestMatch) {
    const category = dreCategories.find((c) => c.type === bestMatch!.dreType);
    return {
      transaction,
      suggested_category_id: category?.id ?? null,
      suggested_category_name: category?.name ?? null,
      confidence: Math.min(0.85, 0.5 + bestMatch.score),
      matched_rule_id: null,
    };
  }

  // 3. Não classificado
  return {
    transaction,
    suggested_category_id: null,
    suggested_category_name: null,
    confidence: 0,
    matched_rule_id: null,
  };
}

export function classifyBatch(
  transactions: ParsedTransaction[],
  customRules: ClassificationRule[],
  dreCategories: DreCategory[]
): ClassificationResult[] {
  return transactions.map((t) => classifyTransaction(t, customRules, dreCategories));
}
