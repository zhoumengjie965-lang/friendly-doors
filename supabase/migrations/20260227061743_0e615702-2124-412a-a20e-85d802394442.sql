
-- enterprise_balances table
CREATE TABLE public.enterprise_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_consumed numeric NOT NULL DEFAULT 0,
  request_count integer NOT NULL DEFAULT 0,
  alert_threshold numeric,
  alert_email text,
  alert_method text NOT NULL DEFAULT 'email',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enterprise_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enterprise_balances" ON public.enterprise_balances FOR SELECT USING (true);
CREATE POLICY "Anyone can insert enterprise_balances" ON public.enterprise_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update enterprise_balances" ON public.enterprise_balances FOR UPDATE USING (true);

-- balance_records table
CREATE TABLE public.balance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'redeem_code',
  amount numeric NOT NULL,
  operator text,
  remark text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.balance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view balance_records" ON public.balance_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert balance_records" ON public.balance_records FOR INSERT WITH CHECK (true);

-- redeem_codes table
CREATE TABLE public.redeem_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'unused',
  used_by text,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view redeem_codes" ON public.redeem_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can update redeem_codes" ON public.redeem_codes FOR UPDATE USING (true);
