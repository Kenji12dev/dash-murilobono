
CREATE TABLE public.sdr_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  conversations_goal INTEGER NOT NULL DEFAULT 0,
  replies_goal INTEGER NOT NULL DEFAULT 0,
  calls_goal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (collaborator_id, month, year)
);

ALTER TABLE public.sdr_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sdr goals"
  ON public.sdr_goals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sdr goals"
  ON public.sdr_goals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sdr goals"
  ON public.sdr_goals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sdr goals"
  ON public.sdr_goals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
