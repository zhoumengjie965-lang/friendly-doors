
## 问题定位

对比客户端截图 image-88（组织管理列表）和 image-87（详情页组织架构Tab），后台详情页的"组织架构"Tab 左侧组织列表信息太少：

**当前左侧**（每个组织只显示）：
- 组织名称
- 状态 badge
- 管理员手机（小字）
- 月预算 ¥xxx（小字）

**客户端 image-88 组织列表有**：
- 组织名称
- 组织管理员（姓名 + 手机）
- 成员数
- 本月预算上限
- 本月消耗预算
- 使用率（进度条）
- 状态

后台管理端的组织列表应该与客户端保持一致的信息密度。

---

## 修改方案

### 仅修改 `src/pages/admin/AdminEnterpriseDetail.tsx`

**1. 数据增强**：
- 利用已有的 `members` 数据，为每个组织计算 `memberCount`（按 `organization_id` 分组 count）
- `organizations` 已 select 了 `monthly_budget` 和 `current_month_budget`，可以直接计算使用率

**2. 左侧组织列表 UI 重构**：

将每个组织卡片从简单的 3 行小字改为信息丰富的展示，对照 image-88：

```
┌─────────────────────────────────┐
│ 算法部门              [已启用]   │
│ 组织管理员: 182****5009          │
│ 成员数: 1人                      │
│ 本月预算: ¥3000 / 已用 ¥0.00    │
│ 使用率: ████░░ 0%                │
└─────────────────────────────────┘
```

具体布局（左侧面板宽度从 240px 扩大到 280px）：
- 第一行：组织名（粗体）+ 状态 badge（右对齐）
- 第二行：组织管理员（姓名或脱敏手机，需从 users 表获取管理员姓名）
- 第三行：`{n} 名成员`
- 第四行：`本月预算 ¥{monthly_budget}`（如未设置显示"无限制"）
- 第五行：使用率进度条 + 百分比（`current_month_budget / monthly_budget`）

**3. 组织管理员姓名解析**：
`organizations.admin_phone` 已经有了，只需在 fetchAll 后，用现有的 `users` nameMap（已在成员姓名查询时构建）去反查 admin_phone 对应的姓名。但 admin_phone 可能不在 members 里，需要单独或合并查询：

```ts
// 合并所有需要查名字的手机号（members + org admin_phones）
const allPhones = [...new Set([
  ...rawMembers.map(m => m.user_phone),
  ...orgPhones  // admin_phone 列表
])];
const { data: users } = await supabase.from("users").select("phone,name").in("phone", allPhones);
```

**4. 计算成员数**：
```ts
// members 数据已有 organization_id，按组织分组计数
const orgMemberCount = rawMembers.reduce((acc, m) => {
  if (m.organization_id) acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

然后在 `Org` 接口添加 `memberCount?: number; adminName?: string;` 字段，渲染时使用。

**无需修改数据库，无需新增接口调用**，复用已有数据重新计算即可。
