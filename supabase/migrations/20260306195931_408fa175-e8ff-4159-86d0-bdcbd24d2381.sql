
CREATE TABLE public.sdr_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  conversations_started integer NOT NULL DEFAULT 0,
  first_replies integer NOT NULL DEFAULT 0,
  calls_scheduled integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(collaborator_id, date)
);

ALTER TABLE public.sdr_daily_metrics ENABLE ROW LEVEL SECURITY;

-- SDRs can insert their own data
CREATE POLICY "Users can insert own sdr metrics"
ON public.sdr_daily_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- SDRs can update their own data
CREATE POLICY "Users can update own sdr metrics"
ON public.sdr_daily_metrics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- All authenticated users can view all metrics (for comparison chart)
CREATE POLICY "Authenticated users can view sdr metrics"
ON public.sdr_daily_metrics
FOR SELECT
TO authenticated
USING (true);

-- Admins can delete any metrics
CREATE POLICY "Admins can delete sdr metrics"
ON public.sdr_daily_metrics
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
