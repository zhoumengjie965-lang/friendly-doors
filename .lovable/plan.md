
## 重构「资源统计」页面 — `src/pages/admin/AdminResourceStats.tsx`

### 目标
移除全部 Recharts 图表，改为「顶部概览卡片 + 租户业务监控表」的纯数据视图。

---

### 顶部概览卡片（4张）

| 卡片 | 数据 | 来源 |
|------|------|------|
| 今日总请求数 | mock `enterprise_balances.request_count` 汇总 | 从 `enterprise_balances` 读取全部企业的 `request_count` 求和 |
| 今日总 Tokens | mock 占位 `--` + tooltip 说明 | 无真实字段，占位 |
| 今日总金额 | `enterprise_balances.total_consumed` 汇总 | 真实字段 |
| 全局失败率 | mock `2.3%` 占位 | 无真实字段，占位 |

每张卡片带副标题说明字段含义，icon 用蓝色调。

---

### 租户业务监控表（核心）

**列定义**：

| 列 | 内容 | 特殊逻辑 |
|----|------|---------|
| 企业名称 | 蓝色链接 | 点击 → `navigate('/admin/tokens?enterprise_id=xxx')` |
| 今日金额 | `total_consumed` | 值为 0 时整行标橙/加 ⚠️ |
| 今日 Tokens | `--`（占位） | — |
| 请求成功率 | mock `98.x%` / 随机占位 | < 95% 时显示红色粗体 + 红色行背景条 |
| Top 1 失败原因 | mock `超时` / `认证失败` / 占位 | — |
| 内部空间标识 | `isInternalEnterprise(name)` → 显示「内部自用」橙色徽章 | — |

数据来源：从 `enterprises` + `enterprise_balances` 左连接，逐行渲染。

---

### 报警视觉规则

- **成功率 < 95%**：该行成功率单元格 → `text-red-600 font-bold`，行背景 `bg-red-50/40`
- **今日金额 = 0**：金额单元格 → `text-amber-600 font-medium` + ⚠️ 图标，行背景 `bg-amber-50/30`
- 两条件可同时触发（行背景取更高优先级：红 > 橙）

---

### 实现细节

**删除的导入**：`BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend`

**新增的导入**：
- `useEffect, useState` 
- `supabase` client
- `useNavigate` from react-router-dom
- `Building2, AlertTriangle, Activity, Coins, TrendingDown, FlaskConical` from lucide-react
- `Badge` from ui/badge
- `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` from ui/tooltip

**数据获取**：
```ts
// 加载 enterprises + enterprise_balances
const { data: enterprises } = await supabase.from("enterprises").select("id,name")
const { data: balances } = await supabase.from("enterprise_balances").select("enterprise_id,total_consumed,request_count")
// merge into rows
```

**Mock 字段说明**（在表格标题区加小提示）：
- 「今日 Tokens」、「请求成功率」、「Top 1 失败原因」字段标注灰色 `(模拟数据，待接入)` 说明

**企业链接跳转**：
```ts
navigate(`/admin/tokens?enterprise_id=${row.id}`)
```
（AdminTokens 页已有 enterpriseCombobox 筛选，此处通过 URL param 触发预填充——暂时只跳转，不做 param 解析，后续可扩展）

---

### 文件修改
- **`src/pages/admin/AdminResourceStats.tsx`** — 全量重写，移除 recharts，改为卡片 + 表格布局
