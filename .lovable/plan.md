
# 成员管理「邀请中」状态增强方案

## 核心目标

在组织治理的成员管理表格中，将**待接受邀请的用户**作为独立行展示，配有橙色「邀请中」状态标签，并支持管理员一键撤回或重新发送邀请。

---

## 数据模型理解

当前表格只显示 `members` 表的数据（已加入成员）。邀请中的用户存在于 `invitations` 表但尚未出现在 `members` 表。

需要在同一个表格中**合并展示**两类数据：
- `members` 表：已加入成员（正常 / 禁用）
- `invitations` 表：邀请中（`status = 'pending'`，未过期，且 `organization_id` = 当前组织）

---

## 视觉设计

### 状态标签对比

| 状态 | 颜色 | 样式 |
|------|------|------|
| 正常 | 绿色 | 绿色边框 + 绿色文字 |
| 禁用 | 灰色 | 灰色边框 + 灰色文字 |
| **邀请中** | 橙色/黄色 | 橙色边框 + 橙色文字 |

### 邀请中行的额外细节
- **成员列**：显示被邀请手机号（`invitee_phone`），若是链接邀请（invitee_phone 为空）显示「链接邀请」
- **角色列**：显示 `invited_role` 对应的角色标签
- **今日消耗 / 本月消耗 / 单日上限**：均显示 `—`
- **状态列**：
  - 橙色「邀请中」Badge
  - Badge 下方一行灰色小字：
    - 链接邀请 → `链接 Xh 后过期`（动态计算剩余小时）
    - 手机号邀请 → `邀请 X 天前发送`

### 操作菜单（邀请中行）
与已加入成员不同，邀请中行的 `…` 菜单显示：
- **撤回邀请**（红色，删除该 invitation 记录）
- **重新发送** → 对于手机号邀请：重置 `expires_at`（延长 7 天）并 toast 提示；对于链接邀请：重新复制链接到剪贴板

---

## 技术实现

### 1. 新增数据类型

```typescript
interface PendingInvite {
  id: string;
  invitee_phone: string | null;
  invited_role: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
}
```

### 2. fetchMembers 同时拉取 invitations

在 `fetchMembers()` 中新增一个查询，获取当前组织中 `status = 'pending'` 且 `expires_at > now` 的邀请记录，存入 `pendingInvites` state。

```typescript
const { data: invData } = await supabase
  .from("invitations")
  .select("*")
  .eq("organization_id", selectedOrgId)
  .eq("status", "pending")
  .gt("expires_at", new Date().toISOString());
setPendingInvites(invData ?? []);
```

### 3. 撤回邀请

```typescript
async function revokeInvite(inviteId: string) {
  await supabase.from("invitations").update({ status: "revoked" }).eq("id", inviteId);
  fetchMembers();
  toast({ title: "邀请已撤回" });
}
```

### 4. 重新发送

```typescript
async function resendInvite(inv: PendingInvite) {
  if (inv.invitee_phone) {
    // 手机号邀请：延长有效期
    await supabase.from("invitations")
      .update({ expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString() })
      .eq("id", inv.id);
    toast({ title: "邀请已重新发送", description: `有效期延长至 7 天后` });
  } else {
    // 链接邀请：复制链接
    const link = `${window.location.origin}/workspace/join?code=${inv.invite_code}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "邀请链接已复制" });
  }
}
```

### 5. 过期时间计算

```typescript
function formatExpiry(expiresAt: string): string {
  const hours = Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600000);
  if (hours <= 0) return "已过期";
  if (hours < 24) return `链接 ${hours}h 后过期`;
  return `链接 ${Math.round(hours / 24)} 天后过期`;
}
```

### 6. 表格渲染

在 `members.map(...)` 之后，追加 `pendingInvites.map(...)` 渲染邀请行，两者共享同一 `<TableBody>`，视觉上连续。

---

## 改动范围

**仅修改一个文件**：`src/pages/OrgGovernance.tsx`

- 新增 `pendingInvites` state 和 `PendingInvite` interface
- `fetchMembers()` 中增加 invitations 查询
- 新增 `revokeInvite()`、`resendInvite()`、`formatExpiry()` 函数
- `statusBadge` 增加邀请中样式
- 表格 `TableBody` 中追加邀请行渲染（含过期小字 + 操作菜单）

无数据库结构变更，无新文件。
