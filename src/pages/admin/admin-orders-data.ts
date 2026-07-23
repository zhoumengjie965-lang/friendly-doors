// 后台订单管理 Mock 数据
export type OrderStatus = "pending" | "paid" | "cancelled";
export type ProductType = "subscription" | "one-time" | "test";
export type OrderType = "new" | "renewal" | "upgrade" | "addon";
export type PurchaseMethod = "account-balance" | "alipay" | "wechat-pay" | "online-banking";
export type AccountType = "enterprise" | "personal";

// 订单行（商品明细）：一个订单可包含多个 AdminOrderItem（组合购买）
export interface AdminOrderItem {
  productName: string;
  productType: ProductType;
  billingMethod?: string; // 计费方式：包年包月 / 一次性
  unitPrice?: number; // 单价（每席/每月 或 每份）
  seats?: number; // 订阅类：购买席位数
  quantity?: number; // 资源包：购买份数
  cycle?: string; // 订阅周期：包月/包季/包年
  duration?: string; // 时长：1个月 / 6个月 / 1年
  validFrom?: string; // 生效时间（ISO）
  validUntil?: string; // 到期时间（ISO）
  subtotal: number; // 实付小计
  originalSubtotal?: number; // 原价小计
  discount?: number; // 优惠金额
}

export interface AdminOrderRow {
  id: string;
  orderNo: string;
  buyerName: string; // 购买主体（企业名/用户名）
  accountType: AccountType;
  productName: string; // 展示名（列表页用，组合订单为"XX 组合套餐"）
  productType: ProductType; // 主商品类型（用于筛选）
  orderType: OrderType;
  subscriptionNo?: string | null; // 关联订阅号（订阅包订单才有）
  amount: number; // 实付金额 = Σ items.subtotal
  // 金额明细（订单层汇总）
  originalAmount?: number; // = Σ items.originalSubtotal
  discountAmount?: number; // = Σ items.discount
  voucherDeduction?: number;
  balanceDeduction?: number;
  purchaseMethod: PurchaseMethod | null;
  paymentAccount?: string; // 支付账户脱敏信息
  transactionId?: string; // 第三方支付渠道交易流水号
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  // 商品明细（支持多行，组合购买时 N 行）
  items: AdminOrderItem[];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待支付",
  paid: "已支付",
  cancelled: "已取消",
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "text-orange-600 border-orange-200 bg-orange-50",
  paid: "bg-green-500 text-white border-green-500 hover:bg-green-600",
  cancelled: "text-gray-500 border-gray-200 bg-gray-50",
};

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  subscription: "订阅包",
  "one-time": "资源包",
  test: "测试包",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  new: "新购",
  renewal: "续费",
  upgrade: "升级",
  addon: "加购",
};

export const ORDER_TYPE_BADGE: Record<OrderType, string> = {
  new: "text-blue-600 border-blue-200 bg-blue-50",
  renewal: "text-purple-600 border-purple-200 bg-purple-50",
  upgrade: "text-emerald-600 border-emerald-200 bg-emerald-50",
  addon: "text-amber-600 border-amber-200 bg-amber-50",
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  enterprise: "企业账户",
  personal: "个人账户",
};

export const PURCHASE_METHOD_LABEL: Record<PurchaseMethod, string> = {
  "account-balance": "充值余额",
  alipay: "支付宝",
  "wechat-pay": "微信支付",
  "online-banking": "网银支付",
};

export const MOCK_ADMIN_ORDERS: AdminOrderRow[] = [
  {
    id: "adm-ord-1",
    orderNo: "ORD20260714001",
    buyerName: "星辰科技",
    accountType: "enterprise",
    productName: "Enterprise 标准版",
    productType: "subscription",
    orderType: "new",
    subscriptionNo: "SUB20260101001",
    amount: 2999,
    originalAmount: 3999,
    discountAmount: 1000,
    balanceDeduction: 2999,
    purchaseMethod: "account-balance",
    paymentAccount: "企业余额账户（尾号 8821）",
    status: "paid",
    createdAt: "2026-07-14T10:23:18",
    paidAt: "2026-07-14T10:23:25",
    items: [
      {
        productName: "Enterprise 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 499.88,
        seats: 8,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-14T10:23:25",
        validUntil: "2026-08-14T10:23:25",
        subtotal: 2999,
        originalSubtotal: 3999,
        discount: 1000,
      },
    ],
  },
  {
    id: "adm-ord-2",
    orderNo: "ORD20260714002",
    buyerName: "未来智能",
    accountType: "enterprise",
    productName: "资源包 500万 Credit",
    productType: "one-time",
    orderType: "new",
    amount: 500,
    originalAmount: 500,
    purchaseMethod: "alipay",
    paymentAccount: "alipay@example.com",
    transactionId: "2026071422001435120001234567",
    status: "paid",
    createdAt: "2026-07-14T11:05:42",
    paidAt: "2026-07-14T11:06:10",
    items: [
      {
        productName: "资源包 500万 Credit",
        productType: "one-time",
        billingMethod: "一次性",
        unitPrice: 500,
        quantity: 1,
        duration: "6个月",
        validFrom: "2026-07-14T11:06:10",
        validUntil: "2027-01-14T11:06:10",
        subtotal: 500,
        originalSubtotal: 500,
        discount: 0,
      },
    ],
  },
  {
    id: "adm-ord-3",
    buyerName: "测试用户",
    accountType: "personal",
    orderNo: "ORD20260714003",
    productName: "测试套餐",
    productType: "test",
    orderType: "new",
    amount: 0,
    originalAmount: 99,
    discountAmount: 99,
    purchaseMethod: null,
    status: "cancelled",
    createdAt: "2026-07-14T12:00:00",
    paidAt: null,
    items: [
      {
        productName: "测试套餐",
        productType: "test",
        billingMethod: "一次性",
        unitPrice: 99,
        quantity: 1,
        subtotal: 0,
        originalSubtotal: 99,
        discount: 99,
      },
    ],
  },
  {
    id: "adm-ord-4",
    orderNo: "ORD20260713001",
    buyerName: "智云数据",
    accountType: "enterprise",
    productName: "Lite 标准版",
    productType: "subscription",
    orderType: "renewal",
    subscriptionNo: "SUB20260720002",
    amount: 999,
    originalAmount: 1199,
    discountAmount: 200,
    voucherDeduction: 200,
    purchaseMethod: "wechat-pay",
    paymentAccount: "微信用户_***明",
    transactionId: "4200002316202607136543210987",
    status: "paid",
    createdAt: "2026-07-13T15:42:11",
    paidAt: "2026-07-13T15:42:50",
    items: [
      {
        productName: "Lite 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 239.80,
        seats: 5,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-13T15:42:50",
        validUntil: "2026-08-13T15:42:50",
        subtotal: 999,
        originalSubtotal: 1199,
        discount: 200,
      },
    ],
  },
  {
    id: "adm-ord-5",
    orderNo: "ORD20260713002",
    buyerName: "李明",
    accountType: "personal",
    productName: "资源包 100万 Credit",
    productType: "one-time",
    orderType: "new",
    amount: 160,
    originalAmount: 160,
    purchaseMethod: "online-banking",
    paymentAccount: "招商银行储蓄卡（尾号 6623）",
    status: "pending",
    createdAt: "2026-07-13T18:20:00",
    paidAt: null,
    items: [
      {
        productName: "资源包 100万 Credit",
        productType: "one-time",
        billingMethod: "一次性",
        unitPrice: 160,
        quantity: 1,
        duration: "6个月",
        subtotal: 160,
        originalSubtotal: 160,
        discount: 0,
      },
    ],
  },
  {
    id: "adm-ord-6",
    orderNo: "ORD20260712001",
    buyerName: "千帆科技",
    accountType: "enterprise",
    productName: "Enterprise 标准版",
    productType: "subscription",
    orderType: "renewal",
    subscriptionNo: "SUB20260310003",
    amount: 2999,
    originalAmount: 3999,
    discountAmount: 1000,
    purchaseMethod: "alipay",
    paymentAccount: "finance@qianfan.com",
    transactionId: "2026071222001435120098765432",
    status: "paid",
    createdAt: "2026-07-12T09:11:33",
    paidAt: "2026-07-12T09:12:05",
    items: [
      {
        productName: "Enterprise 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 333.25,
        seats: 12,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-12T09:12:05",
        validUntil: "2026-08-12T09:12:05",
        subtotal: 2999,
        originalSubtotal: 3999,
        discount: 1000,
      },
    ],
  },
  {
    id: "adm-ord-7",
    orderNo: "ORD20260711001",
    buyerName: "王晓",
    accountType: "personal",
    productName: "Lite 标准版",
    productType: "subscription",
    orderType: "new",
    subscriptionNo: "SUB20260505005",
    amount: 999,
    originalAmount: 999,
    purchaseMethod: "account-balance",
    paymentAccount: "个人账户余额",
    status: "paid",
    createdAt: "2026-07-11T14:08:22",
    paidAt: "2026-07-11T14:08:30",
    items: [
      {
        productName: "Lite 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 333,
        seats: 3,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-11T14:08:30",
        validUntil: "2026-08-11T14:08:30",
        subtotal: 999,
        originalSubtotal: 999,
        discount: 0,
      },
    ],
  },
  {
    id: "adm-ord-8",
    orderNo: "ORD20260710001",
    buyerName: "星河互联",
    accountType: "enterprise",
    productName: "Enterprise 轻量版",
    productType: "subscription",
    orderType: "new",
    subscriptionNo: "SUB20260120006",
    amount: 899,
    originalAmount: 1199,
    discountAmount: 300,
    purchaseMethod: null,
    status: "cancelled",
    createdAt: "2026-07-10T16:50:00",
    paidAt: null,
    items: [
      {
        productName: "Enterprise 轻量版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 599.50,
        seats: 2,
        cycle: "包月",
        duration: "1个月",
        subtotal: 899,
        originalSubtotal: 1199,
        discount: 300,
      },
    ],
  },
  {
    id: "adm-ord-9",
    orderNo: "ORD20260709001",
    buyerName: "创新工场",
    accountType: "enterprise",
    productName: "资源包 500万 Credit",
    productType: "one-time",
    orderType: "new",
    amount: 500,
    originalAmount: 500,
    purchaseMethod: "wechat-pay",
    paymentAccount: "微信用户_***峰",
    transactionId: "4200002316202607091234567890",
    status: "paid",
    createdAt: "2026-07-09T10:02:18",
    paidAt: "2026-07-09T10:02:49",
    items: [
      {
        productName: "资源包 500万 Credit",
        productType: "one-time",
        billingMethod: "一次性",
        unitPrice: 500,
        quantity: 1,
        duration: "6个月",
        validFrom: "2026-07-09T10:02:49",
        validUntil: "2027-01-09T10:02:49",
        subtotal: 500,
        originalSubtotal: 500,
        discount: 0,
      },
    ],
  },
  {
    id: "adm-ord-10",
    orderNo: "ORD20260708001",
    buyerName: "赵磊",
    accountType: "personal",
    productName: "测试套餐",
    productType: "test",
    orderType: "new",
    amount: 0,
    originalAmount: 99,
    discountAmount: 99,
    purchaseMethod: null,
    status: "pending",
    createdAt: "2026-07-08T13:30:00",
    paidAt: null,
    items: [
      {
        productName: "测试套餐",
        productType: "test",
        billingMethod: "一次性",
        unitPrice: 99,
        quantity: 1,
        subtotal: 0,
        originalSubtotal: 99,
        discount: 99,
      },
    ],
  },
  {
    id: "adm-ord-11",
    orderNo: "ORD20260722001",
    buyerName: "星辰科技",
    accountType: "enterprise",
    productName: "Enterprise 组合套餐",
    productType: "subscription",
    orderType: "new",
    subscriptionNo: "SUB20260722001",
    amount: 4198,
    originalAmount: 5398,
    discountAmount: 1200,
    balanceDeduction: 4198,
    purchaseMethod: "account-balance",
    paymentAccount: "企业余额账户（尾号 8821）",
    status: "paid",
    createdAt: "2026-07-22T09:30:00",
    paidAt: "2026-07-22T09:30:15",
    items: [
      {
        productName: "Lite 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 199.80,
        seats: 5,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-22T09:30:15",
        validUntil: "2026-08-22T09:30:15",
        subtotal: 999,
        originalSubtotal: 1199,
        discount: 200,
      },
      {
        productName: "Enterprise 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 374.88,
        seats: 8,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-22T09:30:15",
        validUntil: "2026-08-22T09:30:15",
        subtotal: 2999,
        originalSubtotal: 3999,
        discount: 1000,
      },
      {
        productName: "Enterprise 轻量版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 200,
        seats: 1,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-22T09:30:15",
        validUntil: "2026-08-22T09:30:15",
        subtotal: 200,
        originalSubtotal: 200,
        discount: 0,
      },
    ],
  },
  {
    id: "adm-ord-12",
    orderNo: "ORD20260720001",
    buyerName: "星辰科技",
    accountType: "enterprise",
    productName: "Enterprise 标准版",
    productType: "subscription",
    orderType: "upgrade",
    subscriptionNo: "SUB20260101001",
    amount: 1500,
    originalAmount: 1500,
    balanceDeduction: 1500,
    purchaseMethod: "account-balance",
    paymentAccount: "企业余额账户（尾号 8821）",
    status: "paid",
    createdAt: "2026-07-20T14:30:00",
    paidAt: "2026-07-20T14:30:12",
    items: [
      {
        productName: "Enterprise 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 375,
        seats: 4,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-20T14:30:12",
        validUntil: "2026-08-01T00:00:00",
        subtotal: 1500,
        originalSubtotal: 1500,
        discount: 0,
      },
    ],
  },
  {
    id: "adm-ord-13",
    orderNo: "ORD20260721001",
    buyerName: "星辰科技",
    accountType: "enterprise",
    productName: "Enterprise 标准版",
    productType: "subscription",
    orderType: "addon",
    subscriptionNo: "SUB20260101001",
    amount: 600,
    originalAmount: 600,
    balanceDeduction: 600,
    purchaseMethod: "account-balance",
    paymentAccount: "企业余额账户（尾号 8821）",
    status: "paid",
    createdAt: "2026-07-21T10:15:00",
    paidAt: "2026-07-21T10:15:08",
    items: [
      {
        productName: "Enterprise 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 200,
        seats: 3,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-21T10:15:08",
        validUntil: "2026-08-01T00:00:00",
        subtotal: 600,
        originalSubtotal: 600,
        discount: 0,
      },
    ],
  },
];

export const findAdminOrderById = (id: string) =>
  MOCK_ADMIN_ORDERS.find((o) => o.id === id);

export const formatMoney = (n: number | undefined | null) => {
  if (n === undefined || n === null) return "¥0.00";
  return `¥${n.toFixed(2)}`;
};

export const formatDateTime = (s: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
