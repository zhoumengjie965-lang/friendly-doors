import { useState } from "react";
import { Building2, User, CreditCard, TrendingDown, Wallet, Cpu, BarChart2, MousePointerClick } from "lucide-react";
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
  type: "enterprise" | "personal";
  amount: number;
  tokens: number;
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
  { id: "ent-001", name: "星辰科技", type: "enterprise", amount: 58420, tokens: 12450000 },
  { id: "ent-002", name: "未来智能", type: "enterprise", amount: 47830, tokens: 10200000 },
  { id: "per-001", name: "张明", type: "personal", amount: 39600, tokens: 8500000 },
  { id: "ent-003", name: "云图网络", type: "enterprise", amount: 31250, tokens: 6700000 },
  { id: "per-002", name: "李华", type: "personal", amount: 27400, tokens: 5900000 },
  { id: "ent-004", name: "数链信息", type: "enterprise", amount: 22100, tokens: 4800000 },
  { id: "per-003", name: "王磊", type: "personal", amount: 18900, tokens: 4100000 },
  { id: "ent-005", name: "智联系统", type: "enterprise", amount: 14760, tokens: 3200000 },
  { id: "per-004", name: "刘伟", type: "personal", amount: 9320, tokens: 2000000 },
  { id: "ent-006", name: "启明数据", type: "enterprise", amount: 5480, tokens: 1200000 },
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

function TopConsumersTable({ data }: { data: TopConsumer[] }) {
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">消耗排行榜 TOP 10</h2>
        <p className="text-xs text-muted-foreground mt-0.5">按累计消耗金额排序</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              <th className="px-5 py-3 text-left font-medium">排名</th>
              <th className="px-5 py-3 text-left font-medium">名称/ID</th>
              <th className="px-5 py-3 text-left font-medium">类型</th>
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
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {item.type === "enterprise" ? (
                      <>
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">企业</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">个人</span>
                      </>
                    )}
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

  return (
    <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground">
              <th className="px-5 py-3 text-left font-medium w-16">排名</th>
              <th className="px-5 py-3 text-left font-medium">模型名</th>
              <th className="px-5 py-3 text-right font-medium">Token 量</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.model} className="border-t text-sm">
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index < 3 ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-medium text-foreground font-mono text-sm">{item.model}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${(item.tokens / maxTokens) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground font-mono text-xs w-12 text-right">
                      {formatTokens(item.tokens)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

  // ECharts option for stacked bar chart
  const getStackedBarOption = () => {
    const models = ["gpt-4o", "claude-3.5-sonnet", "gpt-4-turbo", "gemini-1.5-pro", "llama-3-70b"];
    const colors = ["#f472b6", "#60a5fa", "#a78bfa", "#fb923c", "#4ade80"];

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: (params: any) => {
          let total = 0;
          let items = params.map((p: any) => {
            total += p.value;
            return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${(p.value / 1000000).toFixed(1)}M`;
          }).join("<br/>");
          return `<strong>${params[0].axisValue}</strong><br/>${items}<br/><strong>Total: ${(total / 1000000).toFixed(1)}M</strong>`;
        },
      },
      legend: {
        data: models,
        bottom: 0,
        textStyle: { color: "#6b7280", fontSize: 11 },
      },
      grid: {
        left: 50,
        right: 20,
        top: 20,
        bottom: 50,
      },
      xAxis: {
        type: "category" as const,
        data: DAILY_TOKEN_DATA.map(d => d.date),
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
          formatter: (value: number) => `${(value / 1000000).toFixed(0)}M`,
        },
      },
      series: models.map((model, index) => ({
        name: model,
        type: "bar" as const,
        stack: "Total",
        barWidth: "50%",
        itemStyle: { color: colors[index] },
        data: DAILY_TOKEN_DATA.map(d => d[model]),
      })),
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

          {/* Top 10 消耗排行榜 */}
          <TopConsumersTable data={topConsumers} />
        </TabsContent>

        {/* Tab 2: 模型调用 */}
        <TabsContent value="model" className="mt-6 space-y-6">
          {/* 核心指标 */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="接入模型数"
              value="8 个"
              icon={Cpu}
              color="blue"
            />
            <MetricCard
              label="总 Token 消耗"
              value="483.2M"
              icon={BarChart2}
              color="amber"
            />
            <MetricCard
              label="总请求次数"
              value="1,284,562 次"
              icon={MousePointerClick}
              color="green"
            />
          </div>

          {/* 堆叠柱状图 */}
          <div className="bg-card border rounded-xl p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">模型消耗趋势</h2>
              <p className="text-xs text-muted-foreground mt-0.5">近 7 天各模型 Token 消耗分布</p>
            </div>
            <ReactECharts
              option={getStackedBarOption()}
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
              <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border">
                按本周统计
              </span>
            </div>
            <ModelLeaderboardTable data={MOCK_MODEL_USAGE} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
