
# 资源统计页面：新增 APIKey 调用分析卡片 + 优化配额横幅

## 改动范围

仅修改 `src/pages/ResourceStats.tsx`，无需数据库变更。

---

## 一、配额横幅样式优化

当前深色终端风格（黑底绿字）视觉较突兀，替换为与页面整体风格一致的柔和配色：

**新方案**：浅蓝色信息横幅，带左侧彩色强调边条，背景用 `bg-blue-50`（dark: `bg-blue-950/20`），文字用 `text-blue-700`，进度条用带颜色的真实 `div` 进度条替代符号字符串。

```tsx
// 新配额横幅样式
<div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-4 flex-wrap">
  {/* 左侧图标 */}
  <div className="flex items-center gap-2 shrink-0">
    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
      <Wallet className="w-4 h-4 text-blue-600" />
    </div>
    <span className="text-sm font-semibold text-blue-700">实时配额监控</span>
  </div>
  {/* 分隔线 */}
  <div className="w-px h-5 bg-blue-200 shrink-0" />
  {/* 文字说明 */}
  <span className="text-sm text-blue-600 shrink-0">
    今日个人预算剩余：<span className="font-bold text-blue-800">¥ 37.50</span> / ¥ 50.00
  </span>
  {/* 进度条 */}
  <div className="flex items-center gap-2 flex-1 min-w-[160px]">
    <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: "25%" }} />
    </div>
    <span className="text-xs text-blue-500 shrink-0">25% 已消耗</span>
  </div>
</div>
```

---

## 二、新增"APIkey 调用分析"环形图卡片

在堆叠柱状图卡片下方新增独立白色圆角卡片，左右两栏各放一个 Donut Chart。

### 技术实现

使用 `recharts` 的 `PieChart` + `Pie` 组件，通过 `innerRadius` 实现环形图效果，并在中心用 `customLabel` 或绝对定位 `div` 显示汇总数字。

**新增 imports：**
```tsx
import { PieChart, Pie, Cell, Sector } from "recharts";
```

### Mock 数据

```ts
// 左图：API Key 消耗占比
const mockKeyConsumptionData = [
  { name: "gpt-4-turbo-key", value: 8.50, color: "#60a5fa" },
  { name: "claude-opus-key", value: 5.20, color: "#4ade80" },
  { name: "gemini-pro-key",  value: 2.80, color: "#a78bfa" },
  { name: "备用Key-01",      value: 1.20, color: "#fb923c" },
];

// 右图：请求拦截原因分布
const mockInterceptData = [
  { name: "Key 预算不足",     value: 12, color: "#f87171" },
  { name: "个人日限额触达",   value: 8,  color: "#fb923c" },
  { name: "组织总限额不足",   value: 5,  color: "#facc15" },
  { name: "企业余额欠费",     value: 3,  color: "#a78bfa" },
  { name: "其他系统错误",     value: 2,  color: "#94a3b8" },
];
```

### 布局结构

```tsx
{/* APIkey 调用分析卡片 */}
<div className="mt-4 bg-card border border-border rounded-xl p-6">
  {/* 卡片标题 */}
  <div className="flex items-center gap-2 mb-6">
    <PieChartIcon className="w-4 h-4 text-muted-foreground" />
    <span className="font-semibold text-foreground">APIkey 调用分析</span>
  </div>

  {/* 两栏响应式网格 */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    {/* 左：API Key 消耗占比 */}
    <DonutChart
      title="API Key 消耗占比"
      data={mockKeyConsumptionData}
      centerLabel="总消耗"
      centerValue="¥17.70"
      valueFormatter={(v) => `¥${v.toFixed(2)}`}
    />

    {/* 右：请求拦截原因分布 */}
    <DonutChart
      title="请求拦截原因分布"
      data={mockInterceptData}
      centerLabel="总失败"
      centerValue="30 次"
      valueFormatter={(v) => `${v} 次`}
    />
  </div>
</div>
```

### DonutChart 子组件实现要点

将环形图抽为内部组件（同文件内定义，不单独新建文件）：

```tsx
// 内部组件：通用环形图
function DonutChart({ title, data, centerLabel, centerValue, valueFormatter }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-4">{title}</p>
      <div className="flex items-center gap-6">
        {/* 环形图 */}
        <div className="relative shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [valueFormatter(v), name]} ... />
            </PieChart>
          </ResponsiveContainer>
          {/* 中心文字（绝对定位叠加） */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
            <span className="text-base font-bold text-foreground">{centerValue}</span>
          </div>
        </div>

        {/* 图例列表 */}
        <div className="flex-1 space-y-2">
          {data.map((item, i) => {
            const pct = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-foreground">{valueFormatter(item.value)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## 三、响应式逻辑

两栏网格使用 `grid-cols-1 md:grid-cols-2`，移动端自动垂直堆叠，桌面端并排显示，无需额外处理。

---

## 四、仅 `viewRole === "member"` 时显示该卡片

根据需求"用于普通成员视角下的数据分析"，将该卡片包裹在条件渲染中：

```tsx
{viewRole === "member" && (
  <div className="mt-4 bg-card border border-border rounded-xl p-6">
    ...
  </div>
)}
```

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ResourceStats.tsx` | 优化配额横幅样式；新增内部 `DonutChart` 子组件；新增"APIkey 调用分析"卡片（仅 member 视图显示）；新增 `PieChart, Pie, Cell` imports |

## 不涉及内容
- 数据库迁移：无需
- 其他页面：无影响
- 真实数据接入：后续可替换 mock 数据为实际查询
