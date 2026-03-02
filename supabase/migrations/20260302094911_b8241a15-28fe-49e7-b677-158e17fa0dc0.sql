
CREATE OR REPLACE FUNCTION public.create_api_key(
  p_phone text,
  p_name text,
  p_enterprise_id uuid,
  p_group_name text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_total_quota numeric DEFAULT NULL,
  p_allowed_models text[] DEFAULT NULL,
  p_ip_whitelist text[] DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
) RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result api_keys;
BEGIN
  PERFORM set_config('app.current_phone', p_phone, true);
  INSERT INTO api_keys (
    name, enterprise_id, creator_phone,
    group_name, expires_at, total_quota,
    allowed_models, ip_whitelist, organization_id
  ) VALUES (
    p_name, p_enterprise_id, p_phone,
    p_group_name, p_expires_at, p_total_quota,
    p_allowed_models, p_ip_whitelist, p_organization_id
  ) RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_api_key(
  p_phone text,
  p_id uuid,
  p_name text,
  p_group_name text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_total_quota numeric DEFAULT NULL,
  p_allowed_models text[] DEFAULT NULL,
  p_ip_whitelist text[] DEFAULT NULL
) RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result api_keys;
BEGIN
  PERFORM set_config('app.current_phone', p_phone, true);
  UPDATE api_keys SET
    name = p_name,
    group_name = p_group_name,
    expires_at = p_expires_at,
    total_quota = p_total_quota,
    allowed_models = p_allowed_models,
    ip_whitelist = p_ip_whitelist
  WHERE id = p_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_api_key(
  p_phone text,
  p_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.current_phone', p_phone, true);
  DELETE FROM api_keys WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_api_key_status(
  p_phone text,
  p_id uuid,
  p_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.current_phone', p_phone, true);
  UPDATE api_keys SET status = p_status WHERE id = p_id;
END;
$$;
