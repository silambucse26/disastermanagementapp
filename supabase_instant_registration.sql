-- ==============================================================================
-- DISASTER MANAGEMENT SYSTEM (DMS)
-- INSTANT REGISTRATION RPC (ZERO RATE LIMIT, INSTANT EMAIL CONFIRMATION)
-- ==============================================================================
-- Purpose:
--   Allows instant user self-registration as Trainer or Volunteer directly inside 
--   PostgreSQL without triggering Supabase Auth's 3-emails/hour rate limit (HTTP 429).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

    -- 1. Validation
    IF _clean_email IS NULL OR _clean_email = '' OR POSITION('@' IN _clean_email) = 0 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'A valid email address is required.');
    END IF;

    IF _password IS NULL OR LENGTH(_password) < 6 THEN
        RETURN jsonb_build_object('ok', false, 'message', 'Password must be at least 6 characters long.');
    END IF;

    -- 2. Restrict public self-registration: only 'trainer' or 'volunteer' permitted
    IF _clean_role = 'trainer' THEN
        _assigned_role := 'trainer'::public.app_role;
    ELSE
        _assigned_role := 'volunteer'::public.app_role;
    END IF;

    -- 3. Check if user already exists
    SELECT id INTO _new_id FROM auth.users WHERE email = _clean_email;

    IF _new_id IS NOT NULL THEN
        -- If user already exists, update their password, confirm email and update role
        UPDATE auth.users 
        SET 
            encrypted_password = crypt(_password, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            raw_user_meta_data = jsonb_build_object('full_name', _full_name, 'role', _assigned_role::TEXT),
            updated_at = NOW()
        WHERE id = _new_id;
    ELSE
        -- Generate a new UUID
        _new_id := gen_random_uuid();

        -- Insert directly into auth.users (Pre-confirmed, no SMTP mail rate limit)
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
        VALUES (
            _new_id,
            '00000000-0000-0000-0000-000000000000',
            _clean_email,
            crypt(_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', _full_name, 'role', _assigned_role::TEXT),
            NOW(),
            NOW(),
            'authenticated',
            'authenticated',
            '',
            FALSE
        );

        -- Insert into auth.identities
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
        VALUES (
            _new_id,
            _new_id,
            jsonb_build_object('sub', _new_id::TEXT, 'email', _clean_email),
            'email',
            _new_id::TEXT,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 4. Upsert Profile
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        status,
        created_at,
        updated_at
    )
    VALUES (
        _new_id,
        _full_name,
        _clean_email,
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();

    -- 5. Upsert User Role (Trainer or Volunteer)
    INSERT INTO public.user_roles (
        user_id,
        role,
        created_at
    )
    VALUES (
        _new_id,
        _assigned_role,
        NOW()
    )
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 6. Log Activity for Admin Dashboard
    INSERT INTO public.activity_log (
        actor_id,
        event,
        entity_type,
        entity_id,
        action,
        module,
        description
    )
    VALUES (
        _new_id,
        'New ' || INITCAP(_assigned_role::TEXT) || ' Registered: ' || _full_name,
        'user',
        _new_id::TEXT,
        'register',
        'users',
        'Registered with role ' || _assigned_role::TEXT || ' (' || _clean_email || ')'
    );

    RETURN jsonb_build_object(
        'ok', true,
        'user_id', _new_id,
        'email', _clean_email,
        'role', _assigned_role::TEXT,
        'message', 'User registered and verified successfully.'
    );
END;
$$;

-- Allow public access to execute the registration procedure
GRANT EXECUTE ON FUNCTION public.register_responder(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
