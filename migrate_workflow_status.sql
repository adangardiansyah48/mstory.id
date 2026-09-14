-- ==========================================
-- MIGRATION: Project Progress → Workflow Status
-- Jalankan di Supabase SQL Editor satPersAxis.
-- Mengubah kolom retouch/printing menjadi satu workflow: SHOOTING → EDIT → PRINTING → READY → DELIVERED.
-- ==========================================

-- 1. Buat enum baru
DO $$ BEGIN
  CREATE TYPE workflow_status_type AS ENUM ('SHOOTING', 'EDIT', 'PRINTING', 'READY', 'DELIVERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tambah kolom baru (sementara), nilai default dari status lama
ALTER TABLE project_progress
  ADD COLUMN IF NOT EXISTS progress_status workflow_status_type DEFAULT 'SHOOTING',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS drive_link TEXT,
  ADD COLUMN IF NOT EXISTS expected_date DATE;

-- 3. Salin data lama → baru (jika ada)
UPDATE project_progress SET
  progress_status = CASE
    WHEN printing_status = 'DELIVERED' THEN 'DELIVERED'
    WHEN printing_status IN ('IN_PRINTING', 'READY_FOR_PICKUP') THEN 'PRINTING'
    WHEN retouch_status = 'DONE' THEN 'EDIT'
    WHEN retouch_status = 'IN_PROGRESS' THEN 'SHOOTING'
    ELSE 'SHOOTING'
  END,
  notes = NULLIF(CONCAT_WS(' | ', NULLIF(notes, ''), NULLIF(printing_deadline::text, '')), ''),
  drive_link = retouch_drive_link,
  expected_date = COALESCE(printing_deadline, retouch_deadline)
WHERE progress_status IS NULL OR expected_date IS NULL;

-- 4. Hapus kolom lama
ALTER TABLE project_progress
  DROP COLUMN IF EXISTS retouch_deadline,
  DROP COLUMN IF EXISTS retouch_status,
  DROP COLUMN IF EXISTS retouch_drive_link,
  DROP COLUMN IF EXISTS printing_deadline,
  DROP COLUMN IF EXISTS printing_status;

-- 5. Opsional: hapus enum lama jika tidak terpakai lagi
DROP TYPE IF EXISTS retouch_status_type CASCADE;
DROP TYPE IF EXISTS printing_status_type CASCADE;