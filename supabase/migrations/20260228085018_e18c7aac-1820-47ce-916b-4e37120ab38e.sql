
DROP POLICY IF EXISTS "Users can view own record" ON public.users;

CREATE POLICY "Anyone can view users"
ON public.users FOR SELECT
USING (true);
