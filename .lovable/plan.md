
# 修复 API Key 创建失败问题

## 根本原因

`set_current_phone` RPC 和 `INSERT api_keys` 是两次独立的 HTTP 请求，对应两个独立的数据库会话。`set_config('app.current_phone', ...)` 的作用域仅限于当前数据库会话，因此第二次请求（INSERT）时该配置已不存在，RLS 策略校验失败，返回 401。

## 解决方案

创建一个数据库函数 `create_api_key`，在**同一个数据库会话**中：
1. 先调用 `set_config` 设置 `app.current_phone`
2. 再执行 `INSERT INTO api_keys`

这样 RLS 策略在检查 `WITH CHECK` 时，`current_setting('app.current_phone')` 是有值的，验证通过。

对应的，编辑（UPDATE）和删除（DELETE）也需要类似的 RPC 函数来解决同样的问题。

## 技术实现

### 第一步：数据库迁移

创建三个 RPC 函数：

```sql
-- 创建 API Key
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
) RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- 更新 API Key
CREATE OR REPLACE FUNCTION public.update_api_key(
  p_phone text,
  p_id uuid,
  p_name text,
  p_group_name text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_total_quota numeric DEFAULT NULL,
  p_allowed_models text[] DEFAULT NULL,
  p_ip_whitelist text[] DEFAULT NULL
) RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- 删除 API Key
CREATE OR REPLACE FUNCTION public.delete_api_key(
  p_phone text,
  p_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.current_phone', p_phone, true);
  DELETE FROM api_keys WHERE id = p_id;
END;
$$;

-- 切换 API Key 状态
CREATE OR REPLACE FUNCTION public.toggle_api_key_status(
  p_phone text,
  p_id uuid,
  p_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.current_phone', p_phone, true);
  UPDATE api_keys SET status = p_status WHERE id = p_id;
END;
$$;
```

### 第二步：修改前端 `src/pages/ApiKeys.tsx`

将 `handleSave`、`handleDelete`、`handleToggleStatus` 中的直接 Supabase 表操作，替换为调用对应的 RPC 函数：

- `handleSave` (新建) → `supabase.rpc('create_api_key', {...})`
- `handleSave` (编辑) → `supabase.rpc('update_api_key', {...})`
- `handleDelete` → `supabase.rpc('delete_api_key', {...})`
- `handleToggleStatus` → `supabase.rpc('toggle_api_key_status', {...})`

同时移除已无用的 `setPhone` helper 函数。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `supabase/migrations/新迁移文件.sql` | 新增 4 个 RPC 函数 |
| `src/pages/ApiKeys.tsx` | 将写操作改为调用 RPC |
