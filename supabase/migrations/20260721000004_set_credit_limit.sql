-- New RPC: update credit_limit (initial total credit line) without touching credit_balance.
-- Used by the admin "adjust initial credit limit" secondary action.

CREATE OR REPLACE FUNCTION public.admin_set_credit_limit(
  p_enterprise_id UUID,
  p_new_limit NUMERIC,
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

  SELECT credit_limit INTO v_existing
  FROM public.enterprise_balances
  WHERE enterprise_id = p_enterprise_id;

  IF NOT FOUND THEN
    INSERT INTO public.enterprise_balances (enterprise_id, balance, credit_balance, credit_limit)
    VALUES (p_enterprise_id, 0, 0, p_new_limit);
    v_before := 0;
  ELSE
    v_before := COALESCE(v_existing.credit_limit, 0);

    UPDATE public.enterprise_balances
    SET credit_limit = p_new_limit, updated_at = now()
    WHERE enterprise_id = p_enterprise_id;
  END IF;

  v_after := p_new_limit;
  v_delta := v_after - v_before;

  v_action_label := CASE WHEN v_delta >= 0 THEN '调增初始授信' ELSE '调减初始授信' END;
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
