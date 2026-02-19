'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/services/supabase/client';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Upload,
  FileArchive,
  ShoppingCart,
  ShoppingBag,
  FileText,
  Newspaper,
  Brain,
  Truck,
  Users,
  UsersRound,
  Package,
  Warehouse,
  Building2,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'PRINCIPAL',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'COMERCIAL',
    items: [
      { name: 'Vendas', href: '/vendas', icon: ShoppingBag },
      { name: 'Orçamentos', href: '/orcamentos', icon: FileText },
      { name: 'Clientes', href: '/clientes', icon: Users },
    ],
  },
  {
    label: 'OPERACIONAL',
    items: [
      { name: 'Logística', href: '/logistica', icon: Truck },
      {
        name: 'Produtos',
        href: '/produtos',
        icon: Package,
        children: [
          { name: 'Cadastro', href: '/produtos', icon: Package },
          { name: 'Estoque', href: '/produtos/estoque', icon: Warehouse },
        ],
      },
    ],
  },
  {
    label: 'COMPRAS',
    items: [
      { name: 'Newsletter', href: '/compras', icon: Newspaper },
      { name: 'Inteligência', href: '/compras/inteligencia', icon: Brain },
      { name: 'Fornecedores', href: '/compras/fornecedores', icon: Truck },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { name: 'Contas a Pagar', href: '/financeiro/contas-pagar', icon: ArrowDownCircle },
      { name: 'Contas a Receber', href: '/financeiro/contas-receber', icon: ArrowUpCircle },
      { name: 'Importar Extrato', href: '/financeiro/importar', icon: Upload },
      { name: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa', icon: BarChart3 },
      {
        name: 'DRE',
        href: '/dre',
        icon: FileSpreadsheet,
        children: [
          { name: 'Períodos', href: '/dre', icon: FileSpreadsheet },
          { name: 'Relatórios', href: '/dre/reports', icon: BarChart3 },
        ],
      },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { name: 'Equipe', href: '/colaboradores', icon: UsersRound },
      {
        name: 'Documentos',
        href: '/documentos',
        icon: FileArchive,
        children: [
          { name: 'Empresa', href: '/documentos', icon: Building2 },
          { name: 'Colaboradores', href: '/documentos/colaboradores', icon: UserCheck },
        ],
      },
      { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
      { name: 'Configurações', href: '/configuracoes', icon: Settings },
    ],
  },
];

function NavSection({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href ||
    (item.href !== '/' && pathname.startsWith(item.href));
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some(
    (c) => pathname === c.href || pathname.startsWith(c.href)
  );
  const [isOpen, setIsOpen] = useState(isActive || isChildActive);

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.name}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isChildActive
            ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-400'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
        )}
      >
        <span className="flex items-center gap-3">
          <item.icon className="h-5 w-5" />
          {item.name}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
          {item.children!.map((child) => {
            const childActive =
              pathname === child.href ||
              (child.href !== item.href && pathname.startsWith(child.href));
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  childActive
                    ? 'font-medium text-accent-700 dark:text-accent-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                )}
              >
                <child.icon className="h-4 w-4" />
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950 transition-transform duration-200 lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold text-white">
            A
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {APP_NAME}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group, idx) => (
          <div key={group.label} className={cn(idx > 0 && 'mt-4')}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavSection key={item.name} item={item} onNavigate={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
