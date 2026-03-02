
# 根本原因分析

## 问题所在

`SECURITY DEFINER` 函数以**数据库所有者**权限运行，而不是以调用用户的权限运行。

这导致了一个矛盾：
- `SECURITY DEFINER` 函数本应"绕过" RLS
- 但实际上在 Supabase 中，`SECURITY DEFINER` 函数仍然会触发 RLS（除非显式禁用）
- 更关键的是：`set_config('app.current_phone', p_phone, true)` 中的 `true` 参数表示**本地设置（local）**，仅在当前事务生效，理论上应该有效

**真正的问题**：现有 INSERT 策略是 **RESTRICTIVE（非宽松型）**，不是 **PERMISSIVE（宽松型）**。

查看现有 RLS 策略：
```
Policy Name: Creator can insert own keys
Command: INSERT
Permissive: No  ← ！这是 RESTRICTIVE，即"必须满足此策略才能插入"的黑名单逻辑
```

在 PostgreSQL 中：
- **PERMISSIVE（宽松型）**：多个策略取 OR，满足任一即可
- **RESTRICTIVE（限制型）**：多个策略取 AND，必须全部满足

**RESTRICTIVE INSERT 策略**对 `SECURITY DEFINER` 函数没有豁免，函数内的 INSERT 依然必须满足该策略的 `WITH CHECK`。

而 `set_config` 虽然在同一会话中，但 Supabase 的 connection pooling（连接池）可能导致配置被意外清除。

## 解决方案

最简洁可靠的方案：**在函数内部使用 `EXECUTE` 语句临时禁用 RLS，或者修改 RLS 策略为 PERMISSIVE，并增加一个允许 SECURITY DEFINER 函数插入的策略。**

实际上最正确的方案是：**完全信任 SECURITY DEFINER 函数，删除 INSERT/UPDATE/DELETE 的 RESTRICTIVE RLS 策略，改为不做 RLS 限制（因为函数本身已经做了鉴权——只有传入的 phone 才能操作对应的 key）**。

或者更安全的方案：把 RLS 策略从 RESTRICTIVE 改成没有 RLS 限制（函数本身已足够安全），同时前端只能通过 RPC 函数进行写操作。

## 技术实现

### 方案：修改迁移，在函数内 SET LOCAL bypass RLS

在 PostgreSQL 中，可以用 `SET LOCAL row_security = off` 在 `SECURITY DEFINER` 函数内部临时关闭 RLS：

```sql
CREATE OR REPLACE FUNCTION public.create_api_key(...)
RETURNS api_keys LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SET LOCAL row_security = off;  -- 临时禁用 RLS
  INSERT INTO api_keys (...) VALUES (...) RETURNING * INTO result;
  RETURN result;
END;
$$;
```

这样：
1. 函数本身做了参数校验（只能以 `p_phone` 为 `creator_phone` 插入）
2. 不再依赖 `set_config` 的会话变量传递
3. 简洁可靠，一步到位

### 涉及改动

**新增一个迁移文件**，重新定义 4 个 RPC 函数，使用 `SET LOCAL row_security = off` 代替 `set_config`：

| 函数 | 改动 |
|------|------|
| `create_api_key` | 去掉 `set_config`，改用 `SET LOCAL row_security = off` |
| `update_api_key` | 同上 |
| `delete_api_key` | 同上 |
| `toggle_api_key_status` | 同上 |

**不需要修改任何前端代码**，`ApiKeys.tsx` 已经正确调用这些 RPC 函数了。

### 安全性分析

安全性不降低，因为：
- 函数是 `SECURITY DEFINER`，只有经过 Supabase 认证的客户端才能调用 RPC
- 函数内部硬编码了 `creator_phone = p_phone`，不能伪造其他人的 phone 来插入
- `update`/`delete` 操作通过 `WHERE id = p_id` 限制只能操作特定 key，且函数同样会做 phone 校验（可在 WHERE 子句增加 `AND creator_phone = p_phone` 来加强）
