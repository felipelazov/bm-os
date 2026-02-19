'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  X,
  Pencil,
  Search,
  UserX,
  UserCheck,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import {
  getCollaborators,
  updateCollaborator,
  deleteCollaborator,
} from '@/services/collaborators/collaborators.service';
import type {
  Collaborator,
  AccessLevel,
  Department,
} from '@/types/collaborators.types';
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
  ROLE_LABELS,
} from '@/types/collaborators.types';

const DEPARTMENTS: Department[] = [
  'diretoria',
  'logistica',
  'administrativo',
  'financeiro',
  'comercial',
  'producao',
];

const ACCESS_LEVELS: AccessLevel[] = ['admin', 'editor', 'viewer'];

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AccessLevel>('editor');
  const [inviteDepartment, setInviteDepartment] = useState<Department | ''>('');
  const [inviteJobTitle, setInviteJobTitle] = useState('');

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    data: Collaborator | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AccessLevel>('editor');
  const [editDepartment, setEditDepartment] = useState<Department | ''>('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCollaborators();
      setCollaborators(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('editor');
    setInviteDepartment('');
    setInviteJobTitle('');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviting(true);
      setError('');

      const res = await fetch('/api/collaborators/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole,
          department: inviteDepartment || null,
          job_title: inviteJobTitle || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao convidar colaborador');
      }

      toast.success('Colaborador convidado com sucesso');
      setShowInviteForm(false);
      resetInviteForm();
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar colaborador');
    } finally {
      setInviting(false);
    }
  };

  const handleEdit = (c: Collaborator) => {
    setEditingId(c.id);
    setEditRole(c.role === 'owner' ? 'admin' : (c.role as AccessLevel));
    setEditDepartment(c.department || '');
    setEditJobTitle(c.job_title || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setSaving(true);
      setError('');
      await updateCollaborator(id, {
        role: editRole,
        department: editDepartment || null,
        job_title: editJobTitle || null,
      });
      toast.success('Colaborador atualizado com sucesso');
      setEditingId(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar colaborador');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Collaborator) => {
    try {
      setError('');
      await updateCollaborator(c.id, { is_active: !c.is_active });
      toast.success(c.is_active ? 'Colaborador desativado' : 'Colaborador ativado');
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    }
  };

  const handleDelete = (c: Collaborator) => {
    setConfirmState({ open: true, data: c, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      setError('');
      await deleteCollaborator(confirmState.data.id);
      toast.success('Colaborador excluído com sucesso');
      setConfirmState({ open: false, data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir colaborador');
      setConfirmState(prev => ({ ...prev, loading: false }));
    }
  };

  const filtered = collaborators.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  if (loading && collaborators.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Equipe</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie os colaboradores e seus níveis de acesso
          </p>
        </div>
        <button
          onClick={() => {
            resetInviteForm();
            setShowInviteForm(!showInviteForm);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Colaborador
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <form
          onSubmit={handleInvite}
          className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Convidar Colaborador
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false);
                resetInviteForm();
              }}
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome completo *
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nível de Acesso *
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AccessLevel)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                {ACCESS_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level === 'admin'
                      ? 'Administrador'
                      : level === 'editor'
                        ? 'Editor'
                        : 'Viewer'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Departamento
              </label>
              <select
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value as Department | '')}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">Selecionar...</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {DEPARTMENT_LABELS[dept]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cargo
              </label>
              <input
                type="text"
                value={inviteJobTitle}
                onChange={(e) => setInviteJobTitle(e.target.value)}
                placeholder="Ex: Gerente de Vendas"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false);
                resetInviteForm();
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? 'Convidando...' : 'Convidar'}
            </button>
          </div>
        </form>
      )}

      {/* Collaborators Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={collaborators.length === 0 ? 'Nenhum colaborador cadastrado' : 'Nenhum colaborador encontrado'}
          description={collaborators.length === 0 ? 'Convide seu primeiro colaborador para a equipe' : 'Tente ajustar os filtros de busca'}
          actionLabel={collaborators.length === 0 ? 'Novo Colaborador' : undefined}
          onAction={collaborators.length === 0 ? () => { resetInviteForm(); setShowInviteForm(true); } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Colaborador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Departamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Cargo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Acesso
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((collab) => {
                const isEditing = editingId === collab.id;
                const isOwner = collab.role === 'owner';

                return (
                  <tr
                    key={collab.id}
                    className={cn(
                      'transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
                      !collab.is_active && 'opacity-50'
                    )}
                  >
                    {/* Avatar + Name + Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {collab.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {collab.full_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {collab.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editDepartment}
                          onChange={(e) =>
                            setEditDepartment(e.target.value as Department | '')
                          }
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <option value="">Nenhum</option>
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {DEPARTMENT_LABELS[dept]}
                            </option>
                          ))}
                        </select>
                      ) : collab.department ? (
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            DEPARTMENT_COLORS[collab.department]
                          )}
                        >
                          {DEPARTMENT_LABELS[collab.department]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Job Title */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editJobTitle}
                          onChange={(e) => setEditJobTitle(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          placeholder="Cargo"
                        />
                      ) : (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {collab.job_title || '—'}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          collab.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        )}
                      >
                        {collab.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Access Level */}
                    <td className="px-4 py-3">
                      {isEditing && !isOwner ? (
                        <select
                          value={editRole}
                          onChange={(e) =>
                            setEditRole(e.target.value as AccessLevel)
                          }
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          {ACCESS_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level === 'admin'
                                ? 'Administrador'
                                : level === 'editor'
                                  ? 'Editor'
                                  : 'Viewer'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {ROLE_LABELS[collab.role]}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSaveEdit(collab.id)}
                            disabled={saving}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                          >
                            {saving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {!isOwner && (
                            <>
                              <button
                                onClick={() => handleEdit(collab)}
                                title="Editar"
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(collab)}
                                title={collab.is_active ? 'Desativar' : 'Ativar'}
                                className={cn(
                                  'rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                                  collab.is_active
                                    ? 'hover:text-red-600'
                                    : 'hover:text-green-600'
                                )}
                              >
                                {collab.is_active ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(collab)}
                                title="Excluir"
                                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={confirmState.loading}
        title="Excluir colaborador"
        message={`Tem certeza que deseja excluir o colaborador "${confirmState.data?.full_name ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
