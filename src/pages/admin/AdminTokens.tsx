import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, Copy, Trash2, Search, Eye, EyeOff, Check, Ban, RefreshCw,
  FlaskConical, Info,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const INTERNAL_KEYWORDS = ["测试", "内部", "运营", "test", "internal", "dev", "开发"];

function isInternalEnterprise(name: string) {
  return INTERNAL_KEYWORDS.some(kw => name.toLowerCase().includes(kw.toLowerCase()));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  status: string;
  total_quota: number | null;
  used_quota: number;
  group_name: string | null;
  expires_at: string | null;
  allowed_models: string[] | null;
  ip_whitelist: string[] | null;
  enterprise_id: string;
  organization_id: string | null;
  creator_phone: string;
  created_at: string;
}

interface Enterprise {
  id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string, show: boolean) {
  if (show) return key;
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "**********" + key.slice(-4);
}

function maskPhone(phone: string, reveal: boolean) {
  if (reveal) return phone;
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

// ─── Pagination Footer ────────────────────────────────────────────────────────

function PaginationFooter({
  total, page, pageSize, onPageChange, onPageSizeChange,
}: {
  total: number; page: number; pageSize: number;
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const [jumpVal, setJumpVal] = useState("");

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    p => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground flex-wrap gap-2">
      <span>共 {total} 条记录{total > 0 && <>&nbsp;&nbsp;第 {start}-{end} 条</>}</span>
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

// ─── Enterprise Combobox ──────────────────────────────────────────────────────

function EnterpriseCombobox({
  enterprises, value, onChange,
}: {
  enterprises: Enterprise[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = enterprises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = enterprises.find(e => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-9 w-52 justify-between text-sm font-normal"
        >
          <span className="truncate text-left">
            {selected ? selected.name : "所属企业（模糊搜索）"}
          </span>
          <ChevronDown className="ml-2 w-3.5 h-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="搜索企业名称…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>未找到匹配企业</CommandEmpty>
            <CommandGroup>
              {value !== "" && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(""); setOpen(false); setSearch(""); }}
                  className="text-muted-foreground"
                >
                  清除筛选
                </CommandItem>
              )}
              {filtered.map(e => (
                <CommandItem
                  key={e.id}
                  value={e.id}
                  onSelect={() => { onChange(e.id); setOpen(false); setSearch(""); }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isInternalEnterprise(e.name) && (
                      <FlaskConical className="w-3 h-3 text-orange-500 shrink-0" />
                    )}
                    <span className="truncate">{e.name}</span>
                    {e.id === value && <Check className="ml-auto w-3.5 h-3.5 shrink-0" />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminTokens() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search
  const [searchName, setSearchName] = useState("");
  const [searchKey, setSearchKey] = useState("");

  // God-view filters
  const [filterEnterpriseId, setFilterEnterpriseId] = useState("");
  const [filterCreator, setFilterCreator] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Visibility
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  // Enterprise name cache
  const [enterpriseNames, setEnterpriseNames] = useState<Record<string, string>>({});

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setKeys(data as unknown as ApiKey[]);
      const ids = [...new Set((data as unknown as ApiKey[]).map(k => k.enterprise_id))];
      if (ids.length > 0) {
        const { data: ents } = await supabase
          .from("enterprises")
          .select("id, name")
          .in("id", ids);
        if (ents) {
          const map: Record<string, string> = {};
          ents.forEach((e: any) => { map[e.id] = e.name; });
          setEnterpriseNames(map);
        }
      }
    }
    setLoading(false);
  }, []);

  const fetchEnterprises = useCallback(async () => {
    const { data } = await supabase.from("enterprises").select("id, name").order("name");
    if (data) setEnterprises(data as Enterprise[]);
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchEnterprises();
  }, [fetchKeys, fetchEnterprises]);

  const filtered = keys.filter(k => {
    if (searchName && !k.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchKey && !k.key_value.toLowerCase().includes(searchKey.toLowerCase())) return false;
    if (filterEnterpriseId && k.enterprise_id !== filterEnterpriseId) return false;
    if (filterCreator && !k.creator_phone.includes(filterCreator)) return false;
    return true;
  });

  const totalFiltered = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleVisible = (id: string) => {
    setVisibleKeys(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const togglePhone = (id: string) => {
    setRevealedPhones(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const copyKeyValue = async (k: ApiKey) => {
    await navigator.clipboard.writeText(k.key_value);
    setCopiedKey(k.id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleStatus = async (k: ApiKey) => {
    const newStatus = k.status === "active" ? "disabled" : "active";
    const { error } = await supabase.rpc("toggle_api_key_status" as any, {
      p_phone: k.creator_phone, p_id: k.id, p_status: newStatus,
    });
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      fetchKeys();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc("delete_api_key" as any, {
      p_phone: deleteTarget.creator_phone, p_id: deleteTarget.id,
    });
    if (error) {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "已删除" });
      setDeleteTarget(null);
      setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
      fetchKeys();
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    let failed = 0;
    for (const id of selected) {
      const k = keys.find(key => key.id === id);
      if (!k) continue;
      const { error } = await supabase.rpc("delete_api_key" as any, { p_phone: k.creator_phone, p_id: k.id });
      if (error) failed++;
    }
    toast({ title: failed > 0 ? `部分删除失败（${failed}条）` : "批量删除成功" });
    setSelected(new Set());
    fetchKeys();
  };

  const handleCopySelected = async () => {
    const selectedKeys = keys.filter(k => selected.has(k.id)).map(k => k.key_value);
    if (selectedKeys.length === 0) return;
    await navigator.clipboard.writeText(selectedKeys.join("\n"));
    toast({ title: `已复制 ${selectedKeys.length} 个密钥` });
  };

  const toggleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(k => k.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleReset = () => {
    setSearchName("");
    setSearchKey("");
    setFilterEnterpriseId("");
    setFilterCreator("");
    setPage(1);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">令牌管理</h1>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={fetchKeys}>
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </Button>
        </div>

        {/* Filter bar */}
        <div className="border-l-4 border-l-primary/60 bg-card border border-border rounded-xl p-4 space-y-3">
          {/* Row 1 — God-view filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">上帝视角</span>
            <EnterpriseCombobox
              enterprises={enterprises}
              value={filterEnterpriseId}
              onChange={v => { setFilterEnterpriseId(v); setPage(1); }}
            />
            <Input
              className="h-9 w-48 text-sm"
              placeholder="创建人手机 / 用户ID"
              value={filterCreator}
              onChange={e => { setFilterCreator(e.target.value); setPage(1); }}
            />
          </div>

          {/* Row 2 — Action + name/key search */}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-9 gap-1.5" disabled>
              <Plus className="w-3.5 h-3.5" />
              添加令牌
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleCopySelected} disabled={selected.size === 0}>
              <Copy className="w-3.5 h-3.5" />
              复制所选令牌
            </Button>
            <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={handleBulkDelete} disabled={selected.size === 0}>
              <Trash2 className="w-3.5 h-3.5" />
              删除所选令牌
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Input
                className="h-9 w-40 text-sm"
                placeholder="搜索令牌名称"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
              <Input
                className="h-9 w-40 text-sm"
                placeholder="搜索密钥"
                value={searchKey}
                onChange={e => setSearchKey(e.target.value)}
              />
              <Button size="sm" className="h-9 gap-1" onClick={() => setPage(1)}>
                <Search className="w-3.5 h-3.5" />
                查询
              </Button>
              <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">加载中…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border" style={{ background: "hsl(var(--primary)/0.05)" }}>
                      <th className="px-3 py-2.5 w-10">
                        <Checkbox
                          checked={paged.length > 0 && selected.size === paged.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>名称</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>所属企业</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>创建人</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>状态</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap" style={{ color: "hsl(var(--primary)/0.75)" }}>
                        <span className="flex items-center gap-1">
                          今日消耗 Tokens
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 opacity-50 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-48">
                              待接入真实统计表，当前显示占位符
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>已用/总额度</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>分组</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>密钥</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>可用模型</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>IP 限制</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>创建时间</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>过期时间</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="text-center text-muted-foreground py-16">暂无令牌数据</td>
                      </tr>
                    ) : paged.map(k => {
                      const isActive = k.status === "active";
                      const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
                      const usedPct = k.total_quota ? Math.min(100, (k.used_quota / k.total_quota) * 100) : 0;
                      const enterpriseName = enterpriseNames[k.enterprise_id] || k.enterprise_id.slice(0, 8);
                      const internal = isInternalEnterprise(enterpriseName);

                      return (
                        <tr
                          key={k.id}
                          className={cn(
                            "border-b border-border last:border-0 transition-colors",
                            "hover:bg-[hsl(var(--primary)/0.04)]"
                          )}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2.5">
                            <Checkbox checked={selected.has(k.id)} onCheckedChange={() => toggleSelect(k.id)} />
                          </td>

                          {/* 名称 */}
                          <td className="px-3 py-2.5 text-foreground font-medium whitespace-nowrap">{k.name}</td>

                          {/* 所属企业 */}
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1">
                                {internal && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded px-1 py-px cursor-help shrink-0">
                                        <FlaskConical className="w-2.5 h-2.5" />
                                        内部测试
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      该企业属于内部测试空间，不计入财务消耗统计
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span className="text-xs text-foreground whitespace-nowrap">{enterpriseName}</span>
                              </div>
                            </div>
                          </td>

                          {/* 创建人 */}
                          <td className="px-3 py-2.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => togglePhone(k.id)}
                                  className="text-xs font-mono text-foreground hover:text-primary transition-colors cursor-pointer"
                                >
                                  {maskPhone(k.creator_phone, revealedPhones.has(k.id))}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                点击{revealedPhones.has(k.id) ? "隐藏" : "显示"}完整手机号
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          {/* 状态 */}
                          <td className="px-3 py-2.5">
                            {isActive
                              ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">已启用</Badge>
                              : <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs">已禁用</Badge>
                            }
                          </td>

                          {/* 今日消耗 Tokens */}
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">—</span>
                          </td>

                          {/* 已用/总额度 */}
                          <td className="px-3 py-2.5">
                            <div className="min-w-[110px]">
                              <span className="text-xs font-mono text-foreground">
                                ¥{k.used_quota.toFixed(2)}{" "}
                                <span className="text-muted-foreground">
                                  / {k.total_quota !== null ? `¥${k.total_quota.toFixed(2)}` : "无限制"}
                                </span>
                              </span>
                              {k.total_quota !== null && (
                                <Progress value={usedPct} className="h-1 mt-1 bg-muted" />
                              )}
                              {internal && (
                                <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">不计统计</span>
                              )}
                            </div>
                          </td>

                          {/* 分组 */}
                          <td className="px-3 py-2.5 text-xs text-foreground">{k.group_name || "-"}</td>

                          {/* 密钥 */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded max-w-[160px] truncate">
                                {maskKey(k.key_value, visibleKeys.has(k.id))}
                              </code>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button onClick={() => toggleVisible(k.id)} className="p-0.5 hover:bg-muted rounded text-muted-foreground">
                                    {visibleKeys.has(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">{visibleKeys.has(k.id) ? "隐藏" : "显示"}密钥</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button onClick={() => copyKeyValue(k)} className="p-0.5 hover:bg-muted rounded text-muted-foreground">
                                    {copiedKey === k.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">复制密钥</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>

                          {/* 可用模型 */}
                          <td className="px-3 py-2.5">
                            {k.allowed_models && k.allowed_models.length > 0 ? (
                              <div className="flex flex-wrap gap-0.5 max-w-[140px]">
                                {k.allowed_models.slice(0, 2).map(m => (
                                  <span key={m} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 py-px">{m}</span>
                                ))}
                                {k.allowed_models.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">+{k.allowed_models.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">全部</span>
                            )}
                          </td>

                          {/* IP 限制 */}
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {k.ip_whitelist && k.ip_whitelist.length > 0
                              ? <span className="text-orange-600">{k.ip_whitelist.length} 条</span>
                              : "-"
                            }
                          </td>

                          {/* 创建时间 */}
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {format(new Date(k.created_at), "yyyy-MM-dd HH:mm")}
                          </td>

                          {/* 过期时间 */}
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap font-mono">
                            {k.expires_at ? (
                              <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                                {format(new Date(k.expires_at), "yyyy-MM-dd HH:mm")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">永不过期</span>
                            )}
                          </td>

                          {/* 操作 */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleToggleStatus(k)}
                                    className={cn(
                                      "p-1 rounded transition-colors",
                                      isActive
                                        ? "text-orange-500 hover:bg-orange-50"
                                        : "text-green-600 hover:bg-green-50"
                                    )}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {isActive ? "禁用令牌" : "启用令牌"}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setDeleteTarget(k)}
                                    className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">删除令牌</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationFooter
                total={totalFiltered}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>

        {/* Delete dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除令牌</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除令牌「{deleteTarget?.name}」吗？此操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
