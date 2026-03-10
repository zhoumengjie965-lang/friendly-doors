import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus, Copy, Trash2, Search, Eye, EyeOff, Check, Ban, RefreshCw,
  FlaskConical, Info, FileText,
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

interface Organization {
  id: string;
  name: string;
  enterprise_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskKey(key: string, show: boolean) {
  if (show) return key;
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "**********" + key.slice(-4);
}

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function getRunningStatus(k: ApiKey): { label: string; cls: string } {
  if (k.expires_at && new Date(k.expires_at) < new Date()) {
    return { label: "已过期", cls: "bg-gray-100 text-gray-500 border-gray-200" };
  }
  if (k.total_quota !== null && k.used_quota >= k.total_quota) {
    return { label: "额度耗尽", cls: "bg-red-50 text-red-600 border-red-200" };
  }
  return { label: "正常", cls: "bg-green-50 text-green-700 border-green-200" };
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

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function KeyDetailDrawer({
  k, enterpriseName, open, onClose,
}: {
  k: ApiKey | null;
  enterpriseName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (!open) setShowKey(false); }, [open]);

  const copyKey = async () => {
    if (!k) return;
    await navigator.clipboard.writeText(k.key_value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "密钥已复制" });
  };

  if (!k) return null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            令牌详情
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 text-sm">
          {/* 名称 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">令牌名称</p>
            <p className="font-medium">{k.name}</p>
          </div>

          {/* 所属企业 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">所属企业</p>
            <p className="font-medium">{enterpriseName}</p>
          </div>

          {/* 分组 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">分组</p>
            <p>{k.group_name || <span className="text-muted-foreground">未设置</span>}</p>
          </div>

          {/* 密钥 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">密钥（API Key）</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all leading-relaxed">
                {maskKey(k.key_value, showKey)}
              </code>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowKey(v => !v)}>
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyKey}>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* 可用模型 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">可用模型</p>
            {k.allowed_models && k.allowed_models.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {k.allowed_models.map(m => (
                  <span key={m} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">{m}</span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">全部模型可用</span>
            )}
          </div>

          {/* IP 白名单 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">IP 白名单限制</p>
            {k.ip_whitelist && k.ip_whitelist.length > 0 ? (
              <div className="space-y-1">
                {k.ip_whitelist.map(ip => (
                  <code key={ip} className="block text-xs font-mono bg-muted px-2 py-1 rounded text-orange-700">{ip}</code>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">无限制</span>
            )}
          </div>

          {/* 创建时间 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">创建时间</p>
            <p className="font-mono text-xs">{format(new Date(k.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
          </div>

          {/* 过期时间 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">过期时间</p>
            {k.expires_at ? (
              <p className={cn("font-mono text-xs", new Date(k.expires_at) < new Date() ? "text-destructive" : "")}>
                {format(new Date(k.expires_at), "yyyy-MM-dd HH:mm:ss")}
              </p>
            ) : (
              <span className="text-muted-foreground">永不过期</span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminTokens() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search
  const [searchName, setSearchName] = useState("");
  const [searchKey, setSearchKey] = useState("");

  // Filters
  const [filterEnterpriseId, setFilterEnterpriseId] = useState("");
  const [filterOrgId, setFilterOrgId] = useState("");
  const [filterCreator, setFilterCreator] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Internal filter
  const [excludeInternal, setExcludeInternal] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  // Detail drawer
  const [drawerKey, setDrawerKey] = useState<ApiKey | null>(null);

  // Enterprise name cache
  const [enterpriseNames, setEnterpriseNames] = useState<Record<string, string>>({});

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    enterprise_id: "",
    group_name: "",
    total_quota: "",
    expires_at: "",
    allowed_models: "",
    ip_whitelist: "",
    phone: "",
  });

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

  const fetchOrganizations = useCallback(async () => {
    const { data } = await supabase.from("organizations").select("id, name, enterprise_id").order("name");
    if (data) setOrganizations(data as Organization[]);
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchEnterprises();
    fetchOrganizations();
  }, [fetchKeys, fetchEnterprises, fetchOrganizations]);

  // Cascade: filter orgs by selected enterprise
  const availableOrgs = filterEnterpriseId
    ? organizations.filter(o => o.enterprise_id === filterEnterpriseId)
    : organizations;

  const filtered = keys.filter(k => {
    if (searchName && !k.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchKey && !k.key_value.toLowerCase().includes(searchKey.toLowerCase())) return false;
    if (filterEnterpriseId && k.enterprise_id !== filterEnterpriseId) return false;
    if (filterOrgId && k.organization_id !== filterOrgId) return false;
    if (filterCreator && !k.creator_phone.includes(filterCreator)) return false;
    if (filterStatus !== "all" && k.status !== filterStatus) return false;
    if (excludeInternal) {
      const eName = enterpriseNames[k.enterprise_id] || "";
      if (isInternalEnterprise(eName)) return false;
    }
    return true;
  });

  const totalFiltered = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

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
    setExcludeInternal(false);
    setPage(1);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.enterprise_id || !createForm.phone.trim()) {
      toast({ title: "请填写必填项：令牌名称、所属企业、创建人手机号", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    const { error } = await supabase.rpc("create_api_key" as any, {
      p_name: createForm.name.trim(),
      p_enterprise_id: createForm.enterprise_id,
      p_phone: createForm.phone.trim(),
      p_group_name: createForm.group_name.trim() || null,
      p_total_quota: createForm.total_quota ? Number(createForm.total_quota) : null,
      p_expires_at: createForm.expires_at || null,
      p_allowed_models: createForm.allowed_models
        ? createForm.allowed_models.split(",").map(s => s.trim()).filter(Boolean)
        : null,
      p_ip_whitelist: createForm.ip_whitelist
        ? createForm.ip_whitelist.split("\n").map(s => s.trim()).filter(Boolean)
        : null,
    });
    setCreateLoading(false);
    if (error) {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "令牌创建成功" });
      setCreateOpen(false);
      setCreateForm({ name: "", enterprise_id: "", group_name: "", total_quota: "", expires_at: "", allowed_models: "", ip_whitelist: "", phone: "" });
      fetchKeys();
    }
  };

  const drawerEnterpriseName = drawerKey
    ? (enterpriseNames[drawerKey.enterprise_id] || drawerKey.enterprise_id.slice(0, 8))
    : "";

  return (
    <TooltipProvider>
      <div className="p-6 space-y-4 overflow-y-auto">
        {/* Create Token Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                添加令牌
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">令牌名称 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="输入令牌名称"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">所属企业 <span className="text-destructive">*</span></Label>
                  <Select
                    value={createForm.enterprise_id}
                    onValueChange={v => setCreateForm(f => ({ ...f, enterprise_id: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择企业" />
                    </SelectTrigger>
                    <SelectContent>
                      {enterprises.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">创建人手机号 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="输入手机号"
                    value={createForm.phone}
                    onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">分组（可选）</Label>
                  <Input
                    placeholder="如 default"
                    value={createForm.group_name}
                    onChange={e => setCreateForm(f => ({ ...f, group_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">额度上限（可选，元）</Label>
                  <Input
                    type="number"
                    placeholder="留空=不限"
                    value={createForm.total_quota}
                    onChange={e => setCreateForm(f => ({ ...f, total_quota: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">过期时间（可选）</Label>
                  <Input
                    type="datetime-local"
                    value={createForm.expires_at}
                    onChange={e => setCreateForm(f => ({ ...f, expires_at: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">可用模型（英文逗号分隔，留空=全部）</Label>
                  <Input
                    placeholder="如 gpt-4o, claude-3-5-sonnet"
                    value={createForm.allowed_models}
                    onChange={e => setCreateForm(f => ({ ...f, allowed_models: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground mb-1 block">IP 白名单（每行一个，留空=不限）</Label>
                  <Textarea
                    rows={2}
                    placeholder={"192.168.1.1\n10.0.0.0/8"}
                    value={createForm.ip_whitelist}
                    onChange={e => setCreateForm(f => ({ ...f, ip_whitelist: e.target.value }))}
                    className="text-xs font-mono resize-none"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "创建中…" : "确认创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
          {/* Row 1 — Filters */}
          <div className="flex flex-wrap items-center gap-2">
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
            <Button size="sm" className="h-9 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              添加令牌
            </Button>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleCopySelected} disabled={selected.size === 0}>
              <Copy className="w-3.5 h-3.5" />
              批量复制
            </Button>
            <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={handleBulkDelete} disabled={selected.size === 0}>
              <Trash2 className="w-3.5 h-3.5" />
              批量删除
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
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>管理状态</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>运行状态</th>
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
                      <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>已消耗/预算上限</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold" style={{ color: "hsl(var(--primary)/0.75)" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted-foreground py-16">暂无令牌数据</td>
                      </tr>
                    ) : paged.map(k => {
                      const isActive = k.status === "active";
                      const usedPct = k.total_quota ? Math.min(100, (k.used_quota / k.total_quota) * 100) : 0;
                      const enterpriseName = enterpriseNames[k.enterprise_id] || k.enterprise_id.slice(0, 8);
                      const internal = isInternalEnterprise(enterpriseName);
                      const runStatus = getRunningStatus(k);

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
                              {internal && !excludeInternal && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-0.5 self-start text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded px-1 py-px cursor-help">
                                      <FlaskConical className="w-2.5 h-2.5" />
                                      内部自用
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    该企业属于内部自用空间，不计入财务消耗统计
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <button
                                onClick={() => navigate(`/admin/enterprises/${k.enterprise_id}`)}
                                className="text-xs text-primary hover:underline text-left whitespace-nowrap transition-colors"
                              >
                                {enterpriseName}
                              </button>
                            </div>
                          </td>

                          {/* 创建人 */}
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-mono text-foreground">
                              {maskPhone(k.creator_phone)}
                            </span>
                          </td>

                          {/* 管理状态 */}
                          <td className="px-3 py-2.5">
                            {isActive
                              ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">已启用</Badge>
                              : <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs">已禁用</Badge>
                            }
                          </td>

                          {/* 运行状态 */}
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className={cn("text-xs", runStatus.cls)}>
                              {runStatus.label}
                            </Badge>
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
                                    onClick={() => setDrawerKey(k)}
                                    className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">查看详情</TooltipContent>
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

        {/* Detail Drawer */}
        <KeyDetailDrawer
          k={drawerKey}
          enterpriseName={drawerEnterpriseName}
          open={!!drawerKey}
          onClose={() => setDrawerKey(null)}
        />

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
