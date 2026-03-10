
## 统一「令牌管理」与「调用日志」筛选栏

### 现状分析

**令牌管理（AdminTokens.tsx）当前筛选项：**
- 所属企业（EnterpriseCombobox 下拉搜索，已有）
- 创建人手机（Input，已有）
- 令牌名称（Input，已有）
- 密钥搜索（Input，已有）
- 重置按钮（已有）

**调用日志（AdminCallLogs.tsx）当前筛选项（UsageLogsTab）：**
- 企业名称（Input 文本搜索，已有）
- APIKey（Input，已有）
- 分组（表头内嵌 Select，已有）
- 类型（表头内嵌 Select，已有）
- 模型/IP（展开区 Input，已有）
- 重置按钮（已有）

**两个页面均缺少：**
- 所属组织（下拉）
- 模型名称（下拉，令牌管理页无）
- 状态/类型（下拉，令牌管理页无专用筛选，调用日志仅在表头内嵌）
- 级联：选企业后自动过滤组织列表

---

### 改造方案

#### 1. 提取共用 `AdminFilterBar` 组件
新建 `src/components/AdminFilterBar.tsx`，封装统一筛选栏，接受 props 控制哪些字段显示（令牌管理与调用日志在"状态/类型"的语义不同，但组件结构相同）。

不抽组件也可——直接在两个页面各自改写筛选区，保持逻辑内联，更易维护。选择**不抽共用组件**，分别改写，避免两页面差异导致 props 爆炸。

#### 2. AdminTokens.tsx — 新筛选栏

统一筛选维度（Row 1）：
```
[所属企业 Combobox] [所属组织 Combobox*] [创建人手机] [状态下拉] [重置]
```

*级联逻辑：当 `filterEnterpriseId` 选中后，组织 Combobox 自动过滤出该企业下的 organizations。需从 DB 加载 organizations 列表。

新增 state：
- `filterOrgId: string`
- `filterStatus: string`（all / active / disabled）
- `organizations: {id, name, enterprise_id}[]`（从 supabase 加载）

过滤逻辑追加：
- `filterOrgId` → `k.organization_id === filterOrgId`
- `filterStatus` → `k.status === filterStatus`

名称/密钥搜索保留在 Row 2，不变。

#### 3. AdminCallLogs.tsx — UsageLogsTab 新筛选栏

统一筛选维度（Row 1）：
```
[时间范围] [所属企业 Combobox] [所属组织 Combobox*] [创建人手机] [模型名称下拉] [类型下拉] [重置]
```

*级联逻辑：选企业后，组织列表过滤。由于调用日志是 mock 数据，企业/组织仅从 mock 数据中提取唯一值（或可从 supabase 加载真实企业/组织列表，与令牌管理保持一致）。

选择：**从 supabase 加载真实企业+组织列表**，级联逻辑同令牌管理，保持一致体验。

新增 state：
- `enterprises: {id, name}[]`（supabase 加载，UsageLogsTab 接收 props 或内部加载）
- `organizations: {id, name, enterprise_id}[]`（supabase 加载）
- `filterEnterpriseId: string`（代替原 `enterpriseSearch` 文本）
- `filterOrgId: string`
- `filterCreator: string`（新增）
- `filterModel: string`（新增，从 mock 数据提取或预设列表）

现有分组/类型表头内嵌 Select 保留，类型过滤同时被顶部筛选栏控制。

#### 4. 组织 Combobox 组件

复用 EnterpriseCombobox 的结构，新建 `OrgCombobox`（与 EnterpriseCombobox 相同逻辑，放在同文件或共享）。 级联逻辑：`filteredOrgs = organizations.filter(o => !filterEnterpriseId || o.enterprise_id === filterEnterpriseId)`。

#### 5. 重置逻辑

两个页面的重置按钮均清空所有筛选 state（含级联 orgId）。

---

### 文件修改
- **`src/pages/admin/AdminTokens.tsx`**：新增 organizations 加载；新增 `filterOrgId`、`filterStatus` state；filterBar Row 1 追加「所属组织」Combobox + 「状态」Select；过滤逻辑追加两个字段；handleReset 扩展。
- **`src/pages/admin/AdminCallLogs.tsx`**：UsageLogsTab 从 supabase 加载 enterprises + organizations；将文本 enterpriseSearch 升级为 EnterpriseCombobox；新增 OrgCombobox（级联）；新增创建人手机 Input；模型下拉（从 mock 数据提取）；类型下拉迁移至顶部筛选栏（表头内嵌保留）；重置扩展。
