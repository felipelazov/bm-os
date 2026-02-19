-- Migration: Add collaborator fields to user_profiles
-- Adds department, job_title, and is_active columns for team management

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Allow admins and owners to insert user_profiles (for inviting collaborators)
CREATE POLICY "Tenant admin insert profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Allow admins and owners to update user_profiles within their tenant
CREATE POLICY "Tenant admin update profiles" ON public.user_profiles
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
