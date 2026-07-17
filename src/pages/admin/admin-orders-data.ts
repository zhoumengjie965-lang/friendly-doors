// 后台订单管理 Mock 数据
export type OrderStatus = "pending" | "paid" | "cancelled";
export type ProductType = "subscription" | "one-time" | "test";
export type OrderType = "new" | "renewal";
export type PurchaseMethod = "account-balance" | "alipay" | "wechat-pay" | "online-banking";
export type AccountType = "enterprise" | "personal";

export interface AdminOrderRow {
  id: string;
  orderNo: string;
  buyerName: string; // 购买主体（企业名/用户名）
  accountType: AccountType;
  productName: string;
  productType: ProductType;
  orderType: OrderType;
  subscriptionNo?: string | null; // 关联订阅号（订阅包订单才有）
  amount: number; // 订单金额/实付金额
  // 金额明细
  originalAmount?: number;
  discountAmount?: number;
  voucherDeduction?: number;
  balanceDeduction?: number;
  purchaseMethod: PurchaseMethod | null;
  paymentAccount?: string; // 支付账户脱敏信息
  transactionId?: string; // 第三方支付渠道交易流水号（支付宝/微信/网银支付成功后才有）
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  quantity?: number;
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
};

export const ORDER_TYPE_BADGE: Record<OrderType, string> = {
  new: "text-blue-600 border-blue-200 bg-blue-50",
  renewal: "text-purple-600 border-purple-200 bg-purple-50",
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
    amount: 2999,
    originalAmount: 3999,
    discountAmount: 1000,
    balanceDeduction: 2999,
    purchaseMethod: "account-balance",
    paymentAccount: "企业余额账户（尾号 8821）",
    status: "paid",
    createdAt: "2026-07-14T10:23:18",
    paidAt: "2026-07-14T10:23:25",
    quantity: 1,
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
    quantity: 1,
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
    quantity: 1,
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
    discountAmount: 100,
    voucherDeduction: 100,
    purchaseMethod: "wechat-pay",
    paymentAccount: "微信用户_***明",
    transactionId: "4200002316202607136543210987",
    status: "paid",
    createdAt: "2026-07-13T15:42:11",
    paidAt: "2026-07-13T15:42:50",
    quantity: 1,
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
    quantity: 1,
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
    quantity: 1,
  },
  {
    id: "adm-ord-7",
    orderNo: "ORD20260711001",
    buyerName: "王晓",
    accountType: "personal",
    productName: "Lite 标准版",
    productType: "subscription",
    orderType: "new",
    amount: 999,
    originalAmount: 999,
    purchaseMethod: "account-balance",
    paymentAccount: "个人账户余额",
    status: "paid",
    createdAt: "2026-07-11T14:08:22",
    paidAt: "2026-07-11T14:08:30",
    quantity: 1,
  },
  {
    id: "adm-ord-8",
    orderNo: "ORD20260710001",
    buyerName: "星河互联",
    accountType: "enterprise",
    productName: "Enterprise 轻量版",
    productType: "subscription",
    orderType: "new",
    amount: 899,
    originalAmount: 1199,
    discountAmount: 300,
    purchaseMethod: null,
    status: "cancelled",
    createdAt: "2026-07-10T16:50:00",
    paidAt: null,
    quantity: 1,
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
    quantity: 1,
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
    quantity: 1,
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
