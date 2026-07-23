import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Package,
  FileText,
  Key,
} from "lucide-react";
import {
  findAdminSubscriptionById,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_BADGE,
  ACCOUNT_TYPE_LABEL,
  RENEWAL_FAILURE_REASON_LABEL,
  formatMoney,
  formatDateTime,
  formatDate,
} from "./admin-subscriptions-data";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const subscription = useMemo(() => (id ? findAdminSubscriptionById(id) : undefined), [id]);

  if (!subscription) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <Card className="border">
          <CardContent className="p-12 text-center text-muted-foreground">
            订阅不存在或已被删除
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCancelAutoRenew = () => {
    toast({
      title: "已取消自动续费",
      description: "当前周期到期后将不再自动扣款。",
    });
  };

  const handleReactivate = () => {
    toast({
      title: "已恢复自动续费",
      description: "下次到期时将自动发起扣款。",
    });
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回订阅列表
        </Button>
        <div className="flex items-center gap-2">
          {subscription.status === "active" && subscription.autoRenew && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleCancelAutoRenew}
            >
              <Ban className="w-4 h-4 mr-1.5" />
              取消自动续费
            </Button>
          )}
          {subscription.status === "expired" && (
            <Button
              size="sm"
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleReactivate}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              恢复订阅
            </Button>
          )}
        </div>
      </div>

      {/* 基本信息卡片 */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-lg font-semibold">订阅详情</CardTitle>
                <Badge
                  variant={subscription.status === "active" ? "default" : "outline"}
                  className={`${SUBSCRIPTION_STATUS_BADGE[subscription.status]} text-xs`}
                >
                  {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {subscription.subscriptionNo}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-x-12 gap-y-5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">订阅主体</p>
                  <p className="text-sm font-medium">{subscription.subscriberName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ACCOUNT_TYPE_LABEL[subscription.accountType]}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">订阅商品</p>
                  <p className="text-sm font-medium">{subscription.planName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatMoney(subscription.price, subscription.currency)} / 月
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Key className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">关联权益</p>
                  <p className="text-sm font-mono">{subscription.entitlementId}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">订阅周期</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">首次开通：</span>
                    {formatDateTime(subscription.startAt)}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">当前周期：</span>
                    {formatDate(subscription.currentPeriodStart)} ~{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                  {subscription.status === "active" && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">下次续费：</span>
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">支付信息</p>
                  <p className="text-sm">{subscription.paymentMethod}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    自动续费：{subscription.autoRenew ? "已开启" : "已关闭"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 续费记录 */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            续费记录
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">订单号</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">续费周期</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">金额</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">支付时间</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscription.renewalHistory && subscription.renewalHistory.length > 0 ? (
                subscription.renewalHistory.map((r) => (
                  <tr key={r.orderNo} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono">{r.orderNo}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(r.periodStart)} ~ {formatDate(r.periodEnd)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatMoney(r.amount, r.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDateTime(r.chargedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.result === "success" ? (
                        <Badge className="bg-green-500 text-white text-[11px]">成功</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-200 bg-red-50 text-[11px]"
                        >
                          失败{r.failureReason ? ` · ${RENEWAL_FAILURE_REASON_LABEL[r.failureReason]}` : ""}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : subscription.latestOrderNo ? (
                <tr className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono">{subscription.latestOrderNo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(subscription.currentPeriodStart)} ~{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatMoney(subscription.price, subscription.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {subscription.status === "active"
                      ? formatDateTime(subscription.currentPeriodStart)
                      : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {subscription.status === "active" ? (
                      <Badge className="bg-green-500 text-white text-[11px]">成功</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-red-600 border-red-200 bg-red-50 text-[11px]"
                      >
                        已终止
                      </Badge>
                    )}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    暂无续费记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
