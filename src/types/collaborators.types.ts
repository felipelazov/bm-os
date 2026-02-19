import type { UserRole } from './auth.types';

export type AccessLevel = 'admin' | 'editor' | 'viewer';

export type Department =
  | 'diretoria'
  | 'logistica'
  | 'administrativo'
  | 'financeiro'
  | 'comercial'
  | 'producao';

export interface Collaborator {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  role: UserRole;
  avatar_url: string | null;
  department: Department | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InviteCollaboratorData {
  email: string;
  full_name: string;
  role: AccessLevel;
  department: Department | null;
  job_title: string | null;
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  diretoria: 'Diretoria',
  logistica: 'Logística',
  administrativo: 'Administrativo',
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  producao: 'Produção',
};

export const DEPARTMENT_COLORS: Record<Department, string> = {
  diretoria: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  logistica: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  administrativo: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  financeiro: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  comercial: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  producao: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Viewer',
};
