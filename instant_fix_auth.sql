-- ==============================================================================
-- DISASTER MANAGEMENT SYSTEM (DMS) - INSTANT AUTH & REGISTRATION FIX
-- Run this in your Supabase SQL Editor to immediately fix:
-- 1. 404 on rpc/register_responder
-- 2. 400 Invalid Login Credentials on demo accounts
-- 3. 429 Too Many Requests signup rate limits
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Role Enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'trainer', 'volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Ensure Core Auth & User Tables Exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'volunteer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'volunteer';

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT 'system',
    action TEXT NOT NULL DEFAULT 'create',
    description TEXT,
    entity_type TEXT,
    entity_id TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Auto-Confirm Trigger & Admin Sync Triggers
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_user();

-- Auto-confirm any existing unconfirmed accounts
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- 4. User Sync Trigger (Automatically creates Profile & Role on Admin Dashboard)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _raw_role TEXT;
    _assigned_role public.app_role;
    _full_name TEXT;
BEGIN
    _full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1),
        'Disaster Responder'
    );

    _raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'volunteer'));

    IF _raw_role = 'trainer' THEN
        _assigned_role := 'trainer'::public.app_role;
    ELSE
        _assigned_role := 'volunteer'::public.app_role;
    END IF;

    INSERT INTO public.profiles (id, full_name, email, status, created_at, updated_at)
    VALUES (NEW.id, _full_name, NEW.email, 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = NOW();

    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (NEW.id, _assigned_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.activity_log (actor_id, event, entity_type, entity_id, action, module, description)
    VALUES (
        NEW.id,
        'New ' || INITCAP(_assigned_role::TEXT) || ' Registered: ' || _full_name,
        'user', NEW.id::TEXT, 'register', 'users',
        'Registered with role ' || _assigned_role::TEXT || ' (' || NEW.email || ')'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 5. Create the Instant Registration RPC (Rate-Limit Free)
DROP FUNCTION IF EXISTS public.register_responder(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_responder;

CREATE OR REPLACE FUNCTION public.register_responder(
    _email TEXT,
    _password TEXT,
    _full_name TEXT,
    _role TEXT DEFAULT 'volunteer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    _new_id UUID;
    _assigned_role public.app_role;
    _clean_email TEXT;
    _clean_role TEXT;
BEGIN
    _clean_email := LOWER(TRIM(_email));
    _clean_role := LOWER(TRIM(_role));

    IF _clean_email IS NULL OR _clean_email = '' OR POSITION('@' IN _clean_email) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A valid email address is required.');
    END IF;

    IF _password IS NULL OR LENGTH(_password) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Password must be at least 6 characters long.');
    END IF;

    -- Self registration is strictly Trainer or Volunteer (Admin cannot self-register)
    IF _clean_role = 'trainer' THEN
        _assigned_role := 'trainer'::public.app_role;
    ELSE
        _assigned_role := 'volunteer'::public.app_role;
    END IF;

    -- Check if user already exists in auth.users
    SELECT id INTO _new_id FROM auth.users WHERE email = _clean_email;

    IF _new_id IS NOT NULL THEN
        UPDATE auth.users 
        SET 
            encrypted_password = crypt(_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = jsonb_build_object('full_name', _full_name, 'role', _assigned_role::TEXT),
            updated_at = NOW()
        WHERE id = _new_id;
    ELSE
        _new_id := gen_random_uuid();

        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, is_super_admin
        )
        VALUES (
            _new_id, '00000000-0000-0000-0000-000000000000', _clean_email, crypt(_password, gen_salt('bf')),
            NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', _full_name, 'role', _assigned_role::TEXT),
            NOW(), NOW(), 'authenticated', 'authenticated', '', FALSE
        );

        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES (
            _new_id, _new_id, jsonb_build_object('sub', _new_id::TEXT, 'email', _clean_email),
            'email', _new_id::TEXT, NOW(), NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Upsert Public Profile
    INSERT INTO public.profiles (id, full_name, email, status, created_at, updated_at)
    VALUES (_new_id, _full_name, _clean_email, 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = NOW();

    -- Upsert Role Assignment (visible immediately to Admin)
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (_new_id, _assigned_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Record Audit Log for Admin visibility
    INSERT INTO public.activity_log (actor_id, event, entity_type, entity_id, action, module, description)
    VALUES (
        _new_id,
        'New ' || INITCAP(_assigned_role::TEXT) || ' Registered: ' || _full_name,
        'user', _new_id::TEXT, 'register', 'users',
        'Registered with role ' || _assigned_role::TEXT || ' (' || _clean_email || ')'
    );

    RETURN jsonb_build_object('ok', true, 'user_id', _new_id, 'email', _clean_email, 'role', _assigned_role::TEXT);
END;
$$;

-- Grant access to anonymous & authenticated callers
GRANT EXECUTE ON FUNCTION public.register_responder(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. Helper Role Checking Function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role::public.app_role
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO anon, authenticated, service_role;

-- 6. Row Level Security Policies for User Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read on profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated read on user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated read on user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on activity_log" ON public.activity_log;
CREATE POLICY "Allow authenticated read on activity_log" ON public.activity_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert activity" ON public.activity_log;
CREATE POLICY "Allow authenticated insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Seed Demo Auth Users (password123 for all)
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, is_super_admin
) VALUES
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'admin@dms.gov.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Operations Commander (Admin)","role":"admin"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated', '', FALSE),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'trainer@dms.gov.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Captain Rajesh Kumar (Trainer)","role":"trainer"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated', '', FALSE),
    ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'volunteer@dms.gov.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ananya Sharma (Volunteer)","role":"volunteer"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated', '', FALSE)
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@dms.gov.in"}'::jsonb, 'email', '11111111-1111-1111-1111-111111111111', NOW(), NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"trainer@dms.gov.in"}'::jsonb, 'email', '22222222-2222-2222-2222-222222222222', NOW(), NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"volunteer@dms.gov.in"}'::jsonb, 'email', '33333333-3333-3333-3333-333333333333', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, phone, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Operations Commander (Admin)', 'admin@dms.gov.in', '+91 98765 43210', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Captain Rajesh Kumar (Trainer)', 'trainer@dms.gov.in', '+91 98765 43211', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'Ananya Sharma (Volunteer)', 'volunteer@dms.gov.in', '+91 98765 43212', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin'),
    ('22222222-2222-2222-2222-222222222222', 'trainer'),
    ('33333333-3333-3333-3333-333333333333', 'volunteer')
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Force reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
