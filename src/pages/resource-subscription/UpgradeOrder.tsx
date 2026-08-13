import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Info, Wallet, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MOCK_SEAT_SUBSCRIPTIONS,
  seatTierLabel,
  formatCredit,
  formatDateTime,
  calcRemainingDays,
  type Seat,
  type SeatTier,
} from "./subscriptions-data";
import { formatMoney } from "./shared";

const TIER_PRICING: Record<SeatTier, { monthlyPrice: number; quota: number }> = {
  lite: { monthlyPrice: 199, quota: 31_000_000 },
  standard: { monthlyPrice: 599, quota: 93_700_000 },
  premium: { monthlyPrice: 1299, quota: 233_000_000 },
};

const nextTier = (tier: SeatTier): SeatTier => {
  if (tier === "lite") return "standard";
  if (tier === "standard") return "premium";
  return "premium";
};

interface Props { mode?: "personal" | "enterprise" }

export default function UpgradeOrder({ mode = "enterprise" }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isPersonal = mode === "personal";
  const backUrl = isPersonal ? "/workspace/my-subscription" : "/workspace/team-subscription";

  const seatIdsParam = searchParams.get("seatIds") ?? "";
  const requestedSeatIds = seatIdsParam.split(",").filter(Boolean);

  const activeSub = useMemo(() => MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.status === "active") ?? null, []);

  const [seats, setSeats] = useState<Seat[]>(activeSub ? [...activeSub.seats] : []);
  const [targetTier, setTargetTier] = useState<SeatTier>("standard");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payResult, setPayResult] = useState<null | "success">(null);

  const upgradeSeats = useMemo(
    () => isPersonal
      ? seats.filter((s) => s.memberId === "1" && s.tier !== "premium")
      : requestedSeatIds.map((id) => seats.find((s) => s.id === id)).filter((s): s is Seat => !!s && s.tier !== "premium"),
    [requestedSeatIds, seats, isPersonal]
  );

  // 初始化目标档位为第一个可升级席位的下一档
  useMemo(() => {
    if (upgradeSeats.length > 0) {
      setTargetTier(nextTier(upgradeSeats[0].tier));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeSub || upgradeSeats.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <Info className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
        <p className="text-muted-foreground">{isPersonal ? "当前已是最高档位，无需升级" : "无可升级的席位"}</p>
        <Button variant="outline" onClick={() => navigate(backUrl)}>{isPersonal ? "返回我的订阅" : "返回席位管理"}</Button>
      </div>
    );
  }

  const remainingDays = calcRemainingDays(activeSub.currentPeriodEnd);
  const remainingRatio = remainingDays / 30;

  // 原价（升级后席位的完整月价 × 席位数）
  const originalTotal = upgradeSeats.reduce((sum, seat) => {
    return sum + TIER_PRICING[targetTier].monthlyPrice;
  }, 0);

  // 需补金额（差价 × 剩余周期折算）
  const upgradeAmount = upgradeSeats.reduce((sum, seat) => {
    const fromPrice = TIER_PRICING[seat.tier].monthlyPrice;
    const toPrice = TIER_PRICING[targetTier].monthlyPrice;
    return sum + Math.max(0, (toPrice - fromPrice)) * remainingRatio;
  }, 0);

  const newQuotaPerSeat = TIER_PRICING[targetTier].quota;

  const handleSubmit = () => {
    if (!agreed) {
      toast({ title: "请先勾选同意协议", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const idSet = new Set(upgradeSeats.map((s) => s.id));
      setSeats((prev) => prev.map((s) => idSet.has(s.id) ? { ...s, tier: targetTier, periodQuota: newQuotaPerSeat } : s));
      const target = MOCK_SEAT_SUBSCRIPTIONS.find((sub) => sub.id === activeSub.id);
      if (target) {
        target.seats = target.seats.map((s) => idSet.has(s.id) ? { ...s, tier: targetTier, periodQuota: newQuotaPerSeat } : s);
      }
      setPayResult("success");
    }, 800);
  };

  // ── 支付成功结果页 ──
  if (payResult === "success") {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-11 h-11 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">升级成功</h1>
          <p className="text-base text-muted-foreground">{isPersonal ? "订阅已升级" : "席位已升级"}至{seatTierLabel[targetTier]}，可立即使用新增额度</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button className="flex-1 h-12 text-base" onClick={() => navigate(backUrl)}>
            {isPersonal ? "返回我的订阅" : "返回席位管理"}
          </Button>
        </div>
      </div>
    );
  }

  // ── 主页面 ──
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
      {/* 顶部返回 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold text-foreground">确认订单</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* ── 左栏：席位表格 + 升级目标 ── */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{isPersonal ? "当前订阅" : "选中席位"}</h2>
              {!isPersonal && <span className="text-xs text-muted-foreground">共 {upgradeSeats.length} 个席位</span>}
            </div>
            {isPersonal ? (
              <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-foreground">Personal {seatTierLabel[upgradeSeats[0].tier]}</h4>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCredit(upgradeSeats[0].periodQuota)} Credits/月
                    </div>
                    <div className="text-sm font-semibold text-primary">
                      {formatMoney(TIER_PRICING[upgradeSeats[0].tier].monthlyPrice)}/月
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground mb-1">余量</div>
                    {(() => {
                      const remaining = upgradeSeats[0].periodQuota - upgradeSeats[0].usedQuota;
                      const remainPercent = upgradeSeats[0].periodQuota > 0 ? Math.round((remaining / upgradeSeats[0].periodQuota) * 100) : 0;
                      return (
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-xs text-muted-foreground">{remainPercent}%</span>
                          <Progress value={remainPercent} className="h-1 w-16" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-muted-foreground whitespace-nowrap">席位规格</TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">席位ID</TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">额度</TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">余量</TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">分配成员</TableHead>
                    <TableHead className="text-muted-foreground whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upgradeSeats.map((seat) => {
                    const remaining = seat.periodQuota - seat.usedQuota;
                    const remainPercent = seat.periodQuota > 0 ? Math.round((remaining / seat.periodQuota) * 100) : 0;
                    return (
                      <TableRow key={seat.id} className="hover:bg-muted/30">
                        <TableCell className="whitespace-nowrap"><Badge variant="outline" className="font-normal text-xs">{seatTierLabel[seat.tier]}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{seat.id}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatCredit(seat.periodQuota)} <span className="text-xs text-muted-foreground">credits</span></TableCell>
                        <TableCell className="text-sm whitespace-nowrap font-medium text-primary">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">{remainPercent}%</span>
                            <Progress value={remainPercent} className="h-1 w-16" />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {seat.memberName ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-medium">{seat.memberName}</span>
                              <span className="text-xs text-muted-foreground font-mono">{seat.memberAccount ?? seat.memberId ?? "—"}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="font-normal text-xs text-blue-600 border-blue-300">
                            {seatTierLabel[seat.tier]} → {seatTierLabel[targetTier]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            )}
          </div>

          {/* 升级目标选择 */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">升级目标</h2>
            <Separator />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">升级至</span>
              <Select value={targetTier} onValueChange={(v) => setTargetTier(v as SeatTier)}>
                <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">标准版</SelectItem>
                  <SelectItem value="premium">尊享版</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{formatCredit(newQuotaPerSeat)} credits / 席 / 月</span>
            </div>
          </div>

          {/* 计费说明（左下角灰色小字） */}
          <p className="text-xs text-muted-foreground/70 leading-relaxed px-1">
            生效说明：升级成功后立即生效，到期时间将与当前已购套餐保持一致。<br />
            计费说明：升级费用按当前订阅的剩余周期折算，仅收取目标档位与当前档位的差价。<br />
            额度说明：升级后，本周期额度按{seatTierLabel[targetTier]}对应额度更新；已使用额度保留，可用额度根据更新后的额度计算。<br />
            降级说明：当前周期内不支持降级。
          </p>
        </div>

        {/* ── 右栏：订单明细 ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            {/* 订单概览 */}
            <div className="bg-muted/40 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{isPersonal ? "升级订阅" : "升级订单"}</h2>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{isPersonal ? "当前档位" : "升级席位数"}</span>
                  <span className="text-foreground font-medium">{isPersonal ? seatTierLabel[upgradeSeats[0].tier] : `${upgradeSeats.length} 个`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">升级至</span>
                  <span className="text-foreground font-medium">{seatTierLabel[targetTier]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">到期时间</span>
                  <span className="text-foreground font-medium text-xs">{formatDateTime(activeSub.currentPeriodEnd)}</span>
                </div>
              </div>
            </div>
            <Separator />
            {/* 价格 */}
            <div className="p-5 space-y-3">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">原价</span>
                  <span className="text-muted-foreground line-through">¥ {originalTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium">预计需补金额</span>
                  <span className="text-rose-500 font-bold text-lg">¥ {upgradeAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Separator />
            {/* 支付方式 */}
            <div className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">选择支付方式</h2>
              <Separator />
              <div className="space-y-2.5">
                <button
                  type="button"
                  className="w-full text-left rounded-lg border border-primary ring-1 ring-primary/20 bg-primary/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">充值余额</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">使用充值余额直接付款</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <Separator />
            {/* 协议 */}
            <div className="p-4 space-y-2.5">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  我已阅读并同意
                  <a href="#" className="text-primary mx-0.5 hover:underline">《订阅服务协议》</a>
                </span>
              </label>
            </div>
          </section>

          {/* 提交按钮 */}
          <Button
            className="w-full h-12 text-base"
            disabled={!agreed || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              `确认支付 ¥${upgradeAmount.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
