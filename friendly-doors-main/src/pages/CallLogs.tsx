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
  RefreshCw, Settings, ChevronDown, ChevronUp, Activity, ClipboardList,
  Shield, Calendar, X, Users, Building2,
} from "lucide-react";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";

interface Enterprise { id: string; name: string; enterprise_code: string; }
interface OrgInfo { id: string; name: string; }

interface Props {
  enterprise: Enterprise | null;
  role: string;
  currentOrg?: OrgInfo | null;
  orgList?: OrgInfo[];
}

// ── Mock data ──
const mockUsageLogs = [
  { time: "2026-03-03 11:15:44", apiKey: "test", group: "default", org: "技术部", member: "张三", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided. You can find your API key at https://***.com/***/**" },
  { time: "2026-03-03 11:14:22", apiKey: "prod", group: "default", org: "产品部", member: "李四", type: "消费", model: "gpt-4o", duration: "1.2s", streaming: "流式", input: 156, output: 312, cost: 0.003, ip: "10.244.109.65", detail: "Request completed successfully." },
  { time: "2026-03-03 11:13:01", apiKey: "test", group: "dev", org: "技术部", member: "王五", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.66", detail: "Rate limit exceeded. Please try again later." },
  { time: "2026-03-03 11:12:55", apiKey: "prod", group: "default", org: "产品部", member: "赵六", type: "消费", model: "claude-3-5-sonnet", duration: "2.3s", streaming: "流式", input: 240, output: 480, cost: 0.008, ip: "10.244.109.67", detail: "Request completed successfully." },
  { time: "2026-03-03 11:11:33", apiKey: "dev-key", group: "dev", org: "研发部", member: "陈七", type: "消费", model: "gpt-4o-mini", duration: "0.8s", streaming: "非流", input: 88, output: 120, cost: 0.001, ip: "10.244.109.68", detail: "Request completed successfully." },
  { time: "2026-03-03 11:10:14", apiKey: "test", group: "default", org: "技术部", member: "张三", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided." },
  { time: "2026-03-03 11:09:02", apiKey: "prod", group: "finance", org: "财务部", member: "周八", type: "消费", model: "gpt-4o", duration: "1.8s", streaming: "流式", input: 320, output: 640, cost: 0.012, ip: "10.244.109.69", detail: "Request completed successfully." },
  { time: "2026-03-03 11:08:47", apiKey: "dev-key", group: "dev", org: "研发部", member: "吴九", type: "消费", model: "claude-3-haiku", duration: "0.5s", streaming: "非流", input: 64, output: 96, cost: 0.001, ip: "10.244.109.70", detail: "Request completed successfully." },
  { time: "2026-03-03 11:07:30", apiKey: "test", group: "default", org: "技术部", member: "郑十", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided." },
  { time: "2026-03-03 11:06:15", apiKey: "prod", group: "default", org: "产品部", member: "李四", type: "消费", model: "gpt-4o", duration: "1.5s", streaming: "流式", input: 200, output: 400, cost: 0.007, ip: "10.244.109.71", detail: "Request completed successfully." },
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
  { time: "2026-03-03 11:20:05", operator: "张三 · 138****8888", org: "技术部", opType: "登录", content: "用户登录成功", result: "成功", ip: "10.244.109.64" },
  { time: "2026-03-03 11:05:33", operator: "李四 · 139****9999", org: "产品部", opType: "令牌操作", content: "创建 API Key「生产环境-v2」", result: "成功", ip: "10.244.109.65" },
  { time: "2026-03-03 10:48:17", operator: "王五 · 135****5555", org: "研发部", opType: "设置变更", content: "修改告警阈值为 ¥500", result: "成功", ip: "10.244.109.66" },
  { time: "2026-03-03 10:31:44", operator: "张三 · 138****8888", org: "技术部", opType: "登录", content: "登录失败：密码错误（第 2 次）", result: "失败", ip: "10.244.109.64" },
  { time: "2026-03-03 10:12:09", operator: "赵六 · 136****6666", org: "产品部", opType: "令牌操作", content: "禁用 API Key「测试密钥」", result: "成功", ip: "10.244.109.67" },
  { time: "2026-03-03 09:55:22", operator: "陈七 · 137****7777", org: "研发部", opType: "密码重置", content: "重置账户密码", result: "成功", ip: "10.244.109.68" },
  { time: "2026-03-03 09:30:01", operator: "李四 · 139****9999", org: "产品部", opType: "设置变更", content: "修改告警方式为「邮件+短信」", result: "成功", ip: "10.244.109.65" },
];

// ── APIKey chip colors ──
const apiKeyColors: Record<string, string> = {
  test: "bg-gray-700 text-white",
  prod: "bg-blue-700 text-white",
  "dev-key": "bg-violet-700 text-white",
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
    "登录": "bg-blue-50 text-blue-700 border border-blue-200",
    "令牌操作": "bg-purple-50 text-purple-700 border border-purple-200",
    "设置变更": "bg-gray-100 text-gray-600 border border-border",
    "密码重置": "bg-amber-50 text-amber-700 border border-amber-200",
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
          <Input className="h-9 w-40 text-sm" placeholder="APIKey名称" value={filterApiKey} onChange={e => setFilterApiKey(e.target.value)} />
          <Input className="h-9 w-36 text-sm" placeholder="模型名称" value={filterModel} onChange={e => setFilterModel(e.target.value)} />
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
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
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.member}</td>
                  )}
                  {isOrgAdmin && (
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.member}</td>
                  )}
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.group}</td>
                  <td className="px-3 py-2.5">
                    {row.type === "错误"
                      ? <span className="bg-red-100 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded">错误</span>
                      : <span className="bg-green-100 text-green-600 border border-green-200 text-xs px-1.5 py-0.5 rounded">消费</span>
                    }
                  </td>
...
                  <td className="px-3 py-2.5 text-xs text-foreground">¥{Number(row.cost).toFixed(4)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{row.detail}</td>
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
function AuditLogsTab({ globalOrg, globalMember }: {
  globalOrg: string;
  globalMember: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterOpType, setFilterOpType] = useState("all");

  const filtered = mockAuditLogs.filter(r => {
    if (globalOrg !== "all" && r.org !== globalOrg) return false;
    if (globalMember !== "all" && !r.operator.includes(globalMember.replace(/[^·]*·/, "").trim())) return false;
    if (filterOpType !== "all" && r.opType !== filterOpType) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setFilterOpType("all");
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
                <SelectItem value="登录">登录</SelectItem>
                <SelectItem value="令牌操作">令牌操作</SelectItem>
                <SelectItem value="设置变更">设置变更</SelectItem>
                <SelectItem value="密码重置">密码重置</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                {["时间", "操作人", "组织", "操作类型", "操作内容", "操作结果"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.time}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.operator}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.org}</td>
                  <td className="px-3 py-2.5">
                    <AuditTypeBadge type={row.opType} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground max-w-[220px] truncate">{row.content}</td>
                  <td className="px-3 py-2.5">
                    {row.result === "成功"
                      ? <span className="bg-green-100 text-green-600 border border-green-200 text-xs px-1.5 py-0.5 rounded">成功</span>
                      : <span className="bg-red-100 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded">失败</span>
                    }
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
  const orgOptions: OrgInfo[] = orgList.length > 0
    ? orgList
    : mockAllOrgs.map(name => ({ id: name, name }));

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
        {/* Tab row: tabs on left, context selectors on right — same line */}
        <div className="flex items-center justify-between gap-3">
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

          {/* Context selectors — inline with tabs on the right */}
          {(showOrgSelector || showMemberSelector) && (
            <div className="flex items-center gap-2">
              {showOrgSelector && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">当前组织</span>
                  <Select value={globalOrg} onValueChange={v => { setGlobalOrg(v); setGlobalMember("all"); }}>
                    <SelectTrigger className="h-8 w-32 text-xs font-medium border-primary/40 bg-primary/5 text-primary focus:ring-primary/30">
                      <SelectValue placeholder="选择组织" />
                    </SelectTrigger>
                    <SelectContent>
                      {isEnterpriseAdmin && <SelectItem value="all">全部组织</SelectItem>}
                      {orgOptions.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showMemberSelector && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">成员</span>
                  <Select value={globalMember} onValueChange={setGlobalMember}>
                    <SelectTrigger className="h-8 w-28 text-xs font-medium border-border bg-background">
                      <SelectValue placeholder="全部成员" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部成员</SelectItem>
                      {membersForOrg.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

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
          <AuditLogsTab
            globalOrg={activeOrgName}
            globalMember={globalMember}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
