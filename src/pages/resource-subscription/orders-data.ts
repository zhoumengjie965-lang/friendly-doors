// 订单管理共享数据与类型
import { formatMoney as sharedFormatMoney, formatDateTime as sharedFormatDateTime } from "./shared";

export type OrderType = "new" | "renewal" | "upgrade" | "addon";
export type OrderStatus = "pending" | "paid" | "cancelled";
export type ProductTypeExt = "subscription" | "one-time" | "test";
export type PurchaseMethodExt =
  | "account-balance"
  | "alipay"
  | "wechat-pay"
  | "online-banking";

// 订单行（商品明细）：一个订单可包含多个 OrderItem（组合购买）
export interface OrderItem {
  productName: string;
  productType: ProductTypeExt;
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

export interface OrderRow {
  id: string;
  orderNo: string;
  productName: string; // 展示名（列表页用，组合订单为"XX 组合套餐"）
  productType: ProductTypeExt; // 主商品类型（用于筛选）
  orderType: OrderType;
  amount: number; // 实付金额 = Σ items.subtotal
  purchaseMethod: PurchaseMethodExt | null;
  status: OrderStatus;
  createdAt: string; // ISO
  paidAt: string | null; // ISO
  // 金额明细（订单层汇总）
  originalAmount?: number; // = Σ items.originalSubtotal
  discountAmount?: number; // = Σ items.discount
  voucherDeduction?: number;
  balanceDeduction?: number; // 余额支付
  // 商品明细（支持多行，组合购买时 N 行）
  items: OrderItem[];
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
    id: "ord-2",
    orderNo: "ORD20260714002",
    productName: "Lite 标准版",
    productType: "subscription",
    orderType: "renewal",
    amount: 999,
    originalAmount: 1199,
    discountAmount: 200,
    voucherDeduction: 200,
    purchaseMethod: "alipay",
    status: "paid",
    createdAt: "2026-07-14T09:15:02",
    paidAt: "2026-07-14T09:15:40",
    items: [
      {
        productName: "Lite 标准版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 239.80,
        seats: 5,
        cycle: "包月",
        duration: "1个月",
        validFrom: "2026-07-14T09:15:40",
        validUntil: "2026-08-14T09:15:40",
        subtotal: 999,
        originalSubtotal: 1199,
        discount: 200,
      },
    ],
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
    items: [
      {
        productName: "资源包 500万 Credit",
        productType: "one-time",
        billingMethod: "一次性",
        unitPrice: 600,
        quantity: 1,
        duration: "6个月",
        validFrom: "2026-07-13T16:42:58",
        validUntil: "2027-01-13T16:42:58",
        subtotal: 500,
        originalSubtotal: 600,
        discount: 100,
      },
    ],
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
    items: [
      {
        productName: "国产模型实时推理 300W",
        productType: "one-time",
        billingMethod: "一次性",
        unitPrice: 10.80,
        quantity: 1,
        duration: "6个月",
        subtotal: 10.8,
        originalSubtotal: 10.8,
        discount: 0,
      },
    ],
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
    items: [
      {
        productName: "资源包 100万 Credit",
        productType: "one-time",
        billingMethod: "一次性",
        unitPrice: 200,
        quantity: 1,
        duration: "6个月",
        validFrom: "2026-07-10T11:08:30",
        validUntil: "2027-01-10T11:08:30",
        subtotal: 160,
        originalSubtotal: 200,
        discount: 40,
      },
    ],
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
    items: [
      {
        productName: "Enterprise 轻量版",
        productType: "subscription",
        billingMethod: "包年包月",
        unitPrice: 399.67,
        seats: 3,
        cycle: "包月",
        duration: "1个月",
        subtotal: 899,
        originalSubtotal: 1199,
        discount: 300,
      },
    ],
  },
  {
    id: "ord-7",
    orderNo: "ORD20260722001",
    productName: "Enterprise 组合套餐",
    productType: "subscription",
    orderType: "new",
    amount: 4198,
    originalAmount: 5398,
    discountAmount: 1200,
    balanceDeduction: 4198,
    purchaseMethod: "account-balance",
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
];

export const productTypeExtLabel = (type: ProductTypeExt) => {
  switch (type) {
    case "subscription": return "订阅包";
    case "one-time": return "资源包";
    case "test": return "测试包";
    default: return type;
  }
};

// 计费方式：从 productType 派生（包年包月 / 一次性）
export const billingMethodLabel = (type: ProductTypeExt): string =>
  type === "subscription" ? "包年包月" : "一次性";

export const orderTypeExtLabel = (type: OrderType) => {
  switch (type) {
    case "new": return "新购";
    case "renewal": return "续费";
    case "upgrade": return "升级";
    case "addon": return "加购";
    default: return type;
  }
};

export const orderTypeExtClass: Record<OrderType, string> = {
  new: "bg-blue-50 text-blue-600 border border-blue-200",
  renewal: "bg-purple-50 text-purple-600 border border-purple-200",
  upgrade: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  addon: "bg-amber-50 text-amber-600 border border-amber-200",
};

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
