-- ============================================
-- MIGRATION 010: Stock Locations - Address + Sort Order
-- ============================================

ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.stock_locations ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
