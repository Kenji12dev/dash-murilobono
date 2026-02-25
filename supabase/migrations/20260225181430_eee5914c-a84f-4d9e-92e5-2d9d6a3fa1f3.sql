
-- Create monthly goals table for admin-set targets
CREATE TABLE public.monthly_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month integer NOT NULL,
  year integer NOT NULL,
  revenue_goal numeric NOT NULL DEFAULT 0,
  cash_goal numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view goals"
ON public.monthly_goals FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert goals"
ON public.monthly_goals FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update goals"
ON public.monthly_goals FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete goals"
ON public.monthly_goals FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_monthly_goals_updated_at
BEFORE UPDATE ON public.monthly_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
