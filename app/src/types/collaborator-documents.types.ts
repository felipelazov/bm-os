export type CollaboratorDocType = 'recibo' | 'atestado';

export interface CollaboratorDocument {
  id: string;
  tenant_id: string;
  collaborator_id: string;
  created_by: string;
  doc_type: CollaboratorDocType;
  description: string;
  reference: string | null;
  amount: number | null;
  payment_method: string | null;
  storage_path: string | null;
  mime_type: string | null;
  registry_code: string;
  doc_date: string;
  created_at: string;
  // join field
  collaborator_name?: string;
  collaborator_department?: string | null;
  collaborator_job_title?: string | null;
}

export interface CreateReceiptData {
  collaborator_id: string;
  description: string;
  reference: string;
  amount: number;
  payment_method: string;
  doc_date: string;
}

export interface CreateCertificateData {
  collaborator_id: string;
  description: string;
  doc_date: string;
}

export const DOC_TYPE_LABELS: Record<CollaboratorDocType, string> = {
  recibo: 'Recibo',
  atestado: 'Atestado',
};

export const DOC_TYPE_COLORS: Record<CollaboratorDocType, string> = {
  recibo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  atestado: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
};

export const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Transferência Bancária', 'Cheque'] as const;

export const ACCEPTED_CERTIFICATE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10MB
