-- ==========================================
-- Migration: Kolom vendor_fee di linktree_settings
-- Fee vendor (Rp) — dipotong dari total invoice vendor
-- Jalankan di Supabase SQL Editor
-- ==========================================
ALTER TABLE public.linktree_settings
  ADD COLUMN IF NOT EXISTS vendor_fee INTEGER DEFAULT 200000;