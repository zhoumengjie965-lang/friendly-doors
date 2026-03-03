
# 资源统计页面复现方案

## 参考图分析

参考图包含三大区域：

**区域一：顶部指标卡片（2行布局）**
- 左侧大卡：钱包图标（橙色圆形背景）+ "统计额度" + "¥2.27"
- 右上：统计次数 29（粉红色 Activity 图标）
- 右下：统计Tokens 14.4K（蓝色数据库图标）
- 右上角：平均RPM 0.001（绿色闪电图标）
- 右下角：平均TPM 0.357（紫色柱状图图标）

**区域二：右上角日期范围选择器 + 刷新按钮**
- 日历图标 + "2024-02-01 ~ 2024-02-29" + 下拉箭头
- 刷新图标按钮

**区域三：模型数据分析卡片（堆叠柱状图）**
- 标题：网格图标 + "模型数据分析"
- 子页签：[模型消耗分布] [模型调用分布]（胶囊样式）
- 右侧：[按天显示] 切换
- 堆叠柱状图：X轴日期，Y轴Tokens，图例：Claude 3（绿）/ GPT-4（蓝）/ Gemini Pro（紫）

---

## 技术方案

### 1. 新建页面文件 `src/pages/ResourceStats.tsx`

**组件结构：**
- 使用 `recharts` 的 `BarChart` + `Bar` + `XAxis` + `YAxis` + `Tooltip` + `Legend` 实现堆叠柱状图
- 日期选择器用自定义 `Popover` + `Calendar`（`react-day-picker`）实现日期范围选择
- 数据从 Supabase 数据库查询（`api_key_logs` 或类似表），当前为 mock 数据展示

**状态管理：**
```ts
const [dateRange, setDateRange] = useState({ from: startOfMonth, to: endOfMonth });
const [activeSubTab, setActiveSubTab] = useState<"consumption" | "calls">("consumption");
const [granularity, setGranularity] = useState<"day" | "hour">("day");
const [chartData, setChartData] = useState([]);
```

**指标卡数据（上方五个指标）：**
- 统计额度 (¥)
- 统计次数
- 统计 Tokens
- 平均 RPM
- 平均 TPM

### 2. 修改 `src/pages/Workspace.tsx`

在路由判断链中添加 `/workspace/stats` 的处理：

```tsx
import ResourceStats from "@/pages/ResourceStats";

// 在 location.pathname 判断链中添加：
} : location.pathname === "/workspace/stats" ? (
  <ResourceStats enterprise={enterprise} role={role} />
) : (
```

---

## 页面布局细节

### 顶部操作栏（标题 + 日期选择器）
```text
[网格图标] 资源统计                    [📅 日期范围 ▼] [↺]
```

### 指标卡片区（两列网格，左侧大卡跨行）
```text
┌─────────────────┬──────────────┬──────────────┐
│  💰 统计额度     │ 📊 统计次数  │ ⚡ 平均RPM   │
│     ¥2.27        │     29        │    0.001      │
│                 ├──────────────┼──────────────┤
│                 │ 🗄 统计Token │ 📈 平均TPM   │
│                 │    14.4K      │    0.357      │
└─────────────────┴──────────────┴──────────────┘
```
实现：`grid grid-cols-3`，左侧卡片 `row-span-2`

### 图表区
- 堆叠柱状图：`recharts` BarChart，`stackId="a"`
- 子 Tab 胶囊（模型消耗分布 / 模型调用分布）
- "按天显示" 切换按钮右对齐

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ResourceStats.tsx` | 新建，完整实现资源统计页面 |
| `src/pages/Workspace.tsx` | 添加 `/workspace/stats` 路由分支 + import |

## 数据处理
- 指标卡与图表暂用 mock 数据呈现 UI 结构
- 图表颜色：Claude 3（#4ade80绿）、GPT-4（#60a5fa蓝）、Gemini Pro（#a78bfa紫），与参考图一致
