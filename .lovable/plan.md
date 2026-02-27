
# 创建组织时支持邀请普通成员

## 问题分析

当前「创建组织」弹窗里的「指定组织管理员」板块固定了角色为 `org_admin`，无法邀请普通成员（`member`）。需要改造这个模块，让管理员可以选择邀请角色。

## 改造方案

将「指定组织管理员」区域改为「邀请初始成员」，并在手机号输入框旁边增加一个角色选择下拉框，支持选择：
- **组织管理员**（org_admin）
- **普通成员**（member）

邀请链接部分同样跟随角色选择变化（`invited_role` 参数用选中的角色）。

## 视觉变化

改造后的布局：
```
[ 手机号输入框          ] [ 角色下拉 ▼ ]
→ 将发送邀请并设为组织管理员
         — 或 —
🔗 生成邀请链接（角色：组织管理员）
```

角色下拉框选项：组织管理员 / 普通成员

标签文字从「指定组织管理员」改为「邀请初始成员（可选）」，更准确地反映功能。

## 技术实现

### 改动文件
仅修改 `src/components/CreateOrgDialog.tsx`：

1. **新增状态**：`inviteRole: "org_admin" | "member"`（默认 `org_admin`）
2. **手机号区域**：输入框 + 角色选择 Select 并排
3. **`handleGenerateLink`**：`invited_role` 改用 `inviteRole` 变量
4. **`handleCreate`** 里的邀请逻辑：`invited_role` 改用 `inviteRole`
5. **提示文字**：根据角色动态显示（如「将直接设为普通成员」）
6. **邀请链接描述**：动态显示当前选中角色名称

### 关键代码变化

```tsx
// 新增状态
const [inviteRole, setInviteRole] = useState<"org_admin" | "member">("org_admin");

// 手机号 + 角色并排
<div className="flex gap-2">
  <Input placeholder="请输入手机号" value={adminPhone} ... />
  <Select value={inviteRole} onValueChange={v => setInviteRole(v as any)}>
    <SelectTrigger className="w-32">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="org_admin">管理员</SelectItem>
      <SelectItem value="member">普通成员</SelectItem>
    </SelectContent>
  </Select>
</div>

// 生成链接时使用 inviteRole
invited_role: inviteRole,

// 创建时邀请逻辑使用 inviteRole
invited_role: inviteRole,
```

无数据库变更，仅前端改动。
