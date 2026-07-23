import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Info, CheckCircle2, Loader2, Wallet, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MOCK_SEAT_SUBSCRIPTIONS,
  seatTierLabel,
  formatCredit,
  formatDateTime,
  type SeatTier,
} from "./subscriptions-data";
import { formatMoney } from "./shared";

const TIER_PRICING: Record<SeatTier, { monthlyPrice: number; quota: number }> = {
  lite: { monthlyPrice: 199, quota: 31_000_000 },
  standard: { monthlyPrice: 599, quota: 93_700_000 },
  premium: { monthlyPrice: 1299, quota: 233_000_000 },
};

const TIER_ORDER: SeatTier[] = ["lite", "standard", "premium"];

interface RenewCycle {
  months: number;
  label: string;
  desc: string;
  discount?: number; // 折扣（0-1），暂不使用，预留
}

const RENEW_CYCLES: RenewCycle[] = [
  { months: 1, label: "1 个月", desc: "按月续费，灵活可控" },
  { months: 3, label: "3 个月", desc: "季度续费，省心之选" },
  { months: 6, label: "6 个月", desc: "半年续费，长期稳定" },
];

type PaymentMethod = "balance" | "online";

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof Wallet;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: "balance",
    label: "充值余额",
    desc: "使用充值余额直接付款，支持自动续费",
    icon: Wallet,
  },
  // 网银支付暂时隐藏，后续上线再恢复
  // {
  //   value: "online",
  //   label: "网银支付",
  //   desc: "跳转至银行页面完成付款",
  //   icon: Wallet,
  // },
];

export default function RenewOrder({ balance = 5000, mode = "enterprise" }: { balance?: number; mode?: "personal" | "enterprise" }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isPersonal = mode === "personal";
  const backUrl = isPersonal ? "/workspace/my-subscription" : "/workspace/team-subscription";

  const activeSub = useMemo(() => MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.status === "active") ?? null, []);

  // 当前各档位席位数（只读，跟随订阅概况）
  const tierCounts = useMemo(() => {
    const result: Record<SeatTier, number> = { lite: 0, standard: 0, premium: 0 };
    if (activeSub) {
      activeSub.seats.forEach((seat) => {
        result[seat.tier] += 1;
      });
    }
    return result;
  }, [activeSub]);

  // 个人模式：当前用户的席位
  const mySeat = useMemo(() => activeSub?.seats.find((s) => s.memberId === "1") ?? null, [activeSub]);

  const [cycleMonths, setCycleMonths] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("balance");
  const [agreed, setAgreed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payResult, setPayResult] = useState<null | "success">(null);
  const [orderNo, setOrderNo] = useState("");

  if (!activeSub || (isPersonal && !mySeat)) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <p className="text-muted-foreground">暂无生效中的订阅，无法续费。</p>
        <Button variant="outline" onClick={() => navigate(backUrl)}>{isPersonal ? "返回我的订阅" : "返回席位管理"}</Button>
      </div>
    );
  }

  const totalSeats = isPersonal ? 1 : TIER_ORDER.reduce((sum, t) => sum + tierCounts[t], 0);

  // 续费明细
  const renewItems = useMemo(
    () => isPersonal && mySeat
      ? [{
          tier: mySeat.tier,
          count: 1,
          monthlyPrice: TIER_PRICING[mySeat.tier].monthlyPrice,
          amount: Math.round(TIER_PRICING[mySeat.tier].monthlyPrice * cycleMonths * 100) / 100,
          quota: TIER_PRICING[mySeat.tier].quota,
        }]
      : TIER_ORDER.filter((tier) => tierCounts[tier] > 0).map((tier) => ({
          tier,
          count: tierCounts[tier],
          monthlyPrice: TIER_PRICING[tier].monthlyPrice,
          amount: Math.round(tierCounts[tier] * TIER_PRICING[tier].monthlyPrice * cycleMonths * 100) / 100,
          quota: TIER_PRICING[tier].quota,
        })),
    [tierCounts, cycleMonths, isPersonal, mySeat]
  );

  const totalAmount = Math.round(renewItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const totalQuota = renewItems.reduce((sum, item) => sum + item.count * item.quota * cycleMonths, 0);

  // 续费后到期时间
  const renewedEndDate = useMemo(() => {
    const base = new Date(activeSub.currentPeriodEnd);
    base.setMonth(base.getMonth() + cycleMonths);
    return base;
  }, [activeSub, cycleMonths]);

  const balanceSufficient = balance >= totalAmount;
  const balanceShort = totalAmount - balance;
  const submitLabel = `确认支付 ${formatMoney(totalAmount)}`;

  const handleSubmit = () => {
    if (!agreed) {
      toast({ title: "请先勾选同意协议", variant: "destructive" });
      return;
    }
    if (totalSeats <= 0) {
      toast({ title: "无可续费席位", variant: "destructive" });
      return;
    }
    if (paymentMethod === "balance" && !balanceSufficient) {
      toast({ title: "余额不足", description: `差 ${formatMoney(balanceShort)}，请前往充值`, variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmPay = () => {
    setShowConfirm(false);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setOrderNo(`MO${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`);
      // 续费：延长到期时间
      activeSub.currentPeriodEnd = renewedEndDate.toISOString();
      if (activeSub.autoRenew) {
        activeSub.nextBillingAt = renewedEndDate.toISOString();
      }
      setPayResult("success");
    }, 800);
  };

  // ── 支付成功结果页 ──
  if (payResult === "success") {
    const now = new Date();
    const payTime = now.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).replace(/\//g, "-");
    const payMethodLabel = paymentMethod === "balance" ? "充值余额" : "网银支付";
    const cycleLabel = RENEW_CYCLES.find((c) => c.months === cycleMonths)?.label ?? `${cycleMonths} 个月`;
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-11 h-11 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">续费成功</h1>
          <p className="text-base text-muted-foreground">订阅已续期，到期时间已更新</p>
        </div>
        <div className="space-y-4 text-base">
          {renewItems.map((item) => (
            <div key={item.tier} className="flex items-center justify-between py-2 border-b border-border/60">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{isPersonal ? "Personal " : ""}{seatTierLabel[item.tier]}</h4>
                <p className="text-xs text-muted-foreground mt-1">{isPersonal ? `${formatCredit(item.quota * cycleMonths)} Credit` : `${item.count} 席 · ${formatCredit(item.quota * item.count * cycleMonths)} Credit`}</p>
              </div>
              <span className="text-rose-500 font-semibold">{formatMoney(item.amount)}</span>
            </div>
          ))}
          <ResultRow label="订单号" value={orderNo} />
          <ResultRow label="续费周期" value={cycleLabel} />
          {!isPersonal && <ResultRow label="续费席位" value={`${totalSeats} 席`} />}
          <ResultRow label="续费后到期" value={formatDateTime(renewedEndDate.toISOString())} />
          <ResultRow label="实际应付" value={formatMoney(totalAmount)} highlight />
          <ResultRow label="支付方式" value={payMethodLabel} />
          <ResultRow label="支付时间" value={payTime} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button className="flex-1 h-12 text-base" onClick={() => navigate(backUrl)}>
            {isPersonal ? "返回我的订阅" : "返回席位管理"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* 页头 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold text-foreground">续费订阅</h1>
      </div>

      {/* 顶部提示 */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p>续费后到期时间将在当前到期时间基础上顺延{isPersonal ? "，订阅档位保持不变。" : "，席位档位与数量保持不变。"}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* ── 左栏：当前席位（只读）+ 续费周期 ── */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{isPersonal ? "当前订阅" : "当前席位"}</h2>
              <span className="text-xs text-muted-foreground">
                到期：<span className="font-mono text-foreground">{formatDateTime(activeSub.currentPeriodEnd)}</span>
              </span>
            </div>

            {/* 个人模式：单计划卡片 / 企业模式：三档位只读卡片 */}
            <div className="space-y-3">
              {(isPersonal ? [mySeat!.tier] : TIER_ORDER).map((tier) => {
                const pricing = TIER_PRICING[tier];
                const count = isPersonal ? 1 : tierCounts[tier];
                return (
                  <div
                    key={tier}
                    className={`rounded-xl border p-5 ${count > 0 ? "border-primary/30 bg-primary/[0.03]" : "border-border opacity-60"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="text-lg font-bold text-foreground">{isPersonal ? "Personal " : ""}{seatTierLabel[tier]}</h4>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatCredit(pricing.quota)} {isPersonal ? "Credits/月" : "Credits/席/月"}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-primary">
                          {formatMoney(pricing.monthlyPrice)}{isPersonal ? "/月" : "/席/月"}
                        </div>
                      </div>
                      {!isPersonal && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right whitespace-nowrap">
                            <span className="text-2xl font-bold text-foreground">{count}</span>
                            <span className="text-sm font-normal text-muted-foreground ml-1">席</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* 续费周期选择 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">选择续费周期</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {RENEW_CYCLES.map((cycle) => {
                  const active = cycleMonths === cycle.months;
                  return (
                    <button
                      key={cycle.months}
                      type="button"
                      onClick={() => setCycleMonths(cycle.months)}
                      className={`rounded-lg border p-4 text-center transition-all ${
                        active
                          ? "border-primary ring-1 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="text-base font-bold text-foreground">{cycle.label}</span>
                      {active && <CheckCircle2 className="w-4 h-4 text-primary inline-block ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 右栏：订单明细 ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            {/* 订单概览 */}
            <div className="bg-muted/40 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{isPersonal ? "Token Plan 个人版" : "Token Plan 企业版"}</h2>
              <Separator />
              <div className="space-y-2 text-sm">
                {!isPersonal && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">续费席位</span>
                  <span className="text-foreground font-medium">{totalSeats} 席</span>
                </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">续费周期</span>
                  <span className="text-foreground font-medium">
                    {RENEW_CYCLES.find((c) => c.months === cycleMonths)?.label}
                    <span className="text-xs text-muted-foreground ml-1">
                      （至 {formatDateTime(renewedEndDate.toISOString())}）
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <Separator />
            {/* 计费详情 */}
            <div className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">计费详情</h2>
              <Separator />
              <div className="space-y-2.5 text-sm">
                {renewItems.map((item) => (
                  <div key={item.tier} className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {isPersonal ? `${seatTierLabel[item.tier]} × ${cycleMonths} 月` : `${seatTierLabel[item.tier]} × ${item.count} 席 × ${cycleMonths} 月`}
                    </span>
                    <span className="text-foreground">{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">续费总额度</span>
                  <span className="text-emerald-600 font-medium">+{formatCredit(totalQuota)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium">应付</span>
                  <span className="text-rose-500 font-bold text-lg">{formatMoney(totalAmount)}</span>
                </div>
              </div>
            </div>
            <Separator />
            {/* 支付方式 */}
            <div className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">选择支付方式</h2>
              <Separator />
              <div className="space-y-2.5">
                {PAYMENT_OPTIONS.map((opt) => {
                  const active = paymentMethod === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${
                        active
                          ? "border-primary ring-1 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-foreground">{opt.label}</span>
                              {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                            {opt.value === "balance" && (
                              <div className="text-right shrink-0">
                                <div className="text-[10px] text-muted-foreground leading-none">可用余额</div>
                                <div className={`text-sm font-semibold mt-0.5 ${
                                  !balanceSufficient ? "text-destructive" : "text-foreground"
                                }`}>
                                  {formatMoney(balance)}
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                        </div>
                      </div>
                      {opt.value === "balance" && active && !balanceSufficient && (
                        <div className="mt-2.5 text-xs bg-destructive/5 border border-destructive/20 rounded-md p-2">
                          <span className="text-destructive">余额不足，差 {formatMoney(balanceShort)}，请充值后再下单。</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <Separator />
            {/* 协议 */}
            <div className="p-4 space-y-2.5">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(c) => setAgreed(c === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  我已阅读并同意
                  <a href="#" className="text-primary mx-0.5 hover:underline">《订阅服务协议》</a>
                  与
                  <a href="#" className="text-primary mx-0.5 hover:underline">《自动续费协议》</a>
                </span>
              </label>
            </div>
          </section>

          {/* 提交按钮 */}
          <Button
            className="w-full h-12 text-base"
            disabled={totalSeats <= 0 || !agreed || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>

      {/* 二次确认弹窗 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center pt-2">确认续费支付</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品</span>
                <span className="text-foreground font-medium">{isPersonal ? `Personal ${seatTierLabel[mySeat!.tier]}` : `${activeSub.planName}（${totalSeats} 席）`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">续费周期</span>
                <span className="text-foreground">{RENEW_CYCLES.find((c) => c.months === cycleMonths)?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">续费后到期</span>
                <span className="text-foreground text-xs">{formatDateTime(renewedEndDate.toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">支付方式</span>
                <span className="text-foreground">{paymentMethod === "balance" ? "充值余额" : "网银支付"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">实际应付</span>
                <span className="text-rose-500 font-bold text-lg">{formatMoney(totalAmount)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">
              取消
            </Button>
            <Button onClick={handleConfirmPay} disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认支付"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 辅助组件 ──────────────────────────────────────────

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-lg">{label}</span>
      <span className={`text-right text-lg font-mono ${highlight ? "text-primary font-semibold" : "text-foreground font-medium"}`}>{value}</span>
    </div>
  );
}
