-- ==============================================================================
-- DISASTER MANAGEMENT SYSTEM (DMS) - COMPLETE SUPABASE SQL SCHEMA
-- Roles: Admin, Trainer, Volunteer
-- Modules: Training, Resources, Allocations, Alerts, Feedback, Reports, Disasters,
--          Response Teams, Shelters, Evacuations, Medical, Contacts, Activity
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'trainer', 'volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.training_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_severity AS ENUM ('high', 'medium', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_status AS ENUM ('active', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_type AS ENUM (
        'Disaster Warning', 'Resource Shortage', 'Evacuation', 
        'Medical Emergency', 'Weather', 'Training', 
        'Infrastructure', 'Security', 'Other'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.allocation_status AS ENUM ('allocated', 'returned', 'depleted', 'damaged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.disaster_type AS ENUM (
        'Flood', 'Fire', 'Earthquake', 'Cyclone', 'Landslide', 
        'Tsunami', 'Drought', 'Industrial Accident', 'Building Collapse', 'Other'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.disaster_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.disaster_status AS ENUM ('Reported', 'Active', 'Under Response', 'Contained', 'Resolved', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.team_type AS ENUM (
        'Search & Rescue', 'Medical', 'Fire & Rescue', 
        'Police', 'Volunteer', 'Logistics', 'Emergency Response'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.team_status AS ENUM ('Available', 'Assigned', 'Deployed', 'Unavailable', 'Completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.shelter_status AS ENUM ('Open', 'Full', 'Closed', 'Emergency Only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.evacuation_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent', 'Late');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Core User & Profiles Tables
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

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'volunteer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 4. Disasters & Incidents
CREATE TABLE IF NOT EXISTS public.disasters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_code TEXT UNIQUE,
    title TEXT NOT NULL,
    disaster_type public.disaster_type NOT NULL DEFAULT 'Flood',
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT,
    address TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    severity public.disaster_severity NOT NULL DEFAULT 'Medium',
    status public.disaster_status NOT NULL DEFAULT 'Reported',
    people_affected INT NOT NULL DEFAULT 0,
    injured INT NOT NULL DEFAULT 0,
    missing INT NOT NULL DEFAULT 0,
    evacuated INT NOT NULL DEFAULT 0,
    deaths INT NOT NULL DEFAULT 0,
    estimated_damage NUMERIC NOT NULL DEFAULT 0,
    response_status TEXT NOT NULL DEFAULT 'Awaiting assessment',
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Warehouses & Resources
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_name TEXT NOT NULL,
    location TEXT NOT NULL,
    address TEXT NOT NULL,
    manager TEXT NOT NULL,
    contact TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 1000,
    current_utilization INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0,
    available_quantity INT NOT NULL DEFAULT 0,
    allocated_quantity INT NOT NULL DEFAULT 0,
    damaged_quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'units',
    storage_location TEXT,
    condition TEXT NOT NULL DEFAULT 'Good',
    expiry_date DATE,
    supplier TEXT,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Trainings & Activities
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    disaster_type TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    participant_count INT NOT NULL DEFAULT 0,
    progress INT NOT NULL DEFAULT 0,
    status public.training_status NOT NULL DEFAULT 'planned',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_code TEXT,
    participant_name TEXT,
    participant_role TEXT DEFAULT 'Volunteer',
    phone TEXT,
    registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attendance BOOLEAN NOT NULL DEFAULT FALSE,
    certificate TEXT,
    status TEXT NOT NULL DEFAULT 'Enrolled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(training_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.training_participants(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status public.attendance_status NOT NULL DEFAULT 'Present',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(participant_id, attendance_date)
);

-- 7. Resource Allocations
CREATE TABLE IF NOT EXISTS public.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    allocated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    disaster_id UUID REFERENCES public.disasters(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status public.allocation_status NOT NULL DEFAULT 'allocated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Alerts & Acknowledgements
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity public.alert_severity NOT NULL DEFAULT 'medium',
    alert_type public.alert_type NOT NULL DEFAULT 'Other',
    status public.alert_status NOT NULL DEFAULT 'active',
    recipients TEXT NOT NULL DEFAULT 'all',
    training_id UUID REFERENCES public.trainings(id) ON DELETE SET NULL,
    disaster_id UUID REFERENCES public.disasters(id) ON DELETE SET NULL,
    location TEXT NOT NULL DEFAULT '',
    target_teams UUID[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, user_id)
);

-- 9. Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Response Teams & Shelters & Evacuations
CREATE TABLE IF NOT EXISTS public.response_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    team_type public.team_type NOT NULL DEFAULT 'Emergency Response',
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    current_location TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    availability BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_disaster_id UUID REFERENCES public.disasters(id) ON DELETE SET NULL,
    status public.team_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.response_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.response_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.shelters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelter_name TEXT NOT NULL,
    shelter_type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    capacity INT NOT NULL DEFAULT 100,
    current_occupancy INT NOT NULL DEFAULT 0,
    available_capacity INT GENERATED ALWAYS AS (GREATEST(0, capacity - current_occupancy)) STORED,
    contact_person TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    facilities TEXT[] NOT NULL DEFAULT '{}',
    status public.shelter_status NOT NULL DEFAULT 'Open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.evacuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id UUID NOT NULL REFERENCES public.disasters(id) ON DELETE CASCADE,
    evacuation_code TEXT UNIQUE,
    evacuation_zone TEXT NOT NULL,
    people_to_evacuate INT NOT NULL,
    people_evacuated INT NOT NULL DEFAULT 0,
    remaining INT GENERATED ALWAYS AS (GREATEST(0, people_to_evacuate - people_evacuated)) STORED,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    destination_shelter_id UUID REFERENCES public.shelters(id) ON DELETE SET NULL,
    responsible_team_id UUID REFERENCES public.response_teams(id) ON DELETE SET NULL,
    status public.evacuation_status NOT NULL DEFAULT 'Planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Medical Facilities & Emergency Contacts
CREATE TABLE IF NOT EXISTS public.medical_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_name TEXT NOT NULL,
    location TEXT NOT NULL,
    address TEXT NOT NULL,
    contact TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    total_beds INT NOT NULL DEFAULT 50,
    available_beds INT NOT NULL DEFAULT 50,
    icu_beds INT NOT NULL DEFAULT 10,
    available_icu_beds INT NOT NULL DEFAULT 10,
    emergency_capacity INT NOT NULL DEFAULT 20,
    ambulance_count INT NOT NULL DEFAULT 2,
    status TEXT NOT NULL DEFAULT 'Operational',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hospital_disaster_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.medical_facilities(id) ON DELETE CASCADE,
    disaster_id UUID NOT NULL REFERENCES public.disasters(id) ON DELETE CASCADE,
    patients_admitted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT NOT NULL,
    organization TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    location TEXT NOT NULL,
    availability TEXT NOT NULL DEFAULT '24/7',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Notifications & Activity Log
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    action TEXT,
    module TEXT,
    description TEXT,
    entity_type TEXT,
    entity_id TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Auto-generating Disaster & Evacuation Codes Trigger
CREATE OR REPLACE FUNCTION public.set_disaster_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.disaster_code IS NULL OR NEW.disaster_code = '' THEN
        NEW.disaster_code := 'DIS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disaster_code ON public.disasters;
CREATE TRIGGER trg_disaster_code
BEFORE INSERT ON public.disasters
FOR EACH ROW EXECUTE FUNCTION public.set_disaster_code();

CREATE OR REPLACE FUNCTION public.set_evacuation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.evacuation_code IS NULL OR NEW.evacuation_code = '' THEN
        NEW.evacuation_code := 'EVAC-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evacuation_code ON public.evacuations;
CREATE TRIGGER trg_evacuation_code
BEFORE INSERT ON public.evacuations
FOR EACH ROW EXECUTE FUNCTION public.set_evacuation_code();

-- 14. Security-Definer Role Helper Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

-- 15. Stored Procedures (RPCs)

-- A. Atomic Resource Allocation Transaction with Low-Stock Alert
CREATE OR REPLACE FUNCTION public.allocate_resource(
    _training_id UUID,
    _resource_id UUID,
    _quantity INT,
    _volunteer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _current_avail INT;
    _current_alloc INT;
    _min_stock INT;
    _r_name TEXT;
    _res_record public.allocations;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) THEN
        RAISE EXCEPTION 'Insufficient permissions to allocate resources.';
    END IF;

    -- Lock resource row for update
    SELECT available_quantity, allocated_quantity, minimum_stock, name
    INTO _current_avail, _current_alloc, _min_stock, _r_name
    FROM public.resources
    WHERE id = _resource_id
    FOR UPDATE;

    IF _current_avail IS NULL THEN
        RAISE EXCEPTION 'Resource not found.';
    END IF;

    IF _current_avail < _quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Requested: %, Available: %', _quantity, _current_avail;
    END IF;

    -- Deduct available, increase allocated
    UPDATE public.resources
    SET 
        available_quantity = available_quantity - _quantity,
        allocated_quantity = allocated_quantity + _quantity,
        updated_at = NOW()
    WHERE id = _resource_id;

    -- Record allocation
    INSERT INTO public.allocations (
        training_id, resource_id, volunteer_id, allocated_by, quantity, status
    ) VALUES (
        _training_id, _resource_id, _volunteer_id, auth.uid(), _quantity, 'allocated'
    ) RETURNING * INTO _res_record;

    -- Trigger Low Stock Alert if reached below minimum stock
    IF (_current_avail - _quantity) <= _min_stock THEN
        INSERT INTO public.alerts (
            title, message, severity, alert_type, recipients, status, location
        ) VALUES (
            'Low Stock Warning: ' || _r_name,
            'Resource ' || _r_name || ' is below minimum threshold (' || (_current_avail - _quantity) || ' remaining).',
            'high',
            'Resource Shortage',
            'admin',
            'active',
            'Central Inventory'
        );
    END IF;

    -- Log Activity
    INSERT INTO public.activity_log (actor_id, event, entity_type, entity_id, action, module)
    VALUES (
        auth.uid(),
        'Allocated ' || _quantity || ' units of ' || _r_name,
        'allocation',
        _res_record.id::TEXT,
        'create',
        'resources'
    );

    RETURN jsonb_build_object(
        'allocation_id', _res_record.id,
        'before', _current_avail,
        'allocated', _quantity,
        'after', _current_avail - _quantity
    );
END;
$$;

-- B. Alert Acknowledgment RPC
CREATE OR REPLACE FUNCTION public.acknowledge_alert(_alert_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _ack_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    INSERT INTO public.alert_acknowledgements (alert_id, user_id, acknowledged_at)
    VALUES (_alert_id, auth.uid(), NOW())
    ON CONFLICT (alert_id, user_id) DO NOTHING
    RETURNING id INTO _ack_id;

    RETURN jsonb_build_object('ok', TRUE, 'alert_id', _alert_id);
END;
$$;

-- C. Volunteer Join Training RPC
CREATE OR REPLACE FUNCTION public.join_training(_training_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _u_name TEXT;
    _part_code TEXT;
    _participant_id UUID;
    _t_name TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.training_participants 
        WHERE training_id = _training_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You are already enrolled in this training program.';
    END IF;

    SELECT full_name INTO _u_name FROM public.profiles WHERE id = auth.uid();
    SELECT name INTO _t_name FROM public.trainings WHERE id = _training_id;

    _part_code := 'VOL-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    INSERT INTO public.training_participants (
        training_id, user_id, participant_name, participant_code, participant_role, status
    ) VALUES (
        _training_id, auth.uid(), COALESCE(_u_name, 'Volunteer Participant'), _part_code, 'Volunteer', 'Enrolled'
    ) RETURNING id INTO _participant_id;

    UPDATE public.trainings
    SET participant_count = participant_count + 1
    WHERE id = _training_id;

    INSERT INTO public.activity_log (actor_id, event, entity_type, entity_id, action, module)
    VALUES (
        auth.uid(),
        'Joined training: ' || COALESCE(_t_name, 'Disaster Training'),
        'training',
        _training_id::TEXT,
        'enroll',
        'trainings'
    );

    RETURN jsonb_build_object('ok', TRUE, 'participant_id', _participant_id);
END;
$$;

-- D. Instant Responder Self-Registration RPC (Zero Rate Limits)
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

    IF _clean_role = 'trainer' THEN
        _assigned_role := 'trainer'::public.app_role;
    ELSE
        _assigned_role := 'volunteer'::public.app_role;
    END IF;

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

    INSERT INTO public.profiles (id, full_name, email, status, created_at, updated_at)
    VALUES (_new_id, _full_name, _clean_email, 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = NOW();

    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (_new_id, _assigned_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

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

GRANT EXECUTE ON FUNCTION public.register_responder(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 16. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evacuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_disaster_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated read on profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read on profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated read on user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on disasters" ON public.disasters;
CREATE POLICY "Allow authenticated read on disasters" ON public.disasters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on warehouses" ON public.warehouses;
CREATE POLICY "Allow authenticated read on warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on resources" ON public.resources;
CREATE POLICY "Allow authenticated read on resources" ON public.resources FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on trainings" ON public.trainings;
CREATE POLICY "Allow authenticated read on trainings" ON public.trainings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on training_activities" ON public.training_activities;
CREATE POLICY "Allow authenticated read on training_activities" ON public.training_activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on training_participants" ON public.training_participants;
CREATE POLICY "Allow authenticated read on training_participants" ON public.training_participants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow authenticated read on attendance_records" ON public.attendance_records FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on allocations" ON public.allocations;
CREATE POLICY "Allow authenticated read on allocations" ON public.allocations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on alerts" ON public.alerts;
CREATE POLICY "Allow authenticated read on alerts" ON public.alerts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on alert_acknowledgements" ON public.alert_acknowledgements;
CREATE POLICY "Allow authenticated read on alert_acknowledgements" ON public.alert_acknowledgements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on feedback" ON public.feedback;
CREATE POLICY "Allow authenticated read on feedback" ON public.feedback FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on response_teams" ON public.response_teams;
CREATE POLICY "Allow authenticated read on response_teams" ON public.response_teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on response_team_members" ON public.response_team_members;
CREATE POLICY "Allow authenticated read on response_team_members" ON public.response_team_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on shelters" ON public.shelters;
CREATE POLICY "Allow authenticated read on shelters" ON public.shelters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on evacuations" ON public.evacuations;
CREATE POLICY "Allow authenticated read on evacuations" ON public.evacuations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on medical_facilities" ON public.medical_facilities;
CREATE POLICY "Allow authenticated read on medical_facilities" ON public.medical_facilities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on hospital_disaster_responses" ON public.hospital_disaster_responses;
CREATE POLICY "Allow authenticated read on hospital_disaster_responses" ON public.hospital_disaster_responses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Allow authenticated read on emergency_contacts" ON public.emergency_contacts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read on notifications" ON public.notifications;
CREATE POLICY "Allow authenticated read on notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated read on activity_log" ON public.activity_log;
CREATE POLICY "Allow authenticated read on activity_log" ON public.activity_log FOR SELECT TO authenticated USING (true);

-- Insert / Update / Delete policies
DROP POLICY IF EXISTS "Allow staff write on disasters" ON public.disasters;
CREATE POLICY "Allow staff write on disasters" ON public.disasters FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on trainings" ON public.trainings;
CREATE POLICY "Allow staff write on trainings" ON public.trainings FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on resources" ON public.resources;
CREATE POLICY "Allow staff write on resources" ON public.resources FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on warehouses" ON public.warehouses;
CREATE POLICY "Allow staff write on warehouses" ON public.warehouses FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on shelters" ON public.shelters;
CREATE POLICY "Allow staff write on shelters" ON public.shelters FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on response_teams" ON public.response_teams;
CREATE POLICY "Allow staff write on response_teams" ON public.response_teams FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on evacuations" ON public.evacuations;
CREATE POLICY "Allow staff write on evacuations" ON public.evacuations FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on medical_facilities" ON public.medical_facilities;
CREATE POLICY "Allow staff write on medical_facilities" ON public.medical_facilities FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff write on emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Allow staff write on emergency_contacts" ON public.emergency_contacts FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow all write on feedback" ON public.feedback;
CREATE POLICY "Allow all write on feedback" ON public.feedback FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow user ack alerts" ON public.alert_acknowledgements;
CREATE POLICY "Allow user ack alerts" ON public.alert_acknowledgements FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow user manage notifications" ON public.notifications;
CREATE POLICY "Allow user manage notifications" ON public.notifications FOR ALL TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow self join training" ON public.training_participants;
CREATE POLICY "Allow self join training" ON public.training_participants FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow staff manage participants" ON public.training_participants;
CREATE POLICY "Allow staff manage participants" ON public.training_participants FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow staff manage attendance" ON public.attendance_records;
CREATE POLICY "Allow staff manage attendance" ON public.attendance_records FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

DROP POLICY IF EXISTS "Allow authenticated insert activity" ON public.activity_log;
CREATE POLICY "Allow authenticated insert activity" ON public.activity_log FOR INSERT TO authenticated 
WITH CHECK (true);

-- 17. Seed Realistic Initial Data
-- Insert Demo Users Profile & Roles
INSERT INTO public.profiles (id, full_name, email, phone, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Operations Commander (Admin)', 'admin@dms.gov.in', '+91 98765 43210', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Captain Rajesh Kumar (Trainer)', 'trainer@dms.gov.in', '+91 98765 43211', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'Ananya Sharma (Volunteer)', 'volunteer@dms.gov.in', '+91 98765 43212', 'active'),
    ('44444444-4444-4444-4444-444444444444', 'Dr. Priya Sundaram', 'priya@dms.gov.in', '+91 98765 43213', 'active'),
    ('55555555-5555-5555-5555-555555555555', 'Karthik Ramanathan', 'karthik@dms.gov.in', '+91 98765 43214', 'active')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin'),
    ('22222222-2222-2222-2222-222222222222', 'trainer'),
    ('33333333-3333-3333-3333-333333333333', 'volunteer'),
    ('44444444-4444-4444-4444-444444444444', 'trainer'),
    ('55555555-5555-5555-5555-555555555555', 'volunteer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Warehouses
INSERT INTO public.warehouses (id, warehouse_name, location, address, manager, contact, capacity, current_utilization) VALUES
    ('a1111111-0000-0000-0000-000000000001', 'Central Disaster Relief Depot', 'Chennai North', 'GNT Road, Madhavaram, Chennai', 'S. Natarajan', '+91 44 2555 1200', 5000, 3200),
    ('a1111111-0000-0000-0000-000000000002', 'South Coastal Logistics Hub', 'Cuddalore Port', 'Harbor Road, Cuddalore', 'M. Velu', '+91 4142 230100', 3000, 1850),
    ('a1111111-0000-0000-0000-000000000003', 'Western Highlands Emergency Store', 'Coimbatore', 'Avinashi Road, Peelamedu', 'R. Meenakshi', '+91 422 2456789', 2500, 950)
ON CONFLICT (id) DO NOTHING;

-- Resources
INSERT INTO public.resources (id, name, category, total_quantity, available_quantity, allocated_quantity, damaged_quantity, minimum_stock, unit, storage_location, condition, warehouse_id) VALUES
    ('b1111111-0000-0000-0000-000000000001', 'High-Buoyancy Life Jackets', 'Water Rescue', 250, 180, 70, 0, 30, 'units', 'Bay 1A - Water Safety', 'Good', 'a1111111-0000-0000-0000-000000000001'),
    ('b1111111-0000-0000-0000-000000000002', 'Trauma First Aid & Triage Kits', 'Medical', 150, 95, 55, 0, 25, 'kits', 'Bay 2B - Medical Store', 'Good', 'a1111111-0000-0000-0000-000000000001'),
    ('b1111111-0000-0000-0000-000000000003', 'Inflatable Rescue Boats (IRB)', 'Boats & Marine', 20, 12, 8, 0, 5, 'boats', 'Boat Yard North', 'Good', 'a1111111-0000-0000-0000-000000000002'),
    ('b1111111-0000-0000-0000-000000000004', 'Multi-Band VHF/UHF Handheld Radios', 'Communications', 120, 80, 40, 0, 20, 'radios', 'Secure Electronics Room', 'Good', 'a1111111-0000-0000-0000-000000000001'),
    ('b1111111-0000-0000-0000-000000000005', 'Emergency Waterproof Family Tents', 'Shelter', 300, 210, 90, 0, 50, 'tents', 'Bay 3C - Shelter Material', 'Good', 'a1111111-0000-0000-0000-000000000001'),
    ('b1111111-0000-0000-0000-000000000006', 'High-Output Portable Water Purifiers', 'Sanitation', 80, 50, 30, 0, 15, 'units', 'Bay 4A - Water Equipment', 'Good', 'a1111111-0000-0000-0000-000000000003'),
    ('b1111111-0000-0000-0000-000000000007', 'Heavy-Duty Emergency Flood Lights', 'Power & Lighting', 60, 45, 15, 0, 10, 'units', 'Bay 1C - Electrical', 'Good', 'a1111111-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Disasters
INSERT INTO public.disasters (id, disaster_code, title, disaster_type, description, occurred_at, state, district, city, area, address, latitude, longitude, severity, status, people_affected, injured, missing, evacuated, deaths, estimated_damage, response_status) VALUES
    ('c1111111-0000-0000-0000-000000000001', 'DIS-2026-1042', 'Severe Coastal Cyclone Storm Surge', 'Cyclone', 'Category 3 cyclonic storm causing high surges and coastal flooding across low-lying coastal villages.', NOW() - INTERVAL '2 days', 'Tamil Nadu', 'Cuddalore', 'Cuddalore', 'Silver Beach & Devanampattinam', 'Coastal Highway Sector 4', 11.7480, 79.7714, 'Critical', 'Active', 18500, 142, 8, 4200, 0, 4500000, 'NDRF & SDRF Deployed, Evacuation In Progress'),
    ('c1111111-0000-0000-0000-000000000002', 'DIS-2026-1043', 'Urban Flash Floods & Inundation', 'Flood', 'Intense convective precipitation exceeding 220mm in 6 hours leading to major arterial inundation.', NOW() - INTERVAL '1 day', 'Tamil Nadu', 'Chennai', 'Chennai', 'Velachery & Madipakkam', '100 Feet Bypass Road', 12.9815, 80.2180, 'High', 'Under Response', 32000, 85, 0, 8900, 0, 8200000, 'Boats Operating, Relief Camps Operational'),
    ('c1111111-0000-0000-0000-000000000003', 'DIS-2026-1044', 'Nilgiris Mountain Slopes Landslide', 'Landslide', 'Prolonged hill rains triggered debris flow blocking state highway and isolating 3 hamlets.', NOW() - INTERVAL '3 days', 'Tamil Nadu', 'Nilgiris', 'Coonoor', 'Marappalam Ghat Section', 'Coonoor-Mettupalayam Ghat Rd', 11.3530, 76.7959, 'Medium', 'Under Response', 1400, 12, 0, 350, 0, 1200000, 'Earthmovers Cleared 1 Lane')
ON CONFLICT (id) DO NOTHING;

-- Trainings
INSERT INTO public.trainings (id, name, disaster_type, description, location, scheduled_at, trainer_id, participant_count, progress, status, created_by) VALUES
    ('d1111111-0000-0000-0000-000000000001', 'Advanced Flood & Swiftwater Rescue Drill', 'Flood', 'Hands-on practical training on boat navigation, life-line throwing, and night extraction from flooded structures.', 'Adyar River Training Dock, Chennai', NOW() + INTERVAL '3 days', '22222222-2222-2222-2222-222222222222', 28, 75, 'active', '11111111-1111-1111-1111-111111111111'),
    ('d1111111-0000-0000-0000-000000000002', 'Mass Casualty Triage & First Responder Care', 'Medical', 'Comprehensive field triage protocols, hemorrhage control, CPR certification, and stretcher evacuation.', 'Emergency Operations Centre Auditorium', NOW() + INTERVAL '7 days', '44444444-4444-4444-4444-444444444444', 35, 40, 'active', '11111111-1111-1111-1111-111111111111'),
    ('d1111111-0000-0000-0000-000000000003', 'Shelter Management & Relief Supply Logistics', 'Logistics', 'Setting up family camps, safe sanitation, food distribution auditing, and vulnerable population support.', 'Madhavaram Relief Base', NOW() + INTERVAL '12 days', '22222222-2222-2222-2222-222222222222', 20, 10, 'planned', '11111111-1111-1111-1111-111111111111'),
    ('d1111111-0000-0000-0000-000000000004', 'Urban Search & Collapse Rescue (USAR)', 'Earthquake', 'Structure shoring, acoustic search cameras, and confined space debris clearing techniques.', 'State Training Academy, Coimbatore', NOW() - INTERVAL '5 days', '22222222-2222-2222-2222-222222222222', 24, 100, 'completed', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Training Activities
INSERT INTO public.training_activities (training_id, label, completed, sort_order) VALUES
    ('d1111111-0000-0000-0000-000000000001', 'Boat safety inspection & engine prep', TRUE, 1),
    ('d1111111-0000-0000-0000-000000000001', 'Throw bag and live current swimmer capture', TRUE, 2),
    ('d1111111-0000-0000-0000-000000000001', 'Rooftop extraction harness setup', TRUE, 3),
    ('d1111111-0000-0000-0000-000000000001', 'Night simulated rescue in heavy rain', FALSE, 4),
    ('d1111111-0000-0000-0000-000000000002', 'START triage color categorization drill', TRUE, 1),
    ('d1111111-0000-0000-0000-000000000002', 'Tourniquet application and wound packing', TRUE, 2),
    ('d1111111-0000-0000-0000-000000000002', 'Ambulance handover simulation', FALSE, 3)
ON CONFLICT DO NOTHING;

-- Training Participants (Volunteer enrollment)
INSERT INTO public.training_participants (id, training_id, user_id, participant_name, participant_code, participant_role, status, attendance) VALUES
    ('e1111111-0000-0000-0000-000000000001', 'd1111111-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Ananya Sharma', 'VOL-4821', 'Volunteer', 'Enrolled', TRUE),
    ('e1111111-0000-0000-0000-000000000002', 'd1111111-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Ananya Sharma', 'VOL-4821', 'Volunteer', 'Enrolled', FALSE),
    ('e1111111-0000-0000-0000-000000000003', 'd1111111-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Karthik Ramanathan', 'VOL-9120', 'Volunteer', 'Enrolled', TRUE)
ON CONFLICT (training_id, user_id) DO NOTHING;

-- Allocations
INSERT INTO public.allocations (id, training_id, resource_id, volunteer_id, allocated_by, quantity, status) VALUES
    ('f1111111-0000-0000-0000-000000000001', 'd1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 2, 'allocated'),
    ('f1111111-0000-0000-0000-000000000002', 'd1111111-0000-0000-0000-000000000001', 'b1111111-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 1, 'allocated'),
    ('f1111111-0000-0000-0000-000000000003', 'd1111111-0000-0000-0000-000000000002', 'b1111111-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 1, 'allocated')
ON CONFLICT (id) DO NOTHING;

-- Alerts
INSERT INTO public.alerts (id, title, message, severity, alert_type, status, recipients, location, created_by) VALUES
    ('71111111-0000-0000-0000-000000000001', 'RED ALERT: Heavy Inflow into Chembarambakkam Reservoir', 'Discharge increased to 6,000 cusecs. Low lying areas along Adyar river must initiate stage-2 evacuation immediately.', 'high', 'Disaster Warning', 'active', 'all', 'Chennai & Kanchipuram Districts', '11111111-1111-1111-1111-111111111111'),
    ('71111111-0000-0000-0000-000000000002', 'Urgent Request: Volunteer Boat Pilots for Velachery', 'Additional volunteer rescue teams required at Velachery MRTS station staging post with VHF sets.', 'medium', 'Resource Shortage', 'active', 'volunteer', 'Velachery South Chennai', '22222222-2222-2222-2222-222222222222'),
    ('71111111-0000-0000-0000-000000000003', 'Weather Advisory: Wind Speeds Gusting up to 75 kmph', 'All coastal rescue teams maintain safety tether lines. Marine operations suspended till 18:00 hrs.', 'info', 'Weather', 'active', 'all', 'Cuddalore & Nagapattinam Coast', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Shelters
INSERT INTO public.shelters (id, shelter_name, shelter_type, state, district, city, address, latitude, longitude, capacity, current_occupancy, contact_person, contact_number, facilities, status) VALUES
    ('81111111-0000-0000-0000-000000000001', 'Velachery Community Relief Centre', 'School / Hall', 'Tamil Nadu', 'Chennai', 'Chennai', 'Velachery Main Road, Chennai 600042', 12.9780, 80.2210, 450, 310, 'K. Balachandar (Zonal Officer)', '+91 44 2244 8810', ARRAY['Food', 'Medical', 'Power Backup', 'Sanitation', 'Clean Water'], 'Open'),
    ('81111111-0000-0000-0000-000000000002', 'Cuddalore Port Cyclone Relief Shelter', 'Dedicated Cyclone Shelter', 'Tamil Nadu', 'Cuddalore', 'Cuddalore', 'Beach Road, Cuddalore Port', 11.7510, 79.7750, 800, 620, 'G. Sundaram', '+91 4142 223344', ARRAY['Food', 'Medical', 'Helipad Access', 'High Density Bedding'], 'Open'),
    ('81111111-0000-0000-0000-000000000003', 'Madhavaram Higher Secondary Camp', 'Government School', 'Tamil Nadu', 'Chennai', 'Madhavaram', 'High School Rd, Madhavaram', 13.1480, 80.2310, 300, 85, 'Mrs. V. Lakshmi', '+91 44 2553 4411', ARRAY['Food', 'Water', 'Child Care Zone'], 'Open')
ON CONFLICT (id) DO NOTHING;

-- Response Teams
INSERT INTO public.response_teams (id, team_name, team_type, phone, current_location, latitude, longitude, availability, status) VALUES
    ('91111111-0000-0000-0000-000000000001', 'Alpha Swift Water Rescue Unit', 'Search & Rescue', '+91 94444 00101', 'Velachery Bridge Post', 12.9815, 80.2180, TRUE, 'Deployed'),
    ('91111111-0000-0000-0000-000000000002', 'Delta Mobile Emergency Medical Squad', 'Medical', '+91 94444 00102', 'Cuddalore General Hospital Staging', 11.7480, 79.7714, TRUE, 'Deployed'),
    ('91111111-0000-0000-0000-000000000003', 'Bravo Coastal Evacuation Team', 'Emergency Response', '+91 94444 00103', 'Madhavaram Depot Base', 13.1480, 80.2310, TRUE, 'Available')
ON CONFLICT (id) DO NOTHING;

-- Evacuations
INSERT INTO public.evacuations (id, disaster_id, evacuation_code, evacuation_zone, people_to_evacuate, people_evacuated, destination_shelter_id, responsible_team_id, status) VALUES
    ('01111111-0000-0000-0000-000000000001', 'c1111111-0000-0000-0000-000000000001', 'EVAC-2026-01', 'Zone 1: Devanampattinam Fisherman Colony', 1200, 950, '81111111-0000-0000-0000-000000000002', '91111111-0000-0000-0000-000000000002', 'In Progress'),
    ('01111111-0000-0000-0000-000000000002', 'c1111111-0000-0000-0000-000000000002', 'EVAC-2026-02', 'Zone 4: Velachery Low Lying Residential Grid', 2500, 2100, '81111111-0000-0000-0000-000000000001', '91111111-0000-0000-0000-000000000001', 'In Progress')
ON CONFLICT (id) DO NOTHING;

-- Medical Facilities
INSERT INTO public.medical_facilities (id, hospital_name, location, address, contact, total_beds, available_beds, icu_beds, available_icu_beds, emergency_capacity, ambulance_count, status) VALUES
    ('02111111-0000-0000-0000-000000000001', 'Government General Hospital Emergency Trauma Centre', 'Chennai Central', 'EVR Periyar Salai, Park Town, Chennai', '+91 44 2530 5000', 600, 140, 60, 12, 50, 10, 'Operational'),
    ('02111111-0000-0000-0000-000000000002', 'District Headquarters Hospital', 'Cuddalore', 'Hospital Road, Cuddalore', '+91 4142 230230', 250, 45, 20, 4, 25, 5, 'Operational'),
    ('02111111-0000-0000-0000-000000000003', 'Coimbatore Medical College Hospital', 'Coimbatore', 'Avinashi Road, Peelamedu, Coimbatore', '+91 422 257 0111', 450, 110, 40, 15, 30, 8, 'Operational')
ON CONFLICT (id) DO NOTHING;

-- Emergency Contacts
INSERT INTO public.emergency_contacts (id, service, organization, contact_number, location, availability, description) VALUES
    ('03111111-0000-0000-0000-000000000001', 'State Disaster Management Control Room', 'TNDMA', '1070', 'State EOC, Ezhilagam, Chennai', '24/7 Toll-Free', 'Statewide single emergency helpline for incident reports and disaster assistance.'),
    ('03111111-0000-0000-0000-000000000002', 'District Emergency Operations Centre', 'District Collectorate', '1077', 'All District Collectorates', '24/7 Toll-Free', 'District level rescue dispatch and shelter coordination.'),
    ('03111111-0000-0000-0000-000000000003', 'National Disaster Response Force (NDRF)', 'NDRF 04 BN', '+91 44 2747 2201', 'Arakkonam Base', '24/7 Operations', 'Heavy rescue, air insertion, diving squads, and collapsed structure teams.'),
    ('03111111-0000-0000-0000-000000000004', 'Emergency Medical Ambulance Services', 'GVK EMRI', '108', 'Statewide Mobile Fleet', '24/7 Emergency', 'Immediate critical care transport and paramedic dispatch.')
ON CONFLICT (id) DO NOTHING;

-- Feedback
INSERT INTO public.feedback (training_id, user_id, rating, comments) VALUES
    ('d1111111-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 5, 'The high current swim training was extremely realistic. Captain Rajesh guided us thoroughly on safety tether lines and radio signals.'),
    ('d1111111-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 5, 'Excellent collapse rescue drills. Acoustic search equipment practical session was top notch.')
ON CONFLICT DO NOTHING;

-- Activity Log
INSERT INTO public.activity_log (actor_id, event, action, module, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Issued Red Alert for Chembarambakkam outflow', 'create', 'alerts', 'High severity warning broadcasted to all response channels.'),
    ('22222222-2222-2222-2222-222222222222', 'Updated Swiftwater Rescue Drill to 75% complete', 'update', 'trainings', 'Completed modules 1, 2, and 3 successfully.'),
    ('11111111-1111-1111-1111-111111111111', 'Allocated 2 Life Jackets to Volunteer Ananya', 'create', 'resources', 'Assigned for active flood response at Velachery MRTS.')
ON CONFLICT DO NOTHING;

-- Optional Auth Users Seeding (Password for all demo accounts: password123)
DO $$
BEGIN
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token
    ) VALUES
        ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'admin@dms.gov.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Operations Commander (Admin)"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated', ''),
        ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'trainer@dms.gov.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Captain Rajesh Kumar (Trainer)"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated', ''),
        ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'volunteer@dms.gov.in', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Ananya Sharma (Volunteer)"}'::jsonb, NOW(), NOW(), 'authenticated', 'authenticated', '')
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES
        ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@dms.gov.in"}'::jsonb, 'email', '11111111-1111-1111-1111-111111111111', NOW(), NOW(), NOW()),
        ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"trainer@dms.gov.in"}'::jsonb, 'email', '22222222-2222-2222-2222-222222222222', NOW(), NOW(), NOW()),
        ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"volunteer@dms.gov.in"}'::jsonb, 'email', '33333333-3333-3333-3333-333333333333', NOW(), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    -- If auth schema is restricted, users can self-signup from the web UI
    NULL;
END $$;
