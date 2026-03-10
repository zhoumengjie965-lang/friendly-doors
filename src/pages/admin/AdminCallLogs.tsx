import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw, Settings, ChevronDown, ChevronUp, Activity, ClipboardList,
  Shield, Calendar, Check, X,
} from "lucide-react";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface Enterprise { id: string; name: string; }
interface Organization { id: string; name: string; enterprise_id: string; }

// ── Generic Combobox ──
function FilterCombobox({
  items, value, onChange, placeholder, emptyText, width = "w-48",
}: {
  items: { id: string; name: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  emptyText: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const selected = items.find(i => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("h-9 justify-between text-sm font-normal", width)}>
          <span className="truncate text-left">{selected ? selected.name : placeholder}</span>
          <ChevronDown className="ml-1 w-3.5 h-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem value="__clear__" onSelect={() => { onChange(""); setOpen(false); setSearch(""); }} className="text-muted-foreground">
                  清除筛选
                </CommandItem>
              )}
              {filtered.map(i => (
                <CommandItem key={i.id} value={i.id} onSelect={() => { onChange(i.id); setOpen(false); setSearch(""); }}>
                  <span className="truncate">{i.name}</span>
                  {i.id === value && <Check className="ml-auto w-3.5 h-3.5 shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Mock data ──
const mockUsageLogs = [
  { time: "2026-03-03 11:15:44", enterprise: "极光科技", apiKey: "test", group: "default", org: "技术部", type: "错误", model: "mock-error", channel: "Azure", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided." },
  { time: "2026-03-03 11:14:22", enterprise: "蓝海智能", apiKey: "prod", group: "default", org: "产品部", type: "消费", model: "gpt-4o", channel: "OpenAI", duration: "1.2s", streaming: "流式", input: 156, output: 312, cost: 0.003, ip: "10.244.109.65", detail: "Request completed successfully." },
  { time: "2026-03-03 11:13:01", enterprise: "极光科技", apiKey: "test", group: "dev", org: "技术部", type: "错误", model: "mock-error", channel: "Azure", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.66", detail: "Rate limit exceeded." },
  { time: "2026-03-03 11:12:55", enterprise: "云启数字", apiKey: "prod", group: "default", org: "产品部", type: "消费", model: "claude-3-5-sonnet", channel: "Anthropic", duration: "2.3s", streaming: "流式", input: 240, output: 480, cost: 0.008, ip: "10.244.109.67", detail: "Request completed successfully." },
  { time: "2026-03-03 11:11:33", enterprise: "蓝海智能", apiKey: "dev-key", group: "dev", org: "研发部", type: "消费", model: "gpt-4o-mini", channel: "OpenAI", duration: "0.8s", streaming: "非流", input: 88, output: 120, cost: 0.001, ip: "10.244.109.68", detail: "Request completed successfully." },
  { time: "2026-03-03 11:10:14", enterprise: "极光科技", apiKey: "test", group: "default", org: "技术部", type: "错误", model: "mock-error", channel: "Azure", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided." },
  { time: "2026-03-03 11:09:02", enterprise: "云启数字", apiKey: "prod", group: "finance", org: "财务部", type: "消费", model: "gpt-4o", channel: "OpenAI", duration: "1.8s", streaming: "流式", input: 320, output: 640, cost: 0.012, ip: "10.244.109.69", detail: "Request completed successfully." },
  { time: "2026-03-03 11:08:47", enterprise: "蓝海智能", apiKey: "dev-key", group: "dev", org: "研发部", type: "消费", model: "claude-3-haiku", channel: "Anthropic", duration: "0.5s", streaming: "非流", input: 64, output: 96, cost: 0.001, ip: "10.244.109.70", detail: "Request completed successfully." },
  { time: "2026-03-03 11:07:30", enterprise: "极光科技", apiKey: "test", group: "default", org: "技术部", type: "错误", model: "mock-error", channel: "Azure", duration: "0s", streaming: "非流", input: 0, output: 0, cost: 0, ip: "10.244.109.64", detail: "Incorrect API key provided." },
  { time: "2026-03-03 11:06:15", enterprise: "云启数字", apiKey: "prod", group: "default", org: "产品部", type: "消费", model: "gpt-4o", channel: "OpenAI", duration: "1.5s", streaming: "流式", input: 200, output: 400, cost: 0.007, ip: "10.244.109.71", detail: "Request completed successfully." },
];

const mockTaskLogs = [
  { submitTime: "2026-03-03 10:19:16", endTime: "2026-03-03 10:42:37", cost: "1401 秒", enterprise: "极光科技", org: "技术部", platform: "Suno", type: "生成歌词", taskId: "13b57429c9714eb7ab078f5622490531", execStatus: "失败", progress: "-", detail: "读取响应超时，请检查网络连接后重试" },
  { submitTime: "2026-03-03 09:55:02", endTime: "2026-03-03 10:01:45", cost: "403 秒", enterprise: "蓝海智能", org: "产品部", platform: "Suno", type: "生成音乐", taskId: "a4c82e13f0b347d9ac1562ef83720104", execStatus: "已完成", progress: "100%", detail: "生成完成" },
  { submitTime: "2026-03-03 09:30:11", endTime: "2026-03-03 09:55:34", cost: "1523 秒", enterprise: "云启数字", org: "研发部", platform: "Suno", type: "生成歌词", taskId: "7f3d9c21b0e54a8d913047cf25816b93", execStatus: "失败", progress: "-", detail: "服务暂时不可用" },
  { submitTime: "2026-03-03 09:10:44", endTime: "2026-03-03 09:16:22", cost: "338 秒", enterprise: "蓝海智能", org: "产品部", platform: "Suno", type: "风格转换", taskId: "b8e51f62d3c04719a270583c946d17f5", execStatus: "已完成", progress: "100%", detail: "转换完成" },
  { submitTime: "2026-03-03 08:48:30", endTime: "2026-03-03 09:10:05", cost: "1295 秒", enterprise: "极光科技", org: "财务部", platform: "Suno", type: "生成歌词", taskId: "c6a703e89d1b42f0b58349a71c24fe62", execStatus: "失败", progress: "-", detail: "读取响应超时，请检查网络连接后重试" },
  { submitTime: "2026-03-03 08:20:05", endTime: "2026-03-03 08:22:14", cost: "129 秒", enterprise: "蓝海智能", org: "研发部", platform: "Midjourney", type: "文生图", taskId: "d1e4f9a02b3c47e8b912765c034fd821", execStatus: "已完成", progress: "100%", detail: "图像生成完成，分辨率 1024×1024" },
  { submitTime: "2026-03-03 08:05:33", endTime: "-", cost: "进行中", enterprise: "云启数字", org: "技术部", platform: "Stable Diffusion", type: "图生图", taskId: "e2f5g8h01c4d57f9c023876d145ge932", execStatus: "进行中", progress: "47%", detail: "正在渲染第 3/6 步" },
  { submitTime: "2026-03-03 07:55:12", endTime: "2026-03-03 08:01:48", cost: "396 秒", enterprise: "极光科技", org: "技术部", platform: "Midjourney", type: "图像变体", taskId: "f3g6h9i12d5e68a0d134987e256hf043", execStatus: "已完成", progress: "100%", detail: "四宫格变体生成完成" },
];

const mockAuditLogs = [
  { time: "2026-03-03 11:30:05", enterprise: "极光科技", operator: "超级管理员 · 130****0001", opType: "企业审核", content: "审核通过企业「极光科技」实名认证", result: "成功", ip: "192.168.1.10" },
  { time: "2026-03-03 11:15:22", enterprise: "蓝海智能", operator: "运营专员 · 131****0002", opType: "账户充值", content: "为企业「蓝海智能」充值 ¥5,000.00", result: "成功", ip: "192.168.1.11" },
  { time: "2026-03-03 10:58:44", enterprise: "-", operator: "超级管理员 · 130****0001", opType: "登录", content: "管理员登录后台", result: "成功", ip: "192.168.1.10" },
  { time: "2026-03-03 10:40:17", enterprise: "云启数字", operator: "运营专员 · 132****0003", opType: "用户封禁", content: "封禁用户「139****9999」，原因：违规使用", result: "成功", ip: "192.168.1.12" },
  { time: "2026-03-03 10:22:09", enterprise: "极光科技", operator: "运营专员 · 131****0002", opType: "令牌操作", content: "批量删除企业「极光科技」过期 API Key（共 3 条）", result: "成功", ip: "192.168.1.11" },
  { time: "2026-03-03 10:05:33", enterprise: "-", operator: "超级管理员 · 130****0001", opType: "设置变更", content: "修改平台全局限速阈值为 1000 RPM", result: "成功", ip: "192.168.1.10" },
  { time: "2026-03-03 09:47:01", enterprise: "蓝海智能", operator: "运营专员 · 132****0003", opType: "企业审核", content: "拒绝企业「蓝海智能」变更申请，原因：材料不全", result: "成功", ip: "192.168.1.12" },
  { time: "2026-03-03 09:30:18", enterprise: "-", operator: "运营专员 · 131****0002", opType: "登录", content: "登录失败：密码错误（第 1 次）", result: "失败", ip: "192.168.1.11" },
];

const apiKeyColors: Record<string, string> = {
  test: "bg-gray-700 text-white",
  prod: "bg-blue-700 text-white",
  "dev-key": "bg-violet-700 text-white",
};
function getApiKeyColor(key: string) {
  return apiKeyColors[key] ?? "bg-gray-600 text-white";
}

function getChannelStyle(channel: string) {
  if (channel === "OpenAI") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (channel === "Anthropic") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (channel === "Azure") return "bg-sky-50 text-sky-700 border border-sky-200";
  return "bg-muted text-muted-foreground border border-border";
}

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

function AuditTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    "登录": "bg-blue-50 text-blue-700 border border-blue-200",
    "令牌操作": "bg-purple-50 text-purple-700 border border-purple-200",
    "设置变更": "bg-gray-100 text-gray-600 border border-border",
    "密码重置": "bg-amber-50 text-amber-700 border border-amber-200",
    "企业审核": "bg-teal-50 text-teal-700 border border-teal-200",
    "账户充值": "bg-green-50 text-green-700 border border-green-200",
    "用户封禁": "bg-red-50 text-red-700 border border-red-200",
  };
  return (
    <span className={cn("text-xs px-1.5 py-0.5 rounded whitespace-nowrap", styles[type] ?? "bg-muted text-muted-foreground border border-border")}>
      {type}
    </span>
  );
}

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
              <PaginationPrevious href="#" onClick={e => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }} className={page <= 1 ? "pointer-events-none opacity-40" : ""} />
            </PaginationItem>
            {pages.map((p, i) => (
              <PaginationItem key={p}>
                {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                <PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); onPageChange(p); }}>{p}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href="#" onClick={e => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }} className={page >= totalPages ? "pointer-events-none opacity-40" : ""} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n} 条/页</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span>跳至</span>
          <Input className="h-8 w-14 text-xs text-center" value={jumpVal} onChange={e => setJumpVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { const n = parseInt(jumpVal); if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n); setJumpVal(""); } }}
            placeholder="页" />
          <span>页</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: 调用日志 ──
function CallLogsTab({ globalEnterpriseId, globalOrgId, globalCreator, enterprises, organizations }: {
  globalEnterpriseId: string;
  globalOrgId: string;
  globalCreator: string;
  enterprises: Enterprise[];
  organizations: Organization[];
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterModel, setFilterModel] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterApiKey, setFilterApiKey] = useState("");

  const allGroups = Array.from(new Set(mockUsageLogs.map(r => r.group)));
  const allModels = Array.from(new Set(mockUsageLogs.map(r => r.model)));

  const selectedEnterpriseName = enterprises.find(e => e.id === globalEnterpriseId)?.name ?? "";
  const selectedOrgName = organizations.find(o => o.id === globalOrgId)?.name ?? "";

  const handleReset = () => {
    setFilterModel("all"); setFilterType("all"); setFilterGroup("all"); setFilterApiKey("");
    setPage(1);
  };

  const filtered = mockUsageLogs.filter(r => {
    if (globalEnterpriseId && selectedEnterpriseName && r.enterprise !== selectedEnterpriseName) return false;
    if (globalOrgId && selectedOrgName && r.org !== selectedOrgName) return false;
    if (globalCreator.trim() && !r.apiKey.toLowerCase().includes(globalCreator.toLowerCase())) return false;
    if (filterModel !== "all" && r.model !== filterModel) return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterGroup !== "all" && r.group !== filterGroup) return false;
    if (filterApiKey.trim() && !r.apiKey.toLowerCase().includes(filterApiKey.toLowerCase())) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const headers = ["时间", "所属企业", "APIKey", "组织", "分组", "类型", "模型", "上游渠道", "用时/首字", "输入", "输出", "花费", "详情"];

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-l-primary/60 bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background">
            <span>2026-03-03 00:00:00</span>
            <span className="mx-1 text-muted-foreground">→</span>
            <span>2026-03-03 23:59:59</span>
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
          </div>
          <Input className="h-9 w-44 text-sm" placeholder="APIKey 名称" value={filterApiKey} onChange={e => { setFilterApiKey(e.target.value); setPage(1); }} />
          <Select value={filterModel} onValueChange={v => { setFilterModel(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="模型名称" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部模型</SelectItem>
              {allModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-1 rounded-md">消耗额度：¥0.05</span>
          <span className="bg-muted border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-md">RPM：0</span>
          <span className="bg-muted border border-border text-muted-foreground text-xs px-2.5 py-1 rounded-md">TPM：0</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

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
                          <span className={cn("text-xs font-medium", filterGroup !== "all" ? "text-primary" : "text-muted-foreground")}>分组</span>
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
                          <span className={cn("text-xs font-medium", filterType !== "all" ? "text-primary" : "text-muted-foreground")}>类型</span>
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
                  <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">{row.enterprise}</td>
                  <td className="px-3 py-2.5">
                    <button className={`text-xs px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${getApiKeyColor(row.apiKey)}`} onClick={() => navigate(`/admin/tokens?key=${row.apiKey}`)} title="跳转至令牌管理">{row.apiKey}</button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button className="text-xs text-primary hover:underline whitespace-nowrap cursor-pointer" onClick={() => navigate(`/admin/enterprises?org=${encodeURIComponent(row.org)}`)} title="跳转至企业管理">{row.org}</button>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.group}</td>
                  <td className="px-3 py-2.5">
                    {row.type === "错误"
                      ? <span className="bg-red-100 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded">错误</span>
                      : <span className="bg-green-100 text-green-600 border border-green-200 text-xs px-1.5 py-0.5 rounded">消费</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="border border-purple-200 text-purple-700 bg-purple-50 text-xs px-1.5 py-0.5 rounded">{row.model}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getChannelStyle(row.channel)}`}>{row.channel}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">{row.duration}</span>
                      <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">{row.streaming}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.input}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.output}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground">{row.cost}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}

// ── Tab 2: 任务日志 ──
function TaskLogsTab({ globalEnterpriseId, globalOrgId, enterprises, organizations }: {
  globalEnterpriseId: string;
  globalOrgId: string;
  enterprises: Enterprise[];
  organizations: Organization[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterTaskId, setFilterTaskId] = useState("");
  const [filterExecStatus, setFilterExecStatus] = useState("all");
  const [selectedTask, setSelectedTask] = useState<typeof mockTaskLogs[0] | null>(null);

  const selectedEnterpriseName = enterprises.find(e => e.id === globalEnterpriseId)?.name ?? "";
  const selectedOrgName = organizations.find(o => o.id === globalOrgId)?.name ?? "";

  const filtered = mockTaskLogs.filter(r => {
    if (globalEnterpriseId && selectedEnterpriseName && r.enterprise !== selectedEnterpriseName) return false;
    if (globalOrgId && selectedOrgName && r.org !== selectedOrgName) return false;
    if (filterTaskId.trim() && !r.taskId.toLowerCase().includes(filterTaskId.toLowerCase())) return false;
    if (filterExecStatus !== "all" && r.execStatus !== filterExecStatus) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setFilterTaskId(""); setFilterExecStatus("all"); setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-l-primary/60 bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background">
            <span>2026-03-03 00:00:00</span>
            <span className="mx-1 text-muted-foreground">→</span>
            <span>2026-03-03 23:59:59</span>
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
          </div>
          <Input className="h-9 w-48 text-sm" placeholder="任务ID" value={filterTaskId} onChange={e => { setFilterTaskId(e.target.value); setPage(1); }} />
          <Select value={filterExecStatus} onValueChange={v => { setFilterExecStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="执行状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="进行中">进行中</SelectItem>
              <SelectItem value="已完成">已完成</SelectItem>
              <SelectItem value="失败">失败</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleReset}>
            <X className="w-3.5 h-3.5" />重置
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["提交时间", "结束时间", "花费时间", "所属企业", "平台", "类型", "任务ID", "执行状态", "进度", "详情"].map(h => (
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
                  <td className="px-3 py-2.5 text-xs text-foreground font-medium whitespace-nowrap">{row.enterprise}</td>
                  <td className="px-3 py-2.5">
                    <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5 py-0.5 rounded">{row.platform}</span>
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
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

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
                <span className="text-muted-foreground">所属企业</span>
                <span className="col-span-2 font-medium text-foreground">{selectedTask.enterprise}</span>
                <span className="text-muted-foreground">平台</span>
                <span className="col-span-2">
                  <span className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5 py-0.5 rounded">{selectedTask.platform}</span>
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
                <span className="text-muted-foreground">结束时间</span>
                <span className="col-span-2 font-mono text-xs text-foreground">{selectedTask.endTime}</span>
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
function AuditLogsTab({ globalEnterpriseId, globalCreator, enterprises }: {
  globalEnterpriseId: string;
  globalCreator: string;
  enterprises: Enterprise[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterOperator, setFilterOperator] = useState("");
  const [filterOpType, setFilterOpType] = useState("all");

  const selectedEnterpriseName = enterprises.find(e => e.id === globalEnterpriseId)?.name ?? "";

  const filtered = mockAuditLogs.filter(r => {
    if (globalEnterpriseId && selectedEnterpriseName && r.enterprise !== selectedEnterpriseName && r.enterprise !== "-") return false;
    if (globalCreator.trim() && !r.operator.toLowerCase().includes(globalCreator.toLowerCase())) return false;
    if (filterOperator.trim() && !r.operator.toLowerCase().includes(filterOperator.toLowerCase())) return false;
    if (filterOpType !== "all" && r.opType !== filterOpType) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setFilterOperator(""); setFilterOpType("all"); setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="border-l-4 border-l-primary/60 bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-md px-3 h-9 text-sm text-foreground bg-background">
            <span>2026-03-03 00:00:00</span>
            <span className="mx-1 text-muted-foreground">→</span>
            <span>2026-03-03 23:59:59</span>
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
          </div>
          <Input className="h-9 w-44 text-sm" placeholder="操作人 / 手机号" value={filterOperator} onChange={e => { setFilterOperator(e.target.value); setPage(1); }} />
          <Select value={filterOpType} onValueChange={v => { setFilterOpType(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="操作类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="登录">登录</SelectItem>
              <SelectItem value="企业审核">企业审核</SelectItem>
              <SelectItem value="账户充值">账户充值</SelectItem>
              <SelectItem value="用户封禁">用户封禁</SelectItem>
              <SelectItem value="令牌操作">令牌操作</SelectItem>
              <SelectItem value="设置变更">设置变更</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleReset}>
            <X className="w-3.5 h-3.5" />重置
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["时间", "所属企业", "操作人", "操作类型", "操作内容", "操作结果", "IP 地址"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">{row.time}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">{row.enterprise}</td>
                  <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.operator}</td>
                  <td className="px-3 py-2.5">
                    <AuditTypeBadge type={row.opType} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-foreground max-w-[240px] truncate">{row.content}</td>
                  <td className="px-3 py-2.5">
                    {row.result === "成功"
                      ? <span className="bg-green-100 text-green-600 border border-green-200 text-xs px-1.5 py-0.5 rounded">成功</span>
                      : <span className="bg-red-100 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded">失败</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">{row.ip}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationFooter total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}

// ── Main ──
export default function AdminCallLogs() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Global context state — lifted to top-level, shared across all 3 tabs
  const [globalEnterpriseId, setGlobalEnterpriseId] = useState("");
  const [globalOrgId, setGlobalOrgId] = useState("");
  const [globalCreator, setGlobalCreator] = useState("");

  useEffect(() => {
    supabase.from("enterprises").select("id, name").order("name")
      .then(({ data }) => { if (data) setEnterprises(data as Enterprise[]); });
    supabase.from("organizations").select("id, name, enterprise_id").order("name")
      .then(({ data }) => { if (data) setOrganizations(data as Organization[]); });
  }, []);

  const availableOrgs = globalEnterpriseId
    ? organizations.filter(o => o.enterprise_id === globalEnterpriseId)
    : organizations;

  const hasGlobalFilter = !!(globalEnterpriseId || globalOrgId || globalCreator.trim());

  const handleGlobalReset = () => {
    setGlobalEnterpriseId("");
    setGlobalOrgId("");
    setGlobalCreator("");
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header row — title only */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">调用日志</h1>
        <p className="text-muted-foreground mt-1 text-sm">查看全平台 API 调用详情、任务执行记录与审计轨迹</p>
      </div>

      <Tabs defaultValue="call">
        {/* Tab row: tabs on left, global dimension filters on right — same line */}
        <div className="flex items-center justify-between gap-3">
          <TabsList className="gap-1 h-auto p-1">
            <TabsTrigger value="call" className="gap-1.5 text-sm px-4 py-2">
              <Activity className="w-4 h-4" />调用日志
            </TabsTrigger>
            <TabsTrigger value="task" className="gap-1.5 text-sm px-4 py-2">
              <ClipboardList className="w-4 h-4" />任务日志
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-sm px-4 py-2">
              <Shield className="w-4 h-4" />审计日志
            </TabsTrigger>
          </TabsList>

          {/* Global context selectors — inline with tabs */}
          <div className="flex items-center gap-2">
            <FilterCombobox
              items={enterprises}
              value={globalEnterpriseId}
              onChange={v => { setGlobalEnterpriseId(v); setGlobalOrgId(""); }}
              placeholder="所属企业"
              emptyText="未找到企业"
              width="w-40"
            />
            <FilterCombobox
              items={availableOrgs}
              value={globalOrgId}
              onChange={setGlobalOrgId}
              placeholder="所属组织"
              emptyText={globalEnterpriseId ? "该企业暂无组织" : "未找到组织"}
              width="w-36"
            />
            <Input
              className="h-9 w-40 text-sm"
              placeholder="创建人 / 手机号"
              value={globalCreator}
              onChange={e => setGlobalCreator(e.target.value)}
            />
            {hasGlobalFilter && (
              <Button size="sm" variant="ghost" className="h-9 gap-1 text-muted-foreground hover:text-foreground px-2" onClick={handleGlobalReset}>
                <X className="w-3.5 h-3.5" />
                <span className="text-xs">重置</span>
              </Button>
            )}
          </div>
        </div>
        <TabsContent value="call" className="mt-4">
          <CallLogsTab
            globalEnterpriseId={globalEnterpriseId}
            globalOrgId={globalOrgId}
            globalCreator={globalCreator}
            enterprises={enterprises}
            organizations={organizations}
          />
        </TabsContent>
        <TabsContent value="task" className="mt-4">
          <TaskLogsTab
            globalEnterpriseId={globalEnterpriseId}
            globalOrgId={globalOrgId}
            enterprises={enterprises}
            organizations={organizations}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLogsTab
            globalEnterpriseId={globalEnterpriseId}
            globalCreator={globalCreator}
            enterprises={enterprises}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
