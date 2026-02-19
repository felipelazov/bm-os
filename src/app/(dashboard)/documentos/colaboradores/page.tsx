'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Receipt, FileUp, Loader2, Trash2, Eye, Printer, Copy, Check,
  Filter, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import {
  getCollaboratorDocuments,
  deleteCollaboratorDocument,
  getCertificateSignedUrl,
} from '@/services/collaborator-documents/collaborator-documents.service';
import { getCollaborators } from '@/services/collaborators/collaborators.service';
import { downloadReceiptPdf } from '@/services/collaborator-documents/receipt-pdf';
import { DOC_TYPE_LABELS, DOC_TYPE_COLORS } from '@/types/collaborator-documents.types';
import type { CollaboratorDocument, CollaboratorDocType } from '@/types/collaborator-documents.types';
import type { Collaborator } from '@/types/collaborators.types';
import { ReceiptModal } from '@/components/collaborator-documents/receipt-modal';
import { CertificateModal } from '@/components/collaborator-documents/certificate-modal';
import { ReceiptPreview } from '@/components/collaborator-documents/receipt-preview';

type FilterTab = 'todos' | 'recibo' | 'atestado';

export default function CollaboratorDocumentsPage() {
  const companyName = APP_NAME;
  const companyInitials = companyName.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

  const [documents, setDocuments] = useState<CollaboratorDocument[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterTab, setFilterTab] = useState<FilterTab>('todos');
  const [filterCollaborator, setFilterCollaborator] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CollaboratorDocument | null>(null);

  // Actions
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    data: string | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const filters: { doc_type?: string; collaborator_id?: string } = {};
      if (filterTab !== 'todos') filters.doc_type = filterTab;
      if (filterCollaborator) filters.collaborator_id = filterCollaborator;

      const [docs, collabs] = await Promise.all([
        getCollaboratorDocuments(filters),
        getCollaborators(),
      ]);
      setDocuments(docs);
      setCollaborators(collabs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [filterTab, filterCollaborator]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleDelete(id: string) {
    setConfirmState({ open: true, data: id, loading: false });
  }

  async function handleConfirmDelete() {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    setDeletingId(confirmState.data);
    try {
      await deleteCollaboratorDocument(confirmState.data);
      toast.success('Documento excluído com sucesso');
      setConfirmState({ open: false, data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
      setConfirmState(prev => ({ ...prev, loading: false }));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleView(doc: CollaboratorDocument) {
    if (doc.doc_type === 'recibo') {
      setPreviewDoc(doc);
    } else if (doc.storage_path) {
      try {
        const url = await getCertificateSignedUrl(doc.storage_path);
        window.open(url, '_blank');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao abrir documento');
      }
    }
  }

  function handlePrint(doc: CollaboratorDocument) {
    downloadReceiptPdf({ document: doc, companyName, companyInitials });
  }

  function handleCopy(doc: CollaboratorDocument) {
    navigator.clipboard.writeText(doc.registry_code);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleModalCreated() {
    toast.success('Documento criado com sucesso');
    setShowReceiptModal(false);
    setShowCertificateModal(false);
    fetchData();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'recibo', label: 'Recibos' },
    { key: 'atestado', label: 'Atestados' },
  ];

  if (loading && documents.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Central de Documentos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie recibos de pagamento e atestados dos colaboradores
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fechar</button>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setShowReceiptModal(true)}
          className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-900 dark:text-blue-400">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">GERAR RECIBO</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Pagamentos, bônus e reembolsos
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowCertificateModal(true)}
          className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-left transition-all hover:border-amber-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-600"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-900 dark:text-amber-400">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">ANEXAR ATESTADO</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Documentos médicos e licenças
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg',
                filterTab === tab.key
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Collaborator filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterCollaborator}
            onChange={(e) => setFilterCollaborator(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Todos os colaboradores</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, código ou colaborador..."
            className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 pl-10 pr-3 py-2 text-sm dark:text-gray-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Documento / Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Colaborador
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Valor / Ref.
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {(() => {
              const filteredDocs = documents.filter((doc) => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  (doc.description || '').toLowerCase().includes(term) ||
                  (doc.registry_code || '').toLowerCase().includes(term) ||
                  (doc.collaborator_name || '').toLowerCase().includes(term)
                );
              });
              return filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="Nenhum documento encontrado"
                    description="Gere um recibo ou anexe um atestado para começar"
                    className="border-0 rounded-none"
                  />
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  {/* Documento / Data */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {doc.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(doc.doc_date)} &bull; {doc.registry_code}
                    </div>
                  </td>
                  {/* Colaborador */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {doc.collaborator_name?.charAt(0) ?? '?'}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {doc.collaborator_name}
                      </span>
                    </div>
                  </td>
                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', DOC_TYPE_COLORS[doc.doc_type as CollaboratorDocType])}>
                      {DOC_TYPE_LABELS[doc.doc_type as CollaboratorDocType]}
                    </span>
                  </td>
                  {/* Valor / Ref */}
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {doc.amount != null ? (
                      <div>
                        <span className="font-medium">{formatCurrency(doc.amount)}</span>
                        {doc.reference && (
                          <div className="text-xs text-gray-500">{doc.reference}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleView(doc)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {doc.doc_type === 'recibo' && (
                        <button
                          onClick={() => handlePrint(doc)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          title="Baixar PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(doc)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        title="Copiar código"
                      >
                        {copiedId === doc.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
                        title="Excluir"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            );
            })()}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={confirmState.loading}
        title="Excluir documento"
        message="Tem certeza que deseja excluir este documento?"
        confirmLabel="Excluir"
      />

      {/* Modals */}
      {showReceiptModal && (
        <ReceiptModal onClose={() => setShowReceiptModal(false)} onCreated={handleModalCreated} />
      )}
      {showCertificateModal && (
        <CertificateModal onClose={() => setShowCertificateModal(false)} onCreated={handleModalCreated} />
      )}
      {previewDoc && (
        <ReceiptPreview document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
