
## 令牌管理页增强计划

### 分析现状
当前 `AdminTokens.tsx` 已有基础列表、分页、状态切换和删除功能。需要在此基础上扩展4项能力。

### 改动范围（仅 `src/pages/admin/AdminTokens.tsx`）

---

### 1. 顶部筛选栏 — 上帝视角筛选器

在现有"搜索令牌名称 / 搜索密钥"行**上方**新增一行企业级筛选：

- **所属企业**：Combobox 模糊搜索下拉框（输入时实时过滤企业列表），选项来自已加载的 `enterpriseNames` map + 输入联动的 `enterprises` 表
- **创建人（用户ID/手机号）**：普通 Input，对 `creator_phone` 字段模糊匹配

两者均参与前端 `filtered` 计算，并在"重置"时清空。

---

### 2. 数据列扩展

在现有列顺序上插入三列：

| 位置 | 新列 | 数据来源 |
|------|------|----------|
| 名称 右侧 | **企业名称** | `enterpriseNames[k.enterprise_id]` + 内部勋章逻辑 |
| 企业名称 右侧 | **创建人** | `creator_phone`（脱敏显示后4位，悬停全显） |
| 状态 右侧 | **今日消耗 Tokens** | 前端 mock 数值（当前无 `daily_tokens` 列，用 `used_quota` 中随机派生的占位值，标注「待接入」） |

注：今日消耗 Tokens 字段后续需要真实数据表支持，当前以 `--` 占位，标注小型说明 tooltip。

---

### 3. 内部测试空间勋章

**规则**：企业名称包含"测试"或"内部"或企业名为特定标记（可配置常量 `INTERNAL_ENTERPRISE_KEYWORDS`）时，在"所属企业"列渲染特殊徽章：

```
[内部测试] 企业名
```

- 徽章样式：橙色边框 `bg-orange-50 text-orange-700 border-orange-200`，带 🔬 小图标
- 当该 Key 属于内部测试企业时，在额度列末尾渲染灰色「不计统计」标记

---

### 4. 视觉风格升级

将原生 `<table>` 替换为带蓝色系头部的卡片化表格：

- 表头背景：`bg-blue-950/5` + 文字 `text-blue-900/70`
- 行悬停：`hover:bg-blue-50/40`
- 操作按钮区：统一为带 tooltip 的 icon button，启用=绿色 / 禁用=橙色
- 筛选栏容器：`border-l-4 border-l-primary/60 bg-card` 左侧蓝色强调条

---

### 实现细节

**状态新增**：
```ts
const [filterEnterprise, setFilterEnterprise] = useState(""); // 企业模糊搜索输入
const [filterCreator, setFilterCreator] = useState("");       // 创建人手机号
const [enterpriseSearchTerm, setEnterpriseSearchTerm] = useState("");
```

**filtered 逻辑扩展**：
```ts
const filtered = keys.filter(k => {
  if (searchName && !k.name.toLowerCase().includes(...)) return false;
  if (searchKey && !k.key_value.toLowerCase().includes(...)) return false;
  if (filterEnterprise) {
    const eName = enterpriseNames[k.enterprise_id] || "";
    if (!eName.toLowerCase().includes(filterEnterprise.toLowerCase()) &&
        !k.enterprise_id.includes(filterEnterprise)) return false;
  }
  if (filterCreator && !k.creator_phone.includes(filterCreator)) return false;
  return true;
});
```

**内部企业判断常量**：
```ts
const INTERNAL_KEYWORDS = ["测试", "内部", "运营", "test", "internal"];
const isInternalEnterprise = (name: string) =>
  INTERNAL_KEYWORDS.some(kw => name.toLowerCase().includes(kw));
```

---

### 文件修改
- **`src/pages/admin/AdminTokens.tsx`** — 全量重写（保留 PaginationFooter 子组件和现有 RPC 调用逻辑，扩展 UI）
