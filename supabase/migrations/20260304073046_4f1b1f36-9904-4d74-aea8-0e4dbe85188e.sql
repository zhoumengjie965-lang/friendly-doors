
-- Create admin_users table for platform administrators
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read own record"
  ON public.admin_users FOR SELECT
  USING (phone = current_setting('app.current_phone', true));

-- RPC: verify admin credentials
CREATE OR REPLACE FUNCTION public.verify_admin_login(p_phone TEXT, p_password_hash TEXT)
RETURNS TABLE(id UUID, phone TEXT, name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.phone, a.name, a.role
  FROM admin_users a
  WHERE a.phone = p_phone AND a.password_hash = p_password_hash;
END;
$$;

-- RPC: admin create redeem code
CREATE OR REPLACE FUNCTION public.admin_create_redeem_code(p_code TEXT, p_amount NUMERIC)
RETURNS redeem_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result redeem_codes;
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO redeem_codes (code, amount) VALUES (p_code, p_amount) RETURNING * INTO result;
  RETURN result;
END;
$$;

-- RPC: admin recharge enterprise balance
CREATE OR REPLACE FUNCTION public.admin_recharge_enterprise(
  p_enterprise_id UUID,
  p_amount NUMERIC,
  p_operator TEXT,
  p_remark TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO enterprise_balances (enterprise_id, balance)
  VALUES (p_enterprise_id, p_amount)
  ON CONFLICT (enterprise_id) DO UPDATE
    SET balance = enterprise_balances.balance + p_amount,
        updated_at = now();
  INSERT INTO balance_records (enterprise_id, amount, type, operator, remark)
  VALUES (p_enterprise_id, p_amount, 'recharge', p_operator, p_remark);
END;
$$;

-- RPC: admin review certification
CREATE OR REPLACE FUNCTION public.admin_review_certification(
  p_enterprise_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  UPDATE enterprise_certifications
  SET status = p_status, reviewed_at = now()
  WHERE enterprise_id = p_enterprise_id;
END;
$$;
