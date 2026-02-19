// ============================================
// Documentos Empresariais
// ============================================

export const DOCUMENT_NATURES = [
  'CNPJ',
  'Contratos',
  'Doc Pessoais',
  'Contábeis',
  'Bancários',
  'Outros',
] as const;

export type DocumentNature = (typeof DOCUMENT_NATURES)[number];

export interface Document {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  nature: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
