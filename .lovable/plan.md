
# 问题诊断

## 核心矛盾

网络请求日志（09:57:50）清楚显示：
- 请求路径：`POST /rest/v1/api_keys` ← 直接插表
- **不是** `POST /rest/v1/rpc/create_api_key` ← 正确的 RPC 路径

但代码（第 246 行）明明是 `supabase.rpc("create_api_key" as any, {...})`。

这说明前端**浏览器加载的是旧版 JS**，新代码根本没有生效。

## 根本原因

存在两重问题：

1. **浏览器缓存**：用户加载的页面 JS 是旧版本（直接插表），新的 RPC 调用代码虽然已写入文件，但浏览器没有重新加载。

2. **迁移可能未生效**：`SET LOCAL row_security = off` 的函数定义迁移是在之前提交的，但前端日志时间（09:57:50）早于或等于迁移部署时间，函数可能没有被正确覆盖。

## 解决方案

### 两步走：

**第一步：强制前端重新构建** — 在 `ApiKeys.tsx` 中做一个有意义的代码改动（比如添加注释或轻微重构），触发 Vite 重新打包，让浏览器加载新 JS。

**第二步：彻底解决 RLS 问题** — 不再依赖 `SET LOCAL row_security = off`，改用更可靠的方案：**直接删除 `api_keys` 表上的写操作 RLS 策略**，改为只保留 SELECT 的 RLS 策略，写操作完全由 RPC 函数鉴权控制。这是最彻底的解法，不受连接池、会话变量等因素干扰。

### 具体实施

**数据库迁移**（新建一个迁移文件）：
```sql
-- 删除现有的 INSERT/UPDATE/DELETE RLS 策略（写操作由 RPC 函数本身控制）
DROP POLICY IF EXISTS "Creator can insert own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Creator can update own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Creator can delete own keys" ON public.api_keys;

-- 重新定义 RPC 函数，不用 SET LOCAL row_security，直接用 SECURITY DEFINER 绕过 RLS
-- （RLS 已无写策略，SECURITY DEFINER 函数天然可以写入）
```

**前端 `src/pages/ApiKeys.tsx`**：
- 移除第 210 行前后残留的 `setPhone` 调用（如果还有的话）
- 做微小的代码改动强制生成新的 JS bundle

## 涉及文件

| 文件 | 改动 |
|------|------|
| `supabase/migrations/新迁移.sql` | 删除 api_keys 表上的写 RLS 策略 |
| `src/pages/ApiKeys.tsx` | 移除残留的 `setPhone`，微小改动触发重新构建 |

## 安全性说明

删除写 RLS 策略是安全的，因为：
- `anon` 角色对 `api_keys` 表没有 GRANT 权限，直接插表本来就会失败
- 所有写操作只能通过 SECURITY DEFINER RPC 函数进行，函数内部做了 `creator_phone = p_phone` 的鉴权
- SELECT（读）的 RLS 策略保持不变，数据读取仍受保护
