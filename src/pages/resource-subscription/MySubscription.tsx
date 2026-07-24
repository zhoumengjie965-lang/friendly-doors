import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Crown, KeyRound, Copy, RotateCcw, Inbox, Link, BookOpen, Check, Sparkles, Download, ArrowUpCircle, RefreshCw } from "lucide-react";
import {
  MOCK_SEAT_SUBSCRIPTIONS,
  subStatusLabel,
  subStatusClass,
  formatCredit,
  formatDateTime,
  calcRemainingDays,
  SUBSCRIPTION_BASE_URL,
} from "./subscriptions-data";
import { useToast } from "@/hooks/use-toast";

interface Props {
  currentMemberId?: string;
  mode?: "personal" | "enterprise";
}

export default function MySubscription({ currentMemberId = "1", mode = "enterprise" }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isPersonal = mode === "personal";
  const seatLabel = isPersonal ? "" : "席位";
  const currentLabel = isPersonal ? "当前订阅" : "当前席位";
  const remainLabel = isPersonal ? "余量" : "本期席位余量";
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [usageDrawerOpen, setUsageDrawerOpen] = useState(false);

  const { sub, mySeat } = useMemo(() => {
    const active = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.status === "active");
    if (!active) return { sub: null, mySeat: null };
    const seat = active.seats.find((s) => s.memberId === currentMemberId) ?? null;
    return { sub: active, mySeat: seat };
  }, [currentMemberId]);

  // 本地维护席位 Key 状态（生成 / 重置时更新）
  // 个人模式下 mock 为首次进入、尚未生成 Key 的状态
  const [seatKey, setSeatKey] = useState<string | null>(
    isPersonal ? null : mySeat?.seatKey ?? null
  );
  const [seatKeyPreview, setSeatKeyPreview] = useState<string | null>(
    isPersonal ? null : mySeat?.seatKeyPreview ?? null
  );
  const [autoRenew, setAutoRenew] = useState<boolean>(!!sub?.autoRenew);
  const [showCancelAutoRenew, setShowCancelAutoRenew] = useState(false);

  // ── 空状态 ──
  if (!sub) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 我的订阅</h1>
          <p className="text-muted-foreground mt-1 text-sm">查看您的订阅与用量。</p>
        </div>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">当前没有生效的订阅</p>
        </div>
      </div>
    );
  }

  if (!mySeat) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 我的订阅</h1>
          <p className="text-muted-foreground mt-1 text-sm">查看您的订阅与用量。</p>
        </div>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{isPersonal ? "您当前没有生效的订阅" : "您尚未被分配订阅席位"}</p>
          {!isPersonal && <p className="text-xs mt-1">请联系企业管理员为您分配席位。</p>}
        </div>
      </div>
    );
  }

  // ── 计算数据 ──
  const remainingDays = calcRemainingDays(sub.currentPeriodEnd);
  const remainingQuota = mySeat.periodQuota - mySeat.usedQuota;
  const usedPercent = mySeat.periodQuota > 0
    ? Math.round((mySeat.usedQuota / mySeat.periodQuota) * 100)
    : 0;
  const remainingPercent = 100 - usedPercent;

  // ── Key 操作 ──
  const doGenerateKey = () => {
    const suffix = Math.random().toString(36).substring(2, 8);
    const full = `sk-tp-${Math.random().toString(36).substring(2, 18)}${suffix}`;
    const preview = `sk-tp-***${suffix}`;
    setSeatKey(full);
    setSeatKeyPreview(preview);
    // 同步写入 mock 数据
    const target = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === sub.id);
    if (target) {
      const idx = target.seats.findIndex((s) => s.id === mySeat.id);
      if (idx >= 0) {
        target.seats[idx].seatKey = full;
        target.seats[idx].seatKeyPreview = preview;
        target.seats[idx].seatKeyCreatedAt = new Date().toISOString();
      }
    }
    return { full, preview };
  };

  const handleGenerate = () => {
    doGenerateKey();
    toast({ title: "Key 生成成功", description: "专属 API Key 已生成，请妥善保管。" });
  };

  const handleReset = () => {
    doGenerateKey();
    setResetDialogOpen(false);
    toast({ title: "Key 已重置", description: "旧 Key 已失效，新 Key 已生成，请及时更新调用配置。" });
  };

  const handleCopyKey = () => {
    if (!seatKey) return;
    navigator.clipboard.writeText(seatKey).then(() => {
      setCopiedKey(true);
      toast({ title: "已复制", description: "API Key 已复制到剪贴板" });
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(SUBSCRIPTION_BASE_URL).then(() => {
      setCopiedUrl(true);
      toast({ title: "已复制", description: "Base URL 已复制到剪贴板" });
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  // ── 自动续费 ──
  const handleAutoRenewToggle = (checked: boolean) => {
    if (checked) {
      setAutoRenew(true);
      const t = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === sub.id);
      if (t) t.autoRenew = true;
      toast({ title: "已开启自动续费", description: "到期前 7 天将自动扣款续费。" });
    } else {
      setShowCancelAutoRenew(true);
    }
  };
  const confirmCancelAutoRenew = () => {
    setAutoRenew(false);
    const t = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === sub.id);
    if (t) t.autoRenew = false;
    setShowCancelAutoRenew(false);
    toast({ title: "已关闭自动续费", description: "到期前将通过短信提醒您手动续费，到期未续费订阅将失效。" });
  };

  const handleExportUsage = () => {
    const records = (sub.deductionRecords ?? []).filter((d) => d.seatId === mySeat.id);
    const map = new Map<string, { time: string; modelName: string; inputTokens: number; outputTokens: number; totalCredits: number }>();
    records.forEach((d) => {
      const cur = map.get(d.modelId) ?? { time: d.time, modelName: d.modelName, inputTokens: 0, outputTokens: 0, totalCredits: 0 };
      if (d.time > cur.time) cur.time = d.time;
      if (d.billingItem.includes("输入")) cur.inputTokens += d.usage;
      else if (d.billingItem.includes("输出")) cur.outputTokens += d.usage;
      cur.totalCredits += d.deductedCredits;
      map.set(d.modelId, cur);
    });
    const grouped = Array.from(map.values()).sort((a, b) => b.totalCredits - a.totalCredits);
    const header = "时间,模型,抵扣项,消耗积分\n";
    const rows = grouped
      .map((g) => `${g.time},${g.modelName},输入${g.inputTokens}tokens/输出${g.outputTokens}tokens,${g.totalCredits}`)
      .join("\n");
    const csv = "\uFEFF" + header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `用量明细_${mySeat.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "导出成功", description: "用量明细已导出为 CSV 文件" });
  };

  return (
    <div className="w-full space-y-4">
      {/* 页头 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 我的订阅</h1>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${subStatusClass[sub.status]}`}
          >
            {subStatusLabel[sub.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setUsageDrawerOpen(true)}>
            查看用量明细
          </Button>
        </div>
      </div>

      {/* ── 上半部分：概况 ── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-purple-500" />
          <h2 className="text-base font-semibold text-foreground">概况</h2>
        </div>
        {/* 信息网格：左30% 中30% 右40%，每列两项 */}
        <div className="rounded-lg bg-muted/30 border border-border p-4">
          <div className="grid grid-cols-[3fr_3fr_4fr]">
            {/* 左列 */}
            <div className="pr-6 flex items-center justify-between gap-3">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">{currentLabel}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {isPersonal ? "Personal 旗舰版" : sub.planName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">自动续费</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {isPersonal ? (
                      <Switch checked={autoRenew} onCheckedChange={handleAutoRenewToggle} aria-label="自动续费开关" />
                    ) : sub.autoRenew ? (
                      <Badge className="bg-green-50 text-green-600 border-green-200">已开启</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">未开启</Badge>
                    )}
                  </div>
                </div>
              </div>
              {isPersonal && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/workspace/upgrade-order")}>
                    <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />升级
                  </Button>
                  <Button size="sm" className="h-8 text-xs text-white" style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }} onClick={() => navigate("/workspace/renew-order")}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />续费
                  </Button>
                </div>
              )}
            </div>
            {/* 中列 */}
            <div className="space-y-3 px-6 border-l border-border">
              <div>
                <p className="text-xs text-muted-foreground">剩余天数</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {remainingDays}<span className="text-xs font-normal text-muted-foreground ml-0.5">天</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">到期时间</p>
                <p className="text-sm font-medium text-foreground font-mono text-xs mt-0.5">
                  {formatDateTime(sub.currentPeriodEnd)}
                </p>
              </div>
            </div>
            {/* 右列 */}
            <div className="space-y-3 pl-6 border-l border-border">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">{remainLabel}</p>
                  {sub.totalPeriods && sub.totalPeriods > 1 && (
                    <span className="text-xs text-muted-foreground">
                      （本期周期：第 {sub.currentPeriodIndex} 期 / 共 {sub.totalPeriods} 期）
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-primary mt-0.5">{remainingPercent}%</p>
              </div>
              <Progress value={usedPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                已使用 {formatCredit(mySeat.usedQuota)} / {formatCredit(mySeat.periodQuota)} credit（{usedPercent}%）
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 下半部分：配置 ── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-foreground">配置</h2>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />查看使用指南
          </Button>
        </div>

        {/* 专属 API Key */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">专属 API Key</span>
          </div>
          <p className="text-xs text-muted-foreground">
            仅适用于 Token Plan。请妥善保管，如遇泄露请及时重置。
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border flex-1 min-w-0 truncate">
              {seatKey ? seatKeyPreview : "尚未生成"}
            </code>
            {seatKey ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-orange-500 hover:text-orange-600 shrink-0"
                  onClick={() => setResetDialogOpen(true)}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />重置
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={handleCopyKey}
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />复制
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-8 text-white shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                onClick={handleGenerate}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />生成
              </Button>
            )}
          </div>
        </div>

        {/* Base URL */}
        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Base URL</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border flex-1 min-w-0 truncate">
              {SUBSCRIPTION_BASE_URL}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={handleCopyUrl}
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />复制
                </>
              )}
            </Button>
          </div>
        </div>

      </section>

      {/* 重置 Key 确认弹窗 */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重置专属 API Key</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              重置后将生成新的 Key，旧 Key 立即失效。请确保已更新使用该 Key 的所有服务配置。确定要重置吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600"
            >
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 关闭自动续费确认 */}
      <AlertDialog open={showCancelAutoRenew} onOpenChange={setShowCancelAutoRenew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>关闭自动续费</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">关闭后，到期前将通过短信提醒您手动续费，到期未续费订阅将失效。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelAutoRenew(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAutoRenew}>确认关闭</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 用量明细抽屉 */}
      <Sheet open={usageDrawerOpen} onOpenChange={setUsageDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="flex-row items-center justify-between border-b border-border p-4 space-y-0">
            <SheetTitle className="text-base">用量明细</SheetTitle>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportUsage}>
              <Download className="w-3.5 h-3.5 mr-1.5" />导出
            </Button>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-4 py-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground whitespace-nowrap">时间</TableHead>
                  <TableHead className="text-muted-foreground">模型</TableHead>
                  <TableHead className="text-muted-foreground">抵扣项</TableHead>
                  <TableHead className="text-muted-foreground text-right">消耗积分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const records = (sub.deductionRecords ?? []).filter((d) => d.seatId === mySeat.id);
                  if (records.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                          暂无用量明细
                        </TableCell>
                      </TableRow>
                    );
                  }
                  // 按模型分组，合并输入/输出 Token
                  const map = new Map<string, { time: string; modelName: string; inputTokens: number; outputTokens: number; totalCredits: number }>();
                  records.forEach((d) => {
                    const cur = map.get(d.modelId) ?? { time: d.time, modelName: d.modelName, inputTokens: 0, outputTokens: 0, totalCredits: 0 };
                    if (d.time > cur.time) cur.time = d.time;
                    if (d.billingItem.includes("输入")) cur.inputTokens += d.usage;
                    else if (d.billingItem.includes("输出")) cur.outputTokens += d.usage;
                    else if (d.billingItem.includes("图片")) cur.inputTokens += d.usage;
                    cur.totalCredits += d.deductedCredits;
                    map.set(d.modelId, cur);
                  });
                  const grouped = Array.from(map.entries()).map(([modelId, v]) => ({ modelId, ...v })).sort((a, b) => b.totalCredits - a.totalCredits);
                  return grouped.map((g) => (
                    <TableRow key={g.modelId} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(g.time)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <Badge variant="outline" className="font-normal text-xs">{g.modelName}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {g.inputTokens > 0 && <div>输入：{g.inputTokens.toLocaleString()}tokens</div>}
                        {g.outputTokens > 0 && <div>输出：{g.outputTokens.toLocaleString()}tokens</div>}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium text-orange-600 whitespace-nowrap font-mono">
                        -{formatCredit(g.totalCredits)}
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
