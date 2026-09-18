ALTER TABLE public.linktree_settings ADD COLUMN IF NOT EXISTS banner_urls TEXT;
ALTER TABLE public.linktree_settings ADD COLUMN IF NOT EXISTS transport_fee INTEGER DEFAULT 250000;
