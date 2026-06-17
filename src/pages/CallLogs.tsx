import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw, Settings, ChevronDown, ChevronUp, Activity, ClipboardList,
  Shield, Calendar, X, Download,
} from "lucide-react";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";
import { getMockData } from "@/lib/mockData";

interface Enterprise { id: string; name: string; enterprise_code: string; }
interface OrgInfo { id: string; name: string; }

interface Props {
  enterprise: Enterprise;
  role: string;
  currentOrg?: OrgInfo | null;
  orgList?: OrgInfo[];
}

// ── Helpers ──
function downloadCSV(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function getCsvValue(row: typeof mockUsageLogs[0], header: string): string {
  const map: Record<string, string> = {
    "时间": row.time,
    "APIKey": row.apiKey,
    "分组": row.group,
    "类型": row.type,
    "模型": String(row.model ?? ""),
    "用时/首字": String(row.duration ?? ""),
    "输入": String(row.input ?? ""),
    "输出": String(row.output ?? ""),
    "花费": `¥${Number(row.cost).toFixed(4)}`,
    "详情": row.detail,
    "组织": row.org ?? "",
    "成员": row.member ?? "",
  };
  const v = map[header] ?? "";
  // escape CSV special chars
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

// ── Consumption log detail interface ──
interface ConsumptionDetail {
  // ── 用量详情 ──
  inputTokens?: number;
  outputTokens?: number;
  cacheTokens?: number;          // 缓存读取
  cacheCreationTokens?: number;  // 缓存创建
  billingCount?: number;         // 计费次数
  operationType?: string;        // 操作类型
  hitTier?: string;              // 命中档位
  // ── 计费规则 ──
  billingMethod: string;         // 计费方式
  inputPrice?: number;           // 输入单价
  outputPrice?: number;          // 输出单价
  cachePrice?: number;           // 缓存单价
  cacheCreationPrice?: number;   // 缓存创建单价
  perCallPrice?: number;         // 单次价格
  hitTierPrice?: string;         // 命中档位（计费规则中展示）
  // ── 计费过程 ──
  inputFee?: number;
  outputFee?: number;
  cacheFee?: number;
  cacheCreationFee?: number;
  modelFee?: number;             // 模型费用（按次计费时使用）
  totalFee: number;              // 本次合计
  preDeductFee?: number;         // 预扣费用
  supplementalFee?: number;      // 补扣费用
  refundFee?: number;            // 退回费用
}

// ── Mock data ──
const mockUsageLogs = [
  // 示例 1：普通 Token 计费
  { time: "2026-05-27 08:36:04", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "o3-pro", duration: "3.2", streaming: "流首", input: 20, output: 38, cost: 0.007350, ip: "10.244.109.64", detail: "模型：1.25 * 分组倍率：1",
    calc: { inputTokens: 20, outputTokens: 38, billingMethod: "按实际用量计费", inputPrice: 35, outputPrice: 175, inputFee: 0.000700, outputFee: 0.006650, totalFee: 0.007350 } as ConsumptionDetail },
  // 示例 2：带缓存读取的 Token 计费
  { time: "2026-05-27 08:35:42", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "qwen2.5-flash", duration: "2.1", streaming: "流首", input: 28, output: 1, cost: 0.002285, ip: "10.244.109.64", detail: "模型：0.085714286 * 分组倍率：1",
    calc: { inputTokens: 28, cacheTokens: 5280, outputTokens: 1, billingMethod: "按实际用量计费", inputPrice: 2.1, cachePrice: 0.42, outputPrice: 8.4, inputFee: 0.000059, cacheFee: 0.002218, outputFee: 0.000008, totalFee: 0.002285 } as ConsumptionDetail },
  // 示例 3：带缓存创建的 Token 计费
  { time: "2026-05-27 08:35:40", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "gpt-4o", duration: "1.1", streaming: "流首", input: 3, output: 1, cost: 1.484849, ip: "10.244.109.64", detail: "模型：1.25 * 分组倍率：1",
    calc: { inputTokens: 3, cacheCreationTokens: 33857, outputTokens: 1, billingMethod: "按实际用量计费", inputPrice: 35, cacheCreationPrice: 43.75, outputPrice: 175, inputFee: 0.000105, cacheCreationFee: 1.481094, outputFee: 0.000175, totalFee: 1.484849 } as ConsumptionDetail },
  // 示例 4：上下文阶梯计费
  { time: "2026-05-27 08:35:38", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "gemini-2.5-flash", duration: "6.1", streaming: "流首", input: 6, output: 223, cost: 0.005388, ip: "10.244.109.64", detail: "模型：0.042857143 * 分组倍率：1",
    calc: { inputTokens: 6, outputTokens: 223, hitTier: "≤32K", billingMethod: "按上下文长度计费", hitTierPrice: "≤32K", inputPrice: 6.000001, outputPrice: 23.999997, inputFee: 0.000036, outputFee: 0.005352, totalFee: 0.005388 } as ConsumptionDetail },
  // 示例 5：固定价格 / 歌词生成类模型
  { time: "2026-05-27 08:36:01", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "suno_brics", duration: "0.1", streaming: "流首", input: 0, output: 0, cost: 0.030000, ip: "10.244.109.64", detail: "价格：¥0.030000 / 次",
    calc: { operationType: "LYRICS", billingCount: 1, billingMethod: "按次计费", perCallPrice: 0.03, modelFee: 0.03, totalFee: 0.03 } as ConsumptionDetail },
  // 示例 6：图片生成 / 固定价格模型
  { time: "2026-05-27 08:35:39", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "dall-e-3", duration: "1.5", streaming: "非流", input: 0, output: 0, cost: 0.800000, ip: "10.244.109.64", detail: "价格：¥0.800000 / 次",
    calc: { billingCount: 1, billingMethod: "按次计费", perCallPrice: 0.8, modelFee: 0.8, totalFee: 0.8 } as ConsumptionDetail },
  // 错误日志（无 calc）
  { time: "2026-05-27 08:35:54", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "错误", model: "gpt-oss-120b", duration: "0.0", streaming: "异常", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "分组gpt官网 下模型 gpt-oss-120b 无可用通道（distribution error）" },
  { time: "2026-05-27 08:35:48", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "错误", model: "gpt-oss-120b", duration: "0.0", streaming: "异常", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "分组gpt官网 下模型 gpt-oss-120b 无可用通道（distribution error）" },
  { time: "2026-05-27 08:35:33", apiKey: "通用分组key", group: "default", org: "技术部", member: "张三", type: "消费", model: "glm-5.1", duration: "6.1", streaming: "流首", input: 6, output: 194, cost: 0.004090, ip: "10.244.109.64", detail: "模型：0.042857143 * 分组倍率：1",
    calc: { inputTokens: 6, outputTokens: 194, billingMethod: "按实际用量计费", inputPrice: 8, outputPrice: 6, inputFee: 0.000048, outputFee: 0.004042, totalFee: 0.004090, preDeductFee: 0.004100, supplementalFee: -0.000010 } as ConsumptionDetail },
];

// ── Merged task logs (drawing + async tasks) ──
const mockTaskLogs = [
  { submitTime: "2026-03-03 10:19:16", cost: "1401 秒", model: "Suno v3", type: "生成歌词", org: "技术部", member: "张三", taskId: "13b57429c9714eb7ab078f5622490531", execStatus: "失败", progress: "-", detail: "读取响应超时，请检查网络连接后重试" },
  { submitTime: "2026-03-03 09:55:02", cost: "403 秒", model: "Suno v3", type: "生成音乐", org: "产品部", member: "李四", taskId: "a4c82e13f0b347d9ac1562ef83720104", execStatus: "已完成", progress: "100%", detail: "生成完成" },
  { submitTime: "2026-03-03 09:30:11", cost: "1523 秒", model: "Suno v3", type: "生成歌词", org: "研发部", member: "王五", taskId: "7f3d9c21b0e54a8d913047cf25816b93", execStatus: "失败", progress: "-", detail: "服务暂时不可用" },
  { submitTime: "2026-03-03 09:10:44", cost: "338 秒", model: "Suno v4", type: "风格转换", org: "技术部", member: "张三", taskId: "b8e51f62d3c04719a270583c946d17f5", execStatus: "已完成", progress: "100%", detail: "转换完成" },
  { submitTime: "2026-03-03 08:48:30", cost: "1295 秒", model: "Suno v3", type: "生成歌词", org: "财务部", member: "周八", taskId: "c6a703e89d1b42f0b58349a71c24fe62", execStatus: "失败", progress: "-", detail: "读取响应超时，请检查网络连接后重试" },
  { submitTime: "2026-03-03 08:20:05", cost: "129 秒", model: "Midjourney v6", type: "文生图", org: "产品部", member: "赵六", taskId: "d1e4f9a02b3c47e8b912765c034fd821", execStatus: "已完成", progress: "100%", detail: "图像生成完成，分辨率 1024×1024" },
  { submitTime: "2026-03-03 08:05:33", cost: "进行中", model: "Stable Diffusion XL", type: "图生图", org: "研发部", member: "陈七", taskId: "e2f5g8h01c4d57f9c023876d145ge932", execStatus: "进行中", progress: "47%", detail: "正在渲染第 3/6 步" },
  { submitTime: "2026-03-03 07:55:12", cost: "396 秒", model: "Midjourney v6", type: "图像变体", org: "技术部", member: "张三", taskId: "f3g6h9i12d5e68a0d134987e256hf043", execStatus: "已完成", progress: "100%", detail: "四宫格变体生成完成" },
];

// ── Audit logs ──
const mockAuditLogs = [
  { time: "2026-03-03 11:20:05", operator: "张三 · 138****8888", org: "技术部", opType: "成员设置", content: "邀请成员「王五」加入企业", result: "成功", ip: "10.244.109.64" },
  { time: "2026-03-03 11:05:33", operator: "李四 · 139****9999", org: "产品部", opType: "令牌操作", content: "创建 API Key「生产环境-v2」", result: "成功", ip: "10.244.109.65" },
  { time: "2026-03-03 10:48:17", operator: "王五 · 135****5555", org: "研发部", opType: "企业治理", content: "修改告警阈值为 ¥500", result: "成功", ip: "10.244.109.66" },
  { time: "2026-03-03 10:31:44", operator: "张三 · 138****8888", org: "技术部", opType: "部门设置", content: "创建部门「后端组」", result: "成功", ip: "10.244.109.64" },
  { time: "2026-03-03 10:12:09", operator: "赵六 · 136****6666", org: "产品部", opType: "令牌操作", content: "禁用 API Key「测试密钥」", result: "成功", ip: "10.244.109.67" },
  { time: "2026-03-03 09:55:22", operator: "陈七 · 137****7777", org: "研发部", opType: "成员设置", content: "移除成员「周八」", result: "成功", ip: "10.244.109.68" },
  { time: "2026-03-03 09:30:01", operator: "李四 · 139****9999", org: "产品部", opType: "企业治理", content: "修改告警方式为「邮件+短信」", result: "成功", ip: "10.244.109.65" },
  { time: "2026-03-03 09:15:18", operator: "张三 · 138****8888", org: "技术部", opType: "部门设置", content: "调整「前端组」部门负责人", result: "成功", ip: "10.244.109.64" },
  { time: "2026-03-03 08:52:44", operator: "王五 · 135****5555", org: "研发部", opType: "成员设置", content: "修改成员「赵六」角色为管理员", result: "成功", ip: "10.244.109.66" },
  { time: "2026-03-03 08:30:12", operator: "李四 · 139****9999", org: "产品部", opType: "令牌操作", content: "删除 API Key「旧项目密钥」", result: "成功", ip: "10.244.109.65" },
];

// ── APIKey chip colors ──
const apiKeyColors: Record<string, string> = {
  test: "bg-gray-700 text-white",
  prod: "bg-blue-700 text-white",
  "dev-key": "bg-violet-700 text-white",
  "通用分组key": "bg-indigo-600 text-white",
};
function getApiKeyColor(key: string) {
  return apiKeyColors[key] ?? "bg-gray-600 text-white";
}

// ── Execution status badge ──
function ExecStatusBadge({ status }: { status: string }) {
  if (status === "进行中") return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 animate-pulse" />
      <span className="text-yellow-600 text-xs">进行中</span>
    </div>
  );
  if (status === "已完成") return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-green-600 text-xs">已完成</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
      <span className="text-red-500 text-xs">失败</span>
    </div>
  );
}

// ── Audit type badge ──
function AuditTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    "成员设置": "bg-blue-50 text-blue-700 border border-blue-200",
    "部门设置": "bg-green-50 text-green-700 border border-green-200",
    "企业治理": "bg-orange-50 text-orange-700 border border-orange-200",
    "令牌操作": "bg-purple-50 text-purple-700 border border-purple-200",
  };
  return (
    <span className={cn("text-xs px-1.5 py-0.5 rounded whitespace-nowrap", styles[type] ?? "bg-muted text-muted-foreground border border-border")}>
      {type}
    </span>
  );
}

// ── Pagination footer ──
function PaginationFooter({
  total, page, pageSize, onPageChange, onPageSizeChange,
}: {
  total: number; page: number; pageSize: number;
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const [jumpVal, setJumpVal] = useState("");

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    p => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground flex-wrap gap-2">
      <span>共 {total} 条记录&nbsp;&nbsp;第 {start}-{end} 条</span>
      <div className="flex items-center gap-3">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={e => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }}
                className={page <= 1 ? "pointer-events-none opacity-40" : ""}
              />
            </PaginationItem>
            {pages.map((p, i) => (
              <PaginationItem key={p}>
                {i > 0 && pages[i - 1] !== p - 1 && (
                  <span className="px-1 text-muted-foreground">…</span>
                )}
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={e => { e.preventDefault(); onPageChange(p); }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={e => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }}
                className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map(n => (
              <SelectItem key={n} value={String(n)}>{n} 条/页</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <span>跳至</span>
          <Input
            className="h-8 w-14 text-xs text-center"
            value={jumpVal}
            onChange={e => setJumpVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                const n = parseInt(jumpVal);
                if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n);
                setJumpVal("");
              }
            }}
            placeholder="页"
          />
          <span>页</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: 调用日志 ──
function CallLogsTab({ role, globalOrg, globalMember }: {
  role: string;
  globalOrg: string;   // org name or "all"
  globalMember: string; // member name or "all"
}) {
  const [filterModel, setFilterModel] = useState("");
  const [filterApiKey, setFilterApiKey] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<typeof mockUsageLogs[0] | null>(null);

  const isEnterpriseAdmin = role === "enterprise_admin";
  const isOrgAdmin = role === "org_admin";

  const allGroups = Array.from(new Set(mockUsageLogs.map(r => r.group)));

  const filtered = mockUsageLogs.filter(r => {
    if (filterGroup !== "all" && r.group !== filterGroup) return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterModel.trim() && !r.model.toLowerCase().includes(filterModel.toLowerCase())) return false;
    if (filterApiKey.trim() && !r.apiKey.toLowerCase().includes(filterApiKey.toLowerCase())) return false;
    if ((isEnterpriseAdmin || isOrgAdmin) && globalOrg !== "all" && r.org !== globalOrg) return false;
    if (isOrgAdmin && globalMember !== "all" && r.member !== globalMember) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const baseHeaders = ["时间", "APIKey", "分组", "类型", "模型", "用时/首字", "输入", "输出", "花费", "详情"];
  const headers = isEnterpriseAdmin
    ? ["时间", "APIKey", "组织", "成员", "分组", "类型", "模型", "用时/首字", "输入", "输出", "花费", "详情"]
    : isOrgAdmin
    ? ["时间", "APIKey", "成员", "分组", "类型", "模型", "用时/首字", "输入", "输出", "花费", "详情"]
    : baseHeaders;

  const handleReset = () => {
    setFilterGroup("all");
    setFilterType("all");
    setFilterModel("");
    setFilterApiKey("");
    setPage(1);
  };

  const dateStart = "2026-03-03 00:00:00";
  const dateEnd = "2026-03-03 23:59:59";
  const dateDiffDays = Math.ceil(
    (new Date(dateEnd.replace(/-/g, "/")).getTime() - new Date(dateStart.replace(/-/g, "/")).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const exportRows = filtered.filter(r => r.type === "消费");
  const exceedLimit = exportRows.length > 100000 || dateDiffDays > 31;

  const handleExport = () => {
    if (exceedLimit) return;
    setExporting(true);
    setTimeout(() => {
      const csvContent = [
        headers.join(","),
        ...exportRows.map(row => headers.map(h => getCsvValue(row, h)).join(",")),
      ].join("\n");
      const filename = `调用日志_${dateStart.replace(/[:\s]/g, "")}_${dateEnd.replace(/[:\s]/g, "")}.csv`;
      downloadCSV(filename, csvContent);
      setExporting(false);
      setExportOpen(false);
    }, 800);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background whitespace-nowrap">
            <span>{dateStart}</span>
            <span className="mx-1 text-muted-foreground">→</span>
            <span>{dateEnd}</span>
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
          </div>
          <Input className="h-9 w-40 text-sm" placeholder="APIKey名称" value={filterApiKey} onChange={e => setFilterApiKey(e.target.value)} />
          <Input className="h-9 w-36 text-sm" placeholder="模型名称" value={filterModel} onChange={e => setFilterModel(e.target.value)} />
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1"
            onClick={() => setExportOpen(true)}
            disabled={exporting}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      </div>

      {/* Summary + toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1 rounded-md">消耗额度：¥0.05</span>
          <span className="bg-muted border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-md">RPM：0</span>
          <span className="bg-muted border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-md">TPM：0</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {headers.map(h => {
                  if (h === "分组") return (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <Select value={filterGroup} onValueChange={v => { setFilterGroup(v); setPage(1); }}>
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-60">
                          <span className={`text-xs font-medium ${filterGroup !== "all" ? "text-primary" : "text-muted-foreground"}`}>分组</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          {allGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </th>
                  );
                  if (h === "类型") return (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-60">
                          <span className={`text-xs font-medium ${filterType !== "all" ? "text-primary" : "text-muted-foreground"}`}>类型</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="错误">错误</SelectItem>
                          <SelectItem value="消费">消费</SelectItem>
                        </SelectContent>
                      </Select>
                    </th>
                  );
                  return <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.time}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded ${getApiKeyColor(row.apiKey)}`}>{row.apiKey}</span>
                  </td>
                  {isEnterpriseAdmin && (
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.org}</td>
                  )}
                  {isEnterpriseAdmin && (
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer">{row.member}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {(() => {
                              const mockData = getMockData();
                              const user = mockData.users.find(u => u.name === row.member);
                              const uid = user?.uid?.replace("UID:", "") || "—";
                              const maskedPhone = user?.phone ? user.phone.slice(0, 3) + "****" + user.phone.slice(-4) : "—";
                              return (
                                <div className="space-y-1 p-1 text-sm text-gray-500">
                                  <p>UID：{uid}</p>
                                  <p>手机号：{maskedPhone}</p>
                                </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  )}
                  {isOrgAdmin && (
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer">{row.member}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {(() => {
                              const mockData = getMockData();
                              const user = mockData.users.find(u => u.name === row.member);
                              const uid = user?.uid?.replace("UID:", "") || "—";
                              const maskedPhone = user?.phone ? user.phone.slice(0, 3) + "****" + user.phone.slice(-4) : "—";
                              return (
                                <div className="space-y-1 p-1 text-sm text-gray-500">
                                  <p>UID：{uid}</p>
                                  <p>手机号：{maskedPhone}</p>
                                </div>
                              );
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.group}</td>
                  <td className="px-3 py-2.5">
                    {row.type === "错误"
                      ? <span className="bg-red-100 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded">错误</span>
                      : <span className="bg-green-100 text-green-600 border border-green-200 text-xs px-1.5 py-0.5 rounded">消费</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.model}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.duration}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.input}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.output}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">¥{Number(row.cost).toFixed(4)}</td>
                  <td className="px-3 py-2.5 text-xs max-w-[200px]">
                    {row.type === "消费" ? (
                      <button
                        className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer truncate block text-left"
                        onClick={() => setSelectedDetail(row)}
                      >
                        {row.detail}
                      </button>
                    ) : (
                      <span className="text-muted-foreground truncate block">{row.detail}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Export confirm dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出调用日志</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">时间范围</span>
              <span className="font-medium">{dateStart} ~ {dateEnd}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              由于错误记录不产生实际扣费，不参与费用核算，因此本次导出仅包含消费日志。
            </p>
            {exportRows.length > 100000 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600">
                导出条数超过 10 万条限制，请缩小时间范围或增加筛选条件后再试。
              </div>
            )}
            {dateDiffDays > 31 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-600">
                时间跨度超过 31 天限制，请缩小时间范围后再试。
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setExportOpen(false)} disabled={exporting}>
              取消
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting || exceedLimit}>
              {exporting ? "导出中…" : "确认导出"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Consumption detail dialog */}
      <Dialog open={!!selectedDetail} onOpenChange={(open) => { if (!open) setSelectedDetail(null); }}>
        <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="text-base font-semibold">详情</DialogTitle>
          </DialogHeader>
          {selectedDetail && selectedDetail.calc && (() => {
            const c = selectedDetail.calc;
            const fmt = (v: number) => `¥${v.toFixed(6)}`;

            // 用量详情 items
            const usageItems: { label: string; value: string }[] = [];
            if (c.inputTokens !== undefined && c.inputTokens > 0) usageItems.push({ label: "输入 Tokens", value: String(c.inputTokens) });
            if (c.cacheTokens !== undefined && c.cacheTokens > 0) usageItems.push({ label: "缓存 Tokens", value: String(c.cacheTokens) });
            if (c.cacheCreationTokens !== undefined && c.cacheCreationTokens > 0) usageItems.push({ label: "缓存创建 Tokens", value: String(c.cacheCreationTokens) });
            if (c.outputTokens !== undefined && c.outputTokens > 0) usageItems.push({ label: "输出 Tokens", value: String(c.outputTokens) });
            if (c.billingCount !== undefined && c.billingCount > 0) usageItems.push({ label: "计费次数", value: String(c.billingCount) });
            if (c.operationType) usageItems.push({ label: "操作类型", value: c.operationType });
            if (c.hitTier) usageItems.push({ label: "命中档位", value: c.hitTier });

            // 计费规则 items
            const ruleItems: { label: string; value: string }[] = [];
            ruleItems.push({ label: "计费方式", value: c.billingMethod });
            if (c.hitTierPrice) ruleItems.push({ label: "命中档位", value: c.hitTierPrice });
            if (c.inputPrice !== undefined && c.inputPrice > 0) ruleItems.push({ label: "输入单价", value: `${fmt(c.inputPrice)} / 1M tokens` });
            if (c.cachePrice !== undefined && c.cachePrice > 0) ruleItems.push({ label: "缓存单价", value: `${fmt(c.cachePrice)} / 1M tokens` });
            if (c.cacheCreationPrice !== undefined && c.cacheCreationPrice > 0) ruleItems.push({ label: "5 分钟缓存创建单价", value: `${fmt(c.cacheCreationPrice)} / 1M tokens` });
            if (c.outputPrice !== undefined && c.outputPrice > 0) ruleItems.push({ label: "输出单价", value: `${fmt(c.outputPrice)} / 1M tokens` });
            if (c.perCallPrice !== undefined && c.perCallPrice > 0) ruleItems.push({ label: "单次价格", value: `${fmt(c.perCallPrice)} / 次` });

            // 计费过程 items
            const processItems: { label: string; value: React.ReactNode }[] = [];
            if (c.inputFee !== undefined) processItems.push({ label: "输入费用", value: <>{c.inputTokens} tokens / 1M tokens × {fmt(c.inputPrice!)} = <span className="text-foreground font-medium">{fmt(c.inputFee)}</span></> });
            if (c.cacheFee !== undefined) processItems.push({ label: "缓存费用", value: <>{c.cacheTokens} tokens / 1M tokens × {fmt(c.cachePrice!)} = <span className="text-foreground font-medium">{fmt(c.cacheFee)}</span></> });
            if (c.cacheCreationFee !== undefined) processItems.push({ label: "缓存创建费用", value: <>{c.cacheCreationTokens} tokens / 1M tokens × {fmt(c.cacheCreationPrice!)} = <span className="text-foreground font-medium">{fmt(c.cacheCreationFee)}</span></> });
            if (c.outputFee !== undefined) processItems.push({ label: "输出费用", value: <>{c.outputTokens} token{c.outputTokens !== 1 ? "s" : ""} / 1M tokens × {fmt(c.outputPrice!)} = <span className="text-foreground font-medium">{fmt(c.outputFee)}</span></> });
            if (c.modelFee !== undefined) processItems.push({ label: "模型费用", value: <>{c.billingCount} 次 × {fmt(c.perCallPrice!)} / 次 = <span className="text-foreground font-medium">{fmt(c.modelFee)}</span></> });
            if (c.preDeductFee !== undefined) processItems.push({ label: "预扣费用", value: <span className="text-foreground font-medium">{fmt(c.preDeductFee)}</span> });
            if (c.supplementalFee !== undefined) processItems.push({ label: "补扣费用", value: <span className="text-foreground font-medium">{fmt(c.supplementalFee)}</span> });
            if (c.refundFee !== undefined) processItems.push({ label: "退回费用", value: <span className="text-foreground font-medium">{fmt(c.refundFee)}</span> });

            return (
              <div className="text-sm">
                <table className="w-full">
                  <tbody>
                    {/* ── 第一行：用量详情 ── */}
                    <tr className="border-b border-border">
                      <td className="px-5 py-3 align-top bg-muted/30 w-[100px] border-r border-border">
                        <span className="text-xs font-medium text-muted-foreground">用量详情</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1.5">
                          {usageItems.map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}：</span>
                              <span className="text-xs text-foreground">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {/* ── 第二行：计费规则 ── */}
                    <tr className="border-b border-border">
                      <td className="px-5 py-3 align-top bg-muted/30 w-[100px] border-r border-border">
                        <span className="text-xs font-medium text-muted-foreground">计费规则</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1.5">
                          {ruleItems.map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}：</span>
                              <span className="text-xs text-foreground">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {/* ── 第三行：计费过程 ── */}
                    <tr>
                      <td className="px-5 py-3 align-top bg-muted/30 w-[100px] border-r border-border">
                        <span className="text-xs font-medium text-muted-foreground">计费过程</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1.5">
                          {processItems.map(item => (
                            <div key={item.label} className="flex items-start gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label}：</span>
                              <span className="text-xs text-muted-foreground">{item.value}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-border mt-2">
                            <span className="text-xs font-medium text-foreground">本次合计：</span>
                            <span className="text-sm font-semibold text-foreground">{fmt(c.totalFee)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                  仅供参考，以实际扣费为准
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 2: 任务日志 ──
function TaskLogsTab({ role, globalOrg, globalMember }: {
  role: string;
  globalOrg: string;
  globalMember: string;
}) {
  const isEnterpriseAdmin = role === "enterprise_admin";
  const isOrgAdmin = role === "org_admin";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterTaskId, setFilterTaskId] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterExecStatus, setFilterExecStatus] = useState("all");
  const [selectedTask, setSelectedTask] = useState<typeof mockTaskLogs[0] | null>(null);

  const allTypes = Array.from(new Set(mockTaskLogs.map(r => r.type)));

  const filtered = mockTaskLogs.filter(r => {
    if (globalOrg !== "all" && r.org !== globalOrg) return false;
    if (globalMember !== "all" && r.member !== globalMember) return false;
    if (filterTaskId.trim() && !r.taskId.toLowerCase().includes(filterTaskId.toLowerCase())) return false;
    if (filterModel.trim() && !r.model.toLowerCase().includes(filterModel.toLowerCase())) return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterExecStatus !== "all" && r.execStatus !== filterExecStatus) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setFilterTaskId("");
    setFilterModel("");
    setFilterType("all");
    setFilterExecStatus("all");
    setPage(1);
  };

  const taskHeaders = isEnterpriseAdmin
    ? ["提交时间", "花费时间", "组织", "成员", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]
    : isOrgAdmin
    ? ["提交时间", "花费时间", "成员", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]
    : ["提交时间", "花费时间", "模型", "类型", "任务ID", "执行状态", "进度", "详情"];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background whitespace-nowrap">
            <span>2026-03-03 00:00:00</span>
            <span className="mx-1 text-muted-foreground">→</span>
            <span>2026-03-03 23:59:59</span>
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
          </div>
          <Input
            className="h-9 w-52 text-sm"
            placeholder="任务ID"
            value={filterTaskId}
            onChange={e => { setFilterTaskId(e.target.value); setPage(1); }}
          />
          <Input
            className="h-9 w-36 text-sm"
            placeholder="模型名称"
            value={filterModel}
            onChange={e => { setFilterModel(e.target.value); setPage(1); }}
          />
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {taskHeaders.map(h => {
                  if (h === "类型") return (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-60">
                          <span className={`text-xs font-medium ${filterType !== "all" ? "text-primary" : "text-muted-foreground"}`}>类型</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </th>
                  );
                  if (h === "执行状态") return (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <Select value={filterExecStatus} onValueChange={v => { setFilterExecStatus(v); setPage(1); }}>
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-60">
                          <span className={`text-xs font-medium ${filterExecStatus !== "all" ? "text-primary" : "text-muted-foreground"}`}>执行状态</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="进行中">进行中</SelectItem>
                          <SelectItem value="已完成">已完成</SelectItem>
                          <SelectItem value="失败">失败</SelectItem>
                        </SelectContent>
                      </Select>
                    </th>
                  );
                  return <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.submitTime}</td>
                  <td className="px-3 py-2.5">
                    <span className="bg-red-50 text-red-500 border border-red-200 text-xs px-1.5 py-0.5 rounded">{row.cost}</span>
                  </td>
                  {isEnterpriseAdmin && <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.org}</td>}
                  {(isEnterpriseAdmin || isOrgAdmin) && <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.member}</td>}
                  <td className="px-3 py-2.5">
                    <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5 py-0.5 rounded">{row.model}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="bg-pink-100 text-pink-700 border border-pink-200 text-xs px-1.5 py-0.5 rounded">{row.type}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      className="text-xs text-primary hover:text-primary/80 font-mono underline underline-offset-2 cursor-pointer max-w-[130px] truncate block"
                      onClick={() => setSelectedTask(row)}
                      title="查看任务详情"
                    >
                      {row.taskId.slice(0, 16)}…
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <ExecStatusBadge status={row.execStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.progress}</td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setSelectedTask(row)}>查看</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Task detail dialog */}
      <Dialog open={!!selectedTask} onOpenChange={open => { if (!open) setSelectedTask(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">任务详情</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-y-2.5 gap-x-4">
                <span className="text-muted-foreground">任务 ID</span>
                <span className="col-span-2 font-mono text-xs break-all text-foreground">{selectedTask.taskId}</span>
                <span className="text-muted-foreground">模型</span>
                <span className="col-span-2">
                  <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5 py-0.5 rounded">{selectedTask.model}</span>
                </span>
                <span className="text-muted-foreground">类型</span>
                <span className="col-span-2">
                  <span className="bg-pink-100 text-pink-700 border border-pink-200 text-xs px-1.5 py-0.5 rounded">{selectedTask.type}</span>
                </span>
                <span className="text-muted-foreground">执行状态</span>
                <span className="col-span-2"><ExecStatusBadge status={selectedTask.execStatus} /></span>
                <span className="text-muted-foreground">进度</span>
                <span className="col-span-2 text-foreground">{selectedTask.progress}</span>
                <span className="text-muted-foreground">提交时间</span>
                <span className="col-span-2 font-mono text-xs text-foreground">{selectedTask.submitTime}</span>
                <span className="text-muted-foreground">耗时</span>
                <span className="col-span-2 text-foreground">{selectedTask.cost}</span>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-muted-foreground mb-1">执行结果</p>
                <p className="text-foreground text-sm bg-muted/40 rounded-md px-3 py-2">{selectedTask.detail}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 3: 审计日志 ──
function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterOpType, setFilterOpType] = useState("all");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterTarget, setFilterTarget] = useState("");

  // 从操作内容中提取操作对象
  const extractTarget = (content: string, opType: string): string => {
    if (opType === "成员设置") {
      const match = content.match(/「([^」]+)」/);
      return match ? match[1] : "-";
    }
    if (opType === "部门设置") {
      const match = content.match(/「([^」]+)」/);
      return match ? match[1] : "-";
    }
    if (opType === "令牌操作") {
      const match = content.match(/「([^」]+)」/);
      return match ? match[1] : "-";
    }
    if (opType === "企业治理") {
      return "企业配置";
    }
    return "-";
  };

  // 获取操作对象类型
  const getTargetType = (opType: string): string => {
    switch (opType) {
      case "成员设置": return "成员";
      case "部门设置": return "部门";
      case "令牌操作": return "API Key";
      case "企业治理": return "企业";
      default: return "其他";
    }
  };

  const filtered = mockAuditLogs.filter(r => {
    if (filterOpType !== "all" && r.opType !== filterOpType) return false;
    if (filterOperator.trim() && !r.operator.toLowerCase().includes(filterOperator.toLowerCase())) return false;
    if (filterTarget.trim()) {
      const target = extractTarget(r.content, r.opType);
      if (!target.toLowerCase().includes(filterTarget.toLowerCase())) return false;
    }
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setFilterOpType("all");
    setFilterOperator("");
    setFilterTarget("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">时间</span>
            <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background min-w-[280px]">
              <span>2026-03-03 00:00:00</span>
              <span className="mx-1 text-muted-foreground">→</span>
              <span>2026-03-03 23:59:59</span>
              <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">操作类型</span>
            <Select value={filterOpType} onValueChange={v => { setFilterOpType(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="全部类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="成员设置">成员设置</SelectItem>
                <SelectItem value="部门设置">部门设置</SelectItem>
                <SelectItem value="企业治理">企业治理</SelectItem>
                <SelectItem value="令牌操作">令牌操作</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input 
            className="h-9 w-40 text-sm" 
            placeholder="操作人" 
            value={filterOperator} 
            onChange={e => { setFilterOperator(e.target.value); setPage(1); }} 
          />
          <Input 
            className="h-9 w-40 text-sm" 
            placeholder="操作对象" 
            value={filterTarget} 
            onChange={e => { setFilterTarget(e.target.value); setPage(1); }} 
          />
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["时间", "操作人", "操作类型", "操作对象", "操作内容"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.time}</td>
                  <td className="px-3 py-2.5">
                    {(() => {
                      // 解析操作人信息
                      const operatorParts = row.operator.split(" · ");
                      const name = operatorParts[0] || "未知";
                      const phone = operatorParts[1] || "";
                      // 从 mock 数据查找用户信息
                      const mockData = getMockData();
                      const user = mockData.users.find(u => u.phone === phone || u.name === name);
                      const uid = user?.uid?.replace("UID:", "") || "-";
                      // 查找所在部门
                      const memberOrgs = mockData.members
                        .filter(m => m.user_phone === phone && m.organization_id)
                        .map(m => {
                          const org = mockData.organizations.find(o => o.id === m.organization_id);
                          return org?.name || "未知部门";
                        });
                      const orgs = memberOrgs.length > 0 ? memberOrgs.join("，") : "默认部门";
                      return (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">{name}（{phone.slice(0, 3)}****{phone.slice(-4)}）</span>
                          <span className="text-xs text-muted-foreground mt-0.5">UID：{uid} | 所在部门：{orgs}</span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5">
                    <AuditTypeBadge type={row.opType} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                    {extractTarget(row.content, row.opType)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground max-w-[220px] truncate">{row.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}

const roleTabs = [
  { key: "member", label: "普通成员" },
  { key: "org_admin", label: "组织管理员" },
  { key: "enterprise_admin", label: "企业管理员" },
];

// ── Main ──
export default function CallLogs({ enterprise, role, currentOrg, orgList = [] }: Props) {
  const [viewRole, setViewRole] = useState(role);

  const mockAllOrgs = Array.from(new Set(mockUsageLogs.map(r => r.org)));
  // Add parent_id for tree structure (ABV is a child of 技术部 for demo)
  const orgOptions: (OrgInfo & { parent_id?: string | null })[] = orgList.length > 0
    ? orgList.map(o => ({ ...o, parent_id: null }))
    : [
        { id: "技术部", name: "技术部", parent_id: null },
        { id: "ABV", name: "ABV", parent_id: "技术部" },
        { id: "产品部", name: "产品部", parent_id: null },
        { id: "研发部", name: "研发部", parent_id: null },
        { id: "财务部", name: "财务部", parent_id: null },
      ];

  const allMembers = Array.from(new Set(mockUsageLogs.map(r => r.member)));

  // Global context state — shared across all 3 tabs
  const [globalOrg, setGlobalOrg] = useState<string>(
    viewRole === "org_admin"
      ? (currentOrg?.id ?? orgOptions[0]?.id ?? "all")
      : "all"
  );
  const [globalMember, setGlobalMember] = useState<string>("all");

  const handleViewRole = (key: string) => {
    setViewRole(key);
    if (key === "org_admin") {
      setGlobalOrg(currentOrg?.id ?? orgOptions[0]?.id ?? "all");
    } else if (key === "enterprise_admin") {
      setGlobalOrg("all");
    } else {
      setGlobalOrg("all");
    }
    setGlobalMember("all");
  };

  const isEnterpriseAdmin = viewRole === "enterprise_admin";
  const isOrgAdmin = viewRole === "org_admin";
  const showOrgSelector = isEnterpriseAdmin || isOrgAdmin;
  // Enterprise admin also gets member selector (two-level: org → member)
  const showMemberSelector = isOrgAdmin || isEnterpriseAdmin;

  // Derive display name for passing to tabs
  const activeOrgName = globalOrg === "all"
    ? "all"
    : (orgOptions.find(o => o.id === globalOrg)?.name ?? globalOrg);

  // Members filtered by selected org (for enterprise_admin cascading)
  const membersForOrg = globalOrg === "all"
    ? allMembers
    : Array.from(new Set(mockUsageLogs.filter(r => r.org === activeOrgName).map(r => r.member)));

  return (
    <div className="space-y-4">
      {/* Header row — title + role switcher only */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">调用日志</h1>
          <p className="text-muted-foreground mt-1 text-sm">查看 API 调用详情与任务执行记录</p>
        </div>

        {/* Role switcher */}
        <div className="flex items-center bg-muted rounded-lg p-1 h-9 shrink-0">
          {roleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleViewRole(tab.key)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                viewRole === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="call">
        <TabsList className="gap-1 h-auto p-1">
          <TabsTrigger value="call" className="gap-1.5 text-sm px-4 py-2">
            <Activity className="w-4 h-4" />调用日志
          </TabsTrigger>
          <TabsTrigger value="task" className="gap-1.5 text-sm px-4 py-2">
            <ClipboardList className="w-4 h-4" />任务日志
          </TabsTrigger>
          {/* 审计日志仅企业管理员可见 */}
          {isEnterpriseAdmin && (
            <TabsTrigger value="audit" className="gap-1.5 text-sm px-4 py-2">
              <Shield className="w-4 h-4" />审计日志
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="call" className="mt-4">
          <CallLogsTab
            role={viewRole}
            globalOrg={activeOrgName}
            globalMember={globalMember}
          />
        </TabsContent>
        <TabsContent value="task" className="mt-4">
          <TaskLogsTab
            role={viewRole}
            globalOrg={activeOrgName}
            globalMember={globalMember}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
