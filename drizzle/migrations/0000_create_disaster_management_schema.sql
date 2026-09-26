CREATE TYPE public.app_role AS ENUM ('admin', 'trainer', 'volunteer');
CREATE TYPE public.record_status AS ENUM ('active', 'inactive');
CREATE TYPE public.training_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
CREATE TYPE public.alert_severity AS ENUM ('high', 'medium', 'info');
CREATE TYPE public.alert_status AS ENUM ('active', 'resolved');
CREATE TYPE public.allocation_status AS ENUM ('allocated', 'returned');

CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text NOT NULL, email text NOT NULL UNIQUE, status public.record_status NOT NULL DEFAULT 'active', avatar_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role public.app_role NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid() ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'trainer' THEN 2 ELSE 3 END LIMIT 1 $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

CREATE POLICY "Profiles readable by self and staff" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Profiles editable by self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles managed by admins" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Roles readable by self and admins" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.trainings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, disaster_type text NOT NULL, location text NOT NULL, scheduled_at timestamptz NOT NULL, trainer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, participant_count integer NOT NULL DEFAULT 0 CHECK (participant_count >= 0), progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100), status public.training_status NOT NULL DEFAULT 'planned', description text NOT NULL DEFAULT '', created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT ALL ON public.trainings TO service_role;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainings readable by authenticated users" ON public.trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainings created by staff" ON public.trainings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Trainings updated by staff" ON public.trainings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Trainings deleted by admins" ON public.trainings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.training_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, attendance boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'assigned', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(training_id, user_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_participants TO authenticated;
GRANT ALL ON public.training_participants TO service_role;
ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assignments readable by participants and staff" ON public.training_participants FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Assignments managed by staff" ON public.training_participants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.training_activities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE, label text NOT NULL, completed boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_activities TO authenticated;
GRANT ALL ON public.training_activities TO service_role;
ALTER TABLE public.training_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activities readable by authenticated users" ON public.training_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activities managed by staff" ON public.training_activities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, category text NOT NULL, total_quantity integer NOT NULL CHECK (total_quantity >= 0), available_quantity integer NOT NULL CHECK (available_quantity >= 0), allocated_quantity integer NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0), minimum_stock integer NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (available_quantity + allocated_quantity = total_quantity));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources readable by authenticated users" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Resources managed by staff" ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.allocations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE, resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT, quantity integer NOT NULL CHECK (quantity > 0), volunteer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, allocated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT, status public.allocation_status NOT NULL DEFAULT 'allocated', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allocations readable by recipients and staff" ON public.allocations FOR SELECT TO authenticated USING (volunteer_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.alerts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, message text NOT NULL, severity public.alert_severity NOT NULL, training_id uuid REFERENCES public.trainings(id) ON DELETE SET NULL, recipients text NOT NULL DEFAULT 'all', status public.alert_status NOT NULL DEFAULT 'active', created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz);
GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alerts readable by recipients" ON public.alerts FOR SELECT TO authenticated USING (recipients = 'all' OR recipients = public.current_user_role()::text OR created_by = auth.uid());
CREATE POLICY "Alerts created by staff" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Alerts updated by staff" ON public.alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.feedback (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), comments text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Feedback readable by author and staff" ON public.feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Feedback submitted by author" ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.activity_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, event text NOT NULL, entity_type text, entity_id uuid, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity readable by authenticated users" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity created by staff" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE OR REPLACE FUNCTION public.allocate_resource(_training_id uuid, _resource_id uuid, _quantity integer, _volunteer_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE r public.resources%ROWTYPE; allocation_id uuid; BEGIN IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) THEN RAISE EXCEPTION 'Forbidden'; END IF; IF _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF; SELECT * INTO r FROM public.resources WHERE id = _resource_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Resource not found'; END IF; IF r.available_quantity < _quantity THEN RAISE EXCEPTION 'Insufficient resource quantity.'; END IF; UPDATE public.resources SET available_quantity = available_quantity - _quantity, allocated_quantity = allocated_quantity + _quantity, updated_at = now() WHERE id = _resource_id; INSERT INTO public.allocations(training_id, resource_id, quantity, volunteer_id, allocated_by) VALUES (_training_id, _resource_id, _quantity, _volunteer_id, auth.uid()) RETURNING id INTO allocation_id; INSERT INTO public.activity_log(actor_id, event, entity_type, entity_id) VALUES (auth.uid(), r.name || ' allocated', 'allocation', allocation_id); IF (r.available_quantity - _quantity) < r.minimum_stock THEN INSERT INTO public.alerts(title, message, severity, training_id, recipients, created_by) VALUES ('Resource shortage detected', r.name || ' is below the configured minimum stock level.', 'high', _training_id, 'all', auth.uid()); END IF; RETURN jsonb_build_object('allocation_id', allocation_id, 'before', r.available_quantity, 'allocated', _quantity, 'after', r.available_quantity - _quantity); END $$;
GRANT EXECUTE ON FUNCTION public.allocate_resource(uuid, uuid, integer, uuid) TO authenticated;

CREATE INDEX trainings_status_idx ON public.trainings(status);
CREATE INDEX allocations_training_idx ON public.allocations(training_id);
CREATE INDEX alerts_status_idx ON public.alerts(status, severity);
CREATE INDEX feedback_training_idx ON public.feedback(training_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainings;