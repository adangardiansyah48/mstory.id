-- ==========================================
-- Migration: Tambah kolom source & vendor_name di bookings
-- Untuk bedakan booking vendor vs pelanggan umum
-- Jalankan di Supabase SQL Editor
-- ==========================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'CLIENT';
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS vendor_name TEXT DEFAULT NULL;
