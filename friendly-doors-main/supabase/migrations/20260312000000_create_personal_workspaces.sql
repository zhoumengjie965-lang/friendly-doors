-- Create personal_workspaces table for individual developers
CREATE TABLE public.personal_workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '我的空间',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.personal_workspaces
  ADD CONSTRAINT fk_personal_workspaces_user
  FOREIGN KEY (user_phone) REFERENCES public.users(phone)
  ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.personal_workspaces ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own personal workspace"
  ON public.personal_workspaces FOR SELECT
  USING (user_phone = current_setting('app.current_phone', true));

CREATE POLICY "Users can insert own personal workspace"
  ON public.personal_workspaces FOR INSERT
  WITH CHECK (user_phone = current_setting('app.current_phone', true));

CREATE POLICY "Users can update own personal workspace"
  ON public.personal_workspaces FOR UPDATE
  USING (user_phone = current_setting('app.current_phone', true));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_personal_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_personal_workspaces_updated_at
  BEFORE UPDATE ON public.personal_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_workspaces_updated_at();
