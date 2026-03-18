CREATE TABLE public.sdr_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  analysis text NOT NULL,
  classification text NOT NULL DEFAULT 'Morno',
  images_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sdr_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SDRs can view own analyses"
  ON public.sdr_analyses FOR SELECT TO authenticated
  USING (
    sdr_id IN (
      SELECT id FROM public.collaborators WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "SDRs can insert own analyses"
  ON public.sdr_analyses FOR INSERT TO authenticated
  WITH CHECK (
    sdr_id IN (
      SELECT id FROM public.collaborators WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete analyses"
  ON public.sdr_analyses FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));