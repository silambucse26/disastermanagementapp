ALTER TABLE public.allocations ADD COLUMN disaster_id uuid REFERENCES public.disasters(id) ON DELETE SET NULL;
CREATE INDEX allocations_disaster_idx ON public.allocations(disaster_id);