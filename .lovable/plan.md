

## 调用日志页面——顶部全局筛选区固定到右上角

### 核心问题
两张图均指向同一个问题：企业/组织/成员的快速定位筛选器目前**分散在各 Tab 的内部筛选栏**，用户切换 Tab 时上下文丢失，且位置不突出。

图1（客户端）：右上角红框区 ← 组织/成员快速定位，跨 Tab 固定；  
图2（后台）：右上角红框区 ← 所属企业 + 所属组织 + 成员 快速定位，跨 Tab 固定。

### 方案

#### 客户端 `CallLogs.tsx`

**现状**：`当前组织` Select 仅在 `org_admin` 角色下、`调用日志` Tab 的上方标题区出现，且 `TaskLogsTab` 和 `AuditLogsTab` 完全无此上下文。

**改造**：
1. 将「当前组织/成员」选择器**提升到主页面标题行右侧**（与 role switcher 并列），位置固定，**三个 Tab 共享同一全局状态**：
   - `org_admin`：右上角显示 `当前组织` Select（已有）
   - `enterprise_admin`：右上角显示 `当前组织` Select（当前无，新增）
   - 普通成员：无额外筛选
2. 全局 state `filterOrg`（选定组织名）和 `filterMember`（成员）**从父组件统一持有**，以 props 传入三个 Tab。
3. 各 Tab 内部不再重复展示组织/成员筛选 → 从每个 Tab 的 filter bar 中**移除**组织/成员筛选项（调用日志 Tab 的「组织」/「成员」Select 下移或移除），改由顶层 context 驱动。
4. 右上角布局（右→左）：`[当前组织 Select*]` + `[role switcher]`，与图1红框位置对齐。

#### 管理端 `AdminCallLogs.tsx`

**现状**：企业/组织 FilterCombobox 在每个 Tab 的内部筛选栏中**各自独立存在**，标题行右侧为空。

**改造**：
1. 在 `AdminCallLogs` 父组件的**标题行右侧**（红框位置）新增三个全局筛选控件：
   - `所属企业` FilterCombobox
   - `所属组织` FilterCombobox（级联：选企业后自动过滤）
   - `创建人手机/用户名` Input
2. 全局 state：`globalEnterpriseId`、`globalOrgId`、`globalCreator` 在父组件持有，传入三个 Tab 作为 props。
3. 各 Tab 内部 filter bar **移除**企业/组织/创建人这三个控件（防重复），只保留 Tab 专有的过滤项（类型、模型、任务ID、执行状态、操作类型等）。
4. 顶部右侧控件区加一个小的 `× 重置全局` 按钮清除三个全局维度。

### 数据流变化

```text
客户端 CallLogs (parent)
  ├── filterOrg (string)  ← 右上角 Select
  ├── filterMember (string)  [org_admin时]
  ├─► CallLogsTab (props: filterOrg, filterMember)
  ├─► TaskLogsTab  (props: filterOrg)
  └─► AuditLogsTab (props: filterOrg)

AdminCallLogs (parent)
  ├── globalEnterpriseId + globalOrgId + globalCreator  ← 右上角 FilterCombobox×2 + Input
  ├─► CallLogsTab   (props: globalEnterpriseId, globalOrgId, globalCreator)
  ├─► TaskLogsTab   (props: globalEnterpriseId, globalOrgId)
  └─► AuditLogsTab  (props: globalEnterpriseId, globalOrgId, globalCreator)
```

### 标题行布局

**客户端**（右上角，现有布局已有 flex justify-between）：
```
[h1 调用日志 + subtitle]          [当前组织 Select*]  [role switcher]
                                   ↑ 红框区
* org_admin 或 enterprise_admin 时显示
```

**管理端**（右上角，现有 h1 无右侧内容）：
```
[h1 调用日志 + subtitle]    [所属企业▼] [所属组织▼] [创建人 Input] [× 重置]
                             ←————————— 红框区 ——————————→
```

### 文件修改
- `src/pages/CallLogs.tsx`：全局 `filterOrg`/`filterMember` state 提升；TaskLogsTab + AuditLogsTab 增加 org/member props 及过滤逻辑；右上角布局补充 enterprise_admin 组织 Select。
- `src/pages/admin/AdminCallLogs.tsx`：父组件新增全局三维 state + 加载 enterprises/organizations；右上角标题行新增三个全局筛选控件；三个 Tab 函数签名增加 props；各 Tab 内部 filter bar 移除企业/组织/创建人三项。
