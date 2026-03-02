import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, RefreshCw, Eye, EyeOff, Copy, Check, Pencil, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, Search, X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface Enterprise {
  id: string;
  name: string;
  enterprise_code: string;
}

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

interface Props {
  enterprise: Enterprise;
  role: string;
}

const MODELS = [
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo",
  "claude-3-5-sonnet", "claude-3-haiku", "gemini-1.5-pro", "gemini-1.5-flash",
];

const PAGE_SIZE = 10;

function maskKey(key: string, show: boolean) {
  if (show) return key;
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "**********" + key.slice(-4);
}

function formatQuota(used: number, total: number | null) {
  const usedStr = `¥${used.toFixed(2)}`;
  const totalStr = total === null ? "无限制" : `¥${total.toFixed(2)}`;
  const pct = total === null || total === 0 ? 0 : Math.min(100, (used / total) * 100);
  return (
    <div className="min-w-[120px]">
      <span className="text-sm font-mono text-foreground">
        {usedStr} <span className="text-muted-foreground">/ {totalStr}</span>
      </span>
      {total !== null && (
        <Progress value={pct} className="h-1.5 mt-1 bg-muted" />
      )}
    </div>
  );
}

type RunningStatus = "正常" | "预算不足" | "已过期" | "异常";

function getRunningStatus(k: ApiKey): { label: RunningStatus; tooltip?: string } {
  if (k.expires_at && new Date(k.expires_at) < new Date()) {
    return { label: "已过期", tooltip: "Key 已过期" };
  }
  if (k.total_quota !== null && k.used_quota >= k.total_quota) {
    return { label: "预算不足", tooltip: "Key 预算不足" };
  }
  return { label: "正常" };
}

const runningStatusColors: Record<RunningStatus, string> = {
  "正常": "bg-green-100 text-green-700 border-green-200",
  "预算不足": "bg-orange-100 text-orange-700 border-orange-200",
  "已过期": "bg-gray-100 text-gray-500 border-gray-200",
  "异常": "bg-red-100 text-red-700 border-red-200",
};


export default function ApiKeys({ enterprise, role }: Props) {
  const { toast } = useToast();
  const phone = getCurrentPhone();
  const canSeeOrgTab = role === "admin" || role === "org_admin";

  const [myKeys, setMyKeys] = useState<ApiKey[]>([]);
  const [orgKeys, setOrgKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  // Search state
  const [nameSearch, setNameSearch] = useState("");
  const [keySearch, setKeySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [runningStatusFilter, setRunningStatusFilter] = useState<string>("all");

  // Pagination
  const [myPage, setMyPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);

  // Visibility per key
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formExpires, setFormExpires] = useState("");
  const [formQuota, setFormQuota] = useState("");
  const [formUnlimited, setFormUnlimited] = useState(true);
  const [formModels, setFormModels] = useState<string[]>([]);
  const [formIpWhitelist, setFormIpWhitelist] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  // User names cache (phone -> name)
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const fetchMyKeys = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys" as any)
      .select("*")
      .eq("enterprise_id", enterprise.id)
      .eq("creator_phone", phone)
      .order("created_at", { ascending: false });
    if (!error && data) setMyKeys(data as unknown as ApiKey[]);
    setLoading(false);
  }, [phone, enterprise.id]);

  const fetchOrgKeys = useCallback(async () => {
    if (!canSeeOrgTab) return;
    const { data, error } = await supabase
      .from("api_keys" as any)
      .select("*")
      .eq("enterprise_id", enterprise.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const keys = data as unknown as ApiKey[];
      setOrgKeys(keys);
      // Fetch user names
      const phones = [...new Set(keys.map(k => k.creator_phone))];
      if (phones.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("phone, name")
          .in("phone", phones);
        if (users) {
          const map: Record<string, string> = {};
          users.forEach((u: { phone: string; name: string | null }) => {
            map[u.phone] = u.name || u.phone;
          });
          setUserNames(map);
        }
      }
    }
  }, [canSeeOrgTab, enterprise.id]);

  useEffect(() => {
    fetchMyKeys();
    fetchOrgKeys();
  }, [fetchMyKeys, fetchOrgKeys]);

  const openCreate = () => {
    setEditingKey(null);
    setFormName(""); setFormGroup(""); setFormExpires("");
    setFormQuota(""); setFormUnlimited(true);
    setFormModels([]); setFormIpWhitelist("");
    setSheetOpen(true);
  };

  const openEdit = (k: ApiKey) => {
    setEditingKey(k);
    setFormName(k.name);
    setFormGroup(k.group_name || "");
    setFormExpires(k.expires_at ? format(new Date(k.expires_at), "yyyy-MM-dd'T'HH:mm") : "");
    setFormUnlimited(k.total_quota === null);
    setFormQuota(k.total_quota !== null ? String(k.total_quota) : "");
    setFormModels(k.allowed_models || []);
    setFormIpWhitelist((k.ip_whitelist || []).join("\n"));
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !phone) return;
    setSaving(true);
    const payload: any = {
      name: formName.trim(),
      group_name: formGroup.trim() || null,
      expires_at: formExpires ? new Date(formExpires).toISOString() : null,
      total_quota: formUnlimited ? null : (parseFloat(formQuota) || 0),
      allowed_models: formModels.length > 0 ? formModels : null,
      ip_whitelist: formIpWhitelist.trim()
        ? formIpWhitelist.split("\n").map(s => s.trim()).filter(Boolean)
        : null,
    };

    if (editingKey) {
      const { error } = await supabase
        .from("api_keys" as any)
        .update(payload)
        .eq("id", editingKey.id);
      if (error) {
        toast({ title: "更新失败", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "更新成功" });
        setSheetOpen(false);
        fetchMyKeys(); fetchOrgKeys();
      }
    } else {
      const { error } = await supabase
        .from("api_keys" as any)
        .insert({ ...payload, enterprise_id: enterprise.id, creator_phone: phone });
      if (error) {
        toast({ title: "创建失败", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "创建成功" });
        setSheetOpen(false);
        fetchMyKeys(); fetchOrgKeys();
      }
    }
    setSaving(false);
  };

  const handleToggleStatus = async (k: ApiKey) => {
    const newStatus = k.status === "active" ? "disabled" : "active";
    const { error } = await supabase
      .from("api_keys" as any)
      .update({ status: newStatus })
      .eq("id", k.id);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      fetchMyKeys(); fetchOrgKeys();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("api_keys" as any)
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "已删除" });
      setDeleteTarget(null);
      fetchMyKeys(); fetchOrgKeys();
    }
  };

  const toggleVisible = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyKey = async (k: ApiKey) => {
    await navigator.clipboard.writeText(k.key_value);
    setCopiedKey(k.id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const setQuickExpiry = (offset: number | null) => {
    if (offset === null) { setFormExpires(""); return; }
    const d = new Date(Date.now() + offset);
    setFormExpires(format(d, "yyyy-MM-dd'T'HH:mm"));
  };

  const filterKeys = (keys: ApiKey[]) => {
    return keys.filter(k => {
      const matchName = !nameSearch || k.name.toLowerCase().includes(nameSearch.toLowerCase());
      const matchKey = !keySearch || k.key_value.toLowerCase().includes(keySearch.toLowerCase());
      const matchStatus = statusFilter === "all" || k.status === statusFilter;
      const matchRunning = runningStatusFilter === "all" || getRunningStatus(k).label === runningStatusFilter;
      return matchName && matchKey && matchStatus && matchRunning;
    });
  };

  const paginate = (keys: ApiKey[], page: number) => {
    const start = (page - 1) * PAGE_SIZE;
    return keys.slice(start, start + PAGE_SIZE);
  };

  const KeyTable = ({ keys, showCreator, page, setPage }: {
    keys: ApiKey[]; showCreator?: boolean; page: number; setPage: (p: number) => void;
  }) => {
    const filtered = filterKeys(keys);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = paginate(filtered, page);
    const colSpan = showCreator ? 11 : 10;

    return (
      <div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-medium">名称</TableHead>
                {/* 管理状态 */}
                <TableHead className="font-medium">
                  <div className="flex items-center gap-1">
                    管理状态
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hover:bg-muted rounded p-0.5"><ChevronDown className="w-3 h-3" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => setStatusFilter("all")}>全部</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "active"} onCheckedChange={() => setStatusFilter("active")}>启用</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "disabled"} onCheckedChange={() => setStatusFilter("disabled")}>禁用</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                {/* 运行状态 */}
                <TableHead className="font-medium">
                  <div className="flex items-center gap-1">
                    运行状态
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hover:bg-muted rounded p-0.5"><ChevronDown className="w-3 h-3" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuCheckboxItem checked={runningStatusFilter === "all"} onCheckedChange={() => setRunningStatusFilter("all")}>全部</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={runningStatusFilter === "正常"} onCheckedChange={() => setRunningStatusFilter("正常")}>正常</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={runningStatusFilter === "预算不足"} onCheckedChange={() => setRunningStatusFilter("预算不足")}>预算不足</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={runningStatusFilter === "已过期"} onCheckedChange={() => setRunningStatusFilter("已过期")}>已过期</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead className="font-medium">已消耗/预算上限</TableHead>
                {showCreator && <TableHead className="font-medium">创建者</TableHead>}
                <TableHead className="font-medium">分组</TableHead>
                <TableHead className="font-medium">API Key</TableHead>
                <TableHead className="font-medium">可用模型</TableHead>
                <TableHead className="font-medium">过期时间</TableHead>
                <TableHead className="font-medium">创建时间</TableHead>
                <TableHead className="font-medium text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-12">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : paged.map(k => {
                const rs = getRunningStatus(k);
                return (
                  <TableRow key={k.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{k.name}</TableCell>
                    {/* 管理状态 */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${k.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                        <span className="text-sm">{k.status === "active" ? "启用" : "禁用"}</span>
                      </div>
                    </TableCell>
                    {/* 运行状态 */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium cursor-default ${runningStatusColors[rs.label]}`}>
                              {rs.label}
                            </span>
                          </TooltipTrigger>
                          {rs.tooltip && (
                            <TooltipContent><p>{rs.tooltip}</p></TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    {/* 已消耗/预算上限 */}
                    <TableCell>{formatQuota(k.used_quota, k.total_quota)}</TableCell>
                    {/* 创建者（仅组织Tab） */}
                    {showCreator && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{userNames[k.creator_phone] || k.creator_phone}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{k.group_name || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-foreground">{maskKey(k.key_value, visibleKeys.has(k.id))}</span>
                        <button onClick={() => toggleVisible(k.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          {visibleKeys.has(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => copyKey(k)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          {copiedKey === k.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!k.allowed_models || k.allowed_models.length === 0
                        ? <Badge variant="secondary" className="text-xs">无限制</Badge>
                        : <div className="flex flex-wrap gap-1">{k.allowed_models.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div>
                      }
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {k.expires_at ? format(new Date(k.expires_at), "yyyy-MM-dd HH:mm") : "永不过期"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{format(new Date(k.created_at), "yyyy-MM-dd HH:mm")}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(k)}
                          className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(k)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(k)}
                          className={`p-1.5 rounded transition-colors ${k.status === "active" ? "hover:bg-muted text-muted-foreground" : "hover:bg-primary/10 text-primary"}`}
                          title={k.status === "active" ? "禁用" : "启用"}
                        >
                          {k.status === "active" ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>共 {filtered.length} 条记录，每页 {PAGE_SIZE} 条</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
            <span className="px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
            <span className="ml-2">跳至</span>
            <Input
              className="w-14 h-8 text-center"
              defaultValue={page}
              onBlur={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 1 && v <= totalPages) setPage(v);
              }}
            />
            <span>页</span>
          </div>
        </div>
      </div>
    );
  };

  const SearchBar = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="关键词搜索（名称）"
          className="pl-8 w-52"
          value={nameSearch}
          onChange={e => setNameSearch(e.target.value)}
        />
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="API Key 搜索"
          className="pl-8 w-52"
          value={keySearch}
          onChange={e => setKeySearch(e.target.value)}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" className="gap-1">
            {runningStatusFilter === "all" ? "运行状态" : runningStatusFilter}
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuCheckboxItem checked={runningStatusFilter === "all"} onCheckedChange={() => setRunningStatusFilter("all")}>全部</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={runningStatusFilter === "正常"} onCheckedChange={() => setRunningStatusFilter("正常")}>正常</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={runningStatusFilter === "预算不足"} onCheckedChange={() => setRunningStatusFilter("预算不足")}>预算不足</DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={runningStatusFilter === "已过期"} onCheckedChange={() => setRunningStatusFilter("已过期")}>已过期</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="default" onClick={() => { setNameSearch(""); setKeySearch(""); setStatusFilter("all"); setRunningStatusFilter("all"); }}>
        <X className="w-4 h-4 mr-1" />重置
      </Button>
    </div>
  );

  const ActionBar = () => (
    <div className="flex items-center justify-between mb-4">
      <Button onClick={openCreate} className="gap-2">
        <Plus className="w-4 h-4" />创建 API Key
      </Button>
      <button
        onClick={() => { fetchMyKeys(); fetchOrgKeys(); }}
        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="刷新"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">API Key 管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">管理你的 API 密钥，控制访问权限与预算</p>
      </div>

      <Tabs defaultValue="my">
        <TabsList className="mb-6">
          <TabsTrigger value="my">我的 API Key</TabsTrigger>
          {canSeeOrgTab && <TabsTrigger value="org">组织 API Key</TabsTrigger>}
        </TabsList>

        <TabsContent value="my">
          <SearchBar />
          <ActionBar />
          <KeyTable keys={myKeys} page={myPage} setPage={setMyPage} />
        </TabsContent>

        {canSeeOrgTab && (
          <TabsContent value="org">
            <SearchBar />
            <ActionBar />
            <KeyTable keys={orgKeys} showCreator page={orgPage} setPage={setOrgPage} />
          </TabsContent>
        )}
      </Tabs>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="!w-[520px] !max-w-[520px] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle>{editingKey ? "编辑 API Key" : "新增 API Keys"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">基本信息</h3>
              <div className="space-y-3">
                {/* 名称 */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">
                    <span className="text-destructive mr-0.5">*</span>名称
                  </Label>
                  <Input placeholder="请输入名称" value={formName} onChange={e => setFormName(e.target.value)} />
                </div>
                {/* 分组 */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">分组</Label>
                  <Input placeholder="不填则使用默认分组" value={formGroup} onChange={e => setFormGroup(e.target.value)} />
                </div>
                {/* 过期时间 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">
                    <span className="text-destructive mr-0.5">*</span>过期时间
                  </Label>
                  <div>
                    <Input type="datetime-local" value={formExpires} onChange={e => setFormExpires(e.target.value)} />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[
                        { label: "永不过期", offset: null },
                        { label: "一个月", offset: 30 * 24 * 60 * 60 * 1000 },
                        { label: "一天", offset: 24 * 60 * 60 * 1000 },
                        { label: "一小时", offset: 60 * 60 * 1000 },
                      ].map(({ label, offset }) => (
                        <button
                          key={label}
                          onClick={() => setQuickExpiry(offset)}
                          className="px-3 py-1 text-xs rounded-full border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 预算设置 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">预算设置</h3>
              <div className="space-y-3">
                {/* 预算上限 */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">预算上限</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm font-medium shrink-0">¥</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formQuota}
                      onChange={e => setFormQuota(e.target.value)}
                      disabled={formUnlimited}
                      className="flex-1"
                    />
                  </div>
                </div>
                {/* 无限额度 */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">无限预算</Label>
                  <Switch checked={formUnlimited} onCheckedChange={setFormUnlimited} />
                </div>
              </div>
            </div>

            {/* 访问限制 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">访问限制</h3>
              <div className="space-y-3">
                {/* 模型限制 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">模型限制列表</Label>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                          <span className="text-muted-foreground truncate">
                            {formModels.length === 0 ? "留空则支持所有模型" : `已选 ${formModels.length} 个模型`}
                          </span>
                          <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64" align="start">
                        {MODELS.map(m => (
                          <DropdownMenuCheckboxItem
                            key={m}
                            checked={formModels.includes(m)}
                            onCheckedChange={checked => {
                              if (checked) setFormModels(prev => [...prev, m]);
                              else setFormModels(prev => prev.filter(x => x !== m));
                            }}
                          >
                            {m}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {formModels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formModels.map(m => (
                          <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                            {m}
                            <button onClick={() => setFormModels(prev => prev.filter(x => x !== m))} className="hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* IP 白名单 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">IP 白名单</Label>
                  <textarea
                    placeholder={"一行一个 IP，留空不限制\n例如：\n192.168.1.1\n10.0.0.0/8"}
                    value={formIpWhitelist}
                    onChange={e => setFormIpWhitelist(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 底部固定按钮 */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
            <Button variant="outline" className="w-24" onClick={() => setSheetOpen(false)} disabled={saving}>取消</Button>
            <Button className="w-24" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "保存中..." : "确定"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除 API Key「{deleteTarget?.name}」，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
