'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, User, Moon, Sun, Menu, Command } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user } = useAuthStore();
  const { colorMode, toggleColorMode, setColorMode } = useTenantStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('color-mode') as 'light' | 'dark' | null;
    if (stored && stored !== colorMode) {
      setColorMode(stored);
    }
    setMounted(true);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-700 dark:bg-gray-950">
      <div className="flex items-center gap-3">
        {/* Menu button mobile */}
        <button
          onClick={onToggleSidebar}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search hint - opens Command Palette */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 sm:flex w-72 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="flex items-center gap-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleColorMode}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={colorMode === 'light' ? 'Modo escuro' : 'Modo claro'}
        >
          {!mounted ? (
            <div className="h-5 w-5" />
          ) : colorMode === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>

        <button
          className="relative rounded-lg p-2 text-gray-400 opacity-50 cursor-default"
          title="Notificações — Em breve"
          aria-label="Notificações — Em breve"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <User className="h-4 w-4 text-accent-600 dark:text-accent-400" />
            )}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {user?.full_name ?? 'Usuário'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">{user?.role ?? 'admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
