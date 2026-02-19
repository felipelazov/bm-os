# QA Report — ADM PRO (Revisão de Produção)

**Data:** 2026-02-19
**Revisor:** Quinn (QA Agent)
**Escopo:** Revisão completa de produção — auth, permissões, fluxos, estados vazios, loading/error, mobile, validações, performance

---

## Resumo Executivo

| Severidade | Quantidade | Status |
|------------|-----------|--------|
| **P0 — Crítico** | 12 | Bloqueante para produção |
| **P1 — Importante** | 24 | Deve corrigir antes do go-live |
| **P2 — Melhoria** | 19 | Nice-to-have / sprint futuro |

**Nota geral: 4.5/10** — A aplicação funciona para o caso feliz, mas tem falhas críticas de segurança, race conditions em operações de estoque/protocolo, funcionalidades "fantasma" (botões sem handler), e problemas graves de responsividade mobile.

---

## P0 — CRÍTICO (Bloqueante)

### P0-01: Botão Logout não funciona — sessão nunca termina
**Arquivo:** `src/components/layout/sidebar.tsx:253-257`
**Reprodução:**
1. Faça login no app
2. Clique em "Sair" na sidebar
3. **Resultado:** Nada acontece. Não há `onClick` nem chamada a `supabase.auth.signOut()`
4. Em um dispositivo compartilhado, a sessão persiste indefinidamente

**Impacto:** Risco de sessão fixada. Usuário não consegue encerrar sessão.

---

### P0-02: Botão "Salvar Configurações" da página DRE Settings não faz nada
**Arquivo:** `src/app/(dashboard)/dre/settings/page.tsx:96-100`
**Reprodução:**
1. Navegue para Configurações → Categorias DRE
2. Edite os campos de Razão Social, CNPJ ou nome do contador
3. Clique em "Salvar Configurações"
4. **Resultado:** Nada acontece. O botão não tem `onClick`. Os dados nunca são persistidos.
5. Navegue para outra página e volte — dados voltaram ao original

**Impacto:** Perda silenciosa de dados. Usuário acredita ter salvo.

---

### P0-03: Botão "Nova Categoria" da página DRE Settings não faz nada
**Arquivo:** `src/app/(dashboard)/dre/settings/page.tsx:72`
**Reprodução:**
1. Navegue para Configurações → Categorias DRE
2. Clique em "Nova Categoria"
3. **Resultado:** Nada acontece. Sem handler.

**Impacto:** Funcionalidade prometida na UI que não existe.

---

### P0-04: Rotas de API do WhatsApp sem autenticação interna
**Arquivos:**
- `src/app/api/whatsapp/send-document/route.ts`
- `src/app/api/whatsapp/send-client-message/route.ts`
- `src/app/api/whatsapp/send-quote-pdf/route.ts`
- `src/app/api/whatsapp/send-quote-request/route.ts`

**Reprodução:**
1. Obtenha a URL da API (ex: `/api/whatsapp/send-client-message`)
2. Faça um `POST` direto (curl/Postman) sem cookie de sessão
3. **Resultado:** O middleware redireciona para `/login` (307) ao invés de retornar 401 JSON. Nenhuma rota verifica `getUser()` internamente.

**Impacto:** Se o middleware for contornado ou mal configurado, as rotas ficam totalmente abertas. Falta defense-in-depth.

---

### P0-05: Race condition na geração de protocolo (VP/OP duplicados)
**Arquivos:**
- `src/services/sales/sales.service.ts:72-92`
- `src/services/quotes/quotes.service.ts:67-87`

**Reprodução:**
1. Abra 2 abas do app simultaneamente
2. Clique "Nova Venda" em ambas ao mesmo tempo
3. **Resultado:** Ambas leem o mesmo último protocolo (ex: VP004-26) e ambas geram VP005-26
4. Dois registros com o mesmo protocolo serão criados

**Impacto:** Duplicação de identificadores únicos. Corrompe dados de referência.

---

### P0-06: Race condition no ajuste de estoque (read-modify-write)
**Arquivo:** `src/services/products/stock.service.ts:161-210`
**Reprodução:**
1. Produto com estoque=10
2. Dois usuários finalizam vendas com 2 unidades cada, simultaneamente
3. Ambos leem `quantity=10`, calculam `10-2=8`, escrevem `8`
4. **Resultado:** Estoque final = 8 (deveria ser 6). 2 unidades "fantasma"

**Impacto:** Estoque incorreto, possível venda de itens não disponíveis.

---

### P0-07: Fluxo de recuperação de senha incompleto
**Arquivo:** `src/app/(auth)/login/page.tsx:32-55`
**Reprodução:**
1. Clique em "Esqueceu a senha?"
2. Digite email e clique "Enviar link de recuperação"
3. Receba o email e clique no link
4. **Resultado:** Redirecionado para `/login` normal. Não há handler para o token de reset na URL. Não há tela para definir nova senha.

**Impacto:** Funcionalidade de recuperação de senha está quebrada.

---

### P0-08: Queries sem `.limit()` — todas as tabelas são carregadas integralmente
**Arquivos:** Todos os arquivos em `src/services/`
**Reprodução:**
1. Cadastre 10.000 vendas ao longo do tempo
2. Navegue para `/vendas`
3. **Resultado:** Todas as 10.000 vendas são carregadas no browser antes de filtrar
4. O mesmo ocorre em: clientes, produtos, transações financeiras, entregas, orçamentos

**Impacto:** Degradação severa de performance com crescimento de dados. Pode travar o browser.

---

### P0-09: Viewport meta tag ausente — app inutilizável no mobile
**Arquivo:** `src/app/layout.tsx`
**Reprodução:**
1. Abra o app em um celular (ou Chrome DevTools com viewport 375px)
2. **Resultado:** O browser renderiza a página na largura desktop (980px) e faz zoom out
3. Todo o conteúdo fica minúsculo e ilegível

**Fix:** Adicionar `export const viewport = { width: 'device-width', initialScale: 1 }` em `layout.tsx`

**Impacto:** App completamente inutilizável em dispositivos móveis.

---

### P0-10: Tabelas sem scroll horizontal no mobile (5 páginas)
**Arquivos:**
- `src/app/(dashboard)/financeiro/contas-pagar/page.tsx:355`
- `src/app/(dashboard)/financeiro/contas-receber/page.tsx:354`
- `src/app/(dashboard)/colaboradores/page.tsx:375`
- `src/components/dre/dre-table.tsx:47`
- `src/app/(dashboard)/financeiro/fluxo-caixa/page.tsx:160`

**Reprodução:**
1. Abra qualquer página acima em tela < 768px
2. **Resultado:** Tabelas com 5-7 colunas ficam cortadas. `overflow-hidden` impede scroll.

**Fix:** Trocar `overflow-hidden` por `overflow-x-auto` no wrapper da tabela.

---

### P0-11: Botão hamburger sem `aria-label` — inacessível
**Arquivo:** `src/components/layout/header.tsx:29-34`
**Reprodução:**
1. Navegue com leitor de tela (VoiceOver/NVDA)
2. Foque no botão de menu mobile
3. **Resultado:** Leitor anuncia apenas "botão" sem contexto

---

### P0-12: `getCollaborators()` sem filtro de tenant_id
**Arquivo:** `src/services/collaborators/collaborators.service.ts:8-12`
**Reprodução:**
1. Crie 2 empresas (tenants) diferentes no Supabase
2. Faça login com o tenant A
3. Navegue para /colaboradores
4. **Resultado:** Se RLS não estiver configurado, mostra colaboradores de TODOS os tenants

**Impacto:** Potencial vazamento de dados cross-tenant. Depende 100% do RLS do Supabase (não verificável no código).

---

## P1 — IMPORTANTE (Corrigir antes do go-live)

### P1-01: Registro expõe mensagens de erro internas do Supabase
**Arquivo:** `src/app/(auth)/register/page.tsx:35`
**Descrição:** `setError(error.message)` exibe erros como "User already registered" — permite enumeração de usuários.

### P1-02: Sem proteção contra brute-force no login
**Arquivo:** `src/app/(auth)/login/page.tsx`
**Descrição:** Sem rate limiting, CAPTCHA, ou lockout. Supabase pode ter proteção default, mas não há camada extra.

### P1-03: Sem validação de checksum CPF/CNPJ
**Arquivo:** `src/app/(dashboard)/clientes/page.tsx:338-344`
**Descrição:** MaskedInput formata visualmente, mas aceita CPFs inválidos como `000.000.000-00`.

### P1-04: Fornecedores — campos CNPJ/telefone/WhatsApp sem máscara
**Arquivo:** `src/app/(dashboard)/compras/fornecedores/page.tsx:321-348`
**Descrição:** Plain `<input type="text">` sem MaskedInput (diferente da página de clientes).

### P1-05: Timezone incorreto — `new Date().toISOString()` gera data UTC
**Arquivos:** `financeiro/contas-pagar/page.tsx:131`, `financeiro/contas-receber/page.tsx:132`
**Descrição:** Após 21h (UTC-3), `toISOString().split('T')[0]` retorna a data do dia seguinte. Transações "pagas" à noite ficam com data errada.

### P1-06: Erros de CRUD usam banner ao invés de toast (12+ páginas)
**Arquivos:** clientes, colaboradores, orçamentos, logística, contas-pagar, contas-receber, DRE, documentos
**Descrição:** Erros de save/update usam `setError()` (banner no topo), mas erros de delete usam `toast.error()`. Se o usuário scrollou, não vê o banner.

### P1-07: "Marcar Pago/Recebido" sem proteção contra duplo-clique
**Arquivos:** `financeiro/contas-pagar/page.tsx:428-434`, `financeiro/contas-receber/page.tsx:428-434`
**Descrição:** Botões sem `disabled` state. Cliques rápidos disparam múltiplas chamadas.

### P1-08: quote-form silencia erros de carregamento de clientes/produtos
**Arquivo:** `src/components/quotes/quote-form.tsx:100-111, 251-263`
**Descrição:** `catch { // silently fail }` — dropdown fica vazio sem indicação de erro.

### P1-09: Formulários `grid-cols-5` quebram no mobile
**Arquivos:** `financeiro/contas-pagar/page.tsx:250`, `financeiro/contas-receber/page.tsx:250`
**Descrição:** 5 colunas sem breakpoints responsivos. Completamente inutilizável em tela < 768px.

### P1-10: Grids `grid-cols-3`/`grid-cols-4` sem breakpoints (6 páginas)
**Arquivos:** fluxo-caixa:114, compras:32, dre:116, importar:224, contas-pagar:320, contas-receber:320
**Descrição:** Cards ficam com ~80px de largura no mobile.

### P1-11: Modal body sem `max-h` + `overflow-y-auto`
**Arquivo:** `src/components/ui/modal.tsx:106`
**Descrição:** Modais longos podem exceder a viewport em telas menores.

### P1-12: Modais inline (contas-pagar/receber) sem accessibility
**Arquivos:** `financeiro/contas-pagar/page.tsx:480`, `financeiro/contas-receber/page.tsx:479`
**Descrição:** Sem `role="dialog"`, sem `aria-modal`, sem focus trap, sem Escape handler. Não usam o componente Modal.

### P1-13: Botões icon-only usam `title=` ao invés de `aria-label`
**Arquivos:** clientes, produtos, colaboradores, contas-pagar/receber, documentos, orçamentos, fornecedores
**Descrição:** `title` não é anunciado confiavelmente por leitores de tela. Dezenas de botões afetados.

### P1-14: Touch targets de ~28px (mínimo WCAG é 44px)
**Arquivos:** Todos os botões de ação em tabelas com `p-1.5`
**Descrição:** Padding `p-1.5` + ícone 16px = ~28px. Difícil tocar em mobile.

### P1-15: Botões raw sem `focus-visible:ring-*`
**Arquivos:** Dezenas de `<button>` fora do componente Button
**Descrição:** Sem indicador visual de foco para navegação por teclado.

### P1-16: Error divs sem `role="alert"` / `aria-live`
**Arquivos:** Todas as páginas com banners de erro
**Descrição:** Erros dinâmicos não são anunciados por leitores de tela. CSS para `[aria-live]` existe no globals.css mas nenhum componente usa o atributo.

### P1-17: Página de Relatórios mostra conteúdo em branco após erro
**Arquivo:** `src/app/(dashboard)/relatorios/page.tsx:279`
**Descrição:** Se `currentData` é null e loading é false (após erro), `return null` renderiza área completamente vazia.

### P1-18: N+1 queries em reorder de estoque/logística e criação de vendas
**Arquivos:** `stock.service.ts:56-63`, `logistics.service.ts:107-115`, `sales.service.ts:154-163`
**Descrição:** Loops `for...of await` com 1 query por item. Venda com 5 itens = 15 queries.

### P1-19: Sem validação de força de senha no registro
**Arquivo:** `src/app/(auth)/register/page.tsx:98-106`
**Descrição:** Apenas `minLength={6}` (HTML). Sem requisito de complexidade.

### P1-20: StockAdjustModal usa DOM traversal frágil para submit
**Arquivo:** `src/components/products/stock-adjust-modal.tsx:177-186`
**Descrição:** `closest('.rounded-xl')?.querySelector('form')?.requestSubmit()` — quebra se a estrutura DOM mudar.

### P1-21: Spinner full-page em cada reload (contas-pagar/receber)
**Arquivos:** `financeiro/contas-pagar/page.tsx:210`, `financeiro/contas-receber/page.tsx:210`
**Descrição:** `if (loading)` sem guard `&& data.length === 0`. Cada CRUD faz a tela piscar com spinner.

### P1-22: @tanstack/react-query instalado mas nunca usado
**Arquivo:** `package.json`
**Descrição:** Dependência instalada, zero queries/mutations no código. Nenhum caching entre navegações.

### P1-23: `tempPassword` usa `Math.random()` + `Date.now()` — não é criptograficamente seguro
**Arquivo:** `src/app/api/collaborators/invite/route.ts:54`
**Descrição:** Deve usar `crypto.randomBytes()`.

### P1-24: Labels de formulário sem `htmlFor`/`id` pairing
**Arquivo:** `src/app/(auth)/login/page.tsx:83-147`
**Descrição:** Labels adjacentes aos inputs mas não explicitamente associados via `htmlFor`.

---

## P2 — MELHORIA (Sprint futuro)

### P2-01: Sem botão "Tentar novamente" nos banners de erro (15 páginas)
### P2-02: `select('*')` em todos os services — sem projeção de colunas
### P2-03: Soft delete de quotes filtrado client-side, não server-side
### P2-04: jsPDF/xlsx carregados no bundle inicial (sem dynamic import)
### P2-05: Estado de página perdido ao navegar (filtros, tabs, busca)
### P2-06: Sem detecção de offline / mensagem amigável para erros de rede
### P2-07: Campos `value` financeiros aceitam R$0,00 sem aviso
### P2-08: `due_date` é required na criação mas opcional na edição (contas-pagar)
### P2-09: Desconto em orçamento pode exceder total da linha (zera silenciosamente)
### P2-10: MaskedInput não re-aplica máscara no `value` inicial ao editar
### P2-11: `register` aceita nomes de apenas espaços (whitespace-only)
### P2-12: Sem skeleton loading (exceto dashboard) — apenas spinners
### P2-13: Phone sem máscara no modal de logística (add-delivery-modal)
### P2-14: DRE period not found mostra apenas banner sem CTA de retorno
### P2-15: Importar extrato: categorias falham silenciosamente (`catch(() => {})`)
### P2-16: Sidebar group labels com contraste insuficiente (~2.6:1 em `text-gray-400`)
### P2-17: Modal usa `aria-label` em vez de `aria-labelledby` (preferível WCAG)
### P2-18: Middleware não preserva URL de destino ao redirecionar para login
### P2-19: `dangerouslySetInnerHTML` no dark-mode script (estático, mas padrão arriscado)

---

## Top 5 Ações Prioritárias

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 1 | **Implementar logout funcional** (P0-01) | 5 min | Crítico — segurança |
| 2 | **Adicionar viewport meta tag** (P0-09) + corrigir grids responsivos (P0-10, P1-09, P1-10) | 30 min | Desbloqueia mobile inteiro |
| 3 | **Corrigir race conditions** de protocolo (P0-05) e estoque (P0-06) com Postgres functions | 2h | Integridade de dados |
| 4 | **Implementar paginação server-side** nas queries (P0-08) ou pelo menos `.limit(100)` | 1h | Performance com crescimento |
| 5 | **Corrigir botões DRE Settings** (P0-02, P0-03) ou remover da UI | 15 min | UX — elimina funcionalidade fantasma |

---

## Verificação

- [ ] Todos os P0 resolvidos
- [ ] Build passa sem erros (`npm run build`)
- [ ] Lint passa (`npm run lint`)
- [ ] App testado em viewport 375px (mobile)
- [ ] App testado em dark mode
- [ ] Navegação por teclado funciona em todas as páginas
- [ ] Logout funciona e limpa sessão
- [ ] DRE Settings salva dados corretamente

---

*— Quinn, guardião da qualidade*
