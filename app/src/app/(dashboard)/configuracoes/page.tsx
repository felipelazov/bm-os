'use client';

import Link from 'next/link';
import { Users, FileSpreadsheet, Settings } from 'lucide-react';

const sections = [
  {
    name: 'Usuários',
    href: '/colaboradores',
    description: 'Gerenciar acessos e permissões',
    icon: Users,
  },
  {
    name: 'Categorias DRE',
    href: '/dre/settings',
    description: 'Gerenciar categorias e parâmetros do DRE',
    icon: FileSpreadsheet,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie as configurações do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.name}
            href={section.href}
            className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-colors hover:border-accent-300 dark:hover:border-accent-600 hover:shadow-sm"
          >
            <div className="rounded-lg bg-gray-100 dark:bg-gray-700 p-2">
              <section.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{section.name}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{section.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
