import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const mockEnterprises = ["全部", "极光科技", "蓝海智能", "云启数字"];

const mockDailyUsage = [
  { date: "3/1", tokens: 125000, cost: 12.5 },
  { date: "3/2", tokens: 198000, cost: 19.8 },
  { date: "3/3", tokens: 156000, cost: 15.6 },
  { date: "3/4", tokens: 210000, cost: 21.0 },
  { date: "3/5", tokens: 180000, cost: 18.0 },
  { date: "3/6", tokens: 245000, cost: 24.5 },
  { date: "3/7", tokens: 132000, cost: 13.2 },
];

const mockModelDist = [
  { name: "gpt-4o", value: 42, color: "hsl(var(--primary))" },
  { name: "claude-3-5-sonnet", value: 28, color: "hsl(220, 70%, 55%)" },
  { name: "gpt-4o-mini", value: 18, color: "hsl(150, 60%, 45%)" },
  { name: "其他", value: 12, color: "hsl(var(--muted-foreground))" },
];

const summaryCards = [
  { label: "今日请求数", value: "12,458", sub: "+8.2% vs 昨日" },
  { label: "今日消耗额度", value: "¥245.60", sub: "+12.1% vs 昨日" },
  { label: "今日 Token 数", value: "2.45M", sub: "输入 1.2M / 输出 1.25M" },
  { label: "活跃企业", value: "3", sub: "共 3 家企业" },
];

export default function AdminResourceStats() {
  const [enterprise, setEnterprise] = useState("全部");

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">资源统计</h1>
          <p className="text-sm text-muted-foreground mt-0.5">平台级资源使用概览</p>
        </div>
        <Select value={enterprise} onValueChange={setEnterprise}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockEnterprises.map(e => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-semibold mt-1 text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">近 7 天消耗趋势（¥）</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mockDailyUsage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="消耗额度" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-foreground mb-4">模型调用分布</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={mockModelDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {mockModelDist.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
