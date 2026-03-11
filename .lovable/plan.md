
## API Key 管理页面 — 角色视图切换 + 差异化 UI

### 需求拆解
1. **右上角加三角色切换视图**（普通成员 / 组织管理员 / 企业管理员）——仅用于预览差异，不改变实际权限
2. **普通成员视图**：隐藏"我的/组织 API Key"切换 Tab 和组织选择框，直接显示我的 Key 列表
3. **组织管理员 & 企业管理员视图**：切换到"组织 API Key" Tab 时，顶部行2增加"组织"和"成员"两个快速筛选 Select

### 当前状态（ApiKeys.tsx）
- `role` prop 来自 `Workspace.tsx`，传入真实角色
- `canSeeOrgTab = role === "admin" || role === "org_admin"` 控制 Tab 显示
- 行2：胶囊 Tab + 组织选择框
- 行3：创建按钮 + 搜索栏
- 组织 Tab 有 `showCreator` 创建者列但没有成员筛选器

### 变更方案（仅改 `src/pages/ApiKeys.tsx`）

**1. 新增 `previewRole` state**（默认值 = `role` 实际角色）
```ts
const [previewRole, setPreviewRole] = useState(role);
```
用 `previewRole` 代替 `role` 驱动所有 UI 逻辑（`canSeeOrgTab`、Tab 显示、筛选器显示）

**2. 右上角视角切换** — 插入 header 区域（标题行右侧）
```
API Key 管理                    [普通成员] [组织管理员] [企业管理员]
```
三个按钮用胶囊 Tab 样式，点击切换 `previewRole`，同时：
- 切到"普通成员"时，强制 `setActiveTab("my")`

**3. 普通成员视角（previewRole === "member"）**
- 隐藏行2的胶囊 Tab 切换器
- 隐藏行2的组织选择框
- 行2整行隐藏（即 `canSeeOrgTab` 为 false）

**4. 组织 Tab 的组织/成员筛选框**
当 `activeTab === "org"` 且 `canSeeOrgTab` 时，在行3（创建按钮那行）左侧 + 搜索栏区域前，增加：
```
[组织 Select: 全部/各组织]  [成员 Select: 全部/各成员]
```
新增两个 state：`orgMemberFilter: string`、`orgNameFilter: string`（用于在已有 `selectedOrgId` 的基础上再筛成员，或者当企业管理员看全部 Key 时按组织筛）

**具体 UI 结构变化**

行1（标题行）右对齐加视角切换器：
```tsx
<div className="flex items-center justify-between mb-3">
  <h1 className="text-xl font-bold">API Key 管理</h1>
  {/* 视角切换 — 胶囊样式，三按钮 */}
  <div className="flex items-center bg-muted rounded-lg p-1 h-9">
    {["member","org_admin","admin"].map(r => (
      <button key={r} onClick={() => setPreviewRole(r)} className={...}>
        {r==="member"?"普通成员":r==="org_admin"?"组织管理员":"企业管理员"}
      </button>
    ))}
  </div>
</div>
```

行2（组织切换行）只在 `canSeeOrgTab` 时显示（不变）

行3（筛选/操作行）：当 `activeTab === "org"` 且 `canSeeOrgTab` 时，在创建按钮+搜索框同一行的最左侧插入组织（仅企业管理员，因组织管理员已经通过行2固定了组织）和成员两个 Select。
- 企业管理员：显示"组织"Select（全部 + 各组织）+ "成员"Select（全部 + 该组织成员）
- 组织管理员：仅显示"成员"Select（全部 + 该组织成员）

新增 state：
- `memberFilter: string`（默认 `"all"`）
- members 列表（`orgMembers: { phone: string; name: string }[]`）

`filterKeys` 函数补充 `memberFilter` 过滤条件（仅在 org Tab 生效）

**总变更量**：`src/pages/ApiKeys.tsx` 单文件
- 约 +15 行 state
- 行1标题区改为 flex justify-between，右侧加 3 按钮胶囊
- 行3 条件性插入 2 个 Select（组织 + 成员）
- `filterKeys` 加 memberFilter 条件
- `fetchOrgKeys` 同时拉取该组织成员列表存入 `orgMembers`
