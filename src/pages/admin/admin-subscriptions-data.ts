// 后台订阅关系管理 Mock 数据
export type SubscriptionStatus = "active" | "expired";
export type AccountType = "enterprise" | "personal";
export type RenewalFailureReason =
  | "insufficient_balance"
  | "card_expired"
  | "bank_rejected"
  | "payment_method_invalid"
  | null;

// 续费历史记录
export interface RenewalHistoryRecord {
  orderNo: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  chargedAt: string;
  result: "success" | "failed";
  failureReason?: RenewalFailureReason;
}

export interface AdminSubscriptionRow {
  id: string;
  subscriptionNo: string; // 订阅编号
  subscriberName: string; // 订阅主体（企业名/用户名）
  accountType: AccountType;
  planName: string; // 套餐名称
  price: number; // 每期续费金额
  currency: string;
  status: SubscriptionStatus;
  autoRenew: boolean; // 是否开启自动续费
  startAt: string; // 首次开通时间
  currentPeriodStart: string; // 当前周期开始
  currentPeriodEnd: string; // 当前周期结束 / 下次续费时间
  lastChargedAt: string | null; // 最近一次扣款时间
  renewalCount: number; // 累计成功续费次数
  latestOrderNo: string | null; // 最近一张续费订单号
  renewalHistory?: RenewalHistoryRecord[]; // 续费历史记录（多条）
  entitlementId: string; // 关联权益ID（1:1，订阅包权益，始终存在）
  paymentMethod: string; // 支付方式描述
}

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "生效中",
  expired: "已过期",
};

export const SUBSCRIPTION_STATUS_BADGE: Record<SubscriptionStatus, string> = {
  active: "bg-green-500 text-white border-green-500 hover:bg-green-600",
  expired: "text-red-600 border-red-200 bg-red-50",
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  enterprise: "企业账户",
  personal: "个人账户",
};

export const RENEWAL_FAILURE_REASON_LABEL: Record<Exclude<RenewalFailureReason, null>, string> = {
  insufficient_balance: "充值余额不足",
  card_expired: "支付卡已过期",
  bank_rejected: "银行风控拦截",
  payment_method_invalid: "支付方式失效",
};

export const MOCK_ADMIN_SUBSCRIPTIONS: AdminSubscriptionRow[] = [
  {
    id: "adm-sub-1",
    subscriptionNo: "SUB20260101001",
    subscriberName: "星辰科技",
    accountType: "enterprise",
    planName: "Enterprise 标准版",
    price: 2999,
    currency: "CNY",
    status: "active",
    autoRenew: true,
    startAt: "2026-01-01T09:00:00",
    currentPeriodStart: "2026-07-01T00:00:00",
    currentPeriodEnd: "2026-08-01T00:00:00",
    lastChargedAt: "2026-07-01T00:00:12",
    renewalCount: 6,
    latestOrderNo: "ORD20260701001",
    entitlementId: "ENT202607140001",
    paymentMethod: "企业余额账户（尾号 8821）",
  },
  {
    id: "adm-sub-2",
    subscriptionNo: "SUB20260720002",
    subscriberName: "智云数据",
    accountType: "enterprise",
    planName: "Lite 标准版",
    price: 2899,
    currency: "CNY",
    status: "active",
    autoRenew: true,
    startAt: "2026-07-20T00:00:00",
    currentPeriodStart: "2026-07-20T00:00:00",
    currentPeriodEnd: "2026-10-20T00:00:00",
    lastChargedAt: "2026-07-15T10:23:45",
    renewalCount: 0,
    latestOrderNo: "ORD20260715002",
    entitlementId: "ENT20260720002",
    paymentMethod: "微信支付自动扣款",
  },
  {
    id: "adm-sub-3",
    subscriptionNo: "SUB20260310003",
    subscriberName: "千帆科技",
    accountType: "enterprise",
    planName: "Enterprise 标准版",
    price: 29990,
    currency: "CNY",
    status: "active",
    autoRenew: true,
    startAt: "2026-03-10T10:00:00",
    currentPeriodStart: "2026-03-10T00:00:00",
    currentPeriodEnd: "2027-03-10T00:00:00",
    lastChargedAt: "2026-03-10T10:00:08",
    renewalCount: 0,
    latestOrderNo: "ORD20260310003",
    entitlementId: "ENT20260310003",
    paymentMethod: "支付宝（finance@qianfan.com）",
  },
  {
    id: "adm-sub-4",
    subscriptionNo: "SUB20260718004",
    subscriberName: "李明",
    accountType: "personal",
    planName: "Lite 标准版",
    price: 99,
    currency: "CNY",
    status: "active",
    autoRenew: true,
    startAt: "2026-07-18T00:00:00",
    currentPeriodStart: "2026-07-18T00:00:00",
    currentPeriodEnd: "2026-08-18T00:00:00",
    lastChargedAt: "2026-07-15T16:42:11",
    renewalCount: 0,
    latestOrderNo: "ORD20260715004",
    entitlementId: "ENT20260718004",
    paymentMethod: "招商银行储蓄卡（尾号 6623）",
  },
  {
    id: "adm-sub-5",
    subscriptionNo: "SUB20260505005",
    subscriberName: "王晓",
    accountType: "personal",
    planName: "Lite 标准版",
    price: 99,
    currency: "CNY",
    status: "expired",
    autoRenew: false,
    startAt: "2026-05-05T11:00:00",
    currentPeriodStart: "2026-06-05T00:00:00",
    currentPeriodEnd: "2026-07-05T00:00:00",
    lastChargedAt: "2026-06-05T00:00:05",
    renewalCount: 1,
    latestOrderNo: "ORD20260605005",
    entitlementId: "ENT20260505005",
    paymentMethod: "个人账户余额",
  },
  {
    id: "adm-sub-6",
    subscriptionNo: "SUB20260120006",
    subscriberName: "星河互联",
    accountType: "enterprise",
    planName: "Enterprise 轻量版",
    price: 899,
    currency: "CNY",
    status: "expired",
    autoRenew: true,
    startAt: "2026-01-20T09:30:00",
    currentPeriodStart: "2026-05-20T00:00:00",
    currentPeriodEnd: "2026-06-20T00:00:00",
    lastChargedAt: "2026-05-20T00:00:09",
    renewalCount: 3,
    latestOrderNo: "ORD20260620006",
    entitlementId: "ENT20260120006",
    paymentMethod: "网银自动扣款（工商银行）",
  },
  {
    id: "adm-sub-7",
    subscriptionNo: "SUB20260601007",
    subscriberName: "未来智能",
    accountType: "enterprise",
    planName: "Enterprise 标准版",
    price: 2999,
    currency: "CNY",
    status: "active",
    autoRenew: true,
    startAt: "2026-06-01T16:00:00",
    currentPeriodStart: "2026-07-01T00:00:00",
    currentPeriodEnd: "2026-08-01T00:00:00",
    lastChargedAt: "2026-07-01T00:00:15",
    renewalCount: 1,
    latestOrderNo: "ORD20260701007",
    entitlementId: "ENT20260601007",
    paymentMethod: "企业余额账户（尾号 1234）",
  },
  {
    id: "adm-sub-8",
    subscriptionNo: "SUB20260228008",
    subscriberName: "赵磊",
    accountType: "personal",
    planName: "Pro 专业版",
    price: 999,
    currency: "CNY",
    status: "active",
    autoRenew: false,
    startAt: "2026-02-28T20:15:00",
    currentPeriodStart: "2026-02-28T00:00:00",
    currentPeriodEnd: "2027-02-28T00:00:00",
    lastChargedAt: "2026-02-28T20:15:33",
    renewalCount: 0,
    latestOrderNo: "ORD20260228008",
    entitlementId: "ENT20260228008",
    paymentMethod: "微信支付",
  },
  {
    id: "adm-sub-9",
    subscriptionNo: "SUB20260410009",
    subscriberName: "创新工场",
    accountType: "enterprise",
    planName: "Lite 标准版",
    price: 999,
    currency: "CNY",
    status: "expired",
    autoRenew: true,
    startAt: "2026-04-10T13:45:00",
    currentPeriodStart: "2026-05-10T00:00:00",
    currentPeriodEnd: "2026-06-10T00:00:00",
    lastChargedAt: "2026-05-10T00:00:07",
    renewalCount: 1,
    latestOrderNo: "ORD20260510009",
    entitlementId: "ENT20260410009",
    paymentMethod: "支付宝（hr@chuangxin.com）",
  },
  {
    id: "adm-sub-10",
    subscriptionNo: "SUB20260305010",
    subscriberName: "周杰",
    accountType: "personal",
    planName: "Lite 标准版",
    price: 99,
    currency: "CNY",
    status: "expired",
    autoRenew: false,
    startAt: "2026-03-05T08:00:00",
    currentPeriodStart: "2026-05-05T00:00:00",
    currentPeriodEnd: "2026-06-05T00:00:00",
    lastChargedAt: "2026-05-05T00:00:03",
    renewalCount: 2,
    latestOrderNo: "ORD20260505010",
    entitlementId: "ENT20260305010",
    paymentMethod: "个人账户余额",
  },
  {
    id: "adm-sub-11",
    subscriptionNo: "SUB20260716011",
    subscriberName: "未来智能",
    accountType: "enterprise",
    planName: "Enterprise 标准版",
    price: 2999,
    currency: "CNY",
    status: "active",
    autoRenew: true,
    startAt: "2026-04-01T09:00:00",
    currentPeriodStart: "2026-07-01T00:00:00",
    currentPeriodEnd: "2026-08-01T00:00:00",
    lastChargedAt: "2026-07-01T00:00:15",
    renewalCount: 3,
    latestOrderNo: "ORD20260701011",
    entitlementId: "ENT202607160008",
    paymentMethod: "企业余额账户（尾号 1234）",
    renewalHistory: [
      { orderNo: "ORD20260701011", periodStart: "2026-07-01T00:00:00", periodEnd: "2026-08-01T00:00:00", amount: 2999, currency: "CNY", chargedAt: "2026-07-01T00:00:15", result: "success" },
      { orderNo: "ORD20260601011", periodStart: "2026-06-01T00:00:00", periodEnd: "2026-07-01T00:00:00", amount: 2999, currency: "CNY", chargedAt: "2026-06-01T00:00:12", result: "success" },
      { orderNo: "ORD20260501011", periodStart: "2026-05-01T00:00:00", periodEnd: "2026-06-01T00:00:00", amount: 2999, currency: "CNY", chargedAt: "2026-05-01T00:00:10", result: "success" },
      { orderNo: "ORD20260401011", periodStart: "2026-04-01T00:00:00", periodEnd: "2026-05-01T00:00:00", amount: 2999, currency: "CNY", chargedAt: "2026-04-01T00:00:08", result: "success" },
    ],
  },
];

export const findAdminSubscriptionById = (id: string) =>
  MOCK_ADMIN_SUBSCRIPTIONS.find((s) => s.id === id);

export const formatMoney = (n: number, currency = "CNY") => {
  const symbol = currency === "USD" ? "$" : "¥";
  return `${symbol}${n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDateTime = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const formatDate = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// 计算订阅周期长度描述（如 "1个月"、"3个月"、"1年"）
export const formatPeriodLength = (startIso: string, endIso: string): string => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "-";
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months <= 0) {
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}天` : "-";
  }
  if (months % 12 === 0) return `${months / 12}年`;
  return `${months}个月`;
};

