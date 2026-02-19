// ============================================
// Newsletter Curada Semanal - Dados e Tipos
// ============================================

export type NewsletterImpact = 'alta' | 'baixa' | 'estavel';

export interface NewsletterItem {
  id: number;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  articleUrl: string;
  impact: NewsletterImpact;
  category: string;
  publishedAt: string; // YYYY-MM-DD (dia da publicacao original)
}

export interface NewsletterEdition {
  weekStart: string; // YYYY-MM-DD (segunda-feira)
  weekEnd: string; // YYYY-MM-DD (domingo)
  greeting: string;
  items: NewsletterItem[];
}

// ============================================
// Edicoes Curadas Semanais
// ============================================

const editions: NewsletterEdition[] = [
  {
    weekStart: '2026-02-09',
    weekEnd: '2026-02-15',
    greeting: 'Confira o resumo semanal do mercado de compras. As principais movimentacoes da semana reunidas para voce.',
    items: [
      // === Segunda 09/02 ===
      {
        id: 1,
        title: 'Arroz atinge menor cotacao em 8 meses com safra recorde no RS',
        summary:
          'A colheita antecipada no Rio Grande do Sul pressiona os precos do arroz em casca. O indicador CEPEA/IRGA recuou 4,2% na ultima semana, abrindo janela de compra para restaurantes e redes de alimentacao.',
        source: 'CEPEA/Esalq',
        sourceUrl: 'https://www.cepea.esalq.usp.br',
        articleUrl: 'https://www.cepea.esalq.usp.br/br/indicador/arroz.aspx',
        impact: 'baixa',
        category: 'Alimentos',
        publishedAt: '2026-02-09',
      },
      {
        id: 2,
        title: 'Oleo de soja sobe 12% em fevereiro puxado por exportacoes',
        summary:
          'A demanda externa aquecida, especialmente da India, elevou o preco do oleo de soja degomado. Compradores devem considerar antecipar pedidos antes de nova rodada de reajustes prevista para marco.',
        source: 'Abiove',
        sourceUrl: 'https://abiove.org.br',
        articleUrl: 'https://abiove.org.br/estatisticas/',
        impact: 'alta',
        category: 'Alimentos',
        publishedAt: '2026-02-09',
      },
      // === Terca 10/02 ===
      {
        id: 3,
        title: 'Celulose recua e reduz pressao sobre papel toalha e higienicos',
        summary:
          'O preco da celulose de fibra curta caiu 6% no mercado spot na China, aliviando custos de producao de papel tissue. Fabricantes brasileiros ja sinalizam estabilidade nos precos para o proximo trimestre.',
        source: 'Valor Economico',
        sourceUrl: 'https://valor.globo.com',
        articleUrl: 'https://valor.globo.com/empresas/noticia/2026/02/10/celulose-recua-mercado-spot.ghtml',
        impact: 'baixa',
        category: 'Limpeza e Higiene',
        publishedAt: '2026-02-10',
      },
      {
        id: 4,
        title: 'Cafe robusta renova maxima historica na bolsa de Londres',
        summary:
          'O contrato futuro de cafe robusta atingiu US$ 5.890/ton na ICE Futures Europe, reflexo da seca prolongada no Vietna. No Brasil, o conilon capixaba acompanhou a alta com reajuste de 8% no atacado.',
        source: 'Notícias Agrícolas',
        sourceUrl: 'https://www.noticiasagricolas.com.br',
        articleUrl: 'https://www.noticiasagricolas.com.br/noticias/cafe/robusta-maxima-historica-2026',
        impact: 'alta',
        category: 'Alimentos',
        publishedAt: '2026-02-10',
      },
      // === Quarta 11/02 ===
      {
        id: 5,
        title: 'Dolar estavel favorece importacao de quimicos de limpeza',
        summary:
          'Com o dolar oscilando entre R$ 5,70 e R$ 5,80 nas ultimas duas semanas, o custo de insumos importados para produtos de limpeza se mantem previsivel. Bom momento para negociar contratos trimestrais.',
        source: 'Banco Central',
        sourceUrl: 'https://www.bcb.gov.br',
        articleUrl: 'https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes',
        impact: 'estavel',
        category: 'Limpeza e Higiene',
        publishedAt: '2026-02-11',
      },
      {
        id: 6,
        title: 'Frango inteiro tem queda de 3,8% com oferta elevada',
        summary:
          'O alojamento recorde de pintos de corte em janeiro resultou em maior oferta de frango inteiro no mercado interno. O preco no atacado paulista recuou para R$ 7,15/kg, nivel mais baixo desde outubro.',
        source: 'CEPEA/Esalq',
        sourceUrl: 'https://www.cepea.esalq.usp.br',
        articleUrl: 'https://www.cepea.esalq.usp.br/br/indicador/frango.aspx',
        impact: 'baixa',
        category: 'Alimentos',
        publishedAt: '2026-02-11',
      },
      // === Quinta 12/02 ===
      {
        id: 7,
        title: 'ANVISA endurece regras para rotulagem de sanitizantes',
        summary:
          'Nova resolucao da ANVISA exige informacoes adicionais nos rotulos de sanitizantes e desinfetantes a partir de junho/2026. Fornecedores menores podem ter dificuldade em se adequar, o que pode afetar disponibilidade.',
        source: 'ANVISA',
        sourceUrl: 'https://www.gov.br/anvisa',
        articleUrl: 'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/novas-regras-rotulagem-sanitizantes',
        impact: 'alta',
        category: 'Limpeza e Higiene',
        publishedAt: '2026-02-12',
      },
      {
        id: 8,
        title: 'Feijao carioca acumula alta de 18% no ano e nao da sinais de recuo',
        summary:
          'Estoques baixos e atraso no plantio da segunda safra mantem precos do feijao carioca pressionados. Saca de 60 kg negociada a R$ 420 em SP, maior patamar desde setembro de 2025.',
        source: 'Conab',
        sourceUrl: 'https://www.conab.gov.br',
        articleUrl: 'https://www.conab.gov.br/info-agro/analises-do-mercado-agropecuario-e-extrativista/analises-do-mercado/feijao',
        impact: 'alta',
        category: 'Alimentos',
        publishedAt: '2026-02-12',
      },
      // === Sexta 13/02 ===
      {
        id: 9,
        title: 'Etanol de limpeza tem reajuste de 5% com entressafra da cana',
        summary:
          'O alcool etilico 70% para limpeza acompanhou o reajuste do etanol hidratado. Distribuidoras ja repassam aumento medio de 5% para o segmento institucional. Tendencia e de estabilizacao so em abril com inicio da moagem.',
        source: 'UNICA',
        sourceUrl: 'https://unica.com.br',
        articleUrl: 'https://unica.com.br/noticias/entressafra-pressiona-etanol-2026/',
        impact: 'alta',
        category: 'Limpeza e Higiene',
        publishedAt: '2026-02-13',
      },
      {
        id: 10,
        title: 'Leite UHT recua 2,5% em fevereiro com retomada da coleta',
        summary:
          'A melhora das pastagens com as chuvas de janeiro elevou a producao leiteira no Sudeste. O litro do UHT no atacado recuou para R$ 4,85, favorecendo compras para o segmento de food service.',
        source: 'CEPEA/Esalq',
        sourceUrl: 'https://www.cepea.esalq.usp.br',
        articleUrl: 'https://www.cepea.esalq.usp.br/br/indicador/leite.aspx',
        impact: 'baixa',
        category: 'Alimentos',
        publishedAt: '2026-02-13',
      },
      {
        id: 11,
        title: 'Embalagens plasticas sobem 7% com novo preco da resina',
        summary:
          'A Braskem anunciou reajuste de 7% na resina de polietileno a partir de marco. Sacos, filmes e embalagens plasticas para uso em limpeza e alimentos devem acompanhar o aumento nas proximas semanas.',
        source: 'Plastico Brasil',
        sourceUrl: 'https://www.plasticobrasil.com.br',
        articleUrl: 'https://www.plasticobrasil.com.br/noticias/braskem-reajuste-resina-marco-2026',
        impact: 'alta',
        category: 'Embalagens',
        publishedAt: '2026-02-13',
      },
      // === Sabado 14/02 ===
      {
        id: 12,
        title: 'Acucar cristal estavel com estoques confortaveis',
        summary:
          'Apesar da entressafra, os estoques de acucar cristal permanecem em niveis adequados. O indicador CEPEA marca R$ 152/saca, sem variacao significativa na semana. Cenario favoravel para compras regulares.',
        source: 'CEPEA/Esalq',
        sourceUrl: 'https://www.cepea.esalq.usp.br',
        articleUrl: 'https://www.cepea.esalq.usp.br/br/indicador/acucar.aspx',
        impact: 'estavel',
        category: 'Alimentos',
        publishedAt: '2026-02-14',
      },
    ],
  },
];

// ============================================
// Funcoes de Acesso
// ============================================

export function getLatestEdition(): NewsletterEdition {
  return editions[0];
}

export function getEditionByWeek(weekStart: string): NewsletterEdition | undefined {
  return editions.find((e) => e.weekStart === weekStart);
}

export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(weekEnd + 'T12:00:00');
  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = start.toLocaleDateString('pt-BR', { month: 'long' });
  const year = start.getFullYear();
  return `${startDay} a ${endDay} de ${month} de ${year}`;
}
