-- ============================================
-- 完整数据库初始化脚本
-- 执行此脚本可重建所有表结构
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. 基础表
-- ============================================

-- Users table (maps to auth users via phone)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (phone = current_setting('app.current_phone', true));
CREATE POLICY "Admin can update users status" ON public.users FOR UPDATE USING (true);

-- Enterprises table
CREATE TABLE public.enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enterprise_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view enterprise" ON public.enterprises FOR SELECT USING (true);
CREATE POLICY "Anyone can create enterprise" ON public.enterprises FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner can update enterprise" ON public.enterprises FOR UPDATE USING (owner_phone = current_setting('app.current_phone', true));

-- Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  monthly_budget NUMERIC NULL,
  current_month_budget NUMERIC NULL,
  admin_phone TEXT NULL,
  parent_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert organization" ON public.organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update organization" ON public.organizations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete organization" ON public.organizations FOR DELETE USING (true);

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone TEXT NOT NULL,
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'org_admin')),
  daily_limit NUMERIC DEFAULT 2000,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_phone, enterprise_id)
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert member" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update member" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete member" ON public.members FOR DELETE USING (true);

-- Invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  inviter_phone TEXT NOT NULL,
  invitee_phone TEXT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  max_uses INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  invited_role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view invitations" ON public.invitations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert invitation" ON public.invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invitation" ON public.invitations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete invitation" ON public.invitations FOR DELETE USING (true);

-- ============================================
-- 2. 企业认证和财务表
-- ============================================

-- Enterprise certifications
CREATE TABLE public.enterprise_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL UNIQUE REFERENCES public.enterprises(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uncertified',
  company_name TEXT,
  credit_code TEXT,
  legal_person TEXT,
  business_license_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view certifications" ON public.enterprise_certifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert certification" ON public.enterprise_certifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update certification" ON public.enterprise_certifications FOR UPDATE USING (true);

-- Enterprise balances
CREATE TABLE public.enterprise_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_consumed NUMERIC NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  alert_threshold NUMERIC,
  alert_email TEXT,
  alert_method TEXT NOT NULL DEFAULT 'email',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enterprise_balances" ON public.enterprise_balances FOR SELECT USING (true);
CREATE POLICY "Anyone can insert enterprise_balances" ON public.enterprise_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update enterprise_balances" ON public.enterprise_balances FOR UPDATE USING (true);

-- Balance records
CREATE TABLE public.balance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'redeem_code',
  amount NUMERIC NOT NULL,
  operator TEXT,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view balance_records" ON public.balance_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert balance_records" ON public.balance_records FOR INSERT WITH CHECK (true);

-- Redeem codes
CREATE TABLE public.redeem_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'unused',
  used_by TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view redeem_codes" ON public.redeem_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can update redeem_codes" ON public.redeem_codes FOR UPDATE USING (true);

-- ============================================
-- 3. API Keys 表
-- ============================================

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_value TEXT NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 32)),
  status TEXT NOT NULL DEFAULT 'active',
  total_quota NUMERIC,
  used_quota NUMERIC NOT NULL DEFAULT 0,
  group_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  allowed_models TEXT[],
  ip_whitelist TEXT[],
  enterprise_id UUID NOT NULL,
  organization_id UUID,
  creator_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view api_keys" ON public.api_keys FOR SELECT USING (true);

-- Update trigger
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

-- ============================================
-- 4. 管理员表
-- ============================================

CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can read own record" ON public.admin_users FOR SELECT USING (phone = current_setting('app.current_phone', true));

-- ============================================
-- 5. RPC 函数
-- ============================================

-- Set current phone
CREATE OR REPLACE FUNCTION public.set_current_phone(phone text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT set_config('app.current_phone', phone, true);
$$;

-- API Key functions
CREATE OR REPLACE FUNCTION public.create_api_key(
  p_phone text,
  p_name text,
  p_enterprise_id uuid,
  p_group_name text DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_total_quota numeric DEFAULT NULL,
  p_allowed_models text[] DEFAULT NULL,
  p_ip_whitelist text[] DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
) RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result api_keys;
BEGIN
  SET LOCAL row_security = off;
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
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_total_quota numeric DEFAULT NULL,
  p_allowed_models text[] DEFAULT NULL,
  p_ip_whitelist text[] DEFAULT NULL
) RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result api_keys;
BEGIN
  SET LOCAL row_security = off;
  UPDATE api_keys SET
    name = p_name,
    group_name = p_group_name,
    expires_at = p_expires_at,
    total_quota = p_total_quota,
    allowed_models = p_allowed_models,
    ip_whitelist = p_ip_whitelist
  WHERE id = p_id AND creator_phone = p_phone
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_api_key(
  p_phone text,
  p_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SET LOCAL row_security = off;
  DELETE FROM api_keys WHERE id = p_id AND creator_phone = p_phone;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_api_key_status(
  p_phone text,
  p_id uuid,
  p_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SET LOCAL row_security = off;
  UPDATE api_keys SET status = p_status WHERE id = p_id AND creator_phone = p_phone;
END;
$$;

-- Admin functions
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
