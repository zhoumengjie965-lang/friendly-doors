import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Search,
  RefreshCw,
  Info,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────

type SubTab = "platform-fallback" | "model-default" | "customer-tier";
type ModelStatus = "enabled" | "disabled";
type LimitMode = "custom" | "fallback" | "unlimited";
type CustomerType = "user" | "enterprise";
type TierStatus = "pending" | "active" | "expired";

interface ModelRateLimit {
  id: string;
  modelName: string;
  provider: string;
  modelStatus: ModelStatus;
  limitMode: LimitMode;
  customRPM: number | null;
  customTPM: number | null;
  limitPeriodMinutes: number;
  upgradeCustomerCount: number;
  updatedAt: string;
  remark?: string;
  channels?: { name: string; enabled: boolean }[];
}

interface CustomerTierUpgrade {
  id: string;
  customerType: CustomerType;
  customerName: string;
  modelName: string;
  upgradeRPM: number | null;
  upgradeTPM: number | null;
  effectiveTime: string;
  expireTime: string | null;
  status: TierStatus;
  remark?: string;
}

// ── 客户搜索（与消费趋势模块一致） ──

interface CustomerSearchItem {
  id: string;
  accountType: CustomerType;
  displayName: string;      // 个人：真实姓名/备注
  username?: string;        // 个人用户名
  enterpriseName?: string;  // 企业名称
  remarkType?: string;      // 备注类型
}

const MOCK_CUSTOMERS: CustomerSearchItem[] = [
  { id: "user_001", accountType: "user", displayName: "张三", username: "zhang_san", remarkType: "正式用户" },
  { id: "user_002", accountType: "user", displayName: "李四", username: "li_si_002", remarkType: "正式用户" },
  { id: "user_003", accountType: "user", displayName: "王五", username: "wang_wu", remarkType: "测试用户" },
  { id: "user_004", accountType: "user", displayName: "赵六", username: "zhao_liu", remarkType: "测试用户" },
  { id: "user_005", accountType: "user", displayName: "孙七", username: "sun_qi", remarkType: "内结用户" },
  { id: "ent_001", accountType: "enterprise", displayName: "科技有限公司A", enterpriseName: "科技有限公司A", remarkType: "正式用户" },
  { id: "ent_002", accountType: "enterprise", displayName: "科技有限公司B", enterpriseName: "科技有限公司B", remarkType: "正式用户" },
  { id: "ent_003", accountType: "enterprise", displayName: "数据科技B", enterpriseName: "数据科技B", remarkType: "测试用户" },
  { id: "ent_004", accountType: "enterprise", displayName: "智能科技C", enterpriseName: "智能科技C", remarkType: "内结用户" },
];

// ─── Constants ───────────────────────────────────────────────────────────

const MODEL_STATUS_LABELS: Record<ModelStatus, string> = {
  enabled: "启用",
  disabled: "禁用",
};

const LIMIT_MODE_LABELS: Record<LimitMode, string> = {
  custom: "模型默认",
  fallback: "平台兜底",
  unlimited: "不限制",
};

const LIMIT_MODE_BADGE: Record<LimitMode, string> = {
  custom: "bg-blue-50 text-blue-600 border-blue-200",
  fallback: "bg-gray-100 text-gray-500 border-gray-200",
  unlimited: "bg-amber-50 text-amber-600 border-amber-200",
};

const TIER_STATUS_LABELS: Record<TierStatus, string> = {
  pending: "待生效",
  active: "生效中",
  expired: "已过期",
};

const TIER_STATUS_BADGE: Record<TierStatus, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  active: "bg-green-50 text-green-600 border-green-200",
  expired: "bg-gray-100 text-gray-400 border-gray-200",
};

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  user: "用户",
  enterprise: "企业",
};



// ─── Helpers ─────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function nowStr() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

// ─── Default Data ────────────────────────────────────────────────────────

const DEFAULT_MODELS: ModelRateLimit[] = [
  { id: genId(), modelName: "gpt-4o", provider: "OpenAI", modelStatus: "enabled", limitMode: "custom", customRPM: 5, customTPM: 10000, limitPeriodMinutes: 1, upgradeCustomerCount: 2, updatedAt: "2026-06-20 10:30", remark: "", channels: [{ name: "OpenAI-官方API", enabled: true }, { name: "Azure-美国东部", enabled: true }, { name: "Azure-欧洲西部", enabled: false }] },
  { id: genId(), modelName: "gpt-4o-mini", provider: "OpenAI", modelStatus: "enabled", limitMode: "fallback", customRPM: null, customTPM: null, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-18 14:00", remark: "", channels: [{ name: "OpenAI-官方API", enabled: true }] },
  { id: genId(), modelName: "gpt-4-turbo", provider: "OpenAI", modelStatus: "enabled", limitMode: "custom", customRPM: 3, customTPM: 8000, limitPeriodMinutes: 1, upgradeCustomerCount: 1, updatedAt: "2026-06-19 09:15", remark: "", channels: [{ name: "OpenAI-官方API", enabled: true }, { name: "Azure-美国东部", enabled: false }] },
  { id: genId(), modelName: "claude-3.5-sonnet", provider: "Anthropic", modelStatus: "enabled", limitMode: "custom", customRPM: 5, customTPM: 10000, limitPeriodMinutes: 1, upgradeCustomerCount: 3, updatedAt: "2026-06-21 16:45", remark: "", channels: [{ name: "Anthropic-官方API", enabled: true }, { name: "Anthropic-备用线路", enabled: true }] },
  { id: genId(), modelName: "claude-3-opus", provider: "Anthropic", modelStatus: "disabled", limitMode: "fallback", customRPM: null, customTPM: null, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-15 11:20", remark: "", channels: [{ name: "Anthropic-官方API", enabled: false }, { name: "Anthropic-备用线路", enabled: false }] },
  { id: genId(), modelName: "gemini-2.0-flash", provider: "Google", modelStatus: "enabled", limitMode: "custom", customRPM: 10, customTPM: 20000, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-22 08:30", remark: "", channels: [{ name: "Google-VertexAI", enabled: true }] },
  { id: genId(), modelName: "gemini-1.5-pro", provider: "Google", modelStatus: "enabled", limitMode: "unlimited", customRPM: null, customTPM: null, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-17 13:00", remark: "" },
  { id: genId(), modelName: "deepseek-chat", provider: "DeepSeek", modelStatus: "enabled", limitMode: "custom", customRPM: 8, customTPM: 15000, limitPeriodMinutes: 1, upgradeCustomerCount: 1, updatedAt: "2026-06-23 10:00", remark: "", channels: [] },
  { id: genId(), modelName: "deepseek-coder", provider: "DeepSeek", modelStatus: "disabled", limitMode: "fallback", customRPM: null, customTPM: null, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-16 15:30", remark: "", channels: [{ name: "DeepSeek-官方API", enabled: false }] },
  { id: genId(), modelName: "glm-4", provider: "Zhipu", modelStatus: "enabled", limitMode: "custom", customRPM: 6, customTPM: 12000, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-21 09:00", remark: "", channels: [{ name: "智谱-开放平台", enabled: true }, { name: "智谱-企业专线", enabled: true }, { name: "智谱-备用", enabled: false }] },
  { id: genId(), modelName: "qwen-max", provider: "Alibaba", modelStatus: "enabled", limitMode: "fallback", customRPM: null, customTPM: null, limitPeriodMinutes: 1, upgradeCustomerCount: 0, updatedAt: "2026-06-14 14:45", remark: "", channels: [{ name: "阿里云-DashScope", enabled: true }, { name: "阿里云-国际版", enabled: false }] },
];

const DEFAULT_CUSTOMER_TIERS: CustomerTierUpgrade[] = [
  { id: genId(), customerType: "enterprise", customerName: "科技有限公司A", modelName: "gpt-4o", upgradeRPM: 50, upgradeTPM: 100000, effectiveTime: "2026-06-01 00:00", expireTime: null, status: "active", remark: "年度合同客户" },
  { id: genId(), customerType: "user", customerName: "test_user_001", modelName: "gpt-4o", upgradeRPM: 20, upgradeTPM: 50000, effectiveTime: "2026-06-15 00:00", expireTime: "2026-07-15 00:00", status: "active", remark: "" },
  { id: genId(), customerType: "enterprise", customerName: "数据科技B", modelName: "claude-3.5-sonnet", upgradeRPM: 100, upgradeTPM: 500000, effectiveTime: "2026-06-10 00:00", expireTime: null, status: "active", remark: "大促期间放宽限流" },
  { id: genId(), customerType: "user", customerName: "dev_user_042", modelName: "gpt-4-turbo", upgradeRPM: 15, upgradeTPM: 40000, effectiveTime: "2026-07-01 00:00", expireTime: "2026-08-01 00:00", status: "pending", remark: "新项目上线" },
  { id: genId(), customerType: "enterprise", customerName: "智能科技C", modelName: "deepseek-chat", upgradeRPM: 30, upgradeTPM: 60000, effectiveTime: "2026-05-01 00:00", expireTime: "2026-06-01 00:00", status: "expired", remark: "" },
];

// ─── Component ───────────────────────────────────────────────────────────

export default function RateLimitSettings() {
  const { toast } = useToast();

  // Sub-tab
  const [subTab, setSubTab] = useState<SubTab>("model-default");

  // ── Tab 1: Platform Fallback ──
  const [pfEnabled, setPfEnabled] = useState(true);
  const [pfPeriod, setPfPeriod] = useState(1);
  const [pfRPM, setPfRPM] = useState(100);
  const [pfTPM, setPfTPM] = useState(10000);
  const [pfRemark, setPfRemark] = useState("");

  // ── Tab 2: Model Default ──
  const [mlEnabled, setMlEnabled] = useState(true);
  const [models, setModels] = useState<ModelRateLimit[]>(DEFAULT_MODELS);
  const [modelSearch, setModelSearch] = useState("");
  const [modelStatusFilter, setModelStatusFilter] = useState("enabled");
  const [configSourceFilter, setConfigSourceFilter] = useState("all");
  const [channelPopoverModelId, setChannelPopoverModelId] = useState<string | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelRateLimit | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchConfig, setBatchConfig] = useState<{ mode: LimitMode; rpm: number | null; tpm: number | null }>({
    mode: "custom",
    rpm: null,
    tpm: null,
  });

  // ── Tab 3: Customer Tier ──
  const [ctEnabled, setCtEnabled] = useState(true);
  const [customerTiers, setCustomerTiers] = useState<CustomerTierUpgrade[]>(DEFAULT_CUSTOMER_TIERS);
  const [custStatusFilter, setCustStatusFilter] = useState("all");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CustomerTierUpgrade | null>(null);

  // 客户搜索（与消费趋势模块一致）
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchItem | null>(null);

  // 模型搜索
  const [modelSearchForTier, setModelSearchForTier] = useState("");

  // 弹窗内客户搜索（与外面搜索逻辑一致）
  const [dialogCustomerSearchText, setDialogCustomerSearchText] = useState("");
  const [dialogCustomerSearchResults, setDialogCustomerSearchResults] = useState<CustomerSearchItem[]>([]);

  // 删除确认弹窗
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteTier, setPendingDeleteTier] = useState<CustomerTierUpgrade | null>(null);

  // ── Historical config (removed) ──

  // ── Derived data ──
  const modelNames = useMemo(() => models.map((m) => m.modelName), [models]);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchSearch = m.modelName.toLowerCase().includes(modelSearch.toLowerCase());
      const matchModelStatus = m.modelStatus === modelStatusFilter;
      const matchConfigStatus =
        configSourceFilter === "all" ||
        (configSourceFilter === "custom" && m.limitMode === "custom") ||
        (configSourceFilter === "unconfigured" && m.limitMode !== "custom");
      return matchSearch && matchModelStatus && matchConfigStatus;
    });
  }, [models, modelSearch, modelStatusFilter, configSourceFilter]);

  const filteredTiers = useMemo(() => {
    return customerTiers.filter((t) => {
      const matchCustomer = !selectedCustomer || t.customerName === selectedCustomer.displayName;
      const matchModel = !modelSearchForTier || t.modelName.toLowerCase().includes(modelSearchForTier.toLowerCase());
      const matchStatus = custStatusFilter === "all" || t.status === custStatusFilter;
      return matchCustomer && matchModel && matchStatus;
    });
  }, [customerTiers, selectedCustomer, modelSearchForTier, custStatusFilter]);

  // ── 客户搜索处理（与消费趋势模块一致） ──
  const handleCustomerSearch = (value: string) => {
    setCustomerSearchText(value);
    setSelectedCustomer(null);
    if (value.trim().length === 0) {
      setCustomerSearchResults([]);
      return;
    }
    const q = value.toLowerCase().trim();
    const filtered = MOCK_CUSTOMERS.filter((r) => {
      if (r.accountType === "user") {
        return (
          (r.displayName?.toLowerCase().includes(q)) ||
          (r.username?.toLowerCase().includes(q))
        );
      } else {
        return r.enterpriseName?.toLowerCase().includes(q);
      }
    });
    setCustomerSearchResults(filtered.slice(0, 10));
  };

  const handleSelectCustomer = (item: CustomerSearchItem) => {
    setSelectedCustomer(item);
    setCustomerSearchText(item.accountType === "enterprise" ? item.enterpriseName! : item.displayName);
    setCustomerSearchResults([]);
  };

  // 弹窗内客户搜索处理（与外面一致）
  const handleDialogCustomerSearch = (value: string) => {
    setDialogCustomerSearchText(value);
    if (value.trim().length === 0) {
      setDialogCustomerSearchResults([]);
      return;
    }
    const q = value.toLowerCase().trim();
    const filtered = MOCK_CUSTOMERS.filter((r) => {
      if (r.accountType === "user") {
        return (
          (r.displayName?.toLowerCase().includes(q)) ||
          (r.username?.toLowerCase().includes(q))
        );
      } else {
        return r.enterpriseName?.toLowerCase().includes(q);
      }
    });
    setDialogCustomerSearchResults(filtered.slice(0, 10));
  };

  const handleDialogSelectCustomer = (item: CustomerSearchItem) => {
    setEditingTier({
      ...editingTier,
      customerName: item.accountType === "enterprise" ? item.enterpriseName! : item.displayName,
      customerType: item.accountType,
    });
    setDialogCustomerSearchText(item.accountType === "enterprise" ? item.enterpriseName! : item.displayName);
    setDialogCustomerSearchResults([]);
  };

  // ── Handlers: Model Default ──
  const getEffectiveRPM = (m: ModelRateLimit): number | string => {
    if (m.limitMode === "custom") return m.customRPM ?? 0;
    if (m.limitMode === "fallback") return pfRPM;
    return "不限制";
  };
  const getEffectiveTPM = (m: ModelRateLimit): number | string => {
    if (m.limitMode === "custom") return m.customTPM ?? 0;
    if (m.limitMode === "fallback") return pfTPM;
    return "不限制";
  };
  const getEffectivePeriod = (m: ModelRateLimit): number | string => {
    if (m.limitMode === "custom") return m.limitPeriodMinutes;
    if (m.limitMode === "fallback") return pfPeriod;
    return "-";
  };

  const handleEditModel = (m: ModelRateLimit) => {
    // 未配置(fallback)模型打开时归一为启用限流，但字段留空以体现"未配置"
    const normalized: ModelRateLimit =
      m.limitMode === "fallback"
        ? { ...m, limitMode: "custom", customRPM: null, customTPM: null }
        : { ...m };
    setEditingModel(normalized);
    setModelDialogOpen(true);
  };

  const handleSaveModel = () => {
    if (!editingModel) return;
    if (editingModel.limitMode === "custom") {
      const rpm = editingModel.customRPM;
      const tpm = editingModel.customTPM;
      if (rpm === null || rpm === undefined || !Number.isInteger(rpm) || rpm < 1) {
        toast({ title: "RPM 必须为正整数", variant: "destructive" });
        return;
      }
      if (tpm === null || tpm === undefined || !Number.isInteger(tpm) || tpm < 1) {
        toast({ title: "TPM 必须为正整数", variant: "destructive" });
        return;
      }
    }
    setModels((prev) => prev.map((m) => (m.id === editingModel.id ? { ...editingModel, updatedAt: nowStr() } : m)));
    setModelDialogOpen(false);
    setEditingModel(null);
    toast({ title: "保存成功", description: `模型「${editingModel.modelName}」限流配置已保存` });
  };

  // ── Batch handlers ──
  const toggleModelSelect = (id: string) => {
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allFilteredIds = filteredModels.map((m) => m.id);
    const allSelected = allFilteredIds.every((id) => selectedModelIds.has(id));
    setSelectedModelIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBatchApply = () => {
    const count = selectedModelIds.size;
    if (count === 0) return;
    if (batchConfig.mode === "custom") {
      const rpm = batchConfig.rpm;
      const tpm = batchConfig.tpm;
      const rpmFilled = rpm !== null && Number.isInteger(rpm) && rpm >= 1;
      const tpmFilled = tpm !== null && Number.isInteger(tpm) && tpm >= 1;
      if (rpm !== null && !rpmFilled) {
        toast({ title: "RPM 必须为正整数", variant: "destructive" });
        return;
      }
      if (tpm !== null && !tpmFilled) {
        toast({ title: "TPM 必须为正整数", variant: "destructive" });
        return;
      }
      if (!rpmFilled && !tpmFilled) {
        toast({ title: "RPM 和 TPM 至少填写一项", variant: "destructive" });
        return;
      }
    }
    setModels((prev) =>
      prev.map((m) => {
        if (!selectedModelIds.has(m.id)) return m;
        return {
          ...m,
          limitMode: batchConfig.mode,
          customRPM: batchConfig.mode === "custom" ? batchConfig.rpm : null,
          customTPM: batchConfig.mode === "custom" ? batchConfig.tpm : null,
          updatedAt: nowStr(),
        };
      })
    );
    setBatchDialogOpen(false);
    setSelectedModelIds(new Set());
    toast({ title: "批量配置成功", description: `已为 ${count} 个模型应用限流配置` });
  };

  const handleViewTierCustomers = (modelName: string) => {
    setModelSearchForTier(modelName);
    setSubTab("customer-tier");
  };

  // ── Handlers: Customer Tier ──
  const handleAddTier = () => {
    setEditingTier({
      id: "",
      customerType: "user",
      customerName: "",
      modelName: "",
      upgradeRPM: null,
      upgradeTPM: null,
      effectiveTime: "",
      expireTime: null,
      status: "pending",
      remark: "",
    });
    setDialogCustomerSearchText("");
    setDialogCustomerSearchResults([]);
    setCustomerDialogOpen(true);
  };

  const handleEditTier = (t: CustomerTierUpgrade) => {
    setEditingTier({ ...t });
    setCustomerDialogOpen(true);
  };

  const handleSaveTier = () => {
    if (!editingTier) return;
    if (!editingTier.customerName.trim()) {
      toast({ title: "请选择客户", variant: "destructive" });
      return;
    }
    if (!editingTier.modelName) {
      toast({ title: "请选择模型", variant: "destructive" });
      return;
    }
    if (editingTier.upgradeRPM === null && editingTier.upgradeTPM === null) {
      toast({ title: "提级 RPM 和 TPM 至少填写一项", variant: "destructive" });
      return;
    }
    if (editingTier.upgradeRPM !== null && (!Number.isInteger(editingTier.upgradeRPM) || editingTier.upgradeRPM < 1)) {
      toast({ title: "RPM 必须为正整数", variant: "destructive" });
      return;
    }
    if (editingTier.upgradeTPM !== null && (!Number.isInteger(editingTier.upgradeTPM) || editingTier.upgradeTPM < 1)) {
      toast({ title: "TPM 必须为正整数", variant: "destructive" });
      return;
    }
    const dup = customerTiers.find((t) =>
      t.id !== editingTier.id &&
      t.customerName === editingTier.customerName &&
      t.modelName === editingTier.modelName &&
      (t.status === "active" || t.status === "pending")
    );
    if (dup) {
      toast({ title: "配置冲突", description: "同一客户 + 同一模型已存在生效中的提级配置", variant: "destructive" });
      return;
    }
    if (editingTier.expireTime) {
      const expire = new Date(editingTier.expireTime);
      if (expire.getTime() < Date.now()) {
        toast({ title: "到期时间不能早于当前时间", variant: "destructive" });
        return;
      }
    }

    const effTime = editingTier.effectiveTime || nowStr();
    // 状态判定：待生效(生效时间晚于当前) / 生效中(当前在有效期内) / 已过期(超过到期时间)
    const nowMs = Date.now();
    const effMs = new Date(effTime).getTime();
    const expMs = editingTier.expireTime ? new Date(editingTier.expireTime).getTime() : null;
    const newStatus: TierStatus =
      expMs !== null && expMs < nowMs
        ? "expired"
        : effMs > nowMs
          ? "pending"
          : "active";

    if (editingTier.id) {
      setCustomerTiers((prev) => prev.map((t) =>
        t.id === editingTier.id ? { ...editingTier, effectiveTime: effTime, status: newStatus } : t
      ));
      // 审计日志：编辑提级配置
      console.log(`[审计日志] 编辑提级配置：${editingTier.customerType}=${editingTier.customerName}, 模型=${editingTier.modelName}, 状态=${newStatus}, 操作时间=${nowStr()}`);
    } else {
      setCustomerTiers((prev) => [...prev, { ...editingTier, id: genId(), effectiveTime: effTime, status: newStatus }]);
      // 审计日志：新增提级配置
      console.log(`[审计日志] 新增提级配置：${editingTier.customerType}=${editingTier.customerName}, 模型=${editingTier.modelName}, 状态=${newStatus}, 操作时间=${nowStr()}`);
    }
    setCustomerDialogOpen(false);
    setEditingTier(null);
    toast({ title: "保存成功", description: "客户单模型提级规则已保存" });
  };

  const handleDeleteTier = (t: CustomerTierUpgrade) => {
    setPendingDeleteTier(t);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteTier) return;
    const t = pendingDeleteTier;
    setCustomerTiers((prev) => prev.filter((item) => item.id !== t.id));
    toast({
      title: "已删除",
      description: `「${t.customerName} - ${t.modelName}」的提级配置已删除`,
    });
    // 审计日志：删除提级配置
    console.log(`[审计日志] 删除提级配置：${t.customerType}=${t.customerName}, 模型=${t.modelName}, 原状态=${t.status}, 操作时间=${nowStr()}`);
    setDeleteConfirmOpen(false);
    setPendingDeleteTier(null);
  };

  // ── Save handlers ──
  const handleSavePlatformFallback = () => {
    toast({ title: "保存成功", description: "平台兜底限流配置已保存" });
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl">
      <h2 className="text-lg font-semibold text-foreground">模型请求速率限制</h2>

      {/* 说明卡片 */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p>模型请求速率限制用于控制用户/企业在单位时间内的请求数和 token 消耗量</p>
          <p className="mt-1">生效优先级：<span className="font-semibold">用户提级配置 &gt; 模型限流配置 &gt; 全局限流配置</span></p>
        </div>
      </div>

      {/* 子Tab导航 */}
      <div className="inline-flex bg-muted rounded-md p-0.5">
        <button
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            subTab === "model-default" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSubTab("model-default")}
        >
          模型限流配置
        </button>
        <button
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            subTab === "customer-tier" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSubTab("customer-tier")}
        >
          用户提级配置
        </button>
        <button
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            subTab === "platform-fallback" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setSubTab("platform-fallback")}
        >
          全局限流配置
        </button>
      </div>

      {/* ── Tab: 其他配置 ── */}
      {subTab === "platform-fallback" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Switch checked={pfEnabled} onCheckedChange={setPfEnabled} />
            <span className="text-sm text-muted-foreground">启用用户模型请求速率限制（可能会影响高并发性能）</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">限制周期</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={pfPeriod}
                  onChange={(e) => setPfPeriod(Number(e.target.value))}
                  className="w-24"
                  disabled={!pfEnabled}
                />
                <span className="text-sm text-gray-600">分钟</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">频率限制的周期（分钟）</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">用户每周期最多请求次数</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={pfRPM}
                    onChange={(e) => setPfRPM(Number(e.target.value))}
                    className="w-32"
                    disabled={!pfEnabled}
                  />
                  <span className="text-sm text-gray-600">次</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">包括失败请求的次数，0代表不限制</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">用户每周期最多请求完成次数</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={Math.floor(pfTPM / 10)}
                    onChange={(e) => setPfTPM(Number(e.target.value) * 10)}
                    className="w-32"
                    disabled={!pfEnabled}
                  />
                  <span className="text-sm text-gray-600">次</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">只包括请求成功的次数</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">分组速率限制</label>
              <textarea
                className="w-full min-h-[120px] p-3 border rounded-md bg-muted/50 text-sm font-mono resize-y disabled:opacity-50"
                placeholder='&#123;\n  &quot;vip&quot;: [0, 1000]\n&#125;'
                disabled={!pfEnabled}
                defaultValue={`{\n  "vip": [\n    0,\n    1000\n  ]\n}`}
              />
              <p className="text-xs text-gray-500 mt-1 space-y-0.5">
                <span>说明：</span><br />
                使用 JSON 对象格式，格式为：{"{\"组名\": [最多请求数, 最多请求完成次数]"}<br />
                示例：{"{\"default\": [200, 100], \"vip\": [0, 1000]}"}<br />
                [最多请求数]必须大于等于0，[最多请求完成次数]必须大于等于1。<br />
                [最多请求数]和[最多请求完成次数]的最大值为2147483647。<br />
                分组速率配置优先级高于全局速率限制<br />
                限制周期统一使用上方配置的"限制周期"值。
              </p>
            </div>
          </div>

          <Button onClick={handleSavePlatformFallback} className="bg-blue-600 hover:bg-blue-700">
            保存模型速率限制
          </Button>
        </div>
      )}

      {/* ── Tab 2: 模型默认限流 ── */}
      {subTab === "model-default" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={mlEnabled} onCheckedChange={setMlEnabled} />
            <span className="text-sm text-muted-foreground">启用模型默认限流（为单个模型设置默认调用上限）</span>
          </div>

          <div className={mlEnabled ? "" : "pointer-events-none opacity-50"}>
          {/* 搜索 + 筛选 */}

          {/* 搜索 + 筛选 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="搜索模型名称"
                className="pl-8 h-9"
              />
            </div>
            <Select value={modelStatusFilter} onValueChange={setModelStatusFilter}>
              <SelectTrigger className="w-28 h-9"><SelectValue placeholder="模型状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">启用模型</SelectItem>
                <SelectItem value="disabled">禁用模型</SelectItem>
              </SelectContent>
            </Select>
            <Select value={configSourceFilter} onValueChange={setConfigSourceFilter}>
              <SelectTrigger className="w-28 h-9"><SelectValue placeholder="配置状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="custom">已配置</SelectItem>
                <SelectItem value="unconfigured">未配置</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                className={`h-9 ${selectedModelIds.size > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-muted/80 hover:bg-muted text-muted-foreground"}`}
                onClick={() => {
                  if (selectedModelIds.size > 0) {
                    setBatchConfig({ mode: "custom", rpm: null, tpm: null });
                    setBatchDialogOpen(true);
                  }
                }}
              >
                批量配置{selectedModelIds.size > 0 && ` (${selectedModelIds.size})`}
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => { setModelSearch(""); setModelStatusFilter("enabled"); setConfigSourceFilter("all"); }}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                刷新
              </Button>
            </div>
          </div>

          {/* 列表 */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground w-10">
                    <Checkbox
                      checked={filteredModels.length > 0 && filteredModels.every((m) => selectedModelIds.has(m.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">模型名称</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">可用渠道</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">RPM上限</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">TPM上限</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">统计周期</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">提级客户数</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredModels.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">无匹配数据</td></tr>
                ) : (
                  filteredModels.map((m) => {
                    const isDisabled = m.modelStatus === "disabled";
                    const isUnconfigured = m.limitMode !== "custom";
                    const effRPM = isUnconfigured ? "-" : getEffectiveRPM(m);
                    const effTPM = isUnconfigured ? "-" : getEffectiveTPM(m);
                    const effPeriod = isUnconfigured ? "-" : getEffectivePeriod(m);
                    return (
                      <tr key={m.id} className={`hover:bg-muted/30 ${isDisabled ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={selectedModelIds.has(m.id)}
                            onCheckedChange={() => toggleModelSelect(m.id)}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{m.modelName}</td>
                        <td className="px-3 py-2 text-center">
                          {(() => {
                            const channels = m.channels ?? [];
                            const enabledCount = channels.filter((c) => c.enabled).length;
                            const totalCount = channels.length;
                            const isZeroEnabled = totalCount > 0 && enabledCount === 0;
                            const text = `${enabledCount} / ${totalCount}`;
                            return (
                              <Popover open={channelPopoverModelId === m.id} onOpenChange={(open) => setChannelPopoverModelId(open ? m.id : null)}>
                                <PopoverTrigger asChild>
                                  <button
                                    className={`text-sm font-medium tabular-nums cursor-pointer transition-colors hover:underline ${
                                      isZeroEnabled ? "text-red-500" : totalCount === 0 ? "text-muted-foreground" : "text-blue-600"
                                    }`}
                                  >
                                    {text}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="sm:max-w-xs w-auto p-0" align="center">
                                  <div className="p-3 space-y-0.5">
                                    {totalCount === 0 ? (
                                      <p className="text-xs text-muted-foreground">未绑定任何渠道</p>
                                    ) : (
                                      channels.map((c) => (
                                        <div key={c.name} className={`text-xs px-2 py-1 rounded ${c.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                          {c.name}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{effRPM}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{effTPM}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">
                          {effPeriod === "-" ? "-" : `${effPeriod} 分钟`}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.upgradeCustomerCount > 0 ? (
                            <button
                              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                              onClick={() => handleViewTierCustomers(m.modelName)}
                            >
                              {m.upgradeCustomerCount}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            className="text-muted-foreground hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleEditModel(m)}
                            disabled={isDisabled}
                            title="编辑限流"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          </div>
        </div>
      )}

      {/* ── Tab 3: 用户提级配置 ── */}
      {subTab === "customer-tier" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={ctEnabled} onCheckedChange={setCtEnabled} />
            <span className="text-sm text-muted-foreground">启用用户提级配置（针对指定客户和模型单独提升限流上限）</span>
          </div>

          {/* 说明文案 */}
          <div className="text-xs text-muted-foreground leading-relaxed">
            用户提级配置用于为指定用户/企业在单个模型上设置专属调用上限。未配置提级的用户，按模型默认限流执行。该配置仅表示提升调用上限，不代表资源保障承诺。
          </div>

          <div className={ctEnabled ? "" : "pointer-events-none opacity-50"}>
          {/* 搜索 + 筛选 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 客户搜索（带下拉，与消费趋势模块一致） */}
            <div className="relative flex-1 min-w-[240px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={customerSearchText}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder="搜索企业名称 / 用户名 / 显示名"
                className="pl-8 h-9"
              />
              {customerSearchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-[320px] overflow-y-auto">
                  {customerSearchResults.map((item) => (
                    <button
                      key={`${item.accountType}-${item.id}`}
                      className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm border-b last:border-b-0"
                      onClick={() => handleSelectCustomer(item)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {item.remarkType && (
                              <Badge className={
                                item.remarkType === "正式用户" ? "bg-green-500 text-white border-green-600 text-[10px] px-1.5 py-0.5 font-medium shrink-0 border" :
                                item.remarkType === "测试用户" ? "bg-amber-500 text-white border-amber-600 text-[10px] px-1.5 py-0.5 font-medium shrink-0 border" :
                                "bg-violet-500 text-white border-violet-600 text-[10px] px-1.5 py-0.5 font-medium shrink-0 border"
                              }>{item.remarkType}</Badge>
                            )}
                            <span className="font-medium text-foreground truncate">
                              {item.accountType === "enterprise" ? item.enterpriseName : item.displayName}
                            </span>
                            <Badge variant="outline" className={item.accountType === "enterprise" ? "bg-purple-50 text-purple-600 border-purple-200 text-[10px] px-1.5 py-0 shrink-0" : "bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 shrink-0"}>
                              {item.accountType === "enterprise" ? "企业" : "个人"}
                            </Badge>
                          </div>
                          {item.accountType === "user" ? (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">用户名：{item.username}</p>
                          ) : null}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 模型搜索 */}
            <div className="relative min-w-[180px] max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={modelSearchForTier}
                onChange={(e) => setModelSearchForTier(e.target.value)}
                placeholder="搜索模型名称"
                className="pl-8 h-9"
              />
            </div>
            <Select value={custStatusFilter} onValueChange={setCustStatusFilter}>
              <SelectTrigger className="w-28 h-9"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待生效</SelectItem>
                <SelectItem value="active">生效中</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-blue-600 hover:bg-blue-700 h-9" onClick={handleAddTier}>
              <Plus className="w-4 h-4 mr-1" />
              新增提级配置
            </Button>
          </div>

          {/* 列表 */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">客户</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">模型</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">RPM上限</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">TPM上限</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">有效期</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">状态</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">备注</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTiers.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">无匹配数据</td></tr>
                ) : (
                  filteredTiers.map((t) => {
                    const isWeak = t.status === "expired";
                    return (
                      <tr key={t.id} className={`hover:bg-muted/30 ${isWeak ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={t.customerType === "enterprise" ? "bg-purple-50 text-purple-600 border-purple-200 shrink-0" : "bg-blue-50 text-blue-600 border-blue-200 shrink-0"}>
                              {CUSTOMER_TYPE_LABELS[t.customerType]}
                            </Badge>
                            <span className="font-medium">{t.customerName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{t.modelName}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {t.upgradeRPM !== null ? t.upgradeRPM : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {t.upgradeTPM !== null ? t.upgradeTPM.toLocaleString() : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {t.expireTime
                            ? `${t.effectiveTime} — ${t.expireTime}`
                            : `${t.effectiveTime} — 长期`
                          }
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="outline" className={TIER_STATUS_BADGE[t.status]}>
                            {TIER_STATUS_LABELS[t.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[160px] truncate" title={t.remark || ""}>{t.remark || "-"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* 编辑：所有状态均可编辑 */}
                            <button className="text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => handleEditTier(t)} title="编辑">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {/* 删除：所有状态均可删除 */}
                            <button
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => handleDeleteTier(t)}
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          </div>
        </div>
      )}

      {/* ── 编辑模型限流弹窗 ── */}
      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑模型限流</DialogTitle>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">模型名称</label>
                <Input value={editingModel.modelName} readOnly className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">供应商</label>
                <Input value={editingModel.provider} readOnly className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">限流设置</label>
                <div className="inline-flex bg-muted rounded-md p-0.5">
                  <button
                    type="button"
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      editingModel.limitMode === "custom" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setEditingModel({ ...editingModel, limitMode: "custom" })}
                  >
                    启用限流
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      editingModel.limitMode === "unlimited" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setEditingModel({ ...editingModel, limitMode: "unlimited" })}
                  >
                    不限制
                  </button>
                </div>
              </div>
              {editingModel.limitMode === "custom" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">RPM</label>
                      <Input
                        type="number"
                        min={1}
                        value={editingModel.customRPM ?? ""}
                        onChange={(e) => setEditingModel({ ...editingModel, customRPM: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">TPM</label>
                      <Input
                        type="number"
                        min={1}
                        value={editingModel.customTPM ?? ""}
                        onChange={(e) => setEditingModel({ ...editingModel, customTPM: e.target.value === "" ? null : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">*RPM / TPM 均按 1 分钟统计</p>
                </>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  保存后，该模型将不限制普通用户的 RPM / TPM。
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveModel}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除确认弹窗 ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground leading-relaxed">
            确定要删除该条提级配置吗？删除后配置不可恢复，生效中的配置将立即取消。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setPendingDeleteTier(null); }}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 批量配置弹窗 ── */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量配置限流</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">保存后，所选模型将统一应用本次配置，原有限流配置将被覆盖。</p>
            </div>
            <p className="text-sm text-muted-foreground">将对已选中的 {selectedModelIds.size} 个模型应用以下限流配置：</p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">限流设置</label>
              <div className="inline-flex bg-muted rounded-md p-0.5">
                <button
                  type="button"
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    batchConfig.mode === "custom" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setBatchConfig((prev) => ({ ...prev, mode: "custom" }))}
                >
                  启用限流
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    batchConfig.mode === "unlimited" ? "bg-white text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setBatchConfig((prev) => ({ ...prev, mode: "unlimited" }))}
                >
                  不限制
                </button>
              </div>
            </div>
            {batchConfig.mode === "custom" ? (
              <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">RPM</label>
                      <Input
                        type="number"
                        min={1}
                        value={batchConfig.rpm ?? ""}
                        onChange={(e) => setBatchConfig((prev) => ({ ...prev, rpm: e.target.value === "" ? null : Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">TPM</label>
                      <Input
                        type="number"
                        min={1}
                        value={batchConfig.tpm ?? ""}
                        onChange={(e) => setBatchConfig((prev) => ({ ...prev, tpm: e.target.value === "" ? null : Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">*RPM / TPM 均按 1 分钟统计</p>
                </>
              ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleBatchApply}>应用批量配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除确认弹窗 ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground leading-relaxed">
            确定要删除该条提级配置吗？删除后配置不可恢复，生效中的配置将立即取消。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setPendingDeleteTier(null); }}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 新增/编辑提级配置弹窗 ── */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTier?.id ? "编辑提级配置" : "新增提级配置"}</DialogTitle>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">客户 <span className="text-destructive">*</span></label>
                {editingTier.id ? (
                  /* 编辑模式：置灰不可修改 */
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={editingTier.customerType === "enterprise" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}>
                        {CUSTOMER_TYPE_LABELS[editingTier.customerType]}
                      </Badge>
                      <Input value={editingTier.customerName} readOnly disabled className="bg-muted/50 flex-1 cursor-not-allowed" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">客户和模型不可修改，如需更换请重新新增配置。</p>
                  </>
                ) : (
                  /* 新增模式：搜索 + 下拉选择（与外面搜索一致） */
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={dialogCustomerSearchText}
                      onChange={(e) => handleDialogCustomerSearch(e.target.value)}
                      placeholder="搜索企业名称 / 用户名 / 显示名"
                      className="pl-8 h-9"
                    />
                    {dialogCustomerSearchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                        {dialogCustomerSearchResults.map((item) => (
                          <button
                            key={`dialog-${item.accountType}-${item.id}`}
                            className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm border-b last:border-b-0"
                            onClick={() => handleDialogSelectCustomer(item)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {item.remarkType && (
                                    <Badge className={
                                      item.remarkType === "正式用户" ? "bg-green-500 text-white border-green-600 text-[10px] px-1.5 py-0.5 font-medium shrink-0 border" :
                                      item.remarkType === "测试用户" ? "bg-amber-500 text-white border-amber-600 text-[10px] px-1.5 py-0.5 font-medium shrink-0 border" :
                                      "bg-violet-500 text-white border-violet-600 text-[10px] px-1.5 py-0.5 font-medium shrink-0 border"
                                    }>{item.remarkType}</Badge>
                                  )}
                                  <span className="font-medium text-foreground truncate">
                                    {item.accountType === "enterprise" ? item.enterpriseName : item.displayName}
                                  </span>
                                  <Badge variant="outline" className={item.accountType === "enterprise" ? "bg-purple-50 text-purple-600 border-purple-200 text-[10px] px-1.5 py-0 shrink-0" : "bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 shrink-0"}>
                                    {item.accountType === "enterprise" ? "企业" : "个人"}
                                  </Badge>
                                </div>
                                {item.accountType === "user" ? (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">用户名：{item.username}</p>
                                ) : null}
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">模型 <span className="text-destructive">*</span></label>
                {editingTier.id ? (
                  <Input value={editingTier.modelName} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                ) : (
                  <Input
                    value={editingTier.modelName}
                    onChange={(e) => setEditingTier({ ...editingTier, modelName: e.target.value })}
                    placeholder="搜索选择模型"
                  />
                )}
                {!editingTier.id && editingTier.modelName && !modelNames.includes(editingTier.modelName) && (
                  <p className="text-xs text-destructive mt-1">未找到匹配的模型</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">提级 RPM</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingTier.upgradeRPM ?? ""}
                    onChange={(e) => setEditingTier({ ...editingTier, upgradeRPM: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="请输入正整数"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">提级 TPM</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingTier.upgradeTPM ?? ""}
                    onChange={(e) => setEditingTier({ ...editingTier, upgradeTPM: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="请输入正整数"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-1">*RPM / TPM 均按 1 分钟统计</p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">生效时间</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={editingTier.expireTime != null ? "specified" : "permanent"}
                    onValueChange={(v) => {
                      if (v === "permanent") {
                        setEditingTier({ ...editingTier, expireTime: null });
                      } else {
                        setEditingTier({
                          ...editingTier,
                          expireTime: "",
                          effectiveTime: editingTier.effectiveTime || new Date().toISOString().slice(0, 16),
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[100px] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">长期</SelectItem>
                      <SelectItem value="specified">指定有效期</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="datetime-local"
                    value={editingTier.effectiveTime || new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setEditingTier({ ...editingTier, effectiveTime: e.target.value })}
                    className="flex-1 min-w-[180px]"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">至</span>
                  {editingTier.expireTime != null ? (
                    <Input
                      type="datetime-local"
                      value={editingTier.expireTime ?? ""}
                      onChange={(e) => setEditingTier({ ...editingTier, expireTime: e.target.value || null })}
                      placeholder="到期时间"
                      className="flex-1 min-w-[180px]"
                    />
                  ) : (
                    <Input
                      disabled
                      placeholder="无到期限制"
                      className="flex-1 min-w-[140px] bg-muted/50 cursor-not-allowed text-muted-foreground"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">备注</label>
                <Input
                  value={editingTier.remark ?? ""}
                  onChange={(e) => setEditingTier({ ...editingTier, remark: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveTier}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除确认弹窗 ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground leading-relaxed">
            确定要删除该条提级配置吗？删除后配置不可恢复，生效中的配置将立即取消。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setPendingDeleteTier(null); }}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 删除确认弹窗 ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground leading-relaxed">
            确定要删除该条提级配置吗？删除后配置不可恢复，生效中的配置将立即取消。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setPendingDeleteTier(null); }}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
