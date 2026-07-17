import { useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { ArrowLeft, AlertCircle, Wallet } from "lucide-react";
import {
  findAdminOrderById,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  PRODUCT_TYPE_LABEL,
  ORDER_TYPE_LABEL,
  ACCOUNT_TYPE_LABEL,
  PURCHASE_METHOD_LABEL,
  formatMoney,
  formatDateTime,
  type AdminOrderRow,
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
      <div className="p-6 space-y-6 overflow-y-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/console/order-management")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div className="text-center text-muted-foreground py-16">订单不存在或已被删除</div>
      </div>
    );
  }

  const isPending = order.status === "pending";
  const isCancelled = order.status === "cancelled";

  // 金额行
  const amountRows: { label: string; value: number; cls?: string }[] = [];
  if (order.originalAmount !== undefined) amountRows.push({ label: "商品原价", value: order.originalAmount });
  if (order.discountAmount) amountRows.push({ label: "优惠金额", value: -order.discountAmount, cls: "text-green-600" });
  if (order.voucherDeduction) amountRows.push({ label: "代金券抵扣", value: -order.voucherDeduction, cls: "text-green-600" });
  if (order.balanceDeduction) amountRows.push({ label: "余额支付", value: order.balanceDeduction });

  const finalLabel = isPending ? "待支付金额" : isCancelled ? "订单金额" : "实付金额";

  // 订单信息字段
  const infoFields: { label: string; value: ReactNode }[] = [
    { label: "购买主体", value: order.buyerName },
    { label: "账户类型", value: ACCOUNT_TYPE_LABEL[order.accountType] },
    { label: "商品名称", value: order.productName },
    { label: "商品类型", value: PRODUCT_TYPE_LABEL[order.productType] },
    { label: "订单类型", value: ORDER_TYPE_LABEL[order.orderType] },
    { label: "购买数量", value: order.quantity ?? 1 },
    {
      label: "支付方式",
      value: order.purchaseMethod ? PURCHASE_METHOD_LABEL[order.purchaseMethod] : "-",
    },
    {
      label: "支付账户",
      value: order.paymentAccount ?? "-",
    },
    { label: "创建时间", value: formatDateTime(order.createdAt) },
    { label: "支付时间", value: formatDateTime(order.paidAt) },
    {
      label: "交易流水号",
      value: order.transactionId ? (
        <span className="font-mono">{order.transactionId}</span>
      ) : (
        "-"
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* 返回 */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/console/order-management")}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        返回订单列表
      </Button>

      {/* 顶部概览 */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">订单详情</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">订单号：</span>
          <span className="font-mono text-foreground">{order.orderNo}</span>
          <Badge
            variant={order.status === "paid" ? "default" : "outline"}
            className={`${ORDER_STATUS_BADGE[order.status]} text-xs`}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
        </div>
      </div>

      {/* 待支付提示 */}
      {isPending && (
        <Alert className="border-orange-200 bg-orange-50 text-orange-700 py-3">
          <AlertCircle className="w-4 h-4 !text-orange-600" />
          <AlertDescription className="text-orange-700 text-sm flex items-center justify-between w-full">
            <span>请完成支付，逾期订单将自动取消。</span>
            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setCancelOpen(true)}>
              取消订单
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 金额信息 */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">金额信息</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">{finalLabel}</span>
                <span className={`text-[32px] font-bold leading-none tracking-tight ${isCancelled ? "text-foreground" : "text-rose-500"}`}>
                  {formatMoney(order.amount)}
                </span>
              </div>
              {amountRows.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {amountRows.map((r, i) => (
                    <span key={r.label} className="flex items-center gap-2">
                      {i > 0 && <span className="text-muted-foreground/40">|</span>}
                      <span>{r.label}：</span>
                      <span className={r.cls ?? ""}>{formatMoney(r.value)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单信息 */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">订单信息</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {infoFields.map((row, idx) => {
                  // 双列布局：偶数行开新 tr，包含两个字段
                  if (idx % 2 !== 0) return null;
                  const next = infoFields[idx + 1];
                  return (
                    <tr key={row.label} className="border-b last:border-b-0">
                      <td className="px-4 py-3 bg-muted/30 text-muted-foreground w-32 whitespace-nowrap">{row.label}</td>
                      <td className="px-4 py-3 text-foreground">{row.value}</td>
                      {next ? (
                        <>
                          <td className="px-4 py-3 bg-muted/30 text-muted-foreground w-32 whitespace-nowrap border-l">{next.label}</td>
                          <td className="px-4 py-3 text-foreground">{next.value}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 bg-muted/30 text-muted-foreground w-32 border-l" />
                          <td className="px-4 py-3" />
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                // 一期仅前端状态切换，实际应调用接口
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
