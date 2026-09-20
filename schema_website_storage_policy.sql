-- Jalankan ini di Supabase SQL Editor jika belum ada policy untuk bucket 'website':

INSERT INTO storage.buckets (id, name, public)
VALUES ('website', 'website', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "website_public_read" ON storage.objects;
CREATE POLICY "website_public_read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'website');

DROP POLICY IF EXISTS "website_authenticated_insert" ON storage.objects;
CREATE POLICY "website_authenticated_insert"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'website');

DROP POLICY IF EXISTS "website_authenticated_update" ON storage.objects;
CREATE POLICY "website_authenticated_update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'website') WITH CHECK (bucket_id = 'website');

DROP POLICY IF EXISTS "website_authenticated_delete" ON storage.objects;
CREATE POLICY "website_authenticated_delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'website');
