-- Add validation to admin_set_credit_limit: new credit_limit must not be less
-- than the current credit_balance (remaining credit), otherwise the remaining
-- credit would exceed the total credit line, which is an inconsistent state.

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
  v_current_balance NUMERIC;
BEGIN
  SET LOCAL row_security = off;

  SELECT credit_limit, credit_balance INTO v_existing
  FROM public.enterprise_balances
  WHERE enterprise_id = p_enterprise_id;

  IF NOT FOUND THEN
    INSERT INTO public.enterprise_balances (enterprise_id, balance, credit_balance, credit_limit)
    VALUES (p_enterprise_id, 0, 0, p_new_limit);
    v_before := 0;
    v_current_balance := 0;
  ELSE
    v_before := COALESCE(v_existing.credit_limit, 0);
    v_current_balance := COALESCE(v_existing.credit_balance, 0);

    -- Validation: new credit_limit must not be less than current credit_balance
    IF p_new_limit < v_current_balance THEN
      RAISE EXCEPTION '初始授信额度不能小于剩余授信额度 ¥%',
        trim(to_char(v_current_balance, '9999999990.00'));
    END IF;

    UPDATE public.enterprise_balances
    SET credit_limit = p_new_limit, updated_at = now()
    WHERE enterprise_id = p_enterprise_id;
  END IF;

  v_after := p_new_limit;
  v_delta := v_after - v_before;

  v_action_label := '调整初始授信';
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
