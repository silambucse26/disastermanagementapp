-- ==============================================================================
-- DISASTER MANAGEMENT SYSTEM (DMS)
-- DIRECT AUTH USERS SEED (BYPASSES RATE LIMITS & EMAIL CONFIRMATION)
-- ==============================================================================
-- Purpose:
--   Creates the Admin, Trainer, and Volunteer demo accounts directly in 
--   Supabase Auth (`auth.users`), `public.profiles`, and `public.user_roles`.
--
-- Password for all three accounts: password123
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Insert into auth.users with pre-confirmed emails and encrypted passwords
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    is_super_admin
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'admin@dms.gov.in',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Operations Commander (Admin)","role":"admin"}'::jsonb,
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '',
        FALSE
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'trainer@dms.gov.in',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Captain Rajesh Kumar (Trainer)","role":"trainer"}'::jsonb,
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '',
        FALSE
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'volunteer@dms.gov.in',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Ananya Sharma (Volunteer)","role":"volunteer"}'::jsonb,
        NOW(),
        NOW(),
        'authenticated',
        'authenticated',
        '',
        FALSE
    )
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- 3. Insert into auth.identities (Required by Supabase GoTrue Auth)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@dms.gov.in"}'::jsonb,
        'email',
        '11111111-1111-1111-1111-111111111111',
        NOW(),
        NOW(),
        NOW()
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '22222222-2222-2222-2222-222222222222',
        '{"sub":"22222222-2222-2222-2222-222222222222","email":"trainer@dms.gov.in"}'::jsonb,
        'email',
        '22222222-2222-2222-2222-222222222222',
        NOW(),
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '33333333-3333-3333-3333-333333333333',
        '{"sub":"33333333-3333-3333-3333-333333333333","email":"volunteer@dms.gov.in"}'::jsonb,
        'email',
        '33333333-3333-3333-3333-333333333333',
        NOW(),
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Sync Public Profiles
INSERT INTO public.profiles (id, full_name, email, phone, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Operations Commander (Admin)', 'admin@dms.gov.in', '+91 98765 43210', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Captain Rajesh Kumar (Trainer)', 'trainer@dms.gov.in', '+91 98765 43211', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'Ananya Sharma (Volunteer)', 'volunteer@dms.gov.in', '+91 98765 43212', 'active')
ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name, 
    email = EXCLUDED.email;

-- 5. Sync User Roles
INSERT INTO public.user_roles (user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin'),
    ('22222222-2222-2222-2222-222222222222', 'trainer'),
    ('33333333-3333-3333-3333-333333333333', 'volunteer')
ON CONFLICT (user_id, role) DO NOTHING;
