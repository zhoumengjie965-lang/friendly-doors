-- New RPC: directly set credit_balance (remaining credit) to a target value,
-- WITHOUT changing credit_limit. Used by the admin "remaining credit" input.
-- p_new_balance is the target remaining credit.

CREATE OR REPLACE FUNCTION public.admin_set_credit_balance(
  p_enterprise_id UUID,
  p_new_balance NUMERIC,
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
  v_action_label TEXT;
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
  ELSE
    v_before := COALESCE(v_existing.credit_balance, 0);
  END IF;

  v_after := p_new_balance;
  v_delta := v_after - v_before;

  UPDATE public.enterprise_balances
  SET credit_balance = v_after, updated_at = now()
  WHERE enterprise_id = p_enterprise_id;

  v_action_label := CASE WHEN v_delta >= 0 THEN '恢复授信' ELSE '调减授信' END;
  v_system_remark := format(
    '%s至 ¥%s',
    v_action_label,
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
