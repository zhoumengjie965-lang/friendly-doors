ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE POLICY "Admin can update users status" ON public.users FOR UPDATE USING (true);