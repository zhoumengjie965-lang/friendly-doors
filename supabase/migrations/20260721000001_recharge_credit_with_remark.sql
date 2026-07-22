-- Extend admin_recharge_enterprise to support credit line adjustment
-- and auto-generate system remark with before/after balance + operator.
-- p_type: 'balance' (default) adjusts enterprise_balances.balance, record type 'recharge'
--         'credit'  adjusts enterprise_balances.credit_balance, record type 'credit_adjust'
-- p_extra_remark: optional user-supplied note appended to the system-generated remark.

-- Add credit_balance column to enterprise_balances if not exists
ALTER TABLE public.enterprise_balances
  ADD COLUMN IF NOT EXISTS credit_balance numeric NOT NULL DEFAULT 0;

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
  v_system_remark TEXT;
  v_final_remark TEXT;
  v_existing RECORD;
BEGIN
  SET LOCAL row_security = off;

  IF p_type = 'credit' THEN
    v_record_type := 'credit_adjust';
    v_action_label := CASE WHEN p_amount >= 0 THEN '调增授信' ELSE '调减授信' END;
  ELSE
    v_record_type := 'recharge';
    v_action_label := CASE WHEN p_amount >= 0 THEN '充值' ELSE '扣减' END;
  END IF;

  -- Ensure row exists and read current value atomically
  SELECT balance, credit_balance INTO v_existing
  FROM public.enterprise_balances
  WHERE enterprise_id = p_enterprise_id;

  IF NOT FOUND THEN
    INSERT INTO public.enterprise_balances (enterprise_id, balance, credit_balance)
    VALUES (p_enterprise_id, 0, 0);
    v_before := 0;
  ELSE
    v_before := CASE WHEN p_type = 'credit' THEN COALESCE(v_existing.credit_balance, 0) ELSE COALESCE(v_existing.balance, 0) END;
  END IF;

  v_after := v_before + p_amount;

  -- Update the specific field
  IF p_type = 'credit' THEN
    UPDATE public.enterprise_balances
    SET credit_balance = v_after, updated_at = now()
    WHERE enterprise_id = p_enterprise_id;
  ELSE
    UPDATE public.enterprise_balances
    SET balance = v_after, updated_at = now()
    WHERE enterprise_id = p_enterprise_id;
  END IF;

  -- Build system remark: e.g. "管理员扣减 ¥11000.00，余额由 ¥100000.00 调整至 ¥89000.00"
  v_system_remark := format(
    '%s ¥%s，%s由 ¥%s 调整至 ¥%s',
    v_action_label,
    trim(to_char(ABS(p_amount), '9999999990.00')),
    CASE WHEN p_type = 'credit' THEN '授信额度' ELSE '余额' END,
    trim(to_char(v_before, '9999999990.00')),
    trim(to_char(v_after, '9999999990.00'))
  );

  -- Append extra remark if provided (p_extra_remark takes precedence; p_remark kept for backward compat)
  IF p_extra_remark IS NOT NULL AND length(trim(p_extra_remark)) > 0 THEN
    v_final_remark := v_system_remark || ' | ' || trim(p_extra_remark);
  ELSIF p_remark IS NOT NULL AND length(trim(p_remark)) > 0 THEN
    v_final_remark := v_system_remark || ' | ' || trim(p_remark);
  ELSE
    v_final_remark := v_system_remark;
  END IF;

  INSERT INTO public.balance_records (enterprise_id, amount, type, operator, remark)
  VALUES (p_enterprise_id, p_amount, v_record_type, p_operator, v_final_remark);
END;
$$;
