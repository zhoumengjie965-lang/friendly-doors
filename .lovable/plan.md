
# 邀请链接落地页 /invite/:id

## 功能概述

创建一个公开访问的邀请落地页，用户通过邀请链接访问后可直接接受邀请加入企业/组织。

## 页面路由

在 `src/App.tsx` 新增：
```
<Route path="/invite/:id" element={<InvitePage />} />
```

放在 `<Route path="*">` 之前，无需登录即可访问。

## 数据加载逻辑

页面加载时通过 URL 中的 `:id`（即邀请记录的 `id`）查询 `invitations` 表，联查 `enterprises` 和 `organizations`，获取：
- 邀请人手机号（`inviter_phone`）
- 企业名称（`enterprises.name`）
- 组织名称（`organizations.name`）
- 角色（`invited_role`）
- 有效期（`expires_at`）
- 状态（`status`）

## 页面状态

| 状态 | 描述 | 展示 |
|------|------|------|
| loading | 加载中 | 骨架屏/spinner |
| valid | 邀请有效 | 完整卡片 + 按钮 |
| expired | 邀请已过期 | 提示文字，无按钮 |
| used | 已用完 | 提示文字 |
| invalid | ID不存在 | 404提示 |

## 视觉设计

背景：淡蓝色（`bg-blue-50` 或 `bg-slate-50`）
中心：白色圆角卡片，带 `shadow-lg`

卡片结构（从上到下）：
1. Logo（渐变蓝紫色图标）+ "AI 网关平台"
2. 分割线
3. 主标题：`[inviter_phone] 邀请你加入 [企业名称]`
4. 标签组：`所属组织：xxx` / `授予角色：组织管理员/普通成员`
5. 有效期小字
6. 主按钮：「接受邀请并加入」（渐变蓝紫色）
7. 次要链接：「已有账号？点此登录」

角色展示映射：
- `org_admin` → 组织管理员
- `member` → 普通成员
- `admin` → 企业管理员

## 交互逻辑

### 点击「接受邀请并加入」

```
检查 localStorage 是否有 ai_gateway_phone
  ├── 未登录 → 跳转 /login?invite=<id>
  └── 已登录 → 调用 joinByCode 或直接用 invitation id 接受
              → 成功：toast("加入成功") + 跳转 /onboarding
              → 失败：toast(错误信息)
```

### 登录页联动

登录页检查 URL 参数 `?invite=<id>`，登录成功后跳转回 `/invite/<id>` 完成接受流程（而非跳转 `/onboarding`）。

## 技术实现

### 新增文件
- `src/pages/InvitePage.tsx`

### 修改文件
- `src/App.tsx`：新增路由
- `src/pages/Login.tsx`：登录成功后检查 `?invite=` 参数并重定向

### 接受邀请的函数

使用现有 `src/lib/auth.ts` 中的 `acceptInvitation(invitationId, phone)` 函数直接处理。

### 数据查询

```typescript
const { data } = await supabase
  .from("invitations")
  .select("*, enterprises(name), organizations(name)")
  .eq("id", inviteId)
  .maybeSingle();
```

## 无数据库变更

所有逻辑基于现有表结构，无需迁移。
