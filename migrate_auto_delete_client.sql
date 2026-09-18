-- ==========================================
-- Fix: hapus client otomatis saat booking terakhir dihapus
-- Trigger: setelah DELETE pada bookings, hapus client yang
-- sudah tidak memiliki booking sama sekali (orphan).
-- Aman: client dengan booking lain TIDAK dihapus.
-- Jalankan di Supabase SQL Editor (atau via migrasi otomatis)
-- ==========================================
CREATE OR REPLACE FUNCTION public.delete_orphan_clients_after_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.clients c
  WHERE c.id = OLD.client_id
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b WHERE b.client_id = c.id
    );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_orphan_clients ON public.bookings;
CREATE TRIGGER trg_delete_orphan_clients
AFTER DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.delete_orphan_clients_after_booking();