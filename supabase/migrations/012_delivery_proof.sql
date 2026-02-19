-- 012_delivery_proof.sql
-- Adiciona campos para armazenar URLs de assinatura e foto de prova de entrega

ALTER TABLE public.deliveries
  ADD COLUMN signature_url TEXT,
  ADD COLUMN photo_url TEXT;
