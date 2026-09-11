-- ==========================================
-- Pengaturan Fanspage (Linktree Settings)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.linktree_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    banner_url TEXT,
    logo_url TEXT,
    subtitle TEXT DEFAULT 'Photography & Videography',
    tagline TEXT DEFAULT 'tell us your story journey',
    booking_label TEXT DEFAULT 'Booking Online',
    status_label TEXT DEFAULT 'Cek Status Edit & Cetak Foto',
    wa_label TEXT DEFAULT 'WhatsApp Admin',
    wa_number TEXT DEFAULT '6281234567890',
    website_url TEXT DEFAULT 'https://mstory.id',
    instagram_url TEXT DEFAULT 'https://instagram.com/mstory.id',
    tiktok_url TEXT DEFAULT 'https://tiktok.com/@mstory.id',
    facebook_url TEXT DEFAULT 'https://facebook.com/mstory.id',
    youtube_url TEXT DEFAULT 'https://youtube.com/@mstory.id',
    footer_text TEXT DEFAULT 'Photography & Videography',
    city_text TEXT DEFAULT 'Tasikmalaya',
    theme_fanpage TEXT DEFAULT 'CLASSIC',
    theme_admin TEXT DEFAULT 'CLASSIC',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

INSERT INTO public.linktree_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.linktree_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "linktree_settings_public_select" ON public.linktree_settings;
CREATE POLICY "linktree_settings_public_select"
    ON public.linktree_settings
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "linktree_settings_admin_all" ON public.linktree_settings;
CREATE POLICY "linktree_settings_admin_all"
    ON public.linktree_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==========================================
-- Storage bucket untuk foto banner & logo
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fanspage', 'fanspage', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "fanspage_public_read" ON storage.objects;
CREATE POLICY "fanspage_public_read"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'fanspage');

DROP POLICY IF EXISTS "fanspage_authenticated_insert" ON storage.objects;
CREATE POLICY "fanspage_authenticated_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'fanspage');

DROP POLICY IF EXISTS "fanspage_authenticated_update" ON storage.objects;
CREATE POLICY "fanspage_authenticated_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'fanspage')
    WITH CHECK (bucket_id = 'fanspage');

DROP POLICY IF EXISTS "fanspage_authenticated_delete" ON storage.objects;
CREATE POLICY "fanspage_authenticated_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'fanspage');