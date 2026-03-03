
-- Drop the admin-only delete policy and replace with one that allows all authenticated users
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;
CREATE POLICY "Authenticated users can delete sales"
  ON public.sales FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);
