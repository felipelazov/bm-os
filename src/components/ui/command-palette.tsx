'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Truck,
  Users,
  Wallet,
  Package,
  Warehouse,
  Newspaper,
  Brain,
  UsersRound,
  FileArchive,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'pagina' | 'acao';
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  // Páginas
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'pagina' },
  { id: 'vendas', label: 'Vendas', href: '/vendas', icon: ShoppingBag, category: 'pagina' },
  { id: 'orcamentos', label: 'Orçamentos', href: '/orcamentos', icon: FileText, category: 'pagina' },
  { id: 'clientes', label: 'Clientes', href: '/clientes', icon: Users, category: 'pagina' },
  { id: 'logistica', label: 'Logística', href: '/logistica', icon: Truck, category: 'pagina' },
  { id: 'produtos', label: 'Produtos', href: '/produtos', icon: Package, category: 'pagina' },
  { id: 'estoque', label: 'Estoque', href: '/produtos/estoque', icon: Warehouse, category: 'pagina' },
  { id: 'contas-pagar', label: 'Contas a Pagar', href: '/financeiro/contas-pagar', icon: ArrowDownCircle, category: 'pagina' },
  { id: 'contas-receber', label: 'Contas a Receber', href: '/financeiro/contas-receber', icon: ArrowUpCircle, category: 'pagina' },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa', icon: Wallet, category: 'pagina' },
  { id: 'importar', label: 'Importar Extrato', href: '/financeiro/importar', icon: Upload, category: 'pagina' },
  { id: 'newsletter', label: 'Newsletter Compras', href: '/compras', icon: Newspaper, category: 'pagina' },
  { id: 'inteligencia', label: 'Inteligência de Compras', href: '/compras/inteligencia', icon: Brain, category: 'pagina' },
  { id: 'fornecedores', label: 'Fornecedores', href: '/compras/fornecedores', icon: Truck, category: 'pagina' },
  { id: 'equipe', label: 'Equipe', href: '/colaboradores', icon: UsersRound, category: 'pagina' },
  { id: 'documentos', label: 'Documentos', href: '/documentos', icon: FileArchive, category: 'pagina' },
  { id: 'dre', label: 'DRE', href: '/dre', icon: FileSpreadsheet, category: 'pagina' },
  { id: 'relatorios', label: 'Relatórios', href: '/relatorios', icon: BarChart3, category: 'pagina' },
  { id: 'configuracoes', label: 'Configurações', href: '/configuracoes', icon: Settings, category: 'pagina' },
  // Ações rápidas
  { id: 'nova-venda', label: 'Nova Venda', href: '/vendas', icon: Plus, category: 'acao', keywords: ['criar', 'venda', 'vp'] },
  { id: 'novo-orcamento', label: 'Novo Orçamento', href: '/orcamentos', icon: Plus, category: 'acao', keywords: ['criar', 'orcamento', 'op'] },
  { id: 'novo-cliente', label: 'Novo Cliente', href: '/clientes', icon: Plus, category: 'acao', keywords: ['criar', 'cliente'] },
  { id: 'novo-produto', label: 'Novo Produto', href: '/produtos', icon: Plus, category: 'acao', keywords: ['criar', 'produto'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.length === 0
    ? COMMANDS
    : COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.id.includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        );
      });

  const pages = filtered.filter((c) => c.category === 'pagina');
  const actions = filtered.filter((c) => c.category === 'acao');
  const allItems = [...pages, ...actions];

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery('');
      router.push(item.href);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
        return;
      }

      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          handleSelect(allItems[selectedIndex]);
        }
      }
    },
    [open, allItems, selectedIndex, handleSelect]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => { setOpen(false); setQuery(''); }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida"
    >
      <div
        className="mx-4 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar páginas e ações..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
          />
          <kbd className="rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2" role="listbox">
          {allItems.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </p>
          )}

          {pages.length > 0 && (
            <>
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Páginas
              </p>
              {pages.map((item, i) => {
                const globalIndex = i;
                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    data-selected={selectedIndex === globalIndex}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedIndex === globalIndex
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </>
          )}

          {actions.length > 0 && (
            <>
              <p className="mt-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Ações Rápidas
              </p>
              {actions.map((item, i) => {
                const globalIndex = pages.length + i;
                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                    data-selected={selectedIndex === globalIndex}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      selectedIndex === globalIndex
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1">↵</kbd> selecionar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1">esc</kbd> fechar
          </span>
        </div>
      </div>
    </div>
  );
}
