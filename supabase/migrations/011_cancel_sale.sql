-- ============================================
-- 011: Cancelamento de Vendas
-- ============================================

-- Adicionar 'cancelada' ao CHECK do status
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check
  CHECK (status IN ('em_aberto', 'finalizada', 'cancelada'));

-- Coluna para rastrear quando foi cancelada
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
