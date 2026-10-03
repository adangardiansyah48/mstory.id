-- ==============================================================================
-- Fix: pembuatan akun admin lewat Supabase Auth API gagal
--
-- Gejala: `auth.admin.createUser()` (service role) selalu mengembalikan
--         500 "Database error creating new user". Penyebabnya: insert GoTrue
--         ke `auth.identities` supplying kolom `email`, padahal kolom itu
--         GENERATED ALWAYS AS lower(identity_data->>'email').
--         Kolom auth.* dimiliki `supabase_auth_admin` sehingga tidak bisa
--         di-ALTER dari peran postgres.
--
-- Solusi: bypass INSERT GoTrue. Fungsi ini menulis langsung ke auth.users +
--         auth.identities (tanpa kolom email yang generated), lalu trigger
--         `handle_new_user` otomatis membuat baris `public.profiles`.
--
-- Catatan penting:
--   * `instance_id` wajib diisi. GoTrue hanya melihat user dengan instance_id
--     yang cocok dengan tenant aktif. User dengan instance_id NULL tidak akan
--     muncul di listUsers() dan login selalu "Invalid login credentials".
--   * Hanya service_role yang boleh memanggil fungsi ini.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text);

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_role text DEFAULT 'admin'
)
RETURNS TABLE (user_id uuid, user_email text, user_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $fn$
DECLARE
  v_id       uuid;
  v_email    text;
  v_role     user_role_type;
  v_instance uuid;
BEGIN
  v_email := lower(btrim(COALESCE(p_email, '')));

  IF v_email = '' THEN
    RAISE EXCEPTION 'Email wajib diisi' USING ERRCODE = '22023';
  END IF;

  IF p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Format email tidak valid' USING ERRCODE = '22023';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter' USING ERRCODE = '22023';
  END IF;

  v_role := CASE
    WHEN p_role IN ('superadmin', 'admin', 'owner') THEN p_role::user_role_type
    ELSE 'admin'::user_role_type
  END;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Email sudah terdaftar' USING ERRCODE = '23505';
  END IF;

  -- Tenant aktif; fallback ke UUID nil agar tetap konsisten dengan user lama.
  SELECT coalesce(
           (SELECT i.id FROM auth.instances i ORDER BY i.created_at LIMIT 1),
           '00000000-0000-0000-0000-000000000000'::uuid
         )
    INTO v_instance;

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new,
    recovery_token, reauthentication_token
  )
  VALUES (
    v_id, v_instance, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', v_role::text),
    now(), now(), '', '', '', '', ''
  );

  -- auth.identities.email adalah GENERATED, jadi jangan ikut di-INSERT.
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    v_id::text, v_id,
    jsonb_build_object(
      'sub', v_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  );

  RETURN QUERY
    SELECT v_id AS user_id, v_email AS user_email, v_role::text AS user_role;
END;
$fn$;

-- Batasi hanya service_role
REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text) TO service_role;