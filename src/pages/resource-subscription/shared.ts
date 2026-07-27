// 资源与订阅模块共享类型与数据
// 复用后台 AdminSubscriptionManagement.tsx 的 SubscriptionPlan 字段定义

export type ProductType = "one-time" | "subscription" | "test";
export type ValidityUnit = "month" | "day" | "year" | "hour" | "custom";
export type ModelScope = "all" | "filter" | "specific";

export interface ModelFilter {
  region: string[];
  source: string[];
  type: string[];
}
export type PurchaseSubject = "personal" | "enterprise" | "all" | "custom";

export type PurchaseMethod =
  | "account-balance"
  | "alipay"
  | "wechat-pay"
  | "online-banking"
  | "stripe"
  | "creem"
  | "admin-grant";

// 周期档位：包月/包季/包年
export type Cycle = "month" | "quarter" | "year";

// 周期档位展示
export interface CycleOption {
  value: Cycle;
  label: string; // "包月" / "包季" / "包年"
}

export const CYCLE_OPTIONS: CycleOption[] = [
  { value: "month", label: "包月" },
  { value: "quarter", label: "包季" },
  { value: "year", label: "包年" },
];

export interface SubscriptionPlan {
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
  // 定向可见的企业客户 ID 列表（仅 purchaseSubject === "custom" 时生效）
  allowedEnterpriseIds?: string[];
  purchaseLimit: number;
  purchaseMethods: PurchaseMethod[];
  subscriptionKeyLimit: number;
  status: "active" | "inactive";
  sort: number;
  // 客户端展示用扩展字段
  originalPrice?: number;
  discountLabel?: string;
  benefits?: string[];
  // ── 售卖页专用扩展字段 ──────────────────────────────
  // 套餐档位：S / M / B
  tierCode?: "S" | "M" | "B";
  // 是否推荐
  isPopular?: boolean;
  // 一句话定位描述（卡片副标题下方的"企业轻量集成 / 内部工具"）
  positioning?: string;
  // 结构化权益列表
  features?: string[];
  // 不同周期的折扣价与原价（每席位价格）：包月/包季/包年
  cyclePricing?: Partial<Record<Cycle, { originalPrice: number; price: number; discountLabel: string }>>;
  // ── 资源包专用字段 ────────────────────────────────
  // 资源包区域覆盖：domestic / overseas / global
  scope?: "domestic" | "overseas" | "global";
  // 资源包圆角区域标签
  scopeLabel?: string;
  // 资源包有效期（单位：月）
  validityMonths?: number;
  // ── 订阅专用扩展字段 ──────────────────────────────
  // 订阅套餐 RPM 速率上限
  rpmLimit?: number;
  // 订阅套餐 TPM 速率上限（单位：千 Token/分钟）
  tpmLimit?: number;
  // 每席位分配的订阅 Key 数（原 subscriptionKeyLimit 语义重定义为"每席位"）
  baseKeyLimit?: number;
  // 最低购买席位数（起购门槛）
  minSeats?: number;
  // 单订阅最大席位数（上限）
  maxSeats?: number;
  // 是否允许加购席位
  allowSeatAddon?: boolean;
  // ── 商品组 ─────────────────────────────────────────
  // 商品组 ID，同组商品共享此 ID（如 "grp-token-enterprise"）
  groupId?: string;
  // 商品组名称（如 "Token Plan 企业版"、"资源包"）
  groupName?: string;
  // 组内排序（1, 2, 3…），决定同组内档位的展示顺序
  groupSort?: number;
}

export interface AIModel {
  id: string;
  name: string;
  region: string;
  source: string;
  type: string;
  enabled?: boolean;
}

// ─── 模型清单（与后台一致）──────────────────────────────────────────────────

export const ALL_MODELS: AIModel[] = [
  { id: "doubao-seed-2.1-turbo", name: "Doubao-Seed-2.1-turbo", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.1-pro", name: "Doubao-Seed-2.1-pro", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.0-lite", name: "Doubao-Seed-2.0-lite", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.0-pro", name: "Doubao-Seed-2.0-pro", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-2.0-mini", name: "Doubao-Seed-2.0-mini", region: "domestic", source: "official", type: "llm" },
  { id: "doubao-seed-1.8", name: "Doubao-Seed-1.8", region: "domestic", source: "official", type: "llm" },
  { id: "deepseek-v4-pro", name: "DeepSeek-V4-pro", region: "domestic", source: "third-party", type: "llm" },
  { id: "deepseek-v4-flash", name: "DeepSeek-V4-flash", region: "domestic", source: "third-party", type: "llm" },
  { id: "glm-5.2", name: "GLM-5.2", region: "domestic", source: "third-party", type: "llm" },
  { id: "glm-4.7", name: "GLM-4.7", region: "domestic", source: "third-party", type: "llm" },
  { id: "gpt-4o", name: "GPT-4o", region: "overseas", source: "third-party", type: "llm" },
  { id: "gpt-4o-mini", name: "GPT-4o-mini", region: "overseas", source: "third-party", type: "llm" },
  { id: "claude-3.5-sonnet", name: "Claude-3.5-Sonnet", region: "overseas", source: "third-party", type: "llm" },
  { id: "gemini-1.5-pro", name: "Gemini-1.5-pro", region: "overseas", source: "third-party", type: "llm" },
  { id: "doubao-seedance-2.0", name: "Doubao-Seedance-2.0", region: "domestic", source: "official", type: "image" },
  { id: "doubao-seedream-5.0-lite", name: "Doubao-Seedream-5.0-lite", region: "domestic", source: "official", type: "image" },
  { id: "dall-e-3", name: "DALL-E-3", region: "overseas", source: "third-party", type: "image" },
  { id: "stable-diffusion-xl", name: "Stable-Diffusion-XL", region: "overseas", source: "third-party", type: "image" },
  { id: "text-embedding-3-large", name: "Text-Embedding-3-large", region: "overseas", source: "third-party", type: "embedding" },
  { id: "bge-m3", name: "BGE-M3", region: "domestic", source: "third-party", type: "embedding" },
  { id: "doubao-embedding", name: "Doubao-Embedding", region: "domestic", source: "official", type: "embedding" },
  { id: "whisper-3", name: "Whisper-3", region: "overseas", source: "third-party", type: "audio" },
].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

export const ACTIVE_MODELS = ALL_MODELS.filter((m) => m.enabled !== false);

// ─── 工具函数 ────────────────────────────────────────────────────────────

export const formatMoney = (val: number, currency = "CNY") => {
  const symbol = currency === "USD" ? "$" : "¥";
  return `${symbol}${val.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatCredit = (val: number) => val.toLocaleString("zh-CN");

export const validityLabel = (
  unit: ValidityUnit,
  value: number,
  customSeconds = 0
) => {
  if (unit === "custom") return `自定义（${customSeconds}秒）`;
  const unitText: Record<ValidityUnit, string> = {
    month: "个月",
    day: "天",
    year: "年",
    hour: "小时",
    custom: "自定义",
  };
  return `${value}${unitText[unit]}`;
};

export const productTypeLabel = (type: ProductType) => {
  switch (type) {
    case "one-time": return "资源包";
    case "subscription": return "订阅包";
    case "test": return "测试包";
    default: return type;
  }
};

export const purchaseMethodLabel = (method: PurchaseMethod) => {
  const map: Record<PurchaseMethod, string> = {
    "account-balance": "充值余额",
    alipay: "支付宝",
    "wechat-pay": "微信支付",
    "online-banking": "网银支付",
    stripe: "Stripe",
    creem: "Creem",
    "admin-grant": "运营后台开通",
  };
  return map[method];
};

export const purchaseSubjectLabel = (subject: PurchaseSubject) => {
  const map: Record<PurchaseSubject, string> = {
    personal: "个人",
    enterprise: "企业",
    all: "全部",
    custom: "定向",
  };
  return map[subject];
};

// 计算商品生效模型清单
export const scopeModels = (plan: SubscriptionPlan): AIModel[] => {
  switch (plan.modelScope) {
    case "all":
      return ACTIVE_MODELS;
    case "filter": {
      const matchValue = (values: string[], value: string) => {
        if (!values.length) return false;
        const isEmptySelected = values.includes("empty");
        const normalized = value || "empty";
        if (isEmptySelected && normalized === "empty") return true;
        return values.includes(normalized);
      };
      return ACTIVE_MODELS.filter((m) => {
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

export const scopeDisplay = (plan: SubscriptionPlan): string => {
  const models = scopeModels(plan);
  switch (plan.modelScope) {
    case "all":
      return `全部模型 ${ACTIVE_MODELS.length}个`;
    case "filter": {
      const regionMap: Record<string, string> = {
        domestic: "国内",
        overseas: "海外",
        empty: "未设置",
      };
      const sourceMap: Record<string, string> = {
        official: "官方",
        "third-party": "三方",
        empty: "未设置",
      };
      const regionLabels = plan.modelFilter.region
        .filter((v) => v !== "empty")
        .map((v) => regionMap[v] || v);
      const sourceLabels = plan.modelFilter.source
        .filter((v) => v !== "empty")
        .map((v) => sourceMap[v] || v);
      const labels = [...regionLabels, ...sourceLabels];
      const labelText = labels.length > 0 ? labels.join("+") : "未设置条件";
      return `${labelText} ${models.length}个`;
    }
    case "specific":
      return `自定义 ${models.length}个`;
    default:
      return "—";
  }
};

// ─── 模拟数据 ────────────────────────────────────────────────────────────

export const MOCK_PLANS: SubscriptionPlan[] = [
  // ── 一次性资源包（3 类：国内 / 全球 / 海外） ──
  {
    id: "plan-ot-domestic",
    productType: "one-time",
    name: "国内模型资源包",
    subtitle: "适合以国产模型为主的国内业务与高频调用",
    positioning: "适合以国产模型为主的国内业务与高频调用",
    scope: "domestic",
    price: 160,
    originalPrice: 200,
    discountLabel: "8折",
    totalQuota: 1_000_000, // 100 万 Credit
    validityMonths: 6,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
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
    groupId: "grp-resource-pack",
    groupName: "资源包",
    groupSort: 1,
    features: [
      "有效期 6 个月",
      "适用国内模型（豆包、GLM、DeepSeek、Kimi 等）",
      "用完后自动转按量计费",
    ],
  },
  {
    id: "plan-ot-global",
    productType: "one-time",
    name: "全球模型资源包",
    subtitle: "适合国内+海外模型混合调用的多业务与跨境场景",
    positioning: "适合国内+海外模型混合调用的多业务与跨境场景",
    scope: "global",
    scopeLabel: "推荐",
    isPopular: true,
    price: 1_400,
    originalPrice: 1_900,
    discountLabel: "约7.4折",
    totalQuota: 10_000_000, // 1000 万 Credit
    validityMonths: 6,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "all",
    modelFilter: { region: [], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 6,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 5,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 1,
    status: "active",
    sort: 1,
    groupId: "grp-resource-pack",
    groupName: "资源包",
    groupSort: 2,
    features: [
      "有效期 6 个月",
      "覆盖国内与海外模型，推荐多模型、多业务场景",
      "用完后自动转按量计费",
    ],
  },
  {
    id: "plan-ot-overseas",
    productType: "one-time",
    name: "海外模型资源包",
    subtitle: "适合以海外模型为主的生产业务与跨境调用",
    positioning: "适合以海外模型为主的生产业务与跨境调用",
    scope: "overseas",
    price: 1_900,
    originalPrice: 2_400,
    discountLabel: "约7.9折",
    totalQuota: 8_000_000, // 800 万 Credit
    validityMonths: 6,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: { region: ["overseas"], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 6,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 5,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 1,
    status: "active",
    sort: 2,
    groupId: "grp-resource-pack",
    groupName: "资源包",
    groupSort: 3,
    features: [
      "有效期 6 个月",
      "适用海外模型（GPT、Claude、Gemini 等）",
      "用完后自动转按量计费",
    ],
  },

  // ── 订阅计划（3 档：轻量版 / 标准版 / 旗舰版） ──
  // 价格、Credit、Key 数均为「每席位」维度
  // 档位 S：轻量版
  {
    id: "plan-sub-s",
    productType: "subscription",
    name: "Enterprise 轻量版",
    subtitle: "适合国产主流模型的轻量集成与内部工具",
    positioning: "适合国产主流模型的轻量集成与内部工具",
    tierCode: "S",
    isPopular: false,
    price: 899,
    originalPrice: 1_199,
    discountLabel: "约7.5折",
    totalQuota: 264_000_000,
    rpmLimit: 100,
    tpmLimit: 50,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 1,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 3,
    status: "active",
    sort: 100,
    groupId: "grp-token-enterprise",
    groupName: "Token Plan 企业版",
    groupSort: 1,
    // 每席位价格
    cyclePricing: {
      month: { originalPrice: 1_199, price: 899, discountLabel: "约7.5折" },
      quarter: { originalPrice: 3_597, price: 2_499, discountLabel: "约6.9折" },
      year: { originalPrice: 14_388, price: 8_999, discountLabel: "约6.3折" },
    },
    // 席位配置
    baseKeyLimit: 3,
    minSeats: 1,
    maxSeats: 20,
    allowSeatAddon: true,
    features: [
      "每席位含 2.64 亿 Credit/月，有效期内可用",
      "每席位提供 3 个订阅专用 API Key",
      "适用国产主流模型",
      "限速 100 RPM / 50K TPM",
    ],
  },

  // 档位 M：标准版（推荐）
  {
    id: "plan-sub-m",
    productType: "subscription",
    name: "Enterprise 标准版",
    subtitle: "适合日常生产、多业务并行和稳定调用",
    positioning: "适合日常生产、多业务并行和稳定调用",
    tierCode: "M",
    isPopular: true,
    price: 600,
    originalPrice: 800,
    discountLabel: "7.5折",
    totalQuota: 187_400_000,
    rpmLimit: 300,
    tpmLimit: 150,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "filter",
    modelFilter: { region: ["domestic", "overseas"], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 1,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 2,
    status: "active",
    sort: 101,
    groupId: "grp-token-enterprise",
    groupName: "Token Plan 企业版",
    groupSort: 2,
    // 每席位价格
    cyclePricing: {
      month: { originalPrice: 800, price: 600, discountLabel: "7.5折" },
      quarter: { originalPrice: 2_400, price: 1_700, discountLabel: "约7.1折" },
      year: { originalPrice: 9_600, price: 6_000, discountLabel: "约6.3折" },
    },
    // 席位配置
    baseKeyLimit: 2,
    minSeats: 5,
    maxSeats: 100,
    allowSeatAddon: true,
    features: [
      "每席位含 1.874 亿 Credit/月，有效期内可用",
      "每席位提供 2 个订阅专用 API Key",
      "适用全部国产模型及部分海外模型",
      "限速 300 RPM / 150K TPM",
    ],
  },

  // 档位 B：旗舰版
  {
    id: "plan-sub-b",
    productType: "subscription",
    name: "Enterprise 旗舰版",
    subtitle: "适合高频调用、多项目及核心生产业务",
    positioning: "适合高频调用、多项目及核心生产业务",
    tierCode: "B",
    isPopular: false,
    price: 700,
    originalPrice: 1_000,
    discountLabel: "7折",
    totalQuota: 233_000_000,
    rpmLimit: 1000,
    tpmLimit: 500,
    baseUnitPrice: 4,
    currency: "CNY",
    modelScope: "all",
    modelFilter: { region: [], source: [], type: [] },
    selectedModels: [],
    coefficientProfile: "global",
    validityUnit: "month",
    validityValue: 1,
    validityCustomSeconds: 0,
    purchaseSubject: "all",
    purchaseLimit: 1,
    purchaseMethods: ["account-balance"],
    subscriptionKeyLimit: 5,
    status: "active",
    sort: 102,
    groupId: "grp-token-enterprise",
    groupName: "Token Plan 企业版",
    groupSort: 3,
    // 每席位价格
    cyclePricing: {
      month: { originalPrice: 1_000, price: 700, discountLabel: "7折" },
      quarter: { originalPrice: 3_000, price: 2_000, discountLabel: "约6.7折" },
      year: { originalPrice: 12_000, price: 7_000, discountLabel: "约5.8折" },
    },
    // 席位配置
    baseKeyLimit: 5,
    minSeats: 10,
    maxSeats: 500,
    allowSeatAddon: true,
    features: [
      "每席位含 2.33 亿 Credit/月，有效期内可用",
      "每席位提供 5 个订阅专用 API Key",
      "适用全平台模型（含 GPT、Claude 等海外）",
      "限速 1000 RPM / 500K TPM",
    ],
  },
];

// ─── Mock 持仓数据 ────────────────────────────────────────────────────────

export interface ResourcePackage {
  id: string;
  planId: string;
  planName: string;
  source: "purchase" | "admin-grant" | "system-gift" | "test";
  totalQuota: number;
  remainingQuota: number;
  effectiveAt: string;
  expiresAt: string | null;
  status: "pending" | "active" | "exhausted" | "expired" | "unsubscribed";
  modelScope: ModelScope;
  modelFilter: ModelFilter;
  selectedModels: string[];
  orderId?: string;
  usageByModel?: { modelId: string; modelName: string; calls: number; credits: number }[];
  usageLogs?: { time: string; apiKey: string; model: string; credits: number; remaining: number }[];
}

export interface SubscriptionHolding {
  id: string;
  planId: string;
  planName: string;
  // 席位信息
  seats: number;
  // 当前周期
  currentPeriod: {
    start: string;
    end: string;
    totalQuota: number; // = plan.totalQuota × seats
    remainingQuota: number;
  };
  autoRenew: boolean;
  nextBillingAt: string | null;
  keyLimit: number; // = plan.baseKeyLimit × seats
  status: "active" | "expired";
  modelScope: ModelScope;
  modelFilter: ModelFilter;
  selectedModels: string[];
}

// 加购席位记录
export interface SeatAddonRecord {
  id: string;
  subscriptionId: string;
  addonSeats: number;
  amount: number;
  prorationRatio: number;
  effectiveAt: string;
  alignedExpiresAt: string;
  orderId: string;
}

export interface OrderRecord {
  id: string;
  orderNo: string;
  planId: string;
  planName: string;
  productType: ProductType | "renewal";
  amount: number;
  currency: string;
  purchaseMethod: PurchaseMethod;
  status: "pending" | "paid" | "cancelled" | "refunded";
  createdAt: string;
  paidAt: string | null;
}

export const sourceLabel: Record<ResourcePackage["source"], string> = {
  purchase: "购买",
  "admin-grant": "管理员发放",
  "system-gift": "系统赠送",
  test: "测试包",
};

export const orderStatusLabel: Record<OrderRecord["status"], string> = {
  pending: "待支付",
  paid: "已支付",
  cancelled: "已取消",
  refunded: "已退款",
};

export const orderStatusClass: Record<OrderRecord["status"], string> = {
  pending: "bg-orange-50 text-orange-600 border-orange-200",
  paid: "bg-green-50 text-green-600 border-green-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  refunded: "bg-gray-50 text-gray-500 border-gray-200",
};

export const packageStatusLabel: Record<ResourcePackage["status"], string> = {
  pending: "待生效",
  active: "生效中",
  exhausted: "已用完",
  expired: "已过期",
  unsubscribed: "已退订",
};

export const packageStatusClass: Record<ResourcePackage["status"], string> = {
  pending: "bg-orange-50 text-orange-600 border-orange-200",
  active: "bg-green-50 text-green-600 border-green-200",
  exhausted: "bg-gray-50 text-gray-500 border-gray-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
  unsubscribed: "bg-gray-50 text-gray-500 border-gray-200",
};

export const subscriptionStatusLabel: Record<SubscriptionHolding["status"], string> = {
  active: "生效中",
  expired: "已到期",
};

export const subscriptionStatusClass: Record<SubscriptionHolding["status"], string> = {
  active: "bg-green-50 text-green-600 border-green-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

export const MOCK_PACKAGES: ResourcePackage[] = [
  {
    id: "pkg-1",
    planId: "plan-ot-1",
    planName: "资源包",
    source: "purchase",
    totalQuota: 75_000,
    remainingQuota: 48_320,
    effectiveAt: "2026-06-01T00:00:00",
    expiresAt: "2026-12-01T00:00:00",
    status: "active",
    modelScope: "all",
    modelFilter: { region: [], source: [], type: [] },
    selectedModels: [],
    orderId: "ORD20260601001",
    usageByModel: [
      { modelId: "glm-5.2", modelName: "GLM-5.2", calls: 1280, credits: 18_540 },
      { modelId: "gpt-4o-mini", modelName: "GPT-4o-mini", calls: 540, credits: 8_140 },
    ],
    usageLogs: [
      { time: "2026-07-13T09:12:33", apiKey: "ak_prod_001", model: "GLM-5.2", credits: 120, remaining: 48_320 },
      { time: "2026-07-13T08:55:10", apiKey: "ak_prod_001", model: "GLM-5.2", credits: 88, remaining: 48_440 },
      { time: "2026-07-12T22:30:01", apiKey: "ak_prod_002", model: "GPT-4o-mini", credits: 36, remaining: 48_528 },
    ],
  },
  {
    id: "pkg-2",
    planId: "plan-ot-2",
    planName: "资源包-小",
    source: "test",
    totalQuota: 5_000,
    remainingQuota: 5_000,
    effectiveAt: "2026-05-01T00:00:00",
    expiresAt: null,
    status: "active",
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
  },
];

export const MOCK_SUBSCRIPTIONS: SubscriptionHolding[] = [
  {
    id: "sub-1",
    planId: "plan-sub-m",
    planName: "Enterprise 标准版",
    seats: 8,
    currentPeriod: {
      start: "2026-07-01T00:00:00",
      end: "2026-08-01T00:00:00",
      totalQuota: 187_400_000 * 8, // 1,499,200,000
      remainingQuota: 980_000_000,
    },
    autoRenew: true,
    nextBillingAt: "2026-08-01T00:00:00",
    keyLimit: 16, // 2 × 8
    status: "active",
    modelScope: "filter",
    modelFilter: { region: ["domestic", "overseas"], source: [], type: [] },
    selectedModels: [],
  },
];

export const MOCK_ORDERS: OrderRecord[] = [
  {
    id: "ord-1",
    orderNo: "ORD20260701001",
    planId: "plan-sub-2",
    planName: "Lite 套餐（连续包月）",
    productType: "subscription",
    amount: 999,
    currency: "CNY",
    purchaseMethod: "account-balance",
    status: "paid",
    createdAt: "2026-07-01T10:23:18",
    paidAt: "2026-07-01T10:23:25",
  },
  {
    id: "ord-2",
    orderNo: "ORD20260601001",
    planId: "plan-ot-1",
    planName: "资源包",
    productType: "one-time",
    amount: 300,
    currency: "CNY",
    purchaseMethod: "account-balance",
    status: "paid",
    createdAt: "2026-06-01T09:15:02",
    paidAt: "2026-06-01T09:15:10",
  },
  {
    id: "ord-3",
    orderNo: "ORD20260615001",
    planId: "plan-sub-1",
    planName: "Trial 套餐（连续包月）",
    productType: "renewal",
    amount: 199,
    currency: "CNY",
    purchaseMethod: "account-balance",
    status: "cancelled",
    createdAt: "2026-06-15T14:00:00",
    paidAt: null,
  },
];

export const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-");
};

export const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
};
