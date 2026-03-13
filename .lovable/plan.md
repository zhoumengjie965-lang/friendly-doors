
## 需求分析

**第一步**：在组织管理员视角的「组织 API Key」Tab 下：
- 移除「创建 API Key」按钮
- 增加「配置 API Key」按钮，点击后弹出包含图1所有配置项（分组、过期时间、预算设置、访问限制）的 Sheet，顶部有提示语，保存后作为该组织成员新建 Key 的默认模板（存于前端 state，无需数据库，因为目前没有专门的 org_defaults 表）

**第二步**：「配置 API Key」按钮右侧增加「成员高级权限」按钮，点击弹出 Dialog，展示本部门成员列表，勾选的成员新建 Key 时走 Sheet 完整表单，未勾选的走简约 Dialog。

## 当前代码结构分析

- 行 721-762：「行3」—— 创建按钮 + 搜索栏，始终显示
- 行 259-269：`openCreate()` — 根据 `previewRole === "member"` 分支到 Dialog 或 Sheet
- 行 264-268：成员走 simpleDialogOpen，管理员走 sheetOpen

**关键逻辑**：
- `previewRole === "org_admin"` 且 `activeTab === "org"` 时，按钮区变化
- 「配置 API Key」的默认模板配置存入 `orgDefaultConfig` state
- 「成员高级权限」列表通过已有的 `orgMembers` state（成员数据来自 `fetchOrgKeys` 内部的成员查询）
- 勾选了高级权限的成员，其 phone 存入 `advancedMembers: Set<string>`；`openCreate()` 时判断 `phone in advancedMembers` 决定走 Sheet 还是 Dialog

## 修改方案（仅修改 `src/pages/ApiKeys.tsx`）

### 新增 State（约 166 行后）

```ts
// Org default config for org_admin
const [orgConfigOpen, setOrgConfigOpen] = useState(false);
const [orgConfigGroup, setOrgConfigGroup] = useState("");
const [orgConfigExpires, setOrgConfigExpires] = useState("");
const [orgConfigQuota, setOrgConfigQuota] = useState("");
const [orgConfigUnlimited, setOrgConfigUnlimited] = useState(true);
const [orgConfigModels, setOrgConfigModels] = useState<string[]>([]);
const [orgConfigIpWhitelist, setOrgConfigIpWhitelist] = useState("");

// Advanced member permissions
const [advancedPermOpen, setAdvancedPermOpen] = useState(false);
const [advancedMembers, setAdvancedMembers] = useState<Set<string>>(new Set());
```

### 修改 `openCreate()`

当 `previewRole === "member"` 时，检查当前用户 `phone` 是否在 `advancedMembers` 中：
- 在 → `setSheetOpen(true)`（并预填 orgDefaultConfig 的默认值）
- 不在 → `setSimpleDialogOpen(true)`

### 修改行 3 的按钮区（行 721-727）

条件渲染：
```
if (previewRole === "org_admin" && activeTab === "org"):
  显示「配置 API Key」按钮 + 「成员高级权限」按钮（不显示「创建 API Key」）
else:
  显示原来的「创建 API Key」按钮
```

### 新增「配置 API Key」Sheet

复用现有 Sheet 结构（不含名称字段），包含：
- 顶部说明文字：「该规则适用于所有组织内成员的新建 key 属性」
- 分组输入框
- 过期时间（含快捷按钮）
- 预算设置（预算上限 + 无限预算 Switch）
- 访问限制（模型限制 + IP 白名单）
- 底部取消/保存按钮

### 新增「成员高级权限」Dialog

```
Dialog (max-w-md):
  - 标题：成员高级权限管理
  - 说明：被勾选的成员在新建 Key 时将显示完整配置表单
  - 成员列表（来自 orgMembers state）：
    每行：Checkbox + 姓名 + 脱敏手机号
  - 底部：取消 / 保存
```

### 修改 `openCreate()` 中 member 分支

```ts
if (previewRole === "member") {
  // 先用 org 默认配置预填表单
  setFormGroup(orgConfigGroup);
  setFormExpires(orgConfigExpires);
  setFormQuota(orgConfigQuota);
  setFormUnlimited(orgConfigUnlimited);
  setFormModels([...orgConfigModels]);
  setFormIpWhitelist(orgConfigIpWhitelist);
  // 判断是否有高级权限
  if (phone && advancedMembers.has(phone)) {
    setSheetOpen(true);
  } else {
    setSimpleDialogOpen(true);
  }
}
```

## 文件改动汇总

**文件**：`src/pages/ApiKeys.tsx`
- 新增 ~10 行 state
- 修改 `openCreate()` ~8 行
- 修改行 3 按钮区 ~10 行（条件渲染）
- 新增「配置 API Key」Sheet ~80 行（复用现有 Sheet 结构去掉名称栏）
- 新增「成员高级权限」Dialog ~40 行
- 新增 Checkbox 导入

**总改动**：约 150 行
