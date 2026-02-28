
# 成员管理升级：姓名字段 + 双行显示 + 个人信息设置

## 需求概述

1. **数据库**：`users` 表增加 `name` 字段（可选）
2. **添加成员弹窗**：增加姓名输入框；移除「生成邀请链接」功能
3. **成员列表**：双行展示（第一行加粗姓名，第二行脱敏手机号）
4. **个人中心**：新增个人信息页，允许用户修改自己的姓名

---

## 数据库变更

### `users` 表新增 `name` 列

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;
```

无需 RLS 变更，用户已可查看/插入自己记录。需增加 UPDATE 策略允许用户更新自己的记录：

```sql
CREATE POLICY "Users can update own record"
ON public.users FOR UPDATE
USING (phone = current_setting('app.current_phone', true));
```

---

## 前端改动

### 1. 添加成员弹窗（`OrgGovernance.tsx`）

**改动：**
- 新增 `addName` 状态变量
- 在手机号输入框旁边/下方加一个「成员姓名（可选）」输入框
- 移除 `generateInviteLink()` 函数和「🔗 生成邀请链接」按钮
- `addMember()` 函数改造：添加时同时向 `users` 表 upsert 姓名（若已有记录则更新 name）
- 移除 `inviteLink` 相关状态和 UI

弹窗布局（参考图 image-41，移除生成链接按钮）：
```
┌─────────────────────────────────────────┐
│ 添加成员                              × │
│                                         │
│ 手机号                                  │
│ [请输入手机号                         ] │
│                                         │
│ 成员姓名（可选）                        │
│ [请输入姓名                           ] │
│                                         │
│ 指定角色                                │
│ ◉ 成员  ○ 管理员                       │
│                                         │
│ 单日上限（元）                          │
│ [2000                                 ] │
│                                         │
│                    [取消]  [添加]       │
└─────────────────────────────────────────┘
```

### 2. 成员列表双行展示（`OrgGovernance.tsx`）

成员列的 TableCell 从单行 `{m.user_phone}` 改为双行：

```tsx
<TableCell>
  <div className="flex flex-col gap-0.5">
    <span className="font-semibold text-sm">
      {/* 从 users 表缓存的 name，无则显示"—" */}
      {memberNames[m.user_phone] ?? "—"}
    </span>
    <span className="text-xs text-muted-foreground">
      {maskPhone(m.user_phone)}  {/* 182****5009 */}
    </span>
  </div>
</TableCell>
```

`maskPhone` 工具函数：
```ts
function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}
```

`memberNames` 通过批量查 `users` 表获取：
```ts
const phones = [...members.map(m => m.user_phone), ...pendingInvites.map(i => i.invitee_phone!)];
const { data } = await supabase.from("users").select("phone, name").in("phone", phones);
// 存入 Record<phone, name>
```

待邀请行同理展示脱敏手机号（姓名显示「—」直到对方注册）。

### 3. 个人信息设置页

**新增文件：`src/pages/Profile.tsx`**

简洁页面，包含：
- 当前手机号（只读显示）
- 姓名输入框（可编辑）
- 「保存」按钮

保存逻辑：
```ts
await supabase.from("users")
  .update({ name: newName })
  .eq("phone", currentPhone);
```

**`WorkspaceSidebar.tsx`** 中在侧边栏底部（退出登录旁）增加「个人信息」入口，或在 Workspace.tsx 右上角用户菜单中增加「个人信息」选项，点击后路由到 `/workspace/profile`。

**`Workspace.tsx`** 中：
- 注册 `/workspace/profile` 路由
- 在右上角用户菜单加「个人信息」菜单项

---

## 文件变更清单

| 文件 | 操作 | 内容 |
|------|------|------|
| 数据库迁移 | SQL | `users` 表加 `name` 列；加 UPDATE RLS 策略 |
| `src/pages/OrgGovernance.tsx` | 修改 | 双行成员展示、姓名输入、移除邀请链接入口 |
| `src/pages/Profile.tsx` | 新建 | 个人信息设置页 |
| `src/pages/Workspace.tsx` | 修改 | 添加 Profile 路由、用户菜单「个人信息」入口 |
| `src/components/WorkspaceSidebar.tsx` | 查看/可能修改 | 无需变动（路由已在 Workspace 里处理） |

---

## 无破坏性变更

- `name` 列默认为 `NULL`，现有用户不受影响
- 成员姓名未填写时显示「—」作为降级展示
- 姓名为用户自愿填写，不强制
