import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Clock } from "lucide-react";
import {
  findOrderById,
  productTypeExtLabel,
  orderTypeExtLabel,
  purchaseMethodExtLabel,
  orderStatusExtLabel,
  orderStatusExtClass,
  formatMoney,
  formatDateTime,
} from "./orders-data";

interface Props {
  mode: "enterprise" | "personal";
}

export default function OrderDetail({ mode }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const id = (() => {
    const m = location.pathname.match(/\/resource-orders\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const order = id ? findOrderById(id) : null;

  const goBack = () => navigate("/workspace/resource-orders");

  if (!order) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold text-foreground">订单详情</h1>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">订单不存在或已被删除</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={goBack}>
            返回订单列表
          </Button>
        </div>
      </div>
    );
  }

  const isPaid = order.status === "paid";
  const isPending = order.status === "pending";
  const accountType = mode === "enterprise" ? "企业账户" : "个人账户";
  const purchaserName = mode === "enterprise" ? "北京科技创新有限公司" : "周梦洁";

  const original = order.originalAmount ?? order.amount;
  const discount = order.discountAmount ?? 0;

  // 待支付订单超时时间（创建时间 + 30分钟）
  const expireAt = useMemo(() => {
    if (!isPending) return "";
    const d = new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, [order, isPending]);

  return (
    <div className="w-full max-w-5xl space-y-6">
      {/* 返回 */}
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* 顶部标题：订单详情 (订单号) 状态 */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">
          订单详情 <span className="text-muted-foreground font-mono text-xl">({order.orderNo})</span>
        </h1>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${orderStatusExtClass[order.status]}`}>
          {orderStatusExtLabel[order.status]}
        </span>
      </div>

      {/* 待支付订单超时提示 */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-amber-900">
          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p>
            请于 <span className="font-semibold">{expireAt}</span> 前完成支付，逾期订单将自动取消。
          </p>
        </div>
      )}

      {/* 金额信息 */}
      <div className="bg-card border border-border rounded-xl p-8">
        {isPaid ? (
          // 已支付：左右两栏
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* 应付金额 */}
            <div className="pb-6 md:pb-0 md:pr-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">¥</span>
                <span className="text-sm text-muted-foreground">应付金额</span>
              </div>
              <div className="text-[40px] font-bold text-foreground leading-none tracking-tight mb-5">
                {formatMoney(order.amount)}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>原价金额：{formatMoney(original)}</span>
                {discount > 0 && (
                  <>
                    <span>-</span>
                    <span>优惠金额：{formatMoney(discount)}</span>
                  </>
                )}
              </div>
            </div>
            {/* 实付金额 */}
            <div className="pt-6 md:pt-0 md:pl-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">¥</span>
                <span className="text-sm text-muted-foreground">实付金额</span>
              </div>
              <div className="text-[40px] font-bold text-foreground leading-none tracking-tight">
                {formatMoney(order.amount)}
              </div>
            </div>
          </div>
        ) : (
          // 待支付/已取消：单栏应付金额
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">¥</span>
              <span className="text-sm text-muted-foreground">应付金额</span>
            </div>
            <div className="text-[40px] font-bold text-foreground leading-none tracking-tight mb-5">
              {formatMoney(order.amount)}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>原价金额：{formatMoney(original)}</span>
              {discount > 0 && (
                <>
                  <span>-</span>
                  <span>优惠金额：{formatMoney(discount)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 订单信息表 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">订单信息</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 p-6">
          <InfoItem label="购买主体" value={purchaserName} />
          <InfoItem label="账户类型" value={accountType} />
          <InfoItem label="商品名称" value={order.productName} />
          <InfoItem label="商品类型" value={productTypeExtLabel(order.productType)} />
          <InfoItem label="订单类型" value={orderTypeExtLabel(order.orderType)} />
          <InfoItem
            label="支付方式"
            value={order.purchaseMethod ? purchaseMethodExtLabel(order.purchaseMethod) : "-"}
          />
          <InfoItem label="创建时间" value={formatDateTime(order.createdAt)} />
          <InfoItem label="支付时间" value={order.paidAt ? formatDateTime(order.paidAt) : "-"} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right break-all">{value}</span>
    </div>
  );
}
