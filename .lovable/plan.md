
# API Key 页面完整实现方案

## 功能概述

参考图1和图2，实现一个完整的 API Key 管理页面，包含：
1. **我的 Key 视图**（所有用户可见）：个人 API Key 的增删改查
2. **组织 Key 视图**（org_admin / admin 可见）：查看并管理组织内所有成员的 Key

---

## 页面结构

### Tab 切换（顶部）
```
[ 我的 API Key ]  [ 组织 API Key ]  ← 仅 org_admin / admin 可见
```

### 我的 API Key Tab（图1布局）

**搜索栏**：关键词搜索 + API Key 搜索 + 搜索/重置按钮

**操作栏**：`+ 创建 API Key` 按钮 + 右侧刷新图标

**表格列**：
| 列名 | 说明 |
|------|------|
| 名称 | 自定义名称 |
| 状态 | 启用（绿点）/ 禁用（红点），带筛选 |
| 剩余额度/总额度 | ¥0.00/¥0.00，无限额度显示"无限制" |
| 分组 | 所属分组名 |
| 过期时间 | 日期时间 / "永不过期" |
| API Key | 脱敏展示，带眼睛图标（显示/隐藏）和复制图标 |
| 可用模型 | 无限制 badge 或模型列表 |
| 创建时间 | 日期时间 |
| 操作 | 编辑（蓝）、删除（红）、禁用/启用（黄/绿）图标 |

**分页**：共 N 条记录，每页 10 条，跳至第 N 页

### 组织 API Key Tab
- 相同表格结构，额外增加"创建者"列（显示成员姓名）
- 可编辑、禁用/启用、删除任意成员的 Key

---

## 新增弹窗（图2）

**新增 API Keys 侧边抽屉（Sheet）**，包含三个区块：

**基本信息**
- * 名称：文本输入
- 分组：下拉选择（不选默认用户分组）
- * 过期时间：日期时间选择器
- 过期时间快捷设置：永不过期 / 一个月 / 一天 / 一小时（点击快速填充）

**额度设置**
- 金额：¥ 前缀数字输入
- 无限额度：Switch 开关（开启后金额输入禁用）

**访问限制**
- 模型限制列表：多选下拉（留空支持所有模型）
- IP 白名单：多行文本，一行一个IP

---

## 数据库设计

需要新建 `api_keys` 表：

```sql
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_value text NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 32)),
  status text NOT NULL DEFAULT 'active',  -- active / disabled
  total_quota numeric,                    -- NULL = 无限额度
  used_quota numeric NOT NULL DEFAULT 0,
  group_name text,
  expires_at timestamptz,                 -- NULL = 永不过期
  allowed_models text[],                  -- NULL = 无限制
  ip_whitelist text[],
  enterprise_id uuid NOT NULL,
  organization_id uuid,
  creator_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 创建者可以查看/修改自己的 key
CREATE POLICY "Creator can manage own keys" ON public.api_keys
  FOR ALL USING (creator_phone = current_setting('app.current_phone', true));

-- 同企业成员可以查看（组织管理员需要）
CREATE POLICY "Enterprise members can view keys" ON public.api_keys
  FOR SELECT USING (true);

-- 组织管理员可以更新/删除同组织的 key
CREATE POLICY "Org admin can manage org keys" ON public.api_keys
  FOR ALL USING (true);
```

---

## 文件改动清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `supabase/migrations/xxx_create_api_keys.sql` | 新建 | 建表 + RLS |
| `src/pages/ApiKeys.tsx` | 新建 | API Key 页面主体 |
| `src/pages/Workspace.tsx` | 修改 | 添加 `/workspace/keys` 路由渲染 ApiKeys 组件，并向其传入 `enterprise` 和 `role` |

---

## 技术实现要点

1. **API Key 脱敏显示**：前4位 + `**********` + 后4位，眼睛图标切换全文显示
2. **Tab 权限控制**：`role === "admin" || role === "org_admin"` 时才显示"组织 API Key" tab
3. **分页**：前端分页，每页10条，支持跳页
4. **搜索过滤**：关键词（名称模糊）+ API Key 模糊匹配，前端实时过滤
5. **状态筛选**：表头状态列带筛选下拉
6. **快捷过期时间**：永不过期（null）/ 一个月 / 一天 / 一小时 按钮
7. **无限额度 Switch**：开启时 `total_quota` 存 `null`，显示"无限制" badge

---

## 无需修改的文件

- `WorkspaceSidebar.tsx`（路由已存在）
- 所有 UI 基础组件
