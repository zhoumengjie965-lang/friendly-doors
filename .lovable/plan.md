
## Goal
Replace the current `AdminResourceStats.tsx` with a new comprehensive dashboard: 2 rows of metric cards + 2 side-by-side trend charts + 1 full-width horizontal bar chart. All data is static mock data.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 资源统计  近30天                                              │
├──────────┬──────────┬──────────┬──────────────────────────┤
│ 签约企业  │ 累计充值  │ 资金池余额│     API Key 总数          │
│ 总数      │ 金额     │ (蓝色系)  │      (蓝色系)             │
├──────────┼──────────┼──────────┼──────────────────────────┤
│ 总消耗额度│ 预估成本  │ 预估毛利率│     总请求次数             │
│  (橙色系) │ (橙色系)  │ (橙色系)  │     (橙色系)              │
├──────────────────────┬──────────────────────────────────────┤
│ 近30天充值金额趋势     │  平台 Token 消耗趋势 (面积图)          │
│ (折线图)              │                                      │
├──────────────────────┴──────────────────────────────────────┤
│ 企业消费 TOP 10 (横向柱状图)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Mock Data Plan

**Row 1 - Assets & Finance (blue tones):**
- 签约企业总数: 128 家
- 累计充值金额: ¥ 1,284,560.00
- 资金池可用余额: ¥ 896,320.00 (= 充值 - 消耗)
- API Key 总数: 2,341 个

**Row 2 - Consumption & Efficiency (orange/amber tones):**
- 总消耗额度: ¥ 388,240.00
- 预估成本: ¥ 215,900.00
- 预估毛利率: 44.4%
- 总请求次数: 8,320,451 次

**Chart 1 - 近30天充值金额趋势 (LineChart):** 30 data points with daily recharge amounts, natural variation (3k–35k range)

**Chart 2 - Token消耗趋势 (AreaChart):** 30 data points with token consumption (100k–900k range)

**Chart 3 - 企业消费 TOP 10 (horizontal BarChart):** 10 enterprise names with consumption values, using `layout="vertical"` in Recharts for horizontal bars

---

## Implementation Plan

**File:** `src/pages/admin/AdminResourceStats.tsx` — full rewrite

**Key technical points:**
1. Generate 30-day mock data with `Array.from` loop computing dates
2. Row 1 cards: use blue/sky color variants (`text-blue-500`, `bg-blue-500/10`)
3. Row 2 cards: use amber/orange variants (`text-amber-500`, `bg-amber-500/10`)  
4. Charts use Recharts components already installed: `LineChart`, `AreaChart`, `BarChart` with `layout="vertical"`
5. Horizontal bar chart: `layout="vertical"` + `XAxis type="number"` + `YAxis type="category" dataKey="name" width={90}`
6. No Supabase calls — pure static mock, no loading state needed
7. Keep existing `TooltipProvider` wrapping pattern

**Recharts horizontal bar pattern:**
```tsx
<BarChart layout="vertical" data={top10}>
  <XAxis type="number" />
  <YAxis type="category" dataKey="name" width={90} />
  <Bar dataKey="amount" layout="vertical" />
</BarChart>
```
