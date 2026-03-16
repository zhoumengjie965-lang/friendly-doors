
CREATE OR REPLACE FUNCTION public.set_current_phone(phone text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT set_config('app.current_phone', phone, true);
$$;
