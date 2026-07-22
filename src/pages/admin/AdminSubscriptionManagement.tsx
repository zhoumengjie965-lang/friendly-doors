import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  CreditCard,
  Package,
  Calendar,
  Pencil,
  Ban,
  CheckCircle2,
  Target,
  Layers,
  Users,
  Search,
  Calculator,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductType = "one-time" | "subscription";
type ValidityUnit = "month" | "day" | "year" | "hour" | "custom";
type ModelScope = "all" | "filter" | "specific";

interface ModelFilter {
  region: string[];
  source: string[];
  type: string[];
}
type PurchaseSubject = "personal" | "enterprise" | "all";

type PurchaseMethod =
  | "account-balance"
  | "alipay"
  | "wechat-pay"
  | "stripe"
  | "creem"
  | "admin-grant";

interface SubscriptionPlan {
  id: string;
  productType: ProductType;
  name: string;
  subtitle: string;
  price: number;
  totalQuota: number;
  baseUnitPrice: number;
  currency: string;
  modelScope: ModelScope;
  modelFilter: ModelFilter;
  selectedModels: string[];
  coefficientProfile: "global" | "custom";
  validityUnit: ValidityUnit;
  validityValue: number;
  validityCustomSeconds: number;
  purchaseSubject: PurchaseSubject;
  purchaseLimit: number;
  purchaseMethods: PurchaseMethod[];
  subscriptionKeyLimit: number;
  status: "active" | "inactive";
  sort: number;
  benefitDescription: string;
  // 订阅专用：席位配置
  baseKeyLimit?: number;
  minSeats?: number;
  maxSeats?: number;
  allowSeatAddon?: boolean;
}

// Credit 兑换比例（来自「设置抵扣规则」页统一维护，本表单只读取不编辑）
// 1 元 = CREDITS_PER_YUAN Credit
const CREDITS_PER_YUAN = 25;

// MVP 已接入的支付渠道（其余渠道暂未接入在线支付，置灰不可选）
const ENABLED_PURCHASE_METHODS: PurchaseMethod[] = ["account-balance", "admin-grant"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatMoney = (val: number, currency = "CNY") => {
  const symbol = currency === "USD" ? "$" : "¥";
  return `${symbol}${val.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatCredit = (val: number) => val.toLocaleString("zh-CN");

const validityLabel = (
  unit: ValidityUnit,
  value: number,
  customSeconds = 0
) => {
  if (unit === "custom") return `自定义（${customSeconds}秒）`;
  const unitText = { month: "个月", day: "天", year: "年", hour: "小时", custom: "自定义" }[unit];
  return `${value}${unitText}`;
};

const productTypeLabel = (type: ProductType) => {
  const map = {
    "one-time": "资源包",
    subscription: "订阅包",
  };
  return map[type];
};

const purchaseMethodLabel = (method: PurchaseMethod) => {
  const map = {
    "account-balance": "充值余额",
    alipay: "支付宝",
    "wechat-pay": "微信支付",
    stripe: "Stripe",
    creem: "Creem",
    "admin-grant": "运营后台开通",
  };
  return map[method];
};

const purchaseSubjectLabel = (subject: PurchaseSubject) => {
  const map = { personal: "个人", enterprise: "企业", all: "全部" };
  return map[subject];
};

const purchaseSubjectBadgeClass = (subject: PurchaseSubject) => {
  const map = {
    personal: "border-amber-200 bg-amber-50 text-amber-600",
    enterprise: "border-sky-200 bg-sky-50 text-sky-600",
    all: "border-gray-200 bg-gray-50 text-gray-600",
  };
  return map[subject];
};

const PURCHASE_METHOD_OPTIONS: PurchaseMethod[] = [
  "account-balance",
  "alipay",
  "wechat-pay",
  "stripe",
  "creem",
  "admin-grant",
];

const scopeDisplay = (plan: SubscriptionPlan) => {
  switch (plan.modelScope) {
    case "all":
      return `全部模型 ${ACTIVE_MODELS.length}个`;
    case "filter": {
      const matched = ACTIVE_MODELS.filter((m) => {
        const matchValue = (values: string[], value: string) => {
          if (!values.length) return false;
          const isEmptySelected = values.includes("empty");
          const normalized = value || "empty";
          if (isEmptySelected && normalized === "empty") return true;
          return values.includes(normalized);
        };
        if (!matchValue(plan.modelFilter.region, m.region)) return false;
        if (!matchValue(plan.modelFilter.source, m.source)) return false;
        return true;
      });
      const regionLabels = plan.modelFilter.region
        .filter((v) => v !== "empty")
        .map((v) => REGION_OPTIONS.find((o) => o.value === v)?.label || v);
      const sourceLabels = plan.modelFilter.source
        .filter((v) => v !== "empty")
        .map((v) => SOURCE_OPTIONS.find((o) => o.value === v)?.label || v);
      const labels = [...regionLabels, ...sourceLabels];
      const labelText = labels.length > 0 ? labels.join("+") : "未设置条件";
      return `${labelText} ${matched.length}个`;
    }
    case "specific": {
      const count = plan.selectedModels.filter((id) =>
        ACTIVE_MODELS.some((m) => m.id === id)
      ).length;
      return `自定义 ${count}个`;
    }
    default:
      return "—";
  }
};

const scopeCount = (plan: SubscriptionPlan) => {
  switch (plan.modelScope) {
    case "all":
      return ACTIVE_MODELS.length;
    case "filter": {
      const matched = ACTIVE_MODELS.filter((m) => {
        const matchValue = (values: string[], value: string) => {
          if (!values.length) return false;
          const isEmptySelected = values.includes("empty");
          const normalized = value || "empty";
          if (isEmptySelected && normalized === "empty") return true;
          return values.includes(normalized);
        };
        if (!matchValue(plan.modelFilter.region, m.region)) return false;
        if (!matchValue(plan.modelFilter.source, m.source)) return false;
        return true;
      });
      return matched.length;
    }
    case "specific": {
      return plan.selectedModels.filter((id) =>
        ACTIVE_MODELS.some((m) => m.id === id)
      ).length;
    }
    default:
      return 0;
  }
};

const scopeModels = (plan: SubscriptionPlan) => {
  switch (plan.modelScope) {
    case "all":
      return ACTIVE_MODELS;
    case "filter": {
      return ACTIVE_MODELS.filter((m) => {
        const matchValue = (values: string[], value: string) => {
          if (!values.length) return false;
          const isEmptySelected = values.includes("empty");
          const normalized = value || "empty";
          if (isEmptySelected && normalized === "empty") return true;
          return values.includes(normalized);
        };
        if (!matchValue(plan.modelFilter.region, m.region)) return false;
        if (!matchValue(plan.modelFilter.source, m.source)) return false;
        return true;
      });
    }
    case "specific":
      return ACTIVE_MODELS.filter((m) => plan.selectedModels.includes(m.id));
    default:
      return [];
  }
};

// ─── Mock Models ─────────────────────────────────────────────────────────────

interface AIModel {
  id: string;
  name: string;
  region: string;
  source: string;
  type: string;
  enabled?: boolean;
}

const ALL_MODELS: AIModel[] = ([
  { id: "doubao-seed-2.1-turbo", name: "Doubao-Seed-2.1-turbo", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.1-pro", name: "Doubao-Seed-2.1-pro", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.0-lite", name: "Doubao-Seed-2.0-lite", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.0-pro", name: "Doubao-Seed-2.0-pro", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.0-mini", name: "Doubao-Seed-2.0-mini", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-1.8", name: "Doubao-Seed-1.8", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-evolving", name: "Doubao-Seed-Evolving", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seedance-2.0", name: "Doubao-Seedance-2.0", region: "domestic", source: "official", type: "image" },
  { id: "doubao-seedance-2.0-fast", name: "Doubao-Seedance-2.0-fast", region: "domestic", source: "official", type: "image" },
  { id: "doubao-seedance-2.0-mini", name: "Doubao-Seedance-2.0-mini", region: "domestic", source: "official", type: "image" },
  { id: "doubao-seedream-5.0-lite", name: "Doubao-Seedream-5.0-lite", region: "domestic", source: "official", type: "image" },
  { id: "doubao-seed3d-2.0", name: "Doubao-Seed3D-2.0", region: "domestic", source: "official", type: "image" },
  { id: "doubao-audio-generation-1.0", name: "Doubao-音频生成-1.0", region: "domestic", source: "official", type: "audio" },
  { id: "doubao-voice-synthesis-2.0", name: "Doubao-语音合成-2.0", region: "domestic", source: "official", type: "audio" },
  { id: "doubao-voice-podcast", name: "Doubao-语音播客", region: "domestic", source: "official", type: "audio" },
  { id: "doubao-timbre-design", name: "Doubao-音色设计", region: "domestic", source: "official", type: "audio" },
  { id: "doubao-seed-character", name: "Doubao-Seed-Character", region: "domestic", source: "official", type: "image" },
  { id: "deepseek-v4-pro", name: "DeepSeek-V4-pro", region: "domestic", source: "third-party", type: "llm" },
  { id: "deepseek-v4-flash", name: "DeepSeek-V4-flash", region: "domestic", source: "third-party", type: "llm" },
  { id: "glm-5.2", name: "GLM-5.2", region: "domestic", source: "third-party", type: "llm" },
  { id: "glm-4.7", name: "GLM-4.7", region: "domestic", source: "third-party", type: "llm" },
  { id: "hitem3d-2.0", name: "Hitem3D-2.0", region: "overseas", source: "third-party", type: "image" },
  { id: "hyper3d-gen2", name: "Hyper3D-Gen2", region: "overseas", source: "third-party", type: "image" },
  { id: "gpt-4o", name: "GPT-4o", region: "overseas", source: "third-party", type: "llm" },
  { id: "gpt-4o-mini", name: "GPT-4o-mini", region: "overseas", source: "third-party", type: "llm" },
  { id: "claude-3.5-sonnet", name: "Claude-3.5-Sonnet", region: "overseas", source: "third-party", type: "llm" },
  { id: "gemini-1.5-pro", name: "Gemini-1.5-pro", region: "overseas", source: "third-party", type: "llm" },
  { id: "text-embedding-3-large", name: "Text-Embedding-3-large", region: "overseas", source: "third-party", type: "embedding" },
  { id: "bge-m3", name: "BGE-M3", region: "domestic", source: "third-party", type: "embedding" },
  { id: "doubao-embedding", name: "Doubao-Embedding", region: "domestic", source: "official", type: "embedding" },
  { id: "whisper-3", name: "Whisper-3", region: "overseas", source: "third-party", type: "audio" },
  { id: "stable-diffusion-xl", name: "Stable-Diffusion-XL", region: "overseas", source: "third-party", type: "image" },
  { id: "dall-e-3", name: "DALL-E-3", region: "overseas", source: "third-party", type: "image" },
  { id: "custom-model-a", name: "Custom-Model-A", region: "", source: "official", type: "llm" },
  { id: "custom-model-b", name: "Custom-Model-B", region: "domestic", source: "", type: "llm" },
  { id: "custom-model-c", name: "Custom-Model-C", region: "", source: "", type: "image" },
]).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

const ACTIVE_MODELS = ALL_MODELS.filter((m) => m.enabled !== false);

const REGION_OPTIONS = [
  { value: "domestic", label: "国内" },
  { value: "overseas", label: "海外" },
  { value: "empty", label: "未设置" },
];
const SOURCE_OPTIONS = [
  { value: "official", label: "官方" },
  { value: "third-party", label: "三方" },
  { value: "empty", label: "未设置" },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: "1",
    productType: "one-time",
    name: "基础资源包",
    subtitle: "适合轻度使用",
    price: 300,
    totalQuota: 100_000_000,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: {
      region: REGION_OPTIONS.map((o) => o.value),
      source: SOURCE_OPTIONS.map((o) => o.value),
      type: [],
    },
    selectedModels: ACTIVE_MODELS.map((m) => m.id),
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 6,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 5,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 1,
    status: "active",
    sort: 0,
    benefitDescription: "含 100,000,000 调用积分",
  },
  {
    id: "2",
    productType: "subscription",
    name: "Pro 团队版",
    subtitle: "适合中小团队协作",
    price: 199,
    totalQuota: 50_000_000,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "all",
    modelFilter: { region: [], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "enterprise",
    purchaseLimit: 1,
    purchaseMethods: ["account-balance", "admin-grant"],
    subscriptionKeyLimit: 1,
    status: "active",
    sort: 1,
    benefitDescription: "每席位每月含 50,000,000 调用积分",
    baseKeyLimit: 2,
    minSeats: 3,
    maxSeats: 100,
    allowSeatAddon: true,
  },
  {
    id: "3",
    productType: "subscription",
    name: "个人轻享版",
    subtitle: "个人开发者专属",
    price: 29,
    totalQuota: 5_000_000,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: {
      region: ["domestic"],
      source: ["official"],
      type: [],
    },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "personal",
    purchaseLimit: 1,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 1,
    status: "active",
    sort: 2,
    benefitDescription: "每月含 5,000,000 调用积分",
    baseKeyLimit: 1,
    minSeats: 1,
    maxSeats: 1,
    allowSeatAddon: false,
  },
  {
    id: "4",
    productType: "subscription",
    name: "旗舰企业版",
    subtitle: "大规模团队使用",
    price: 499,
    totalQuota: 200_000_000,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "all",
    modelFilter: { region: [], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "year",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 1,
    purchaseMethods: ["account-balance", "admin-grant"],
    subscriptionKeyLimit: 1,
    status: "inactive",
    sort: 3,
    benefitDescription: "每席位每年含 200,000,000 调用积分",
    baseKeyLimit: 5,
    minSeats: 10,
    maxSeats: 500,
    allowSeatAddon: false,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminSubscriptionManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [scopeDialogPlan, setScopeDialogPlan] = useState<SubscriptionPlan | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [statusTogglePlan, setStatusTogglePlan] = useState<SubscriptionPlan | null>(null);

  const [form, setForm] = useState<SubscriptionPlan>({
    id: "",
    productType: "one-time",
    name: "",
    subtitle: "",
    price: 0,
    totalQuota: 0,
    baseUnitPrice: CREDITS_PER_YUAN,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: {
      region: REGION_OPTIONS.map((o) => o.value),
      source: SOURCE_OPTIONS.map((o) => o.value),
      type: [],
    },
    selectedModels: ACTIVE_MODELS.map((m) => m.id),
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 0,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 1,
    status: "inactive",
    sort: 0,
    benefitDescription: "",
    baseKeyLimit: 1,
    minSeats: 1,
    maxSeats: 50,
    allowSeatAddon: true,
  });

  const resetForm = () => {
    setForm({
      id: "",
      productType: "one-time",
      name: "",
      subtitle: "",
      price: 0,
      totalQuota: 0,
      baseUnitPrice: CREDITS_PER_YUAN,
      currency: "CNY",
      modelScope: "filter",
      modelFilter: {
        region: REGION_OPTIONS.map((o) => o.value),
        source: SOURCE_OPTIONS.map((o) => o.value),
        type: [],
      },
      selectedModels: ACTIVE_MODELS.map((m) => m.id),
      coefficientProfile: "global",
      validityUnit: "month",
      validityValue: 1,
      validityCustomSeconds: 0,
      purchaseSubject: "all",
      purchaseLimit: 0,
      purchaseMethods: ["account-balance"],
      subscriptionKeyLimit: 1,
      status: "inactive",
      sort: 0,
      benefitDescription: "",
      baseKeyLimit: 1,
      minSeats: 1,
      maxSeats: 50,
      allowSeatAddon: true,
    });
  };

  const toggleFilter = (
    key: keyof ModelFilter,
    value: string,
    checked: boolean
  ) => {
    setForm((prev) => {
      const current = [...prev.modelFilter[key]];
      const next = checked
        ? [...current, value]
        : current.filter((v) => v !== value);
      return { ...prev, modelFilter: { ...prev.modelFilter, [key]: next } };
    });
  };

  const toggleModel = (id: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      selectedModels: checked
        ? [...prev.selectedModels, id]
        : prev.selectedModels.filter((m) => m !== id),
    }));
  };

  const togglePurchaseMethod = (method: PurchaseMethod, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      purchaseMethods: checked
        ? [...prev.purchaseMethods, method]
        : prev.purchaseMethods.filter((m) => m !== method),
    }));
  };

  const toggleSelectAll = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      selectedModels: checked ? filteredModels.map((m) => m.id) : [],
    }));
  };

  const openCreate = () => {
    setEditingPlan(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({ ...plan });
    setDialogOpen(true);
  };

  const handleToggleStatus = (plan: SubscriptionPlan) => {
    setStatusTogglePlan(plan);
  };

  const confirmToggleStatus = () => {
    if (!statusTogglePlan) return;
    const plan = statusTogglePlan;
    const newStatus = plan.status === "active" ? "inactive" : "active";
    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, status: newStatus } : p))
    );
    toast({
      title: newStatus === "active" ? "已上架" : "已下架",
      description: `商品「${plan.name}」已${newStatus === "active" ? "上架" : "下架"}`,
    });
    setStatusTogglePlan(null);
  };

  const validateForm = (): boolean => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: "请输入商品名称", variant: "destructive" });
      return false;
    }
    if (name.length > 32) {
      toast({ title: "商品名称不能超过 32 个字符", variant: "destructive" });
      return false;
    }
    if (form.subtitle.length > 64) {
      toast({ title: "商品说明不能超过 64 个字符", variant: "destructive" });
      return false;
    }
    if (form.price < 0) {
      toast({ title: "商品售价不能为负数", variant: "destructive" });
      return false;
    }
    if (form.totalQuota < 0) {
      toast({ title: "Credit 总量不能为负数", variant: "destructive" });
      return false;
    }
    if (form.validityValue < 1) {
      toast({ title: "有效期数值至少为 1", variant: "destructive" });
      return false;
    }
    if (form.modelScope === "specific" && form.selectedModels.length === 0) {
      toast({ title: "请至少选择一个适用模型", variant: "destructive" });
      return false;
    }
    if (form.purchaseMethods.length === 0) {
      toast({ title: "请至少选择一种购买方式", variant: "destructive" });
      return false;
    }
    if (form.productType === "subscription") {
      if ((form.baseKeyLimit ?? 1) < 1) {
        toast({ title: "每席位 Key 数至少为 1", variant: "destructive" });
        return false;
      }
      if ((form.minSeats ?? 1) < 1) {
        toast({ title: "最低席位数至少为 1", variant: "destructive" });
        return false;
      }
      if ((form.maxSeats ?? 1) < (form.minSeats ?? 1)) {
        toast({ title: "席位上限不能低于最低席位数", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setConfirmSubmitOpen(true);
  };

  const confirmSubmit = () => {
    const payload = {
      ...form,
      baseUnitPrice: CREDITS_PER_YUAN,
      // MVP 阶段只保留已接入的支付渠道，过滤掉历史残留的未接入渠道
      purchaseMethods: form.purchaseMethods.filter((m) =>
        ENABLED_PURCHASE_METHODS.includes(m)
      ),
    };
    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) => (p.id === editingPlan.id ? { ...payload, id: editingPlan.id } : p))
      );
      toast({ title: "保存成功", description: `商品「${form.name}」已更新` });
    } else {
      const newId = String(plans.length + 1);
      setPlans((prev) => [...prev, { ...payload, id: newId }]);
      toast({ title: "创建成功", description: `商品「${form.name}」已创建` });
    }
    setConfirmSubmitOpen(false);
    setDialogOpen(false);
    resetForm();
    setEditingPlan(null);
  };

  const updateForm = <K extends keyof SubscriptionPlan>(
    key: K,
    value: SubscriptionPlan[K]
  ) => {
    setForm((prev) => {
      if (key === "modelScope") {
        const scope = value as ModelScope;
        setModelSearch("");
        if (scope === "filter") {
          return {
            ...prev,
            [key]: value,
            selectedModels: [],
            modelFilter: {
              region: REGION_OPTIONS.map((o) => o.value),
              source: SOURCE_OPTIONS.map((o) => o.value),
              type: [],
            },
          };
        }
      }
      // 个人主体订阅：席位固定为 1，不允许加购
      if (key === "purchaseSubject" && value === "personal" && prev.productType === "subscription") {
        return {
          ...prev,
          [key]: value,
          minSeats: 1,
          maxSeats: 1,
          allowSeatAddon: false,
        };
      }
      return { ...prev, [key]: value };
    });
  };

  // 商品 Credit 总量按兑换比例折算的预估人民币价值
  const estimatedValue = useMemo(() => {
    if (form.totalQuota <= 0 || CREDITS_PER_YUAN <= 0) return 0;
    return form.totalQuota / CREDITS_PER_YUAN;
  }, [form.totalQuota]);

  const matchedModels = useMemo(() => {
    return ACTIVE_MODELS.filter((m) => {
      const matchValue = (values: string[], value: string) => {
        if (!values.length) return false;
        const isEmptySelected = values.includes("empty");
        const normalized = value || "empty";
        if (isEmptySelected && normalized === "empty") return true;
        return values.includes(normalized);
      };
      if (!matchValue(form.modelFilter.region, m.region)) return false;
      if (!matchValue(form.modelFilter.source, m.source)) return false;
      return true;
    });
  }, [form.modelFilter]);

  const filteredModels = useMemo(() => {
    const term = modelSearch.trim().toLowerCase();
    if (!term) return ACTIVE_MODELS;
    return ACTIVE_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
    );
  }, [modelSearch]);

  const allSelected = useMemo(() => {
    if (filteredModels.length === 0) return false;
    return filteredModels.every((m) => form.selectedModels.includes(m.id));
  }, [filteredModels, form.selectedModels]);

  const effectiveModels = useMemo(() => {
    const term = modelSearch.trim().toLowerCase();
    if (!term) return ACTIVE_MODELS;
    return ACTIVE_MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
    );
  }, [modelSearch]);

  const effectiveCount = useMemo(() => {
    switch (form.modelScope) {
      case "all":
        return ACTIVE_MODELS.length;
      case "filter":
        return matchedModels.length;
      case "specific":
        return form.selectedModels.filter((id) =>
          ACTIVE_MODELS.some((m) => m.id === id)
        ).length;
      default:
        return ACTIVE_MODELS.length;
    }
  }, [form.modelScope, matchedModels, form.selectedModels]);

  const gridColumns =
    "grid-cols-[56px_minmax(140px,1.4fr)_90px_minmax(90px,0.9fr)_minmax(108px,1fr)_80px_80px_minmax(110px,1.1fr)_minmax(110px,1.1fr)_minmax(100px,1fr)_84px_minmax(112px,1fr)]";
  const visibleHeaders = [
    "ID",
    "商品名称",
    "类型",
    "售价",
    "Credit总量",
    "适用主体",
    "购买上限",
    "有效期",
    "席位配置",
    "购买方式",
    "状态",
    "操作",
  ];

  return (
    <TooltipProvider>
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          商品配置
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          配置权益商品、定价、Credit 与适用范围策略
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          新建权益商品
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => navigate("/admin/console/deduction-rules")}
        >
          <Calculator className="w-4 h-4 mr-1.5" />
          设置抵扣规则
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div
          className={`grid ${gridColumns} gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b items-center`}
        >
          {visibleHeaders.map((h) => (
            <span key={h} className={h === "操作" ? "text-center" : ""}>
              {h}
            </span>
          ))}
        </div>

        {plans.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            暂无权益商品
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`grid ${gridColumns} gap-4 px-4 py-3.5 border-b last:border-0 text-sm items-center hover:bg-muted/30 transition-colors`}
            >
              <span className="text-muted-foreground font-mono text-xs">#{plan.id}</span>
              <span className="font-medium text-foreground truncate" title={plan.name}>
                {plan.name}
                {plan.subtitle && (
                  <span className="block text-xs text-muted-foreground font-normal truncate">
                    {plan.subtitle}
                  </span>
                )}
              </span>
              <span>
                <Badge
                  variant="outline"
                  className={`text-xs gap-1 ${
                    plan.productType === "subscription"
                      ? "border-purple-200 bg-purple-50 text-purple-600"
                      : "border-blue-200 bg-blue-50 text-blue-600"
                  }`}
                >
                  {productTypeLabel(plan.productType)}
                </Badge>
              </span>
              <span className="text-green-600 font-medium tabular-nums">
                {formatMoney(plan.price, plan.currency)}
                {plan.productType === "subscription" && (
                  <span className="block text-[10px] text-muted-foreground font-normal">/席位</span>
                )}
              </span>
              <span className="text-muted-foreground tabular-nums text-xs">
                {formatCredit(plan.totalQuota)}
                {plan.productType === "subscription" && (
                  <span className="block text-[10px] text-muted-foreground/80">/席位/周期</span>
                )}
              </span>
              <span>
                <Badge
                  variant="outline"
                  className={`text-xs ${purchaseSubjectBadgeClass(plan.purchaseSubject)}`}
                >
                  {purchaseSubjectLabel(plan.purchaseSubject)}
                </Badge>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {plan.productType === "subscription" ? (
                  <span className="text-foreground/80">1</span>
                ) : plan.purchaseLimit === 0 ? (
                  <span className="text-foreground/80">不限</span>
                ) : (
                  plan.purchaseLimit
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {validityLabel(plan.validityUnit, plan.validityValue, plan.validityCustomSeconds)}
              </span>
              <span className="text-muted-foreground text-xs">
                {plan.productType === "subscription" ? (
                  plan.purchaseSubject === "personal" ? (
                    <span className="text-amber-600">固定 1 席位</span>
                  ) : (
                    <span>
                      {plan.minSeats ?? 1}~{plan.maxSeats ?? 50}席
                      <span className="block text-[10px] text-muted-foreground/80">
                        {plan.baseKeyLimit ?? 1}Key/席
                        {plan.allowSeatAddon === false ? " · 不可加购" : " · 可加购"}
                      </span>
                    </span>
                  )
                ) : (
                  "—"
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {plan.purchaseMethods.length > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default inline-block max-w-full truncate">
                        {plan.purchaseMethods
                          .slice(0, 2)
                          .map((m) => purchaseMethodLabel(m))
                          .join("、")}
                        {plan.purchaseMethods.length > 2 && (
                          <span className="text-muted-foreground/70 ml-0.5">
                            +{plan.purchaseMethods.length - 2}
                          </span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-0.5 text-xs">
                        {plan.purchaseMethods.map((m) => (
                          <div key={m}>{purchaseMethodLabel(m)}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  "—"
                )}
              </span>
              <span>
                {plan.status === "active" ? (
                  <Badge
                    variant="outline"
                    className="text-xs border-green-200 bg-green-50 text-green-600 gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    上架
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs border-red-200 bg-red-50 text-red-600 gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    下架
                  </Badge>
                )}
              </span>
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => openEdit(plan)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs ${
                    plan.status === "active"
                      ? "text-red-600 hover:text-red-700"
                      : "text-green-600 hover:text-green-700"
                  }`}
                  onClick={() => handleToggleStatus(plan)}
                >
                  {plan.status === "active" ? (
                    <>
                      <Ban className="w-3.5 h-3.5 mr-1" />
                      下架
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      上架
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                  {editingPlan ? "编辑" : "新建"}
                </span>
                <DialogTitle className="text-base font-semibold">
                  {editingPlan ? "编辑权益商品" : "创建权益商品"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-6 space-y-8">
            {/* Section: 基础信息 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">基础信息</p>
                  <p className="text-xs text-muted-foreground">商品类型、名称及上架状态</p>
                </div>
              </div>

              <div className="border rounded-lg p-5 space-y-5 bg-gray-50/30">
                <div className="space-y-2">
                  <Label className="text-sm">
                    商品类型 <span className="text-red-500">*</span>
                  </Label>
                  {editingPlan && (
                    <p className="text-xs text-amber-600">
                      商品类型创建后不可修改，如需更换请创建新商品。
                    </p>
                  )}
                  <RadioGroup
                    value={form.productType}
                    onValueChange={(v) => updateForm("productType", v as ProductType)}
                    className="flex items-center gap-6"
                    disabled={!!editingPlan}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="one-time" id="pt-onetime" />
                      <Label htmlFor="pt-onetime" className="text-sm font-normal cursor-pointer">
                        资源包
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="subscription" id="pt-subscription" />
                      <Label
                        htmlFor="pt-subscription"
                        className="text-sm font-normal cursor-pointer"
                      >
                        订阅包
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      商品名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="例如：基础资源包"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      className="h-10 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">商品说明</Label>
                    <Input
                      placeholder="例如：适合轻度使用"
                      value={form.subtitle}
                      onChange={(e) => updateForm("subtitle", e.target.value)}
                      className="h-10 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">商品权益描述</Label>
                  <Textarea
                    placeholder={`例如：含 ${form.totalQuota.toLocaleString()} 调用积分，支持全模型调用`}
                    value={form.benefitDescription}
                    onChange={(e) => updateForm("benefitDescription", e.target.value)}
                    rows={2}
                    className="bg-white resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    积分数量建议与「Credit 总量」保持一致
                  </p>
                </div>
              </div>
            </div>

            {/* Section: 基础价格 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">基础价格</p>
                  <p className="text-xs text-muted-foreground">设置售价与 Credit 总量</p>
                </div>
              </div>

              <div className="border rounded-lg p-5 bg-gray-50/30">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      商品售价 <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.price}
                        onChange={(e) => updateForm("price", parseFloat(e.target.value) || 0)}
                        className="h-10 bg-white pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {form.currency}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.productType === "subscription"
                        ? "每席位价格"
                        : "用户购买时实际扣除的金额"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">
                      Credit 总量 <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={form.totalQuota}
                        onChange={(e) =>
                          updateForm("totalQuota", parseInt(e.target.value) || 0)
                        }
                        className="h-10 bg-white pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        Credit
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.productType === "subscription"
                        ? "每席位每周期获得的调用积分"
                        : "购买后获得的调用积分数量"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">预估价值</Label>
                    <div className="h-10 flex items-center px-3 border rounded-md bg-muted/40 text-sm">
                      <span className="font-medium text-foreground">
                        {formatMoney(estimatedValue, form.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      按 Credit 兑换比例自动计算
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: 权益周期 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">权益周期</p>
                  <p className="text-xs text-muted-foreground">
                    设置 Credit 有效期
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-5 space-y-5 bg-gray-50/30">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      有效期单位 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.validityUnit}
                      onValueChange={(v) => updateForm("validityUnit", v as ValidityUnit)}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="选择单位" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">年</SelectItem>
                        <SelectItem value="month">月</SelectItem>
                        <SelectItem value="day">日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">
                      有效期数值 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.validityValue}
                      onChange={(e) => updateForm("validityValue", parseInt(e.target.value) || 1)}
                      className="h-10 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: 购买规则 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">购买规则</p>
                  <p className="text-xs text-muted-foreground">限制购买主体、次数及企业使用规则</p>
                </div>
              </div>

              <div className="border rounded-lg p-5 space-y-5 bg-gray-50/30">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">支持主体</Label>
                    <RadioGroup
                      value={form.purchaseSubject}
                      onValueChange={(v) => updateForm("purchaseSubject", v as PurchaseSubject)}
                      className="flex items-center gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="personal" id="sub-personal" />
                        <Label htmlFor="sub-personal" className="text-sm font-normal cursor-pointer">
                          个人
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="enterprise" id="sub-enterprise" />
                        <Label
                          htmlFor="sub-enterprise"
                          className="text-sm font-normal cursor-pointer"
                        >
                          企业
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="all" id="sub-all" />
                        <Label htmlFor="sub-all" className="text-sm font-normal cursor-pointer">
                          全部
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {form.productType === "one-time" && (
                    <div className="space-y-2">
                      <Label className="text-sm">购买上限</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.purchaseLimit}
                        onChange={(e) =>
                          updateForm("purchaseLimit", parseInt(e.target.value) || 0)
                        }
                        className="h-10 bg-white"
                      />
                      <p className="text-xs text-muted-foreground">限制单个账户可购买次数，0 表示不限</p>
                    </div>
                  )}
                  {form.productType === "subscription" && (
                    <div className="space-y-2">
                      <Label className="text-sm">购买上限</Label>
                      <Input
                        type="number"
                        value={1}
                        disabled
                        className="h-10 bg-white disabled:opacity-100 disabled:cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">同档位订阅同一时间仅允许 1 个生效</p>
                    </div>
                  )}
                </div>

                {/* 订阅包：席位配置（仅企业/全部主体显示，个人主体默认 1 席位） */}
                {form.productType === "subscription" && form.purchaseSubject !== "personal" && (
                  <div className="space-y-4 pt-2 border-t">
                    <p className="text-sm font-medium text-foreground">席位配置</p>
                    <p className="text-xs text-muted-foreground -mt-3">
                      价格、Credit、Key 数均按「每席位」维度配置，用户购买时选择席位数，总价 = 每席位价格 × 席位数
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm">每席位分配 Key 数</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.baseKeyLimit ?? 1}
                          onChange={(e) =>
                            updateForm("baseKeyLimit", parseInt(e.target.value) || 1)
                          }
                          className="h-10 bg-white"
                        />
                        <p className="text-xs text-muted-foreground">
                          每席位可创建的订阅专用 API Key 数量
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">最低购买席位数</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.minSeats ?? 1}
                          onChange={(e) =>
                            updateForm("minSeats", parseInt(e.target.value) || 1)
                          }
                          className="h-10 bg-white"
                        />
                        <p className="text-xs text-muted-foreground">起购门槛，用户至少需购买此数量席位</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">席位上限</Label>
                        <Input
                          type="number"
                          min={1}
                          value={form.maxSeats ?? 50}
                          onChange={(e) =>
                            updateForm("maxSeats", parseInt(e.target.value) || 50)
                          }
                          className="h-10 bg-white"
                        />
                        <p className="text-xs text-muted-foreground">单订阅最大可购买/加购的席位数</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">允许加购席位</Label>
                          <Switch
                            checked={form.allowSeatAddon ?? true}
                            onCheckedChange={(checked) =>
                              updateForm("allowSeatAddon", checked)
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          关闭后用户订阅生效期间无法加购席位，席位固定为购买时数量
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {form.productType === "subscription" && form.purchaseSubject === "personal" && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      个人订阅不支持席位概念，系统默认按 1 席位处理。
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section: 适用范围 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">适用范围</p>
                  <p className="text-xs text-muted-foreground">配置该商品可用的模型范围</p>
                </div>
              </div>

              <div className="border rounded-lg p-5 space-y-5 bg-gray-50/30">
                <div className="space-y-2">
                  <Label className="text-sm">选择方式</Label>
                  <RadioGroup
                    value={form.modelScope}
                    onValueChange={(v) => updateForm("modelScope", v as ModelScope)}
                    className="flex items-center gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="filter" id="ms-filter" />
                      <Label htmlFor="ms-filter" className="text-sm font-normal cursor-pointer">
                        条件筛选
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific" id="ms-specific" />
                      <Label htmlFor="ms-specific" className="text-sm font-normal cursor-pointer">
                        自定义选择
                      </Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    {form.modelScope === "filter" &&
                      "按筛选规则自动匹配模型更新，取消勾选会排除对应模型。"}
                    {form.modelScope === "specific" &&
                      "仅对当前勾选模型生效，新模型需手动添加。"}
                  </p>
                </div>

                {form.modelScope === "filter" && (
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b pb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground">模型区域</span>
                        <div className="flex items-center gap-3">
                          {REGION_OPTIONS.map((o) => (
                            <div key={o.value} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`region-${o.value}`}
                                checked={form.modelFilter.region.includes(o.value)}
                                onCheckedChange={(checked) =>
                                  toggleFilter("region", o.value, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`region-${o.value}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground">模型来源</span>
                        <div className="flex items-center gap-3">
                          {SOURCE_OPTIONS.map((o) => (
                            <div key={o.value} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`source-${o.value}`}
                                checked={form.modelFilter.source.includes(o.value)}
                                onCheckedChange={(checked) =>
                                  toggleFilter("source", o.value, checked === true)
                                }
                              />
                              <Label
                                htmlFor={`source-${o.value}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {o.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm">
                      <span className="font-medium">可用模型（{ACTIVE_MODELS.length}）</span>
                      <span className="mx-2 text-muted-foreground">/</span>
                      <span className="font-medium text-blue-600">
                        生效模型（{effectiveCount}）
                      </span>
                    </div>
                  </div>

                  {form.modelScope === "specific" && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索模型名称/ID"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>
                  )}

                  <div className="border rounded-md bg-white p-3 max-h-80 overflow-y-auto">
                    {form.modelScope === "specific" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                        <Checkbox
                          id="select-all"
                          checked={allSelected}
                          onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                        />
                        <Label
                          htmlFor="select-all"
                          className="text-sm font-normal cursor-pointer"
                        >
                          全选
                        </Label>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {effectiveModels.map((m) => {
                        const isReadOnly = form.modelScope !== "specific";
                        const checked =
                          form.modelScope === "filter"
                            ? matchedModels.some((mm) => mm.id === m.id)
                            : form.selectedModels.includes(m.id);
                        return (
                          <div key={m.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`model-${m.id}`}
                              checked={checked}
                              disabled={isReadOnly}
                              onCheckedChange={(checked) =>
                                !isReadOnly && toggleModel(m.id, checked === true)
                              }
                            />
                            <Label
                              htmlFor={`model-${m.id}`}
                              className={`text-xs font-normal truncate ${
                                isReadOnly ? "cursor-default text-muted-foreground" : "cursor-pointer"
                              }`}
                              title={m.name}
                            >
                              {m.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                    {effectiveModels.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无匹配模型
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  仅支持配置范围内模型调用抵扣，范围外模型按照正常按量付费规则计费。
                </p>
              </div>
            </div>

            {/* Section: 支付与续费 */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">支付与续费</p>
                  <p className="text-xs text-muted-foreground">配置支付方式及续费策略</p>
                </div>
              </div>

              <div className="border rounded-lg p-5 space-y-5 bg-gray-50/30">
                <div className="space-y-3">
                  <Label className="text-sm">购买方式</Label>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {PURCHASE_METHOD_OPTIONS.map((method) => {
                      const enabled = ENABLED_PURCHASE_METHODS.includes(method);
                      return (
                        <div key={method} className="flex items-center gap-2">
                          <Checkbox
                            id={`pm-${method}`}
                            checked={form.purchaseMethods.includes(method)}
                            disabled={!enabled}
                            onCheckedChange={(checked) =>
                              togglePurchaseMethod(method, checked === true)
                            }
                          />
                          <Label
                            htmlFor={`pm-${method}`}
                            className={`text-sm font-normal ${
                              enabled ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground"
                            }`}
                          >
                            {purchaseMethodLabel(method)}
                            {!enabled && (
                              <span className="ml-1 text-xs text-muted-foreground">（未接入）</span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    前端购买时仅展示已勾选的支付方式；未勾选则该商品不支持对应渠道购买。标注"未接入"的渠道暂不可用。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button variant="outline" className="h-9 px-4" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit}>
              <Package className="w-4 h-4 mr-1.5" />
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit confirmation */}
      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editingPlan ? "确认保存修改？" : "确认创建商品？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editingPlan
                ? `将更新商品「${form.name}」的配置，修改将立即生效。是否确认保存？`
                : `将创建新商品「${form.name}」，创建后默认下架状态，可在列表中手动上架。是否确认提交？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>
              {editingPlan ? "确认保存" : "确认创建"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation */}
      <AlertDialog
        open={statusTogglePlan !== null}
        onOpenChange={(open) => !open && setStatusTogglePlan(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTogglePlan?.status === "active"
                ? `确认下架商品「${statusTogglePlan?.name}」？`
                : `确认上架商品「${statusTogglePlan?.name}」？`}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {statusTogglePlan?.status === "active" ? (
                <p className="text-amber-600">
                  下架后客户端将无法购买该商品，已购买用户的权益不受影响。
                </p>
              ) : (
                <p className="text-blue-600">
                  上架后客户端将展示该商品，用户可正常下单购买。
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className={
                statusTogglePlan?.status === "active"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {statusTogglePlan?.status === "active" ? "确认下架" : "确认上架"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scope Detail Dialog */}
      <Dialog open={scopeDialogPlan !== null} onOpenChange={(open) => !open && setScopeDialogPlan(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-base font-semibold">适用范围模型清单</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {scopeDialogPlan && scopeDisplay(scopeDialogPlan)}
            </p>
            <div className="border rounded-md p-3 max-h-80 overflow-y-auto bg-white">
              {scopeDialogPlan && scopeModels(scopeDialogPlan).length > 0 ? (
                <ul className="space-y-1">
                  {scopeModels(scopeDialogPlan).map((m) => (
                    <li key={m.id} className="text-sm text-muted-foreground">
                      {m.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">暂无模型</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
