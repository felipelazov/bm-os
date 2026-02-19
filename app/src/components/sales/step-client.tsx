'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClients, createClientRecord } from '@/services/clients/clients.service';
import type { Client, ClientType } from '@/types/clients.types';

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  varejo: 'Varejo',
  mensalista: 'Mensalista',
  doacao: 'Doação',
};

const CLIENT_TYPE_COLORS: Record<ClientType, string> = {
  varejo: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  mensalista: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  doacao: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

interface StepClientProps {
  selectedClient: Client | null;
  onSelect: (client: Client) => void;
}

export function StepClient({ selectedClient, onSelect }: StepClientProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New client form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCpfCnpj, setNewCpfCnpj] = useState('');
  const [newType, setNewType] = useState<ClientType>('varejo');

  useEffect(() => {
    async function load() {
      try {
        const data = await getClients(true);
        setClients(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.cpf_cnpj && c.cpf_cnpj.includes(q))
    );
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const created = await createClientRecord({
        name: newName,
        phone: newPhone || null,
        cpf_cnpj: newCpfCnpj || null,
        client_type: newType,
        whatsapp: null,
        email: null,
        cep: null,
        address: null,
        address_number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        notes: null,
      });
      setClients((prev) => [created, ...prev]);
      onSelect(created);
      setShowNewForm(false);
      setNewName('');
      setNewPhone('');
      setNewCpfCnpj('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nome, Telefone ou CNPJ..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-3 py-2.5 text-sm dark:text-gray-200"
        />
      </div>

      {/* New Client Button */}
      <button
        onClick={() => setShowNewForm(!showNewForm)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
      >
        <Plus className="h-4 w-4" />
        CADASTRAR NOVO CLIENTE
      </button>

      {/* Inline New Client Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreateClient}
          className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CPF/CNPJ</label>
              <input
                type="text"
                value={newCpfCnpj}
                onChange={(e) => setNewCpfCnpj(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ClientType)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              >
                <option value="varejo">Varejo</option>
                <option value="mensalista">Mensalista</option>
                <option value="doacao">Doação</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !newName}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Criar e Selecionar'}
            </button>
          </div>
        </form>
      )}

      {/* Client List */}
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum cliente encontrado
          </p>
        ) : (
          filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selectedClient?.id === client.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {client.name}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium shrink-0', CLIENT_TYPE_COLORS[client.client_type])}>
                    {CLIENT_TYPE_LABELS[client.client_type]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {client.cpf_cnpj && <span>{client.cpf_cnpj}</span>}
                  {client.phone && <span>{client.phone}</span>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
