import { useState } from "react";
import { CreditCard, TrendingDown, Wallet, Cpu, BarChart2, MousePointerClick, Layers, Zap, Database, Activity, Globe, Banknote, Coins, FileKey, HardDrive, Clock, BrainCircuit } from "lucide-react";
import ReactECharts from "echarts-for-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────

interface FinancialStats {
  totalRecharge: number;
  totalConsumed: number;
  balance: number;
}

interface TopConsumer {
  id: string;
  name: string;
  amount: number;
}

interface ModelUsage {
  model: string;
  tokens: number;
}

interface DailyTokenUsage {
  date: string;
  [key: string]: string | number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────

const MOCK_TOP_CONSUMERS: TopConsumer[] = [
  { id: "ent-001", name: "星辰科技", amount: 58420 },
  { id: "ent-002", name: "未来智能", amount: 47830 },
  { id: "ent-003", name: "云图网络", amount: 31250 },
  { id: "ent-004", name: "数链信息", amount: 22100 },
  { id: "ent-005", name: "智联系统", amount: 14760 },
  { id: "ent-006", name: "启明数据", amount: 5480 },
  { id: "ent-007", name: "创新科技", amount: 4800 },
  { id: "ent-008", name: "智慧云端", amount: 3200 },
  { id: "ent-009", name: "数字先锋", amount: 2100 },
  { id: "ent-010", name: "未来视界", amount: 1500 },
];

const MOCK_MODEL_USAGE: ModelUsage[] = [
  { model: "gpt-4o", tokens: 125000000 },
  { model: "claude-3.5-sonnet", tokens: 98000000 },
  { model: "gpt-4-turbo", tokens: 76000000 },
  { model: "claude-3-opus", tokens: 54000000 },
  { model: "gemini-1.5-pro", tokens: 42000000 },
  { model: "gpt-3.5-turbo", tokens: 38000000 },
  { model: "llama-3-70b", tokens: 29000000 },
  { model: "mistral-large", tokens: 21000000 },
];

// 根据天数生成模型用量数据
const generateModelUsageByDays = (days: number): ModelUsage[] => {
  const baseData = [
    { model: "gpt-4o", baseTokens: 125000000 },
    { model: "claude-3.5-sonnet", baseTokens: 98000000 },
    { model: "gpt-4-turbo", baseTokens: 76000000 },
    { model: "claude-3-opus", baseTokens: 54000000 },
    { model: "gemini-1.5-pro", baseTokens: 42000000 },
    { model: "gpt-3.5-turbo", baseTokens: 38000000 },
    { model: "llama-3-70b", baseTokens: 29000000 },
    { model: "mistral-large", baseTokens: 21000000 },
  ];
  
  // 根据天数调整数据（天数越多，总量越大）
  const factor = days / 14;
  
  return baseData.map(item => ({
    model: item.model,
    tokens: Math.round(item.baseTokens * factor * (0.8 + Math.random() * 0.4)),
  })).sort((a, b) => b.tokens - a.tokens);
};

// Generate 14-day mock data for stacked area chart
const generateDailyTokenData = (): DailyTokenUsage[] => {
  const models = ["gpt-4o", "claude-3.5-sonnet", "gpt-4-turbo", "gemini-1.5-pro", "llama-3-70b"];
  const colors = ["#f472b6", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80"];
  
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    
    const row: DailyTokenUsage = { date: dateStr };
    models.forEach((model) => {
      row[model] = Math.round(5000000 + Math.random() * 15000000);
    });
    return row;
  });
};

const DAILY_TOKEN_DATA = generateDailyTokenData();

// Generate 14-day mock data for consumption trend
const generateConsumptionTrendData = () => {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      date: dateStr,
      consumption: Math.round(8000 + Math.random() * 4000),
    };
  });
};

const CONSUMPTION_TREND_DATA = generateConsumptionTrendData();

// ─── Sub-components ───────────────────────────────────────────────────────

function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  color: "blue" | "amber" | "green";
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
    green: "bg-green-500/10 text-green-600",
  };
  
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
    </div>
  );
}

interface StatItem {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
}

interface StatsCardProps {
  title: string;
  titleIcon: React.ElementType;
  stats: StatItem[];
}

function StatsCard({ title, titleIcon: TitleIcon, stats }: StatsCardProps) {
  return (
    <div className="bg-card border rounded-xl p-5">
      {/* 卡片标题 */}
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/50">
        <TitleIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {/* 统计项 */}
      <div className="space-y-5">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconColor}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopConsumersTable({ data }: { data: TopConsumer[] }) {
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">企业消耗排行榜 TOP 10</h2>
        <p className="text-xs text-muted-foreground mt-0.5">按累计消耗金额排序</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              <th className="px-5 py-3 text-left font-medium">排名</th>
              <th className="px-5 py-3 text-left font-medium">名称/ID</th>
              <th className="px-5 py-3 text-right font-medium">消耗金额</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id} className="border-t text-sm">
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index < 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-foreground">
                  {formatAmount(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelLeaderboardTable({ data }: { data: ModelUsage[] }) {
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000000) return `${(tokens / 1000000000).toFixed(1)}B`;
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const maxTokens = Math.max(...data.map(d => d.tokens));
  
  // 分成两列数据
  const midPoint = Math.ceil(data.length / 2);
  const leftColumn = data.slice(0, midPoint);
  const rightColumn = data.slice(midPoint);

  const ModelItem = ({ item, index }: { item: ModelUsage; index: number }) => (
    <div className="flex items-center gap-3 py-2 hover:bg-muted/20 transition-colors rounded-md px-2">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0 ${
        index < 3 ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
      }`}>
        {index + 1}
      </span>
      <span className="font-medium text-foreground font-mono text-sm flex-1 truncate">{item.model}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            style={{ width: `${(item.tokens / maxTokens) * 100}%` }}
          />
        </div>
        <span className="text-muted-foreground font-mono text-xs w-14 text-right">
          {formatTokens(item.tokens)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-x-8">
        {/* 左列 */}
        <div className="space-y-1">
          {leftColumn.map((item, index) => (
            <ModelItem key={item.model} item={item} index={index} />
          ))}
        </div>
        {/* 右列 */}
        <div className="space-y-1">
          {rightColumn.map((item, index) => (
            <ModelItem key={item.model} item={item} index={midPoint + index} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminResourceStats() {
  const [stats, setStats] = useState<FinancialStats>({
    totalRecharge: 0,
    totalConsumed: 0,
    balance: 0,
  });
  const [topConsumers, setTopConsumers] = useState<TopConsumer[]>(MOCK_TOP_CONSUMERS);
  const [modelAnalysisTab, setModelAnalysisTab] = useState<"consumption" | "calls">("consumption");
  const [daysRange, setDaysRange] = useState<7 | 14 | 30>(14);
  const [leaderboardDaysRange, setLeaderboardDaysRange] = useState<7 | 14 | 30>(14);

  useEffect(() => {
    fetchFinancialStats();
  }, []);

  const fetchFinancialStats = async () => {
    // Fetch total balance from enterprise_balances
    const { data: balances } = await supabase
      .from("enterprise_balances")
      .select("balance, total_consumed");
    
    if (balances) {
      const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0);
      const totalConsumed = balances.reduce((sum, b) => sum + (b.total_consumed || 0), 0);
      
      // Fetch total recharge from balance_records
      const { data: records } = await supabase
        .from("balance_records")
        .select("amount, type")
        .eq("type", "recharge");
      
      const totalRecharge = (records || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      
      setStats({
        totalRecharge,
        totalConsumed,
        balance: totalBalance,
      });
    }
  };

  // 生成指定天数的模拟数据
  const generateDataByDays = (days: number) => {
    const models = ["gpt-4o", "claude-3.5-sonnet", "gpt-4-turbo", "gemini-1.5-pro", "llama-3-70b"];
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const row: DailyTokenUsage = { date: dateStr };
      models.forEach((model) => {
        row[model] = Math.round(5000000 + Math.random() * 15000000);
      });
      return row;
    });
  };

  // ECharts option for stacked bar chart (模型消耗分布)
  const getStackedBarOption = () => {
    const models = ["gpt-4o", "claude-3.5-sonnet", "gpt-4-turbo", "gemini-1.5-pro", "llama-3-70b"];
    const colors = ["#f472b6", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80"];
    const data = generateDataByDays(daysRange);

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: (params: any) => {
          // 按值从高到低排序
          const sortedParams = [...params].sort((a: any, b: any) => b.value - a.value);
          let total = 0;
          let items = sortedParams.map((p: any) => {
            total += p.value;
            return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${(p.value / 1000000).toFixed(1)}M tokens`;
          }).join("<br/>");
          return `<strong>${params[0].axisValue}</strong><br/>${items}<br/><strong>Total: ${(total / 1000000).toFixed(1)}M tokens</strong>`;
        },
      },
      legend: {
        show: false,
      },
      grid: {
        left: 60,
        right: 20,
        top: 20,
        bottom: 30,
      },
      xAxis: {
        type: "category" as const,
        data: data.map(d => d.date),
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        name: "tokens",
        nameTextStyle: {
          color: "#6b7280",
          fontSize: 11,
          padding: [0, 0, 0, -40],
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
          formatter: (value: number) => `${(value / 1000000).toFixed(0)}M`,
        },
      },
      series: models.map((model, index) => ({
        name: model,
        type: "bar" as const,
        stack: "Total",
        barWidth: "50%",
        itemStyle: { color: colors[index] },
        data: data.map(d => d[model]),
      })),
    };
  };

  // ECharts option for model calls distribution (模型调用分布)
  const getModelCallsOption = () => {
    const models = ["gpt-4o", "claude-3.5-sonnet", "gpt-4-turbo", "gemini-1.5-pro", "llama-3-70b"];
    const colors = ["#6366f1", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa"];
    const data = generateDataByDays(daysRange);

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: (params: any) => {
          // 按值从高到低排序
          const sortedParams = [...params].sort((a: any, b: any) => b.value - a.value);
          let total = 0;
          let items = sortedParams.map((p: any) => {
            total += p.value;
            return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${p.value.toLocaleString()}次`;
          }).join("<br/>");
          return `<strong>${params[0].axisValue}</strong><br/>${items}<br/><strong>Total: ${total.toLocaleString()}次</strong>`;
        },
      },
      legend: {
        show: false,
      },
      grid: {
        left: 50,
        right: 20,
        top: 20,
        bottom: 30,
      },
      xAxis: {
        type: "category" as const,
        data: data.map(d => d.date),
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        name: "次",
        nameTextStyle: {
          color: "#6b7280",
          fontSize: 11,
          padding: [0, 0, 0, -30],
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
          formatter: (value: number) => `${value}`,
        },
      },
      series: models.map((model, index) => ({
        name: model,
        type: "bar" as const,
        stack: "Total",
        barWidth: "50%",
        itemStyle: { color: colors[index] },
        data: data.map(() => Math.round(100 + Math.random() * 5000)),
      })),
    };
  };

  // ECharts option for consumption trend area chart
  const getConsumptionTrendOption = () => {
    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: (params: any) => {
          const item = params[0];
          return `<strong>${item.axisValue}</strong><br/>消费金额：¥${item.value.toLocaleString()}`;
        },
      },
      grid: {
        left: 50,
        right: 20,
        top: 20,
        bottom: 30,
      },
      xAxis: {
        type: "category" as const,
        boundaryGap: false,
        data: CONSUMPTION_TREND_DATA.map(d => d.date),
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 11 },
      },
      yAxis: {
        type: "value" as const,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
          formatter: (value: number) => `¥${(value / 1000).toFixed(0)}K`,
        },
      },
      series: [{
        name: "消费金额",
        type: "line" as const,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        data: CONSUMPTION_TREND_DATA.map(d => d.consumption),
        lineStyle: {
          color: "#3b82f6",
          width: 2,
        },
        itemStyle: {
          color: "#3b82f6",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59, 130, 246, 0.3)" },
              { offset: 1, color: "rgba(59, 130, 246, 0.05)" },
            ],
          },
        },
      }],
    };
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">运营概览</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台运营数据总览</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="finance" className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="finance">财务运营</TabsTrigger>
          <TabsTrigger value="model">模型调用</TabsTrigger>
        </TabsList>

        {/* Tab 1: 财务运营 */}
        <TabsContent value="finance" className="mt-6 space-y-6">
          {/* 核心指标 */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="累计充值"
              value={`¥${stats.totalRecharge.toLocaleString()}`}
              icon={CreditCard}
              color="blue"
            />
            <MetricCard
              label="累计消耗"
              value={`¥${stats.totalConsumed.toLocaleString()}`}
              icon={TrendingDown}
              color="amber"
            />
            <MetricCard
              label="资金池余额"
              value={`¥${stats.balance.toLocaleString()}`}
              icon={Wallet}
              color="green"
            />
          </div>

          {/* 平台消费趋势 */}
          <div className="bg-card border rounded-xl p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">平台消费趋势</h2>
              <p className="text-xs text-muted-foreground mt-0.5">近 14 天平台消费金额变化</p>
            </div>
            <ReactECharts
              option={getConsumptionTrendOption()}
              style={{ height: 280 }}
              opts={{ renderer: "canvas" }}
            />
          </div>

          {/* Top 10 消耗排行榜 */}
          <TopConsumersTable data={topConsumers} />
        </TabsContent>

        {/* Tab 2: 模型调用 */}
        <TabsContent value="model" className="mt-6 space-y-6">
          {/* 核心指标 - 3卡片布局 */}
          <div className="grid grid-cols-3 gap-4">
            <StatsCard
              title="平台总览"
              titleIcon={Layers}
              stats={[
                { label: "接入模型数", value: "106", icon: Cpu, iconColor: "bg-blue-50 text-blue-500" },
                { label: "接入渠道数", value: "16", icon: Globe, iconColor: "bg-pink-50 text-pink-500" },
              ]}
            />
            <StatsCard
              title="资源消耗"
              titleIcon={Zap}
              stats={[
                { label: "今日Token消耗", value: "144.4k", icon: BarChart2, iconColor: "bg-green-50 text-green-500" },
                { label: "总Token消耗", value: "153.7M", icon: Database, iconColor: "bg-indigo-50 text-indigo-500" },
              ]}
            />
            <StatsCard
              title="调用统计"
              titleIcon={Activity}
              stats={[
                { label: "APIKey总数", value: "108", icon: FileKey, iconColor: "bg-cyan-50 text-cyan-500" },
                { label: "总请求次数", value: "39316", icon: Activity, iconColor: "bg-amber-50 text-amber-500" },
              ]}
            />
          </div>

          {/* 模型数据分析 */}
          <div className="bg-card border rounded-xl p-5">
            {/* 标题和时间范围切换 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">模型数据分析</h2>
              </div>
              {/* 时间范围切换 */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDaysRange(days as 7 | 14 | 30)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      daysRange === days
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {days}天
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tab按钮 */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setModelAnalysisTab("consumption")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  modelAnalysisTab === "consumption"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                模型消耗分布
              </button>
              <button
                onClick={() => setModelAnalysisTab("calls")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  modelAnalysisTab === "calls"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                模型调用分布
              </button>
            </div>
            
            <ReactECharts
              option={modelAnalysisTab === "consumption" ? getStackedBarOption() : getModelCallsOption()}
              style={{ height: 320 }}
              opts={{ renderer: "canvas" }}
            />
          </div>

          {/* 模型排行榜 */}
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">模型调用排行榜</h2>
                <p className="text-xs text-muted-foreground mt-0.5">按 Token 消耗量排序</p>
              </div>
              {/* 时间范围切换 */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                {[7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setLeaderboardDaysRange(days as 7 | 14 | 30)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      leaderboardDaysRange === days
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {days}天
                  </button>
                ))}
              </div>
            </div>
            <ModelLeaderboardTable data={generateModelUsageByDays(leaderboardDaysRange)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
