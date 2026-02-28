
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;

CREATE POLICY "Users can update own record"
ON public.users FOR UPDATE
USING (phone = current_setting('app.current_phone', true));
