// 后台权益管理 Mock 数据
import type { UsageLog } from "../resource-subscription/entitlements-data";

export type AccountType = "enterprise" | "personal";
export type EntitlementProductType = "subscription" | "package"; // 权益类型（订阅包/资源包）
export type AdminEntitlementStatus = "active" | "frozen" | "exhausted" | "expired";

// 单次抵扣的计费项拆分（仅后台使用）
export interface BillingItem {
  name: string; // 计费项名称，如 输入Token / 输出Token / 缓存Token
  unit: string; // 计费单位，如 tokens
  usage: number; // 用量
  coefficient: number; // 计费系数
  deducted: number; // 本项抵扣额度（= usage * coefficient）
}

export interface AdminUsageLog extends UsageLog {
  breakdown?: BillingItem[]; // 计费拆分（可选，聚合展示时不展示）
}

export interface AdminEntitlement {
  id: string;
  // 来源商品
  productId: string;
  productName: string;
  productType: EntitlementProductType;
  // 购买主体
  ownerId: string;
  ownerName: string; // 企业名 / 用户名
  accountType: AccountType;
  // 来源订单
  orderId: string;
  // 额度
  quotaRule: "periodic" | "one-time"; // 每月重置 / 一次性
  totalQuota: number;
  remainingQuota: number;
  periodTotalQuota?: number;
  periodRemainingQuota?: number;
  nextResetAt?: string;
  // 生命周期
  createdAt: string; // 创建时间（即购买/发放时间）
  effectiveAt: string;
  expiresAt: string | null;
  status: AdminEntitlementStatus;
  remark: string;
  // 抵扣明细
  usageLogs: AdminUsageLog[];
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  enterprise: "企业账户",
  personal: "个人账户",
};

export const PRODUCT_TYPE_LABEL: Record<EntitlementProductType, string> = {
  subscription: "订阅包",
  package: "资源包",
};

export const STATUS_LABEL: Record<AdminEntitlementStatus, string> = {
  active: "生效中",
  frozen: "已冻结",
  exhausted: "已用完",
  expired: "已过期",
};

export const STATUS_BADGE: Record<AdminEntitlementStatus, string> = {
  active: "bg-green-50 text-green-600 border-green-200",
  frozen: "bg-orange-50 text-orange-600 border-orange-200",
  exhausted: "bg-gray-50 text-gray-500 border-gray-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

export const QUOTA_RULE_LABEL: Record<"periodic" | "one-time", string> = {
  periodic: "每月重置",
  "one-time": "一次性额度",
};

// 复用用户侧 mock 数据的抵扣明细（后台扩展 breakdown）
const LOGS_ENT001: AdminUsageLog[] = [
  {
    time: "2026-07-14T16:42:05", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.1-pro",
    beforeRemaining: 625_250_000, deducted: 1_800_000, afterRemaining: 623_450_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 1_200_000, coefficient: 1, deducted: 1_200_000 },
      { name: "输出Token", unit: "tokens", usage: 250_000, coefficient: 2, deducted: 500_000 },
      { name: "缓存Token", unit: "tokens", usage: 200_000, coefficient: 0.5, deducted: 100_000 },
    ],
  },
  {
    time: "2026-07-14T14:18:33", apiKeyName: "生产环境-主Key", model: "DeepSeek-V4-pro",
    beforeRemaining: 640_500_000, deducted: 15_250_000, afterRemaining: 625_250_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 9_000_000, coefficient: 1, deducted: 9_000_000 },
      { name: "输出Token", unit: "tokens", usage: 2_500_000, coefficient: 2.5, deducted: 6_250_000 },
    ],
  },
  {
    time: "2026-07-13T10:05:22", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.1-pro",
    beforeRemaining: 652_000_000, deducted: 11_500_000, afterRemaining: 640_500_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 7_000_000, coefficient: 1, deducted: 7_000_000 },
      { name: "输出Token", unit: "tokens", usage: 1_500_000, coefficient: 3, deducted: 4_500_000 },
    ],
  },
  {
    time: "2026-07-12T09:30:11", apiKeyName: "生产环境-主Key", model: "DeepSeek-V4-pro",
    beforeRemaining: 668_000_000, deducted: 16_000_000, afterRemaining: 652_000_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 10_000_000, coefficient: 1, deducted: 10_000_000 },
      { name: "输出Token", unit: "tokens", usage: 2_000_000, coefficient: 3, deducted: 6_000_000 },
    ],
  },
  {
    time: "2026-07-10T11:48:50", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.1-pro",
    beforeRemaining: 685_000_000, deducted: 17_000_000, afterRemaining: 668_000_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 10_000_000, coefficient: 1, deducted: 10_000_000 },
      { name: "输出Token", unit: "tokens", usage: 3_500_000, coefficient: 2, deducted: 7_000_000 },
    ],
  },
];
const LOGS_ENT002: AdminUsageLog[] = [
  {
    time: "2026-07-14T17:20:18", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 198_500_000, deducted: 180_000, afterRemaining: 198_320_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 100_000, coefficient: 1, deducted: 100_000 },
      { name: "输出Token", unit: "tokens", usage: 40_000, coefficient: 2, deducted: 80_000 },
    ],
  },
  {
    time: "2026-07-14T15:44:02", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 199_880_000, deducted: 1_380_000, afterRemaining: 198_500_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 900_000, coefficient: 1, deducted: 900_000 },
      { name: "输出Token", unit: "tokens", usage: 240_000, coefficient: 2, deducted: 480_000 },
    ],
  },
  {
    time: "2026-07-14T11:02:55", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 210_000_000, deducted: 10_120_000, afterRemaining: 199_880_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 8_000_000, coefficient: 1, deducted: 8_000_000 },
      { name: "输出Token", unit: "tokens", usage: 1_060_000, coefficient: 2, deducted: 2_120_000 },
    ],
  },
  {
    time: "2026-07-14T09:16:00", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 264_000_000, deducted: 54_000_000, afterRemaining: 210_000_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 30_000_000, coefficient: 1, deducted: 30_000_000 },
      { name: "输出Token", unit: "tokens", usage: 12_000_000, coefficient: 2, deducted: 24_000_000 },
    ],
  },
];
const LOGS_ENT003: AdminUsageLog[] = [
  {
    time: "2026-07-14T10:23:18", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 3_370_000, deducted: 120_000, afterRemaining: 3_250_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 80_000, coefficient: 1, deducted: 80_000 },
      { name: "输出Token", unit: "tokens", usage: 20_000, coefficient: 2, deducted: 40_000 },
    ],
  },
  {
    time: "2026-07-14T09:15:02", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 3_458_000, deducted: 88_000, afterRemaining: 3_370_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 60_000, coefficient: 1, deducted: 60_000 },
      { name: "输出Token", unit: "tokens", usage: 14_000, coefficient: 2, deducted: 28_000 },
    ],
  },
  {
    time: "2026-07-13T22:30:01", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 3_494_000, deducted: 36_000, afterRemaining: 3_458_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 20_000, coefficient: 1, deducted: 20_000 },
      { name: "缓存Token", unit: "tokens", usage: 32_000, coefficient: 0.5, deducted: 16_000 },
    ],
  },
];
const LOGS_ENT005: AdminUsageLog[] = [
  {
    time: "2026-07-13T08:12:44", apiKeyName: "测试环境-Key", model: "GLM-5.2",
    beforeRemaining: 120_000, deducted: 120_000, afterRemaining: 0,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 80_000, coefficient: 1, deducted: 80_000 },
      { name: "输出Token", unit: "tokens", usage: 20_000, coefficient: 2, deducted: 40_000 },
    ],
  },
  {
    time: "2026-07-12T19:33:07", apiKeyName: "测试环境-Key", model: "GLM-5.2",
    beforeRemaining: 310_000, deducted: 190_000, afterRemaining: 120_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 120_000, coefficient: 1, deducted: 120_000 },
      { name: "输出Token", unit: "tokens", usage: 35_000, coefficient: 2, deducted: 70_000 },
    ],
  },
  {
    time: "2026-07-12T11:20:18", apiKeyName: "测试环境-Key", model: "GLM-5.2",
    beforeRemaining: 540_000, deducted: 230_000, afterRemaining: 310_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 150_000, coefficient: 1, deducted: 150_000 },
      { name: "输出Token", unit: "tokens", usage: 40_000, coefficient: 2, deducted: 80_000 },
    ],
  },
  {
    time: "2026-07-11T16:45:52", apiKeyName: "生产环境-主Key", model: "GLM-5.2",
    beforeRemaining: 780_000, deducted: 240_000, afterRemaining: 540_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 160_000, coefficient: 1, deducted: 160_000 },
      { name: "输出Token", unit: "tokens", usage: 40_000, coefficient: 2, deducted: 80_000 },
    ],
  },
  {
    time: "2026-07-10T14:22:03", apiKeyName: "生产环境-主Key", model: "GLM-5.2",
    beforeRemaining: 1_000_000, deducted: 220_000, afterRemaining: 780_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 140_000, coefficient: 1, deducted: 140_000 },
      { name: "输出Token", unit: "tokens", usage: 40_000, coefficient: 2, deducted: 80_000 },
    ],
  },
];
const LOGS_ENT006: AdminUsageLog[] = [
  {
    time: "2026-07-05T15:29:48", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 42_580_000, deducted: 400_000, afterRemaining: 42_180_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 300_000, coefficient: 1, deducted: 300_000 },
      { name: "输出Token", unit: "tokens", usage: 50_000, coefficient: 2, deducted: 100_000 },
    ],
  },
  {
    time: "2026-07-04T10:15:22", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 58_000_000, deducted: 15_420_000, afterRemaining: 42_580_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 10_000_000, coefficient: 1, deducted: 10_000_000 },
      { name: "输出Token", unit: "tokens", usage: 2_710_000, coefficient: 2, deducted: 5_420_000 },
    ],
  },
  {
    time: "2026-07-02T14:08:36", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite",
    beforeRemaining: 80_000_000, deducted: 22_000_000, afterRemaining: 58_000_000,
    breakdown: [
      { name: "输入Token", unit: "tokens", usage: 14_000_000, coefficient: 1, deducted: 14_000_000 },
      { name: "输出Token", unit: "tokens", usage: 4_000_000, coefficient: 2, deducted: 8_000_000 },
    ],
  },
];

export const MOCK_ADMIN_ENTITLEMENTS: AdminEntitlement[] = [
  {
    id: "ENT202607140001",
    productId: "SUB-ENT-STD",
    productName: "Enterprise 标准版（月付）",
    productType: "subscription",
    ownerId: "ent_001",
    ownerName: "星辰科技有限公司",
    accountType: "enterprise",
    orderId: "ORD20260714001",
    quotaRule: "periodic",
    totalQuota: 937_000_000,
    remainingQuota: 623_450_000,
    periodTotalQuota: 937_000_000,
    periodRemainingQuota: 623_450_000,
    nextResetAt: "2026-08-01T00:00:00",
    createdAt: "2026-07-01T00:00:00",
    effectiveAt: "2026-07-01T00:00:00",
    expiresAt: "2026-08-01T00:00:00",
    status: "active",
    remark: "每月重置",
    usageLogs: LOGS_ENT001,
  },
  {
    id: "ENT202607140002",
    productId: "SUB-LITE-STD",
    productName: "Lite 标准版（月付）",
    productType: "subscription",
    ownerId: "user_002",
    ownerName: "李四",
    accountType: "personal",
    orderId: "ORD20260714002",
    quotaRule: "periodic",
    totalQuota: 264_000_000,
    remainingQuota: 198_320_000,
    periodTotalQuota: 264_000_000,
    periodRemainingQuota: 198_320_000,
    nextResetAt: "2026-08-14T09:15:40",
    createdAt: "2026-07-14T09:15:40",
    effectiveAt: "2026-07-14T09:15:40",
    expiresAt: "2026-08-14T09:15:40",
    status: "active",
    remark: "每月重置",
    usageLogs: LOGS_ENT002,
  },
  {
    id: "ENT202607130003",
    productId: "PKG-500W",
    productName: "资源包 500万 Credit",
    productType: "package",
    ownerId: "ent_002",
    ownerName: "智云数据科技",
    accountType: "enterprise",
    orderId: "ORD20260714003",
    quotaRule: "one-time",
    totalQuota: 5_000_000,
    remainingQuota: 3_250_000,
    createdAt: "2026-07-13T16:42:58",
    effectiveAt: "2026-07-13T16:42:58",
    expiresAt: "2027-01-13T16:42:58",
    status: "active",
    remark: "—",
    usageLogs: LOGS_ENT003,
  },
  {
    id: "ENT202607140004",
    productId: "PKG-DOM-300W",
    productName: "国产模型实时推理 300W",
    productType: "package",
    ownerId: "user_003",
    ownerName: "王五",
    accountType: "personal",
    orderId: "ORD20260714004",
    quotaRule: "one-time",
    totalQuota: 3_000_000,
    remainingQuota: 3_000_000,
    createdAt: "2026-07-14T14:00:00",
    effectiveAt: "2026-07-14T14:00:00",
    expiresAt: "2027-01-14T14:00:00",
    status: "active",
    remark: "—",
    usageLogs: [],
  },
  {
    id: "ENT202607100005",
    productId: "PKG-100W",
    productName: "资源包 100万 Credit",
    productType: "package",
    ownerId: "ent_003",
    ownerName: "启明智能科技",
    accountType: "enterprise",
    orderId: "ORD20260710001",
    quotaRule: "one-time",
    totalQuota: 1_000_000,
    remainingQuota: 0,
    createdAt: "2026-07-10T11:08:30",
    effectiveAt: "2026-07-10T11:08:30",
    expiresAt: "2027-01-10T11:08:30",
    status: "exhausted",
    remark: "—",
    usageLogs: LOGS_ENT005,
  },
  {
    id: "ENT202606050006",
    productId: "SUB-ENT-LITE",
    productName: "Enterprise 轻量版（月付）",
    productType: "subscription",
    ownerId: "user_004",
    ownerName: "赵六",
    accountType: "personal",
    orderId: "ORD20260705002",
    quotaRule: "periodic",
    totalQuota: 264_000_000,
    remainingQuota: 0,
    periodTotalQuota: 264_000_000,
    periodRemainingQuota: 42_180_000,
    nextResetAt: "2026-07-05T15:30:00",
    createdAt: "2026-06-05T15:30:00",
    effectiveAt: "2026-06-05T15:30:00",
    expiresAt: "2026-07-05T15:30:00",
    status: "expired",
    remark: "每月重置",
    usageLogs: LOGS_ENT006,
  },
  {
    id: "ENT202607080007",
    productId: "SUB-ENT-STD",
    productName: "Enterprise 标准版（月付）",
    productType: "subscription",
    ownerId: "ent_004",
    ownerName: "蓝海信息技术",
    accountType: "enterprise",
    orderId: "ORD20260708007",
    quotaRule: "periodic",
    totalQuota: 937_000_000,
    remainingQuota: 412_000_000,
    periodTotalQuota: 937_000_000,
    periodRemainingQuota: 412_000_000,
    nextResetAt: "2026-08-08T00:00:00",
    createdAt: "2026-07-08T10:22:10",
    effectiveAt: "2026-07-08T00:00:00",
    expiresAt: "2026-08-08T00:00:00",
    status: "frozen",
    remark: "风控冻结",
    usageLogs: [],
  },
];

export const findAdminEntitlementById = (id: string): AdminEntitlement | undefined =>
  MOCK_ADMIN_ENTITLEMENTS.find((e) => e.id === id);
