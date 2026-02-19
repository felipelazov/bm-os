'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  X,
  MessageCircle,
  Send,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getClients,
  createClientRecord,
  updateClient,
  deleteClient,
} from '@/services/clients/clients.service';
import { fetchAddressByCep } from '@/lib/cep';
import { ClientMessageModal } from '@/components/clients/client-message-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { MaskedInput } from '@/components/ui/masked-input';
import { Button } from '@/components/ui/button';
import { useSort } from '@/hooks/use-sort';
import { usePagination } from '@/hooks/use-pagination';
import { Users as UsersIcon } from 'lucide-react';
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

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<ClientType | 'todos'>('todos');

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    type: string;
    data: Client | null;
    loading: boolean;
  }>({ open: false, type: '', data: null, loading: false });

  // Message modal
  const [messageClients, setMessageClients] = useState<Client[] | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCpfCnpj, setFormCpfCnpj] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formType, setFormType] = useState<ClientType>('varejo');
  const [formCep, setFormCep] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formComplement, setFormComplement] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getClients(false);
      setClients(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormName('');
    setFormCpfCnpj('');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormType('varejo');
    setFormCep('');
    setFormAddress('');
    setFormNumber('');
    setFormComplement('');
    setFormNeighborhood('');
    setFormCity('');
    setFormState('');
    setFormNotes('');
    setEditingId(null);
  };

  const handleEdit = (c: Client) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormCpfCnpj(c.cpf_cnpj || '');
    setFormPhone(c.phone || '');
    setFormWhatsapp(c.whatsapp || '');
    setFormEmail(c.email || '');
    setFormType(c.client_type);
    setFormCep(c.cep || '');
    setFormAddress(c.address || '');
    setFormNumber(c.address_number || '');
    setFormComplement(c.complement || '');
    setFormNeighborhood(c.neighborhood || '');
    setFormCity(c.city || '');
    setFormState(c.state || '');
    setFormNotes(c.notes || '');
    setShowForm(true);
  };

  const handleCepBlur = async () => {
    const digits = formCep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    try {
      setCepLoading(true);
      const result = await fetchAddressByCep(digits);
      if (result) {
        setFormAddress(result.logradouro);
        setFormNeighborhood(result.bairro);
        setFormCity(result.localidade);
        setFormState(result.uf);
      }
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName,
        cpf_cnpj: formCpfCnpj || null,
        phone: formPhone || null,
        whatsapp: formWhatsapp || null,
        email: formEmail || null,
        client_type: formType,
        cep: formCep || null,
        address: formAddress || null,
        address_number: formNumber || null,
        complement: formComplement || null,
        neighborhood: formNeighborhood || null,
        city: formCity || null,
        state: formState || null,
        notes: formNotes || null,
      };

      if (editingId) {
        await updateClient(editingId, payload);
        toast.success('Cliente atualizado com sucesso');
      } else {
        await createClientRecord(payload);
        toast.success('Cliente criado com sucesso');
      }

      setShowForm(false);
      resetForm();
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (client: Client) => {
    setConfirmState({ open: true, type: 'delete', data: client, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      await deleteClient(confirmState.data.id);
      toast.success('Cliente excluído com sucesso');
      setConfirmState({ open: false, type: '', data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir cliente');
      setConfirmState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendMessage = (client: Client) => {
    if (!client.whatsapp) {
      toast.error('Este cliente não possui WhatsApp cadastrado');
      return;
    }
    setMessageClients([client]);
  };

  const filteredClients = filterType === 'todos'
    ? clients
    : clients.filter((c) => c.client_type === filterType);

  const filteredWithWhatsapp = filteredClients.filter((c) => c.whatsapp && c.is_active);

  const { sorted: sortedClients, sort, toggleSort } = useSort<Client>(filteredClients, { key: 'name', direction: 'asc' });
  const { items: paginatedClients, currentPage, totalPages, totalItems, pageSize, goToPage } = usePagination<Client>(sortedClients);

  const handleSendAll = () => {
    if (filteredWithWhatsapp.length === 0) {
      setError('Nenhum cliente ativo com WhatsApp na lista filtrada');
      return;
    }
    setMessageClients(filteredWithWhatsapp);
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie seus clientes e envie mensagens via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendAll}
            disabled={filteredWithWhatsapp.length === 0}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Enviar para Todos ({filteredWithWhatsapp.length})
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {(['todos', 'varejo', 'mensalista', 'doacao'] as const).map((type) => {
          const count = type === 'todos'
            ? clients.length
            : clients.filter((c) => c.client_type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filterType === type
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {type === 'todos' ? 'Todos' : CLIENT_TYPE_LABELS[type]}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                filterType === type
                  ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} aria-label="Fechar formulário">
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
          <div className="space-y-4">
            {/* Dados Básicos — sempre aberto */}
            <CollapsibleSection title="Dados Básicos" defaultOpen>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CPF/CNPJ</label>
                  <MaskedInput
                    mask="cpf-cnpj"
                    value={formCpfCnpj}
                    onValueChange={(raw) => setFormCpfCnpj(raw)}
                    placeholder="000.000.000-00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as ClientType)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  >
                    <option value="varejo">Varejo</option>
                    <option value="mensalista">Mensalista</option>
                    <option value="doacao">Doação</option>
                  </select>
                </div>
              </div>
            </CollapsibleSection>

            {/* Contato — aberto por default */}
            <CollapsibleSection title="Contato" defaultOpen>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                  <MaskedInput
                    mask="phone"
                    value={formPhone}
                    onValueChange={(raw) => setFormPhone(raw)}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
                  <MaskedInput
                    mask="phone"
                    value={formWhatsapp}
                    onValueChange={(raw) => setFormWhatsapp(raw)}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Endereço — colapsado */}
            <CollapsibleSection title="Endereço">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    CEP {cepLoading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
                  </label>
                  <div className="relative">
                    <MaskedInput
                      mask="cep"
                      value={formCep}
                      onValueChange={(raw) => setFormCep(raw)}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      className="mt-1"
                    />
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Endereço</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Complemento</label>
                  <input
                    type="text"
                    value={formComplement}
                    onChange={(e) => setFormComplement(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bairro</label>
                  <input
                    type="text"
                    value={formNeighborhood}
                    onChange={(e) => setFormNeighborhood(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cidade</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                  <input
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    maxLength={2}
                    placeholder="SP"
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Observações — colapsado */}
            <CollapsibleSection title="Observações">
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </CollapsibleSection>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      )}

      {/* Sort Controls */}
      {filteredClients.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Ordenar por:</span>
          {[
            { key: 'name', label: 'Nome' },
            { key: 'client_type', label: 'Tipo' },
            { key: 'city', label: 'Cidade' },
          ].map((col) => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                sort?.key === col.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {col.label}
              {sort?.key === col.key && (sort.direction === 'asc' ? ' \u2191' : ' \u2193')}
            </button>
          ))}
        </div>
      )}

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado para este filtro'}
          description={clients.length === 0 ? 'Adicione seu primeiro cliente para começar' : undefined}
          actionLabel={clients.length === 0 ? 'Novo Cliente' : undefined}
          onAction={clients.length === 0 ? () => { resetForm(); setShowForm(true); } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {paginatedClients.map((client) => (
            <div
              key={client.id}
              className={cn(
                'rounded-xl border bg-white dark:bg-gray-800',
                client.is_active
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-100 dark:border-gray-800 opacity-60'
              )}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{client.name}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CLIENT_TYPE_COLORS[client.client_type])}>
                        {CLIENT_TYPE_LABELS[client.client_type]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {client.cpf_cnpj && <span>{client.cpf_cnpj}</span>}
                      {client.phone && <span>{client.phone}</span>}
                      {client.city && client.state && <span>{client.city}/{client.state}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSendMessage(client)}
                    title="Enviar WhatsApp"
                    disabled={!client.whatsapp}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 disabled:opacity-30"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(client)}
                    title="Editar"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    title="Excluir"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={goToPage}
          />
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, type: '', data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={confirmState.loading}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir "${confirmState.data?.name}"?`}
        confirmLabel="Excluir"
      />

      {/* Message Modal */}
      {messageClients && (
        <ClientMessageModal
          clients={messageClients}
          onClose={() => setMessageClients(null)}
          onSent={() => {
            toast.success('Mensagens enviadas via WhatsApp!');
          }}
        />
      )}
    </div>
  );
}
