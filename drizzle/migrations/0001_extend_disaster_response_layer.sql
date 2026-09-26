CREATE TYPE public.disaster_type AS ENUM ('Flood', 'Fire', 'Earthquake', 'Cyclone', 'Landslide', 'Tsunami', 'Drought', 'Industrial Accident', 'Building Collapse', 'Other');
CREATE TYPE public.disaster_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE public.disaster_status AS ENUM ('Reported', 'Active', 'Under Response', 'Contained', 'Resolved', 'Closed');
CREATE TYPE public.team_type AS ENUM ('Search & Rescue', 'Medical', 'Fire & Rescue', 'Police', 'Volunteer', 'Logistics', 'Emergency Response');
CREATE TYPE public.team_status AS ENUM ('Available', 'Assigned', 'Deployed', 'Unavailable', 'Completed');
CREATE TYPE public.shelter_status AS ENUM ('Open', 'Full', 'Closed', 'Emergency Only');
CREATE TYPE public.evacuation_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent', 'Late');
CREATE TYPE public.alert_type AS ENUM ('Disaster Warning', 'Resource Shortage', 'Evacuation', 'Medical Emergency', 'Weather', 'Training', 'Infrastructure', 'Security', 'Other');

CREATE TABLE public.disasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_code text NOT NULL UNIQUE DEFAULT ('DIS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  title text NOT NULL,
  disaster_type public.disaster_type NOT NULL,
  description text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  city text NOT NULL,
  area text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  severity public.disaster_severity NOT NULL,
  status public.disaster_status NOT NULL DEFAULT 'Reported',
  reported_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  people_affected integer NOT NULL DEFAULT 0 CHECK (people_affected >= 0),
  injured integer NOT NULL DEFAULT 0 CHECK (injured >= 0),
  missing integer NOT NULL DEFAULT 0 CHECK (missing >= 0),
  evacuated integer NOT NULL DEFAULT 0 CHECK (evacuated >= 0),
  deaths integer NOT NULL DEFAULT 0 CHECK (deaths >= 0),
  estimated_damage numeric(16,2) NOT NULL DEFAULT 0 CHECK (estimated_damage >= 0),
  response_status text NOT NULL DEFAULT 'Awaiting assessment',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disasters TO authenticated;
GRANT ALL ON public.disasters TO service_role;
ALTER TABLE public.disasters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disasters readable by authenticated users" ON public.disasters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Disasters managed by staff" ON public.disasters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.response_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code text NOT NULL UNIQUE DEFAULT ('TEAM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  team_name text NOT NULL,
  team_type public.team_type NOT NULL,
  leader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone text NOT NULL,
  current_location text NOT NULL,
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  availability boolean NOT NULL DEFAULT true,
  assigned_disaster_id uuid REFERENCES public.disasters(id) ON DELETE SET NULL,
  status public.team_status NOT NULL DEFAULT 'Available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_teams TO authenticated;
GRANT ALL ON public.response_teams TO service_role;
ALTER TABLE public.response_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams readable by authenticated users" ON public.response_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teams managed by staff" ON public.response_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.response_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.response_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_team_members TO authenticated;
GRANT ALL ON public.response_team_members TO service_role;
ALTER TABLE public.response_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members readable by authenticated users" ON public.response_team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members managed by staff" ON public.response_team_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.shelters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_code text NOT NULL UNIQUE DEFAULT ('SH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  shelter_name text NOT NULL,
  shelter_type text NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  capacity integer NOT NULL CHECK (capacity >= 0),
  current_occupancy integer NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
  available_capacity integer GENERATED ALWAYS AS (capacity - current_occupancy) STORED,
  contact_person text NOT NULL,
  contact_number text NOT NULL,
  facilities text[] NOT NULL DEFAULT '{}',
  status public.shelter_status NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_occupancy <= capacity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelters TO authenticated;
GRANT ALL ON public.shelters TO service_role;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shelters readable by authenticated users" ON public.shelters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shelters managed by staff" ON public.shelters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_code text NOT NULL UNIQUE DEFAULT ('WH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  warehouse_name text NOT NULL,
  location text NOT NULL,
  address text NOT NULL,
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  manager text NOT NULL,
  contact text NOT NULL,
  capacity integer NOT NULL CHECK (capacity >= 0),
  current_utilization integer NOT NULL DEFAULT 0 CHECK (current_utilization >= 0),
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_utilization <= capacity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Warehouses readable by authenticated users" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Warehouses managed by staff" ON public.warehouses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

ALTER TABLE public.resources ADD COLUMN damaged_quantity integer NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0);
ALTER TABLE public.resources ADD COLUMN unit text NOT NULL DEFAULT 'units';
ALTER TABLE public.resources ADD COLUMN storage_location text NOT NULL DEFAULT '';
ALTER TABLE public.resources ADD COLUMN condition text NOT NULL DEFAULT 'Good';
ALTER TABLE public.resources ADD COLUMN expiry_date date;
ALTER TABLE public.resources ADD COLUMN supplier text NOT NULL DEFAULT '';
ALTER TABLE public.resources ADD COLUMN status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Limited', 'Out of Stock', 'Damaged', 'Expired'));
ALTER TABLE public.resources ADD COLUMN warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

ALTER TABLE public.trainings ADD COLUMN start_time time;
ALTER TABLE public.trainings ADD COLUMN end_time time;
ALTER TABLE public.trainings ADD COLUMN attendance_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (attendance_rate BETWEEN 0 AND 100);

ALTER TABLE public.training_participants ADD COLUMN participant_code text UNIQUE DEFAULT ('PART-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
ALTER TABLE public.training_participants ADD COLUMN participant_name text;
ALTER TABLE public.training_participants ADD COLUMN participant_role text;
ALTER TABLE public.training_participants ADD COLUMN phone text;
ALTER TABLE public.training_participants ADD COLUMN registration_date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.training_participants ADD COLUMN certificate text;

CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.training_participants(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attendance readable by participants and staff" ON public.attendance_records FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.training_participants p WHERE p.id = participant_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'))));
CREATE POLICY "Attendance managed by staff" ON public.attendance_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.evacuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evacuation_code text NOT NULL UNIQUE DEFAULT ('EVAC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  disaster_id uuid NOT NULL REFERENCES public.disasters(id) ON DELETE RESTRICT,
  evacuation_zone text NOT NULL,
  people_to_evacuate integer NOT NULL CHECK (people_to_evacuate >= 0),
  people_evacuated integer NOT NULL DEFAULT 0 CHECK (people_evacuated >= 0),
  remaining integer GENERATED ALWAYS AS (people_to_evacuate - people_evacuated) STORED,
  start_time timestamptz,
  end_time timestamptz,
  destination_shelter_id uuid REFERENCES public.shelters(id) ON DELETE SET NULL,
  responsible_team_id uuid REFERENCES public.response_teams(id) ON DELETE SET NULL,
  status public.evacuation_status NOT NULL DEFAULT 'Planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (people_evacuated <= people_to_evacuate),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evacuations TO authenticated;
GRANT ALL ON public.evacuations TO service_role;
ALTER TABLE public.evacuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Evacuations readable by authenticated users" ON public.evacuations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Evacuations managed by staff" ON public.evacuations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.medical_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_code text NOT NULL UNIQUE DEFAULT ('HOSP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  hospital_name text NOT NULL,
  location text NOT NULL,
  address text NOT NULL,
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  contact text NOT NULL,
  total_beds integer NOT NULL DEFAULT 0 CHECK (total_beds >= 0),
  available_beds integer NOT NULL DEFAULT 0 CHECK (available_beds >= 0),
  icu_beds integer NOT NULL DEFAULT 0 CHECK (icu_beds >= 0),
  available_icu_beds integer NOT NULL DEFAULT 0 CHECK (available_icu_beds >= 0),
  emergency_capacity integer NOT NULL DEFAULT 0 CHECK (emergency_capacity >= 0),
  ambulance_count integer NOT NULL DEFAULT 0 CHECK (ambulance_count >= 0),
  status text NOT NULL DEFAULT 'Operational',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_beds <= total_beds),
  CHECK (available_icu_beds <= icu_beds)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_facilities TO authenticated;
GRANT ALL ON public.medical_facilities TO service_role;
ALTER TABLE public.medical_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medical facilities readable by authenticated users" ON public.medical_facilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Medical facilities managed by staff" ON public.medical_facilities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.hospital_disaster_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.medical_facilities(id) ON DELETE CASCADE,
  disaster_id uuid NOT NULL REFERENCES public.disasters(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, disaster_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_disaster_responses TO authenticated;
GRANT ALL ON public.hospital_disaster_responses TO service_role;
ALTER TABLE public.hospital_disaster_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hospital responses readable by authenticated users" ON public.hospital_disaster_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Hospital responses managed by staff" ON public.hospital_disaster_responses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  organization text NOT NULL,
  contact_number text NOT NULL,
  location text NOT NULL,
  availability text NOT NULL DEFAULT '24/7',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Emergency contacts readable by authenticated users" ON public.emergency_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Emergency contacts managed by staff" ON public.emergency_contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer'));

ALTER TABLE public.alerts ADD COLUMN alert_type public.alert_type NOT NULL DEFAULT 'Other';
ALTER TABLE public.alerts ADD COLUMN disaster_id uuid REFERENCES public.disasters(id) ON DELETE SET NULL;
ALTER TABLE public.alerts ADD COLUMN location text NOT NULL DEFAULT '';
ALTER TABLE public.alerts ADD COLUMN target_teams uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.alerts ADD COLUMN expires_at timestamptz;

CREATE TABLE public.alert_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alert_id, user_id)
);
GRANT SELECT, INSERT ON public.alert_acknowledgements TO authenticated;
GRANT ALL ON public.alert_acknowledgements TO service_role;
ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acknowledgements readable by authenticated users" ON public.alert_acknowledgements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users acknowledge alerts as self" ON public.alert_acknowledgements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_disaster_id uuid REFERENCES public.disasters(id) ON DELETE CASCADE,
  related_alert_id uuid REFERENCES public.alerts(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.activity_log ADD COLUMN action text;
ALTER TABLE public.activity_log ADD COLUMN module text;
ALTER TABLE public.activity_log ADD COLUMN description text;
ALTER TABLE public.activity_log ADD COLUMN status text NOT NULL DEFAULT 'success';

CREATE OR REPLACE FUNCTION public.acknowledge_alert(_alert_id uuid)
RETURNS public.alert_acknowledgements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.alert_acknowledgements;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.alert_acknowledgements(alert_id, user_id)
  VALUES (_alert_id, auth.uid())
  ON CONFLICT (alert_id, user_id) DO UPDATE SET acknowledged_at = EXCLUDED.acknowledged_at
  RETURNING * INTO result;
  INSERT INTO public.activity_log(actor_id, event, entity_type, entity_id, action, module, description)
  VALUES (auth.uid(), 'Alert acknowledged', 'alert', _alert_id, 'acknowledge', 'alerts', 'Alert acknowledgement recorded');
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.acknowledge_alert(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_training_attendance_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target_training uuid;
BEGIN
  target_training := COALESCE(NEW.training_id, OLD.training_id);
  UPDATE public.trainings t SET attendance_rate = COALESCE((
    SELECT round(100.0 * count(*) FILTER (WHERE status IN ('Present', 'Late')) / NULLIF(count(*), 0), 2)
    FROM public.attendance_records a WHERE a.training_id = target_training
  ), 0), updated_at = now() WHERE t.id = target_training;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER refresh_training_attendance_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.refresh_training_attendance_rate();

CREATE INDEX disasters_status_severity_idx ON public.disasters(status, severity);
CREATE INDEX disasters_location_idx ON public.disasters(district, city);
CREATE INDEX response_teams_disaster_idx ON public.response_teams(assigned_disaster_id);
CREATE INDEX shelters_location_idx ON public.shelters(district, city);
CREATE INDEX evacuations_disaster_idx ON public.evacuations(disaster_id);
CREATE INDEX resources_warehouse_idx ON public.resources(warehouse_id);
CREATE INDEX attendance_training_idx ON public.attendance_records(training_id);
CREATE INDEX acknowledgements_alert_idx ON public.alert_acknowledgements(alert_id);
CREATE INDEX notifications_user_read_idx ON public.notifications(user_id, read);
CREATE INDEX hospitals_location_idx ON public.medical_facilities(location);

ALTER PUBLICATION supabase_realtime ADD TABLE public.disasters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.response_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shelters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evacuations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_acknowledgements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_facilities;