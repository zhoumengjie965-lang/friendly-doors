// 席位制订阅包数据类型与 Mock 数据
// 用于客户端"企业订阅"与"我的订阅"模块

export type SeatSubscriptionStatus = "active" | "expired";
export type SeatStatus = "assigned" | "idle";
export type SeatTier = "lite" | "standard" | "premium";
export type SubscriptionKeyStatus = "active" | "disabled";

export const seatTierLabel: Record<SeatTier, string> = {
  lite: "轻享版",
  standard: "标准版",
  premium: "尊享版",
};

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

// 席位
export interface Seat {
  id: string;            // 席位编号，如 SEAT-001
  memberId: string | null; // 绑定的成员ID，null 表示空闲
  memberName: string | null;
  memberAccount: string | null; // 成员账号（username/手机号/邮箱）
  status: SeatStatus;
  tier: SeatTier;        // 席位档位
  periodQuota: number;   // 本周期额度（credit）
  usedQuota: number;     // 已使用额度
  seatKey?: string | null;        // 席位专属 API Key 完整值，null 表示尚未生成
  seatKeyPreview?: string | null; // Key 脱敏预览，如 sk-tp-***a1b2c3
  seatKeyCreatedAt?: string | null;
}

// 抵扣明细记录
export interface DeductionRecord {
  id: string;              // 记录ID
  time: string;            // 抵扣时间
  seatId: string;          // 席位编号
  seatMemberName: string;  // 席位绑定成员
  apiKey: string;          // API Key（脱敏）
  modelId: string;
  modelName: string;       // 模型名称
  billingItem: string;     // 计费项（输入Token / 输出Token）
  usage: number;           // 用量
  coefficient: number;     // 系数
  deductedCredits: number; // 抵扣Credit
  remainingCredits: number;// 抵扣后剩余
}

// 席位制订阅
export interface SeatSubscription {
  id: string;                     // 订阅ID，如 SUB20260701001
  planName: string;               // 订阅套餐名称
  planId?: string;                // 关联的售卖套餐ID（用于加购席位）
  status: SeatSubscriptionStatus;
  seatCount: number;              // 席位总数
  usedSeats: number;              // 已使用席位数
  autoRenew: boolean;             // 自动续费状态
  currentPeriodStart: string;     // 订阅周期开始（整个订阅）
  currentPeriodEnd: string;       // 订阅周期结束（整个订阅到期）
  nextBillingAt: string | null;   // 下次续费时间
  totalPeriods?: number;          // 总期数（年付=12，季付=3，月付自动续费不填）
  currentPeriodIndex?: number;    // 当前是第几期（从1开始）
  // 套餐详情
  planDetail: {
    totalQuota: number;           // 每席位周期额度
    price: number;                // 每期续费金额
    currency: string;
    modelScope: string;           // 适用范围描述
    features: string[];
  };
  seats: Seat[];
  deductionRecords?: DeductionRecord[]; // 抵扣明细
  orderId?: string;
  subscriptionKeys?: SubscriptionKey[]; // 订阅专用 Key
  keyLimit?: number;              // Key 上限（= 每席位Key数 × 席位数）
  allowSeatAddon?: boolean;       // 是否允许加购席位
}

// ─── 枚举标签 ──────────────────────────────────────────────────────

export const subStatusLabel: Record<SeatSubscriptionStatus, string> = {
  active: "生效中",
  expired: "已过期",
};

export const subStatusClass: Record<SeatSubscriptionStatus, string> = {
  active: "bg-green-50 text-green-600 border-green-200",
  expired: "bg-gray-50 text-gray-500 border-gray-200",
};

export const seatStatusLabel: Record<SeatStatus, string> = {
  assigned: "已分配",
  idle: "空闲",
};

export const seatStatusClass: Record<SeatStatus, string> = {
  assigned: "bg-green-50 text-green-600 border-green-200",
  idle: "bg-gray-50 text-gray-500 border-gray-200",
};

// ─── 工具函数 ──────────────────────────────────────────────────────

import { formatCredit, formatDateTime } from "./shared";

export { formatCredit, formatDateTime };

// 订阅 API 调用基础地址
export const SUBSCRIPTION_BASE_URL = "https://neolink.com/api/v1";

// 订阅支持的模型列表
export const SUBSCRIPTION_SUPPORTED_MODELS: string[] = [
  "Doubao-Seed-2.1-pro",
  "Doubao-Seed-2.0-lite",
  "Doubao-Seedance-2.0",
  "DeepSeek-V4-pro",
  "GPT-4o",
  "Claude-3.5-Sonnet",
  "GLM-5.2",
];

// 计算剩余天数（基于到期时间 ISO 字符串）
export const calcRemainingDays = (endIso: string): number => {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
};

// ─── Mock 数据 ──────────────────────────────────────────────────────

export const MOCK_SEAT_SUBSCRIPTIONS: SeatSubscription[] = [
  {
    id: "SUB20260701001",
    planName: "Enterprise 标准版（席位）",
    planId: "plan-sub-m",
    status: "active",
    seatCount: 10,
    usedSeats: 7,
    autoRenew: true,
    currentPeriodStart: "2026-05-01T00:00:00",
    currentPeriodEnd: "2027-05-01T00:00:00",
    nextBillingAt: "2026-08-01T00:00:00",
    totalPeriods: 12,
    currentPeriodIndex: 3,
    orderId: "ORD20260701010",
    keyLimit: 20,
    allowSeatAddon: true,
    planDetail: {
      totalQuota: 93_700_000,
      price: 2999,
      currency: "CNY",
      modelScope: "国内+海外模型",
      features: [
        "每席位每月 9,370 万 Credit",
        "适用国内+海外模型",
        "限速 300 RPM / 150K TPM",
        "席位成员独立额度，互不影响",
      ],
    },
    seats: [
      { id: "SEAT-001", memberId: "1", memberName: "张三", memberAccount: "zhangsan001", status: "assigned", tier: "standard", periodQuota: 93_700_000, usedQuota: 42_350_000, seatKey: "sk-tp-9f8e7d6c5b4a3210a1b2c3d4e5f67890", seatKeyPreview: "sk-tp-***a1b2c3", seatKeyCreatedAt: "2026-07-01T00:10:00" },
      { id: "SEAT-002", memberId: "2", memberName: "李四", memberAccount: "lisi002", status: "assigned", tier: "standard", periodQuota: 93_700_000, usedQuota: 28_100_000 },
      { id: "SEAT-003", memberId: "6", memberName: "周八", memberAccount: "zhoub@company.com", status: "assigned", tier: "standard", periodQuota: 93_700_000, usedQuota: 65_200_000 },
      { id: "SEAT-004", memberId: "7", memberName: "孙七", memberAccount: "sunqi007", status: "assigned", tier: "premium", periodQuota: 93_700_000, usedQuota: 15_800_000 },
      { id: "SEAT-005", memberId: "9", memberName: "吴九", memberAccount: "wujiu009", status: "assigned", tier: "lite", periodQuota: 93_700_000, usedQuota: 8_900_000 },
      { id: "SEAT-006", memberId: "4", memberName: "赵六", memberAccount: "zhaoliu004", status: "assigned", tier: "lite", periodQuota: 93_700_000, usedQuota: 52_400_000 },
      { id: "SEAT-007", memberId: "5", memberName: "钱十", memberAccount: "qianshi010", status: "assigned", tier: "premium", periodQuota: 93_700_000, usedQuota: 37_600_000 },
      { id: "SEAT-008", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "lite", periodQuota: 93_700_000, usedQuota: 0 },
      { id: "SEAT-009", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "standard", periodQuota: 93_700_000, usedQuota: 0 },
      { id: "SEAT-010", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "premium", periodQuota: 93_700_000, usedQuota: 0 },
    ],
    deductionRecords: [
      { id: "DED-001", time: "2026-07-15T14:32:18", seatId: "SEAT-001", seatMemberName: "张三", apiKey: "ak_prod_***001", modelId: "doubao-seed-2.1-pro", modelName: "Doubao-Seed-2.1-pro", billingItem: "输入Token", usage: 12500, coefficient: 1.0, deductedCredits: 12500, remainingCredits: 51337500 },
      { id: "DED-002", time: "2026-07-15T14:30:05", seatId: "SEAT-001", seatMemberName: "张三", apiKey: "ak_prod_***001", modelId: "doubao-seed-2.1-pro", modelName: "Doubao-Seed-2.1-pro", billingItem: "输出Token", usage: 8200, coefficient: 1.5, deductedCredits: 12300, remainingCredits: 51350000 },
      { id: "DED-003", time: "2026-07-15T13:45:22", seatId: "SEAT-003", seatMemberName: "周八", apiKey: "ak_prod_***003", modelId: "gpt-4o", modelName: "GPT-4o", billingItem: "输入Token", usage: 25000, coefficient: 2.0, deductedCredits: 50000, remainingCredits: 28450000 },
      { id: "DED-004", time: "2026-07-15T13:44:10", seatId: "SEAT-003", seatMemberName: "周八", apiKey: "ak_prod_***003", modelId: "gpt-4o", modelName: "GPT-4o", billingItem: "输出Token", usage: 18000, coefficient: 3.0, deductedCredits: 54000, remainingCredits: 28500000 },
      { id: "DED-005", time: "2026-07-15T11:20:33", seatId: "SEAT-002", seatMemberName: "李四", apiKey: "ak_prod_***002", modelId: "deepseek-v4-pro", modelName: "DeepSeek-V4-pro", billingItem: "输入Token", usage: 15000, coefficient: 1.2, deductedCredits: 18000, remainingCredits: 65582000 },
      { id: "DED-006", time: "2026-07-15T10:15:44", seatId: "SEAT-006", seatMemberName: "赵六", apiKey: "ak_prod_***006", modelId: "claude-3.5-sonnet", modelName: "Claude-3.5-Sonnet", billingItem: "输入Token", usage: 30000, coefficient: 2.5, deductedCredits: 75000, remainingCredits: 41225000 },
      { id: "DED-007", time: "2026-07-15T09:05:12", seatId: "SEAT-004", seatMemberName: "孙七", apiKey: "ak_prod_***004", modelId: "doubao-seed-2.0-lite", modelName: "Doubao-Seed-2.0-lite", billingItem: "输入Token", usage: 8000, coefficient: 0.5, deductedCredits: 4000, remainingCredits: 77896000 },
      { id: "DED-008", time: "2026-07-14T18:30:55", seatId: "SEAT-007", seatMemberName: "钱十", apiKey: "ak_prod_***007", modelId: "glm-5.2", modelName: "GLM-5.2", billingItem: "输出Token", usage: 12000, coefficient: 1.8, deductedCredits: 21600, remainingCredits: 56062400 },
      { id: "DED-009", time: "2026-07-14T16:22:08", seatId: "SEAT-001", seatMemberName: "张三", apiKey: "ak_prod_***001", modelId: "doubao-seed-2.1-pro", modelName: "Doubao-Seed-2.1-pro", billingItem: "输入Token", usage: 20000, coefficient: 1.0, deductedCredits: 20000, remainingCredits: 51362300 },
      { id: "DED-010", time: "2026-07-14T14:10:30", seatId: "SEAT-005", seatMemberName: "吴九", apiKey: "ak_prod_***005", modelId: "doubao-seedance-2.0", modelName: "Doubao-Seedance-2.0", billingItem: "图片生成", usage: 50, coefficient: 500, deductedCredits: 25000, remainingCredits: 84775000 },
    ],
    subscriptionKeys: [
      { id: "SK-SUB-001", name: "生产环境-主Key", keyPreview: "sk-sub-***a1b2c3", keyFull: "sk-sub-9f8e7d6c5b4a3210a1b2c3d4e5f67890", status: "active", createdAt: "2026-07-01T00:05:12", lastUsedAt: "2026-07-15T14:32:18" },
      { id: "SK-SUB-002", name: "测试环境-Key", keyPreview: "sk-sub-***d4e5f6", keyFull: "sk-sub-1234567890abcdef1234567890abcdef", status: "active", createdAt: "2026-07-01T00:06:35", lastUsedAt: "2026-07-13T10:05:22" },
      { id: "SK-SUB-003", name: "备用Key", keyPreview: "sk-sub-***g7h8i9", keyFull: "sk-sub-abcdef0123456789abcdef0123456789", status: "disabled", createdAt: "2026-07-01T00:07:48", lastUsedAt: "2026-07-08T09:15:30" },
    ],
  },
  {
    id: "SUB20260615002",
    planName: "Lite 轻量版（席位）",
    status: "active",
    seatCount: 5,
    usedSeats: 3,
    autoRenew: false,
    currentPeriodStart: "2026-06-15T00:00:00",
    currentPeriodEnd: "2026-09-15T00:00:00",
    nextBillingAt: null,
    totalPeriods: 3,
    currentPeriodIndex: 2,
    orderId: "ORD20260615005",
    planDetail: {
      totalQuota: 26_400_000,
      price: 2499,
      currency: "CNY",
      modelScope: "国内模型",
      features: [
        "每席位每月 2,640 万 Credit",
        "适用国产主流模型",
        "限速 100 RPM / 50K TPM",
      ],
    },
    seats: [
      { id: "SEAT-Q1-001", memberId: "1", memberName: "张三", memberAccount: "zhangsan001", status: "assigned", tier: "standard", periodQuota: 26_400_000, usedQuota: 18_200_000 },
      { id: "SEAT-Q1-002", memberId: "3", memberName: "王五", memberAccount: "wangwu003", status: "assigned", tier: "lite", periodQuota: 26_400_000, usedQuota: 9_500_000 },
      { id: "SEAT-Q1-003", memberId: "8", memberName: "郑十一", memberAccount: "zheng11", status: "assigned", tier: "premium", periodQuota: 26_400_000, usedQuota: 22_100_000 },
      { id: "SEAT-Q1-004", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "lite", periodQuota: 26_400_000, usedQuota: 0 },
      { id: "SEAT-Q1-005", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "standard", periodQuota: 26_400_000, usedQuota: 0 },
    ],
  },
  {
    id: "SUB20260501003",
    planName: "Enterprise 旗舰版（席位）",
    status: "expired",
    seatCount: 20,
    usedSeats: 20,
    autoRenew: false,
    currentPeriodStart: "2025-05-01T00:00:00",
    currentPeriodEnd: "2026-05-01T00:00:00",
    nextBillingAt: null,
    totalPeriods: 12,
    currentPeriodIndex: 12,
    orderId: "ORD20250501001",
    planDetail: {
      totalQuota: 233_000_000,
      price: 69999,
      currency: "CNY",
      modelScope: "全部模型",
      features: [
        "每席位每月 2.33 亿 Credit",
        "适用全平台模型",
        "限速 1000 RPM / 500K TPM",
      ],
    },
    seats: Array.from({ length: 20 }, (_, i) => ({
      id: `SEAT-Y1-${String(i + 1).padStart(3, "0")}`,
      memberId: null,
      memberName: null,
      memberAccount: null,
      status: "idle" as SeatStatus,
      tier: (i % 3 === 0 ? "lite" : i % 3 === 1 ? "standard" : "premium") as SeatTier,
      periodQuota: 233_000_000,
      usedQuota: Math.floor(Math.random() * 200_000_000),
    })),
  },
  {
    id: "SUB20260716011",
    planName: "Enterprise 标准版（席位）",
    planId: "plan-sub-m",
    status: "active",
    seatCount: 8,
    usedSeats: 5,
    autoRenew: true,
    currentPeriodStart: "2026-07-01T00:00:00",
    currentPeriodEnd: "2026-08-01T00:00:00",
    nextBillingAt: "2026-08-01T00:00:00",
    orderId: "ORD20260701011",
    keyLimit: 16,
    allowSeatAddon: true,
    planDetail: {
      totalQuota: 93_700_000,
      price: 2999,
      currency: "CNY",
      modelScope: "国内+海外模型",
      features: [
        "每席位每月 9,370 万 Credit",
        "适用国内+海外模型",
        "限速 300 RPM / 150K TPM",
        "席位成员独立额度，互不影响",
      ],
    },
    seats: [
      { id: "SEAT-PD-001", memberId: "1", memberName: "张三", memberAccount: "zhangsan001", status: "assigned", tier: "standard", periodQuota: 93_700_000, usedQuota: 42_350_000 },
      { id: "SEAT-PD-002", memberId: "2", memberName: "李四", memberAccount: "lisi002", status: "assigned", tier: "standard", periodQuota: 93_700_000, usedQuota: 28_100_000 },
      { id: "SEAT-PD-003", memberId: "3", memberName: "王五", memberAccount: "wangwu003", status: "assigned", tier: "premium", periodQuota: 93_700_000, usedQuota: 15_800_000 },
      { id: "SEAT-PD-004", memberId: "4", memberName: "赵六", memberAccount: "zhaoliu004", status: "assigned", tier: "lite", periodQuota: 93_700_000, usedQuota: 52_400_000 },
      { id: "SEAT-PD-005", memberId: "5", memberName: "钱十", memberAccount: "qianshi010", status: "assigned", tier: "premium", periodQuota: 93_700_000, usedQuota: 37_600_000 },
      { id: "SEAT-PD-006", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "lite", periodQuota: 93_700_000, usedQuota: 0 },
      { id: "SEAT-PD-007", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "standard", periodQuota: 93_700_000, usedQuota: 0 },
      { id: "SEAT-PD-008", memberId: null, memberName: null, memberAccount: null, status: "idle", tier: "premium", periodQuota: 93_700_000, usedQuota: 0 },
    ],
    deductionRecords: [
      { id: "DED-PD-001", time: "2026-07-15T14:32:18", seatId: "SEAT-PD-001", seatMemberName: "张三", apiKey: "ak_prod_***001", modelId: "doubao-seed-2.1-pro", modelName: "Doubao-Seed-2.1-pro", billingItem: "输入Token", usage: 12500, coefficient: 1.0, deductedCredits: 12500, remainingCredits: 51337500 },
      { id: "DED-PD-002", time: "2026-07-14T16:22:08", seatId: "SEAT-PD-001", seatMemberName: "张三", apiKey: "ak_prod_***001", modelId: "deepseek-v4-pro", modelName: "DeepSeek-V4-pro", billingItem: "输入Token", usage: 20000, coefficient: 1.2, deductedCredits: 24000, remainingCredits: 51362300 },
    ],
  },
];

// 可分配的企业成员列表（用于分配席位弹窗）
export interface EnterpriseMember {
  id: string;
  name: string;
  username: string;
  department: string;
}

export const MOCK_ENTERPRISE_MEMBERS: EnterpriseMember[] = [
  { id: "1", name: "张三", username: "zhangsan001", department: "技术部" },
  { id: "2", name: "李四", username: "lisi002", department: "市场部" },
  { id: "3", name: "王五", username: "wangwu003", department: "产品部" },
  { id: "4", name: "赵六", username: "zhaoliu004", department: "技术部" },
  { id: "5", name: "钱十", username: "qianshi010", department: "运营部" },
  { id: "6", name: "周八", username: "zhoub@company.com", department: "技术部" },
  { id: "7", name: "孙七", username: "sunqi007", department: "财务部" },
  { id: "8", name: "郑十一", username: "zheng11", department: "人事部" },
  { id: "9", name: "吴九", username: "wujiu009", department: "技术部" },
  { id: "10", name: "冯十二", username: "feng12", department: "产品部" },
];

export const findSubscriptionById = (id: string): SeatSubscription | undefined =>
  MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === id);
