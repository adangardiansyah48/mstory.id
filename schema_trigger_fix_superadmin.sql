-- Perbaiki trigger: kenali role=superadmin dari user_metadata, bukan hanya hardcode email

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_role user_role_type := 'admin';
BEGIN
    -- Superadmin email detection
    IF NEW.email = 'superadmin@mstory.id' THEN
        user_role := 'superadmin';
    ELSIF (NEW.raw_user_meta_data->>'role') = 'superadmin' THEN
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
$function$;