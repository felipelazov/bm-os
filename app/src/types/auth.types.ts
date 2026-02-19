export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}

export interface SignInData {
  email: string;
  password: string;
}
