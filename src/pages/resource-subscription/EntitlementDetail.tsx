import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
  Receipt,
  BarChart3,
  Download,
  RefreshCw,
  Wallet,
  KeyRound,
  Copy,
  Power,
  RotateCcw,
  Users,
} from "lucide-react";
import {
  formatCredit,
  formatDateTime,
  MOCK_PLANS,
} from "./shared";
import {
  findEntitlementById,
  statusLabel,
  statusClass,
  ALL_ENTITLEMENTS,
  type SubscriptionKey,
} from "./entitlements-data";
import { useToast } from "@/hooks/use-toast";
import SeatAddonDialog from "./SeatAddonDialog";

export default function EntitlementDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const id = (() => {
    const m = location.pathname.match(/\/resource-packages\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const ent = id ? findEntitlementById(id) : undefined;

  // 自动续费状态（本地状态，模拟交互）
  const [autoRenew, setAutoRenew] = useState<boolean>(!!ent?.autoRenew);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(false);

  // 订阅Key状态
  const [subscriptionKeys, setSubscriptionKeys] = useState<SubscriptionKey[]>(ent?.subscriptionKeys ?? []);
  const [resetKeyDialog, setResetKeyDialog] = useState<{ open: boolean; keyId: string | null }>({ open: false, keyId: null });
  const [disableKeyDialog, setDisableKeyDialog] = useState<{ open: boolean; keyId: string | null }>({ open: false, keyId: null });
  // 加购席位弹窗
  const [seatAddonOpen, setSeatAddonOpen] = useState(false);

  const goBack = () => navigate("/workspace/resource-packages");

  // 复制Key
  const handleCopyKey = (key: SubscriptionKey) => {
    navigator.clipboard.writeText(key.keyFull).then(() => {
      toast({ title: "已复制", description: `Key「${key.name}」已复制到剪贴板` });
    });
  };

  // 禁用/启用Key
  const handleToggleKeyStatus = (key: SubscriptionKey) => {
    if (key.status === "active") {
      setDisableKeyDialog({ open: true, keyId: key.id });
    } else {
      // 启用直接切换
      setSubscriptionKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, status: "active" } : k))
      );
      toast({ title: "Key 已启用", description: `Key「${key.name}」已启用` });
    }
  };

  const confirmDisableKey = () => {
    const keyId = disableKeyDialog.keyId;
    if (!keyId) return;
    setSubscriptionKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, status: "disabled" } : k))
    );
    const key = subscriptionKeys.find((k) => k.id === keyId);
    toast({ title: "Key 已禁用", description: `Key「${key?.name ?? ""}」已禁用，将无法用于调用` });
    setDisableKeyDialog({ open: false, keyId: null });
  };

  // 重置Key
  const handleResetKey = (key: SubscriptionKey) => {
    setResetKeyDialog({ open: true, keyId: key.id });
  };

  const confirmResetKey = () => {
    const keyId = resetKeyDialog.keyId;
    if (!keyId) return;
    // 生成新的随机后缀模拟重置
    const suffix = Math.random().toString(36).substring(2, 8);
    const newFull = `sk-sub-${Math.random().toString(36).substring(2, 18)}${suffix}`;
    const newPreview = `sk-sub-***${suffix}`;
    setSubscriptionKeys((prev) =>
      prev.map((k) =>
        k.id === keyId ? { ...k, keyFull: newFull, keyPreview: newPreview, createdAt: new Date().toISOString() } : k
      )
    );
    const key = subscriptionKeys.find((k) => k.id === keyId);
    toast({ title: "Key 已重置", description: `Key「${key?.name ?? ""}」已生成新的密钥，请妥善保存` });
    setResetKeyDialog({ open: false, keyId: null });
  };

  const handleExport = () => {
    if (!ent.usageLogs || ent.usageLogs.length === 0) return;
    const headers = ["抵扣时间", "APIKey名称", "消费模型", "抵扣前余量(credit)", "抵扣量(credit)", "抵扣后余量(credit)"];
    const rows = ent.usageLogs.map((log) => [
      formatDateTime(log.time),
      log.apiKeyName,
      log.model,
      String(log.beforeRemaining),
      String(log.deducted),
      String(log.afterRemaining),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `抵扣明细_${ent.name}_${ent.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 开关切换处理
  const handleAutoRenewToggle = (checked: boolean) => {
    if (checked) {
      // 开启：直接切换
      setAutoRenew(true);
      // 同步到 mock 数据（保持一致性）
      const target = ALL_ENTITLEMENTS.find((e) => e.id === ent?.id);
      if (target) target.autoRenew = true;
      toast({
        title: "已开启自动续费",
        description: "到期时将自动从充值余额扣款续费。",
      });
    } else {
      // 关闭：弹出确认
      setPendingToggle(true);
      setShowCancelDialog(true);
    }
  };

  // 确认关闭自动续费
  const confirmCancelAutoRenew = () => {
    setAutoRenew(false);
    const target = ALL_ENTITLEMENTS.find((e) => e.id === ent?.id);
    if (target) target.autoRenew = false;
    setShowCancelDialog(false);
    setPendingToggle(false);
    toast({
      title: "已关闭自动续费",
      description: "当前套餐将在到期后失效。",
    });
  };

  const cancelCancelAutoRenew = () => {
    setShowCancelDialog(false);
    setPendingToggle(false);
  };

  // 加购席位确认
  const handleSeatAddonConfirm = (addonSeats: number, amount: number) => {
    // 更新 mock 数据
    const target = ALL_ENTITLEMENTS.find((e) => e.id === ent?.id);
    if (target) {
      const plan = MOCK_PLANS.find((p) => p.id === target.planId);
      const quotaPerSeat = plan?.totalQuota ?? 264_000_000;
      const keysPerSeat = plan?.baseKeyLimit ?? plan?.subscriptionKeyLimit ?? 3;

      target.seats = (target.seats ?? 0) + addonSeats;
      target.totalQuota = target.totalQuota + addonSeats * quotaPerSeat;
      target.remainingQuota = target.remainingQuota + addonSeats * quotaPerSeat;
      target.keyLimit = (target.keyLimit ?? 0) + addonSeats * keysPerSeat;
    }
    toast({
      title: "加购成功",
      description: `成功加购 ${addonSeats} 个席位，支付金额 ¥${amount.toFixed(2)}，权益已立即生效。`,
    });
    // 刷新页面数据
    setTimeout(() => window.location.reload(), 500);
  };

  if (!ent) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold text-foreground">权益详情</h1>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">权益不存在或已被删除</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={goBack}>
            返回权益列表
          </Button>
        </div>
      </div>
    );
  }

  const usedCredits = ent.totalQuota - ent.remainingQuota;
  const usedPercent = ent.totalQuota > 0 ? Math.round((usedCredits / ent.totalQuota) * 100) : 0;
  const isSubscription = ent.productType === "subscription";

  // 计算资源包有效期时长
  const validityPeriod = (() => {
    if (!ent.expiresAt) return "永久";
    const start = new Date(ent.effectiveAt).getTime();
    const end = new Date(ent.expiresAt).getTime();
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (days >= 365) {
      const years = Math.round(days / 365);
      return `${years}年`;
    } else if (days >= 30) {
      const months = Math.round(days / 30);
      return `${months}个月`;
    } else {
      return `${days}天`;
    }
  })();

  return (
    <div className="w-full space-y-6">
      {/* 顶部 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {ent.name}
        </h1>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass[ent.status]}`}
        >
          {statusLabel[ent.status]}
        </span>
        {ent.orderId && (
          <span className="text-sm text-muted-foreground ml-2">
            关联订单号：<span className="font-mono">{ent.orderId}</span>
          </span>
        )}
      </div>

      {/* 用量概览 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-foreground">用量概览</h2>
          </div>
          {/* 订阅包：加购席位按钮 */}
          {isSubscription && ent.status === "active" && ent.allowSeatAddon !== false && (
            <Button
              size="sm"
              className="h-8 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setSeatAddonOpen(true)}
            >
              <Users className="w-4 h-4 mr-1.5" />
              加购席位
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {isSubscription && ent.seats !== undefined && (
              <DetailRow
                label="当前席位"
                value={<span className="text-purple-600 font-semibold">{ent.seats} 席</span>}
              />
            )}
            {isSubscription && ent.keyLimit !== undefined && (
              <DetailRow label="Key 上限" value={`${ent.keyLimit} 个`} />
            )}
            <DetailRow label="总量" value={`${formatCredit(ent.totalQuota)} credit`} />
            <DetailRow
              label="余量"
              value={`${formatCredit(ent.remainingQuota)} credit`}
              highlight
            />
            <DetailRow label="额度规则" value="有效期内可用" />
            <DetailRow label="有效期" value={validityPeriod} />
            <DetailRow label="生效时间" value={formatDateTime(ent.effectiveAt)} />
            <DetailRow
              label="失效时间"
              value={ent.expiresAt ? formatDateTime(ent.expiresAt) : "永久"}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                已使用 {formatCredit(usedCredits)} / {formatCredit(ent.totalQuota)} credit（{usedPercent}%）
              </span>
            </div>
            <Progress value={usedPercent} className="h-2" />
          </div>

          {/* 订阅包：自动续费开关 */}
          {isSubscription && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="w-3.5 h-3.5" />
                <span>自动续费仅支持充值余额扣款</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">自动续费</span>
                <Switch
                  checked={autoRenew}
                  onCheckedChange={handleAutoRenewToggle}
                  disabled={pendingToggle}
                  aria-label="自动续费开关"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 订阅Key（仅订阅包显示） */}
      {isSubscription && subscriptionKeys.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-500" />
              <h2 className="text-base font-semibold text-foreground">订阅Key</h2>
              <span className="text-xs text-muted-foreground">
                共 {subscriptionKeys.length} 个专用Key，通过订阅Key调用优先消耗该订阅额度
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Key名称</TableHead>
                  <TableHead className="text-muted-foreground">Key</TableHead>
                  <TableHead className="text-muted-foreground w-[90px]">状态</TableHead>
                  <TableHead className="text-muted-foreground w-[170px]">创建时间</TableHead>
                  <TableHead className="text-muted-foreground w-[170px]">最近调用时间</TableHead>
                  <TableHead className="text-muted-foreground text-right w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionKeys.map((key) => (
                  <TableRow key={key.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium whitespace-nowrap">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {key.keyPreview}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                          key.status === "active"
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {key.status === "active" ? "启用" : "已禁用"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "从未调用"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleCopyKey(key)}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          复制
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-xs ${key.status === "active" ? "text-orange-500 hover:text-orange-600" : "text-green-600 hover:text-green-700"}`}
                          onClick={() => handleToggleKeyStatus(key)}
                        >
                          <Power className="w-3.5 h-3.5 mr-1" />
                          {key.status === "active" ? "禁用" : "启用"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => handleResetKey(key)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          重置
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            说明：订阅Key调用时优先消耗该订阅额度，不受普通余额影响。重置Key后旧Key立即失效。
          </p>
        </section>
      )}

      {/* 抵扣明细 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">抵扣明细</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleExport}
            disabled={!ent.usageLogs || ent.usageLogs.length === 0}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
        {ent.usageLogs && ent.usageLogs.length > 0 ? (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs text-muted-foreground">抵扣时间</TableHead>
                  <TableHead className="text-xs text-muted-foreground">APIKey名称</TableHead>
                  <TableHead className="text-xs text-muted-foreground">消费模型</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣前余量</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣量</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣后余量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ent.usageLogs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(log.time)}
                    </TableCell>
                    <TableCell className="text-xs">{log.apiKeyName}</TableCell>
                    <TableCell className="text-xs">{log.model}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right">
                      {formatCredit(log.beforeRemaining)} credit
                    </TableCell>
                    <TableCell className="text-xs font-medium text-red-500 text-right">
                      {formatCredit(log.deducted)} credit
                    </TableCell>
                    <TableCell className="text-xs text-foreground text-right">
                      {formatCredit(log.afterRemaining)} credit
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border border-border rounded-md p-12 text-center text-muted-foreground">
            <p className="text-sm">暂无抵扣记录</p>
          </div>
        )}
      </section>

      {/* 关闭自动续费确认弹窗 */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>关闭自动续费</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              关闭后，当前套餐将在到期后失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCancelAutoRenew}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAutoRenew}>确认关闭</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 禁用Key确认弹窗 */}
      <AlertDialog open={disableKeyDialog.open} onOpenChange={(open) => setDisableKeyDialog({ open, keyId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>禁用订阅Key</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              禁用后该Key将无法用于API调用，正在使用该Key的服务将会中断。确定要禁用吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableKeyDialog({ open: false, keyId: null })}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableKey} className="bg-orange-500 hover:bg-orange-600">确认禁用</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重置Key确认弹窗 */}
      <AlertDialog open={resetKeyDialog.open} onOpenChange={(open) => setResetKeyDialog({ open, keyId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重置订阅Key</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              重置后将生成新的Key，旧Key立即失效。请确保已更新使用该Key的所有服务配置。确定要重置吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetKeyDialog({ open: false, keyId: null })}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetKey} className="bg-blue-500 hover:bg-blue-600">确认重置</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 加购席位弹窗 */}
      <SeatAddonDialog
        open={seatAddonOpen}
        onOpenChange={setSeatAddonOpen}
        entitlement={ent}
        onConfirm={handleSeatAddonConfirm}
      />
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
