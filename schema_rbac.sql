-- ==============================================================================
-- Migration: Add User Profiles & Multi-Role RBAC (superadmin, admin, owner)
-- ==============================================================================

-- 1. Create Role Enum
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('superadmin', 'admin', 'owner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role_type NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 3. Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role user_role_type := 'admin';
BEGIN
    -- Superadmin email detection
    IF NEW.email = 'superadmin@mstory.id' THEN
        user_role := 'superadmin';
    ELSIF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
        user_role := 'owner';
    ELSIF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        user_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, user_role)
    ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role, email = EXCLUDED.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed existing auth.users into profiles table
INSERT INTO public.profiles (id, email, role)
SELECT 
    id, 
    email,
    CASE 
        WHEN email = 'superadmin@mstory.id' THEN 'superadmin'::user_role_type
        WHEN (raw_user_meta_data->>'role') = 'owner' THEN 'owner'::user_role_type
        ELSE 'admin'::user_role_type
    END as role
FROM auth.users
ON CONFLICT (id) DO NOTHING;
