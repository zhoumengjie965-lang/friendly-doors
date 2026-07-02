import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────

interface QpsDataPoint { time: string; qps: number; }
interface ErrorRatePoint { time: string; errorRate: number; slaErrorRate?: number; }
interface LatencyPoint { time: string; avgMs: number; maxMs: number; }
interface ModelTopItem { name: string; count: number; }
interface UserTopItem { name: string; count: number; }
interface QuotaTrendPoint { time: string; consumed: number; remaining: number; }
interface CommonErrorMessage { message: string; occurrences: number; affectedUsers: number; affectedModels: number; }
interface AffectedUserRank { user: string; errorRate: number; totalErrors: number; }
interface ModelPerfRow { model: string; requests: number; avgLatency: number; maxLatency: number; }

// ─── Constants ───────────────────────────────────────────────────────────

const PIE_COLORS: Record<string, string> = {
  upstream_request_failed: "#4ade80",
  other: "#f97316",
  "502": "#a3a3a3",
  engine_overloaded: "#eab308",
  limit: "#3b82f6",
  timeout: "#ec4899",
  tool_call: "#8b5cf6",
  content_filter: "#ef4444",
  deserialization_error: "#06b6d4",
  rate_limit: "#3b82f6",
  // 归因维度颜色
  platform: "#ef4444",
  user: "#eab308",
  third_party: "#8b5cf6",
  infrastructure: "#f97316",
  unknown: "#a3a3a3",
  // HTTP 状态码颜色
  "400": "#eab308",
  "401": "#f97316",
  "403": "#8b5cf6",
  "429": "#3b82f6",
  "500": "#ef4444",
  "503": "#06b6d4",
};

// ─── 饼图多维度数据 ───

type SlaIncludedTag = "yes" | "no" | "pending";

interface PieSlice {
  name: string;
  value: number;
  slaIncluded: SlaIncludedTag;
}

const PIE_DATA_BY_TYPE: PieSlice[] = [
  { name: "upstream_request_failed", value: 45, slaIncluded: "yes" },
  { name: "other", value: 20, slaIncluded: "pending" },
  { name: "502", value: 8, slaIncluded: "no" },
  { name: "engine_overloaded", value: 12, slaIncluded: "yes" },
  { name: "rate_limit", value: 6, slaIncluded: "no" },
  { name: "timeout", value: 5, slaIncluded: "yes" },
  { name: "tool_call", value: 4, slaIncluded: "pending" },
  { name: "content_filter", value: 3, slaIncluded: "no" },
  { name: "deserialization_error", value: 2, slaIncluded: "yes" },
];

const PIE_DATA_BY_ATTRIBUTION: PieSlice[] = [
  { name: "platform", value: 52, slaIncluded: "yes" },
  { name: "user", value: 15, slaIncluded: "no" },
  { name: "third_party", value: 18, slaIncluded: "pending" },
  { name: "infrastructure", value: 8, slaIncluded: "yes" },
  { name: "unknown", value: 7, slaIncluded: "pending" },
];

const PIE_DATA_BY_HTTP: PieSlice[] = [
  { name: "400", value: 18, slaIncluded: "no" },
  { name: "401", value: 6, slaIncluded: "no" },
  { name: "403", value: 8, slaIncluded: "no" },
  { name: "429", value: 10, slaIncluded: "no" },
  { name: "500", value: 32, slaIncluded: "yes" },
  { name: "502", value: 16, slaIncluded: "yes" },
  { name: "503", value: 12, slaIncluded: "pending" },
];

// ── Tab 1: 整体数据表现 ──

const QPS_DATA: QpsDataPoint[] = [
  { time: "17:15", qps: 320 }, { time: "17:18", qps: 340 },
  { time: "17:20", qps: 380 }, { time: "17:22", qps: 420 },
  { time: "17:24", qps: 480 }, { time: "17:26", qps: 520 },
  { time: "17:28", qps: 540 }, { time: "17:30", qps: 500 },
  { time: "17:32", qps: 450 }, { time: "17:34", qps: 430 },
  { time: "17:36", qps: 460 }, { time: "17:38", qps: 440 },
  { time: "17:40", qps: 400 }, { time: "17:42", qps: 380 },
  { time: "17:44", qps: 420 }, { time: "17:46", qps: 410 },
  { time: "17:48", qps: 370 }, { time: "17:50", qps: 350 },
  { time: "17:52", qps: 390 }, { time: "17:54", qps: 430 },
  { time: "17:56", qps: 380 }, { time: "17:58", qps: 340 },
  { time: "18:00", qps: 360 }, { time: "18:02", qps: 400 },
  { time: "18:04", qps: 450 }, { time: "18:06", qps: 520 },
  { time: "18:08", qps: 550 }, { time: "18:10", qps: 480 },
];

const LATENCY_DATA: LatencyPoint[] = [
  { time: "17:20", avgMs: 320, maxMs: 1200 },
  { time: "17:25", avgMs: 380, maxMs: 2100 },
  { time: "17:30", avgMs: 350, maxMs: 1800 },
  { time: "17:35", avgMs: 420, maxMs: 2500 },
  { time: "17:40", avgMs: 300, maxMs: 1100 },
  { time: "17:45", avgMs: 330, maxMs: 1400 },
  { time: "17:50", avgMs: 370, maxMs: 1900 },
  { time: "17:55", avgMs: 310, maxMs: 1300 },
  { time: "18:00", avgMs: 450, maxMs: 2800 },
  { time: "18:05", avgMs: 520, maxMs: 3200 },
  { time: "18:10", avgMs: 380, maxMs: 2000 },
];

const MODEL_TOP_10: ModelTopItem[] = [
  { name: "MiniMax/MiniMax-M3", count: 7 },
  { name: "claude-haiku-4-5-202...", count: 14 },
  { name: "claude-opus-4-7", count: 16 },
  { name: "claude-opus-4-8", count: 18 },
  { name: "claude-sonnet-4-6", count: 20 },
  { name: "deepseek-v4-flash", count: 88 },
  { name: "deepseek/v4-pro", count: 43 },
  { name: "deepseek/deepseek-...", count: 9 },
  { name: "deepseek-chat", count: 36 },
  { name: "demi-3-flash-preview", count: 60 },
];

const QUOTA_TREND_DATA: QuotaTrendPoint[] = [
  { time: "17:15", consumed: 3200, remaining: 46800 },
  { time: "17:20", consumed: 3800, remaining: 46200 },
  { time: "17:25", consumed: 4500, remaining: 45500 },
  { time: "17:30", consumed: 5200, remaining: 44800 },
  { time: "17:35", consumed: 5800, remaining: 44200 },
  { time: "17:40", consumed: 4100, remaining: 45900 },
  { time: "17:45", consumed: 3500, remaining: 46500 },
  { time: "17:50", consumed: 4300, remaining: 45700 },
  { time: "17:55", consumed: 3900, remaining: 46100 },
  { time: "18:00", consumed: 4800, remaining: 45200 },
  { time: "18:05", consumed: 5500, remaining: 44500 },
  { time: "18:10", consumed: 4400, remaining: 45600 },
];

const USER_TOP_10: UserTopItem[] = [
  { name: "szhmtx20260625_01", count: 1128447 },
  { name: "dhgq20260616", count: 636567 },
  { name: "u_1992_copq4r", count: 554606 },
  { name: "kaishitong", count: 354696 },
  { name: "htjk20260420_01", count: 264254 },
  { name: "tongjian_prd", count: 287547 },
  { name: "gzcy20260608_01", count: 249359 },
  { name: "qtzn20280521_01", count: 239032 },
  { name: "guangzhouheuai", count: 210509 },
  { name: "u_1815_lwycnq", count: 118960 },
];

const MODEL_PERF: ModelPerfRow[] = [
  { model: "claude-opus-4-8", requests: 17, avgLatency: 16509, maxLatency: 45065 },
  { model: "deepseek-v4-flash", requests: 78, avgLatency: 8611, maxLatency: 70071 },
  { model: "deepseek/deepseek-v4-pro", requests: 43, avgLatency: 8517, maxLatency: 34968 },
  { model: "gemini-2.5-flash", requests: 4, avgLatency: 2915, maxLatency: 3636 },
  { model: "gemini-2.5-pro", requests: 2, avgLatency: 1337, maxLatency: 1455 },
  { model: "glm-5.1", requests: 4, avgLatency: 7393, maxLatency: 12367 },
];

// ── Tab 2: 错误分析 ──

const ERROR_RATE_DATA: ErrorRatePoint[] = [
  { time: "17:15", errorRate: 0.8, slaErrorRate: 0.3 }, { time: "17:18", errorRate: 1.2, slaErrorRate: 0.5 },
  { time: "17:20", errorRate: 1.5, slaErrorRate: 0.6 }, { time: "17:22", errorRate: 1.1, slaErrorRate: 0.4 },
  { time: "17:24", errorRate: 1.8, slaErrorRate: 0.8 }, { time: "17:26", errorRate: 2.3, slaErrorRate: 1.0 },
  { time: "17:28", errorRate: 3.1, slaErrorRate: 1.5 }, { time: "17:30", errorRate: 2.6, slaErrorRate: 1.2 },
  { time: "17:32", errorRate: 1.9, slaErrorRate: 0.8 }, { time: "17:34", errorRate: 1.4, slaErrorRate: 0.5 },
  { time: "17:36", errorRate: 2.0, slaErrorRate: 0.9 }, { time: "17:38", errorRate: 1.7, slaErrorRate: 0.7 },
  { time: "17:40", errorRate: 1.3, slaErrorRate: 0.5 }, { time: "17:42", errorRate: 1.6, slaErrorRate: 0.7 },
  { time: "17:44", errorRate: 2.2, slaErrorRate: 1.0 }, { time: "17:46", errorRate: 1.8, slaErrorRate: 0.8 },
  { time: "17:48", errorRate: 1.2, slaErrorRate: 0.4 }, { time: "17:50", errorRate: 1.5, slaErrorRate: 0.6 },
  { time: "17:52", errorRate: 2.0, slaErrorRate: 0.9 }, { time: "17:54", errorRate: 2.5, slaErrorRate: 1.2 },
  { time: "17:56", errorRate: 1.9, slaErrorRate: 0.8 }, { time: "17:58", errorRate: 1.4, slaErrorRate: 0.5 },
  { time: "18:00", errorRate: 1.6, slaErrorRate: 0.7 }, { time: "18:02", errorRate: 2.1, slaErrorRate: 1.0 },
  { time: "18:04", errorRate: 3.5, slaErrorRate: 1.8 }, { time: "18:06", errorRate: 5.2, slaErrorRate: 3.0 },
  { time: "18:08", errorRate: 6.5, slaErrorRate: 4.2 }, { time: "18:10", errorRate: 2.0, slaErrorRate: 0.8 },
];

const COMMON_ERRORS: CommonErrorMessage[] = [
  { message: "upstream_request_failed: connection reset by peer", occurrences: 23, affectedUsers: 5, affectedModels: 3 },
  { message: "rate_limit_exceeded: quota exceeded for model deepseek-v4-flash", occurrences: 12, affectedUsers: 8, affectedModels: 2 },
  { message: "engine_overloaded: too many concurrent requests", occurrences: 9, affectedUsers: 4, affectedModels: 4 },
  { message: "timeout: request exceeded 30s deadline", occurrences: 6, affectedUsers: 3, affectedModels: 3 },
  { message: "502 Bad Gateway: upstream service unavailable", occurrences: 5, affectedUsers: 2, affectedModels: 2 },
  { message: "content_filter: response blocked by safety policy", occurrences: 3, affectedUsers: 1, affectedModels: 1 },
  { message: "deserialization_error: invalid JSON in tool_call response", occurrences: 2, affectedUsers: 1, affectedModels: 1 },
];

const AFFECTED_USERS: AffectedUserRank[] = [
  { user: "u_5199_qaqtug", errorRate: 23.5, totalErrors: 47 },
  { user: "ge20260622", errorRate: 20.0, totalErrors: 40 },
  { user: "zxty20260417_01", errorRate: 1.59, totalErrors: 8 },
  { user: "htjk20260420_01", errorRate: 0.82, totalErrors: 5 },
  { user: "kaishitong", errorRate: 0.45, totalErrors: 3 },
];

// ─── Tooltip Style ──────────────────────────────────────────────────────

const DARK_TOOLTIP = { backgroundColor: "#1a1d24", borderColor: "#333", borderRadius: 6, fontSize: 12, color: "#e5e7eb" };

// ─── Main Component ──────────────────────────────────────────────────────

type TabKey = "performance" | "errors";

const TABS: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: "performance", label: "整体数据表现", desc: "用于观察平台整体调用流量、性能表现、资源消耗、模型和渠道运行情况。" },
  { key: "errors", label: "错误分析", desc: "用于分析调用失败、错误类型、影响用户和高频错误，为后续 SLA 归因和问题排查提供基础。" },
];

export default function AdminServiceAvailability() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("Last 1 hour");
  const [refreshInterval, setRefreshInterval] = useState("30s");
  const [activeTab, setActiveTab] = useState<TabKey>("performance");
  const [errorRateMetric, setErrorRateMetric] = useState<"total" | "sla">("total");
  const [pieScope, setPieScope] = useState<"total" | "sla">("total");
  const [pieDimension, setPieDimension] = useState<"errorType" | "attribution" | "httpStatus">("errorType");

  // 获取指定维度的全部数据
  const getPieDataByDimension = (dim: "errorType" | "attribution" | "httpStatus") => {
    if (dim === "errorType") return PIE_DATA_BY_TYPE;
    if (dim === "attribution") return PIE_DATA_BY_ATTRIBUTION;
    return PIE_DATA_BY_HTTP;
  };

  // 当前饼图数据：总错误=全量，SLA 错误=仅 yes
  const currentPieData = useMemo(() => {
    const base = getPieDataByDimension(pieDimension);
    return pieScope === "sla" ? base.filter((d) => d.slaIncluded === "yes") : base;
  }, [pieScope, pieDimension]);

  const handleRefresh = () => { toast({ title: "数据已刷新" }); };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-gray-200 p-4 space-y-4">

      {/* ====== 顶部全局筛选器 ====== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">DS_PROMETHEUS</span>
          <Select value="prometheus" disabled>
            <SelectTrigger className="h-7 w-[140px] bg-[#181b20] border-gray-700 text-xs text-gray-300"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="prometheus">prometheus</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"><ChevronLeft className="w-4 h-4" /></Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-7 w-[130px] bg-[#181b20] border-gray-700 text-xs text-gray-300"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Last 1 hour">Last 1 hour</SelectItem>
              <SelectItem value="Last 6 hours">Last 6 hours</SelectItem>
              <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800"><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5" onClick={handleRefresh}><RefreshCw className="w-3 h-3" />Refresh</Button>
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="h-7 w-[70px] bg-[#181b20] border-gray-700 text-xs text-gray-300"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5s">5s</SelectItem>
              <SelectItem value="10s">10s</SelectItem>
              <SelectItem value="30s">30s</SelectItem>
              <SelectItem value="1m">1m</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ====== Tab 切换 ====== */}
      <div className="flex items-center gap-1 border-b border-[#232831]">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === tab.key ? "text-[#4ade80]" : "text-gray-400 hover:text-gray-200"}`}>
            {tab.label}
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4ade80]" />}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-500">{TABS.find(t => t.key === activeTab)?.desc}</p>

      {/* ================================================================ */}
      {/* ====== Tab 1: 整体数据表现 ====== */}
      {/* ================================================================ */}
      {activeTab === "performance" && (
        <div className="space-y-4">

          {/* Row 1-1: 实时请求量 + 平均响应时间 */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardPanel title="实时请求量 (QPS)">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={QPS_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="qpsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} interval={Math.max(0, Math.ceil(QPS_DATA.length / 8) - 1)} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[250, "auto"]} width={45} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <Tooltip contentStyle={DARK_TOOLTIP} formatter={(value: number) => [value, "总请求数/5min"]} />
                  <Area type="monotone" dataKey="qps" stroke="#4ade80" strokeWidth={1.5} fill="url(#qpsGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </DashboardPanel>

            <DashboardPanel title="平均响应时间 (ms)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={LATENCY_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={50} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <Tooltip contentStyle={DARK_TOOLTIP} />
                  <Bar dataKey="avgMs" fill="#4ade80" radius={[2, 2, 0, 0]} name="全局平均" barSize={14} />
                  <Bar dataKey="maxMs" fill="#eab308" radius={[2, 2, 0, 0]} name="最大响应时间" barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </DashboardPanel>
          </div>

          {/* Row 1-2: 热门模型请求量 + 配额消耗趋势 */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardPanel title="热门模型请求量 (Top 10)">
              <div className="space-y-1.5 pr-2 pt-1">
                {MODEL_TOP_10.map((item) => {
                  const maxCount = Math.max(...MODEL_TOP_10.map(m => m.count));
                  const pct = (item.count / maxCount) * 100;
                  const isHigh = item.name.includes("deepseek");
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className={`text-xs truncate min-w-0 ${isHigh ? "text-red-400 font-medium" : "text-gray-300"}`} style={{ maxWidth: 170 }}>{item.name}</span>
                      <div className="flex-1 h-4 bg-[#1a1d24] rounded-sm overflow-hidden relative min-w-0">
                        <div className={`h-full rounded-sm ${isHigh ? "bg-gradient-to-r from-red-600/70 to-red-400/40" : "bg-gradient-to-r from-green-600/50 to-green-400/20"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs tabular-nums font-mono shrink-0 ${isHigh ? "text-red-400" : "text-green-400"}`}>{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>

            <DashboardPanel title="配额消耗趋势">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={QUOTA_TREND_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="quotaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="remainGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={50} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <Tooltip contentStyle={DARK_TOOLTIP} />
                  <Area type="monotone" dataKey="remaining" stroke="#4ade80" strokeWidth={1.5} fill="url(#remainGradient)" name="剩余配额" />
                  <Area type="monotone" dataKey="consumed" stroke="#f97316" strokeWidth={1.5} fill="url(#quotaGradient)" name="已消耗" />
                </AreaChart>
              </ResponsiveContainer>
            </DashboardPanel>
          </div>

          {/* Row 1-3: 配额消耗 Top 用户 + 模型性能对比 */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardPanel title="配额消耗 Top 10 用户">
              <div className="space-y-1.5 pr-2 pt-1">
                {USER_TOP_10.map((user) => {
                  const maxCount = Math.max(...USER_TOP_10.map(u => u.count));
                  const pct = (user.count / maxCount) * 100;
                  const isTop3 = user.name === "szhmtx20260625_01" || user.name === "dhgq20260616" || user.name === "u_1992_copq4r";
                  return (
                    <div key={user.name} className="flex items-center gap-2">
                      <span className="text-xs truncate text-gray-300 min-w-0" style={{ maxWidth: 150 }}>{user.name}</span>
                      <div className="flex-1 h-4 bg-[#1a1d24] rounded-sm overflow-hidden relative min-w-0">
                        <div className={`h-full rounded-sm ${isTop3 ? "bg-gradient-to-r from-red-600/60 to-pink-400/30" : "bg-gradient-to-r from-green-600/40 to-green-400/15"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs tabular-nums font-mono shrink-0 ${isTop3 ? "text-red-400" : "text-gray-300"}`}>{user.count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>

            <DashboardPanel title="模型性能对比">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-gray-800">
                      <TableHead className="text-xs text-gray-400 py-2 px-3">模型</TableHead>
                      <TableHead className="text-xs text-gray-400 py-2 px-3 text-right">请求数</TableHead>
                      <TableHead className="text-xs text-gray-400 py-2 px-3 text-right">平均响应(ms)</TableHead>
                      <TableHead className="text-xs text-gray-400 py-2 px-3 text-right">最大响应(ms)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODEL_PERF.map((row, i) => (
                      <TableRow key={i} className="hover:bg-transparent border-b border-gray-800/50">
                        <TableCell className="py-2 px-3 text-[11px] text-gray-300">{row.model}</TableCell>
                        <TableCell className="py-2 px-3 text-[11px] text-right tabular-nums text-gray-300">{row.requests}</TableCell>
                        <TableCell className="py-2 px-3 text-[11px] text-right tabular-nums text-gray-300">{row.avgLatency.toLocaleString()}</TableCell>
                        <TableCell className="py-2 px-3 text-[11px] text-right tabular-nums text-gray-300">{row.maxLatency.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DashboardPanel>
          </div>

        </div>
      )}

      {/* ================================================================ */}
      {/* ====== Tab 2: 错误分析 ====== */}
      {/* ================================================================ */}
      {activeTab === "errors" && (
        <div className="space-y-4">

          {/* Row 2-1: 总错误率 + 错误类型分布 */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardPanel title="错误率 (%)">
              {/* 口径切换 */}
              <div className="flex items-center gap-1 mb-3">
                {(["total", "sla"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setErrorRateMetric(m)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      errorRateMetric === m
                        ? "bg-[#4ade80] text-[#0b0d10]"
                        : "bg-[#1a1d24] text-gray-400 hover:text-gray-200 border border-[#232831]"
                    }`}
                  >
                    {m === "total" ? "总错误率" : "SLA 错误率"}
                  </button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={ERROR_RATE_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} interval={Math.max(0, Math.ceil(ERROR_RATE_DATA.length / 8) - 1)} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v}%`} domain={[0, "auto"]} width={40} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <Tooltip
                    contentStyle={DARK_TOOLTIP}
                    formatter={(value: number) => [`${value}%`, errorRateMetric === "total" ? "总错误率" : "SLA 错误率"]}
                  />
                  <ReferenceLine
                    y={0.5}
                    stroke={errorRateMetric === "sla" ? "#ef4444" : "#6b7280"}
                    strokeDasharray={errorRateMetric === "sla" ? "4 4" : "3 3"}
                    strokeWidth={errorRateMetric === "sla" ? 1.2 : 0.8}
                    label={{
                      value: errorRateMetric === "sla" ? "SLA 0.5%" : "参考线（非 SLA）",
                      position: "insideTopRight",
                      fill: errorRateMetric === "sla" ? "#ef4444" : "#6b7280",
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={errorRateMetric === "total" ? "errorRate" : "slaErrorRate"}
                    stroke="#4ade80"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "#4ade80", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                {errorRateMetric === "total"
                  ? "总错误率 = 所有错误请求 / 总请求数（含用户侧异常、限流等非平台责任错误）"
                  : "SLA 错误率 = 平台有效且失败的错误请求 / 有效请求数（仅纳入平台责任范围内的错误）"}
              </p>
            </DashboardPanel>

            {/* 错误类型分布饼图（总错误 / SLA 错误 切换） */}
            <DashboardPanel title="错误类型分布">
              <div className="flex items-center gap-2 mb-3">
                {/* 口径切换：总错误 / SLA 错误 */}
                <div className="flex items-center gap-1">
                  {(["total", "sla"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPieScope(s)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                        pieScope === s
                          ? "bg-[#4ade80] text-[#0b0d10]"
                          : "bg-[#1a1d24] text-gray-400 hover:text-gray-200 border border-[#232831]"
                      }`}
                    >
                      {s === "total" ? "总错误" : "SLA 错误"}
                    </button>
                  ))}
                </div>
                {/* 维度切换 */}
                <div className="flex items-center gap-1 ml-auto">
                  {(["errorType", "attribution", "httpStatus"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setPieDimension(d)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                        pieDimension === d
                          ? "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40"
                          : "bg-[#1a1d24] text-gray-400 hover:text-gray-200 border border-[#232831]"
                      }`}
                    >
                      {d === "errorType" ? "Error Code" : d === "attribution" ? "错误归因" : "HTTP 状态码"}
                    </button>
                  ))}
                </div>
              </div>
              {currentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={currentPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={1}
                      label={({ name, value }: any) => `${name} (${value})`}
                      labelLine={{ stroke: "#444", strokeWidth: 0.5 }}
                    >
                      {currentPieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || "#666"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...DARK_TOOLTIP, zIndex: 9999 }}
                      formatter={(value: number, name: string) => {
                        const total = currentPieData.reduce((s, d) => s + d.value, 0);
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                        return [`${value} (${pct}%)`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} iconType="circle" iconSize={7} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-gray-500 text-xs">当前筛选条件下无数据</div>
              )}
            </DashboardPanel>
          </div>

          {/* Row 2-2: 最常见错误消息 */}
          <DashboardPanel title="最常见错误消息">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-gray-800">
                      <TableHead className="text-xs text-gray-400 py-2 px-2">错误消息</TableHead>
                      <TableHead className="text-xs text-gray-400 py-2 px-2 text-right">出现次数</TableHead>
                      <TableHead className="text-xs text-gray-400 py-2 px-2 text-right">影响用户数</TableHead>
                      <TableHead className="text-xs text-gray-400 py-2 px-2 text-right">影响模型数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMMON_ERRORS.map((row, i) => (
                      <TableRow key={i} className="hover:bg-transparent border-b border-gray-800/50">
                        <TableCell className="py-2 px-2 text-[11px] text-gray-300 max-w-[280px] truncate" title={row.message}>{row.message}</TableCell>
                        <TableCell className="py-2 px-2 text-[11px] text-right tabular-nums text-gray-300">{row.occurrences}</TableCell>
                        <TableCell className="py-2 px-2 text-[11px] text-right tabular-nums text-gray-300">{row.affectedUsers}</TableCell>
                        <TableCell className="py-2 px-2 text-[11px] text-right tabular-nums text-gray-300">{row.affectedModels}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DashboardPanel>

          {/* Row 2-3: 受影响用户排行 */}
          <DashboardPanel title="受影响用户排行">
            <p className="text-[11px] text-gray-500 mb-2 -mt-1">该表用于观察哪些用户受到错误影响较多，不直接代表平台 SLA 责任。</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-gray-800">
                    <TableHead className="text-xs text-gray-400 py-2 px-3">用户</TableHead>
                    <TableHead className="text-xs text-gray-400 py-2 px-3 text-right">错误率</TableHead>
                    <TableHead className="text-xs text-gray-400 py-2 px-3 text-right">总错误数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AFFECTED_USERS.map((row, i) => (
                    <TableRow key={i} className="hover:bg-transparent border-b border-gray-800/50">
                      <TableCell className="py-2 px-3 text-[11px] text-gray-300">{row.user}</TableCell>
                      <TableCell className="py-2 px-3 text-[11px] text-right tabular-nums">
                        <span className={row.errorRate >= 5 ? "text-red-400" : row.errorRate >= 1 ? "text-yellow-400" : "text-gray-300"}>{row.errorRate}%</span>
                      </TableCell>
                      <TableCell className="py-2 px-3 text-[11px] text-right tabular-nums text-gray-300">{row.totalErrors}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DashboardPanel>
        </div>
      )}
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────

function DashboardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#12151a] border border-[#232831] rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#232831]/60">
        <h3 className="text-xs font-medium text-gray-300">{title}</h3>
        <button className="text-gray-600 hover:text-gray-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
