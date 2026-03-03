import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Wallet, Activity, Database, Zap, BarChart2, CalendarIcon, RefreshCw, LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface Props {
  enterprise: { id: string; name: string; enterprise_code: string };
  role: string;
}

// Mock chart data
const mockDayData = [
  { date: "02-01", claude: 1200, gpt4: 800, gemini: 400 },
  { date: "02-03", claude: 900, gpt4: 1100, gemini: 600 },
  { date: "02-05", claude: 1500, gpt4: 700, gemini: 300 },
  { date: "02-07", claude: 800, gpt4: 1300, gemini: 500 },
  { date: "02-09", claude: 1100, gpt4: 900, gemini: 700 },
  { date: "02-11", claude: 600, gpt4: 1500, gemini: 400 },
  { date: "02-13", claude: 1300, gpt4: 600, gemini: 800 },
  { date: "02-15", claude: 950, gpt4: 1200, gemini: 350 },
  { date: "02-17", claude: 1400, gpt4: 800, gemini: 600 },
  { date: "02-19", claude: 700, gpt4: 1100, gemini: 450 },
  { date: "02-21", claude: 1200, gpt4: 900, gemini: 700 },
  { date: "02-23", claude: 850, gpt4: 1400, gemini: 300 },
  { date: "02-25", claude: 1100, gpt4: 700, gemini: 550 },
  { date: "02-27", claude: 1300, gpt4: 1000, gemini: 400 },
  { date: "02-29", claude: 900, gpt4: 800, gemini: 600 },
];

const mockCallData = [
  { date: "02-01", claude: 3, gpt4: 2, gemini: 1 },
  { date: "02-03", claude: 2, gpt4: 3, gemini: 2 },
  { date: "02-05", claude: 4, gpt4: 2, gemini: 1 },
  { date: "02-07", claude: 2, gpt4: 4, gemini: 1 },
  { date: "02-09", claude: 3, gpt4: 3, gemini: 2 },
  { date: "02-11", claude: 2, gpt4: 5, gemini: 1 },
  { date: "02-13", claude: 4, gpt4: 2, gemini: 3 },
  { date: "02-15", claude: 3, gpt4: 4, gemini: 1 },
  { date: "02-17", claude: 4, gpt4: 3, gemini: 2 },
  { date: "02-19", claude: 2, gpt4: 4, gemini: 1 },
  { date: "02-21", claude: 3, gpt4: 3, gemini: 2 },
  { date: "02-23", claude: 3, gpt4: 4, gemini: 1 },
  { date: "02-25", claude: 3, gpt4: 2, gemini: 2 },
  { date: "02-27", claude: 4, gpt4: 3, gemini: 1 },
  { date: "02-29", claude: 3, gpt4: 3, gemini: 2 },
];

type ViewRole = "member" | "org_admin" | "enterprise_admin";

export default function ResourceStats({ enterprise }: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date("2024-02-01")),
    to: endOfMonth(new Date("2024-02-01")),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"consumption" | "calls">("consumption");
  const [granularity] = useState<"day" | "hour">("day");
  const [viewRole, setViewRole] = useState<ViewRole>("member");

  const chartData = activeSubTab === "consumption" ? mockDayData : mockCallData;
  const yLabel = activeSubTab === "consumption" ? "Tokens" : "次数";

  const cardLabels = viewRole === "member"
    ? { big: "已消耗预算", mid1: "统计调用次数", mid2: "消耗Tokens" }
    : { big: "统计额度", mid1: "统计次数", mid2: "统计Tokens" };

  // Build quota progress bar string (25% consumed = 12.50/50.00)
  const consumed = 12.50;
  const total = 50.00;
  const pct = Math.round((consumed / total) * 20);
  const progressBar = `[${"=".repeat(pct)}${"-".repeat(20 - pct)}]`;

  const formatDateRange = () => {
    if (!dateRange?.from) return "选择日期范围";
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : from;
    return `${from} ~ ${to}`;
  };

  const roleTabs: { key: ViewRole; label: string }[] = [
    { key: "member", label: "普通成员" },
    { key: "org_admin", label: "组织管理员" },
    { key: "enterprise_admin", label: "企业管理员" },
  ];

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">资源统计</h1>
        </div>

        {/* Role view tabs - centered */}
        <div className="flex items-center bg-muted rounded-lg p-1 h-9">
          {roleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewRole(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                viewRole === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 gap-2 text-sm font-normal border-border"
              >
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{formatDateRange()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {/* Refresh */}
          <Button variant="outline" size="icon" className="h-9 w-9 border-border">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Quota banner — member only */}
      {viewRole === "member" && (
        <div className="mb-4 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 font-mono text-sm text-green-400 flex items-center gap-3 flex-wrap">
          <span className="text-green-300 font-semibold shrink-0">[实时配额监控]</span>
          <span className="shrink-0">您当前的个人日预算剩余：¥ {(total - consumed).toFixed(2)} / ¥ {total.toFixed(2)}（今日）</span>
          <span className="text-green-500 tracking-tighter">{progressBar}</span>
        </div>
      )}

      {/* Metric cards: 3-col grid, left big card spans 2 rows */}
      <div className="grid grid-cols-3 grid-rows-2 gap-4 mb-6" style={{ gridTemplateRows: "auto auto" }}>
        {/* Left big card */}
        <div className="row-span-2 bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: "hsl(32,90%,55%)" }}>
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">{cardLabels.big}</p>
          <p className="text-4xl font-bold text-foreground">¥2.27</p>
        </div>

        {/* Top middle */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{cardLabels.mid1}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(340,85%,95%)" }}>
              <Activity className="w-4 h-4" style={{ color: "hsl(340,75%,55%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">29</p>
        </div>

        {/* Top right: 平均RPM */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">平均RPM</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(142,70%,92%)" }}>
              <Zap className="w-4 h-4" style={{ color: "hsl(142,70%,40%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">0.001</p>
        </div>

        {/* Bottom middle */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{cardLabels.mid2}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(214,85%,93%)" }}>
              <Database className="w-4 h-4" style={{ color: "hsl(214,80%,50%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">14.4K</p>
        </div>

        {/* Bottom right: 平均TPM */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">平均TPM</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(262,60%,93%)" }}>
              <BarChart2 className="w-4 h-4" style={{ color: "hsl(262,60%,55%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">0.357</p>
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">模型数据分析</span>
            </div>
            <div className="flex items-center bg-muted rounded-lg p-1 h-8">
              <button
                onClick={() => setActiveSubTab("consumption")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  activeSubTab === "consumption"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                模型消耗分布
              </button>
              <button
                onClick={() => setActiveSubTab("calls")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  activeSubTab === "calls"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                模型调用分布
              </button>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-muted transition-colors">
            <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
            {granularity === "day" ? "按天显示" : "按小时显示"}
          </button>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => activeSubTab === "consumption" && v >= 1000 ? `${v / 1000}K` : String(v)}
              label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            <Legend
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            <Bar dataKey="claude" name="Claude 3" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gpt4" name="GPT-4" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gemini" name="Gemini Pro" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
