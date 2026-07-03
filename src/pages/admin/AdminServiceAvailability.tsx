import { useState, useMemo, ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
interface SlaAvailTrendPoint { time: string; availability: number; }
interface SlaErrorRecord {
  id: string;
  time: string;
  requestID: string;
  model: string;
  apiKey: string;
  attribution: "平台错误" | "请求错误" | "上游错误";
  slaIncluded: boolean;
  statusCode: string;
  errorCode: string;
  errorMessage: string;
  affectedCustomer: string;
}

type SlaDimension = "model" | "apiKey" | "attribution";

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

// ── SLA 分析区数据 ──

const SLA_TARGET = 99.5;
const SLA_CURRENT_AVAIL = 99.78;

// SLA 独立筛选选项（后续替换为 API 数据）
const SLA_CUSTOMER_LIST = [
  "szhmtx20260625_01", "dhgq20260616", "kaishitong",
  "htjk20260420_01", "tongjian_prd", "gzcy20260608_01",
  "qtzn20280521_01", "guangzhouheuai",
];
// 服务周期选项：从当年 1 月到当前月
const SLA_MONTH_LIST = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const list: string[] = [];
  for (let m = 1; m <= month; m++) {
    list.push(`${year}-${String(m).padStart(2, "0")}`);
  }
  return list;
})();

const SLA_AVAIL_TREND: SlaAvailTrendPoint[] = [
  { time: "2026-01", availability: 99.92 },
  { time: "2026-02", availability: 99.85 },
  { time: "2026-03", availability: 99.48 },
  { time: "2026-04", availability: 99.91 },
  { time: "2026-05", availability: 99.76 },
  { time: "2026-06", availability: 99.53 },
];

const SLA_ERRORS: SlaErrorRecord[] = [
  // 2026-07 数据（当前月默认展示）
  { id: "j001", time: "2026-07-01 09:14:22", requestID: "req-7a8b9c1d", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "szhmtx20260625_01" },
  { id: "j002", time: "2026-07-01 10:05:17", requestID: "req-7a8b9c1e", model: "claude-sonnet-4-6", apiKey: "sk-cl-5e6f...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "engine_overloaded", errorMessage: "engine_overloaded: too many concurrent requests", affectedCustomer: "szhmtx20260625_01" },
  { id: "j003", time: "2026-07-02 14:22:08", requestID: "req-7a8b9c1f", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: request exceeded 30s deadline", affectedCustomer: "szhmtx20260625_01" },
  { id: "j004", time: "2026-07-02 16:41:33", requestID: "req-7a8b9c20", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "context_length_exceeded", errorMessage: "context_length_exceeded: maximum context length exceeded", affectedCustomer: "szhmtx20260625_01" },
  { id: "j005", time: "2026-07-03 08:10:49", requestID: "req-7a8b9c21", model: "glm-5.1", apiKey: "sk-glm-a2b3...", attribution: "平台错误", slaIncluded: false, statusCode: "429", errorCode: "rate_limit_exceeded", errorMessage: "rate_limit_exceeded: quota exceeded for model glm-5.1", affectedCustomer: "szhmtx20260625_01" },
  { id: "j006", time: "2026-07-03 11:27:55", requestID: "req-7a8b9c22", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: bad gateway", affectedCustomer: "szhmtx20260625_01" },
  { id: "j007", time: "2026-07-01 13:33:11", requestID: "req-7a8b9c23", model: "gemini-2.5-pro", apiKey: "sk-gem-8c9d...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "content_filter", errorMessage: "content_filter: response blocked by safety policy", affectedCustomer: "dhgq20260616" },
  { id: "j008", time: "2026-07-01 15:18:02", requestID: "req-7a8b9c24", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "dhgq20260616" },
  { id: "j009", time: "2026-07-02 09:45:27", requestID: "req-7a8b9c25", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: upstream service unavailable", affectedCustomer: "dhgq20260616" },
  { id: "j010", time: "2026-07-02 17:02:19", requestID: "req-7a8b9c26", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "deserialization_error", errorMessage: "deserialization_error: invalid JSON in tool_call response", affectedCustomer: "dhgq20260616" },
  { id: "j011", time: "2026-07-03 10:11:44", requestID: "req-7a8b9c27", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "dhgq20260616" },
  { id: "j012", time: "2026-07-03 14:38:56", requestID: "req-7a8b9c28", model: "claude-sonnet-4-6", apiKey: "sk-cl-5e6f...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: request exceeded 30s deadline", affectedCustomer: "dhgq20260616" },
  { id: "j013", time: "2026-07-01 08:55:03", requestID: "req-7a8b9c29", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "engine_overloaded", errorMessage: "engine_overloaded: too many concurrent requests", affectedCustomer: "kaishitong" },
  { id: "j014", time: "2026-07-01 19:24:16", requestID: "req-7a8b9c2a", model: "glm-5.1", apiKey: "sk-glm-a2b3...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "invalid_request", errorMessage: "invalid_request: malformed request body", affectedCustomer: "kaishitong" },
  { id: "j015", time: "2026-07-02 12:07:40", requestID: "req-7a8b9c2b", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "kaishitong" },
  { id: "j016", time: "2026-07-03 15:53:22", requestID: "req-7a8b9c2c", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: upstream service unavailable", affectedCustomer: "kaishitong" },
  { id: "j017", time: "2026-07-01 11:09:38", requestID: "req-7a8b9c2d", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: bad gateway", affectedCustomer: "htjk20260420_01" },
  { id: "j018", time: "2026-07-02 16:30:45", requestID: "req-7a8b9c2e", model: "claude-sonnet-4-6", apiKey: "sk-cl-5e6f...", attribution: "平台错误", slaIncluded: false, statusCode: "429", errorCode: "rate_limit_exceeded", errorMessage: "rate_limit_exceeded: quota exceeded for model claude-sonnet-4-6", affectedCustomer: "htjk20260420_01" },
  { id: "j019", time: "2026-07-03 09:17:29", requestID: "req-7a8b9c2f", model: "gemini-2.5-pro", apiKey: "sk-gem-8c9d...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "content_filter", errorMessage: "content_filter: response blocked by safety policy", affectedCustomer: "htjk20260420_01" },
  { id: "j020", time: "2026-07-01 07:42:51", requestID: "req-7a8b9c30", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "deserialization_error", errorMessage: "deserialization_error: invalid JSON in tool_call response", affectedCustomer: "tongjian_prd" },
  { id: "j021", time: "2026-07-02 13:56:07", requestID: "req-7a8b9c31", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: request exceeded 30s deadline", affectedCustomer: "tongjian_prd" },
  { id: "j022", time: "2026-07-03 17:48:13", requestID: "req-7a8b9c32", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "tongjian_prd" },
  { id: "j023", time: "2026-07-01 12:21:35", requestID: "req-7a8b9c33", model: "glm-5.1", apiKey: "sk-glm-a2b3...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "invalid_request", errorMessage: "invalid_request: unsupported parameter value", affectedCustomer: "gzcy20260608_01" },
  { id: "j024", time: "2026-07-02 08:35:18", requestID: "req-7a8b9c34", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "gzcy20260608_01" },
  { id: "j025", time: "2026-07-03 16:04:42", requestID: "req-7a8b9c35", model: "claude-sonnet-4-6", apiKey: "sk-cl-5e6f...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "engine_overloaded", errorMessage: "engine_overloaded: too many concurrent requests", affectedCustomer: "gzcy20260608_01" },
  { id: "j026", time: "2026-07-01 10:48:59", requestID: "req-7a8b9c36", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: upstream service unavailable", affectedCustomer: "qtzn20280521_01" },
  { id: "j027", time: "2026-07-02 14:15:26", requestID: "req-7a8b9c37", model: "gemini-2.5-pro", apiKey: "sk-gem-8c9d...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "content_filter", errorMessage: "content_filter: response blocked by safety policy", affectedCustomer: "qtzn20280521_01" },
  { id: "j028", time: "2026-07-03 11:39:04", requestID: "req-7a8b9c38", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: bad gateway", affectedCustomer: "qtzn20280521_01" },
  { id: "j029", time: "2026-07-01 18:27:31", requestID: "req-7a8b9c39", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: request exceeded 30s deadline", affectedCustomer: "guangzhouheuai" },
  { id: "j030", time: "2026-07-02 09:53:12", requestID: "req-7a8b9c3a", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "engine_overloaded", errorMessage: "engine_overloaded: too many concurrent requests", affectedCustomer: "guangzhouheuai" },
  { id: "j031", time: "2026-07-03 13:45:48", requestID: "req-7a8b9c3b", model: "claude-sonnet-4-6", apiKey: "sk-cl-5e6f...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "context_length_exceeded", errorMessage: "context_length_exceeded: maximum context length exceeded", affectedCustomer: "guangzhouheuai" },
  { id: "j032", time: "2026-07-01 20:06:55", requestID: "req-7a8b9c3c", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "u_1815_lwycnq" },
  { id: "j033", time: "2026-07-02 15:22:37", requestID: "req-7a8b9c3d", model: "glm-5.1", apiKey: "sk-glm-a2b3...", attribution: "平台错误", slaIncluded: false, statusCode: "429", errorCode: "rate_limit_exceeded", errorMessage: "rate_limit_exceeded: quota exceeded for model glm-5.1", affectedCustomer: "u_1815_lwycnq" },
  { id: "j034", time: "2026-07-03 08:58:21", requestID: "req-7a8b9c3e", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: upstream service unavailable", affectedCustomer: "u_1815_lwycnq" },
  // 2026-06 历史数据
  { id: "e001", time: "2026-06-03 08:14:22", requestID: "req-7a8b9c3f", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "szhmtx20260625_01" },
  { id: "e002", time: "2026-06-03 08:15:06", requestID: "req-7a8b9c40", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "dhgq20260616" },
  { id: "e003", time: "2026-06-03 08:21:18", requestID: "req-7a8b9c41", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "engine_overloaded", errorMessage: "engine_overloaded: too many concurrent requests", affectedCustomer: "kaishitong" },
  { id: "e004", time: "2026-06-10 12:04:33", requestID: "req-7a8b9c42", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: request exceeded 30s deadline", affectedCustomer: "szhmtx20260625_01" },
  { id: "e005", time: "2026-06-10 12:45:11", requestID: "req-7a8b9c43", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "context_length_exceeded", errorMessage: "context_length_exceeded: maximum context length exceeded", affectedCustomer: "htjk20260420_01" },
  { id: "e006", time: "2026-06-15 08:22:47", requestID: "req-7a8b9c44", model: "glm-5.1", apiKey: "sk-glm-a2b3...", attribution: "平台错误", slaIncluded: false, statusCode: "429", errorCode: "rate_limit_exceeded", errorMessage: "rate_limit_exceeded: quota exceeded for model glm-5.1", affectedCustomer: "tongjian_prd" },
  { id: "e007", time: "2026-06-15 16:09:55", requestID: "req-7a8b9c45", model: "deepseek-v4-flash", apiKey: "sk-ds-7a8b...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: bad gateway", affectedCustomer: "gzcy20260608_01" },
  { id: "e008", time: "2026-06-20 09:33:20", requestID: "req-7a8b9c46", model: "gemini-2.5-pro", apiKey: "sk-gem-8c9d...", attribution: "请求错误", slaIncluded: false, statusCode: "400", errorCode: "content_filter", errorMessage: "content_filter: response blocked by safety policy", affectedCustomer: "qtzn20280521_01" },
  { id: "e009", time: "2026-06-25 14:18:02", requestID: "req-7a8b9c47", model: "claude-sonnet-4-6", apiKey: "sk-cl-5e6f...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: upstream service unavailable", affectedCustomer: "guangzhouheuai" },
  { id: "e010", time: "2026-06-25 16:42:59", requestID: "req-7a8b9c48", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "平台错误", slaIncluded: true, statusCode: "500", errorCode: "deserialization_error", errorMessage: "deserialization_error: invalid JSON in tool_call response", affectedCustomer: "u_1815_lwycnq" },
  { id: "e011", time: "2026-06-25 17:01:33", requestID: "req-7a8b9c49", model: "deepseek-v4-flash", apiKey: "sk-ds-9c1d...", attribution: "上游错误", slaIncluded: true, statusCode: "502", errorCode: "upstream_request_failed", errorMessage: "upstream_request_failed: connection reset by peer", affectedCustomer: "szhmtx20260625_01" },
  { id: "e012", time: "2026-06-28 20:11:45", requestID: "req-7a8b9c4a", model: "claude-opus-4-8", apiKey: "sk-cl-3f4a...", attribution: "上游错误", slaIncluded: true, statusCode: "503", errorCode: "timeout", errorMessage: "timeout: request exceeded 30s deadline", affectedCustomer: "dhgq20260616" },
];

// 单月 SLA 对账 — 5 分钟错误率趋势（模拟按小时聚合）
interface Sla5minErrorRatePoint { time: string; errorRate: number; }

const SLA_5MIN_ERROR_RATE_TREND: Sla5minErrorRatePoint[] = [
  { time: "06-01 00:00", errorRate: 0.2 },  { time: "06-01 04:00", errorRate: 0.3 },
  { time: "06-01 08:00", errorRate: 0.8 },  { time: "06-01 12:00", errorRate: 1.2 },
  { time: "06-01 16:00", errorRate: 0.5 },  { time: "06-01 20:00", errorRate: 0.4 },
  { time: "06-02 00:00", errorRate: 0.15 }, { time: "06-02 04:00", errorRate: 0.2 },
  { time: "06-02 08:00", errorRate: 0.6 },  { time: "06-02 12:00", errorRate: 0.9 },
  { time: "06-02 16:00", errorRate: 0.35 }, { time: "06-02 20:00", errorRate: 0.3 },
  { time: "06-03 00:00", errorRate: 0.1 },  { time: "06-03 04:00", errorRate: 0.25 },
  { time: "06-03 08:00", errorRate: 2.5 },  { time: "06-03 12:00", errorRate: 3.8 },
  { time: "06-03 16:00", errorRate: 1.2 },  { time: "06-03 20:00", errorRate: 0.4 },
  { time: "06-04 00:00", errorRate: 0.15 }, { time: "06-04 04:00", errorRate: 0.2 },
  { time: "06-04 08:00", errorRate: 0.3 },  { time: "06-04 12:00", errorRate: 0.5 },
  { time: "06-04 16:00", errorRate: 0.25 }, { time: "06-04 20:00", errorRate: 0.2 },
  { time: "06-05 00:00", errorRate: 0.1 },  { time: "06-05 04:00", errorRate: 0.15 },
  { time: "06-05 08:00", errorRate: 0.7 },  { time: "06-05 12:00", errorRate: 0.4 },
  { time: "06-05 16:00", errorRate: 0.3 },  { time: "06-05 20:00", errorRate: 0.25 },
  { time: "06-10 00:00", errorRate: 0.2 },  { time: "06-10 08:00", errorRate: 4.2 },
  { time: "06-10 12:00", errorRate: 2.1 },  { time: "06-10 16:00", errorRate: 0.6 },
  { time: "06-10 20:00", errorRate: 0.3 },  { time: "06-15 00:00", errorRate: 0.15 },
  { time: "06-15 08:00", errorRate: 1.8 },  { time: "06-15 12:00", errorRate: 3.2 },
  { time: "06-15 16:00", errorRate: 0.9 },  { time: "06-15 20:00", errorRate: 0.35 },
  { time: "06-20 00:00", errorRate: 0.1 },  { time: "06-20 08:00", errorRate: 0.5 },
  { time: "06-20 12:00", errorRate: 0.3 },  { time: "06-20 16:00", errorRate: 0.25 },
  { time: "06-20 20:00", errorRate: 0.2 },  { time: "06-25 00:00", errorRate: 0.15 },
  { time: "06-25 08:00", errorRate: 0.8 },  { time: "06-25 12:00", errorRate: 1.5 },
  { time: "06-25 16:00", errorRate: 0.4 },  { time: "06-25 20:00", errorRate: 0.3 },
  { time: "06-30 00:00", errorRate: 0.2 },  { time: "06-30 08:00", errorRate: 0.6 },
  { time: "06-30 12:00", errorRate: 0.35 }, { time: "06-30 16:00", errorRate: 0.2 },
  { time: "06-30 20:00", errorRate: 0.15 },
];

// 单月 SLA 计算口径（模拟数据）
const SLA_MONTHLY_METRICS = {
  validRequests: 1258400,
  slaFailedRequests: 2816,
  totalFailedRequests: 3520,
  fiveMinWindowsTotal: 8640,     // 12 × 24 × 30
  abnormalFiveMinWindows: 26,
  avgFiveMinErrorRate: 0.22,     // %
};

// ─── Tooltip Style ──────────────────────────────────────────────────────

const DARK_TOOLTIP = { backgroundColor: "#1a1d24", borderColor: "#333", borderRadius: 6, fontSize: 12, color: "#e5e7eb" };

// ─── Main Component ──────────────────────────────────────────────────────

type TabKey = "performance" | "errors" | "sla";

const TABS: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: "performance", label: "整体数据表现", desc: "用于查看平台整体调用流量、响应时间、资源消耗、模型性能、Channel 健康度等运行指标。" },
  { key: "errors", label: "错误分析", desc: "用于查看当前时间范围内的全量错误情况，包括总错误率、错误分布、高频错误消息、受影响用户排行等。" },
  { key: "sla", label: "SLA 分析", desc: "用于按客户账号/企业、模型类型、服务周期自然月统计 SLA 服务可用性。" },
];

export default function AdminServiceAvailability() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("Last 1 hour");
  const [refreshInterval, setRefreshInterval] = useState("30s");
  const [activeTab, setActiveTab] = useState<TabKey>("performance");
  const [debugPieDimension, setDebugPieDimension] = useState<"errorType" | "attribution" | "httpStatus">("errorType");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // ── SLA 分析 Tab 独立筛选条件 ──
  const [slaCustomer, setSlaCustomer] = useState<string>("");
  const [slaCustomerSearchOpen, setSlaCustomerSearchOpen] = useState(false);
  const [slaMonth, setSlaMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [slaDimension, setSlaDimension] = useState<SlaDimension | null>(null);
  const [slaOnly, setSlaOnly] = useState(false);

  // 月度趋势范围根据单月服务周期自动推导：历史 6 个月（含所选月份）
  const slaTrendRange = useMemo(() => {
    const [yearStr, monthStr] = slaMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const end = `${year}-${String(month).padStart(2, "0")}`;
    let startYear = year;
    let startMonth = month - 5;
    if (startMonth <= 0) {
      startYear -= 1;
      startMonth += 12;
    }
    const start = `${startYear}-${String(startMonth).padStart(2, "0")}`;
    return { start, end };
  }, [slaMonth]);

  // 按推导出的趋势范围过滤月度趋势数据
  const slaAvailTrendData = useMemo(() => {
    return SLA_AVAIL_TREND.filter(
      (d) => d.time >= slaTrendRange.start && d.time <= slaTrendRange.end
    );
  }, [slaTrendRange]);

  // 按查询条件过滤出周期内的全部错误记录
  const filteredSlaErrors = useMemo(() => {
    return SLA_ERRORS.filter((e) => {
      if (!e.time.startsWith(slaMonth)) return false;
      if (!slaCustomer) return false;
      if (e.affectedCustomer !== slaCustomer) return false;
      if (slaOnly && !e.slaIncluded) return false;
      return true;
    });
  }, [slaMonth, slaCustomer, slaOnly]);

  // 按选中的维度对错误记录进行聚合；未选择维度时按时间排序平铺
  const groupedSlaErrors = useMemo(() => {
    const sorted = [...filteredSlaErrors].sort((a, b) => a.time.localeCompare(b.time));
    const map = new Map<string, SlaErrorRecord[]>();
    if (!slaDimension) {
      map.set("全部", sorted);
      return map;
    }
    sorted.forEach((e) => {
      const key = e[slaDimension];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [filteredSlaErrors, slaDimension]);

  // 模拟用户列表（后续替换为 API 数据）
  const MOCK_USERS = [
    "szhmtx20260625_01", "dhgq20260616", "u_1992_copq4r",
    "kaishitong", "htjk20240420_01", "tongjian_prd",
    "gzcy20260608_01", "qtzn20280521_01", "guangzhouheuai", "u_1815_lwycnq",
  ];

  // 排障饼图数据（全量）
  const debugPieData = useMemo(() => {
    if (debugPieDimension === "errorType") return PIE_DATA_BY_TYPE;
    if (debugPieDimension === "attribution") return PIE_DATA_BY_ATTRIBUTION;
    return PIE_DATA_BY_HTTP;
  }, [debugPieDimension]);

  const handleRefresh = () => { toast({ title: "数据已刷新" }); };

  const handleExportSlaErrors = () => {
    if (filteredSlaErrors.length === 0) {
      toast({ title: "当前无数据可导出" });
      return;
    }
    const headers = ["时间", "requestID", "模型", "Key", "是否纳入SLA", "归因", "HTTP状态码", "error code", "错误消息"];
    const rows = filteredSlaErrors.map((e) => [
      e.time,
      e.requestID,
      e.model,
      e.apiKey,
      e.slaIncluded ? "是" : "否",
      e.attribution,
      e.statusCode,
      e.errorCode,
      e.errorMessage,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sla_errors_${slaMonth}_${slaCustomer || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "导出成功", description: `已导出 ${filteredSlaErrors.length} 条记录` });
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-gray-200 p-4 space-y-4">

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

          {/* 时间范围筛选器 */}
          <div className="flex items-center justify-between bg-[#12151a] border border-[#232831] rounded-md px-3 py-2">
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
                  <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                  <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                  <SelectItem value="Last 90 days">Last 90 days</SelectItem>
                  <SelectItem value="Last 365 days">Last 365 days</SelectItem>
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

          {/* 时间范围筛选器 */}
          <div className="flex items-center justify-between bg-[#12151a] border border-[#232831] rounded-md px-3 py-2">
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
                  <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                  <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                  <SelectItem value="Last 90 days">Last 90 days</SelectItem>
                  <SelectItem value="Last 365 days">Last 365 days</SelectItem>
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

          {/* ====== 用户筛选器 ====== */}
          <div className="flex items-center gap-3 bg-[#12151a] border border-[#232831] rounded-md px-3 py-2">
            <span className="text-[11px] text-gray-500 font-medium">筛选范围</span>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`h-7 w-[200px] flex items-center justify-between px-3 rounded-md text-xs bg-[#181b20] border ${selectedUser === "all" ? "text-gray-400" : "text-gray-200"} border-gray-700 hover:border-gray-600 transition-colors`}
                >
                  {selectedUser === "all" ? "全部用户" : selectedUser}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px] p-0 bg-[#181b20] border-[#232831]" sideOffset={4}>
                <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-9 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
                  <CommandInput placeholder="搜索用户..." className="bg-transparent text-xs text-gray-200 placeholder:text-gray-500" />
                  <CommandList className="max-h-[240px] overflow-y-auto">
                    <CommandEmpty className="py-3 text-center text-xs text-gray-500">未找到匹配的用户</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__all__"
                        onSelect={() => { setSelectedUser("all"); setUserSearchOpen(false); }}
                        className={`cursor-pointer text-xs rounded-sm data-[selected='true']:bg-[#f97316]/15 data-[selected=true]:text-[#f97316] ${selectedUser === "all" ? "bg-[#f97316]/10 text-[#f97316]" : "text-gray-300 hover:bg-[#232831]"} `}
                      >
                        全部用户
                      </CommandItem>
                      {MOCK_USERS.map((u) => (
                        <CommandItem
                          key={u}
                          value={u}
                          onSelect={() => { setSelectedUser(u); setUserSearchOpen(false); }}
                          className={`cursor-pointer text-xs rounded-sm data-[selected='true']:bg-[#f97316]/15 data-[selected=true]:text-[#f97316] ${selectedUser === u ? "bg-[#f97316]/10 text-[#f97316]" : "text-gray-300 hover:bg-[#232831]"}`}
                        >
                          {u}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <span className="text-[10px] text-gray-600 ml-auto">
              筛选条件仅作用于当前错误分析数据，不作为 SLA 结算依据
            </span>
          </div>

          {/* 总错误率 + 总错误分布 */}
          <div className="grid grid-cols-2 gap-4">
            <DashboardPanel title="总错误率 (%)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={ERROR_RATE_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} interval={Math.max(0, Math.ceil(ERROR_RATE_DATA.length / 8) - 1)} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v}%`} domain={[0, "auto"]} width={40} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <Tooltip contentStyle={DARK_TOOLTIP} formatter={(value: number) => [`${value}%`, "总错误率"]} />
                  <ReferenceLine y={0.5} stroke="#6b7280" strokeDasharray="3 3" strokeWidth={0.8} label={{ value: "参考线（非 SLA）", position: "insideTopRight", fill: "#6b7280", fontSize: 10 }} />
                  <Line type="monotone" dataKey="errorRate" stroke="#f97316" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                总错误率 = 所有错误请求 / 总请求数（含用户侧异常、限流等非平台责任错误）
              </p>
            </DashboardPanel>

            <DashboardPanel title="总错误分布">
              <div className="flex items-center gap-1 mb-3">
                {(["errorType", "attribution", "httpStatus"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDebugPieDimension(d)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      debugPieDimension === d
                        ? "bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40"
                        : "bg-[#1a1d24] text-gray-400 hover:text-gray-200 border border-[#232831]"
                    }`}
                  >
                    {d === "errorType" ? "Error Code" : d === "attribution" ? "错误归因" : "HTTP 状态码"}
                  </button>
                ))}
              </div>
              {debugPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={debugPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={1}
                      label={({ name, value }: any) => `${name} (${value})`}
                      labelLine={{ stroke: "#444", strokeWidth: 0.5 }}
                    >
                      {debugPieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || "#666"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ ...DARK_TOOLTIP, zIndex: 9999 }}
                      formatter={(value: number, name: string) => {
                        const total = debugPieData.reduce((s, d) => s + d.value, 0);
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

          {/* 最常见错误消息 */}
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

          {/* 受影响用户排行 */}
          <DashboardPanel title="受影响用户排行" className="mt-4">
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

      {/* ================================================================ */}
      {/* ====== Tab 3: SLA 分析 ====== */}
      {/* ================================================================ */}
      {activeTab === "sla" && (
        <div className="space-y-5">

          {/* ====== 1. 查询条件区 ====== */}
          <div className="bg-[#12151a] border border-[#232831] rounded-md px-4 py-3">
            <div className="flex items-center gap-5">

              {/* 客户账号 / 企业 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-medium shrink-0">客户账号 / 企业</span>
                <Popover open={slaCustomerSearchOpen} onOpenChange={setSlaCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <button className={`h-7 w-[180px] flex items-center justify-between px-3 rounded-md text-xs bg-[#181b20] border ${!slaCustomer ? "text-gray-400" : "text-gray-200"} border-gray-700 hover:border-gray-600 transition-colors`}>
                      {!slaCustomer ? "搜索客户" : slaCustomer}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[260px] p-0 bg-[#181b20] border-[#232831]" sideOffset={4}>
                    <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-9 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
                      <CommandInput placeholder="搜索客户..." className="bg-transparent text-xs text-gray-200 placeholder:text-gray-500" />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty className="py-3 text-center text-xs text-gray-500">未找到匹配的客户</CommandEmpty>
                        <CommandGroup>
                          {SLA_CUSTOMER_LIST.map((c) => (
                            <CommandItem
                              key={c}
                              value={c}
                              onSelect={() => { setSlaCustomer(c); setSlaCustomerSearchOpen(false); }}
                              className={`cursor-pointer text-xs rounded-sm data-[selected='true']:bg-[#4ade80]/15 data-[selected=true]:text-[#4ade80] ${slaCustomer === c ? "bg-[#4ade80]/10 text-[#4ade80]" : "text-gray-300 hover:bg-[#232831]"}`}
                            >
                              {c}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 单月服务周期 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-medium shrink-0">单月服务周期</span>
                <Select value={slaMonth} onValueChange={setSlaMonth}>
                  <SelectTrigger className="h-7 w-[120px] bg-[#181b20] border-gray-700 text-xs text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_MONTH_LIST.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>

          {/* ====== 2. 单月 SLA 对账区 ====== */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              单月 SLA 对账
            </h4>

            {/* 面板在左，5分钟趋势在右，一行布局 */}
            <div className="grid grid-cols-[minmax(380px,1fr)_1.5fr] gap-4">
              {/* 左：SLA 结果 + 计算口径（合并面板） */}
              <DashboardPanel title="SLA 对账结果" className="h-full flex flex-col">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-stretch gap-4 flex-1">
                    {/* 左：SLA 可用性结果 */}
                    <div className="bg-[#181b20] border border-[#232831] rounded-md px-4 py-3 min-w-[180px] flex flex-col justify-center">
                      <span className="text-[11px] text-gray-500 mb-1">SLA 服务可用性</span>
                      <div className="text-4xl font-bold tabular-nums tracking-tight">
                        <span className={SLA_CURRENT_AVAIL >= SLA_TARGET ? "text-gray-100" : "text-[#ef4444]"}>
                          {SLA_CURRENT_AVAIL}%
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">SLA 目标 ≥ {SLA_TARGET}%</span>
                    </div>
                    {/* 右：计算口径 */}
                    <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 content-center">
                      <div className="bg-[#181b20] border border-[#232831] rounded-md px-2 py-3 text-center flex flex-col justify-center items-center">
                        <div className="text-sm font-semibold tabular-nums text-gray-200">{SLA_MONTHLY_METRICS.validRequests.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500 mt-1">有效请求数</div>
                      </div>
                      <div className="bg-[#181b20] border border-[#232831] rounded-md px-2 py-3 text-center flex flex-col justify-center items-center">
                        <div className="text-sm font-semibold tabular-nums text-[#f97316]">{SLA_MONTHLY_METRICS.slaFailedRequests.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500 mt-1">SLA 失败请求</div>
                      </div>
                      <div className="bg-[#181b20] border border-[#232831] rounded-md px-2 py-3 text-center flex flex-col justify-center items-center">
                        <div className="text-sm font-semibold tabular-nums text-[#f97316]">{SLA_MONTHLY_METRICS.totalFailedRequests.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500 mt-1">总失败请求</div>
                      </div>
                      <div className="bg-[#181b20] border border-[#232831] rounded-md px-2 py-3 text-center flex flex-col justify-center items-center">
                        <div className="text-sm font-semibold tabular-nums text-gray-200">{SLA_MONTHLY_METRICS.fiveMinWindowsTotal.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500 mt-1">5min 窗口总数</div>
                      </div>
                      <div className="bg-[#181b20] border border-[#232831] rounded-md px-2 py-3 text-center flex flex-col justify-center items-center">
                        <div className="text-sm font-semibold tabular-nums text-[#ef4444]">{SLA_MONTHLY_METRICS.abnormalFiveMinWindows}</div>
                        <div className="text-[10px] text-gray-500 mt-1">失败窗口数</div>
                      </div>
                      <div className="bg-[#181b20] border border-[#232831] rounded-md px-2 py-3 text-center flex flex-col justify-center items-center">
                        <div className="text-sm font-semibold tabular-nums text-gray-200">{SLA_MONTHLY_METRICS.avgFiveMinErrorRate}%</div>
                        <div className="text-[10px] text-gray-500 mt-1">平均错误率</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
                    服务可用性 = (1 - ∑每5min错误率 / 5min总个数) × 100%，其中 5min总个数 = 12 × 24 × 天数
                  </p>
                </div>
              </DashboardPanel>

              {/* 右：5 分钟错误率趋势图 */}
              <DashboardPanel title="5 分钟错误率趋势">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={SLA_5MIN_ERROR_RATE_TREND} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="slaErrorRateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} interval={Math.max(0, Math.ceil(SLA_5MIN_ERROR_RATE_TREND.length / 12) - 1)} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v: number) => `${v}%`} domain={[0, "auto"]} width={40} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                    <Tooltip contentStyle={DARK_TOOLTIP} formatter={(value: number) => [`${value}%`, "5min 错误率"]} />
                    <ReferenceLine y={0.5} stroke="#6b7280" strokeDasharray="3 3" strokeWidth={0.8} label={{ value: "月度平均错误率目标 0.5%", position: "insideTopRight", fill: "#6b7280", fontSize: 10 }} />
                    <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                  页面展示按小时采样聚合，tooltip 可查看对应时间段 5 分钟错误率。单个 5 分钟窗口超过 0.5% 不代表月度 SLA 不达标，最终以整个月所有 5 分钟错误率平均值计算。如果在给定的 5 分钟内，有效总请求数小于 5，则假定该时间段内错误率为 0。
                </p>
              </DashboardPanel>
            </div>
          </div>

          {/* ====== 3. SLA 月度趋势区 ====== */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
              SLA 月度趋势 — {slaTrendRange.start} ~ {slaTrendRange.end}
            </h4>
            <DashboardPanel title="SLA 服务可用性月度趋势">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={slaAvailTrendData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="slaTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[99, 100]} width={50} tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: "#2d3340" }} tickLine={false} />
                  <Tooltip contentStyle={DARK_TOOLTIP} formatter={(value: number) => [`${value}%`, "服务可用性"]} />
                  <ReferenceLine y={SLA_TARGET} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.2} label={{ value: `SLA 目标 ${SLA_TARGET}%`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }} />
                  <Area type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={2} fill="url(#slaTrendGradient)" dot={{ fill: "#3b82f6", r: 4 }} activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                每个点代表一个自然月的 SLA 服务可用性，趋势范围由查询条件中「趋势服务周期范围」控制
              </p>
            </DashboardPanel>
          </div>

          {/* ====== 4. SLA 异常明细区 ====== */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f97316]" />
              SLA 异常明细 — {slaMonth}
            </h4>
            <DashboardPanel title="全部错误列表">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] text-gray-500">分维度聚合：</span>
                {[
                  { value: null as SlaDimension | null, label: "全部" },
                  { value: "model" as const, label: "按模型" },
                  { value: "apiKey" as const, label: "按 Key" },
                  { value: "attribution" as const, label: "按归因" },
                ].map((opt) => (
                  <button
                    key={opt.value ?? "all"}
                    onClick={() => setSlaDimension(opt.value)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      slaDimension === opt.value
                        ? "bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40"
                        : "bg-[#1a1d24] text-gray-400 hover:text-gray-200 border border-[#232831]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer select-none ml-1">
                  <Checkbox
                    checked={slaOnly}
                    onCheckedChange={(checked) => setSlaOnly(Boolean(checked))}
                    className="h-3.5 w-3.5 rounded border-gray-600 data-[state=checked]:bg-[#4ade80] data-[state=checked]:border-[#4ade80] data-[state=checked]:text-[#0b0d10]"
                  />
                  仅展示SLA错误
                </label>
                <span className="ml-auto text-[11px] text-gray-500">
                  共 {filteredSlaErrors.length} 条异常
                </span>
                <button
                  onClick={handleExportSlaErrors}
                  className="px-2.5 py-1 text-[11px] font-medium rounded transition-colors bg-[#1a1d24] text-gray-400 hover:text-gray-200 border border-[#232831] flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  导出
                </button>
              </div>
              {filteredSlaErrors.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-gray-500">当前筛选条件下无错误记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-gray-800">
                        <TableHead className="text-xs text-gray-400 py-2 px-3">时间</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">requestID</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">模型</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">Key</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">是否纳入SLA</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">归因</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">HTTP状态码</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">error code</TableHead>
                        <TableHead className="text-xs text-gray-400 py-2 px-3">错误消息</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const rows: ReactNode[] = [];
                        Array.from(groupedSlaErrors.entries())
                          .sort((a, b) => (slaDimension ? b[1].length - a[1].length : a[0].localeCompare(b[0])))
                          .forEach(([group, errors]) => {
                            if (slaDimension) {
                              rows.push(
                                <TableRow
                                  key={`group-${group}`}
                                  className="bg-[#1a1d24] hover:bg-[#1a1d24] border-b border-gray-800"
                                >
                                  <TableCell colSpan={9} className="py-1.5 px-3">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="font-medium text-gray-200">
                                        {slaDimension === "model" ? "模型" : slaDimension === "apiKey" ? "Key" : "归因"}：{group}
                                      </span>
                                      <span className="text-[10px] text-gray-500">({errors.length} 条)</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            errors.forEach((err) => {
                              rows.push(
                                <TableRow
                                  key={err.id}
                                  className="hover:bg-transparent border-b border-gray-800/50"
                                >
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300 whitespace-nowrap">{err.time}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300 font-mono">{err.requestID}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300">{err.model}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300 font-mono">{err.apiKey}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300">{err.slaIncluded ? "是" : "否"}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px]">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      err.attribution === "平台错误"
                                        ? "bg-red-500/15 text-red-400"
                                        : err.attribution === "请求错误"
                                        ? "bg-yellow-500/15 text-yellow-400"
                                        : "bg-purple-500/15 text-purple-400"
                                    }`}>
                                      {err.attribution}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300 text-center">{err.statusCode}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300 font-mono">{err.errorCode}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-gray-300 max-w-[300px] truncate" title={err.errorMessage}>{err.errorMessage}</TableCell>
                                </TableRow>
                              );
                            });
                          });
                        return rows;
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DashboardPanel>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────

function DashboardPanel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#12151a] border border-[#232831] rounded-md overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#232831]/60">
        <h3 className="text-xs font-medium text-gray-300">{title}</h3>
        <button className="text-gray-600 hover:text-gray-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
      <div className="p-3 h-full">{children}</div>
    </div>
  );
}
