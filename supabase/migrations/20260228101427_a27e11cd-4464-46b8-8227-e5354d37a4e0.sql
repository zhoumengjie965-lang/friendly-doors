
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_value text NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 32)),
  status text NOT NULL DEFAULT 'active',
  total_quota numeric,
  used_quota numeric NOT NULL DEFAULT 0,
  group_name text,
  expires_at timestamptz,
  allowed_models text[],
  ip_whitelist text[],
  enterprise_id uuid NOT NULL,
  organization_id uuid,
  creator_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view api_keys" ON public.api_keys
  FOR SELECT USING (true);

CREATE POLICY "Creator can insert own keys" ON public.api_keys
  FOR INSERT WITH CHECK (creator_phone = current_setting('app.current_phone', true));

CREATE POLICY "Creator can update own keys" ON public.api_keys
  FOR UPDATE USING (creator_phone = current_setting('app.current_phone', true));

CREATE POLICY "Creator can delete own keys" ON public.api_keys
  FOR DELETE USING (creator_phone = current_setting('app.current_phone', true));

CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_api_keys_updated_at();
