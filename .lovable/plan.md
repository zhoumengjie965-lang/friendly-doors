
## 新增「生产 API Key」Tab 计划

### 目标
仅在 `previewRole === "org_admin"` 时显示第三个 Tab「生产 API Key」，允许部门管理员创建不关联具体成员的部门级生产 Key。

---

### 涉及文件
只修改 `src/pages/ApiKeys.tsx`

---

### 改动明细

#### 1. 新增状态
```
const [prodKeys, setProdKeys] = useState<ApiKey[]>([]);
const [prodPage, setProdPage] = useState(1);
// 生产 Key 创建弹窗专用预算类型
const [formBudgetType, setFormBudgetType] = useState<"monthly" | "daily">("monthly");
// 标记当前是否从 prod tab 触发创建
const [creatingProd, setCreatingProd] = useState(false);
```

#### 2. 数据拉取
新增 `fetchProdKeys`，逻辑与 `fetchOrgKeys` 相同（同一企业/部门下所有 keys），但仅在 `activeTab === "prod"` 时调用。生产环境 Key 本质上是部门管理员用自己身份创建的 Key（`creator_phone === phone`，且 `group_name === "生产通道"`），前端以 `group_name === "生产通道"` 作为筛选条件展示。

> 注：暂无独立数据库字段区分「生产 Key」，用 `group_name = "生产通道"` 作为标识（与现有分组选项一致）。

#### 3. Tab 切换器（行2胶囊）
在 `canSeeOrgTab && previewRole === "org_admin"` 时，在「部门 API Key」后追加第三个按钮：
```
<button onClick={() => { setActiveTab("prod"); fetchProdKeys(); }}>生产 API Key</button>
```

#### 4. 创建按钮（行3）
在 `activeTab === "prod"` 时，左侧显示蓝色「创建 API Key」按钮，点击打开 Sheet（`sheetOpen`），并标记 `creatingProd = true`、预填 `formGroup = "生产通道"`。

#### 5. 创建 Sheet 新增「Key 预算上限」字段
在「预算设置」节区顶部，新增一行**突出样式**的预算上限配置：
- 左侧 Label：`Key 预算上限`（加粗，标红星必填提示）
- 右侧：`Select`（月度 / 单日）+ 数字输入框（¥）+ 无限额度 Switch，三者横向排布
- 位于原「预算上限」行之上，原有行保留（或合并展示）

实际上将现有的「预算上限」行升级：增加 月度/单日 的 `Select`，整行视觉上更突出（字体加粗、蓝色边框背景区块）。

当 `creatingProd === true` 时，该行标注 **"此预算直接占用本部门整体预算"** 的说明文字。

#### 6. 表格展示
```
{activeTab === "prod" && previewRole === "org_admin" && (
  <KeyTable
    keys={prodKeys}
    filterFn={(keys) => filterKeys(keys, false)}
    showCreator={false}
    showOrg={false}
    page={prodPage}
    setPage={setProdPage}
  />
)}
```

#### 7. 底部提示语
在 `activeTab === "prod"` 的表格下方（`KeyTable` 之后）追加：
```
<p className="text-xs text-muted-foreground mt-4 text-center">
  生产环境专用 Key，未来将支持基于终端用户的精细化限流与审计统计。
</p>
```

#### 8. handleSave 兼容
`handleSave` 完成后，若 `creatingProd` 为 true，则追加调用 `fetchProdKeys()` 并重置 `creatingProd = false`。

---

### 数据说明
- 生产 Key 通过 `group_name === "生产通道"` 与普通 Key 区分，无需新建数据库表或字段。
- 不关联具体成员 = 由部门管理员本人（`phone`）直接创建，`organization_id` 为当前选中部门。
- 预算类型（月度/单日）为纯前端字段，仅影响 `p_total_quota` 传参时的语义展示，实际存储沿用 `total_quota` 字段。
