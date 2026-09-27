-- ==============================================================================
-- DISASTER MANAGEMENT SYSTEM (DMS)
-- USER REGISTRATION, ROLE ENFORCEMENT & ADMIN SYNC TRIGGER
-- Purpose: 
--   1. Automatically syncs any newly registered user from Supabase Auth to `public.profiles` and `public.user_roles`.
--   2. Restricts self-registration to 'trainer' or 'volunteer' (prevents self-assigning 'admin').
--   3. Logs an audit trail in `public.activity_log` so new registrations show up in the Admin Command Dashboard.
-- ==============================================================================

-- 1. Create or Replace the User Sync Trigger Function
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
    -- Extract full name from user metadata, or default to email prefix
    _full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        SPLIT_PART(NEW.email, '@', 1),
        'Disaster Responder'
    );

    -- Extract role requested during signup
    _raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'volunteer'));

    -- Security Guard: Self-registration allows ONLY 'trainer' or 'volunteer'.
    -- If 'admin' is passed from public signup, default safely to 'volunteer'.
    IF _raw_role = 'trainer' THEN
        _assigned_role := 'trainer'::public.app_role;
    ELSE
        _assigned_role := 'volunteer'::public.app_role;
    END IF;

    -- 1. Insert or update the public profile
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        _full_name,
        NEW.email,
        NEW.phone,
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();

    -- 2. Insert or update the role in user_roles
    INSERT INTO public.user_roles (
        user_id,
        role,
        created_at
    )
    VALUES (
        NEW.id,
        _assigned_role,
        NOW()
    )
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 3. Log user creation in activity_log so Admin sees it in real time
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
        NEW.id,
        'New ' || INITCAP(_assigned_role::TEXT) || ' Registered: ' || _full_name,
        'user',
        NEW.id::TEXT,
        'register',
        'users',
        'User self-registered as ' || _assigned_role::TEXT || ' with email ' || NEW.email
    );

    RETURN NEW;
END;
$$;

-- 2. Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- VERIFICATION QUERY (Run this to verify registered users and their roles)
-- ==============================================================================
-- SELECT 
--     p.id, 
--     p.full_name, 
--     p.email, 
--     ur.role AS operational_role, 
--     p.status, 
--     p.created_at
-- FROM public.profiles p
-- LEFT JOIN public.user_roles ur ON ur.user_id = p.id
-- ORDER BY p.created_at DESC;
