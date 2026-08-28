// 写操作全部通过 SECURITY DEFINER RPC 函数执行，RLS 写策略已移除
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  getMockData,
  listKeyTemplates,
  createKeyTemplate,
  updateKeyTemplate,
  deleteKeyTemplate,
  copyKeyTemplate,
  getMemberKeyTemplate,
  getOrgKeyTemplate,
  getOrgsWithTemplate,
  getAllowedModelsForUser,
} from "@/lib/mockData";
import DeptModelPolicyDialog from "@/components/DeptModelPolicyDialog";
import { cn } from "@/lib/utils";
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
  Users, FileText, Send, Loader2, ArrowRight, ArrowLeft, CheckCircle, Mail,
  AlertTriangle, Lock, Info,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import OrgTreeSelect from "@/components/OrgTreeSelect";
import { ALL_MODELS, isModelInGroups } from "@/lib/groupModels";

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
  groups?: string[]; // 多分组，按优先级排序
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

interface KeyTemplateConfig {
  groups: string[];
  expires: string;
  quota: string;
  unlimited: boolean;
  models: string[];
  ipWhitelist: string;
}

interface KeyTemplate {
  id: string;
  name: string;
  description: string | null;
  config: KeyTemplateConfig;
  created_at: string;
  updated_at: string;
  bound_orgs: number;
}

const DEFAULT_TEMPLATE_CONFIG: KeyTemplateConfig = {
  groups: [],
  expires: "",
  quota: "",
  unlimited: true,
  models: [],
  ipWhitelist: "",
};

// 手机号脱敏函数
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

const MODELS = ALL_MODELS;

// 计算部门策略允许的模型列表（null = 全部允许）
function useDeptAllowedModels(enterpriseId: string): string[] | null {
  const [allowed, setAllowed] = useState<string[] | null>(null);
  const phone = getCurrentPhone();

  useEffect(() => {
    if (!phone || !enterpriseId) return;
    const result = getAllowedModelsForUser(phone, enterpriseId);
    setAllowed(result);
  }, [phone, enterpriseId]);

  return allowed;
}

// 通用多选组件（支持搜索、多选）
interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

function MultiSelect({ options, selected, onChange, placeholder = "请选择", searchPlaceholder = "搜索..." }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // 过滤选项
  const filteredOptions = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  // 处理选择/取消选择
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="text-muted-foreground truncate">
          {selected.length === 0 ? placeholder : `已选择 ${selected.length} 项`}
        </span>
        <ChevronDown className={`w-4 h-4 opacity-50 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* 已选择的标签 */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs"
            >
              <span>{value}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selected.filter(v => v !== value));
                }}
                className="hover:text-red-500 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 下拉选择面板 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md">
          {/* 搜索框 */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                autoFocus
              />
            </div>
          </div>
          {/* 选项列表 */}
          <div className="max-h-60 overflow-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">未找到</div>
            ) : (
              filteredOptions.map(option => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="rounded border-gray-300"
                  />
                  <span className="flex-1">{option}</span>
                  {selected.includes(option) && (
                    <span className="text-xs text-blue-600">已选</span>
                  )}
                </label>
              ))
            )}
          </div>
          {/* 底部操作 */}
          <div className="p-2 border-t flex justify-between items-center text-xs text-muted-foreground">
            <span>已选择 {selected.length} 个</span>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-red-500 hover:text-red-600"
              >
                清空
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 分组多选组件（多选、勾选状态、折叠展示）
interface GroupMultiSelectProps {
  groups: string[];
  selected: string[];
  onChange: (groups: string[]) => void;
  placeholder?: string;
}

function GroupMultiSelect({ groups, selected, onChange, placeholder = "选择分组" }: GroupMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleGroup = (group: string) => {
    if (selected.includes(group)) {
      onChange(selected.filter(g => g !== group));
    } else {
      onChange([...selected, group]);
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* 输入框：仅展示第一个已选分组 + "+N" */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              <span className="truncate">{selected[0]}</span>
              {selected.length > 1 && (
                <span className="text-muted-foreground text-xs shrink-0">+{selected.length - 1}</span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 opacity-50 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* 下拉选择面板 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md">
          {/* 分组列表 */}
          <div className="max-h-60 overflow-auto p-1">
            {groups.map(group => {
              const isSelected = selected.includes(group);
              return (
                <div
                  key={group}
                  onClick={() => toggleGroup(group)}
                  className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted cursor-pointer rounded"
                >
                  <span className="flex-1 truncate">{group}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
          {/* 底部操作 */}
          <div className="p-2 border-t flex justify-between items-center text-xs text-muted-foreground">
            <span>已选择 {selected.length} 个</span>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-red-500 hover:text-red-600"
              >
                清空
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const GROUP_OPTIONS = [
  "官方价格（×1.0）",
  "生产通道（×0.95）",
  "测试环境（×0.85）",
  "开发环境（×0.8）",
  "内部工具（×0.7）",
  "实验分组（×0.6）",
  "预发环境（×0.9）",
  "合作伙伴（×0.88）",
  "VIP通道（×0.92）",
  "备用通道（×0.75）",
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
  const remaining = total === null ? null : Math.max(0, total - used);
  const remainingStr = remaining === null ? "无限制" : `¥${remaining.toFixed(2)}`;
  const totalStr = total === null ? "无限制" : `¥${total.toFixed(2)}`;
  const pct = total === null || total === 0 ? 0 : Math.min(100, (used / total) * 100);
  return (
    <div className="min-w-[120px]">
      <span className="text-sm font-mono text-foreground">
        {remainingStr} <span className="text-muted-foreground">/ {totalStr}</span>
      </span>
      {total !== null && (
        <Progress value={pct} className="h-1.5 mt-1 bg-muted" />
      )}
    </div>
  );
}

type MergedStatus = "启用" | "禁用";

function getMergedStatus(k: ApiKey): MergedStatus {
  if (k.status === "disabled") return "禁用";
  return "启用";
}

// 检查 key 是否过期
function isExpired(k: ApiKey): boolean {
  return !!(k.expires_at && new Date(k.expires_at) < new Date());
}

// 检查 key 是否预算不足
function isBudgetExceeded(k: ApiKey): boolean {
  return !!(k.total_quota !== null && k.used_quota >= k.total_quota);
}

const mergedStatusConfig: Record<MergedStatus, { dot: string; badge: string; label: string }> = {
  "启用":    { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200",   label: "启用" },
  "禁用":    { dot: "bg-red-500",    badge: "bg-transparent text-foreground border-transparent", label: "禁用" },
};

// 可搜索下拉选择组件
interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function SearchableSelect({ options, value, onValueChange, placeholder = "请选择", className = "" }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  // 过滤选项
  const filteredOptions = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-1.5 h-9 px-3 w-full rounded-md border border-border bg-background text-sm text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-background border border-border rounded-md shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索..."
                className="w-full h-8 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">无匹配项</div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                    value === option.value && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function ApiKeys({ enterprise, role }: Props) {
  const { toast } = useToast();
  const phone = getCurrentPhone();

  // 部门模型访问策略允许的模型列表（null = 全部允许）
  const deptAllowedModels = useDeptAllowedModels(enterprise.id);

  // Preview role — defaults to actual role; drives all UI logic
  const [previewRole, setPreviewRole] = useState(role);
  const canSeeOrgTab = previewRole === "admin" || previewRole === "org_admin";

  const [myKeys, setMyKeys] = useState<ApiKey[]>([]);
  const [orgKeys, setOrgKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  // Multi-org switching
  const [organizations, setOrganizations] = useState<{ id: string; name: string; parent_id?: string | null }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  
  // Member's organization (for member role, read-only display)
  const [memberOrg, setMemberOrg] = useState<{ id: string; name: string } | null>(null);

  // Org-tab member filter
  const [orgMembers, setOrgMembers] = useState<{ phone: string; name: string | null }[]>(MOCK_MEMBERS);
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [orgNameFilter, setOrgNameFilter] = useState<string>("all");

  // 部门模型访问策略弹窗
  const [modelPolicyOpen, setModelPolicyOpen] = useState(false);

  // Search state
  const [nameSearch, setNameSearch] = useState("");
  const [apiKeySearch, setApiKeySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  // Pagination
  const [myPage, setMyPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);

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
  const [formGroups, setFormGroups] = useState<string[]>([]);
  const [formGroupMode, setFormGroupMode] = useState<"system" | "custom">("system");
  const [formExpires, setFormExpires] = useState("");
  const [formQuota, setFormQuota] = useState("");
  const [formUnlimited, setFormUnlimited] = useState(true);
  const [formModels, setFormModels] = useState<string[]>([]);
  const [formIpWhitelist, setFormIpWhitelist] = useState("");
  const [formIpEnabled, setFormIpEnabled] = useState(false);
  const [formNeverExpires, setFormNeverExpires] = useState(true);
  const [saving, setSaving] = useState(false);
  // 模型选择：true=跟随分组范围，false=手动勾选
  const [followGroupRange, setFollowGroupRange] = useState(true);
  const [modelSearch, setModelSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [removedModelNotice, setRemovedModelNotice] = useState<string[]>([]);

  // Key template management (admin creates templates, binds to orgs)
  const [tplOpen, setTplOpen] = useState(false);
  const [templates, setTemplates] = useState<KeyTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSelectedId, setTplSelectedId] = useState<string | null>(null);
  const [tplSaving, setTplSaving] = useState(false);
  // editing form state
  const [tplFormName, setTplFormName] = useState("");
  const [tplFormDesc, setTplFormDesc] = useState("");
  const [tplFormGroups, setTplFormGroups] = useState<string[]>([]);
  const [tplFormExpires, setTplFormExpires] = useState("");
  const [tplFormQuota, setTplFormQuota] = useState("");
  const [tplFormUnlimited, setTplFormUnlimited] = useState(true);
  const [tplFormModels, setTplFormModels] = useState<string[]>([]);
  const [tplFollowGroupRange, setTplFollowGroupRange] = useState(true);
  const [tplModelSearch, setTplModelSearch] = useState("");
  const [tplOnlyAvailable, setTplOnlyAvailable] = useState(true);
  const [tplRemovedModelNotice, setTplRemovedModelNotice] = useState<string[]>([]);
  const [tplFormIpWhitelist, setTplFormIpWhitelist] = useState("");
  const [tplFormIpEnabled, setTplFormIpEnabled] = useState(false);
  const [tplFormNeverExpires, setTplFormNeverExpires] = useState(true);
  const [tplCreating, setTplCreating] = useState(false);
  const [tplEditing, setTplEditing] = useState(false);
  const [tplSaveConfirmOpen, setTplSaveConfirmOpen] = useState(false);

  // 绑定部门对话框
  const [bindOpen, setBindOpen] = useState(false);
  const [bindTplId, setBindTplId] = useState<string | null>(null);
  const [bindTplName, setBindTplName] = useState("");
  const [bindOrgs, setBindOrgs] = useState<Set<string>>(new Set());
  const [bindSaving, setBindSaving] = useState(false);

  // Advanced member permissions
  const [advancedPermOpen, setAdvancedPermOpen] = useState(false);
  const [advancedMembers, setAdvancedMembers] = useState<Set<string>>(new Set());
  const [pendingAdvanced, setPendingAdvanced] = useState<Set<string>>(new Set());

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  // User names cache (phone -> name)
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  // User info cache (phone -> { uid, phone })
  const [userInfoMap, setUserInfoMap] = useState<Record<string, { uid: string; phone: string }>>({});

  // Batch create state
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [batchStep, setBatchStep] = useState<1 | 2 | 3>(1);
  const [batchTokenType, setBatchTokenType] = useState<"member" | "dept">("member");
  const [batchQuota, setBatchQuota] = useState("");
  const [batchUnlimited, setBatchUnlimited] = useState(true);
  const [batchExpires, setBatchExpires] = useState("");
  const [batchModels, setBatchModels] = useState<string[]>([]);
  const [batchIpWhitelist, setBatchIpWhitelist] = useState("");
  const [batchMemberList, setBatchMemberList] = useState("");
  const [batchEmailSubject, setBatchEmailSubject] = useState("【AI网关平台】API Key 已分配 - 请安全提取");
  const [batchEmailBody, setBatchEmailBody] = useState(`尊敬的合作伙伴：

您好！

Key 配置信息
令牌类型：成员令牌
使用配额：无限制
有效期至：永不过期

[安全提取令牌]

注意事项：`);
  const [batchSending, setBatchSending] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);
  const [batchCreatedCount, setBatchCreatedCount] = useState(0);

  const fetchMyKeys = useCallback(async () => {
    if (!phone) return;
    setLoading(true);
    // 使用 mock 数据
    const mockData = getMockData();
    const keys = mockData.apiKeys
      .filter(k => k.enterprise_id === enterprise.id && k.user_phone === phone)
      .map(k => ({
        id: k.id,
        name: k.name,
        key_value: k.key,
        status: k.status,
        total_quota: k.monthly_quota,
        used_quota: k.used_quota,
        group_name: k.group_name || null,
        groups: k.groups,
        expires_at: k.expires_at,
        allowed_models: k.models,
        ip_whitelist: null,
        enterprise_id: k.enterprise_id,
        organization_id: null,
        creator_phone: k.user_phone,
        created_at: k.created_at,
      })) as ApiKey[];
    setMyKeys(keys);
    setLoading(false);
  }, [phone, enterprise.id]);

  const fetchOrgKeys = useCallback(async (orgId?: string | null) => {
    if (!canSeeOrgTab) return;
    const targetOrgId = orgId !== undefined ? orgId : selectedOrgId;
    // 使用 mock 数据
    const mockData = getMockData();
    const keys = mockData.apiKeys
      .filter(k => k.enterprise_id === enterprise.id)
      .map(k => ({
        id: k.id,
        name: k.name,
        key_value: k.key,
        status: k.status,
        total_quota: k.monthly_quota,
        used_quota: k.used_quota,
        group_name: k.group_name || null,
        groups: k.groups,
        expires_at: k.expires_at,
        allowed_models: k.models,
        ip_whitelist: null,
        enterprise_id: k.enterprise_id,
        organization_id: null,
        creator_phone: k.user_phone,
        created_at: k.created_at,
      })) as ApiKey[];
    setOrgKeys(keys);
    
    // 构建用户名映射和用户信息映射
    const phones = [...new Set(keys.map(k => k.creator_phone))];
    const nameMap: Record<string, string> = {};
    const infoMap: Record<string, { uid: string; phone: string }> = {};
    phones.forEach(phone => {
      const user = mockData.users.find(u => u.phone === phone);
      nameMap[phone] = user?.name || phone;
      infoMap[phone] = {
        uid: user?.uid || "—",
        phone: phone.slice(0, 3) + "****" + phone.slice(-4),
      };
    });
    setUserNames(nameMap);
    setUserInfoMap(infoMap);
    
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

  // Fetch member's organization (for member role)
  const fetchMemberOrg = useCallback(async () => {
    if (previewRole !== "member" || !phone) return;
    const { data: memberData } = await supabase
      .from("members")
      .select("organization_id")
      .eq("user_phone", phone)
      .eq("enterprise_id", enterprise.id)
      .limit(1);
    if (memberData && memberData[0]?.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", memberData[0].organization_id)
        .single();
      if (orgData) {
        setMemberOrg(orgData);
        setSelectedOrgId(orgData.id);
      }
    }
  }, [previewRole, phone, enterprise.id]);

  useEffect(() => {
    fetchMyKeys();
    fetchOrganizations();
    fetchMemberOrg();
  }, [fetchMyKeys, fetchOrganizations, fetchMemberOrg]);

  const openCreate = async () => {
    setEditingKey(null);
    setFormName("");
    setFormGroupMode("system");
    // 新建个人 Key 使用完整配置表单，默认带入所属部门模板
    let cfg: KeyTemplateConfig = DEFAULT_TEMPLATE_CONFIG;
    try {
      const data = await getMemberKeyTemplate(phone, enterprise.id);
      if (data) cfg = normalizeTplConfig(data);
    } catch (e) {}
    setFormGroups(cfg.groups.length > 0 ? [...cfg.groups] : []);
    setFormExpires(cfg.expires);
    setFormNeverExpires(!cfg.expires);
    setFormQuota("");
    setFormUnlimited(true);
    setFormModels([...cfg.models]);
    setFormIpWhitelist(cfg.ipWhitelist);
    setFormIpEnabled(!!cfg.ipWhitelist.trim());
    setFollowGroupRange(cfg.models.length === 0);
    setModelSearch("");
    setOnlyAvailable(true);
    setRemovedModelNotice([]);
    setSheetOpen(true);
  };

  const openCreateProd = async () => {
    setEditingKey(null);
    setFormName("");
    setFormGroupMode("system");
    setFormBudgetType("monthly");
    setCreatingProd(true);
    // admin/org_admin 在部门 Tab 建 Key：加载所选部门模板
    let cfg: KeyTemplateConfig | null = null;
    if (selectedOrgId) {
      try {
        const data = await getOrgKeyTemplate(selectedOrgId);
        if (data) cfg = normalizeTplConfig(data);
      } catch (e) {}
    }
    if (cfg) {
      setFormGroups(cfg.groups.length > 0 ? [...cfg.groups] : ["生产通道（×0.95）"]);
      setFormExpires(cfg.expires);
      setFormNeverExpires(!cfg.expires);
      setFormQuota("");
      setFormUnlimited(true);
      setFormModels([...cfg.models]);
      setFormIpWhitelist(cfg.ipWhitelist);
      setFormIpEnabled(!!cfg.ipWhitelist.trim());
      setFollowGroupRange(cfg.models.length === 0);
      setModelSearch("");
      setOnlyAvailable(true);
      setRemovedModelNotice([]);
    } else {
      setFormGroups(["生产通道（×0.95）"]);
      setFormExpires("");
      setFormNeverExpires(true);
      setFormQuota("");
      setFormUnlimited(true);
      setFormModels([]);
      setFormIpWhitelist("");
      setFormIpEnabled(false);
      setFollowGroupRange(true);
      setModelSearch("");
      setOnlyAvailable(true);
      setRemovedModelNotice([]);
    }
    setSheetOpen(true);
  };

  const openEdit = (k: ApiKey) => {
    setEditingKey(k);
    setFormName(k.name);
    const existingGroups = k.groups && k.groups.length > 0 ? k.groups : k.group_name ? [k.group_name] : [];
    setFormGroups(existingGroups);
    setFormGroupMode(existingGroups.length > 0 ? "custom" : "system");
    setFormExpires(k.expires_at ? format(new Date(k.expires_at), "yyyy-MM-dd'T'HH:mm") : "");
    setFormNeverExpires(!k.expires_at);
    setFormUnlimited(k.total_quota === null);
    setFormQuota(k.total_quota !== null ? String(k.total_quota) : "");
    setFormModels(k.allowed_models || []);
    setFormIpWhitelist((k.ip_whitelist || []).join("\n"));
    setFormIpEnabled(!!(k.ip_whitelist && k.ip_whitelist.length > 0));
    setFollowGroupRange(!k.allowed_models || k.allowed_models.length === 0);
    setModelSearch("");
    setOnlyAvailable(true);
    setRemovedModelNotice([]);
    // 企业模式下所有角色编辑个人Key都只改名称
    if (activeTab === "my") {
      setSimpleDialogOpen(true);
    } else {
      // 部门/企业Tab编辑时用完整表单
      setSheetOpen(true);
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || !phone) return;
    setSaving(true);
    const commonPayload = {
      p_phone: phone,
      p_name: formName.trim(),
      p_group_name: formGroupMode === "custom" && formGroups.length > 0 ? formGroups[0] : null,
      p_expires_at: formNeverExpires ? null : (formExpires ? new Date(formExpires).toISOString() : null),
      p_total_quota: formUnlimited ? null : (parseFloat(formQuota) || 0),
      p_allowed_models: followGroupRange ? null : (formModels.length > 0 ? formModels : null),
      p_ip_whitelist: formIpEnabled && formIpWhitelist.trim()
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
        if (creatingProd) { setCreatingProd(false); }
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
        if (creatingProd) { setCreatingProd(false); }
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

  const setQuickExpiryTpl = (offset: number | null) => {
    if (offset === null) { setTplFormExpires(""); return; }
    const d = new Date(Date.now() + offset);
    setTplFormExpires(format(d, "yyyy-MM-dd'T'HH:mm"));
  };

  const normalizeTplConfig = (raw: any): KeyTemplateConfig => ({
    groups: Array.isArray(raw?.groups) ? raw.groups : [],
    expires: typeof raw?.expires === "string" ? raw.expires : "",
    quota: typeof raw?.quota === "string" ? raw.quota : raw?.quota != null ? String(raw.quota) : "",
    unlimited: typeof raw?.unlimited === "boolean" ? raw.unlimited : true,
    models: Array.isArray(raw?.models) ? raw.models : [],
    ipWhitelist: typeof raw?.ipWhitelist === "string" ? raw.ipWhitelist : "",
  });

  const fetchTemplates = useCallback(async (): Promise<KeyTemplate[]> => {
    setTplLoading(true);
    try {
      const data = await listKeyTemplates(enterprise.id);
      const list: KeyTemplate[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        config: normalizeTplConfig(r.config),
        created_at: r.created_at,
        updated_at: r.updated_at,
        bound_orgs: Number(r.bound_orgs) || 0,
      }));
      setTemplates(list);
      setTplLoading(false);
      return list;
    } catch (e: any) {
      toast({ title: "加载模板失败", description: e.message, variant: "destructive" });
      setTplLoading(false);
      return [];
    }
  }, [enterprise.id, toast]);

  const selectTpl = (tpl: KeyTemplate | null) => {
    setTplEditing(false);
    if (!tpl) {
      setTplSelectedId(null);
      setTplFormName("");
      setTplFormDesc("");
      setTplFormGroups([]);
      setTplFormExpires("");
      setTplFormNeverExpires(true);
      setTplFormQuota("");
      setTplFormUnlimited(true);
      setTplFormModels([]);
      setTplFollowGroupRange(true);
      setTplModelSearch("");
      setTplOnlyAvailable(true);
      setTplFormIpWhitelist("");
      setTplFormIpEnabled(false);
      return;
    }
    setTplSelectedId(tpl.id);
    setTplFormName(tpl.name);
    setTplFormDesc(tpl.description || "");
    setTplFormGroups([...tpl.config.groups]);
    setTplFormExpires(tpl.config.expires);
    setTplFormNeverExpires(!tpl.config.expires);
    setTplFormQuota(tpl.config.quota);
    setTplFormUnlimited(tpl.config.unlimited);
    setTplFormModels([...tpl.config.models]);
    setTplFollowGroupRange(tpl.config.models.length === 0);
    setTplModelSearch("");
    setTplOnlyAvailable(true);
    setTplFormIpWhitelist(tpl.config.ipWhitelist);
    setTplFormIpEnabled(!!tpl.config.ipWhitelist.trim());
  };

  // 打开模板管理：加载模板列表 + 带 key_template_id 的部门列表
  const [orgsWithTpl, setOrgsWithTpl] = useState<{ id: string; name: string; key_template_id: string | null }[]>([]);

  const openTplManager = async () => {
    setTplOpen(true);
    setTplEditing(false);
    setTplCreating(false);
    const [tplList, orgs] = await Promise.all([
      fetchTemplates(),
      getOrgsWithTemplate(enterprise.id),
    ]);
    setOrgsWithTpl(orgs as any);
    if (tplList.length > 0) {
      // 仅选中第一个，不自动进入编辑态
      setTplSelectedId(tplList[0].id);
    } else {
      selectTpl(null);
    }
  };

  const loadTplIntoForm = (tpl: KeyTemplate) => {
    setTplCreating(false);
    setTplSelectedId(tpl.id);
    setTplFormName(tpl.name);
    setTplFormDesc(tpl.description || "");
    setTplFormGroups([...tpl.config.groups]);
    setTplFormExpires(tpl.config.expires);
    setTplFormNeverExpires(!tpl.config.expires);
    setTplFormQuota(tpl.config.quota);
    setTplFormUnlimited(tpl.config.unlimited);
    setTplFormModels([...tpl.config.models]);
    setTplFollowGroupRange(tpl.config.models.length === 0);
    setTplModelSearch("");
    setTplOnlyAvailable(true);
    setTplFormIpWhitelist(tpl.config.ipWhitelist);
    setTplFormIpEnabled(!!tpl.config.ipWhitelist.trim());
  };

  // 点击模板项：仅选中查看，不进入编辑态
  const selectTplItem = (tpl: KeyTemplate) => {
    setTplEditing(false);
    setTplCreating(false);
    setTplSelectedId(tpl.id);
  };

  // 点击编辑按钮：进入编辑态
  const openTplEdit = (tpl: KeyTemplate) => {
    loadTplIntoForm(tpl);
    setTplEditing(true);
  };

  // 一键复制模板
  const handleTplCopy = async (tpl: KeyTemplate) => {
    try {
      await copyKeyTemplate(tpl.id);
      toast({ title: "已复制", description: `已复制模板「${tpl.name}」` });
      const [list, orgs] = await Promise.all([
        fetchTemplates(),
        getOrgsWithTemplate(enterprise.id),
      ]);
      setOrgsWithTpl(orgs as any);
      // 选中刚复制的副本（列表最后一条）
      if (list.length > 0) {
        const copied = list[list.length - 1];
        setTplSelectedId(copied.id);
      }
    } catch (e: any) {
      toast({ title: "复制失败", description: e.message, variant: "destructive" });
    }
  };

  // 打开绑定部门对话框
  const openBindDialog = (tpl: KeyTemplate) => {
    setBindTplId(tpl.id);
    setBindTplName(tpl.name);
    const bound = new Set<string>();
    orgsWithTpl.forEach(o => { if (o.key_template_id === tpl.id) bound.add(o.id); });
    setBindOrgs(bound);
    setBindOpen(true);
  };

  const handleBindSave = async () => {
    if (!bindTplId) return;
    setBindSaving(true);
    try {
      // 读取当前模板的 config 保持不变，只更新绑定
      const tpl = templates.find(t => t.id === bindTplId);
      if (!tpl) throw new Error("模板不存在");
      const boundOrgIds = Array.from(bindOrgs);
      await updateKeyTemplate({
        id: bindTplId,
        name: tpl.name,
        description: tpl.description || null,
        config: tpl.config,
        bound_org_ids: boundOrgIds.length > 0 ? boundOrgIds : null,
      });
      toast({ title: "绑定已更新" });
      const [list, orgs] = await Promise.all([
        fetchTemplates(),
        getOrgsWithTemplate(enterprise.id),
      ]);
      setOrgsWithTpl(orgs as any);
      setBindOpen(false);
    } catch (e: any) {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
    }
    setBindSaving(false);
  };

  const handleTplNew = () => {
    selectTpl(null);
    setTplCreating(true);
    setTplEditing(false);
  };

  const handleTplDelete = async (tpl: KeyTemplate) => {
    if (tpl.bound_orgs > 0) {
      toast({ title: "无法删除", description: `该模板已被 ${tpl.bound_orgs} 个部门绑定，请先在「应用到部门」中解绑后再删除。`, variant: "destructive" });
      return;
    }
    if (!confirm(`确定删除模板「${tpl.name}」？`)) return;
    try {
      await deleteKeyTemplate(tpl.id);
      toast({ title: "已删除" });
      const [list, orgs] = await Promise.all([
        fetchTemplates(),
        getOrgsWithTemplate(enterprise.id),
      ]);
      setOrgsWithTpl(orgs as any);
      if (list.length > 0) {
        setTplSelectedId(list[0].id);
      } else {
        selectTpl(null);
      }
    } catch (e: any) {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
    }
  };

  const doTplSave = async () => {
    if (!tplFormName.trim()) {
      toast({ title: "请填写模板名称", variant: "destructive" });
      return;
    }
    setTplSaving(true);
    const config = {
      groups: tplFormGroups,
      expires: tplFormNeverExpires ? "" : tplFormExpires,
      quota: "",
      unlimited: true,
      models: tplFollowGroupRange ? [] : tplFormModels,
      ipWhitelist: tplFormIpEnabled ? tplFormIpWhitelist : "",
    };
    try {
      let savedId = tplSelectedId;
      if (tplSelectedId) {
        // 更新时保留原有绑定
        const existing = templates.find(t => t.id === tplSelectedId);
        const existingBoundIds = orgsWithTpl.filter(o => o.key_template_id === tplSelectedId).map(o => o.id);
        await updateKeyTemplate({
          id: tplSelectedId,
          name: tplFormName.trim(),
          description: tplFormDesc.trim() || null,
          config,
          bound_org_ids: existingBoundIds.length > 0 ? existingBoundIds : null,
        });
      } else {
        const created = await createKeyTemplate({
          enterprise_id: enterprise.id,
          name: tplFormName.trim(),
          description: tplFormDesc.trim() || null,
          config,
          bound_org_ids: null,
          created_by: phone,
        });
        savedId = (created as any).id;
      }
      toast({ title: tplSelectedId ? "保存成功" : "创建成功" });
      const [list, orgs] = await Promise.all([
        fetchTemplates(),
        getOrgsWithTemplate(enterprise.id),
      ]);
      setOrgsWithTpl(orgs as any);
      const saved = list.find(t => t.id === savedId);
      if (saved) {
        setTplSelectedId(saved.id);
      }
      // 保存后退出编辑/新建态，回到选中查看
      setTplEditing(false);
      setTplCreating(false);
    } catch (e: any) {
      toast({ title: tplSelectedId ? "保存失败" : "创建失败", description: e.message, variant: "destructive" });
    }
    setTplSaving(false);
  };

  const handleTplSave = () => {
    if (!tplFormName.trim()) {
      toast({ title: "请填写模板名称", variant: "destructive" });
      return;
    }
    // 更新已有模板且有绑定部门时，弹确认提示影响范围
    if (tplSelectedId) {
      const tpl = templates.find(t => t.id === tplSelectedId);
      if (tpl && tpl.bound_orgs > 0) {
        setTplSaveConfirmOpen(true);
        return;
      }
    }
    doTplSave();
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
    const colSpan = 8 + ((showOrg || showCreator) ? 1 : 0) + (showCreator ? 2 : 0);

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
                        <DropdownMenuCheckboxItem checked={statusFilter === "启用"} onCheckedChange={() => setStatusFilter("启用")}>启用</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === "禁用"} onCheckedChange={() => setStatusFilter("禁用")}>禁用</DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                <TableHead className="font-medium">剩余额度/总额度</TableHead>
                {/* 部门列：企业管理员视角优先使用showOrg，否则使用showCreator */}
                {showOrg ? <TableHead className="font-medium">部门</TableHead> : (showCreator && <TableHead className="font-medium">部门</TableHead>)}
                {showCreator && <TableHead className="font-medium">成员</TableHead>}
                {showCreator && <TableHead className="font-medium">分类</TableHead>}
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
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${msCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${msCfg.dot}`} />
                          {ms}
                        </span>
                        {/* 过期标签 */}
                        {isExpired(k) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 border border-red-200">
                            已过期
                          </span>
                        )}
                        {/* 预算不足标签 */}
                        {!isExpired(k) && isBudgetExceeded(k) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-600 border border-orange-200">
                            预算不足
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {/* 剩余额度/总额度 */}
                    <TableCell>{formatQuota(k.used_quota, k.total_quota)}</TableCell>
                    {/* 部门列：企业管理员视角优先使用showOrg，否则使用showCreator */}
                    {showOrg ? (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {organizations.find(o => o.id === k.organization_id)?.name ?? "—"}
                        </span>
                      </TableCell>
                    ) : (showCreator && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {organizations.find(o => o.id === k.organization_id)?.name ?? "—"}
                        </span>
                      </TableCell>
                    ))}
                    {/* 成员（仅组织Tab） */}
                    {showCreator && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground cursor-pointer">
                                  {userNames[k.creator_phone] || k.creator_phone}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1 p-1 text-sm text-gray-500">
                                  <p>UID：{userInfoMap[k.creator_phone]?.uid?.replace("UID:", "") || "—"}</p>
                                  <p>手机号：{userInfoMap[k.creator_phone]?.phone || k.creator_phone}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {/* 第一个 key 显示批量分发标签（假数据演示） */}
                          {k === paged[0] && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors">
                                    <Mail className="w-3 h-3" />
                                    批量分发
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-2 p-1">
                                    <p className="font-medium text-foreground">批量分发信息</p>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <p>分发邮箱：zhangsan@company.com</p>
                                      <p>备注名：张三</p>
                                      <p className="text-xs text-muted-foreground/70">通过批量创建功能分发</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {/* 分类（仅组织Tab，企业管理员视角） */}
                    {showCreator && (
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            k === paged[0] 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-green-50 text-green-700 border-green-200"
                          )}
                        >
                          {k === paged[0] ? "成员类" : "业务类"}
                        </Badge>
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
                        ? deptAllowedModels === null
                          ? <Badge variant="outline" className="text-xs font-normal">无限制</Badge>
                          : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className="cursor-help border-amber-300 bg-amber-50 text-xs font-normal text-amber-700"
                                    >
                                      无限制
                                    </Badge>
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="max-w-sm p-2">
                                  <div className="min-w-48 space-y-1">
                                    <p className="mb-1.5 flex items-center gap-1 border-b border-border pb-1.5 text-xs font-medium text-amber-600">
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      部分模型受部门权限限制
                                    </p>
                                    {deptAllowedModels.map((model) => (
                                      <div key={model} className="flex items-center gap-1.5 text-xs text-foreground">
                                        <span>{model}</span>
                                      </div>
                                    ))}
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <span>其他模型不可用</span>
                                      <Lock className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        : (() => {
                            const restrictedModels = deptAllowedModels === null
                              ? []
                              : (k.allowed_models ?? []).filter((model) => !deptAllowedModels.includes(model));
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex items-center gap-1">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "cursor-help text-xs font-normal",
                                          restrictedModels.length > 0
                                            ? "border-amber-300 bg-amber-50 text-amber-700"
                                            : "border-blue-300 bg-blue-50 text-blue-600",
                                        )}
                                      >
                                        {k.allowed_models.length} 个模型
                                      </Badge>
                                      {restrictedModels.length > 0 && (
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="start" className="max-w-sm p-2">
                                    <div className="min-w-48 space-y-1">
                                      {restrictedModels.length > 0 && (
                                        <p className="mb-1.5 flex items-center gap-1 border-b border-border pb-1.5 text-xs font-medium text-amber-600">
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          部分模型受部门权限限制
                                        </p>
                                      )}
                                      {k.allowed_models.map((model) => {
                                        const allowed = deptAllowedModels === null || deptAllowedModels.includes(model);
                                        return (
                                          <div
                                            key={model}
                                            className={cn(
                                              "flex items-center gap-1.5 text-xs",
                                              allowed ? "text-foreground" : "text-muted-foreground",
                                            )}
                                          >
                                            <span>{model}</span>
                                            {!allowed && <Lock className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()
                      }
                    </TableCell>
                    <TableCell>
                      {k.expires_at ? (
                        <span className={cn(
                          "text-sm",
                          new Date(k.expires_at) < new Date() ? "text-destructive font-medium" : "text-muted-foreground"
                        )}>
                          {format(new Date(k.expires_at), "yyyy-MM-dd HH:mm")}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">永不过期</span>
                      )}
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
            {previewRole === "admin" && (
              <button
                onClick={() => { setActiveTab("dept"); if (selectedOrgId) fetchOrgKeys(); }}
                className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                  activeTab === "dept"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                部门 API Key
              </button>
            )}
            {previewRole === "admin" && (
              <button
                onClick={() => { setActiveTab("org"); fetchOrgKeys(null); }}
                className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                  activeTab === "org"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                企业 API Key
              </button>
            )}
            {previewRole === "org_admin" && (
              <button
                onClick={() => { setActiveTab("prod"); if (selectedOrgId) fetchOrgKeys(); }}
                className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
                  activeTab === "prod"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                部门 API Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* 行3：创建按钮 + 搜索栏+刷新（右） */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* org_admin 在部门 API Key Tab 下 或 admin 在部门 API Key Tab 下：显示创建按钮、批量创建 */}
          {((previewRole === "org_admin" && activeTab === "prod") || (previewRole === "admin" && activeTab === "dept")) ? (
              <>
              <Button
                onClick={openCreateProd}
                className="gap-2 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />创建业务 API Key
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-9"
                onClick={() => {
                  setBatchStep(1);
                  setBatchTokenType("member");
                  setBatchQuota("");
                  setBatchUnlimited(true);
                  setBatchExpires("");
                  setBatchModels([]);
                  setBatchIpWhitelist("");
                  setBatchMemberList("");
                  setBatchSuccess(false);
                  setBatchCreatedCount(0);
                  setBatchCreateOpen(true);
                }}
              >
                <Users className="w-4 h-4" />批量创建
              </Button>
              {previewRole === "admin" && activeTab === "dept" && (
                <Button
                  variant="outline"
                  className="gap-2 h-9"
                  onClick={openTplManager}
                >
                  <Settings className="w-4 h-4" />配置 API Key 模板
                </Button>
              )}
              {/* 归属部门选择 - 放在批量创建按钮右侧 */}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-muted-foreground">归属部门：</span>
                <OrgTreeSelect
                  orgs={organizations}
                  value={selectedOrgId ?? ""}
                  onValueChange={(val) => {
                    setSelectedOrgId(val);
                  }}
                  showAll={false}
                  placeholder="选择部门..."
                  triggerClassName="w-40 shadow-sm text-sm"
                />
              </div>
            </>
          ) : previewRole === "admin" && activeTab === "org" ? (
            <>
              <Button
                variant="outline"
                className="gap-2 h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => setModelPolicyOpen(true)}
              >
                <ShieldCheck className="w-4 h-4" />模型权限配置
              </Button>
            </>
          ) : (
            <>
              <Button onClick={openCreate} className="gap-2 h-9">
                <Plus className="w-4 h-4" />创建 API Key
              </Button>
              {/* 普通成员显示只读归属部门 */}
              {previewRole === "member" && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-muted-foreground">归属部门：</span>
                  <span className="text-sm font-medium text-foreground">{memberOrg?.name ?? "研发一组"}</span>
                </div>
              )}
              {/* 管理员在"我的 API Key" tab 下显示归属部门选择 */}
              {activeTab === "my" && previewRole !== "member" && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-muted-foreground">归属部门：</span>
                  <OrgTreeSelect
                    orgs={organizations}
                    value={selectedOrgId ?? "all"}
                    onValueChange={(val) => {
                      setSelectedOrgId(val === "all" ? null : val);
                    }}
                    showAll={true}
                    allLabel="默认组织"
                    placeholder="选择部门..."
                    triggerClassName="w-40 shadow-sm text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 企业管理员在"企业 API Key" tab 下显示部门和成员快速筛选 */}
          {previewRole === "admin" && activeTab === "org" && (
            <>
              {/* 部门筛选 - 可搜索下拉模式 */}
              <div className="relative">
                <SearchableSelect
                  options={[
                    { value: "all", label: "全部部门" },
                    ...organizations.map(o => ({ value: o.id, label: o.name }))
                  ]}
                  value={orgNameFilter}
                  onValueChange={setOrgNameFilter}
                  placeholder="全部部门"
                  className="w-28"
                />
              </div>
              {/* 成员筛选 - 可搜索下拉模式 */}
              <div className="relative">
                <SearchableSelect
                  options={[
                    { value: "all", label: "全部成员" },
                    ...orgMembers.map(m => ({
                      value: m.phone,
                      label: m.name ? `${m.name} (${maskPhone(m.phone)})` : maskPhone(m.phone)
                    }))
                  ]}
                  value={memberFilter}
                  onValueChange={setMemberFilter}
                  placeholder="全部成员"
                  className="w-28"
                />
              </div>
            </>
          )}
          {/* 企业管理员在"部门 API Key" tab 下显示成员筛选 */}
          {previewRole === "admin" && activeTab === "dept" && (
            <div className="relative">
              <SearchableSelect
                options={[
                  { value: "all", label: "全部成员" },
                  ...orgMembers.map(m => ({
                    value: m.phone,
                    label: m.name ? `${m.name} (${maskPhone(m.phone)})` : maskPhone(m.phone)
                  }))
                ]}
                value={memberFilter}
                onValueChange={setMemberFilter}
                placeholder="全部成员"
                className="w-28"
              />
            </div>
          )}
          {/* 部门管理员在"部门 API Key" tab 下显示成员筛选 */}
          {previewRole === "org_admin" && activeTab === "prod" && (
            <div className="relative">
              <SearchableSelect
                options={[
                  { value: "all", label: "全部成员" },
                  ...orgMembers.map(m => ({
                    value: m.phone,
                    label: m.name ? `${m.name} (${maskPhone(m.phone)})` : maskPhone(m.phone)
                  }))
                ]}
                value={memberFilter}
                onValueChange={setMemberFilter}
                placeholder="全部成员"
                className="w-28"
              />
            </div>
          )}
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
            onClick={() => {
              if (activeTab === "my") {
                fetchMyKeys();
              } else {
                fetchOrgKeys();
              }
            }}
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
        {/* 部门管理员视角：部门 API Key (prod) -> orgKeys */}
        {previewRole === "org_admin" && activeTab === "prod" && (
          <KeyTable
            keys={orgKeys}
            filterFn={(keys) => filterKeys(keys, true)}
            showCreator={true}
            showOrg={false}
            page={orgPage}
            setPage={setOrgPage}
          />
        )}
        {/* 企业管理员视角：部门 API Key (dept) -> orgKeys */}
        {previewRole === "admin" && activeTab === "dept" && (
          <KeyTable
            keys={orgKeys}
            filterFn={(keys) => filterKeys(keys, true)}
            showCreator={true}
            showOrg={false}
            page={orgPage}
            setPage={setOrgPage}
          />
        )}
        {/* 企业管理员视角：企业 API Key (org) -> orgKeys */}
        {previewRole === "admin" && activeTab === "org" && (
          <KeyTable
            keys={orgKeys}
            filterFn={(keys) => filterKeys(keys, true)}
            showCreator={true}
            showOrg={true}
            page={orgPage}
            setPage={setOrgPage}
          />
        )}
      </div>


      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setCreatingProd(false); }}>
        <SheetContent className="!w-[640px] !max-w-[640px] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle>{editingKey ? "编辑 API Key" : "创建 API Key"}</SheetTitle>
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
              </div>
            </div>

            {/* 额度设置 — 普通成员编辑时隐藏 */}
            {!(previewRole === "member" && editingKey) && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">额度设置</h3>
              <div className="space-y-3">
                {/* Key 额度上限 — 生产 Key 创建时突出显示 */}
                {creatingProd && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-bold text-foreground">Key 额度上限</span>
                      <span className="text-destructive text-sm">*</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-24 shrink-0 flex items-center justify-center rounded-md border border-input bg-muted/40 text-sm text-muted-foreground cursor-not-allowed">
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
                    <p className="text-xs text-primary/70">此额度直接占用本部门整体额度，不关联具体成员。</p>
                  </div>
                )}
                {/* 额度上限（非生产Key时正常显示） */}
                {!creatingProd && (
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-right text-muted-foreground text-sm">金额</Label>
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
                    <Label className="text-right text-muted-foreground text-sm">无限额度</Label>
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
                <div className="space-y-2">
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label className="text-right text-muted-foreground text-sm">
                      模型可用范围
                      {!followGroupRange && <span className="ml-1 text-xs">（已选 {formModels.length} 个）</span>}
                    </Label>
                    <div className="flex items-center gap-3 min-w-0">
                      <label className="order-2 ml-auto flex items-center gap-2 shrink-0">
                        <input
                          type="checkbox"
                          checked={followGroupRange}
                          onChange={(e) => {
                            const useAllAvailable = e.target.checked;
                            setFollowGroupRange(useAllAvailable);
                            if (!useAllAvailable && formModels.length === 0) {
                              setFormModels(MODELS.filter((model) =>
                                (deptAllowedModels === null || deptAllowedModels.includes(model)) &&
                                (formGroups.length === 0 || isModelInGroups(model, formGroups))
                              ));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">全部模型</span>
                      </label>
                      <div className="order-1 relative w-52">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="搜索模型..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    </div>
                    {(() => {
                      const backendAvailableModels = MODELS.filter((model) =>
                        (deptAllowedModels === null || deptAllowedModels.includes(model)) &&
                        (formGroups.length === 0 || isModelInGroups(model, formGroups))
                      );
                      const filteredModels = backendAvailableModels.filter((model) =>
                        model.toLowerCase().includes(modelSearch.trim().toLowerCase())
                      );
                      return (
                        <>
                          {/* 模型网格 */}
                          <div className="ml-[112px] rounded-md border border-input p-3 space-y-2">
                            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-auto">
                              {filteredModels.length === 0 ? (
                                <div className="col-span-3 py-4 text-center text-xs text-muted-foreground">
                                  {modelSearch.trim() ? "未找到匹配的模型" : "后台暂未配置可用模型"}
                                </div>
                              ) : filteredModels.map((model) => {
                                const checked = followGroupRange || formModels.includes(model);
                                const disabled = followGroupRange;
                                return (
                                  <TooltipProvider key={model}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <label
                                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
                                            disabled
                                              ? "border-muted bg-muted/30 text-muted-foreground"
                                              : "border-input bg-background"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabled}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setFormModels([...formModels, model]);
                                              } else {
                                                setFormModels(formModels.filter(m => m !== model));
                                              }
                                            }}
                                            className="rounded border-gray-300"
                                          />
                                          <span className="truncate">{model}</span>
                                        </label>
                                      </TooltipTrigger>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                </div>
                {/* 过期时间 */}
                {!(previewRole === "member" && editingKey) && (
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                    <Label className="text-right text-muted-foreground text-sm pt-2.5">
                      过期时间
                    </Label>
                    <div className="space-y-2 pt-2">
                      <Switch
                        checked={!formNeverExpires}
                        onCheckedChange={(checked) => {
                          setFormNeverExpires(!checked);
                          if (checked && !formExpires) {
                            setQuickExpiry(30 * 24 * 60 * 60 * 1000);
                          }
                          if (!checked) {
                            setFormExpires("");
                          }
                        }}
                      />
                      {!formNeverExpires && (
                        <>
                          <Input type="datetime-local" value={formExpires} onChange={e => setFormExpires(e.target.value)} />
                          <div className="flex gap-2 flex-wrap">
                            {[
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
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* IP 白名单 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">IP 白名单</Label>
                  <div className="space-y-2 pt-2">
                    <Switch
                      checked={formIpEnabled}
                      onCheckedChange={setFormIpEnabled}
                    />
                    {formIpEnabled && (
                      <textarea
                        placeholder={"一行一个 IP，支持 CIDR\n例如：\n192.168.1.1\n10.0.0.0/8"}
                        value={formIpWhitelist}
                        onChange={e => setFormIpWhitelist(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* 企业模式高级设置：个人模式使用独立 PersonalApiKeys 表单，不展示此入口 */}
            {!(previewRole === "member" && editingKey) && (
              <div className="space-y-4">
                <div className="mb-4 pb-2 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">高级设置</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">
                    资源配置
                  </Label>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setFormGroupMode("system")}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <span className={cn(
                          "h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-colors",
                          formGroupMode === "system" ? "border-primary" : "border-muted-foreground/50"
                        )}>
                          {formGroupMode === "system" && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        跟随平台默认配置
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormGroupMode("custom")}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <span className={cn(
                          "h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-colors",
                          formGroupMode === "custom" ? "border-primary" : "border-muted-foreground/50"
                        )}>
                          {formGroupMode === "custom" && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        自定义资源
                      </button>
                    </div>

                    {formGroupMode === "system" ? (
                      <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                        <span>使用全部可用资源，后台新增资源后自动生效。同一模型存在多个可用资源时按默认优先级调用，如需指定请选自定义资源。</span>
                      </p>
                    ) : (
                      <>
                        <GroupMultiSelect
                          groups={GROUP_OPTIONS}
                          selected={formGroups}
                          onChange={setFormGroups}
                          placeholder="请选择至少一个资源"
                        />
                        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                          <span>可自定义选择一个或多个可用资源，并设置调用优先级；未设置时，按后台默认优先级调用。</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部固定按钮 */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
            <Button variant="outline" className="w-24" onClick={() => setSheetOpen(false)} disabled={saving}>取消</Button>
            <Button className="w-24" onClick={handleSave} disabled={saving || !formName.trim() || (!followGroupRange && formModels.length === 0) || (formGroupMode === "custom" && formGroups.length === 0)}>
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

      {/* Simple create Sheet for member role */}
      <Sheet open={simpleDialogOpen} onOpenChange={open => { setSimpleDialogOpen(open); if (!open) setFormName(""); }}>
        <SheetContent className="!w-[640px] !max-w-[640px] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle>{editingKey ? "编辑 API Key" : "新增 API Key"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
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
            {/* 额度设置 */}
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">额度上限</Label>
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch checked={formUnlimited} onCheckedChange={setFormUnlimited} />
                  <span className="text-xs text-muted-foreground">无限</span>
                </div>
              </div>
            </div>
          </div>
          {/* 底部固定按钮 */}
          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
            <Button variant="outline" className="w-24" onClick={() => { setSimpleDialogOpen(false); setFormName(""); }} disabled={saving}>取消</Button>
            <Button className="w-24" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "保存中..." : "确定"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Key Template Manager Sheet */}
      <Sheet open={tplOpen} onOpenChange={setTplOpen}>
        <SheetContent className="!w-[720px] !max-w-[720px] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <SheetTitle>配置 API Key 模板</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* 提示语 */}
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-primary/80">
                创建模板并绑定到部门后，该部门内所有成员创建的 Key 权限将自动套用模板配置，立即生效。
                <span className="text-red-600 font-medium">未绑定模板的部门不进行额外限制（全部模型、不限 IP、永不过期）。</span>
              </p>
            </div>

            {/* 模板列表 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">模板列表</h3>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleTplNew}>
                  <Plus className="w-3.5 h-3.5" />新建模板
                </Button>
              </div>
              <div className="space-y-1.5">
                {tplLoading && <p className="text-xs text-muted-foreground py-2">加载中...</p>}
                {!tplLoading && templates.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">暂无模板，点击「新建模板」创建。</p>
                )}
                {templates.map(t => {
                  const selected = t.id === tplSelectedId;
                  const boundOrgNames = orgsWithTpl.filter(o => o.key_template_id === t.id).map(o => o.name);
                  return (
                    <div
                      key={t.id}
                      onClick={() => selectTplItem(t)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md border cursor-pointer transition-colors",
                        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{t.name}</span>
                          {t.bound_orgs > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t.bound_orgs} 个部门</Badge>
                          )}
                        </div>
                        {boundOrgNames.length > 0 && (
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                            <span className="text-muted-foreground/60">已绑定：</span>{boundOrgNames.join("、")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openBindDialog(t); }}
                          className="px-2 py-1 text-xs rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          应用到部门
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTplCopy(t); }}
                          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="复制"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTplDelete(t); }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 编辑表单 */}
            {(tplEditing || tplCreating) ? (
              <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{tplCreating ? "新建模板" : "编辑模板"}</h3>
                </div>
                {/* 模板名称 + 描述 */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5"><span className="text-destructive mr-0.5">*</span>模板名称</Label>
                  <Input value={tplFormName} onChange={e => setTplFormName(e.target.value)} placeholder="如：研发部模板" />
                </div>
                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="text-right text-muted-foreground text-sm pt-2.5">描述</Label>
                  <Input value={tplFormDesc} onChange={e => setTplFormDesc(e.target.value)} placeholder="可选描述" />
                </div>

                {/* 基本信息 */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">基本信息</h3>
                  <div className="space-y-3" />
                </div>

                {/* 访问限制 */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">访问限制</h3>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Label className="text-muted-foreground text-sm shrink-0">
                          模型可用范围
                          <span className="ml-1 text-xs">（已选 {tplFollowGroupRange ? MODELS.length : tplFormModels.length} 个）</span>
                        </Label>
                        <label className="flex items-center gap-2 shrink-0">
                          <input
                            type="checkbox"
                            checked={tplFollowGroupRange}
                            onChange={(e) => setTplFollowGroupRange(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">全部模型</span>
                        </label>
                        </div>
                        {(() => {
                          const filteredModels = MODELS.filter(m =>
                            m.toLowerCase().includes(tplModelSearch.toLowerCase())
                          );
                          return (
                            <>
                              {tplRemovedModelNotice.length > 0 && (
                                <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                  可用范围已变化，已自动移除：{tplRemovedModelNotice.join("、")}
                                </div>
                              )}
                              {/* 模型网格 */}
                              <div className="rounded-md border border-input p-3 space-y-2">
                                <div className="relative pb-2 border-b border-border/50">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <input
                                    type="text"
                                    placeholder="搜索模型..."
                                    value={tplModelSearch}
                                    onChange={(e) => setTplModelSearch(e.target.value)}
                                    className="w-full h-8 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-auto">
                                  {filteredModels.length === 0 ? (
                                    <div className="col-span-3 py-4 text-center text-xs text-muted-foreground">
                                      {tplModelSearch.trim()
                                        ? "未找到匹配的模型"
                                        : "暂无可用模型"}
                                    </div>
                                  ) : filteredModels.map((model) => {
                                    const checked = tplFollowGroupRange || tplFormModels.includes(model);
                                    return (
                                      <label
                                        key={model}
                                        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-input bg-background"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={tplFollowGroupRange}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setTplFormModels([...tplFormModels, model]);
                                            } else {
                                              setTplFormModels(tplFormModels.filter(m => m !== model));
                                            }
                                          }}
                                          className="rounded border-gray-300"
                                        />
                                        <span className="truncate">{model}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <p className="text-xs text-muted-foreground pt-1.5 border-t border-border/50">使用该 API Key 发起调用时，仅支持访问已勾选的模型</p>
                              </div>
                            </>
                          );
                        })()}
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                      <Label className="text-right text-muted-foreground text-sm pt-2.5">过期时间</Label>
                      <div className="space-y-2 pt-2">
                        <Switch
                          checked={!tplFormNeverExpires}
                          onCheckedChange={(checked) => {
                            setTplFormNeverExpires(!checked);
                            if (checked && !tplFormExpires) {
                              setQuickExpiryTpl(30 * 24 * 60 * 60 * 1000);
                            }
                            if (!checked) {
                              setTplFormExpires("");
                            }
                          }}
                        />
                        {!tplFormNeverExpires && (
                          <>
                            <Input type="datetime-local" value={tplFormExpires} onChange={e => setTplFormExpires(e.target.value)} />
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { label: "一个月", offset: 30 * 24 * 60 * 60 * 1000 },
                                { label: "一天", offset: 24 * 60 * 60 * 1000 },
                                { label: "一小时", offset: 60 * 60 * 1000 },
                              ].map(({ label, offset }) => (
                                <button
                                  key={label}
                                  onClick={() => setQuickExpiryTpl(offset)}
                                  className="px-3 py-1 text-xs rounded-full border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                      <Label className="text-right text-muted-foreground text-sm pt-2.5">IP 白名单</Label>
                      <div className="space-y-2 pt-2">
                        <Switch
                          checked={tplFormIpEnabled}
                          onCheckedChange={setTplFormIpEnabled}
                        />
                        {tplFormIpEnabled && (
                          <textarea
                            placeholder={"一行一个 IP，支持 CIDR\n例如：\n192.168.1.1\n10.0.0.0/8"}
                            value={tplFormIpWhitelist}
                            onChange={e => setTplFormIpWhitelist(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : tplSelectedId ? (() => {
              const tpl = templates.find(t => t.id === tplSelectedId);
              if (!tpl) return null;
              return (
                <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{tpl.name}</h3>
                      {tpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => openTplEdit(tpl)}>
                      <Pencil className="w-3.5 h-3.5" />编辑
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">过期时间</span>
                      <p className="text-sm text-foreground mt-0.5">{tpl.config.expires ? tpl.config.expires.replace("T", " ") : "永不过期"}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">模型限制</span>
                    <p className="text-sm text-foreground mt-0.5">{tpl.config.models.length > 0 ? tpl.config.models.join("、") : "所有模型"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">IP 白名单</span>
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{tpl.config.ipWhitelist ? tpl.config.ipWhitelist : "不限制"}</p>
                  </div>
                </div>
              );
            })() : null}
          </div>

          <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
            {(tplEditing || tplCreating) ? (
              <>
                <Button variant="outline" className="w-24" onClick={() => { setTplEditing(false); setTplCreating(false); }} disabled={tplSaving}>取消</Button>
                <Button className="w-24" onClick={handleTplSave} disabled={tplSaving || !tplFormName.trim()}>
                  {tplSaving ? "保存中..." : "保存"}
                </Button>
              </>
            ) : (
              <Button variant="outline" className="w-24" onClick={() => setTplOpen(false)}>关闭</Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 模板保存确认（显示影响范围） */}
      <AlertDialog open={tplSaveConfirmOpen} onOpenChange={setTplSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存模板配置？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1.5">
                <p>此模板已绑定 <span className="font-medium text-foreground">{templates.find(t => t.id === tplSelectedId)?.bound_orgs ?? 0} 个部门</span>，保存后配置将立即同步生效到这些部门下的所有令牌。</p>
                <p className="text-muted-foreground">影响范围：过期时间、模型可用范围、IP 白名单等全部配置项。</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setTplSaveConfirmOpen(false); doTplSave(); }}>确认保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bind Template to Orgs Dialog */}
      <Dialog open={bindOpen} onOpenChange={setBindOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>应用模板到部门</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            将模板「<span className="font-medium text-foreground">{bindTplName}</span>」应用到以下部门。一个部门只能使用一个模板，勾选后会自动覆盖该部门原有的模板绑定。
          </p>
          <div className="max-h-72 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
            {orgsWithTpl.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">暂无部门</p>
            ) : orgsWithTpl.map(o => {
              const checked = bindOrgs.has(o.id);
              const boundElsewhere = o.key_template_id && o.key_template_id !== bindTplId;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer",
                    boundElsewhere && !checked && "opacity-60"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={val => {
                      setBindOrgs(prev => {
                        const next = new Set(prev);
                        if (val) next.add(o.id); else next.delete(o.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm text-foreground flex-1">{o.name}</span>
                  {boundElsewhere && !checked && (
                    <span className="text-[10px] text-muted-foreground">已绑定其他模板</span>
                  )}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindOpen(false)} disabled={bindSaving}>取消</Button>
            <Button onClick={handleBindSave} disabled={bindSaving}>
              {bindSaving ? "保存中..." : "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Member Permissions Dialog */}
      <Dialog open={advancedPermOpen} onOpenChange={setAdvancedPermOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>成员高级权限管理</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            被勾选的成员在新建 Key 时将显示完整配置表单（包含预算、访问限制等高级选项）。
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {batchSending ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
              <p className="text-lg font-medium text-foreground mb-2">正在生成令牌并推送邮件...</p>
              <p className="text-sm text-muted-foreground">请稍候，不要关闭窗口</p>
            </div>
          ) : batchSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
              <p className="text-xl font-semibold text-foreground mb-2">批量创建成功</p>
              <p className="text-sm text-muted-foreground mb-8">
                已为 {batchCreatedCount} 位成员创建 API Key 并发送邮件
              </p>
              <Button onClick={() => setBatchCreateOpen(false)} className="w-32">确定</Button>
            </div>
          ) : (
            <>
              {/* Header */}
              <DialogHeader className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <DialogTitle className="text-lg font-semibold">批量创建 API Key</DialogTitle>
                </div>
              </DialogHeader>

              {/* Step Indicator */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-center gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    batchStep === 1 ? "bg-primary text-primary-foreground" : batchStep > 1 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Settings className="w-4 h-4" />
                    配置 API Key
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    batchStep === 2 ? "bg-primary text-primary-foreground" : batchStep > 2 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <FileText className="w-4 h-4" />
                    导入名单
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    batchStep === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Send className="w-4 h-4" />
                    分发配置
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {batchStep === 1 && (
                  <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700">设置这批 API Key 的通用属性，所有成员将使用相同的配置。</p>
                    </div>

                    {/* Token Type */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">令牌类型</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={`flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          batchTokenType === "member" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="tokenType"
                              value="member"
                              checked={batchTokenType === "member"}
                              onChange={() => setBatchTokenType("member")}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              batchTokenType === "member" ? "border-primary" : "border-muted-foreground"
                            }`}>
                              {batchTokenType === "member" && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <span className="font-medium">成员令牌</span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-6">绑定到具体成员，随成员状态变化</span>
                        </label>
                        <label className={`flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          batchTokenType === "dept" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="tokenType"
                              value="dept"
                              checked={batchTokenType === "dept"}
                              onChange={() => setBatchTokenType("dept")}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              batchTokenType === "dept" ? "border-primary" : "border-muted-foreground"
                            }`}>
                              {batchTokenType === "dept" && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <span className="font-medium">部门令牌</span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-6">不随成员变动失效，适用于业务系统</span>
                        </label>
                      </div>
                    </div>

                    {/* Quota Setting */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">配额设置</Label>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">¥</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={batchQuota}
                          onChange={e => setBatchQuota(e.target.value)}
                          disabled={batchUnlimited}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={batchUnlimited}
                            onCheckedChange={setBatchUnlimited}
                          />
                          <span className="text-sm text-muted-foreground">无限额度</span>
                        </div>
                      </div>
                    </div>

                    {/* Expiration */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">过期时间</Label>
                      <Input
                        type="datetime-local"
                        value={batchExpires}
                        onChange={e => setBatchExpires(e.target.value)}
                      />
                      <div className="flex gap-2">
                        {["永不过期", "30天", "90天", "1年"].map(label => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              if (label === "永不过期") setBatchExpires("");
                              else {
                                const days = label === "30天" ? 30 : label === "90天" ? 90 : 365;
                                const date = new Date();
                                date.setDate(date.getDate() + days);
                                setBatchExpires(date.toISOString().slice(0, 16));
                              }
                            }}
                            className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Model Limit */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">模型限制</Label>
                      <MultiSelect
                        options={MODELS}
                        selected={batchModels}
                        onChange={setBatchModels}
                        placeholder="留空则支持所有模型"
                        searchPlaceholder="搜索模型..."
                      />
                    </div>

                    {/* IP Whitelist */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">IP 白名单</Label>
                      <textarea
                        value={batchIpWhitelist}
                        onChange={e => setBatchIpWhitelist(e.target.value)}
                        placeholder="一行一个 IP，留空不限制"
                        className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                )}

                {batchStep === 2 && (
                  <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <FileText className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p>支持批量粘贴邮箱和备注名，格式：邮箱/备注名</p>
                        <p>每行一个成员，如：zhangsan@company.com/张三</p>
                      </div>
                    </div>

                    {/* Member List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">成员名单</Label>
                        <span className="text-xs text-muted-foreground">
                          有效：{batchMemberList.split("\n").filter(line => line.trim() && line.includes("@")).length}
                        </span>
                      </div>
                      <textarea
                        value={batchMemberList}
                        onChange={e => setBatchMemberList(e.target.value)}
                        placeholder={"zhangsan@company.com/张三\nlisi@company.com/李四"}
                        className="w-full h-48 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                )}

                {batchStep === 3 && (
                  <div className="space-y-6">
                    {/* Pending Users List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">待发送用户列表</Label>
                        <span className="text-xs text-muted-foreground">
                          共 {batchMemberList.split("\n").filter(line => line.trim() && line.includes("@")).length} 人
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                        {batchMemberList.split("\n").filter(line => line.trim() && line.includes("@")).map((line, idx) => {
                          const parts = line.split("/");
                          const email = parts[0]?.trim();
                          const name = parts[1]?.trim() || email;
                          return (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
                                {name.charAt(0)}
                              </div>
                              <span className="text-foreground">{name}</span>
                              <span className="text-muted-foreground text-xs">({email})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Email Editor */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">邮件编辑</Label>
                      <div className="border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-12">主题</span>
                          <Input
                            value={batchEmailSubject}
                            onChange={e => setBatchEmailSubject(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-12">正文</span>
                          </div>
                          <textarea
                            value={batchEmailBody}
                            onChange={e => setBatchEmailBody(e.target.value)}
                            className="w-full h-48 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="flex justify-center">
                          <Button variant="outline" size="sm" className="gap-2">
                            <CheckCircle className="w-4 h-4" />
                            安全提取令牌
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex justify-between items-center">
                <div>
                  {batchStep > 1 && (
                    <Button variant="outline" onClick={() => setBatchStep(prev => (prev - 1) as 1 | 2 | 3)} className="gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      上一步
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setBatchCreateOpen(false)}>
                    取消
                  </Button>
                  {batchStep < 3 ? (
                    <Button
                      onClick={() => setBatchStep(prev => (prev + 1) as 1 | 2 | 3)}
                      disabled={batchStep === 2 && batchMemberList.split("\n").filter(line => line.trim() && line.includes("@")).length === 0}
                      className="gap-2"
                    >
                      下一步
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        setBatchSending(true);
                        // Simulate API call
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        setBatchCreatedCount(batchMemberList.split("\n").filter(line => line.trim() && line.includes("@")).length);
                        setBatchSending(false);
                        setBatchSuccess(true);
                      }}
                      disabled={batchMemberList.split("\n").filter(line => line.trim() && line.includes("@")).length === 0}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      立即发送
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 部门模型访问策略弹窗 */}
      <DeptModelPolicyDialog
        open={modelPolicyOpen}
        onOpenChange={setModelPolicyOpen}
        enterpriseId={enterprise.id}
        orgs={organizations}
        org={orgNameFilter !== "all" ? organizations.find(o => o.id === orgNameFilter) ?? null : null}
      />
    </div>
  );
}

