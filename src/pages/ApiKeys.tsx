// 写操作全部通过 SECURITY DEFINER RPC 函数执行，RLS 写策略已移除
import { useState, useEffect, useCallback, useRef } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, RefreshCw, Eye, EyeOff, Copy, Check, Pencil, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, Search, X, Building2, Settings, ShieldCheck,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import OrgTreeSelect from "@/components/OrgTreeSelect";

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

// Mock members for UI preview (used as fallback when no real members exist)
const MOCK_MEMBERS = [
  { phone: "13800138001", name: "张伟" },
  { phone: "13912345678", name: "李晓梅" },
  { phone: "18611223344", name: "王建国" },
  { phone: "15955667788", name: null },
  { phone: "13700000001", name: "陈思思" },
];

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

type MergedStatus = "正常" | "预算不足" | "已过期" | "禁用";

function getMergedStatus(k: ApiKey): MergedStatus {
  if (k.status === "disabled") return "禁用";
  if (k.expires_at && new Date(k.expires_at) < new Date()) return "已过期";
  if (k.total_quota !== null && k.used_quota >= k.total_quota) return "预算不足";
  return "正常";
}

const mergedStatusConfig: Record<MergedStatus, { dot: string; badge: string; label: string }> = {
  "正常":    { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "正常" },
  "预算不足":{ dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200",label: "预算不足" },
  "已过期":  { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-500 border-gray-200",     label: "已过期" },
  "禁用":    { dot: "bg-gray-300",   badge: "bg-gray-100 text-gray-400 border-gray-200",     label: "禁用" },
};


export default function ApiKeys({ enterprise, role }: Props) {
  const { toast } = useToast();
  const phone = getCurrentPhone();

  // Preview role — defaults to actual role; drives all UI logic
  const [previewRole, setPreviewRole] = useState(role);
  const canSeeOrgTab = previewRole === "admin" || previewRole === "org_admin";

  const [myKeys, setMyKeys] = useState<ApiKey[]>([]);
  const [orgKeys, setOrgKeys] = useState<ApiKey[]>([]);
  const [prodKeys, setProdKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  // Multi-org switching
  const [organizations, setOrganizations] = useState<{ id: string; name: string; parent_id?: string | null }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Org-tab member filter
  const [orgMembers, setOrgMembers] = useState<{ phone: string; name: string | null }[]>(MOCK_MEMBERS);
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [orgNameFilter, setOrgNameFilter] = useState<string>("all");

  // Search state
  const [nameSearch, setNameSearch] = useState("");
  const [apiKeySearch, setApiKeySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Pagination
  const [myPage, setMyPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);
  const [prodPage, setProdPage] = useState(1);

  // Production tab state
  const [creatingProd, setCreatingProd] = useState(false);
  const [formBudgetType, setFormBudgetType] = useState<"monthly" | "daily">("monthly");

  // Visibility per key
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [simpleDialogOpen, setSimpleDialogOpen] = useState(false);
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

  // Org default config (org_admin sets defaults for member new keys)
  const [orgConfigOpen, setOrgConfigOpen] = useState(false);
  const [orgConfigGroup, setOrgConfigGroup] = useState("");
  const [orgConfigExpires, setOrgConfigExpires] = useState("");
  const [orgConfigQuota, setOrgConfigQuota] = useState("");
  const [orgConfigUnlimited, setOrgConfigUnlimited] = useState(true);
  const [orgConfigModels, setOrgConfigModels] = useState<string[]>([]);
  const [orgConfigIpWhitelist, setOrgConfigIpWhitelist] = useState("");
  const orgConfigSaved = useRef({ group: "", expires: "", quota: "", unlimited: true, models: [] as string[], ipWhitelist: "" });

  // Advanced member permissions
  const [advancedPermOpen, setAdvancedPermOpen] = useState(false);
  const [advancedMembers, setAdvancedMembers] = useState<Set<string>>(new Set());
  const [pendingAdvanced, setPendingAdvanced] = useState<Set<string>>(new Set());

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

  const fetchOrgKeys = useCallback(async (orgId?: string | null) => {
    if (!canSeeOrgTab) return;
    const targetOrgId = orgId !== undefined ? orgId : selectedOrgId;
    let query = supabase
      .from("api_keys" as any)
      .select("*")
      .eq("enterprise_id", enterprise.id);
    if (targetOrgId) {
      query = query.eq("organization_id", targetOrgId);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) {
      const keys = data as unknown as ApiKey[];
      setOrgKeys(keys);
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
    // Fetch members for this org for the member filter
    if (targetOrgId) {
      const { data: members } = await supabase
        .from("members")
        .select("user_phone, users(name)")
        .eq("organization_id", targetOrgId)
        .eq("status", "active");
      if (members && members.length > 0) {
        setOrgMembers(members.map((m: any) => ({
          phone: m.user_phone,
          name: m.users?.name ?? null,
        })));
      } else {
        setOrgMembers(MOCK_MEMBERS);
      }
    } else if (role === "admin") {
      const { data: members } = await supabase
        .from("members")
        .select("user_phone, users(name)")
        .eq("enterprise_id", enterprise.id)
        .eq("status", "active");
      const mapped = members?.map((m: any) => ({
        phone: m.user_phone,
        name: m.users?.name ?? null,
      })) ?? [];
      setOrgMembers(mapped.length > 0 ? mapped : MOCK_MEMBERS);
    } else {
      setOrgMembers(MOCK_MEMBERS);
    }
    setMemberFilter("all");
  }, [canSeeOrgTab, enterprise.id, selectedOrgId]);

  const fetchProdKeys = useCallback(async (orgId?: string | null) => {
    if (!phone) return;
    const targetOrgId = orgId !== undefined ? orgId : selectedOrgId;
    let query = supabase
      .from("api_keys" as any)
      .select("*")
      .eq("enterprise_id", enterprise.id)
      .eq("creator_phone", phone)
      .eq("group_name", "生产通道");
    if (targetOrgId) {
      query = query.eq("organization_id", targetOrgId);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) setProdKeys(data as unknown as ApiKey[]);
  }, [phone, enterprise.id, selectedOrgId]);

  const fetchOrganizations = useCallback(async () => {
    if (!canSeeOrgTab) return;
    const { data } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("enterprise_id", enterprise.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      setOrganizations(data);
      if (role === "admin") {
        fetchOrgKeys(null);
      } else {
        setSelectedOrgId(data[0].id);
        fetchOrgKeys(data[0].id);
      }
    }
  }, [canSeeOrgTab, enterprise.id, role]);

  useEffect(() => {
    fetchMyKeys();
    fetchOrganizations();
  }, [fetchMyKeys, fetchOrganizations]);

  const openCreate = () => {
    setEditingKey(null);
    setFormName("");
    if (previewRole === "member") {
      // Prefill from org default config
      const cfg = orgConfigSaved.current;
      setFormGroup(cfg.group);
      setFormExpires(cfg.expires);
      setFormQuota(cfg.quota);
      setFormUnlimited(cfg.unlimited);
      setFormModels([...cfg.models]);
      setFormIpWhitelist(cfg.ipWhitelist);
      // Check advanced permission
      if (phone && advancedMembers.has(phone)) {
        setSheetOpen(true);
      } else {
        setSimpleDialogOpen(true);
      }
    } else {
      setFormGroup(""); setFormExpires("");
      setFormQuota(""); setFormUnlimited(true);
      setFormModels([]); setFormIpWhitelist("");
      setSheetOpen(true);
    }
  };

  const openCreateProd = () => {
    setEditingKey(null);
    setFormName("");
    setFormGroup("生产通道");
    setFormExpires("");
    setFormQuota("");
    setFormUnlimited(true);
    setFormModels([]);
    setFormIpWhitelist("");
    setFormBudgetType("monthly");
    setCreatingProd(true);
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
    // 普通成员编辑时用小弹窗（仅改名称）
    if (previewRole === "member") {
      setSimpleDialogOpen(true);
    } else {
      setSheetOpen(true);
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || !phone) return;
    setSaving(true);
    const commonPayload = {
      p_phone: phone,
      p_name: formName.trim(),
      p_group_name: formGroup.trim() || null,
      p_expires_at: formExpires ? new Date(formExpires).toISOString() : null,
      p_total_quota: formUnlimited ? null : (parseFloat(formQuota) || 0),
      p_allowed_models: formModels.length > 0 ? formModels : null,
      p_ip_whitelist: formIpWhitelist.trim()
        ? formIpWhitelist.split("\n").map(s => s.trim()).filter(Boolean)
        : null,
    };

    if (editingKey) {
      const { error } = await supabase.rpc("update_api_key" as any, {
        ...commonPayload,
        p_id: editingKey.id,
      });
      if (error) {
        toast({ title: "更新失败", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "更新成功" });
        setSheetOpen(false);
        setSimpleDialogOpen(false);
        fetchMyKeys(); fetchOrgKeys();
        if (creatingProd) { fetchProdKeys(); setCreatingProd(false); }
      }
    } else {
      const { error } = await supabase.rpc("create_api_key" as any, {
        ...commonPayload,
        p_enterprise_id: enterprise.id,
        p_organization_id: selectedOrgId,
      });
      if (error) {
        toast({ title: "创建失败", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "创建成功" });
        setSheetOpen(false);
        setSimpleDialogOpen(false);
        fetchMyKeys(); fetchOrgKeys();
        if (creatingProd) { fetchProdKeys(); setCreatingProd(false); }
      }
    }
    setSaving(false);
  };

  const handleToggleStatus = async (k: ApiKey) => {
    const newStatus = k.status === "active" ? "disabled" : "active";
    const { error } = await supabase.rpc("toggle_api_key_status" as any, {
      p_phone: phone,
      p_id: k.id,
      p_status: newStatus,
    });
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      fetchMyKeys(); fetchOrgKeys();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc("delete_api_key" as any, {
      p_phone: phone,
      p_id: deleteTarget.id,
    });
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

  const setQuickExpiryOrgConfig = (offset: number | null) => {
    if (offset === null) { setOrgConfigExpires(""); return; }
    const d = new Date(Date.now() + offset);
    setOrgConfigExpires(format(d, "yyyy-MM-dd'T'HH:mm"));
  };

  const saveOrgConfig = () => {
    orgConfigSaved.current = {
      group: orgConfigGroup,
      expires: orgConfigExpires,
      quota: orgConfigQuota,
      unlimited: orgConfigUnlimited,
      models: [...orgConfigModels],
      ipWhitelist: orgConfigIpWhitelist,
    };
    setOrgConfigOpen(false);
  };

  const saveAdvancedPerms = () => {
    setAdvancedMembers(new Set(pendingAdvanced));
    setAdvancedPermOpen(false);
  };

  const filterKeys = (keys: ApiKey[], isOrgTab = false) => {
    return keys.filter(k => {
      const matchName = !nameSearch || k.name.toLowerCase().includes(nameSearch.toLowerCase());
      const matchApiKey = !apiKeySearch || k.key_value.toLowerCase().includes(apiKeySearch.toLowerCase());
      const mergedSt = getMergedStatus(k);
      const matchStatus = statusFilter === "all" || mergedSt === statusFilter;
      const matchGroup = groupFilter === "all" || (groupFilter === "__none__" ? !k.group_name : k.group_name === groupFilter);
      // Org-tab specific filters
      const matchMember = !isOrgTab || memberFilter === "all" || k.creator_phone === memberFilter;
      const matchOrgName = !isOrgTab || orgNameFilter === "all" || k.organization_id === orgNameFilter;
      return matchName && matchApiKey && matchStatus && matchGroup && matchMember && matchOrgName;
    });
  };

  const paginate = (keys: ApiKey[], page: number) => {
    const start = (page - 1) * PAGE_SIZE;
    return keys.slice(start, start + PAGE_SIZE);
  };

  const KeyTable = ({ keys, showCreator, showOrg, page, setPage, filterFn }: {
    keys: ApiKey[]; showCreator?: boolean; showOrg?: boolean; page: number; setPage: (p: number) => void;
    filterFn?: (keys: ApiKey[]) => ApiKey[];
  }) => {
    const filtered = filterFn ? filterFn(keys) : filterKeys(keys);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = paginate(filtered, page);
    const colSpan = 9 + (showCreator ? 1 : 0) + (showOrg ? 1 : 0);

    return (
      <div>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-medium">名称</TableHead>
                {/* 状态（合并管理状态+运行状态） */}
                <TableHead className="font-medium">
                  <div className="flex items-center gap-1">
                    状态
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hover:bg-muted rounded p-0.5"><ChevronDown className="w-3 h-3" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => setStatusFilter("all")}>全部</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "正常"} onCheckedChange={() => setStatusFilter("正常")}>正常</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "预算不足"} onCheckedChange={() => setStatusFilter("预算不足")}>预算不足</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "已过期"} onCheckedChange={() => setStatusFilter("已过期")}>已过期</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "禁用"} onCheckedChange={() => setStatusFilter("禁用")}>禁用</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead className="font-medium">已消耗/预算上限</TableHead>
                {showOrg && <TableHead className="font-medium">部门</TableHead>}
                {showCreator && <TableHead className="font-medium">成员</TableHead>}
                <TableHead className="font-medium">
                  <div className="flex items-center gap-1">
                    分组
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hover:bg-muted rounded p-0.5"><ChevronDown className="w-3 h-3" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuCheckboxItem checked={groupFilter === "all"} onCheckedChange={() => setGroupFilter("all")}>全部</DropdownMenuCheckboxItem>
                        {[...new Set(keys.map(k => k.group_name).filter(Boolean))].map(g => (
                          <DropdownMenuCheckboxItem key={g} checked={groupFilter === g} onCheckedChange={() => setGroupFilter(g!)}>{g}</DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuCheckboxItem checked={groupFilter === "__none__"} onCheckedChange={() => setGroupFilter("__none__")}>未分组</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
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
                const ms = getMergedStatus(k);
                const msCfg = mergedStatusConfig[ms];
                return (
                  <TableRow key={k.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{k.name}</TableCell>
                    {/* 状态（合并） */}
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${msCfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${msCfg.dot}`} />
                        {ms}
                      </span>
                    </TableCell>
                    {/* 已消耗/预算上限 */}
                    <TableCell>{formatQuota(k.used_quota, k.total_quota)}</TableCell>
                    {/* 组织（仅企业管理员视角） */}
                    {showOrg && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {organizations.find(o => o.id === k.organization_id)?.name ?? "—"}
                        </span>
                      </TableCell>
                    )}
                    {/* 成员（仅组织Tab） */}
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
                        {!(previewRole === "admin" && activeTab === "org") && (
                          <button
                            onClick={() => openEdit(k)}
                            className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                            title="编辑"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
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

  const handleReset = () => {
    setNameSearch("");
    setApiKeySearch("");
    setStatusFilter("all");
    setGroupFilter("all");
  };

  const [activeTab, setActiveTab] = useState("my");

  return (
    <div>
      {/* 行1：标题 + 右侧角色视角切换 */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-foreground">API Key 管理</h1>
        <div className="flex items-center bg-muted rounded-lg p-1 h-9">
          {(["member", "org_admin", "admin"] as const).map(r => (
            <button
              key={r}
              onClick={() => {
                setPreviewRole(r);
                if (r === "member") setActiveTab("my");
              }}
              className={`px-3 h-full rounded-md text-xs font-medium transition-all ${
                previewRole === r
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "member" ? "普通成员" : r === "org_admin" ? "部门管理员" : "企业管理员"}
            </button>
          ))}
        </div>
      </div>

      {/* 行2：胶囊切换器 + 全局组织选择器 + 组织Tab专属筛选器（同一行）— 仅管理员角色显示 */}
      {canSeeOrgTab && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center bg-muted rounded-lg p-1 h-9">
            <button
              onClick={() => setActiveTab("my")}
              className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                activeTab === "my"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              我的 API Key
            </button>
            <button
              onClick={() => { setActiveTab("org"); if (selectedOrgId) fetchOrgKeys(); }}
              className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                activeTab === "org"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {previewRole === "admin" ? "企业 API Key" : "部门 API Key"}
            </button>
            {previewRole === "org_admin" && (
              <button
                onClick={() => { setActiveTab("prod"); fetchProdKeys(); }}
                className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                  activeTab === "prod"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                生产 API Key
              </button>
            )}
          </div>
          {previewRole === "org_admin" && organizations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedOrgId ?? ""}
                onValueChange={(val) => {
                  setSelectedOrgId(val);
                  setOrgNameFilter("all");
                  fetchOrgKeys(val);
                }}
              >
                <SelectTrigger className="h-9 w-44 border-border shadow-sm font-medium">
                  <SelectValue placeholder="选择部门..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* 筛选器 — 始终显示在行2同一行 */}
          {/* 企业管理员才显示所属组织筛选 */}
          {previewRole === "admin" && (
            <Select value={orgNameFilter} onValueChange={setOrgNameFilter}>
              <SelectTrigger className="h-9 w-36 border-border shadow-sm text-sm">
                <SelectValue placeholder="所属组织" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所属部门：全部</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* 成员筛选：仅在组织 Tab 下显示 */}
          {activeTab === "org" && (
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="h-9 w-40 border-border shadow-sm text-sm">
                <SelectValue placeholder="所属成员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所属成员：全部</SelectItem>
                {orgMembers.map(m => (
                  <SelectItem key={m.phone} value={m.phone}>
                    {m.name ? `${m.name} (${m.phone})` : m.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* 行3：创建按钮 + 搜索栏+刷新（右） */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* org_admin 在组织 Tab 下：显示配置 & 高级权限按钮；prod tab 显示创建按钮；其他情况显示创建按钮 */}
          {previewRole === "org_admin" && activeTab === "org" ? (
            <>
              <Button
                className="gap-2 h-9"
                onClick={() => {
                  // 打开前将已保存的值回填到 state
                  const cfg = orgConfigSaved.current;
                  setOrgConfigGroup(cfg.group);
                  setOrgConfigExpires(cfg.expires);
                  setOrgConfigQuota(cfg.quota);
                  setOrgConfigUnlimited(cfg.unlimited);
                  setOrgConfigModels([...cfg.models]);
                  setOrgConfigIpWhitelist(cfg.ipWhitelist);
                  setOrgConfigOpen(true);
                }}
              >
                <Settings className="w-4 h-4" />配置 API Key
              </Button>
              <Button
                className="gap-2 h-9"
                onClick={() => {
                  setPendingAdvanced(new Set(advancedMembers));
                  setAdvancedPermOpen(true);
                }}
              >
                <ShieldCheck className="w-4 h-4" />成员高级权限
              </Button>
            </>
          ) : previewRole === "org_admin" && activeTab === "prod" ? (
            <Button onClick={openCreateProd} className="gap-2 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />创建 API Key
            </Button>
          ) : previewRole === "admin" && activeTab === "org" ? null : (
            <Button onClick={openCreate} className="gap-2 h-9">
              <Plus className="w-4 h-4" />创建 API Key
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 名称 label + 输入框 */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">名称</span>
            <Input
              placeholder="请输入名称"
              className="h-9 w-36"
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
            />
          </div>
          {/* API Key label + 输入框 */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">API Key</span>
            <Input
              placeholder="请输入 API Key"
              className="h-9 w-40"
              value={apiKeySearch}
              onChange={e => setApiKeySearch(e.target.value)}
            />
          </div>
          {/* 搜索按钮 */}
          <Button className="h-9 px-4">搜索</Button>
          {/* 重置按钮 */}
          <Button variant="outline" className="h-9 px-3" onClick={handleReset}>重置</Button>
          {/* 刷新图标 */}
          <button
            onClick={() => { if (activeTab === "my") fetchMyKeys(); else if (activeTab === "prod") fetchProdKeys(); else fetchOrgKeys(); }}
            className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 表格内容区 */}
      <div>
        {activeTab === "my" && (
          <KeyTable
            keys={myKeys}
            filterFn={(keys) => filterKeys(keys, false)}
            showCreator={false}
            showOrg={false}
            page={myPage}
            setPage={setMyPage}
          />
        )}
        {canSeeOrgTab && activeTab === "org" && (
          <KeyTable
            keys={orgKeys}
            filterFn={(keys) => filterKeys(keys, true)}
            showCreator={true}
            showOrg={previewRole === "admin"}
            page={orgPage}
            setPage={setOrgPage}
          />
        )}
        {previewRole === "org_admin" && activeTab === "prod" && (
          <>
            <KeyTable
              keys={prodKeys}
              filterFn={(keys) => filterKeys(keys, false)}
              showCreator={false}
              showOrg={false}
              page={prodPage}
              setPage={setProdPage}
            />
            <p className="text-xs text-muted-foreground mt-4 text-center">
              生产环境专用 Key，未来将支持基于终端用户的精细化限流与审计统计。
            </p>
          </>
        )}
      </div>


      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setCreatingProd(false); }}>
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
                {!(previewRole === "member" && editingKey) && (
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-right text-muted-foreground text-sm">
                      <span className="text-destructive mr-0.5">*</span>分组
                    </Label>
                    <Select value={formGroup} onValueChange={setFormGroup}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="请选择分组" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="官方价格">官方价格</SelectItem>
                        <SelectItem value="生产通道">生产通道</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* 过期时间 */}
                {!(previewRole === "member" && editingKey) && (
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
                )}
              </div>
            </div>

            {/* 预算设置 — 普通成员编辑时隐藏 */}
            {!(previewRole === "member" && editingKey) && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">预算设置</h3>
              <div className="space-y-3">
                {/* Key 预算上限 — 生产 Key 创建时突出显示 */}
                {creatingProd && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-bold text-foreground">Key 预算上限</span>
                      <span className="text-destructive text-sm">*</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={formBudgetType} onValueChange={(v) => setFormBudgetType(v as "monthly" | "daily")}>
                        <SelectTrigger className="h-9 w-24 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">月度</SelectItem>
                          <SelectItem value="daily">单日</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Switch checked={formUnlimited} onCheckedChange={setFormUnlimited} />
                        <span className="text-xs text-muted-foreground">无限</span>
                      </div>
                    </div>
                    <p className="text-xs text-primary/70">此预算直接占用本部门整体预算，不关联具体成员。</p>
                  </div>
                )}
                {/* 预算上限（非生产Key时正常显示） */}
                {!creatingProd && (
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
                )}
                {/* 无限额度 */}
                {!creatingProd && (
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-right text-muted-foreground text-sm">无限预算</Label>
                    <Switch checked={formUnlimited} onCheckedChange={setFormUnlimited} />
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 访问限制 — 普通成员编辑时隐藏 */}
            {!(previewRole === "member" && editingKey) && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">访问限制</h3>
              <div className="space-y-3">
                {/* 模型限制 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">模型限制列表</Label>
                  <div>
                    {formGroup === "生产通道" ? (
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm cursor-not-allowed">
                        <span className="text-muted-foreground">仅支持分组对应模型列表</span>
                      </div>
                    ) : (
                      <>
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
                      </>
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
            )}
          </div>

          {/* 底部固定按钮 */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
            <Button variant="outline" className="w-24" onClick={() => setSheetOpen(false)} disabled={saving}>取消</Button>
            <Button className="w-24" onClick={handleSave} disabled={saving || !formName.trim() || (previewRole !== "member" && !formGroup)}>
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

      {/* Simple create dialog for member role */}
      <Dialog open={simpleDialogOpen} onOpenChange={open => { setSimpleDialogOpen(open); if (!open) setFormName(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingKey ? "编辑 API Key 名称" : "新增 API Key"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm text-muted-foreground mb-1.5 block">
              <span className="text-destructive mr-0.5">*</span>名称
            </Label>
            <Input
              placeholder="请输入名称"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && formName.trim()) handleSave(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSimpleDialogOpen(false); setFormName(""); }} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "保存中..." : "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org Config Sheet — org_admin sets default config for member keys */}
      <Sheet open={orgConfigOpen} onOpenChange={setOrgConfigOpen}>
        <SheetContent className="!w-[520px] !max-w-[520px] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle>配置 API Key 默认规则</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* 提示语 */}
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-primary/80">该规则适用于所有部门内成员的新建 key 属性，成员新建 Key 时将以此为默认模板。</p>
            </div>

            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">基本信息</h3>
              <div className="space-y-3">
                {/* 分组 */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">分组</Label>
                  <Input placeholder="不填则使用默认分组" value={orgConfigGroup} onChange={e => setOrgConfigGroup(e.target.value)} />
                </div>
                {/* 过期时间 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">过期时间</Label>
                  <div>
                    <Input type="datetime-local" value={orgConfigExpires} onChange={e => setOrgConfigExpires(e.target.value)} />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[
                        { label: "永不过期", offset: null },
                        { label: "一个月", offset: 30 * 24 * 60 * 60 * 1000 },
                        { label: "一天", offset: 24 * 60 * 60 * 1000 },
                        { label: "一小时", offset: 60 * 60 * 1000 },
                      ].map(({ label, offset }) => (
                        <button
                          key={label}
                          onClick={() => setQuickExpiryOrgConfig(offset)}
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
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">预算上限</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm font-medium shrink-0">¥</span>
                    <Input
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={orgConfigQuota}
                      onChange={e => setOrgConfigQuota(e.target.value)}
                      disabled={orgConfigUnlimited}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <Label className="text-right text-muted-foreground text-sm">无限预算</Label>
                  <Switch checked={orgConfigUnlimited} onCheckedChange={setOrgConfigUnlimited} />
                </div>
              </div>
            </div>

            {/* 访问限制 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">访问限制</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">模型限制列表</Label>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                          <span className="text-muted-foreground truncate">
                            {orgConfigModels.length === 0 ? "留空则支持所有模型" : `已选 ${orgConfigModels.length} 个模型`}
                          </span>
                          <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64" align="start">
                        {MODELS.map(m => (
                          <DropdownMenuCheckboxItem
                            key={m}
                            checked={orgConfigModels.includes(m)}
                            onCheckedChange={checked => {
                              if (checked) setOrgConfigModels(prev => [...prev, m]);
                              else setOrgConfigModels(prev => prev.filter(x => x !== m));
                            }}
                          >
                            {m}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {orgConfigModels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {orgConfigModels.map(m => (
                          <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                            {m}
                            <button onClick={() => setOrgConfigModels(prev => prev.filter(x => x !== m))} className="hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">IP 白名单</Label>
                  <textarea
                    placeholder={"一行一个 IP，留空不限制\n例如：\n192.168.1.1\n10.0.0.0/8"}
                    value={orgConfigIpWhitelist}
                    onChange={e => setOrgConfigIpWhitelist(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
            <Button variant="outline" className="w-24" onClick={() => setOrgConfigOpen(false)}>取消</Button>
            <Button className="w-24" onClick={saveOrgConfig}>确定</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Advanced Member Permissions Dialog */}
      <Dialog open={advancedPermOpen} onOpenChange={setAdvancedPermOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>成员高级权限管理</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            被勾选的成员在新建 Key 时将显示完整配置表单（包含分组、预算、访问限制等高级选项）。
          </p>
          <div className="max-h-72 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
            {orgMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">该部门暂无成员</p>
            ) : orgMembers.map(m => {
              const checked = pendingAdvanced.has(m.phone);
              const masked = m.phone.length >= 7
                ? m.phone.slice(0, 3) + "****" + m.phone.slice(-4)
                : m.phone;
              return (
                <label
                  key={m.phone}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={val => {
                      setPendingAdvanced(prev => {
                        const next = new Set(prev);
                        if (val) next.add(m.phone); else next.delete(m.phone);
                        return next;
                      });
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    {m.name && <span className="text-sm font-medium text-foreground mr-1.5">{m.name}</span>}
                    <span className="text-xs text-muted-foreground">{masked}</span>
                  </div>
                  {checked && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">高级</span>
                  )}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvancedPermOpen(false)}>取消</Button>
            <Button onClick={saveAdvancedPerms}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

