// 订单管理共享数据与类型
import { formatMoney as sharedFormatMoney, formatDateTime as sharedFormatDateTime } from "./shared";

export type OrderType = "new" | "renewal";
export type OrderStatus = "pending" | "paid" | "cancelled";
export type ProductTypeExt = "subscription" | "one-time" | "test";
export type PurchaseMethodExt =
  | "account-balance"
  | "alipay"
  | "wechat-pay"
  | "online-banking";

export interface OrderRow {
  id: string;
  orderNo: string;
  productName: string;
  productType: ProductTypeExt;
  orderType: OrderType;
  amount: number;
  purchaseMethod: PurchaseMethodExt | null;
  status: OrderStatus;
  createdAt: string; // ISO
  paidAt: string | null; // ISO
  // 金额明细
  originalAmount?: number;
  discountAmount?: number;
  voucherDeduction?: number;
  balanceDeduction?: number; // 余额支付
  // 商品信息
  quantity?: number; // 购买数量
  cycle?: string; // 订阅周期：包月/包季/包年
}

export const MOCK_ORDER_ROWS: OrderRow[] = [
  {
    id: "ord-1",
    orderNo: "ORD20260714001",
    productName: "Enterprise 标准版",
    productType: "subscription",
    orderType: "new",
    amount: 2999,
    originalAmount: 3999,
    discountAmount: 1000,
    balanceDeduction: 2999,
    purchaseMethod: "account-balance",
    status: "paid",
    createdAt: "2026-07-14T10:23:18",
    paidAt: "2026-07-14T10:23:25",
    quantity: 1,
    cycle: "包月",
  },
  {
    id: "ord-2",
    orderNo: "ORD20260714002",
    productName: "Lite 标准版",
    productType: "subscription",
    orderType: "renewal",
    amount: 999,
    originalAmount: 1199,
    discountAmount: 100,
    voucherDeduction: 100,
    purchaseMethod: "alipay",
    status: "paid",
    createdAt: "2026-07-14T09:15:02",
    paidAt: "2026-07-14T09:15:40",
    quantity: 1,
    cycle: "包月",
  },
  {
    id: "ord-3",
    orderNo: "ORD20260714003",
    productName: "资源包 500万 Credit",
    productType: "one-time",
    orderType: "new",
    amount: 500,
    originalAmount: 600,
    discountAmount: 100,
    purchaseMethod: "wechat-pay",
    status: "paid",
    createdAt: "2026-07-13T16:42:11",
    paidAt: "2026-07-13T16:42:58",
    quantity: 1,
  },
  {
    id: "ord-4",
    orderNo: "ORD20260714004",
    productName: "国产模型实时推理 300W",
    productType: "one-time",
    orderType: "new",
    amount: 10.8,
    originalAmount: 10.8,
    discountAmount: 0,
    purchaseMethod: null,
    status: "pending",
    createdAt: "2026-07-14T14:00:00",
    paidAt: null,
    quantity: 1,
  },
  {
    id: "ord-5",
    orderNo: "ORD20260710001",
    productName: "资源包 100万 Credit",
    productType: "one-time",
    orderType: "new",
    amount: 160,
    originalAmount: 200,
    discountAmount: 40,
    purchaseMethod: "account-balance",
    status: "paid",
    createdAt: "2026-07-10T11:08:22",
    paidAt: "2026-07-10T11:08:30",
    quantity: 1,
  },
  {
    id: "ord-6",
    orderNo: "ORD20260705002",
    productName: "Enterprise 轻量版",
    productType: "subscription",
    orderType: "renewal",
    amount: 899,
    originalAmount: 1199,
    discountAmount: 300,
    purchaseMethod: null,
    status: "cancelled",
    createdAt: "2026-07-05T15:30:00",
    paidAt: null,
    quantity: 1,
    cycle: "包月",
  },
];

export const productTypeExtLabel = (type: ProductTypeExt) => {
  switch (type) {
    case "subscription": return "订阅包";
    case "one-time": return "资源包";
    case "test": return "测试包";
    default: return type;
  }
};

export const orderTypeExtLabel = (type: OrderType) =>
  type === "new" ? "新购" : "续费";

export const purchaseMethodExtLabel = (m: PurchaseMethodExt | null) => {
  if (!m) return "-";
  const map: Record<PurchaseMethodExt, string> = {
    "account-balance": "充值余额",
    alipay: "支付宝",
    "wechat-pay": "微信支付",
    "online-banking": "网银支付",
  };
  return map[m];
};

export const orderStatusExtLabel: Record<OrderStatus, string> = {
  pending: "待支付",
  paid: "已支付",
  cancelled: "已取消",
};

export const orderStatusExtClass: Record<OrderStatus, string> = {
  pending: "bg-orange-50 text-orange-600 border-orange-200",
  paid: "bg-green-50 text-green-600 border-green-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
};

export const formatMoney = sharedFormatMoney;
export const formatDateTime = sharedFormatDateTime;

export const findOrderById = (id: string) =>
  MOCK_ORDER_ROWS.find((o) => o.id === id) ?? null;
