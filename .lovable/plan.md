
## 部门管理新增「子部门」Tab 计划

### 目标
在 `OrgGovernance.tsx` 的成员管理 Card 中，增加「直属成员」/「下属子部门」两个 Tab 切换，支持子部门的展示与创建（纯前端 mock 数据演示）。

---

### 涉及文件
只修改 `src/pages/OrgGovernance.tsx`（不动 `CreateOrgDialog.tsx`，子部门弹窗是独立的局部 Dialog）

---

### 改动明细

#### 1. Mock 数据
在组件顶部添加常量，供子部门 Tab 默认展示用：
```ts
const MOCK_SUB_ORGS = [
  { id: "s1", name: "华东销售组", adminName: "张伟", memberCount: 8, monthlyBudget: 5000, consumed: 1240, status: "active" },
  { id: "s2", name: "技术支持组", adminName: "李晓梅", memberCount: 5, monthlyBudget: 3000, consumed: 3100, status: "active" },
  { id: "s3", name: "市场推广组", adminName: "王建国", memberCount: 12, monthlyBudget: 8000, consumed: 320, status: "active" },
];
```

#### 2. 新增 Tab 状态
```ts
const [activeTab, setActiveTab] = useState<"members" | "sub-orgs">("members");
const [showCreateSubOrg, setShowCreateSubOrg] = useState(false);
const [subOrgs, setSubOrgs] = useState(MOCK_SUB_ORGS);
// 子部门创建弹窗表单状态
const [subOrgName, setSubOrgName] = useState("");
const [subOrgBudget, setSubOrgBudget] = useState("");
const [subOrgAdminName, setSubOrgAdminName] = useState("");
const [subOrgAdminPhone, setSubOrgAdminPhone] = useState("");
```

#### 3. 成员管理 Card 改造
将原来 CardHeader 的标题改为 Tab 切换器 + 右侧动态按钮：

```
直属成员 | 下属子部门          [+ 添加成员] / [+ 创建子部门]
```

Tab 样式：蓝色下划线激活态，灰色文字非激活态（与图2一致）。

#### 4. Tab 内容切换

**`activeTab === "members"`**：
- 渲染现有的成员 Table（保持完全不变）

**`activeTab === "sub-orgs"`**：
- 渲染子部门 Table，列：
  - 组织名称
  - 管理员（姓名）
  - 成员数
  - 本月预算上限（`¥N` 或 `不限`）
  - 本月消耗预算（`¥N`）
  - 使用率（进度条 + 百分比）
  - 状态（正常/禁用 badge）
- 空态文案：「暂无下属部门」

#### 5. 创建子部门弹窗
点击「创建子部门」按钮触发局部 Dialog，字段：
- **子部门名称** `*`（必填）
- **本月预算上限（元）** `可选`，placeholder：留空表示不限制
- **设置部门管理员** `可选`，两个输入框并排：姓名 + 手机号

确认后将新记录 push 到 `subOrgs` state（mock），弹窗关闭，列表立即更新展示。

#### 6. 子部门行的操作菜单
每行末尾 `⋮` 菜单：
- 编辑子部门（空 toast 提示"功能开发中"）
- 禁用/启用（切换 status，立即反映在 badge）
- 分隔线
- 删除子部门（从 state 中移除，立即更新列表）

---

### 视觉对齐
- Tab 下划线激活样式与 image-151.png 一致
- 表格列顺序、字段名称与 image-151.png 一致（组织名称、管理员、成员数、本月预算上限、本月消耗预算、使用率、状态）
- 创建弹窗字段与 image-150.png 一致（组织名称、默认月预算、设置管理员）
- 所有 UI 文本中"组织"→"子部门"或"部门"

---

### 不改动的内容
- 所有数据库查询逻辑
- 成员管理 Tab 内的所有交互
- 编辑成员 Sheet
- 添加成员 Dialog
