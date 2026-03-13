
## 目标

在 `AdminEnterpriseDetail.tsx` 的「组织架构」Tab 右侧面板（lines 648-734）中，增加二级 Tabs 切换：**直属成员** / **下属子部门**，并实现自动过滤逻辑。

---

## 数据模型分析

- `orgs` 数组：所有组织，来自 `organizations` 表，有 `id` / `name` / `admin_phone` / `monthly_budget` / `current_month_budget` / `memberCount` / `adminName`
- `orgMembers`：当前选中 org 下的成员，通过 `members.filter(m => m.organization_id === selectedOrgId)` 得到
- **子部门**：`organizations` 表中有层级关系吗？→ 当前表结构没有 `parent_id`，因此子部门为同企业内、非 selectedOrg 的其他 orgs（实际上在管理后台，所有 orgs 都是同一层级）

> 由于 `organizations` 表目前无 `parent_id` 字段，「下属子部门」在此管理后台上下文里，展示的是**该企业所有其他部门**（即排除当前选中部门本身的其他组织）。等效于：当选中某个 org 时，右侧「下属子部门」展示同企业下其他 orgs 列表。

---

## 改动范围（仅 `src/pages/admin/AdminEnterpriseDetail.tsx`）

### 1. 新增 state（line ~150）
```ts
const [orgRightTab, setOrgRightTab] = useState<"members" | "sub-orgs">("members");
```
每次切换 `selectedOrgId` 时，重置 `orgRightTab`（用 `useEffect`）。

### 2. 自动 Tab 切换逻辑（在右侧面板渲染前计算）
```ts
const subOrgs = orgs.filter(o => o.id !== selectedOrgId);
const hasMembers = orgMembers.length > 0;
const hasSubOrgs = subOrgs.length > 0;

// 自动选中逻辑（每次 selectedOrgId 改变时）
useEffect(() => {
  if (!hasMembers && hasSubOrgs) setOrgRightTab("sub-orgs");
  else setOrgRightTab("members");
}, [selectedOrgId]);
```

### 3. 右侧面板 Header 改造（line 649-654）

原本只有文字标题，改为：
- 左侧：部门名称
- 右侧：条件性显示 Tabs（`直属成员` / `下属子部门`）
  - 若 `!hasSubOrgs`：只显示"直属成员"标题，不显示 Tabs
  - 若 `hasSubOrgs`：显示两个 Tab（Tab 按钮用小型 inline 样式）

### 4. 内容区域按 Tab 渲染

**直属成员**（沿用现有 lines 657-733）：成员、角色、单日上限、状态、操作

**下属子部门**（新增）：
```
列：部门名称 | 管理员 | 本月预算上限 | 使用率(进度条)
```
- 部门名称：名称 + 状态 Badge
- 管理员：adminName + 脱敏手机号，或"未设置"
- 本月预算上限：`¥{budget}` 或"无限制"
- 使用率：Progress 条（`current_month_budget / monthly_budget`，暂无实际消耗数据则显示 0%）

### 5. 自动隐藏逻辑

- `!hasSubOrgs` → 不渲染"下属子部门"Tab trigger（自动隐藏）
- `!hasMembers && hasSubOrgs` → 默认激活"下属子部门" Tab

---

## 修改位置一览

| 位置 | 描述 |
|------|------|
| ~line 121 | 新增 `orgRightTab` state |
| ~line 345 后 | 计算 `subOrgs`、`hasMembers`、`hasSubOrgs` |
| ~line 220 后 | 新增 `useEffect` 监听 `selectedOrgId` 重置 tab |
| lines 648-734 | 右侧面板全面改造：加入内联 Tabs + 子部门列表 |
