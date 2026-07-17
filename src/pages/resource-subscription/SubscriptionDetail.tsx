import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ArrowLeft,
  AlertCircle,
  BarChart3,
  Wallet,
  Receipt,
} from "lucide-react";
import {
  findSubscriptionById,
  MOCK_SEAT_SUBSCRIPTIONS,
  subStatusLabel,
  subStatusClass,
  formatCredit,
  formatDateTime,
} from "./subscriptions-data";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const id = (() => {
    const m = location.pathname.match(/\/my-subscriptions\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const sub = id ? findSubscriptionById(id) : undefined;

  // 本地状态
  const [autoRenew, setAutoRenew] = useState<boolean>(!!sub?.autoRenew);
  const [showCancelAutoRenew, setShowCancelAutoRenew] = useState(false);

  const goBack = () => navigate("/workspace/my-subscriptions");

  if (!sub) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold text-foreground">订阅详情</h1>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">订阅不存在或已被删除</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={goBack}>
            返回订阅列表
          </Button>
        </div>
      </div>
    );
  }

  // 自动续费切换
  const handleAutoRenewToggle = (checked: boolean) => {
    if (checked) {
      setAutoRenew(true);
      const target = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === sub.id);
      if (target) target.autoRenew = true;
      toast({ title: "已开启自动续费", description: "到期时将自动从充值余额扣款续费。" });
    } else {
      setShowCancelAutoRenew(true);
    }
  };

  const confirmCancelAutoRenew = () => {
    setAutoRenew(false);
    const target = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === sub.id);
    if (target) target.autoRenew = false;
    setShowCancelAutoRenew(false);
    toast({ title: "已关闭自动续费", description: "当前套餐将在到期后失效。" });
  };

  // 计算额度
  const totalUsedQuota = sub.seats.reduce((sum, s) => sum + s.usedQuota, 0);
  const totalQuota = sub.seatCount * sub.planDetail.totalQuota;
  const totalUsedPercent = totalQuota > 0 ? Math.round((totalUsedQuota / totalQuota) * 100) : 0;
  const usedSeatsCount = sub.seats.filter((s) => s.status === "assigned").length;

  // 抵扣明细
  const deductions = sub.deductionRecords ?? [];

  return (
    <div className="w-full space-y-6">
      {/* 顶部 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{sub.planName}</h1>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${subStatusClass[sub.status]}`}
        >
          {subStatusLabel[sub.status]}
        </span>
        {sub.orderId && (
          <span className="text-sm text-muted-foreground ml-2">
            关联订单号：<span className="font-mono">{sub.orderId}</span>
          </span>
        )}
      </div>

      {/* 套餐信息 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-semibold text-foreground">套餐信息</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <DetailRow label="订阅ID" value={<span className="font-mono text-xs">{sub.id}</span>} />
          <DetailRow label="席位数量" value={`${sub.seatCount} 席（已分配 ${usedSeatsCount} 席）`} />
          <DetailRow label="每席位周期额度" value={`${formatCredit(sub.planDetail.totalQuota)} credit`} />
          <DetailRow label="适用范围" value={sub.planDetail.modelScope} />
          <DetailRow label="续费金额" value={<span className="text-green-600 font-medium">¥{sub.planDetail.price.toLocaleString()} / 月</span>} />
          <DetailRow label="当前周期" value={<span className="font-mono text-xs">{formatDateTime(sub.currentPeriodStart)} ~ {formatDateTime(sub.currentPeriodEnd)}</span>} />
          <DetailRow label="下次续费时间" value={sub.nextBillingAt ? <span className="font-mono text-xs">{formatDateTime(sub.nextBillingAt)}</span> : "—"} />
        </div>
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              整体额度使用：{formatCredit(totalUsedQuota)} / {formatCredit(totalQuota)} credit（{totalUsedPercent}%）
            </span>
          </div>
          <Progress value={totalUsedPercent} className="h-2" />
        </div>
        {/* 自动续费 */}
        {(sub.status === "active" || sub.status === "pending") && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" />
              <span>自动续费仅支持充值余额扣款</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">自动续费</span>
              <Switch checked={autoRenew} onCheckedChange={handleAutoRenewToggle} aria-label="自动续费开关" />
            </div>
          </div>
        )}
      </section>

      {/* 抵扣明细 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-orange-500" />
          <h2 className="text-base font-semibold text-foreground">抵扣明细</h2>
          <span className="text-xs text-muted-foreground">当前周期共 {deductions.length} 条抵扣记录</span>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground whitespace-nowrap w-[160px]">抵扣时间</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">席位</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">API Key</TableHead>
                <TableHead className="text-muted-foreground">模型</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">计费项</TableHead>
                <TableHead className="text-muted-foreground text-right whitespace-nowrap">用量</TableHead>
                <TableHead className="text-muted-foreground text-center whitespace-nowrap w-[70px]">系数</TableHead>
                <TableHead className="text-muted-foreground text-right whitespace-nowrap">抵扣Credit</TableHead>
                <TableHead className="text-muted-foreground text-right whitespace-nowrap">剩余额度</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    暂无抵扣记录
                  </TableCell>
                </TableRow>
              ) : (
                deductions.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(d.time)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-muted-foreground">{d.seatId}</span>
                        <span className="text-xs">{d.seatMemberName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {d.apiKey}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <Badge variant="outline" className="font-normal text-xs">
                        {d.modelName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {d.billingItem}
                    </TableCell>
                    <TableCell className="text-sm text-right whitespace-nowrap font-mono">
                      {d.usage.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-center whitespace-nowrap text-muted-foreground">
                      ×{d.coefficient}
                    </TableCell>
                    <TableCell className="text-sm text-right whitespace-nowrap font-medium text-orange-600">
                      -{formatCredit(d.deductedCredits)}
                    </TableCell>
                    <TableCell className="text-sm text-right whitespace-nowrap font-mono text-muted-foreground">
                      {formatCredit(d.remainingCredits)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 关闭自动续费确认弹窗 */}
      <AlertDialog open={showCancelAutoRenew} onOpenChange={setShowCancelAutoRenew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>关闭自动续费</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              关闭后，当前套餐将在到期后失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelAutoRenew(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAutoRenew}>确认关闭</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-right truncate ${
          highlight ? "text-primary font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
