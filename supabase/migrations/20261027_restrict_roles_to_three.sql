-- ==============================================================================
-- SYNCVET MIGRATION: RESTRICT SYSTEM ROLES TO 3 ROLES
-- Target Roles: Administrator / admin, Veterinarian / veterinarian, Pet Owner / petowner
-- (Removes 'Vaccinator' as a role and migrates existing vaccinator accounts to Veterinarian)
-- Run this directly in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Migrate any existing users with 'Vaccinator' role to 'Veterinarian'
UPDATE public.users
SET role = CASE 
    WHEN role = 'vaccinator' THEN 'veterinarian'
    ELSE 'Veterinarian'
END
WHERE LOWER(TRIM(role)) LIKE '%vaccin%';

-- 2. Clean up any historical audit logs if desired (or re-assign to Veterinarian)
UPDATE public.audit_logs
SET role = 'Veterinarian'
WHERE LOWER(TRIM(role)) LIKE '%vaccin%';

-- 3. Drop existing role check constraints on public.users (if any exist)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 4. Add a check constraint on public.users to strictly enforce only the 3 allowed roles
-- (Accommodates both Title Case and lowercase representations used by client apps and APIs)
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (
    LOWER(TRIM(role)) IN ('admin', 'administrator', 'veterinarian', 'petowner', 'pet owner')
);

-- 5. Optional: If a custom PostgreSQL ENUM type (e.g., user_role) was created previously in Supabase:
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
--         -- Rename old enum and create a new 3-value enum:
--         ALTER TYPE public.user_role RENAME TO user_role_old;
--         CREATE TYPE public.user_role AS ENUM ('admin', 'veterinarian', 'petowner');
--         ALTER TABLE public.users ALTER COLUMN role TYPE public.user_role USING (
--             CASE 
--                 WHEN LOWER(TRIM(role::text)) IN ('admin', 'administrator') THEN 'admin'::public.user_role
--                 WHEN LOWER(TRIM(role::text)) IN ('veterinarian', 'vaccinator') THEN 'veterinarian'::public.user_role
--                 ELSE 'petowner'::public.user_role
--             END
--         );
--         DROP TYPE public.user_role_old;
--     END IF;
-- END $$;
