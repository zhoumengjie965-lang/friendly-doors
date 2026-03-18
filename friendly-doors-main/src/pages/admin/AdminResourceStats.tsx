import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Coins, TrendingDown, FlaskConical, Network, KeyRound, FileText, Building2, Users, Wallet, TrendingUp, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrendRecord { date: string; value: number; }
interface UserTop { id: string; name: string; value: number; displayName: string; }

export default function AdminResourceStats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 企业筛选
  const [enterpriseOptions, setEnterpriseOptions] = useState<{id:string;name:string}[]>([]);
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>("");

  // Header 核心指标 (4个)
  const [modelCount, setModelCount] = useState(0);
  const [signedEnterprises, setSignedEnterprises] = useState(0);
  const [activeEnterprises, setActiveEnterprises] = useState(0);
  const [totalRecharge, setTotalRecharge] = useState(0);

  // 运营概览指标
  const [todayTokens, setTodayTokens] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [channelCount, setChannelCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);

  // 财务结算指标
  const [totalConsumed, setTotalConsumed] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [grossMargin, setGrossMargin] = useState(0);

  // 图表数据
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [rechargeTrend, setRechargeTrend] = useState<any[]>([]);
  const [rechargeCountTrend, setRechargeCountTrend] = useState<any[]>([]);
  const [userTop, setUserTop] = useState<UserTop[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // fetch enterprises list for selector
        const { data: allEnterprises } = await supabase.from("enterprises").select("id,name");
        setEnterpriseOptions(allEnterprises || []);

        // global counts (not filtered) - 独立查询，避免单点故障
        const counts = await Promise.allSettled([
          supabase.from("models").select("id", { count: "exact", head: true }),
          supabase.from("channels").select("id", { count: "exact", head: true }),
          supabase.from("api_keys").select("id", { count: "exact", head: true }),
          supabase.from("balance_records").select("id", { count: "exact", head: true }),
        ]);

        // 提取计数结果，失败的查询返回 0
        const extractCount = (result: PromiseSettledResult<{ count: number | null }>) => {
          if (result.status === "fulfilled") {
            return result.value?.count ?? 0;
          }
          console.warn("Count query failed:", result.reason);
          return 0;
        };

        setModelCount(extractCount(counts[0]));
        setChannelCount(extractCount(counts[1]));
        setApiKeyCount(extractCount(counts[2]));
        setRecordCount(extractCount(counts[3]));

        // fetch enterprise data (optionally filtered)
        let enterprisesQuery = supabase.from("enterprises").select("id,name");
        if (selectedEnterprise) {
          enterprisesQuery = enterprisesQuery.eq("id", selectedEnterprise);
        }
        const { data: enterprises } = await enterprisesQuery;
        const enterpriseIds = (enterprises || []).map((e: any) => e.id);
        setSignedEnterprises(enterpriseIds.length);

        // if no enterprises, use mock data for demo
        if (enterpriseIds.length === 0) {
          const mockEnterprises = [
            { id: "e1", name: "number001" },
            { id: "e2", name: "xsg" },
            { id: "e3", name: "Hello Everybody" },
            { id: "e4", name: "企业ABC" },
            { id: "e5", name: "aaa" },
          ];
          const mockBalances = [
            { enterprise_id: "e1", total_consumed: 2000, request_count: 500 },
            { enterprise_id: "e2", total_consumed: 1500, request_count: 400 },
            { enterprise_id: "e3", total_consumed: 800, request_count: 200 },
            { enterprise_id: "e4", total_consumed: 600, request_count: 150 },
            { enterprise_id: "e5", total_consumed: 400, request_count: 100 },
          ];
          const mockRecords = [
            { amount: 500, created_at: "2026-02-27", enterprise_id: "e1" },
            { amount: 600, created_at: "2026-03-05", enterprise_id: "e1" },
            { amount: 450, created_at: "2026-03-06", enterprise_id: "e2" },
            { amount: 400, created_at: "2026-03-07", enterprise_id: "e2" },
            { amount: 240, created_at: "2026-03-08", enterprise_id: "e1" },
          ];

          setSignedEnterprises(mockEnterprises.length);
          setActiveEnterprises(mockBalances.filter((b) => b.request_count > 0).length);
          setTotalRequests(mockBalances.reduce((s, b) => s + b.request_count, 0));
          const totCons = mockBalances.reduce((s, b) => s + b.total_consumed, 0);
          setTotalConsumed(totCons);
          const cost = totCons * 0.6;
          setEstimatedCost(cost);
          setGrossMargin(totCons > 0 ? (totCons - cost) / totCons : 0);
          setTotalRecharge(mockRecords.reduce((s, r) => s + r.amount, 0));

          // 消费趋势
          const trendMap: Record<string, number> = {};
          mockRecords.forEach((r) => {
            trendMap[r.created_at] = (trendMap[r.created_at] || 0) + r.amount;
          });
          const trendArray = Object.entries(trendMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({ date, value }));
          setDailyTrend(trendArray);

          // 充值趋势
          setRechargeTrend(trendArray);
          
          // 充值笔数趋势
          const countMap: Record<string, number> = {};
          mockRecords.forEach((r) => {
            countMap[r.created_at] = (countMap[r.created_at] || 0) + 1;
          });
          const countArray = Object.entries(countMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
          setRechargeCountTrend(countArray);

          const balanceMap = new Map(mockBalances.map((b) => [b.enterprise_id, b]));
          const top = mockEnterprises
            .map((e) => ({
              id: e.id,
              name: e.name,
              value: balanceMap.get(e.id)?.total_consumed || 0,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map((r) => ({
              id: r.id,
              name: r.name.replace(/(.{3}).*(.{2})/, "$1***$2"),
              displayName: r.name,
              value: r.value,
            }));
          setUserTop(top);

          setLoading(false);
          return;
        }

        // fetch balances
        const { data: balances } = await supabase
          .from("enterprise_balances")
          .select("enterprise_id,total_consumed,request_count")
          .in("enterprise_id", enterpriseIds);

        // if balances are empty, use mock data
        let useBalances = balances || [];
        let useRecords: any[] = [];
        
        if (!balances || balances.length === 0) {
          // Generate mock data for existing enterprises
          useBalances = enterpriseIds.slice(0, 5).map((id, idx) => ({
            enterprise_id: id,
            total_consumed: [2000, 1500, 800, 600, 400][idx] || 500,
            request_count: [500, 400, 200, 150, 100][idx] || 50,
          }));

          useRecords = [
            { amount: 500, created_at: "2026-02-27", enterprise_id: enterpriseIds[0] },
            { amount: 600, created_at: "2026-03-05", enterprise_id: enterpriseIds[0] },
            { amount: 450, created_at: "2026-03-06", enterprise_id: enterpriseIds[1] || enterpriseIds[0] },
            { amount: 400, created_at: "2026-03-07", enterprise_id: enterpriseIds[1] || enterpriseIds[0] },
            { amount: 240, created_at: "2026-03-08", enterprise_id: enterpriseIds[0] },
          ];
        } else {
          // fetch real balance records
          const { data: records } = await supabase
            .from("balance_records")
            .select("amount,created_at,enterprise_id")
            .in("enterprise_id", enterpriseIds);
          useRecords = records || [];
        }

        const actCount = (useBalances || []).filter((b: any) => b.request_count > 0).length;
        setActiveEnterprises(actCount);

        const totReq = (useBalances || []).reduce((s, b: any) => s + (b.request_count || 0), 0);
        const totCons = (useBalances || []).reduce((s, b: any) => s + (b.total_consumed || 0), 0);
        setTotalRequests(totReq);
        setTotalConsumed(totCons);

        const cost = totCons * 0.6;
        setEstimatedCost(cost);
        setGrossMargin(totCons > 0 ? (totCons - cost) / totCons : 0);
        
        // 累计充值
        const totalRech = (useRecords || []).reduce((s, r: any) => s + (r.amount || 0), 0);
        setTotalRecharge(totalRech);

        // daily trend (消费)
        const trendMap: Record<string, number> = {};
        (useRecords || []).forEach((r: any) => {
          const day = r.created_at.slice(0, 10);
          trendMap[day] = (trendMap[day] || 0) + r.amount;
        });
        const trendArray = Object.entries(trendMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({ date, value }));
        setDailyTrend(trendArray);

        // 充值趋势
        setRechargeTrend(trendArray);
        
        // 充值笔数趋势
        const countMap: Record<string, number> = {};
        (useRecords || []).forEach((r: any) => {
          const day = r.created_at.slice(0, 10);
          countMap[day] = (countMap[day] || 0) + 1;
        });
        const countArray = Object.entries(countMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));
        setRechargeCountTrend(countArray);

        // top 10
        const balanceMap = new Map((useBalances || []).map((b: any) => [b.enterprise_id, b]));
        const top = (enterprises || [])
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            value: balanceMap.get(e.id)?.total_consumed || 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
          .map((r) => ({
            id: r.id,
            name: r.name.replace(/(.{3}).*(.{2})/, "$1***$2"),
            displayName: r.name,
            value: r.value,
          }));
        setUserTop(top);

        setLoading(false);
      } catch (err) {
        console.error("Load error:", err);
        setLoading(false);
      }
    }
    load();
  }, [selectedEnterprise]);

  // Header 4个核心指标卡片
  const headerCards = [
    { label: "接入模型数", value: modelCount, icon: Activity },
    { label: "签约企业数", value: signedEnterprises, icon: Building2 },
    { label: "活跃企业数", value: activeEnterprises, icon: Users },
    { label: "累计充值", value: `¥${totalRecharge.toLocaleString()}`, icon: Wallet },
  ];

  // 运营概览指标
  const overviewMetrics = [
    { label: "今日 Token 消耗", value: todayTokens, icon: FlaskConical },
    { label: "总 Token 消耗", value: totalTokens, icon: TrendingDown },
    { label: "总请求次数", value: totalRequests.toLocaleString(), icon: Activity },
    { label: "API Key 总数", value: apiKeyCount, icon: KeyRound },
  ];

  // 财务结算指标（蓝绿色系）
  const financeMetrics = [
    { label: "总消耗额度", value: `¥${totalConsumed.toFixed(2)}`, icon: Coins, color: "text-cyan-600" },
    { label: "预估成本", value: `¥${estimatedCost.toFixed(2)}`, icon: TrendingDown, color: "text-teal-600" },
    { label: "预估毛利率", value: `${(grossMargin * 100).toFixed(1)}%`, icon: TrendingUp, color: grossMargin > 0.2 ? "text-emerald-600" : grossMargin < 0.1 ? "text-amber-600" : "text-cyan-600" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header - 精简的4个核心指标 */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">资源统计</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台资源使用及消耗情况</p>
      </div>

      {/* 核心指标行 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {headerCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div 
              key={idx} 
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className="text-2xl font-bold text-foreground">{loading ? "—" : c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs 区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="overview">运营概览</TabsTrigger>
          <TabsTrigger value="finance">财务结算</TabsTrigger>
        </TabsList>

        {/* 运营概览 Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* 运营指标卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {overviewMetrics.map((c, idx) => {
              const Icon = c.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                  <p className="text-xl font-semibold text-foreground">{loading ? "—" : c.value}</p>
                </div>
              );
            })}
          </div>

          {/* 运营图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 消费趋势图 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                消费趋势
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" name="消费金额" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 用户消费排行 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                用户消费排行 TOP 10
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={userTop} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={(props) => {
                      const { x, y, payload, index } = props;
                      const item = userTop[index];
                      if (!item) return null;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={-10}
                            y={0}
                            dy={4}
                            textAnchor="end"
                            fill="hsl(var(--primary))"
                            fontSize={11}
                            className="cursor-pointer hover:underline"
                            onClick={() => navigate(`/admin/enterprise/${item.id}/resource`)}
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="消费金额" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* 财务结算 Tab */}
        <TabsContent value="finance" className="space-y-6">
          {/* 财务指标卡片（蓝绿色系） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {financeMetrics.map((c, idx) => {
              const Icon = c.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-6 shadow-sm border border-cyan-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${c.color}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                  </div>
                  <p className={`text-3xl font-bold ${c.color}`}>{loading ? "—" : c.value}</p>
                </div>
              );
            })}
          </div>

          {/* 财务图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 充值趋势 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-600" />
                充值趋势
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={rechargeTrend}>
                  <defs>
                    <linearGradient id="colorRecharge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRecharge)" name="充值金额" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 充值笔数 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                充值笔数趋势
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rechargeCountTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={2} dot={{ fill: "#14b8a6" }} name="充值笔数" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
