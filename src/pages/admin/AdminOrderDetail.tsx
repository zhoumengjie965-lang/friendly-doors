import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, AlertCircle, Clock } from "lucide-react";
import {
  findAdminOrderById,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  ORDER_TYPE_LABEL,
  PURCHASE_METHOD_LABEL,
  formatMoney,
  formatDateTime,
} from "./admin-orders-data";

export default function AdminOrderDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const m = location.pathname.match(/\/order-management\/([^/]+)/);
  const id = m ? m[1] : null;
  const order = id ? findAdminOrderById(id) : null;

  const [cancelOpen, setCancelOpen] = useState(false);

  if (!order) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold text-foreground">订单详情</h1>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">订单不存在或已被删除</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/admin/console/order-management")}>
            返回订单列表
          </Button>
        </div>
      </div>
    );
  }

  const isPending = order.status === "pending";
  const isCancelled = order.status === "cancelled";

  const original = order.originalAmount ?? order.amount;
  const discount = order.discountAmount ?? 0;

  const expireAt = (() => {
    if (!isPending) return "";
    const d = new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  })();

  // 配置信息表格逻辑（与客户端一致）
  const isSub = order.productType === "subscription";
  const configText = isSub
    ? order.items.map((i) => `${i.productName} × ${i.seats ?? 1}席`).join("\n")
    : "-";
  const quantity = isSub
    ? "1"
    : `${order.items.reduce((s, i) => s + (i.quantity ?? 1), 0)}`;
  const firstItem = order.items[0];
  const durationText = firstItem?.duration ?? "-";
  const unitTotal = order.originalAmount ?? order.amount;
  const billingMethod = firstItem?.billingMethod ?? (isSub ? "包年包月" : "一次性");

  return (
    <div className="w-full max-w-7xl space-y-6">
      {/* 返回 */}
      <button
        onClick={() => navigate("/admin/console/order-management")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* 标题 */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">
          订单详情 <span className="text-muted-foreground font-mono text-xl">({order.orderNo})</span>
        </h1>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      {/* 待支付提示 */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-amber-900">
          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p className="flex items-center justify-between w-full">
            <span>请于 <span className="font-semibold">{expireAt}</span> 前完成支付，逾期订单将自动取消。</span>
            <Button size="sm" variant="destructive" className="h-8 text-xs ml-4 shrink-0" onClick={() => setCancelOpen(true)}>
              取消订单
            </Button>
          </p>
        </div>
      )}

      {/* 支付信息 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">支付信息</h3>
        </div>
        <div className="bg-card p-8">
          {isCancelled ? (
            <div className="text-sm text-muted-foreground">-</div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">¥</span>
                <span className="text-sm text-muted-foreground">{isPending ? "待实际应付" : "实际应付"}</span>
              </div>
              <div className="text-[40px] font-bold text-foreground leading-none tracking-tight mb-5">
                {formatMoney(order.amount)}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground/60">=</span>
                <span>原价金额 {formatMoney(original)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-muted-foreground/60">-</span>
                    <span>优惠金额 {formatMoney(discount)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 订单信息 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">订单信息</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1 p-6">
          <InfoItem label="订单号" value={order.orderNo} />
          <InfoItem label="订单类型" value={ORDER_TYPE_LABEL[order.orderType]} />
          <InfoItem label="关联订阅" value={order.subscriptionNo ?? "-"} />
          <InfoItem label="购买主体" value={order.buyerName} />
          <InfoItem label="创建时间" value={formatDateTime(order.createdAt)} />
          <InfoItem label="付款时间" value={order.paidAt ? formatDateTime(order.paidAt) : "-"} />
          <InfoItem label="支付方式" value={order.purchaseMethod ? PURCHASE_METHOD_LABEL[order.purchaseMethod] : "-"} />
        </div>
      </div>

      {/* 配置信息 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">配置信息</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">商品名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">配置</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">计费方式</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">数量</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">生效时长</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">单价</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">价格优惠</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">实付金额</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-3 text-foreground whitespace-nowrap">{order.productName}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-pre-line">{configText}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{billingMethod}</td>
                <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{quantity}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{durationText || "-"}</td>
                <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{formatMoney(unitTotal)}</td>
                <td className="px-4 py-3 text-right text-emerald-600 whitespace-nowrap">
                  {order.discountAmount ? `-${formatMoney(order.discountAmount)}` : "-"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                  {formatMoney(order.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 取消订单确认 */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消订单</AlertDialogTitle>
            <AlertDialogDescription>
              确定要取消订单 <span className="font-mono text-foreground">{order.orderNo}</span> 吗？取消后订单将无法恢复支付。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setCancelOpen(false);
                navigate("/admin/console/order-management", { replace: true });
              }}
            >
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs text-muted-foreground mb-1">{label}</dt>
      <dd className="text-sm text-foreground break-all">{value}</dd>
    </div>
  );
}
