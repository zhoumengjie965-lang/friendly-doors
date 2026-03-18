import {
  Building2,
  CreditCard,
  Wallet,
  KeyRound,
  TrendingDown,
  DollarSign,
  BarChart2,
  MousePointerClick,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Mock Data ───────────────────────────────────────────────────────────────

// Generate 30-day date labels
const THIRTY_DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return `${d.getMonth() + 1}/${d.getDate()}`;
});

// 近30天充值趋势 (折线图) — 3k–35k range
const RECHARGE_TREND = THIRTY_DAYS.map((date, i) => ({
  date,
  amount: Math.round(3000 + Math.abs(Math.sin(i * 0.7 + 1) * 18000) + Math.abs(Math.cos(i * 0.4) * 12000)),
}));

// 平台 Token 消耗趋势 (面积图) — 100k–900k range
const TOKEN_TREND = THIRTY_DAYS.map((date, i) => ({
  date,
  tokens: Math.round(100000 + Math.abs(Math.sin(i * 0.5 + 2) * 450000) + Math.abs(Math.cos(i * 0.3 + 1) * 300000)),
}));

// 企业消费 TOP 10 (横向柱状图)
const TOP10_ENTERPRISES = [
  { name: "星辰科技", amount: 58420 },
  { name: "未来智能", amount: 47830 },
  { name: "云图网络", amount: 39600 },
  { name: "数链信息", amount: 31250 },
  { name: "智联系统", amount: 27400 },
  { name: "启明数据", amount: 22100 },
  { name: "银河创服", amount: 18900 },
  { name: "鲲鹏互联", amount: 14760 },
  { name: "瀚海科技", amount: 9320 },
  { name: "蓬莱云计算", amount: 5480 },
].reverse(); // reverse so biggest bar is at top

// ─── Metric Card Types ────────────────────────────────────────────────────────

interface MetricCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: "blue" | "amber";
}

const ROW1_CARDS: MetricCard[] = [
  {
    label: "签约企业总数",
    value: "128 家",
    sub: "平台全量签约企业",
    icon: Building2,
    color: "blue",
  },
  {
    label: "累计充值金额",
    value: "¥1,284,560",
    sub: "历史累计充值总额",
    icon: CreditCard,
    color: "blue",
  },
  {
    label: "资金池可用余额",
    value: "¥896,320",
    sub: "充值 − 消耗 = 可用余额",
    icon: Wallet,
    color: "blue",
  },
  {
    label: "API Key 总数",
    value: "2,341 个",
    sub: "全平台 Key 汇总",
    icon: KeyRound,
    color: "blue",
  },
];

const ROW2_CARDS: MetricCard[] = [
  {
    label: "总消耗额度",
    value: "¥388,240",
    sub: "全平台累计消耗预算",
    icon: TrendingDown,
    color: "amber",
  },
  {
    label: "预估成本",
    value: "¥215,900",
    sub: "按模型定价折算成本",
    icon: DollarSign,
    color: "amber",
  },
  {
    label: "预估毛利率",
    value: "44.4%",
    sub: "（消耗 − 成本）/ 消耗",
    icon: BarChart2,
    color: "amber",
  },
  {
    label: "总请求次数",
    value: "8,320,451 次",
    sub: "全平台历史请求量",
    icon: MousePointerClick,
    color: "amber",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ card }: { card: MetricCard }) {
  const Icon = card.icon;
  const isBlue = card.color === "blue";
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isBlue
              ? "bg-[hsl(224,76%,48%)]/10"
              : "bg-[hsl(38,92%,50%)]/10"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              isBlue ? "text-[hsl(224,76%,48%)]" : "text-[hsl(38,92%,40%)]"
            }`}
          />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{card.value}</p>
      <p className="text-xs text-muted-foreground">{card.sub}</p>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminResourceStats() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">资源统计</h1>
          <p className="text-sm text-muted-foreground mt-0.5">平台级资源与财务概览（近 30 天）</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
          近 30 天
        </span>
      </div>

      {/* Row 1 — Assets & Finance (blue) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ROW1_CARDS.map((c) => <StatCard key={c.label} card={c} />)}
      </div>

      {/* Row 2 — Consumption & Efficiency (amber) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ROW2_CARDS.map((c) => <StatCard key={c.label} card={c} />)}
      </div>

      {/* Charts Row — side-by-side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 充值金额趋势 (折线图) */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">近 30 天充值金额趋势</h2>
            <p className="text-xs text-muted-foreground mt-0.5">单位：元（¥）</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={RECHARGE_TREND} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`¥${v.toLocaleString()}`, "充值金额"]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(224,76%,48%)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Token 消耗趋势 (面积图) */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">平台生态 Token 消耗趋势</h2>
            <p className="text-xs text-muted-foreground mt-0.5">单位：万 Tokens</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={TOKEN_TREND} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38,92%,50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38,92%,50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}w`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${(v / 10000).toFixed(1)}w`, "Tokens"]}
              />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="hsl(38,92%,40%)"
                strokeWidth={2}
                fill="url(#tokenGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full-width horizontal bar chart — TOP 10 */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">企业消费 TOP 10</h2>
          <p className="text-xs text-muted-foreground mt-0.5">单位：元（¥），按累计消耗排名</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            layout="vertical"
            data={TOP10_ENTERPRISES}
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "hsl(var(--muted))" }}
              formatter={(v: number) => [`¥${v.toLocaleString()}`, "消耗金额"]}
            />
            <Bar
              dataKey="amount"
              fill="hsl(224,76%,48%)"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
