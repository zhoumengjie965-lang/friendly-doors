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
  Users, Mail, FileText, Send, ArrowRight, ArrowLeft, UserPlus,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import OrgTreeSelect from "@/components/OrgTreeSelect";

interface Enterprise {
  id: string;
  name: string;
  enterprise_code: string;
}

interface BatchInfo {
  email: string;
  remark?: string;
  distributed_at?: string;
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
  activated?: boolean; // 是否已激活（被调用过）
  is_batch?: boolean; // 是否为批量创建
  batch_info?: BatchInfo; // 批量分发信息
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

type MergedStatus = "正常" | "未激活" | "预算不足" | "已过期" | "禁用";

function getMergedStatus(k: ApiKey): MergedStatus {
  if (k.status === "disabled") return "禁用";
  if (k.expires_at && new Date(k.expires_at) < new Date()) return "已过期";
  if (k.total_quota !== null && k.used_quota >= k.total_quota) return "预算不足";
  // 未激活：通过邮件发送但还未被调用过（activated 为 false 或 undefined 且 used_quota 为 0）
  if ((k.activated === false || k.activated === undefined) && k.used_quota === 0) return "未激活";
  return "正常";
}

const mergedStatusConfig: Record<MergedStatus, { dot: string; badge: string; label: string }> = {
  "正常":    { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "正常" },
  "未激活":  { dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-700 border-blue-200",      label: "未激活" },
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
  const [typeFilter, setTypeFilter] = useState<string>("all");

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

  // Batch create dialog state
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [batchStep, setBatchStep] = useState(0);
  // Step 1: Properties
  const [batchTokenType, setBatchTokenType] = useState<"member" | "department">("member");
  const [batchQuota, setBatchQuota] = useState("");
  const [batchUnlimited, setBatchUnlimited] = useState(true);
  const [batchExpires, setBatchExpires] = useState("");
  const [batchModels, setBatchModels] = useState<string[]>([]);
  const [batchIpWhitelist, setBatchIpWhitelist] = useState("");
  // Step 2: Member list
  const [batchMemberInput, setBatchMemberInput] = useState("");
  const [batchParsedMembers, setBatchParsedMembers] = useState<{email: string; remark: string; valid: boolean}[]>([]);
  // Step 3: Email
  const [batchEmailSubject, setBatchEmailSubject] = useState("【AI网关平台】API Key 已分配 - 请安全提取");
  const [batchEmailIntro, setBatchEmailIntro] = useState(`尊敬的合作伙伴：

您好！

您已被授权访问 AI 网关平台，我们已为您的账户分配专属 API Key。为确保您的数据安全，请通过以下方式安全提取您的访问令牌：`);
  const [batchEmailFooter, setBatchEmailFooter] = useState(`━━━━━━━━━━━━━━━━━━━━━

注意事项：
1. 请勿将 API Key 泄露给第三方或存储在公开仓库中
2. 建议定期轮换密钥以确保账户安全
3. 如发现异常调用，请立即联系管理员重置密钥

如有任何疑问，请随时联系您的专属客户成功经理。

此致
敬礼！

AI 网关平台团队`);
  const [batchSending, setBatchSending] = useState(false);

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
    if (!error && data) {
      let keys = data as unknown as ApiKey[];
      // TODO: Demo data - 给第一条数据添加批量创建信息（仅前端展示）
      if (keys.length > 0) {
        keys = keys.map((k, idx) => idx === 0 ? {
          ...k,
          is_batch: true,
          batch_info: {
            email: "lisi@company.com",
            remark: "李四",
            distributed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1天前
          },
          activated: false,
          used_quota: 0,
        } : k);
      }
      setMyKeys(keys);
    }
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
      let keys = data as unknown as ApiKey[];
      // TODO: Demo data - 给第一条数据添加批量创建信息（仅前端展示）
      if (keys.length > 0) {
        keys = keys.map((k, idx) => idx === 0 ? {
          ...k,
          is_batch: true,
          batch_info: {
            email: "zhangsan@company.com",
            remark: "张三",
            distributed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
          },
          activated: false,
          used_quota: 0,
        } : k);
      }
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
      .select("id, name, parent_id")
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
      // Prefill from org default config for member
      const cfg = orgConfigSaved.current;
      setFormGroup(cfg.group);
      setFormExpires(cfg.expires);
      setFormQuota(cfg.quota);
      setFormUnlimited(cfg.unlimited);
      setFormModels([...cfg.models]);
      setFormIpWhitelist(cfg.ipWhitelist);
      // Always open simple dialog; advanced settings accessible via button inside
      setSimpleDialogOpen(true);
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

  // Batch create handlers
  const openBatchCreate = () => {
    setBatchCreateOpen(true);
    setBatchStep(0);
    // Reset form
    setBatchTokenType("member");
    setBatchQuota("");
    setBatchUnlimited(true);
    setBatchExpires("");
    setBatchModels([]);
    setBatchIpWhitelist("");
    setBatchMemberInput("");
    setBatchParsedMembers([]);
    setBatchEmailSubject("【AI网关平台】API Key 已分配 - 请安全提取");
    setBatchEmailIntro(`尊敬的合作伙伴：

您好！

您已被授权访问 AI 网关平台，我们已为您的账户分配专属 API Key。为确保您的数据安全，请通过以下方式安全提取您的访问令牌：`);
    setBatchEmailFooter(`━━━━━━━━━━━━━━━━━━━━━

注意事项：
1. 请勿将 API Key 泄露给第三方或存储在公开仓库中
2. 建议定期轮换密钥以确保账户安全
3. 如发现异常调用，请立即联系管理员重置密钥

如有任何疑问，请随时联系您的专属客户成功经理。

此致
敬礼！

AI 网关平台团队`);
  };

  const parseBatchMembers = (input: string) => {
    const lines = input.split(/\n/).filter(line => line.trim());
    const parsed = lines.map(line => {
      const parts = line.split(/[\/|,，]/).map(s => s.trim());
      const email = parts[0] || "";
      const remark = parts[1] || "";
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid = emailRegex.test(email);
      return { email, remark, valid };
    });
    setBatchParsedMembers(parsed);
  };

  const handleBatchMemberInputChange = (value: string) => {
    setBatchMemberInput(value);
    parseBatchMembers(value);
  };

  const handleBatchSend = async () => {
    setBatchSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({ title: "批量创建成功", description: `已为 ${batchParsedMembers.filter(m => m.valid).length} 位成员创建 API Key 并发送邮件` });
    setBatchSending(false);
    setBatchCreateOpen(false);
    fetchOrgKeys();
  };

  const validMembersCount = batchParsedMembers.filter(m => m.valid).length;
  const invalidMembersCount = batchParsedMembers.filter(m => !m.valid).length;

  const filterKeys = (keys: ApiKey[], isOrgTab = false) => {
    return keys.filter(k => {
      const matchName = !nameSearch || k.name.toLowerCase().includes(nameSearch.toLowerCase());
      const matchApiKey = !apiKeySearch || k.key_value.toLowerCase().includes(apiKeySearch.toLowerCase());
      const mergedSt = getMergedStatus(k);
      const matchStatus = statusFilter === "all" || mergedSt === statusFilter;
      const matchGroup = groupFilter === "all" || (groupFilter === "__none__" ? !k.group_name : k.group_name === groupFilter);
      // Type filter: 部门级 = 生产通道, 成员级 = 其他
      const keyType = k.group_name === "生产通道" ? "部门级" : "成员级";
      const matchType = typeFilter === "all" || keyType === typeFilter;
      // Org-tab specific filters
      const matchMember = !isOrgTab || memberFilter === "all" || k.creator_phone === memberFilter;
      const matchOrgName = !isOrgTab || orgNameFilter === "all" || k.organization_id === orgNameFilter;
      return matchName && matchApiKey && matchStatus && matchGroup && matchType && matchMember && matchOrgName;
    });
  };

  const paginate = (keys: ApiKey[], page: number) => {
    const start = (page - 1) * PAGE_SIZE;
    return keys.slice(start, start + PAGE_SIZE);
  };

  const KeyTable = ({ keys, showCreator, showOrg, page, setPage, filterFn, showType }: {
    keys: ApiKey[]; showCreator?: boolean; showOrg?: boolean; page: number; setPage: (p: number) => void;
    filterFn?: (keys: ApiKey[]) => ApiKey[];
    showType?: boolean;
  }) => {
    const filtered = filterFn ? filterFn(keys) : filterKeys(keys);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = paginate(filtered, page);
    const colSpan = 9 + (showCreator ? 1 : 0) + (showOrg ? 1 : 0) + (showType ? 1 : 0);

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
                        <DropdownMenuCheckboxItem checked={statusFilter === "未激活"} onCheckedChange={() => setStatusFilter("未激活")}>未激活</DropdownMenuCheckboxItem>
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
                {showType && (
                  <TableHead className="font-medium">
                    <div className="flex items-center gap-1">
                      类型
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="hover:bg-muted rounded p-0.5"><ChevronDown className="w-3 h-3" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuCheckboxItem checked={typeFilter === "all"} onCheckedChange={() => setTypeFilter("all")}>全部</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={typeFilter === "成员级"} onCheckedChange={() => setTypeFilter("成员级")}>成员级</DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem checked={typeFilter === "部门级"} onCheckedChange={() => setTypeFilter("部门级")}>部门级</DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableHead>
                )}
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-muted-foreground">{userNames[k.creator_phone] || k.creator_phone}</span>
                          {/* 批量创建 Key 的邮件图标 */}
                          {k.is_batch && k.batch_info && (
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors">
                                    <Mail className="w-3 h-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="font-medium text-sm">批量分发信息</span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex gap-2">
                                        <span className="text-muted-foreground shrink-0">分发邮箱:</span>
                                        <span className="font-mono text-foreground">{k.batch_info.email}</span>
                                      </div>
                                      {k.batch_info.remark && (
                                        <div className="flex gap-2">
                                          <span className="text-muted-foreground shrink-0">备注名:</span>
                                          <span className="text-foreground">{k.batch_info.remark}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{k.group_name || "—"}</span>
                    </TableCell>
                    {showType && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {k.group_name === "生产通道" ? "部门级" : "成员级"}
                        </span>
                      </TableCell>
                    )}
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
            {previewRole === "org_admin" && (
              <button
                onClick={() => { setActiveTab("prod"); fetchProdKeys(); }}
                className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                  activeTab === "prod"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                业务 API Key
              </button>
            )}
            <button
              onClick={() => { setActiveTab("org"); if (selectedOrgId) fetchOrgKeys(); }}
              className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                activeTab === "org"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              所有 API Key
            </button>
          </div>
          {previewRole === "org_admin" && organizations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <OrgTreeSelect
                orgs={organizations}
                value={selectedOrgId ?? ""}
                onValueChange={(val) => {
                  setSelectedOrgId(val);
                  setOrgNameFilter("all");
                  fetchOrgKeys(val);
                }}
                showAll={false}
                placeholder="选择部门..."
                triggerClassName="w-44 shadow-sm"
              />
            </div>
          )}
          {/* 筛选器 — 始终显示在行2同一行 */}
          {/* 企业管理员才显示所属组织筛选 */}
          {previewRole === "admin" && (
            <OrgTreeSelect
              orgs={organizations}
              value={orgNameFilter}
              onValueChange={setOrgNameFilter}
              showAll={true}
              allLabel="所属部门：全部"
              triggerClassName="w-44 shadow-sm text-sm"
            />
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
          {/* org_admin 在组织 Tab 下：显示配置按钮；prod tab 显示创建按钮；其他情况显示创建按钮 */}
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
                variant="outline"
                className="gap-2 h-9"
                onClick={openBatchCreate}
              >
                <UserPlus className="w-4 h-4" />批量创建
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
            showType={true}
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
              部门级通用令牌，不随成员变动失效，适用于企业自有系统集成、后台程序调用等需长期稳定运行的业务场景。
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
                      <div className="h-9 w-20 flex items-center justify-center rounded-md border border-input bg-background px-3 text-sm shrink-0">
                        月度
                      </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                          <span className="text-muted-foreground truncate">
                            {formModels.length === 0
                              ? (formGroup === "生产通道" ? "留空则支持分组内对应模型" : "留空则支持所有模型")
                              : `已选 ${formModels.length} 个模型`}
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
            {/* 高级设置入口 */}
            <button
              type="button"
              className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-background text-muted-foreground text-xs hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => {
                setSimpleDialogOpen(false);
                setSheetOpen(true);
              }}
            >
              <Settings className="w-3.5 h-3.5" />
              高级设置
            </button>
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

      {/* Batch Create Dialog */}
      <Dialog open={batchCreateOpen} onOpenChange={setBatchCreateOpen}>
        <DialogContent className="max-w-3xl !p-0 flex flex-col" style={{ height: '85vh', maxHeight: '85vh' }}>
          {/* Loading Overlay */}
          {batchSending && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-foreground">正在生成令牌并推送邮件...</p>
              <p className="text-sm text-muted-foreground mt-2">请稍候，不要关闭窗口</p>
            </div>
          )}
          
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              批量创建 API Key
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-3 border-b border-border shrink-0">
            {[
              { icon: Settings, label: "配置 API Key" },
              { icon: FileText, label: "导入名单" },
              { icon: Mail, label: "分发配置" },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  batchStep === idx
                    ? "bg-primary text-primary-foreground"
                    : batchStep > idx
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <step.icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{step.label}</span>
                </div>
                {idx < 2 && (
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-1.5" />
                )}
              </div>
            ))}
          </div>

          {/* Step Content - Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Step 1: Properties */}
            {batchStep === 0 && (
              <div className="space-y-6">
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-primary/80">设置这批 API Key 的通用属性，所有成员将使用相同的配置。</p>
                </div>

                {/* Token Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">令牌类型</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="tokenType"
                        checked={batchTokenType === "member"}
                        onChange={() => setBatchTokenType("member")}
                        className="w-4 h-4 text-primary"
                      />
                      <div>
                        <span className="text-sm font-medium">成员令牌</span>
                        <p className="text-xs text-muted-foreground">绑定到具体成员，随成员状态变化</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="tokenType"
                        checked={batchTokenType === "department"}
                        onChange={() => setBatchTokenType("department")}
                        className="w-4 h-4 text-primary"
                      />
                      <div>
                        <span className="text-sm font-medium">部门令牌</span>
                        <p className="text-xs text-muted-foreground">不随成员变动失效，适用于业务系统</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Quota */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">配额设置</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">¥</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={batchQuota}
                          onChange={e => setBatchQuota(e.target.value)}
                          disabled={batchUnlimited}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={batchUnlimited} onCheckedChange={setBatchUnlimited} />
                      <span className="text-sm text-muted-foreground">无限额度</span>
                    </div>
                  </div>
                </div>

                {/* Expiry */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">过期时间</Label>
                  <div>
                    <Input
                      type="datetime-local"
                      value={batchExpires}
                      onChange={e => setBatchExpires(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      {[
                        { label: "永不过期", value: "" },
                        { label: "30天", days: 30 },
                        { label: "90天", days: 90 },
                        { label: "1年", days: 365 },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            if (opt.value === "") {
                              setBatchExpires("");
                            } else {
                              const d = new Date();
                              d.setDate(d.getDate() + (opt.days || 0));
                              setBatchExpires(format(d, "yyyy-MM-dd'T'HH:mm"));
                            }
                          }}
                          className="px-3 py-1 text-xs rounded-full border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Models */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">模型限制</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                        <span className="text-muted-foreground truncate">
                          {batchModels.length === 0 ? "留空则支持所有模型" : `已选 ${batchModels.length} 个模型`}
                        </span>
                        <ChevronDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="start">
                      {MODELS.map(m => (
                        <DropdownMenuCheckboxItem
                          key={m}
                          checked={batchModels.includes(m)}
                          onCheckedChange={checked => {
                            if (checked) setBatchModels(prev => [...prev, m]);
                            else setBatchModels(prev => prev.filter(x => x !== m));
                          }}
                        >
                          {m}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {batchModels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {batchModels.map(m => (
                        <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          {m}
                          <button onClick={() => setBatchModels(prev => prev.filter(x => x !== m))} className="hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* IP Whitelist */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">IP 白名单</Label>
                  <Textarea
                    placeholder={"一行一个 IP，留空不限制\n例如：\n192.168.1.1\n10.0.0.0/8"}
                    value={batchIpWhitelist}
                    onChange={e => setBatchIpWhitelist(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Import List */}
            {batchStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p>支持批量粘贴邮箱和备注名，格式：邮箱/备注名</p>
                    <p className="text-xs text-blue-500 mt-1">每行一个成员，如：zhangsan@company.com/张三</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">成员名单</Label>
                    <span className="text-xs text-muted-foreground">
                      有效：<span className="text-green-600 font-medium">{validMembersCount}</span>
                      {invalidMembersCount > 0 && (
                        <span className="ml-2 text-destructive">无效：{invalidMembersCount}</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Highlighted Textarea with validation */}
                  <div className="relative">
                    <textarea
                      placeholder={`示例：
zhangsan@company.com/张三
lisi@company.com/李四
wangwu@company.com`}
                      value={batchMemberInput}
                      onChange={e => handleBatchMemberInputChange(e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                      style={{ lineHeight: '1.6' }}
                    />
                    {/* Validation overlay */}
                    {batchParsedMembers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {batchParsedMembers.slice(0, 5).map((member, idx) => (
                          !member.valid && (
                            <div key={idx} className="flex items-center gap-2 text-xs text-destructive">
                              <span>第 {idx + 1} 行:</span>
                              <span className="font-mono">{member.email}</span>
                              <span>邮箱格式错误</span>
                            </div>
                          )
                        ))}
                        {invalidMembersCount > 5 && (
                          <div className="text-xs text-destructive">
                            还有 {invalidMembersCount - 5} 个格式错误...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Email Distribution */}
            {batchStep === 2 && (
              <div className="space-y-5">
                {/* Recipients List Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">待发送用户列表</Label>
                    <span className="text-xs text-muted-foreground">共 {validMembersCount} 人</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 bg-muted/30 rounded-lg border border-border">
                    {batchParsedMembers.filter(m => m.valid).slice(0, 20).map((member, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded text-xs border border-border"
                        title={member.email}
                      >
                        {member.remark || member.email.split('@')[0]}
                      </span>
                    ))}
                    {validMembersCount > 20 && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs text-muted-foreground">
                        +{validMembersCount - 20} 更多...
                      </span>
                    )}
                  </div>
                </div>

                {/* Email Editor */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">邮件编辑</Label>
                  <div className="bg-gray-100 rounded-lg p-3">
                    {/* Email Client Chrome */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* Subject Line - Editable */}
                      <div className="border-b border-gray-100">
                        <div className="flex items-center px-4 py-2 bg-gray-50/50">
                          <span className="text-xs text-gray-500 w-10 shrink-0">主题</span>
                          <input
                            type="text"
                            value={batchEmailSubject}
                            onChange={e => setBatchEmailSubject(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                            placeholder="请输入邮件主题"
                          />
                        </div>
                      </div>
                      
                      {/* Email Body - Split into editable and fixed parts */}
                      <div className="flex flex-col">
                        {/* Editable Intro */}
                        <textarea
                          value={batchEmailIntro}
                          onChange={e => setBatchEmailIntro(e.target.value)}
                          className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed outline-none resize-none font-sans border-b border-gray-100"
                          style={{ minHeight: '80px' }}
                          spellCheck={false}
                          placeholder="请输入邮件开头内容..."
                        />
                        
                        {/* Fixed Config Info (Non-editable) */}
                        <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                          <div className="text-sm font-medium text-gray-700 mb-2">Key 配置信息</div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-16">令牌类型：</span>
                              <span className="font-medium text-gray-800">{batchTokenType === "member" ? "成员令牌" : "部门令牌"}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-16">使用配额：</span>
                              <span className="font-medium text-gray-800">{batchUnlimited ? "无限制" : `¥${batchQuota || "0"}`}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-16">有效期至：</span>
                              <span className="font-medium text-gray-800">{batchExpires ? new Date(batchExpires).toLocaleDateString("zh-CN") : "永不过期"}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button Area */}
                        <div className="px-4 py-4 border-b border-gray-100">
                          <button className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
                            安全提取令牌
                          </button>
                        </div>
                        
                        {/* Editable Footer */}
                        <textarea
                          value={batchEmailFooter}
                          onChange={e => setBatchEmailFooter(e.target.value)}
                          className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed outline-none resize-none font-sans"
                          style={{ minHeight: '120px' }}
                          spellCheck={false}
                          placeholder="请输入邮件结尾内容..."
                        />
                      </div>
                      
                      {/* Edit Hint */}
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500">灰色区域为配置信息（不可编辑），白色区域可自由编辑</span>
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          已同步最新配置
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="border-t border-border px-6 py-4 shrink-0 gap-2">
            {batchStep > 0 ? (
              <Button variant="outline" onClick={() => setBatchStep(batchStep - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />上一步
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setBatchCreateOpen(false)}>取消</Button>
            )}

            {batchStep < 2 ? (
              <Button
                onClick={() => setBatchStep(batchStep + 1)}
                disabled={batchStep === 1 && validMembersCount === 0}
              >
                下一步<ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleBatchSend}
                disabled={batchSending}
                className="bg-primary"
              >
                {batchSending ? (
                  <>发送中...</>
                ) : (
                  <><Send className="w-4 h-4 mr-1" />立即发送</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

