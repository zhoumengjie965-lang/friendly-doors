import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Settings, ChevronDown, ChevronUp, BarChart2, Palette, ClipboardList,
  HelpCircle, Calendar
} from "lucide-react";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";

interface Enterprise { id: string; name: string; enterprise_code: string; }
interface OrgInfo { id: string; name: string; }

interface Props {
  enterprise: Enterprise;
  role: string;
  currentOrg?: OrgInfo | null;
  orgList?: OrgInfo[];
}

// ── Mock data ──
const mockUsageLogs = [
  { time: "2026-03-03 11:15:44", apiKey: "test", group: "default", org: "技术部", member: "张三", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided. You can find your API key at https://***.com/***/**" },
  { time: "2026-03-03 11:14:22", apiKey: "prod", group: "default", org: "产品部", member: "李四", type: "成功", model: "gpt-4o", duration: "1.2s", streaming: "流式", input: 156, output: 312, cost: 0.003, ip: "10.244.109.65", detail: "Request completed successfully." },
  { time: "2026-03-03 11:13:01", apiKey: "test", group: "dev", org: "技术部", member: "王五", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.66", detail: "Rate limit exceeded. Please try again later." },
  { time: "2026-03-03 11:12:55", apiKey: "prod", group: "default", org: "产品部", member: "赵六", type: "成功", model: "claude-3-5-sonnet", duration: "2.3s", streaming: "流式", input: 240, output: 480, cost: 0.008, ip: "10.244.109.67", detail: "Request completed successfully." },
  { time: "2026-03-03 11:11:33", apiKey: "dev-key", group: "dev", org: "研发部", member: "陈七", type: "成功", model: "gpt-4o-mini", duration: "0.8s", streaming: "非流", input: 88, output: 120, cost: 0.001, ip: "10.244.109.68", detail: "Request completed successfully." },
  { time: "2026-03-03 11:10:14", apiKey: "test", group: "default", org: "技术部", member: "张三", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided. You can find your API key at https://***.com/***/**" },
  { time: "2026-03-03 11:09:02", apiKey: "prod", group: "finance", org: "财务部", member: "周八", type: "成功", model: "gpt-4o", duration: "1.8s", streaming: "流式", input: 320, output: 640, cost: 0.012, ip: "10.244.109.69", detail: "Request completed successfully." },
  { time: "2026-03-03 11:08:47", apiKey: "dev-key", group: "dev", org: "研发部", member: "吴九", type: "成功", model: "claude-3-haiku", duration: "0.5s", streaming: "非流", input: 64, output: 96, cost: 0.001, ip: "10.244.109.70", detail: "Request completed successfully." },
  { time: "2026-03-03 11:07:30", apiKey: "test", group: "default", org: "技术部", member: "郑十", type: "错误", model: "mock-error", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided. You can find your API key at https://***.com/***/**" },
  { time: "2026-03-03 11:06:15", apiKey: "prod", group: "default", org: "产品部", member: "李四", type: "成功", model: "gpt-4o", duration: "1.5s", streaming: "流式", input: 200, output: 400, cost: 0.007, ip: "10.244.109.71", detail: "Request completed successfully." },
];

const mockTaskLogs = [
  { submitTime: "2026-03-03 10:19:16", endTime: "2026-03-03 10:42:37", cost: "1401 秒", platform: "Suno", type: "生成歌词", taskId: "13b57429c9714eb7ab078f5622490531", status: "失败", progress: "-", detail: "读取响应超时，请检查网络连接后重试" },
  { submitTime: "2026-03-03 09:55:02", endTime: "2026-03-03 10:01:45", cost: "403 秒", platform: "Suno", type: "生成音乐", taskId: "a4c82e13f0b347d9ac1562ef83720104", status: "成功", progress: "100%", detail: "生成完成" },
  { submitTime: "2026-03-03 09:30:11", endTime: "2026-03-03 09:55:34", cost: "1523 秒", platform: "Suno", type: "生成歌词", taskId: "7f3d9c21b0e54a8d913047cf25816b93", status: "失败", progress: "-", detail: "服务暂时不可用" },
  { submitTime: "2026-03-03 09:10:44", endTime: "2026-03-03 09:16:22", cost: "338 秒", platform: "Suno", type: "风格转换", taskId: "b8e51f62d3c04719a270583c946d17f5", status: "成功", progress: "100%", detail: "转换完成" },
  { submitTime: "2026-03-03 08:48:30", endTime: "2026-03-03 09:10:05", cost: "1295 秒", platform: "Suno", type: "生成歌词", taskId: "c6a703e89d1b42f0b58349a71c24fe62", status: "失败", progress: "-", detail: "读取响应超时，请检查网络连接后重试" },
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

// ── Tab 1: 使用日志 ──
function UsageLogsTab({ role, currentOrg, orgList = [] }: { role: string; currentOrg?: OrgInfo | null; orgList?: OrgInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterOrg, setFilterOrg] = useState<string>(currentOrg?.id ?? "all");
  const [filterMember, setFilterMember] = useState("all");

  const isEnterpriseAdmin = role === "enterprise_admin";
  const isOrgAdmin = role === "org_admin";
  const hasMultiOrg = isOrgAdmin && orgList.length > 1;

  const allGroups = Array.from(new Set(mockUsageLogs.map(r => r.group)));
  const allOrgs = Array.from(new Set(mockUsageLogs.map(r => r.org)));
  const allMembers = Array.from(new Set(mockUsageLogs.map(r => r.member)));

  // resolve active org name for filtering
  const activeOrgName = filterOrg === "all" ? null : (orgList.find(o => o.id === filterOrg)?.name ?? null);

  const filtered = mockUsageLogs.filter(r => {
    if (filterGroup !== "all" && r.group !== filterGroup) return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    if (isEnterpriseAdmin && filterOrg !== "all" && r.org !== filterOrg) return false;
    if (isOrgAdmin && activeOrgName && r.org !== activeOrgName) return false;
    if (isOrgAdmin && filterMember !== "all" && r.member !== filterMember) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Build table columns dynamically
  const baseHeaders = ["时间", "APIKey", "分组", "类型", "模型", "用时/首字", "输入", "输出", "花费", "IP", "详情"];
  const headers = isEnterpriseAdmin
    ? ["时间", "APIKey", "组织", "分组", "类型", "模型", "用时/首字", "输入", "输出", "花费", "IP", "详情"]
    : isOrgAdmin
    ? ["时间", "APIKey", "成员", "分组", "类型", "模型", "用时/首字", "输入", "输出", "花费", "IP", "详情"]
    : baseHeaders;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
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
            <span className="text-sm text-muted-foreground whitespace-nowrap">APIKey</span>
            <Input className="h-9 w-44 text-sm" placeholder="请输入APIKey名称" />
          </div>
          {/* 企业管理员：组织下拉 */}
          {isEnterpriseAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">组织</span>
              <Select value={filterOrg} onValueChange={v => { setFilterOrg(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {allOrgs.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* 组织管理员：当多个组织时，显示组织切换下拉 */}
          {hasMultiOrg && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">组织</span>
              <Select value={filterOrg} onValueChange={v => { setFilterOrg(v); setPage(1); }}>
                <SelectTrigger className={`h-9 w-36 text-sm ${filterOrg !== "all" ? "border-primary text-primary" : ""}`}>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {orgList.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* 组织管理员：成员下拉 */}
          {isOrgAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">成员</span>
              <Select value={filterMember} onValueChange={v => { setFilterMember(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {allMembers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => { setFilterGroup("all"); setFilterType("all"); setFilterOrg(currentOrg?.id ?? "all"); setFilterMember("all"); }}>重置</Button>
          <Button
            size="sm" variant="ghost" className="h-9 gap-1 text-muted-foreground"
            onClick={() => setExpanded(v => !v)}
          >
            展开 {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">模型</span>
              <Input className="h-9 w-40 text-sm" placeholder="请输入模型名称" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">IP</span>
              <Input className="h-9 w-40 text-sm" placeholder="请输入IP地址" />
            </div>
          </div>
        )}
      </div>

      {/* Summary + toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1 rounded-md">消耗额度：¥0.05</span>
          <span className="bg-gray-50 border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-md">RPM：0</span>
          <span className="bg-gray-50 border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-md">TPM：0</span>
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
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-0.5 [&>svg]:hidden">
                          <span className={`text-xs font-medium ${filterGroup !== "all" ? "text-primary" : "text-muted-foreground"}`}>分组</span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
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
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 gap-0.5 [&>svg]:hidden">
                          <span className={`text-xs font-medium ${filterType !== "all" ? "text-primary" : "text-muted-foreground"}`}>类型</span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部</SelectItem>
                          <SelectItem value="成功">成功</SelectItem>
                          <SelectItem value="错误">错误</SelectItem>
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
                  {isOrgAdmin && (
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.member}</td>
                  )}
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.group}</td>
                  <td className="px-3 py-2.5">
                    {row.type === "错误"
                      ? <span className="bg-red-100 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded">错误</span>
                      : <span className="bg-green-100 text-green-600 border border-green-200 text-xs px-1.5 py-0.5 rounded">成功</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="border border-purple-200 text-purple-700 bg-purple-50 text-xs px-1.5 py-0.5 rounded">{row.model}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">{row.duration}</span>
                      <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">{row.streaming}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.input}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.output}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.cost}</td>
                  <td className="px-3 py-2.5">
                    <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">{row.ip}</span>
                  </td>
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

// ── Tab 2: 绘图日志 ──
function DrawingLogsTab() {
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">提交时间</span>
            <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background min-w-[280px]">
              <span>2026-03-03 00:00:00</span>
              <span className="mx-1 text-muted-foreground">→</span>
              <span>2026-03-03 23:59:59</span>
              <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">任务ID</span>
            <Input className="h-9 w-52 text-sm" placeholder="请输入任务ID" />
          </div>
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9">重置</Button>
        </div>
      </div>

      {/* Table with empty state */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["提交时间", "花费时间", "类型", "任务ID", "提交结果", "任务状态", "进度", "结果图片", "Prompt", "PromptEn", "失败原因"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={11} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <HelpCircle className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <span className="text-sm">暂无数据</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationFooter
          total={0} page={1} pageSize={10}
          onPageChange={() => {}} onPageSizeChange={() => {}}
        />
      </div>
    </div>
  );
}

// ── Tab 3: 任务日志 ──
function TaskLogsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginated = mockTaskLogs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">提交时间</span>
            <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background min-w-[280px]">
              <span>2026-03-03 00:00:00</span>
              <span className="mx-1 text-muted-foreground">→</span>
              <span>2026-03-03 23:59:59</span>
              <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">任务ID</span>
            <Input className="h-9 w-52 text-sm" placeholder="请输入任务ID" />
          </div>
          <Button size="sm" className="h-9">搜索</Button>
          <Button size="sm" variant="outline" className="h-9">重置</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["提交时间", "结束时间", "花费时间", "平台", "类型", "任务ID", "任务状态", "进度", "详情"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.submitTime}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.endTime}</td>
                  <td className="px-3 py-2.5">
                    <span className="bg-red-50 text-red-500 border border-red-200 text-xs px-1.5 py-0.5 rounded">{row.cost}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5 py-0.5 rounded">{row.platform}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="bg-pink-100 text-pink-700 border border-pink-200 text-xs px-1.5 py-0.5 rounded">{row.type}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono max-w-[140px] truncate">{row.taskId}</td>
                  <td className="px-3 py-2.5">
                    {row.status === "失败"
                      ? <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-red-500 text-xs">失败</span></div>
                      : <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 shrink-0" /><span className="text-green-500 text-xs">成功</span></div>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.progress}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          total={mockTaskLogs.length}
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">调用日志</h1>
          <p className="text-muted-foreground mt-1 text-sm">查看 API 调用详情与任务执行记录</p>
        </div>

        {/* Role switcher */}
        <div className="flex items-center bg-muted rounded-lg p-1 h-9">
          {roleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewRole(tab.key)}
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

      <Tabs defaultValue="usage">
        <TabsList className="gap-1 h-auto p-1">
          <TabsTrigger value="usage" className="gap-1.5 text-sm px-4 py-2">
            <BarChart2 className="w-4 h-4" />使用日志
          </TabsTrigger>
          <TabsTrigger value="drawing" className="gap-1.5 text-sm px-4 py-2">
            <Palette className="w-4 h-4" />绘图日志
          </TabsTrigger>
          <TabsTrigger value="task" className="gap-1.5 text-sm px-4 py-2">
            <ClipboardList className="w-4 h-4" />任务日志
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="mt-4">
          <UsageLogsTab role={viewRole} currentOrg={currentOrg} orgList={orgList} />
        </TabsContent>
        <TabsContent value="drawing" className="mt-4">
          <DrawingLogsTab />
        </TabsContent>
        <TabsContent value="task" className="mt-4">
          <TaskLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
