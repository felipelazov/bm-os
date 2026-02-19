# ADM PRO - Sistema de Gestao Financeira

## O que e o ADM PRO?

ADM PRO e um sistema de gestao financeira completo para pequenas e medias empresas. Ele permite controlar receitas, despesas, gerar demonstrativos financeiros (DRE), analisar fluxo de caixa, gerenciar documentos e estimar o valor da empresa — tudo em uma unica plataforma web.

O sistema e multi-tenant: cada empresa cadastrada tem seus dados completamente isolados, permitindo que multiplas empresas usem a mesma infraestrutura.

## Stack Tecnologica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilizacao | Tailwind CSS 4 |
| Backend/Auth | Supabase (PostgreSQL + Auth + Storage) |
| Estado Global | Zustand |
| Graficos | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Icones | Lucide React |
| Drag and Drop | @dnd-kit/core + @dnd-kit/sortable |
| Excel/XLSX | SheetJS (xlsx) |
| Validacao | Zod |
| Toast Notifications | Sonner |
| React Query | @tanstack/react-query |
| Integracao | WhatsApp via Evolution API |

## Estrutura de Pastas do App

```
app/src/
  app/           -- Rotas e paginas (Next.js App Router)
    (auth)/      -- Login e registro
    (dashboard)/ -- Area logada (dashboard, dre, financeiro, compras, documentos, relatorios, configuracoes)
    api/         -- API routes (ex: envio WhatsApp)
  components/    -- Componentes React reutilizaveis
    ui/          -- Component library compartilhada (Button, Modal, Table, Badge, Toast, etc.)
  hooks/         -- Hooks utilitarios (useSort, usePagination)
  services/      -- Logica de negocio e chamadas ao Supabase
  stores/        -- Zustand stores (auth, dre, tenant)
  types/         -- Interfaces e tipos TypeScript
  lib/           -- Utilitarios, constantes, formatadores
  config/        -- Configuracoes do app
  middleware.ts  -- Protecao de rotas (autenticacao)
```

---

## Funcionalidades

### 1. Autenticacao e Multi-Tenancy

**Rotas:** `/login`, `/register`, `/reset-password`

**O que faz:**
- Cadastro de usuario com criacao automatica de empresa (tenant)
- Login com email e senha via Supabase Auth
- Recuperacao de senha: solicitar reset via email + pagina para definir nova senha (`/reset-password`)
- Protecao de rotas via middleware — usuarios nao autenticados sao redirecionados para `/login`
- Isolamento de dados por tenant (RLS no banco)

**Papeis de usuario:** `owner`, `admin`, `editor`, `viewer`

**Arquivos principais:**
- `app/(auth)/login/page.tsx` — Pagina de login com modo "Esqueceu a senha"
- `app/(auth)/register/page.tsx` — Pagina de cadastro
- `app/(auth)/reset-password/page.tsx` — Pagina para definir nova senha (apos link de recuperacao por email)
- `stores/auth.store.ts` — Estado do usuario logado
- `types/auth.types.ts` — Tipos de usuario e perfil
- `middleware.ts` — Protecao de rotas

---

### 2. Dashboard (Visao Completa do Negocio)

**Rota:** `/dashboard`

**O que faz:**
- Dashboard unificado com visao completa de todos os modulos do negocio
- Filtro global de periodo: 7 dias, 30 dias, Este mes, Personalizado (com inputs de data)
- Default: 30 dias
- Botao "Atualizar" para re-fetch manual com spinner

**8 KPIs em grid responsivo (2 cols mobile, 4 cols desktop):**
- Faturamento (vendas.totalRevenue) — com % de vendas pagas
- Vendas (vendas.totalSales) — com ticket medio
- Ticket Medio (vendas.averageTicket) — com total de vendas
- Orcamentos Pendentes (orcamentos.funnelByStatus → Pendente) — com taxa de conversao
- Entregas Pendentes (logistica.total - concluidas) — com concluidas
- Saldo Financeiro (financeiro.balance) — com valor vencido (vermelho se > 0)
- Estoque Critico (estoque.criticalStock) — com total SKUs
- Novos Clientes (clientes.newInPeriod) — com ativos

**4 Graficos estrategicos (Recharts):**
- Faturamento por Periodo (BarChart vertical, azul)
- Receitas vs Despesas (BarChart grouped, verde + vermelho)
- Status das Entregas (PieChart com labels %)
- Funil de Orcamentos (BarChart horizontal, roxo)

**Alertas e Atividade:**
- Contas vencidas → link `/financeiro/contas-pagar`
- Estoque critico → link `/produtos/estoque` (top 5 itens)
- Entregas pendentes → link `/logistica` (valor em rota)
- Orcamentos aguardando → link `/orcamentos` (taxa conversao)
- Se nenhum alerta: "Tudo em ordem!"

**8 Acoes Rapidas:** Nova Venda, Novo Orcamento, Logistica, Relatorios, Importar Extrato, Contas a Pagar, Estoque, Periodo DRE

**Como funciona:**
- `Promise.allSettled` com 6 reports em paralelo (vendas, orcamentos, logistica, clientes, financeiro, estoque)
- Resiliencia parcial: modulo que falha mostra "--" nos KPIs, demais funcionam normalmente
- Banner de aviso para falhas parciais, banner de erro para falha total
- Skeleton animado no carregamento inicial (8 cards + 2 retangulos)
- Opacity + toast "Atualizando..." no re-fetch
- Dark mode completo em todos os componentes
- Responsivo: KPIs e acoes (2→4 cols), graficos (1→2 cols)
- Reutiliza services de `reports.service.ts` e componentes de `report-chart.tsx`

**Arquivos principais:**
- `app/(dashboard)/dashboard/page.tsx` — Pagina orquestradora com filtro de data, skeleton, layout
- `components/dashboard/dashboard-kpis.tsx` — Grid de 8 KPIs com KpiCard local
- `components/dashboard/dashboard-charts.tsx` — 4 graficos estrategicos (Recharts)
- `components/dashboard/dashboard-alerts.tsx` — Alertas condicionais com links para modulos

---

### 3. DRE (Demonstracao do Resultado do Exercicio)

#### 3.1 Lista de Periodos

**Rota:** `/dre`

**O que faz:**
- Lista todos os periodos DRE criados (mensal, trimestral, anual)
- Permite criar novo periodo informando nome, tipo e datas
- Mostra status: aberto ou fechado
- Permite excluir periodos (inclusive fechados, com confirmacao reforçada)

#### 3.2 Detalhe do Periodo

**Rota:** `/dre/[periodId]`

**O que faz:**
- **Modo Visualizacao:** Exibe 4 cards resumo + tabela DRE completa (18 linhas) + painel de valuation
- **Alimentacao automatica (regime de caixa):** Busca transacoes financeiras classificadas do periodo que foram efetivamente pagas/recebidas (status = paid/received) e consolida com lancamentos manuais
- Indicador visual: "X lancamentos manuais + Y transacoes automaticas"
- Transacoes automaticas exibidas agrupadas por categoria DRE (somente leitura)
- **Modo Edicao:** Formulario para adicionar lancamentos manuais por categoria
- Permite excluir lancamentos individuais
- Botao "Fechar Periodo" — trava edicao permanentemente
- **Exportar PDF** — Gera PDF profissional com header, cards resumo, tabela DRE e footer

**Tabela DRE (18 linhas):**
1. RECEITA BRUTA
2. (-) Deducoes da Receita
3. = RECEITA LIQUIDA
4. (-) CPV / CMV / CSP
5. = LUCRO BRUTO (margem bruta)
6. (-) Despesas Administrativas
7. (-) Despesas Comerciais
8. (-) Despesas Gerais
9. = EBITDA (margem EBITDA)
10. (-) Depreciacao e Amortizacao
11. = EBIT / Lucro Operacional (margem operacional)
12. (+) Receitas Financeiras
13. (-) Despesas Financeiras
14. = Resultado Financeiro
15. = LAIR (Lucro Antes do IR)
16. (-) Imposto de Renda
17. (-) CSLL
18. = LUCRO LIQUIDO (margem liquida)

#### 3.3 Relatorios

**Rota:** `/dre/reports`

**O que faz:**
- Grafico de evolucao de 6 meses (receita, EBITDA, lucro)
- Analise de margens (bruta, EBITDA, operacional, liquida)
- Indicadores-chave: receita acumulada, EBITDA, taxa de crescimento, EBITDA anualizado, estimativa de EV

#### 3.4 Configuracoes DRE

**Rota:** `/dre/settings`

**O que faz:**
- Gerenciamento das categorias DRE (11 tipos)
- Categorias hierarquicas com parent_id

**Categorias DRE disponiveis:**
`receita_bruta`, `deducao_receita`, `custo_produtos`, `despesa_administrativa`, `despesa_comercial`, `despesa_geral`, `depreciacao_amortizacao`, `receita_financeira`, `despesa_financeira`, `imposto_renda`, `csll`

**Arquivos principais:**
- `services/dre/dre.service.ts` — CRUD de periodos, categorias, lancamentos
- `services/dre/dre-calculator.ts` — Calculo do DRE completo
- `services/dre/dre-forecast.ts` — Previsao por regressao linear
- `services/dre/dre-pdf-export.ts` — Exportacao PDF
- `services/dre/valuation.service.ts` — Calculo de valuation EV/EBITDA
- `components/dre/dre-table.tsx` — Tabela DRE
- `components/dre/dre-entry-form.tsx` — Formulario de lancamentos
- `components/dre/dre-summary-card.tsx` — Card de resumo
- `components/dre/dre-chart.tsx` — Grafico de evolucao
- `components/dre/valuation-panel.tsx` — Painel de valuation
- `types/dre.types.ts` — Tipos DRE, Report, Valuation, Forecast

---

### 4. Financeiro

#### 4.1 Contas a Pagar

**Rota:** `/financeiro/contas-pagar`

**O que faz:**
- Lista despesas com filtro por status (pendente, vencido, pago)
- Criar, editar e excluir despesas
- Marcar como pago
- Cards resumo: total a pagar, vencidos, pagos
- **Categoria DRE:** Dropdown opcional para classificar a transacao em uma categoria DRE
- **Auto-classificacao:** Ao digitar a descricao, o sistema sugere automaticamente a categoria DRE usando o classificador por palavras-chave
- Nova coluna "Cat. DRE" na tabela mostrando a categoria atribuida

#### 4.2 Contas a Receber

**Rota:** `/financeiro/contas-receber`

**O que faz:**
- Mesma estrutura de contas a pagar, mas para receitas
- Acompanhamento de recebiveis de clientes
- **Categoria DRE:** Dropdown e auto-classificacao identicos ao Contas a Pagar
- Nova coluna "Cat. DRE" na tabela

#### 4.3 Importacao de Extratos Bancarios

**Rota:** `/financeiro/importar`

**O que faz:**
- Wizard de 3 etapas: Upload -> Revisao -> Confirmacao
- Suporta formatos CSV, OFX, XML e XLSX/XLS (Excel)
- **Deteccao automatica de banco** com parsers especializados:
  - **SICOOB (XLSX):** formato multi-linha (agrupamento de linhas de continuacao), valor com sufixo D/C, skip de "SALDO DO DIA"
  - **STONE (XLSX/XLS):** 19 colunas, composicao de descricao a partir de Tipo + contraparte (Destino/Origem), data com hora
  - **INTER (CSV):** auto-deteccao de header row (pula linhas informativas), deteccao automatica de colunas (Data, Historico, Descricao, Valor), concatena colunas de descricao
  - **Generico:** deteccao de colunas por regex nos headers (fallback para formatos desconhecidos)
- Auto-deteccao de colunas em CSV: escaneia as primeiras 20 linhas procurando header com "data" + "valor"
- Classificacao automatica de transacoes por palavras-chave
- Permite correcao manual de categorias nao classificadas
- Resumo com taxa de classificacao

**Como funciona a classificacao:**
- O servico `classifier.ts` cruza descricoes de transacoes com regras de keywords
- Cada regra tem prioridade e gera um score de confianca (0 a 1)
- Regras customizaveis por tenant

#### 4.4 Fluxo de Caixa

**Rota:** `/financeiro/fluxo-caixa`

**O que faz:**
- Grafico de barras: receitas vs despesas por mes
- Resumo: saldo atual, total receitas, total despesas, fluxo liquido
- Tabela detalhada com saldo acumulado mes a mes
- Filtra transacoes canceladas automaticamente

**Arquivos principais:**
- `services/financial/financial.service.ts` — CRUD de transacoes, lotes, fluxo de caixa
- `services/financial/classifier.ts` — Classificacao automatica
- `services/financial/extrato-parser.ts` — Parser CSV/OFX/XML/XLSX com deteccao automatica de banco (SICOOB, STONE, INTER, generico)
- `types/financial.types.ts` — Tipos de transacao, importacao, classificacao

---

### 5. Compras

#### 5.1 Newsletter Semanal de Compras

**Rota:** `/compras`

**O que faz:**
- Newsletter curada semanal com 10-15 materias de fontes confiaveis, agrupadas por dia da semana
- Layout editorial sequencial com materias numeradas e separadores por dia (segunda, terca, etc.)
- Header com periodo da semana (ex: "Semana de 9 a 15 de fevereiro de 2026")
- Link direto para a materia original (clicavel no titulo e no botao "Ler materia")
- Badge de impacto por noticia (alta vermelho, baixa verde, estavel cinza)
- Resumo quantitativo: total de materias, sinais de alta, baixa e estavel
- Dados curados em `lib/newsletter-data.ts` (sem CRUD, sem formulario, sem banco)
- Cada materia tem `articleUrl` (link direto) e `publishedAt` (data de publicacao)
- Disclaimer informativo sobre carater das informacoes

#### 5.2 Inteligencia de Compras

**Rota:** `/compras/inteligencia`

**O que faz:**
- Tabela com itens ativos do catalogo: Item, Categoria, Marca, Ultimo Preco, Media 3m, Variacao%, Status
- Status visual: verde (abaixo da media <-10%), amarelo (normal), vermelho (acima da media >+15%)
- Filtro por categoria
- Botao "Gerenciar Itens" — modal CRUD para adicionar/editar/desativar itens
- Botao "Importar Catalogo Padrao" — seed dos 33 itens do catalogo BM (16 alimentos + 17 limpeza/higiene)
- Click no item mostra historico de cotacoes com detalhes
- Formulario de nova cotacao: preco unitario, quantidade, marca, fonte

#### 5.3 Fornecedores

**Rota:** `/compras/fornecedores`

**O que faz:**
- CRUD completo de fornecedores: nome, CNPJ, telefone, WhatsApp, email, pessoa de contato, observacoes
- Cada fornecedor expande para mostrar itens vinculados com ultimo preco
- Botao "Vincular Itens" — modal com checklist dos purchase_items ativos
- Botao "Pedir Cotacao" — abre modal com mensagem pre-preenchida (nome da empresa + lista de itens) que o usuario pode editar antes de enviar via WhatsApp (Evolution API)
- Botao "Cotar Todos" — abre modal para customizar a mensagem do primeiro fornecedor e envia para todos os fornecedores ativos com WhatsApp, com feedback de sucesso/falha
- Modal de mensagem customizada com textarea editavel, variaveis ja resolvidas (nome da empresa e itens vinculados)
- Normalizacao automatica de numeros de telefone (adiciona codigo do pais 55 se necessario)

**Arquivos principais:**
- `types/compras.types.ts` — Tipos: PurchaseItem, Supplier, SupplierItem, PurchaseQuote, MarketSignal, ItemPriceStats
- `services/compras/items.service.ts` — CRUD itens + seedItems()
- `services/compras/suppliers.service.ts` — CRUD fornecedores + linkItem/unlinkItem + bulkLinkItems
- `services/compras/quotes.service.ts` — CRUD cotacoes + getItemPriceStats
- `lib/newsletter-data.ts` — Dados curados da newsletter (tipos, edicoes, funcoes de acesso)
- `components/compras/newsletter-item.tsx` — Componente editorial de noticia com badge de impacto
- `components/compras/price-trend-card.tsx` — Linha da tabela de tendencia de preco
- `components/compras/supplier-item-link.tsx` — Modal para vincular itens ao fornecedor
- `components/compras/quote-message-modal.tsx` — Modal de mensagem customizada para cotacao via WhatsApp
- `app/api/whatsapp/send-quote-request/route.ts` — API route para envio de cotacao via WhatsApp (aceita customMessage opcional)
- `app/api/tenant/info/route.ts` — API route para obter nome da empresa (tenant)

---

### 6. Clientes

**Rota:** `/clientes`

**O que faz:**
- CRUD completo de clientes: nome, CPF/CNPJ, telefone, WhatsApp, email, tipo, endereco completo, observacoes
- Classificacao por tipo com badge colorido: Varejo (azul), Mensalista (roxo), Doacao (verde)
- Busca automatica de endereco por CEP (API ViaCEP) ao sair do campo CEP
- Botao "Enviar WhatsApp" individual por cliente
- Botao "Enviar para Todos" no header — envia mensagem personalizada para todos os clientes ativos com WhatsApp
- Modal de mensagem customizada com variavel `{nome_cliente}` substituida automaticamente
- Variacao anti-bloqueio automatica: saudacoes rotativas + zero-width spaces entre mensagens
- Delay de 3-5 segundos entre envios sequenciais via Evolution API

**Arquivos principais:**
- `types/clients.types.ts` — Tipos: Client, ClientType
- `services/clients/clients.service.ts` — CRUD clientes com tenant isolation
- `lib/cep.ts` — Utilitario de busca de endereco por CEP (ViaCEP)
- `components/clients/client-message-modal.tsx` — Modal de mensagem WhatsApp para clientes
- `app/api/whatsapp/send-client-message/route.ts` — API route para envio em massa via WhatsApp com anti-bloqueio
- `app/(dashboard)/clientes/page.tsx` — Pagina principal do modulo

---

### 7. Comercial & Vendas

**Rota:** `/vendas`

**O que faz:**
- Modulo de vendas com protocolo sequencial formato `VP{NNN}-{AA}` (ex: VP001-26)
- Listagem de vendas com tabs "Em Aberto" / "Finalizadas" / "Canceladas" com contagem dinamica
- Filtros avancados client-side: busca por protocolo/cliente, tipo de cliente (Varejo/Mensalista/Doacao), forma de pagamento, periodo (data inicio/fim)
- Wizard modal de 4 passos para criar nova venda: Cliente, Produtos, Entrega, Pagamento
- **Modal de detalhes da venda:** clique na linha ou botao "VER" abre modal readonly com todas as informacoes (cliente, itens, entrega, frete, pagamento, resumo financeiro, datas). Botao "EDITAR PAGAMENTO" disponivel apenas para vendas em aberto
- Busca de clientes por nome, telefone ou CNPJ com opcao de cadastro rapido inline
- Busca de produtos por nome, SKU ou categoria com adicao a tabela de itens
- Tipo de entrega: Entrega (com calculo de frete opcional) ou Retirada em local de estoque
- Status de pagamento: Pendente (fica em aberto) ou Pago (finaliza automaticamente)
- Baixa automatica no estoque ao finalizar venda com retirada em local definido
- Edicao de venda pendente: permite alterar pagamento para pago (finaliza e da baixa no estoque)
- **Cancelamento de vendas:** vendas em aberto e concluidas podem ser canceladas via botao na tabela ou no modal de detalhes
- Reversao automatica de estoque ao cancelar venda finalizada com retirada em local definido
- Remocao automatica da entrega vinculada ao cancelar venda com tipo entrega (remove do Kanban logistico)
- Tab "Canceladas" com badge vermelho e contagem dinamica
- Badge de status "Cancelada" (vermelho) na tabela e no modal de detalhes
- Botao "Importar Orcamento (OP)" como placeholder (funcionalidade futura)
- Integracao com modulos de Clientes, Produtos e Estoque existentes

**Arquivos principais:**
- `types/sales.types.ts` — Tipos: Sale, SaleItem, CreateSaleData, SaleStatus, PaymentStatus, DeliveryType
- `services/sales/sales.service.ts` — CRUD vendas: getSales, getSaleWithItems, getNextProtocol, createSale, updateSalePayment, cancelSale, deleteSale
- `components/sales/sale-wizard.tsx` — Modal wizard orquestrador (state machine de 4 steps)
- `components/sales/sale-detail-modal.tsx` — Modal readonly de detalhes da venda (cliente, itens, entrega, pagamento, resumo, datas)
- `components/sales/step-client.tsx` — Passo 1: selecao de cliente com busca e cadastro rapido
- `components/sales/step-products.tsx` — Passo 2: lista visual de produtos para seleção (igual clientes) com tabela de itens
- `components/sales/step-delivery.tsx` — Passo 3: tipo de entrega + calculo de frete
- `components/sales/step-payment.tsx` — Passo 4: status pagamento + forma + resumo financeiro
- `app/(dashboard)/vendas/page.tsx` — Pagina principal do modulo

---

### 8. Orcamentos (Propostas Comerciais)

**Rota:** `/orcamentos`

**O que faz:**
- Modulo de orcamentos/propostas comerciais com protocolo sequencial formato `OP{NNN}-{AA}` (ex: OP001-26)
- Orcamento e um documento formal que **nao afeta estoque** e pode ser **convertido em venda**
- Listagem com tabs "Ativos" / "Convertidos" / "Excluidos" com contagem dinamica
- Filtros avancados client-side: busca por protocolo/cliente, status (Pendente/Aprovado/Recusado na tab Ativos), periodo (data inicio/fim)
- Criacao/edicao com layout split: formulario a esquerda + preview ao vivo do documento a direita
- **Formulario:** 4 cards (Cliente, Composicao da Proposta, Condicoes Gerais, Notas Internas)
- **Preview:** Documento formal com logo BM, protocolo, dados do destinatario, tabela de itens, totais
- Busca de clientes por nome, razao social ou CPF/CNPJ
- Busca de produtos por nome, SKU ou categoria com campos editaveis (QTD, Unitario, Desconto)
- Condicoes gerais: validade em dias, modalidade (entrega/retirada), forma de pagamento
- Desconto promocional configuravel (percentual aplicado sobre subtotal)
- Status: Pendente (amarelo), Aprovado (verde), Recusado (vermelho), Convertido (azul)
- Converter em venda: cria venda VP a partir do orcamento OP
- **Download PDF:** botao "Baixar PDF" no preview gera PDF profissional com layout fiel ao preview (jsPDF + jspdf-autotable)
- **Envio WhatsApp:** botao "Enviar WhatsApp" no preview envia o PDF do orcamento para o cliente via Evolution API (requer telefone/whatsapp cadastrado)
- Tab "Convertidos" com badge azul mostra orcamentos que ja foram convertidos em venda (VP), separados dos ativos
- Soft delete com possibilidade de restaurar (tab Excluidos)
- Sistema exclusivo da empresa BM (dados fixos em company-info.ts)

**Arquivos principais:**
- `types/quotes.types.ts` — Tipos: Quote, QuoteItem, CreateQuoteData, QuoteStatus, QuoteDeliveryType, QUOTE_PAYMENT_METHODS
- `services/quotes/quotes.service.ts` — CRUD orcamentos: getQuotes, getQuoteWithItems, getNextQuoteProtocol, createQuote, updateQuote, softDeleteQuote, restoreQuote, updateQuoteStatus, convertQuoteToSale
- `components/quotes/quote-form.tsx` — Formulario de orcamento com 4 cards (cliente, produtos, condicoes, notas)
- `components/quotes/quote-preview.tsx` — Preview ao vivo do documento de orcamento com botoes PDF e WhatsApp
- `services/quotes/quote-pdf.ts` — Geracao de PDF de orcamento com jsPDF + jspdf-autotable (generateQuotePdf, downloadQuotePdf, getQuotePdfBlob)
- `app/api/whatsapp/send-quote-pdf/route.ts` — API route para envio de PDF de orcamento via WhatsApp (upload temporario no Supabase Storage + Evolution API)
- `lib/company-info.ts` — Dados fixos da empresa BM (nome, endereco, iniciais)
- `app/(dashboard)/orcamentos/page.tsx` — Pagina principal do modulo
- `sql/quotes-migration.sql` — Migration SQL para tabelas quotes e quote_items com RLS

---

### 9. Logistica (Entregas e Rotas)

**Rota:** `/logistica`

**O que faz:**
- Board Kanban horizontal para gestao de entregas com colunas: AGUARDANDO, colunas por motorista (entregador), CONCLUIDAS
- Vendas com `delivery_type='entrega'` criam entrega automaticamente na coluna AGUARDANDO
- Botao "+ ADICIONAR LOGISTICA" para criar entregas manuais (sem venda vinculada)
- Drag and drop entre colunas (@dnd-kit): arrastar de AGUARDANDO para motorista atribui, entre motoristas reassigna, de motorista para AGUARDANDO desatribui
- Reordenacao de cards dentro da coluna do motorista via drag and drop
- Coluna CONCLUIDAS somente leitura (nao arrasta, nao aceita drop)
- Touch mobile com delay de 250ms para nao conflitar com scroll
- Botao "INICIAR ROTA" muda status de todas entregas do motorista para 'em_rota'
- Checkboxes ENTREGA + FOTO no card compacto do motorista
- Botao "CONCLUIR" aparece quando ambos checkboxes marcados — move card para CONCLUIDAS
- Dropdowns SAIDA GERAL e RETORNO GERAL (locais de estoque) no header
- Botao placeholder "OTIMIZAR SEQUENCIA" para futura integracao com Google Maps API
- Filtros avancados client-side: busca por cliente/itens, filtro por motorista, periodo (data inicio/fim)
- 4 cards de stats: VLR EM ROTA (soma total de entregas em rota), PENDENTES, EM ROTA, CONCLUIDAS
- Motoristas sao colaboradores com `department='logistica'` e `is_active=true`
- Entregas manuais podem ser excluidas; entregas de vendas nao
- **Modal de detalhe da entrega:** clique em qualquer card abre modal com informacoes completas (cliente, pedido, logistica, datas)
- **Assinatura digital do cliente:** Canvas HTML5 com suporte a touch (mobile) e mouse (desktop) para captura de assinatura. Upload automatico como PNG no Supabase Storage
- **Foto da entrega:** captura via camera traseira do celular (`capture="environment"`) ou upload de arquivo. Upload automatico no Supabase Storage
- Ao salvar assinatura, `delivery_confirmed` e marcado automaticamente. Ao salvar foto, `photo_confirmed` e marcado automaticamente
- Botao "CONCLUIR ENTREGA" aparece no modal quando assinatura e foto estao preenchidas
- Entregas concluidas mostram assinatura e foto no modal (somente leitura)

**Status de entrega:** `aguardando` → `em_rota` → `entregue`

**Integracao com Vendas:** Ao criar venda com `delivery_type='entrega'`, o sistema cria automaticamente um registro na tabela `deliveries` com dados do cliente, itens, total e forma de pagamento

**Arquivos principais:**
- `types/logistics.types.ts` — Tipos: Delivery, DeliveryStatus, CreateDeliveryData
- `services/logistics/logistics.service.ts` — CRUD entregas: getDeliveries, createDelivery, assignDriver, unassignDriver, reorderDriverDeliveries, startRoute, toggleDeliveryConfirmed, togglePhotoConfirmed, completeDelivery, deleteDelivery, getDrivers, getLocations, uploadDeliverySignature, uploadDeliveryPhoto, getDeliveryFileUrl
- `components/logistics/delivery-card.tsx` — Cards de entrega: DeliveryCardFull (aguardando), DeliveryCardCompact (motorista), DeliveryCardCompleted (concluidas), SortableDeliveryCardFull e SortableDeliveryCardCompact (wrappers drag and drop) — todos clicaveis
- `components/logistics/add-delivery-modal.tsx` — Modal para criar entrega manual
- `components/logistics/delivery-detail-modal.tsx` — Modal de detalhe da entrega com assinatura, foto e botao concluir
- `components/logistics/signature-pad.tsx` — Canvas HTML5 para captura de assinatura (touch + mouse)
- `app/(dashboard)/logistica/page.tsx` — Pagina principal do modulo com board Kanban
- `supabase/migrations/009_logistics.sql` — Migration SQL para tabela deliveries com RLS
- `supabase/migrations/012_delivery_proof.sql` — Migration para campos signature_url e photo_url

---

### 10. Produtos e Estoque

#### 10.1 Cadastro de Produtos

**Rota:** `/produtos`

**O que faz:**
- CRUD completo de produtos: nome, SKU (auto-gerado), categoria, tipo (avulso/kit), unidade, preco de custo, preco de venda, estoque minimo
- Classificacao por tipo com badge colorido: Avulso (azul), Kit (roxo)
- Composicao de kit: adicionar/remover produtos avulsos com quantidade
- Busca por nome, SKU ou categoria com filtros adicionais por tipo (Avulso/Kit) e categoria (select dinamico)

#### 10.2 Gestao de Estoque

**Rota:** `/produtos/estoque`

**O que faz:**
- Estoque multilocalizacao com locais configuraveis por tenant
- 3 cards resumo: Total de SKUs, Estoque Critico (itens abaixo do minimo), Valor Estimado
- Tabela matricial: produto x local de estoque com quantidades coloridas (vermelho = 0, amarelo < minimo, cinza normal)
- Transferencia entre locais com validacao de saldo
- Historico de movimentacoes (transferencia, entrada, saida, ajuste)
- Ajuste de estoque local clicando na quantidade: entrada, saida ou definir (overwrite) com preview do resultado
- Locais de estoque com endereco completo: CEP (busca automatica via ViaCEP), rua, numero, bairro, cidade, UF
- Reordenacao de locais via drag and drop (@dnd-kit/core + @dnd-kit/sortable), sort_order persistido no banco
- CRUD inline de locais de estoque
- Filtro por baixo estoque e busca por produto/SKU

**Arquivos principais:**
- `types/products.types.ts` — Tipos: Product, ProductType, StockLocation, ProductKitItem, StockLevel, StockMovement, MovementType
- `services/products/products.service.ts` — CRUD produtos + getKitItems/setKitItems
- `services/products/stock.service.ts` — CRUD locais + niveis de estoque + transferStock + adjustStock + getMovements
- `components/products/kit-items-editor.tsx` — Editor inline de composicao do kit
- `components/products/stock-transfer-modal.tsx` — Modal de transferencia entre locais
- `components/products/stock-movements-modal.tsx` — Modal de historico de movimentacoes
- `components/products/stock-adjust-modal.tsx` — Modal de ajuste de estoque local (entrada/saida/overwrite)
- `components/products/stock-locations-manager.tsx` — CRUD inline de locais de estoque
- `app/(dashboard)/produtos/page.tsx` — Pagina de cadastro de produtos
- `app/(dashboard)/produtos/estoque/page.tsx` — Pagina de gestao de estoque

---

### 11. Equipe (Colaboradores)

**Rota:** `/colaboradores`

**O que faz:**
- Gestao de colaboradores da empresa com niveis de acesso
- Convite de novos colaboradores via API route server-side (cria conta Supabase Auth)
- Edicao de nivel de acesso (Administrador, Editor, Viewer), departamento e cargo
- Ativacao/desativacao de colaboradores (soft delete)
- Exclusao permanente de colaboradores (com confirmacao)
- Busca por nome ou email
- Badges coloridos por departamento: Diretoria (amarelo), Logistica (verde), Administrativo (azul), Financeiro (roxo), Comercial (laranja), Producao (vermelho)
- Tabela com avatar (primeira letra), nome/email, departamento, cargo, status, nivel de acesso e acoes

**Departamentos:** Diretoria, Logistica, Administrativo, Financeiro, Comercial, Producao

**Niveis de acesso:** Administrador (tudo), Editor (CRUD sem configuracoes), Viewer (somente leitura)

**Como funciona o convite:**
- API route `/api/collaborators/invite` usa `SUPABASE_SERVICE_ROLE_KEY` para criar conta via `auth.admin.createUser()`
- Gera senha temporaria e envia link de recuperacao para o email do colaborador
- Associa o novo usuario ao tenant do owner/admin que convidou

**Arquivos principais:**
- `types/collaborators.types.ts` — Tipos: Collaborator, AccessLevel, Department, InviteCollaboratorData
- `services/collaborators/collaborators.service.ts` — getCollaborators, updateCollaborator, deleteCollaborator
- `app/api/collaborators/invite/route.ts` — API route para convite server-side
- `app/(dashboard)/colaboradores/page.tsx` — Pagina principal do modulo

---

### 12. Documentos

#### 12.1 Documentos da Empresa

**Rota:** `/documentos`

**O que faz:**
- Upload de documentos (PDF, JPG, PNG — max 10MB)
- Classificacao por natureza: CNPJ, Contratos, Doc Pessoais, Contabeis, Bancarios, Outros
- Busca client-side por nome do documento
- Download de documentos (link assinado de 5 min)
- Exclusao de documentos
- Envio via WhatsApp (integracao Evolution API)

**Arquivos principais:**
- `services/documents/document.service.ts` — Upload, listagem, download, exclusao
- `app/api/whatsapp/send-document/route.ts` — API route para envio WhatsApp
- `types/document.types.ts` — Tipos de documento

#### 12.2 Central de Documentos de Colaboradores

**Rota:** `/documentos/colaboradores`

**O que faz:**
- Central unificada para recibos de pagamento e atestados de colaboradores
- **Gerar Recibo:** formulario com colaborador, valor, referencia, descricao, forma de pagamento e data. Gera PDF profissional com layout corporativo (logo, watermark, valor por extenso, box de favorecido, linha de assinatura)
- **Anexar Atestado:** upload de documentos medicos e licencas (PDF, JPG, PNG, WebP — max 10MB) vinculados a um colaborador
- Tabela com todos os documentos, filtro por tipo (Todos/Recibo/Atestado), por colaborador e busca client-side por descricao/codigo/colaborador
- Preview visual de recibos com layout HTML completo
- Impressao/download de recibos em PDF
- Copia de codigo de registro para area de transferencia
- Exclusao de documentos (com remocao do arquivo no storage para atestados)
- Codigo de registro unico gerado automaticamente para cada documento (9 caracteres alfanumericos)

**Sidebar:** Menu "Documentos" expandivel com 2 filhos: "Empresa" (`/documentos`) e "Colaboradores" (`/documentos/colaboradores`)

**Arquivos principais:**
- `types/collaborator-documents.types.ts` — Tipos: CollaboratorDocument, CollaboratorDocType, CreateReceiptData, CreateCertificateData
- `services/collaborator-documents/collaborator-documents.service.ts` — CRUD: getCollaboratorDocuments, createReceipt, createCertificate, deleteCollaboratorDocument, getCertificateSignedUrl
- `services/collaborator-documents/receipt-pdf.ts` — Geracao de PDF de recibo com jsPDF (generateReceiptPdf, downloadReceiptPdf, printReceiptPdf)
- `components/collaborator-documents/receipt-modal.tsx` — Modal de criacao de recibo
- `components/collaborator-documents/certificate-modal.tsx` — Modal de upload de atestado (drag & drop)
- `components/collaborator-documents/receipt-preview.tsx` — Preview visual do recibo com botao de impressao
- `app/(dashboard)/documentos/colaboradores/page.tsx` — Pagina principal da central
- `components/layout/sidebar.tsx` — Sidebar atualizada com menu Documentos expandivel

---

### 13. Relatorios (Dashboard Analitico)

**Rota:** `/relatorios`

**O que faz:**
- Dashboard analitico unificado com abas por modulo: Vendas, Orcamentos, Logistica, Clientes, Financeiro, Estoque
- Filtro global de periodo: Hoje, 7 dias, 30 dias, Este mes, Personalizado (com inputs de data)
- KPIs numericos por aba (4 cards de indicadores)
- 2 graficos por aba (Recharts): bar, line, pie, area conforme o modulo
- Carregamento lazy — so busca dados da aba selecionada
- Cache por aba + periodo — invalida ao mudar filtro de data
- Agregacao client-side dos dados existentes (nenhuma tabela nova no banco)
- Dark mode completo em todos os componentes e graficos
- Scroll horizontal das abas em mobile

**Abas e metricas:**
- **Vendas:** Faturamento Total, Qtd Vendas, Ticket Medio, % Pagas + Faturamento por Periodo (BarChart) + Vendas por Forma de Pagamento (PieChart)
- **Orcamentos:** Total, Taxa Conversao, Valor Total, Desconto Medio + Funil por Status (BarChart horizontal) + Orcamentos por Periodo (LineChart)
- **Logistica:** Total Entregas, Concluidas, Tempo Medio (h), Valor em Rota + Entregas por Motorista (BarChart) + Status (PieChart)
- **Clientes:** Total, Novos no Periodo, Ativos, Tipo Principal + Novos por Periodo (BarChart) + Distribuicao por Tipo (PieChart)
- **Financeiro:** Receitas, Despesas, Saldo, Vencidos + Receitas vs Despesas (BarChart grouped) + Fluxo Acumulado (AreaChart)
- **Estoque:** Total SKUs, Estoque Critico, Valor Estimado, Movimentacoes + Produtos Abaixo do Minimo (BarChart horizontal) + Movimentacoes por Tipo (PieChart)

**Arquivos principais:**
- `types/reports.types.ts` — Tipos: DatePreset, DateRange, ReportTab, interfaces de dados por aba (SalesReportData, QuotesReportData, etc.)
- `services/reports/reports.service.ts` — 6 funcoes de agregacao: getSalesReport, getQuotesReport, getLogisticsReport, getClientsReport, getFinancialReport, getStockReport + helper groupByPeriod
- `components/reports/report-chart.tsx` — Componentes reutilizaveis: CHART_COLORS, ChartTooltip, ReportChartContainer
- `components/reports/report-tabs.tsx` — 6 componentes de aba: SalesTab, QuotesTab, LogisticsTab, ClientsTab, FinancialTab, StockTab
- `app/(dashboard)/relatorios/page.tsx` — Pagina principal do modulo com filtros, abas e carregamento lazy

---

### 14. Configuracoes

#### 14.1 Hub de Configuracoes

**Rota:** `/configuracoes`

**O que faz:**
- Hub central com 2 cards de navegacao
- **Usuarios** — Link direto para `/colaboradores` (gerenciamento de acessos e permissoes)
- **Categorias DRE** — Link direto para `/dre/settings` (gerenciamento de categorias do DRE)
- Cor accent fixa cerceta (teal Tailwind) aplicada via CSS custom properties na sidebar (items ativos, logo), header (avatar, focus input) e elementos interativos

**Arquivos principais:**
- `stores/tenant.store.ts` — Estado do tenant e modo escuro (light/dark)
- `types/tenant.types.ts` — Tipos de tenant
- `app/(dashboard)/configuracoes/page.tsx` — Pagina hub com links
- `app/globals.css` — CSS custom properties --accent-50 a --accent-950 (teal) + @theme inline
- `components/layout/header.tsx` — Header com avatar e input usando cor accent
- `components/layout/sidebar.tsx` — Sidebar com items ativos e logo usando cor accent

---

### 15. Valuation (Estimativa de Valor da Empresa)

**Presente em:** `/dre/[periodId]` (painel lateral)

**O que faz:**
- Calcula Enterprise Value (EV) pelo metodo EV/EBITDA
- Selecao de setor com multiplos pre-definidos:
  - Tecnologia: 15x | SaaS: 20x | Varejo: 8x | Industria: 6x
  - Servicos: 10x | Saude: 12x | Educacao: 10x | Financeiro: 12x
- Inputs: setor, multiplo customizado, divida bruta, caixa
- Outputs: Enterprise Value, Divida Liquida, Equity Value

---

### 16. Forecast (Previsao Financeira)

**Presente em:** Servico `dre-forecast.ts`

**O que faz:**
- Previsao de 12 meses baseada em dados historicos
- Usa regressao linear sobre receita, EBITDA e lucro
- Retorna: periodos projetados, taxa de crescimento, tendencia (up/down/stable), confianca

---

## Integracao WhatsApp

- Envia documentos via WhatsApp usando a Evolution API
- Envia pedidos de cotacao para fornecedores via WhatsApp
- Configuracao via variaveis de ambiente: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
- Endpoint documentos: `POST /api/whatsapp/send-document` — Payload: `{ documentId, phoneNumber, message? }`
- Endpoint cotacao: `POST /api/whatsapp/send-quote-request` — Payload: `{ supplierId, customMessage? }`
- Endpoint PDF orcamento: `POST /api/whatsapp/send-quote-pdf` — Payload: `{ phoneNumber, pdfBase64, fileName, message? }` — Envia PDF do orcamento via WhatsApp (upload temporario + signed URL + envio + cleanup)
- Endpoint clientes: `POST /api/whatsapp/send-client-message` — Payload: `{ clientIds: string[], customMessage }` — Envio em massa com anti-bloqueio (saudacoes rotativas + zero-width spaces + delay 3-5s)
- Endpoint tenant: `GET /api/tenant/info` — Retorna `{ name }` da empresa do usuario logado
- Endpoint convite: `POST /api/collaborators/invite` — Payload: `{ email, full_name, role, department?, job_title? }` — Cria conta Supabase Auth e associa ao tenant do owner/admin

---

## Banco de Dados (Supabase/PostgreSQL)

### Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `tenants` | Empresas cadastradas |
| `tenant_configs` | Configuracao visual (white-label) |
| `user_profiles` | Usuarios vinculados a tenants com papel, departamento, cargo e status ativo |
| `dre_categories` | Categorias DRE hierarquicas |
| `dre_periods` | Periodos DRE (mensal/trimestral/anual) |
| `dre_entries` | Lancamentos manuais do DRE |
| `transactions` | Transacoes financeiras (receitas e despesas) |
| `import_batches` | Historico de importacoes de extrato |
| `classification_rules` | Regras de classificacao automatica |
| `financial_categories` | Categorias auxiliares do financeiro |
| `documents` | Metadados de documentos enviados |
| `clients` | Clientes cadastrados (varejo, mensalista, doacao) |
| `purchase_items` | Itens do catalogo de compras (33 itens padrao) |
| `suppliers` | Fornecedores cadastrados |
| `supplier_items` | Vinculo fornecedor-item com ultimo preco |
| `purchase_quotes` | Cotacoes de preco por item |
| `market_signals` | Sinais de mercado / noticias do setor |
| `products` | Produtos cadastrados (avulso e kit) |
| `product_kit_items` | Composicao de kits (itens avulsos + quantidade) |
| `stock_locations` | Locais de estoque configuraveis por tenant |
| `stock_levels` | Quantidade por produto x local |
| `stock_movements` | Historico de movimentacoes de estoque |
| `collaborator_documents` | Recibos e atestados de colaboradores |
| `sales` | Vendas com protocolo VP, status (em_aberto/finalizada/cancelada), pagamento e cancelled_at |
| `sale_items` | Itens de cada venda (snapshot de produto, qtd, preco) |
| `quotes` | Orcamentos com protocolo OP, status e soft delete |
| `quote_items` | Itens de cada orcamento (snapshot de produto, qtd, preco, desconto) |
| `deliveries` | Entregas logisticas (Kanban) com status, motorista, confirmacoes, assinatura e foto |

### Seguranca
- Row-Level Security (RLS) em todas as tabelas
- Isolamento por `tenant_id`
- Storage com politicas por tenant
- Autenticacao obrigatoria em todas as API routes WhatsApp (send-document, send-client-message, send-quote-pdf, send-quote-request) — retorna 401 se nao autenticado
- Filtro por `tenant_id` no servico `getCollaborators` — impede acesso cross-tenant
- Mensagens de erro sanitizadas na pagina de registro (nao expoe detalhes internos)
- Senha temporaria de convite gerada com `crypto.randomUUID()` (Web Crypto API) em vez de `Math.random()`
- Safety net `.limit()` em todas as queries de listagem nos services (500 para entidades principais, 200 para referencia/lookup)

---

## Variaveis de Ambiente

Configuradas em `.env` (template em `.env.example`):

| Variavel | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publica do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin do Supabase |
| `EVOLUTION_API_URL` | URL da Evolution API (WhatsApp) |
| `EVOLUTION_API_KEY` | Chave da Evolution API |
| `EVOLUTION_INSTANCE` | Instancia do WhatsApp |

---

## Como Rodar o Projeto

```bash
# Instalar dependencias
cd app && npm install

# Configurar variaveis de ambiente
cp .env.example .env
# Preencher as variaveis no .env

# Rodar em desenvolvimento
npm run dev

# Build de producao
npm run build

# Verificacoes de qualidade
npm run lint        # Linting
npm run typecheck   # Checagem de tipos
npm test            # Testes
```

---

### UX: Component Library Compartilhada

**Diretorio:** `src/components/ui/`

Biblioteca de componentes reutilizaveis criada para eliminar duplicacao de Tailwind inline e garantir consistencia visual:

| Componente | Descricao |
|------------|-----------|
| `button.tsx` | Button com variants (primary, secondary, danger, ghost, success) + loading state |
| `input.tsx` | Input + FormField (label + input + error) |
| `badge.tsx` | Badge com color variants (yellow, green, red, blue, purple, gray, orange, cyan, teal) + pulse |
| `modal.tsx` | Modal shell com sizes (sm, md, lg, xl, full), focus trap, aria-modal, backdrop close, scroll automatico no body para conteudo longo |
| `confirm-dialog.tsx` | Dialog de confirmacao estilizado (substitui confirm() nativo) |
| `toast.tsx` | Wrapper do Sonner com config pt-BR + dark mode |
| `table.tsx` | Table/TableHead/TableBody/TableRow/TableCell/TableHeaderCell com sort integrado |
| `empty-state.tsx` | EmptyState com icone Lucide + mensagem + CTA clicavel |
| `pagination.tsx` | Paginacao client-side: "Mostrando X-Y de Z" + navegacao por paginas |
| `collapsible-section.tsx` | Secao colapsavel com chevron para formularios longos |
| `masked-input.tsx` | Input com mascara (CPF/CNPJ, telefone, CEP) |
| `command-palette.tsx` | Command Palette (Cmd+K) com busca de paginas e acoes rapidas |

**Hooks utilitarios:** `src/hooks/`
- `use-sort.ts` — Hook generico de ordenacao client-side (toggleSort, sorted)
- `use-pagination.ts` — Hook generico de paginacao client-side (20 itens/pagina default)

**Mascaras:** `src/lib/masks.ts` — maskCpfCnpj, maskPhone, maskCep, unmask

### UX: Melhorias Globais Implementadas

- **Toast notifications:** Todos os confirm() nativos substituidos por ConfirmDialog estilizado. Todos os alert() substituidos por toast.success/error/info (Sonner)
- **Ordenacao em tabelas:** Colunas clicaveis com indicador de direcao (asc/desc) em Vendas, Contas a Pagar, Contas a Receber, Compras Inteligencia, Clientes, Produtos
- **Paginacao:** 20 itens por pagina em todas as listas e tabelas
- **Sidebar reorganizada:** Agrupamento por dominio (Principal, Comercial, Operacional, Compras, Financeiro, Gestao) com labels de secao
- **Dashboard:** Default alterado de "Hoje" para "30 dias"; KPIs reordenados (acionaveis primeiro: Faturamento, Saldo, Estoque Critico, Entregas)
- **Header:** Busca decorativa substituida por hint "Buscar... Cmd+K" clicavel; Sino de notificacoes com opacity-50 e tooltip "Em breve"
- **Command Palette (Cmd+K):** Busca universal de paginas e acoes rapidas com navegacao por teclado
- **Formulario de clientes:** 14 campos divididos em 4 secoes colapsaveis (Dados Basicos, Contato, Endereco, Observacoes) com mascaras de input
- **Empty states:** Todas as paginas com componente EmptyState melhorado (icone + titulo + descricao + CTA)
- **Login:** Logo e cores alinhados com sidebar (bg-accent-600, letra "A")
- **Acessibilidade WCAG AA:** Skip-to-content link, focus-visible custom, aria-labels em botoes de icone, role=dialog + aria-modal em modais, focus trap

---

*Ultima atualizacao: 19/02/2026 — Fixes QA Batch 3 (Integridade): safety net .limit() em todas as queries de listagem dos services (FIX-13); pagina de reset-password com fluxo completo de recuperacao de senha (FIX-07); redirectTo atualizado no login para /reset-password.*
