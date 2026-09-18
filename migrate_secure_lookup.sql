-- ==========================================
-- Hardening: atomic invoice + secure lookup RPC
-- Jalankan di Supabase SQL Editor (single batch)
-- Aman: tidak drop policy existing, hanya tambah RPC + sequence
-- ==========================================

-- 1. Sequence per bulan untuk invoice atomic (tanpa race)
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  ym TEXT PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0
);

-- 2. Fungsi atomic generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ym TEXT := to_char(now(), 'MMyyyy');
  dd TEXT := to_char(now(), 'DD');
  mmyy TEXT := to_char(now(), 'MMyyyy');
  seq INT;
  yyyy TEXT := to_char(now(), 'YYYY');
BEGIN
  INSERT INTO public.invoice_counters(ym, last_seq) VALUES (ym, 1)
  ON CONFLICT (ym) DO UPDATE SET last_seq = public.invoice_counters.last_seq + 1
  RETURNING last_seq INTO seq;
  RETURN 'INV-' || dd || mmyy || '-' || lpad(seq::text, 4, '0');
END; $$;

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO anon, authenticated;

-- 3. Secure lookup booking by invoice OR whatsapp (tanpa expose full table)
CREATE OR REPLACE FUNCTION public.lookup_bookings(p_query TEXT)
RETURNS SETOF json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q TEXT := upper(trim(p_query));
  norm TEXT;
  alt TEXT;
  cid BIGINT[];
BEGIN
  IF q = '' THEN RETURN; END IF;

  -- Coba invoice exact dulu
  RETURN QUERY
  SELECT to_json(b) FROM (
    SELECT bookings.*,
      (SELECT to_json(c) FROM public.clients c WHERE c.id = bookings.client_id) AS client,
      (SELECT json_agg(to_json(d)) FROM (
        SELECT booking_details.*,
          (SELECT to_json(p) FROM public.packages p WHERE p.id = booking_details.package_id) AS packages
        FROM public.booking_details WHERE booking_details.booking_id = bookings.id
      ) d) AS details,
      (SELECT json_agg(to_json(a)) FROM (
        SELECT booking_addons.*,
          (SELECT to_json(ad) FROM public.addons ad WHERE ad.id = booking_addons.addon_id) AS add_ons
        FROM public.booking_addons WHERE booking_addons.booking_id = bookings.id
      ) a) AS addons,
      (SELECT json_agg(to_json(pp)) FROM public.project_progress pp WHERE pp.booking_id = bookings.id) AS project_progress
    FROM public.bookings WHERE upper(invoice_number) = q
    ORDER BY created_at DESC LIMIT 5
  ) b;
  IF FOUND THEN RETURN; END IF;

  -- Fallback: whatsapp normalize (62xxx)
  norm := regexp_replace(p_query, '[^0-9]', '', 'g');
  IF norm LIKE '0%' THEN norm := '62' || substring(norm from 2); END IF;
  IF norm LIKE '8%' THEN norm := '62' || norm; END IF;
  IF length(norm) < 8 THEN RETURN; END IF;

  SELECT array_agg(id) INTO cid FROM public.clients WHERE whatsapp_number = norm;
  IF cid IS NULL OR array_length(cid,1) IS NULL THEN
    alt := CASE WHEN norm LIKE '62%' THEN '0' || substring(norm from 3) ELSE norm END;
    SELECT array_agg(id) INTO cid FROM public.clients WHERE whatsapp_number = alt;
  END IF;
  IF cid IS NULL OR array_length(cid,1) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT to_json(b) FROM (
    SELECT bookings.*,
      (SELECT to_json(c) FROM public.clients c WHERE c.id = bookings.client_id) AS client,
      (SELECT json_agg(to_json(d)) FROM (
        SELECT booking_details.*,
          (SELECT to_json(p) FROM public.packages p WHERE p.id = booking_details.package_id) AS packages
        FROM public.booking_details WHERE booking_details.booking_id = bookings.id
      ) d) AS details,
      (SELECT json_agg(to_json(a)) FROM (
        SELECT booking_addons.*,
          (SELECT to_json(ad) FROM public.addons ad WHERE ad.id = booking_addons.addon_id) AS add_ons
        FROM public.booking_addons WHERE booking_addons.booking_id = bookings.id
      ) a) AS addons,
      (SELECT json_agg(to_json(pp)) FROM public.project_progress pp WHERE pp.booking_id = bookings.id) AS project_progress
    FROM public.bookings WHERE client_id = ANY(cid)
    ORDER BY created_at DESC LIMIT 5
  ) b;
END; $$;

GRANT EXECUTE ON FUNCTION public.lookup_bookings(TEXT) TO anon, authenticated;

-- 4. Backfill invoice_counters dari data existing (agar seq lanjut)
INSERT INTO public.invoice_counters(ym, last_seq)
SELECT to_char(date_trunc('month', created_at), 'MMyyyy'), COUNT(*)
FROM public.bookings WHERE invoice_number LIKE 'INV-%'
GROUP BY 1
ON CONFLICT (ym) DO UPDATE SET last_seq = GREATEST(public.invoice_counters.last_seq, EXCLUDED.last_seq);

-- NOTE: Tahap 2 (ketatkan RLS) — JANGAN jalankan sekarang.
-- Setelah frontend pakai RPC + monitoring 1-2 minggu, baru:
--   DROP POLICY IF EXISTS "bookings_public_read" ON public.bookings;
--   CREATE POLICY "bookings_no_anon_select" ON public.bookings FOR SELECT TO anon USING (false);
