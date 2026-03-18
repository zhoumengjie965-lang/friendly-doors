ALTER TABLE public.members ADD COLUMN IF NOT EXISTS daily_limit numeric DEFAULT 2000;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';