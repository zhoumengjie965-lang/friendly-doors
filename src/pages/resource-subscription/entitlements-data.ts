import type { ModelScope, ModelFilter } from "./shared";

export type ProductType = "subscription" | "package";
export type EntitlementSource = "purchase" | "gift" | "admin-grant";
export type EntitlementStatus = "active" | "exhausted" | "expired";
export type SubscriptionKeyStatus = "active" | "disabled";

export interface UsageByModel {
  modelId: string;
  modelName: string;
  calls: number;
  credits: number;
}
export interface UsageLog {
  time: string;
  apiKeyName: string;
  model: string;
  beforeRemaining: number;
  deducted: number;
  afterRemaining: number;
}

// 订阅专用 Key
export interface SubscriptionKey {
  id: string;             // Key ID
  name: string;           // Key 名称
  keyPreview: string;     // Key 脱敏预览，如 sk-sub-***abc1
  keyFull: string;        // 完整 Key（仅创建时返回一次，这里模拟存储）
  status: SubscriptionKeyStatus;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface Entitlement {
  id: string;
  productType: ProductType;
  name: string;
  source: EntitlementSource;
  totalQuota: number;
  remainingQuota: number;
  effectiveAt: string;
  expiresAt: string | null;
  remark: string;
  status: EntitlementStatus;
  orderId?: string;
  modelScope: ModelScope;
  modelFilter: ModelFilter;
  selectedModels: string[];
  usageByModel?: UsageByModel[];
  usageLogs?: UsageLog[];
  autoRenew?: boolean; // 订阅包是否开启自动续费（仅 subscription 类型有意义）
  subscriptionKeys?: SubscriptionKey[]; // 订阅专用 Key（仅订阅包方案B）
  // 订阅专用：席位信息
  seats?: number; // 当前席位数
  keyLimit?: number; // Key 上限（= 每席位Key数 × 席位数）
  planId?: string; // 关联的套餐ID（用于加购席位）
  allowSeatAddon?: boolean; // 是否允许加购席位
}

export const productTypeLabel: Record<ProductType, string> = {
  subscription: "订阅包",
  package: "资源包",
};

export const sourceLabel: Record<EntitlementSource, string> = {
  purchase: "购买",
  gift: "赠送",
  "admin-grant": "手动发放",
};

export const statusLabel: Record<EntitlementStatus, string> = {
  active: "生效中",
  exhausted: "已用完",
  expired: "已过期",
};

export const statusClass: Record<EntitlementStatus, string> = {
  active: "bg-green-50 text-green-600 border-green-200",
  exhausted: "bg-gray-50 text-gray-500 border-gray-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

export const ALL_ENTITLEMENTS: Entitlement[] = [
  {
    id: "ENT202607140001",
    productType: "subscription",
    name: "Enterprise 标准版",
    source: "purchase",
    totalQuota: 187_400_000 * 8, // 8 席位
    remainingQuota: 980_000_000,
    effectiveAt: "2026-07-01T00:00:00",
    expiresAt: "2026-08-01T00:00:00",
    remark: "有效期内可用",
    status: "active",
    orderId: "ORD20260714001",
    autoRenew: true,
    seats: 8,
    keyLimit: 16,
    planId: "plan-sub-m",
    allowSeatAddon: true,
    modelScope: "filter",
    modelFilter: { region: ["domestic", "overseas"], source: [], type: [] },
    selectedModels: [],
    usageByModel: [
      { modelId: "doubao-seed-2.1-pro", modelName: "Doubao-Seed-2.1-pro", calls: 12560, credits: 185_400_000 },
      { modelId: "deepseek-v4-pro", modelName: "DeepSeek-V4-pro", calls: 8420, credits: 128_150_000 },
    ],
    usageLogs: [
      { time: "2026-07-14T16:42:05", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.1-pro", beforeRemaining: 982_000_000, deducted: 2_000_000, afterRemaining: 980_000_000 },
      { time: "2026-07-14T14:18:33", apiKeyName: "生产环境-主Key", model: "DeepSeek-V4-pro", beforeRemaining: 997_000_000, deducted: 15_000_000, afterRemaining: 982_000_000 },
      { time: "2026-07-13T10:05:22", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.1-pro", beforeRemaining: 1_010_000_000, deducted: 13_000_000, afterRemaining: 997_000_000 },
    ],
    subscriptionKeys: [
      { id: "SK-SUB-001", name: "生产环境-主Key", keyPreview: "sk-sub-***a1b2c3", keyFull: "sk-sub-9f8e7d6c5b4a3210a1b2c3d4e5f67890", status: "active", createdAt: "2026-07-01T00:05:12", lastUsedAt: "2026-07-14T16:42:05" },
      { id: "SK-SUB-002", name: "测试环境-Key", keyPreview: "sk-sub-***d4e5f6", keyFull: "sk-sub-1234567890abcdef1234567890abcdef", status: "active", createdAt: "2026-07-01T00:06:35", lastUsedAt: "2026-07-13T10:05:22" },
      { id: "SK-SUB-003", name: "备用Key", keyPreview: "sk-sub-***g7h8i9", keyFull: "sk-sub-abcdef0123456789abcdef0123456789", status: "disabled", createdAt: "2026-07-01T00:07:48", lastUsedAt: "2026-07-08T09:15:30" },
    ],
  },
  {
    id: "ENT202607140002",
    productType: "subscription",
    name: "Enterprise 轻量版",
    source: "purchase",
    totalQuota: 264_000_000, // 1 席位
    remainingQuota: 198_320_000,
    effectiveAt: "2026-07-14T09:15:40",
    expiresAt: "2026-08-14T09:15:40",
    remark: "有效期内可用",
    status: "active",
    orderId: "ORD20260714002",
    autoRenew: false,
    seats: 1,
    keyLimit: 3,
    planId: "plan-sub-s",
    allowSeatAddon: true,
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
    usageLogs: [
      { time: "2026-07-14T17:20:18", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 198_500_000, deducted: 180_000, afterRemaining: 198_320_000 },
      { time: "2026-07-14T15:44:02", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 199_880_000, deducted: 1_380_000, afterRemaining: 198_500_000 },
      { time: "2026-07-14T11:02:55", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 210_000_000, deducted: 10_120_000, afterRemaining: 199_880_000 },
      { time: "2026-07-14T09:16:00", apiKeyName: "个人开发Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 264_000_000, deducted: 54_000_000, afterRemaining: 210_000_000 },
    ],
    subscriptionKeys: [
      { id: "SK-SUB-004", name: "个人开发Key", keyPreview: "sk-sub-***j1k2l3", keyFull: "sk-sub-0123456789abcdef0123456789abcdef", status: "active", createdAt: "2026-07-14T09:16:00", lastUsedAt: "2026-07-14T17:20:18" },
    ],
  },
  {
    id: "ENT202607130003",
    productType: "package",
    name: "资源包 500万 Credit",
    source: "purchase",
    totalQuota: 5_000_000,
    remainingQuota: 3_250_000,
    effectiveAt: "2026-07-13T16:42:58",
    expiresAt: "2027-01-13T16:42:58",
    remark: "—",
    status: "active",
    orderId: "ORD20260714003",
    modelScope: "all",
    modelFilter: { region: [], source: [], type: [] },
    selectedModels: [],
    usageByModel: [
      { modelId: "doubao-seed-2.0-lite", modelName: "Doubao-Seed-2.0-lite", calls: 3400, credits: 1_750_000 },
    ],
    usageLogs: [
      { time: "2026-07-14T10:23:18", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 3_370_000, deducted: 120_000, afterRemaining: 3_250_000 },
      { time: "2026-07-14T09:15:02", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 3_458_000, deducted: 88_000, afterRemaining: 3_370_000 },
      { time: "2026-07-13T22:30:01", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 3_494_000, deducted: 36_000, afterRemaining: 3_458_000 },
    ],
  },
  {
    id: "ENT202607140004",
    productType: "package",
    name: "国产模型实时推理 300W",
    source: "purchase",
    totalQuota: 3_000_000,
    remainingQuota: 3_000_000,
    effectiveAt: "2026-07-14T14:00:00",
    expiresAt: "2027-01-14T14:00:00",
    remark: "—",
    status: "active",
    orderId: "ORD20260714004",
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
    usageLogs: [],
  },
  {
    id: "ENT202607100005",
    productType: "package",
    name: "资源包 100万 Credit",
    source: "purchase",
    totalQuota: 1_000_000,
    remainingQuota: 0,
    effectiveAt: "2026-07-10T11:08:30",
    expiresAt: "2027-01-10T11:08:30",
    remark: "—",
    status: "exhausted",
    orderId: "ORD20260710001",
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
    usageByModel: [
      { modelId: "glm-5.2", modelName: "GLM-5.2", calls: 5200, credits: 1_000_000 },
    ],
    usageLogs: [
      { time: "2026-07-13T08:12:44", apiKeyName: "测试环境-Key", model: "GLM-5.2", beforeRemaining: 120_000, deducted: 120_000, afterRemaining: 0 },
      { time: "2026-07-12T19:33:07", apiKeyName: "测试环境-Key", model: "GLM-5.2", beforeRemaining: 310_000, deducted: 190_000, afterRemaining: 120_000 },
      { time: "2026-07-12T11:20:18", apiKeyName: "测试环境-Key", model: "GLM-5.2", beforeRemaining: 540_000, deducted: 230_000, afterRemaining: 310_000 },
      { time: "2026-07-11T16:45:52", apiKeyName: "生产环境-主Key", model: "GLM-5.2", beforeRemaining: 780_000, deducted: 240_000, afterRemaining: 540_000 },
      { time: "2026-07-10T14:22:03", apiKeyName: "生产环境-主Key", model: "GLM-5.2", beforeRemaining: 1_000_000, deducted: 220_000, afterRemaining: 780_000 },
    ],
  },
  {
    id: "ENT202606050006",
    productType: "subscription",
    name: "Enterprise 轻量版",
    source: "purchase",
    totalQuota: 264_000_000,
    remainingQuota: 0,
    effectiveAt: "2026-06-05T15:30:00",
    expiresAt: "2026-07-05T15:30:00",
    remark: "已过期",
    status: "expired",
    orderId: "ORD20260705002",
    autoRenew: true,
    seats: 1,
    keyLimit: 3,
    planId: "plan-sub-s",
    allowSeatAddon: true,
    modelScope: "filter",
    modelFilter: { region: ["domestic"], source: [], type: [] },
    selectedModels: [],
    usageLogs: [
      { time: "2026-07-05T15:29:48", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 42_580_000, deducted: 400_000, afterRemaining: 42_180_000 },
      { time: "2026-07-04T10:15:22", apiKeyName: "测试环境-Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 58_000_000, deducted: 15_420_000, afterRemaining: 42_580_000 },
      { time: "2026-07-02T14:08:36", apiKeyName: "生产环境-主Key", model: "Doubao-Seed-2.0-lite", beforeRemaining: 80_000_000, deducted: 22_000_000, afterRemaining: 58_000_000 },
    ],
  },
];

export const findEntitlementById = (id: string): Entitlement | undefined =>
  ALL_ENTITLEMENTS.find((e) => e.id === id);
