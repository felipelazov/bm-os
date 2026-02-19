# QA Fix Request — ADM PRO

**De:** Quinn (QA)
**Para:** @dev
**Data:** 2026-02-19
**Referência:** `docs/qa/qa_report.md`
**Gate Decision:** FAIL — 12 issues P0 bloqueantes

---

## Instruções

Corrigir os issues abaixo em ordem de batch. Cada batch é independente e pode ser commitado separadamente. Após cada batch, rodar `npm run build` para garantir que compila.

**Escopo desta request:** Apenas P0 (12 issues) + P1 selecionados de alto impacto com baixo esforço (8 issues). Total: 20 fixes.

P2 e P1 restantes ficam para sprint futuro.

---

## BATCH 1 — Quick Wins (< 5 min cada)

### FIX-01: Implementar logout funcional
**Issue:** P0-01
**Arquivo:** `src/components/layout/sidebar.tsx:253-257`
**O que fazer:**
1. Importar `createClient` do `@/services/supabase/client`
2. Adicionar `onClick` handler no botão "Sair":
   ```tsx
   onClick={async () => {
     const supabase = createClient();
     await supabase.auth.signOut();
     window.location.href = '/login';
   }}
   ```
**Critério de aceite:** Clicar "Sair" encerra a sessão e redireciona para `/login`. Revisitar `/dashboard` sem login redireciona para `/login`.

---

### FIX-02: Adicionar viewport meta tag
**Issue:** P0-09
**Arquivo:** `src/app/layout.tsx`
**O que fazer:**
Adicionar export `viewport` no arquivo (Next.js 14+ pattern):
```tsx
import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
```
**Critério de aceite:** Abrir o app em Chrome DevTools com viewport 375px mostra conteúdo em tamanho legível.

---

### FIX-03: Adicionar `aria-label` no botão hamburger
**Issue:** P0-11
**Arquivo:** `src/components/layout/header.tsx:29-34`
**O que fazer:**
Adicionar `aria-label="Abrir menu"` no botão:
```tsx
<button onClick={onToggleSidebar} aria-label="Abrir menu" className="...">
```
Também adicionar nos outros botões icon-only do header:
- Botão dark mode: `aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}`
- Botão notificações: `aria-label="Notificações"`
- Botão sidebar close (sidebar.tsx): `aria-label="Fechar menu"`

**Critério de aceite:** VoiceOver/NVDA anuncia "Abrir menu" ao focar no botão.

---

### FIX-04: Tabelas sem scroll horizontal — trocar overflow-hidden por overflow-x-auto
**Issue:** P0-10
**Arquivos (5 locais):**
1. `src/app/(dashboard)/financeiro/contas-pagar/page.tsx:355` — `overflow-hidden` → `overflow-x-auto`
2. `src/app/(dashboard)/financeiro/contas-receber/page.tsx:354` — idem
3. `src/app/(dashboard)/colaboradores/page.tsx:375` — idem
4. `src/components/dre/dre-table.tsx:47` — idem
5. `src/app/(dashboard)/financeiro/fluxo-caixa/page.tsx:160` — idem

**O que fazer:** Em cada arquivo, no `<div>` wrapper da `<table>`, trocar `overflow-hidden` por `overflow-x-auto`.

**Critério de aceite:** Em viewport 375px, as tabelas permitem scroll horizontal.

---

### FIX-05: Botões DRE Settings não funcionais — remover ou implementar
**Issue:** P0-02, P0-03
**Arquivo:** `src/app/(dashboard)/dre/settings/page.tsx`
**O que fazer (opção A — remover):**
Remover os botões "Salvar Configurações" e "Nova Categoria" e os campos de input associados (`companyInfo` state), já que não têm backend.
Adicionar um comentário `{/* TODO: implementar persistência */}` no lugar.

**O que fazer (opção B — implementar):**
Criar service `saveTenantSettings()` e conectar o botão. Isso requer tabela no Supabase.

**Recomendação QA:** Opção A (remover) para destravar produção. Implementar em sprint futuro.

**Critério de aceite:** Não existem botões na UI que silenciosamente não fazem nada.

---

## BATCH 2 — Segurança (Auth & API)

### FIX-06: Adicionar auth check nas rotas WhatsApp
**Issue:** P0-04
**Arquivos (4 rotas):**
- `src/app/api/whatsapp/send-document/route.ts`
- `src/app/api/whatsapp/send-client-message/route.ts`
- `src/app/api/whatsapp/send-quote-pdf/route.ts`
- `src/app/api/whatsapp/send-quote-request/route.ts`

**O que fazer:** No início de cada handler `POST`, adicionar:
```tsx
import { createClient } from '@/services/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}
```

**Critério de aceite:** `curl -X POST /api/whatsapp/send-client-message` sem cookie retorna 401 JSON (não 307 redirect).

---

### FIX-07: Fluxo de recuperação de senha — criar página de reset
**Issue:** P0-07
**Arquivo:** `src/app/(auth)/login/page.tsx`
**O que fazer:**
1. Alterar o `redirectTo` em `resetPasswordForEmail` para: `${window.location.origin}/reset-password`
2. Criar nova página `src/app/(auth)/reset-password/page.tsx` que:
   - Detecta o hash/token na URL via `supabase.auth.onAuthStateChange` (evento `PASSWORD_RECOVERY`)
   - Mostra formulário para nova senha
   - Chama `supabase.auth.updateUser({ password: newPassword })`
   - Redireciona para `/login` com mensagem de sucesso

**Critério de aceite:** Fluxo completo: solicitar reset → receber email → clicar link → digitar nova senha → login com nova senha funciona.

---

### FIX-08: Adicionar tenant_id filter em getCollaborators
**Issue:** P0-12
**Arquivo:** `src/services/collaborators/collaborators.service.ts:8-12`
**O que fazer:**
```tsx
export async function getCollaborators() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('full_name');
  // ...
}
```
**Nota:** Se RLS já faz esse filtro no Supabase, este fix é redundante mas não prejudica (defense-in-depth).

**Critério de aceite:** Com 2 tenants no DB, cada um vê apenas seus colaboradores.

---

### FIX-09: Sanitizar mensagens de erro no registro
**Issue:** P1-01
**Arquivo:** `src/app/(auth)/register/page.tsx:35`
**O que fazer:**
```tsx
if (error) {
  setError('Erro ao criar conta. Verifique os dados e tente novamente.');
  setLoading(false);
  return;
}
```
**Critério de aceite:** Cadastrar email já existente mostra mensagem genérica, não "User already registered".

---

### FIX-10: Gerar tempPassword com crypto
**Issue:** P1-23
**Arquivo:** `src/app/api/collaborators/invite/route.ts:54`
**O que fazer:**
```tsx
import { randomBytes } from 'crypto';
const tempPassword = `Tmp${randomBytes(8).toString('hex')}!`;
```
**Critério de aceite:** Senha temporária é aleatória e não usa `Math.random()`.

---

## BATCH 3 — Integridade de Dados

### FIX-11: Race condition de protocolo — usar Supabase RPC
**Issue:** P0-05
**Arquivos:** `src/services/sales/sales.service.ts:72-92`, `src/services/quotes/quotes.service.ts:67-87`
**O que fazer:**
Criar uma Postgres function que gera o próximo protocolo atomicamente:
```sql
CREATE OR REPLACE FUNCTION next_protocol(prefix text, yr text, tenant uuid)
RETURNS text AS $$
DECLARE
  last_num int;
  pattern text;
BEGIN
  pattern := prefix || '%' || '-' || yr;
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(protocol FROM prefix || '(\d+)-' || yr) AS int)),
    0
  ) INTO last_num
  FROM sales
  WHERE protocol LIKE pattern AND tenant_id = tenant
  FOR UPDATE;

  RETURN prefix || LPAD((last_num + 1)::text, 3, '0') || '-' || yr;
END;
$$ LANGUAGE plpgsql;
```
Chamar via `supabase.rpc('next_protocol', { prefix: 'VP', yr: '26', tenant: tenantId })`.

**Alternativa mais simples:** Adicionar `UNIQUE` constraint no campo `protocol` e retry com backoff em caso de conflict.

**Critério de aceite:** 2 vendas criadas simultaneamente geram protocolos diferentes (VP005-26 e VP006-26).

---

### FIX-12: Race condition de estoque — usar UPDATE atômico
**Issue:** P0-06
**Arquivo:** `src/services/products/stock.service.ts:161-210`
**O que fazer:**
Criar Postgres function:
```sql
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id uuid, p_location_id uuid, p_quantity int, p_type text
) RETURNS int AS $$
DECLARE
  new_qty int;
BEGIN
  IF p_type = 'exit' THEN
    UPDATE stock_levels
    SET quantity = quantity - p_quantity
    WHERE product_id = p_product_id AND location_id = p_location_id
    RETURNING quantity INTO new_qty;
  ELSE
    UPDATE stock_levels
    SET quantity = quantity + p_quantity
    WHERE product_id = p_product_id AND location_id = p_location_id
    RETURNING quantity INTO new_qty;
  END IF;

  IF new_qty IS NULL THEN
    INSERT INTO stock_levels (product_id, location_id, quantity)
    VALUES (p_product_id, p_location_id, p_quantity)
    RETURNING quantity INTO new_qty;
  END IF;

  RETURN new_qty;
END;
$$ LANGUAGE plpgsql;
```
Chamar via `supabase.rpc('adjust_stock', { ... })` ao invés de read-modify-write no JS.

**Critério de aceite:** 2 vendas concorrentes deducem corretamente o estoque (10 - 2 - 2 = 6, não 8).

---

### FIX-13: Adicionar `.limit()` nas queries principais
**Issue:** P0-08
**Arquivos:** Todos os services em `src/services/`
**O que fazer:**
Adicionar `.limit(500)` como safety net em todas as queries de listagem:
- `clients.service.ts` → `.limit(500)`
- `sales.service.ts` → `.limit(500)`
- `financial.service.ts` → `.limit(500)`
- `products.service.ts` → `.limit(500)`
- `quotes.service.ts` → `.limit(500)`
- `logistics.service.ts` → `.limit(200)`
- `collaborators.service.ts` → `.limit(200)`

**Nota:** Isso é um safety net temporário. A solução definitiva é paginação server-side (sprint futuro).

**Critério de aceite:** Nenhuma query retorna mais de 500 registros.

---

## BATCH 4 — Mobile & Responsividade

### FIX-14: Grids rígidos — adicionar breakpoints responsivos
**Issue:** P1-09, P1-10
**Arquivos e mudanças:**

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `financeiro/contas-pagar/page.tsx` | 250 | `grid-cols-5` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` |
| `financeiro/contas-receber/page.tsx` | 250 | `grid-cols-5` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` |
| `financeiro/contas-pagar/page.tsx` | 320 | `grid-cols-3` | `grid-cols-1 sm:grid-cols-3` |
| `financeiro/contas-receber/page.tsx` | 320 | `grid-cols-3` | `grid-cols-1 sm:grid-cols-3` |
| `financeiro/fluxo-caixa/page.tsx` | 114 | `grid-cols-4` | `grid-cols-2 sm:grid-cols-4` |
| `compras/page.tsx` | 32 | `grid-cols-4` | `grid-cols-2 sm:grid-cols-4` |
| `dre/page.tsx` | 116 | `grid-cols-4` | `grid-cols-2 sm:grid-cols-4` |
| `financeiro/importar/page.tsx` | 224 | `grid-cols-4` | `grid-cols-2 sm:grid-cols-4` |
| `dre/settings/page.tsx` | 24 | `grid-cols-3` | `grid-cols-1 sm:grid-cols-3` |

**Critério de aceite:** Em viewport 375px, todos os grids colapsam para 1-2 colunas legíveis.

---

### FIX-15: Modal body com scroll para conteúdo longo
**Issue:** P1-11
**Arquivo:** `src/components/ui/modal.tsx:106`
**O que fazer:**
Trocar o div do body:
```tsx
// De:
<div className="px-6 py-4">{children}</div>
// Para:
<div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-6 py-4">{children}</div>
```
**Critério de aceite:** Modal com formulário longo permite scroll interno em viewport 667px.

---

### FIX-16: Modais inline de edição (contas-pagar/receber) — migrar para Modal component
**Issue:** P1-12
**Arquivos:** `financeiro/contas-pagar/page.tsx:480`, `financeiro/contas-receber/page.tsx:479`
**O que fazer:**
Substituir o `<div className="fixed inset-0 z-50 ...">` pelo componente `<Modal>`:
```tsx
<Modal
  open={!!editingTransaction}
  onClose={() => setEditingTransaction(null)}
  title="Editar Transação"
>
  <form onSubmit={handleEdit}>
    {/* campos existentes */}
  </form>
</Modal>
```
**Critério de aceite:** Modal de edição tem focus trap, fecha com Escape, e é anunciado por screen readers.

---

## BATCH 5 — UX & Feedback

### FIX-17: Timezone — usar data local ao invés de UTC
**Issue:** P1-05
**Arquivos:** `financeiro/contas-pagar/page.tsx:131`, `financeiro/contas-receber/page.tsx:132`
**O que fazer:**
```tsx
// De:
const today = new Date().toISOString().split('T')[0];
// Para:
const today = new Date().toLocaleDateString('en-CA'); // formato YYYY-MM-DD em timezone local
```
**Critério de aceite:** Transação "paga" às 23h em SP mostra a data de hoje, não de amanhã.

---

### FIX-18: Erros de CRUD — migrar de setError para toast.error
**Issue:** P1-06
**Arquivos (padrão a aplicar em todos):**
Nas funções `handleCreate`, `handleSave`, `handleEdit`, `handleMarkPaid`, `handleMarkReceived`, `handleToggleActive`:
```tsx
// De:
} catch (err) {
  setError(err instanceof Error ? err.message : 'Erro...');
}
// Para:
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Erro...');
}
```
Manter `setError()` apenas para erros de carregamento inicial (fetchData).

**Páginas afetadas:** clientes, colaboradores, orçamentos, logística, contas-pagar, contas-receber, DRE, documentos, compras/fornecedores

**Critério de aceite:** Erros de CRUD aparecem como toast no canto inferior direito, visíveis independente do scroll.

---

### FIX-19: "Marcar Pago/Recebido" — adicionar disabled/loading
**Issue:** P1-07
**Arquivos:** `financeiro/contas-pagar/page.tsx`, `financeiro/contas-receber/page.tsx`
**O que fazer:**
Adicionar state `markingId` para rastrear qual transação está sendo marcada:
```tsx
const [markingId, setMarkingId] = useState<string | null>(null);

const handleMarkPaid = async (id: string) => {
  if (markingId) return;
  setMarkingId(id);
  try { /* ... */ } finally { setMarkingId(null); }
};

// No botão:
<button disabled={markingId === t.id} onClick={() => handleMarkPaid(t.id)}>
  {markingId === t.id ? <Loader2 className="animate-spin" /> : <Check />}
  {markingId === t.id ? 'Marcando...' : 'Marcar Pago'}
</button>
```
**Critério de aceite:** Clicar 2x rapidamente em "Marcar Pago" executa apenas 1 chamada API.

---

### FIX-20: Relatórios — empty state quando dados são null
**Issue:** P1-17
**Arquivo:** `src/app/(dashboard)/relatorios/page.tsx:279`
**O que fazer:**
```tsx
// De:
if (!currentData) return null;
// Para:
if (!currentData) return (
  <EmptyState
    icon={FileText}
    title="Nenhum dado disponível"
    description="Selecione um período e clique em carregar para visualizar os relatórios."
  />
);
```
**Critério de aceite:** Após erro ou antes de carregar, a área de conteúdo mostra EmptyState com ícone e mensagem.

---

## Checklist de Verificação Pós-Fix

Após completar todos os batches:

- [ ] `npm run build` — sem erros
- [ ] `npm run lint` — sem warnings novos
- [ ] Testar logout: sessão encerra, redirect para /login
- [ ] Testar em viewport 375px: grids colapsam, tabelas scrollam
- [ ] Testar dark mode: todas as páginas mantêm visual correto
- [ ] Testar DRE Settings: botões fantasma removidos/implementados
- [ ] Testar duplo-clique em "Marcar Pago": apenas 1 chamada
- [ ] Testar relatórios com erro: mostra EmptyState, não branco
- [ ] Testar contas-pagar após 21h: data correta
- [ ] curl sem auth em `/api/whatsapp/send-client-message` retorna 401 JSON

---

## Issues NÃO incluídos nesta request (sprint futuro)

| ID | Issue | Razão |
|----|-------|-------|
| P0-05, P0-06 | Race conditions (protocolo + estoque) | Requer Postgres functions — alinhar com DBA |
| P1-03 | Validação checksum CPF/CNPJ | Requer lib adicional ou algoritmo |
| P1-04 | Masks em fornecedores | Baixo risco, sprint futuro |
| P1-13 | `aria-label` em todos os botões icon-only | Volume alto, sprint de a11y |
| P1-14 | Touch targets 44px | Requer redesign de botões em tabelas |
| P1-18 | N+1 queries | Requer refactor de services |
| P1-22 | React Query migration | Fase 6 do plano UX |
| P2-* | Todas as melhorias P2 | Sprint futuro |

**Nota:** P0-05 e P0-06 (race conditions) estão documentados com SQL ready-to-use acima nos FIX-11 e FIX-12, mas requerem acesso ao Supabase Dashboard para criar as functions. Priorizar assim que DBA estiver disponível.

---

*— Quinn, guardião da qualidade*
