-- Hotfix: reset IDENTITY sequence yang tertinggal setelah seed dengan id eksplisit
-- Jalankan 1x di Supabase SQL Editor untuk hentikan error duplicate pkey saat tambah kategori/sub/paket/addon
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('sub_categories', 'id'), COALESCE((SELECT MAX(id) FROM sub_categories), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('packages', 'id'), COALESCE((SELECT MAX(id) FROM packages), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('addons', 'id'), COALESCE((SELECT MAX(id) FROM addons), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('clients', 'id'), COALESCE((SELECT MAX(id) FROM clients), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('bookings', 'id'), COALESCE((SELECT MAX(id) FROM bookings), 0) + 1, false);
