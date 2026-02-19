'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Phone,
  Loader2,
  FileText,
  X,
  Search,
  FileArchive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import {
  uploadDocument,
  getDocuments,
  getSignedUrl,
  deleteDocument,
} from '@/services/documents/document.service';
import type { Document } from '@/types/document.types';
import { DOCUMENT_NATURES, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from '@/types/document.types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterNature, setFilterNature] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNature, setUploadNature] = useState('');
  const [customNature, setCustomNature] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp state
  const [whatsappDoc, setWhatsappDoc] = useState<Document | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    data: string | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDocuments(filterNature ? { nature: filterNature } : undefined);
      setDocuments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  }, [filterNature]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const nature = uploadNature === 'Outros' ? customNature : uploadNature;
    if (!nature.trim()) {
      setError('Informe a natureza do documento');
      return;
    }

    try {
      setUploading(true);
      setError('');
      await uploadDocument(uploadFile, nature.trim());
      toast.success('Documento enviado com sucesso');
      setShowUpload(false);
      setUploadFile(null);
      setUploadNature('');
      setCustomNature('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const url = await getSignedUrl(doc.storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar arquivo');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({ open: true, data: id, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      setDeleting(confirmState.data);
      await deleteDocument(confirmState.data);
      toast.success('Documento excluído com sucesso');
      setConfirmState({ open: false, data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir documento');
      setConfirmState(prev => ({ ...prev, loading: false }));
    } finally {
      setDeleting(null);
    }
  };

  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappDoc) return;

    const phone = whatsappPhone.replace(/\D/g, '');
    if (phone.length < 10) {
      setError('Informe um número de telefone válido');
      return;
    }

    try {
      setSendingWhatsapp(true);
      setError('');
      const res = await fetch('/api/whatsapp/send-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: whatsappDoc.id,
          phoneNumber: phone,
          message: whatsappMessage || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao enviar');

      toast.success('Documento enviado via WhatsApp com sucesso');
      setWhatsappDoc(null);
      setWhatsappPhone('');
      setWhatsappMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar via WhatsApp');
    } finally {
      setSendingWhatsapp(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError('Arquivo excede o limite de 10MB');
      return;
    }
    if (!ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
      setError('Tipo de arquivo não permitido. Use PDF, JPG ou PNG');
      return;
    }
    setUploadFile(file);
    setError('');
  };

  if (loading && documents.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documentos</h1>
          <p className="text-gray-500 dark:text-gray-400">Organize seus documentos empresariais</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload de Documento</h3>
            <button type="button" onClick={() => setShowUpload(false)}>
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          {/* Drag & Drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
              dragOver
                ? 'border-blue-400 bg-blue-100 dark:border-blue-500 dark:bg-blue-950'
                : 'border-gray-300 bg-white hover:border-blue-300 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-blue-400'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            {uploadFile ? (
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{uploadFile.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({formatFileSize(uploadFile.size)})</span>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">PDF, JPG ou PNG (max 10MB)</p>
              </>
            )}
          </div>

          {/* Natureza */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Natureza</label>
            <select
              value={uploadNature}
              onChange={(e) => setUploadNature(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              required
            >
              <option value="">Selecione...</option>
              {DOCUMENT_NATURES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {uploadNature === 'Outros' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Natureza personalizada
              </label>
              <input
                type="text"
                value={customNature}
                onChange={(e) => setCustomNature(e.target.value)}
                placeholder="Ex: Alvarás"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Search className="h-4 w-4 text-gray-400" />
        <button
          onClick={() => setFilterNature('')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !filterNature
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          Todas
        </button>
        {DOCUMENT_NATURES.filter((n) => n !== 'Outros').map((nature) => (
          <button
            key={nature}
            onClick={() => setFilterNature(nature)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filterNature === nature
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            {nature}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome do documento..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-3 py-2 text-sm dark:text-gray-200"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Natureza</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Tamanho</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Data</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filteredDocs = documents.filter((doc) => {
                if (!searchTerm) return true;
                return doc.name.toLowerCase().includes(searchTerm.toLowerCase());
              });
              return filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={FileArchive}
                    title="Nenhum documento encontrado"
                    description="Faça o upload do seu primeiro documento"
                    actionLabel="Upload"
                    onAction={() => setShowUpload(true)}
                    className="border-0 rounded-none"
                  />
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {doc.nature}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-600 dark:text-gray-400">
                    {formatFileSize(doc.size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Download"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setWhatsappDoc(doc)}
                        title="Enviar via WhatsApp"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600"
                      >
                        <Phone className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Excluir"
                        disabled={deleting === doc.id}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 disabled:opacity-50"
                      >
                        {deleting === doc.id ? (
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

      {/* WhatsApp Modal */}
      {whatsappDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form
            onSubmit={handleSendWhatsapp}
            className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enviar via WhatsApp</h3>
              <button type="button" onClick={() => setWhatsappDoc(null)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Documento:</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{whatsappDoc.name}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Número de telefone
              </label>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mensagem (opcional)
              </label>
              <input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Segue o documento..."
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWhatsappDoc(null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sendingWhatsapp}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sendingWhatsapp ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
