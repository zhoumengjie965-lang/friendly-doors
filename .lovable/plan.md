
# 「邀请中」操作菜单简化：改为单一「取消添加」按钮

## 改动内容

**文件：`src/pages/OrgGovernance.tsx`**

### 1. 修改 `revokeInvite` 函数（第 124-127 行）
将 `update({ status: "revoked" })` 改为直接 **DELETE** 该邀请记录，删除后从列表移除：

```ts
async function revokeInvite(inviteId: string) {
  await supabase.from("invitations").delete().eq("id", inviteId);
  fetchMembers();
  toast({ title: "已取消添加" });
}
```

### 2. 删除 `resendInvite` 函数（第 130-138 行）
整个函数不再需要，直接删除。

### 3. 简化下拉菜单（第 438-449 行）
将原来的两个菜单项（「重新发送」+ 分割线 + 「撤回邀请」）替换为单一的「取消添加」按钮：

```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem
    className="text-destructive focus:text-destructive"
    onClick={() => revokeInvite(inv.id)}
  >
    取消添加
  </DropdownMenuItem>
</DropdownMenuContent>
```

## 无数据库结构变更
直接对 `invitations` 表执行 DELETE，表的 RLS 策略目前不允许删除（只允许 UPDATE）。需要确认：当前 `invitations` 表是否有 DELETE 策略。

查看 RLS 策略：`invitations` 表目前只有 INSERT/UPDATE/SELECT，**没有 DELETE 策略**。

因此需要同步添加一条数据库迁移，允许删除邀请记录：

```sql
CREATE POLICY "Anyone can delete invitation"
ON public.invitations FOR DELETE
USING (true);
```

## 文件变更清单

| 文件 | 操作 |
|------|------|
| 数据库迁移 | 为 `invitations` 表添加 DELETE RLS 策略 |
| `src/pages/OrgGovernance.tsx` | 修改 `revokeInvite`、删除 `resendInvite`、简化下拉菜单 |
