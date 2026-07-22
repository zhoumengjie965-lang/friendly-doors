-- Add credit_limit (授信总额度) column to enterprise_balances.
-- credit_balance = remaining available credit; credit_limit = configured total credit line.
-- When admin sets credit_limit, credit_balance is also set to credit_limit (full reset).
-- A separate action "restore" sets credit_balance = credit_limit without changing the limit.

ALTER TABLE public.enterprise_balances
  ADD COLUMN IF NOT EXISTS credit_limit numeric NOT NULL DEFAULT 0;

-- Extend admin_recharge_enterprise:
-- p_type='credit' now treats p_amount as the new credit_limit (target total line).
-- It sets credit_limit = p_amount AND credit_balance = p_amount (full reset on save).
-- Add new RPC admin_restore_credit to reset credit_balance = credit_limit.

CREATE OR REPLACE FUNCTION public.admin_recharge_enterprise(
  p_enterprise_id UUID,
  p_amount NUMERIC,
  p_operator TEXT,
  p_remark TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'balance',
  p_extra_remark TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before NUMERIC;
  v_after NUMERIC;
  v_record_type TEXT;
  v_action_label TEXT;
  v_subject TEXT;
  v_system_remark TEXT;
  v_final_remark TEXT;
  v_existing RECORD;
  v_delta NUMERIC;
BEGIN
  SET LOCAL row_security = off;

  -- Ensure row exists
  SELECT balance, credit_balance, credit_limit INTO v_existing
  FROM public.enterprise_balances
  WHERE enterprise_id = p_enterprise_id;

  IF NOT FOUND THEN
    INSERT INTO public.enterprise_balances (enterprise_id, balance, credit_balance, credit_limit)
    VALUES (p_enterprise_id, 0, 0, 0);
    v_existing.balance := 0;
    v_existing.credit_balance := 0;
    v_existing.credit_limit := 0;
  END IF;

  IF p_type = 'credit' THEN
    -- p_amount is the new credit_limit. Save sets both limit and remaining to p_amount.
    v_record_type := 'credit_adjust';
    v_before := COALESCE(v_existing.credit_balance, 0);
    v_after := p_amount;
    v_delta := v_after - v_before;
    v_action_label := CASE WHEN v_delta >= 0 THEN '调增授信' ELSE '调减授信' END;
    v_subject := '授信额度';

    UPDATE public.enterprise_balances
    SET credit_limit = p_amount,
        credit_balance = p_amount,
        updated_at = now()
    WHERE enterprise_id = p_enterprise_id;
  ELSE
    v_record_type := 'recharge';
    v_before := COALESCE(v_existing.balance, 0);
    v_after := v_before + p_amount;
    v_delta := p_amount;
    v_action_label := CASE WHEN p_amount >= 0 THEN '充值' ELSE '扣减' END;
    v_subject := '余额';

    UPDATE public.enterprise_balances
    SET balance = v_after, updated_at = now()
    WHERE enterprise_id = p_enterprise_id;
  END IF;

  IF p_type = 'credit' THEN
    v_system_remark := format(
      '%s至 ¥%s',
      v_action_label,
      trim(to_char(v_after, '9999999990.00'))
    );
  ELSE
    v_system_remark := format(
      '%s ¥%s，%s由 ¥%s 调整至 ¥%s',
      v_action_label,
      trim(to_char(ABS(v_delta), '9999999990.00')),
      v_subject,
      trim(to_char(v_before, '9999999990.00')),
      trim(to_char(v_after, '9999999990.00'))
    );
  END IF;

  IF p_extra_remark IS NOT NULL AND length(trim(p_extra_remark)) > 0 THEN
    v_final_remark := v_system_remark || ' | ' || trim(p_extra_remark);
  ELSIF p_remark IS NOT NULL AND length(trim(p_remark)) > 0 THEN
    v_final_remark := v_system_remark || ' | ' || trim(p_remark);
  ELSE
    v_final_remark := v_system_remark;
  END IF;

  INSERT INTO public.balance_records (enterprise_id, amount, type, operator, remark)
  VALUES (p_enterprise_id, v_delta, v_record_type, p_operator, v_final_remark);
END;
$$;

-- Separate RPC: reset remaining credit to credit_limit (restore to configured line)
CREATE OR REPLACE FUNCTION public.admin_restore_credit(
  p_enterprise_id UUID,
  p_operator TEXT,
  p_extra_remark TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before NUMERIC;
  v_after NUMERIC;
  v_delta NUMERIC;
  v_system_remark TEXT;
  v_final_remark TEXT;
  v_existing RECORD;
BEGIN
  SET LOCAL row_security = off;

  SELECT credit_balance, credit_limit INTO v_existing
  FROM public.enterprise_balances
  WHERE enterprise_id = p_enterprise_id;

  IF NOT FOUND THEN
    INSERT INTO public.enterprise_balances (enterprise_id, balance, credit_balance, credit_limit)
    VALUES (p_enterprise_id, 0, 0, 0);
    v_before := 0;
    v_after := 0;
  ELSE
    v_before := COALESCE(v_existing.credit_balance, 0);
    v_after := COALESCE(v_existing.credit_limit, 0);
  END IF;

  v_delta := v_after - v_before;

  UPDATE public.enterprise_balances
  SET credit_balance = v_after, updated_at = now()
  WHERE enterprise_id = p_enterprise_id;

  v_system_remark := format(
    '恢复授信至 ¥%s',
    trim(to_char(v_after, '9999999990.00'))
  );

  IF p_extra_remark IS NOT NULL AND length(trim(p_extra_remark)) > 0 THEN
    v_final_remark := v_system_remark || ' | ' || trim(p_extra_remark);
  ELSE
    v_final_remark := v_system_remark;
  END IF;

  INSERT INTO public.balance_records (enterprise_id, amount, type, operator, remark)
  VALUES (p_enterprise_id, v_delta, 'credit_adjust', p_operator, v_final_remark);
END;
$$;
