-- Key 配置模板表
CREATE TABLE IF NOT EXISTS public.key_config_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- organizations 表加 key_template_id 字段
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS key_template_id UUID
  REFERENCES public.key_config_templates(id) ON DELETE SET NULL;

-- RLS：启用
ALTER TABLE public.key_config_templates ENABLE ROW LEVEL SECURITY;

-- RLS 策略：企业成员可看本企业模板
CREATE POLICY "select_enterprise_templates" ON public.key_config_templates
  FOR SELECT USING (
    enterprise_id IN (
      SELECT enterprise_id FROM public.members
      WHERE user_phone = current_setting('app.current_phone', true)
    )
  );

-- RPC: 列出企业下所有模板及绑定部门数
CREATE OR REPLACE FUNCTION public.list_key_templates(p_enterprise_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  config jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  bound_orgs bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN QUERY
  SELECT
    t.id, t.name, t.description, t.config, t.created_at, t.updated_at,
    (SELECT count(*) FROM organizations o WHERE o.key_template_id = t.id) AS bound_orgs
  FROM key_config_templates t
  WHERE t.enterprise_id = p_enterprise_id
  ORDER BY t.created_at ASC;
END;
$$;

-- RPC: 创建模板
CREATE OR REPLACE FUNCTION public.create_key_template(
  p_enterprise_id uuid,
  p_name text,
  p_description text,
  p_config jsonb,
  p_bound_org_ids uuid[]
) RETURNS public.key_config_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.key_config_templates;
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO key_config_templates (enterprise_id, name, description, config)
  VALUES (p_enterprise_id, p_name, p_description, p_config)
  RETURNING * INTO result;

  -- 绑定部门：先把这些部门从其他模板解绑，再绑到新模板
  IF p_bound_org_ids IS NOT NULL AND array_length(p_bound_org_ids, 1) > 0 THEN
    UPDATE organizations SET key_template_id = NULL
    WHERE enterprise_id = p_enterprise_id AND key_template_id IS NOT NULL
      AND id = ANY(p_bound_org_ids);
    UPDATE organizations SET key_template_id = result.id
    WHERE enterprise_id = p_enterprise_id AND id = ANY(p_bound_org_ids);
  END IF;

  RETURN result;
END;
$$;

-- RPC: 更新模板
CREATE OR REPLACE FUNCTION public.update_key_template(
  p_id uuid,
  p_name text,
  p_description text,
  p_config jsonb,
  p_bound_org_ids uuid[]
) RETURNS public.key_config_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.key_config_templates;
  v_enterprise_id uuid;
BEGIN
  SET LOCAL row_security = off;
  SELECT enterprise_id INTO v_enterprise_id FROM key_config_templates WHERE id = p_id;

  UPDATE key_config_templates
  SET name = p_name, description = p_description, config = p_config, updated_at = now()
  WHERE id = p_id RETURNING * INTO result;

  -- 重新计算绑定：
  -- 1) 原来绑在本模板但不在新列表里的部门 → 解绑
  UPDATE organizations SET key_template_id = NULL
  WHERE enterprise_id = v_enterprise_id AND key_template_id = p_id
    AND (p_bound_org_ids IS NULL OR id <> ALL(p_bound_org_ids));
  -- 2) 新列表里的部门 → 先从其他模板解绑，再绑到本模板
  IF p_bound_org_ids IS NOT NULL AND array_length(p_bound_org_ids, 1) > 0 THEN
    UPDATE organizations SET key_template_id = NULL
    WHERE enterprise_id = v_enterprise_id AND key_template_id IS NOT NULL
      AND key_template_id <> p_id AND id = ANY(p_bound_org_ids);
    UPDATE organizations SET key_template_id = p_id
    WHERE enterprise_id = v_enterprise_id AND id = ANY(p_bound_org_ids);
  END IF;

  RETURN result;
END;
$$;

-- RPC: 删除模板
CREATE OR REPLACE FUNCTION public.delete_key_template(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SET LOCAL row_security = off;
  -- 绑定部门会因 ON DELETE SET NULL 自动解绑
  DELETE FROM key_config_templates WHERE id = p_id;
END;
$$;

-- RPC: 复制模板
CREATE OR REPLACE FUNCTION public.copy_key_template(p_id uuid)
RETURNS public.key_config_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.key_config_templates;
  orig public.key_config_templates;
BEGIN
  SET LOCAL row_security = off;
  SELECT * INTO orig FROM key_config_templates WHERE id = p_id;
  INSERT INTO key_config_templates (enterprise_id, name, description, config, created_by)
  VALUES (orig.enterprise_id, orig.name || '（副本）', orig.description, orig.config, orig.created_by)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- RPC: 获取成员所属部门绑定的模板（建 Key 时用）
CREATE OR REPLACE FUNCTION public.get_member_key_template(
  p_phone text,
  p_enterprise_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_template_id uuid;
  v_config jsonb;
BEGIN
  SET LOCAL row_security = off;
  SELECT organization_id INTO v_org_id FROM members
  WHERE user_phone = p_phone AND enterprise_id = p_enterprise_id AND status = 'active'
  ORDER BY created_at ASC LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT key_template_id INTO v_template_id FROM organizations WHERE id = v_org_id;
  IF v_template_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT config INTO v_config FROM key_config_templates WHERE id = v_template_id;
  RETURN v_config;
END;
$$;

-- RPC: 获取指定部门绑定的模板（admin 在部门 Tab 建 Key 时用）
CREATE OR REPLACE FUNCTION public.get_org_key_template(p_org_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_template_id uuid;
  v_config jsonb;
BEGIN
  SET LOCAL row_security = off;
  SELECT key_template_id INTO v_template_id FROM organizations WHERE id = p_org_id;
  IF v_template_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT config INTO v_config FROM key_config_templates WHERE id = v_template_id;
  RETURN v_config;
END;
$$;
