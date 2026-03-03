
# 组织管理员视图看板开发方案

## 改动范围

仅修改 `src/pages/ResourceStats.tsx`，无需数据库变更（使用 mock 数据）。

---

## 一、新增顶部控制条（仅 org_admin 视图）

在角色 Tab 切换栏与日期选择器之间，当视图为 `org_admin` 时，插入一行额外的控制条，包含两个元素：

### 1. 组织选择器（下拉）
- 使用现有的 `Select` / `Popover` 实现组织下拉选择
- 默认显示第一个组织，支持多组织切换
- 状态：`const [selectedOrg, setSelectedOrg] = useState("org-1")`

### 2. 成员穿透筛选（搜索框）
- 一个简单的文本 Input，支持按成员姓名模糊筛选
- 默认为空（全组织聚合），输入后全页图表切换为该成员的个人数据
- 状态：`const [memberFilter, setMemberFilter] = useState("")`

```text
[🏢 研发一组 ▼]   [🔍 搜索成员姓名...]
```
样式：`bg-card border rounded-xl px-4 py-3 mb-4 flex items-center gap-3`

---

## 二、配额横幅升级（org_admin）

将 `member` 视图的"今日个人预算"替换为"组织本月配额监控"，同样保持蓝色横幅样式，但内容不同：

```tsx
{viewRole === "org_admin" && (
  <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 ...">
    <Wallet 图标 />
    <span>组织本月配额监控</span>
    <span>本月组织剩余预算：¥ 3,200.00 / ¥ 5,000.00</span>
    <进度条 width="36%" />
    <span>64% 剩余</span>
  </div>
)}
```

Mock 数据：`orgMonthlyBudget = 5000`, `orgConsumed = 1800`，消耗 36%。

---

## 三、指标卡片标签（org_admin）

扩展 `cardLabels` 逻辑，对 `org_admin` 独立定义标签，与 `member` 保持一致的三个指标名称（已消耗预算 / 统计调用次数 / 消耗Tokens），表示全组织聚合数据：

```ts
const cardLabels =
  viewRole === "member" || viewRole === "org_admin"
    ? { big: "已消耗预算", mid1: "统计调用次数", mid2: "消耗Tokens" }
    : { big: "统计额度", mid1: "统计次数", mid2: "统计Tokens" };
```

org_admin 的数值（mock）比 member 更大，体现"全组织聚合"：¥ 188.50、1,847 次、1.24M Tokens、0.041 RPM、1.28K TPM。

---

## 四、新增卡片：成员消耗排行榜（org_admin 专属）

在模型数据分析图表卡片下方、APIkey 分析卡片上方，插入一个"成员消耗排行榜"卡片。

### 技术实现
- 使用 `recharts` 的 `BarChart` 横向模式：`layout="vertical"`
- X 轴为数值（消耗金额），Y 轴为成员姓名
- 仅展示 Top 10 成员
- 进度条颜色：`#60a5fa`（蓝色，与全局配色一致）

### Mock 数据
```ts
const mockMemberRankData = [
  { name: "张三", value: 42.50 },
  { name: "李四", value: 38.20 },
  { name: "王五", value: 31.80 },
  { name: "赵六", value: 28.40 },
  { name: "钱七", value: 22.10 },
  { name: "孙八", value: 18.60 },
  { name: "周九", value: 15.30 },
  { name: "吴十", value: 12.00 },
  { name: "郑十一", value: 8.90 },
  { name: "陈十二", value: 5.20 },
];
```

### 卡片结构
```text
┌─────────────────────────────────────────────────────┐
│  [👥] 成员消耗排行榜 (Top 10)                        │
│                                                     │
│  张三   [=============================] ¥42.50      │
│  李四   [=========================] ¥38.20          │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

使用 `recharts` 横向柱状图（高度约 320px），Y 轴显示成员姓名，X 轴显示金额，添加自定义 Tooltip。

---

## 五、APIkey 调用分析卡片复用（org_admin）

将现有的 `APIkey 调用分析` 卡片从 `viewRole === "member"` 扩展至同时支持 `org_admin`：

```tsx
{(viewRole === "member" || viewRole === "org_admin") && (
  <div className="mt-4 bg-card border border-border rounded-xl p-6">
    ...
  </div>
)}
```

内容逻辑相同，但 `org_admin` 的数据代表全组织所有 API Key 及全组织拦截原因，mock 数值更大，体现组织维度。

新增 org_admin 专用 mock 数据：
```ts
const mockOrgKeyConsumptionData = [
  { name: "prod-gpt4-key", value: 88.50, color: "#60a5fa" },
  { name: "prod-claude-key", value: 62.30, color: "#4ade80" },
  { name: "test-gemini-key", value: 24.70, color: "#a78bfa" },
  { name: "backup-key-01", value: 13.00, color: "#fb923c" },
];

const mockOrgInterceptData = [
  { name: "Key 预算不足", value: 45, color: "#f87171" },
  { name: "个人日限额触达", value: 32, color: "#fb923c" },
  { name: "组织总限额不足", value: 18, color: "#facc15" },
  { name: "企业余额欠费", value: 8, color: "#a78bfa" },
  { name: "其他系统错误", value: 5, color: "#94a3b8" },
];
```

---

## 六、空状态处理

当 `memberFilter` 有值但无匹配时，在各卡片内部用一个居中的提示替代图表：

```tsx
const isEmpty = memberFilter.trim() !== "" && !mockMemberRankData.some(m => m.name.includes(memberFilter));

{isEmpty ? (
  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
    <Users className="w-10 h-10 mb-2 opacity-30" />
    <p className="text-sm">暂无相关数据</p>
  </div>
) : (
  <ResponsiveContainer ...>...</ResponsiveContainer>
)}
```

---

## 整体渲染逻辑（org_admin 视图）

```text
1. [顶部控制栏：组织选择器 + 成员搜索框]   ← org_admin 专属
2. [组织本月配额监控横幅（蓝色）]           ← org_admin 专属
3. [指标卡片区：全组织聚合数值]             ← org_admin 使用"已消耗预算"命名
4. [模型数据分析柱状图]                     ← 共用（统计范围升级说明注释）
5. [成员消耗排行榜 Top 10（横向条形图）]    ← org_admin 专属
6. [APIkey 调用分析（两个环形图）]          ← org_admin 使用 orgMock 数据
```

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ResourceStats.tsx` | 新增 `selectedOrg`、`memberFilter` 状态；新增 org_admin 配额横幅；新增成员排行榜卡片；扩展 APIkey 分析卡片至 org_admin；新增所有 org_admin mock 数据；空状态处理；引入 `Users`、`Search` 图标 |

## 不涉及内容
- 数据库：无需变动
- 其他页面：无影响
- 真实数据接入：后续可替换 mock 数据为实际查询

