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
import { ArrowLeft, Info, CheckCircle2, Loader2, Minus, Plus, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MOCK_SEAT_SUBSCRIPTIONS,
  seatTierLabel,
  formatCredit,
  formatDateTime,
  calcRemainingDays,
  type SeatTier,
} from "./subscriptions-data";
import { formatMoney } from "./shared";

const TIER_PRICING: Record<SeatTier, { monthlyPrice: number; quota: number }> = {
  lite: { monthlyPrice: 199, quota: 31_000_000 },
  standard: { monthlyPrice: 599, quota: 93_700_000 },
  premium: { monthlyPrice: 1299, quota: 233_000_000 },
};

const TIER_ORDER: SeatTier[] = ["lite", "standard", "premium"];

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

interface BankOption {
  code: string;
  name: string;
  color: string;
}

const BANK_OPTIONS: BankOption[] = [
  { code: "boc", name: "中国银行", color: "#b71c1c" },
];

export default function AddonOrder({ balance = 5000 }: { balance?: number }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const activeSub = useMemo(() => MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.status === "active") ?? null, []);

  const [counts, setCounts] = useState<Record<SeatTier, number>>({
    lite: 0,
    standard: 0,
    premium: 0,
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("balance");
  const [selectedBank, setSelectedBank] = useState<string>("boc");
  const [agreed, setAgreed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payResult, setPayResult] = useState<null | "success" | "processing">(null);
  const [orderNo, setOrderNo] = useState("");

  const remainingDays = activeSub ? calcRemainingDays(activeSub.currentPeriodEnd) : 0;

  // 每档位折算后单价（按剩余天数/30天近似）
  const proratedPrices = useMemo(() => {
    const result: Record<SeatTier, number> = {} as Record<SeatTier, number>;
    TIER_ORDER.forEach((tier) => {
      result[tier] = Math.round(TIER_PRICING[tier].monthlyPrice * (remainingDays / 30) * 100) / 100;
    });
    return result;
  }, [remainingDays]);

  const addonItems = useMemo(() => {
    return TIER_ORDER.filter((tier) => counts[tier] > 0).map((tier) => ({
      tier,
      count: counts[tier],
      unitPrice: proratedPrices[tier],
      amount: Math.round(proratedPrices[tier] * counts[tier] * 100) / 100,
    }));
  }, [counts, proratedPrices]);

  const totalAddonSeats = addonItems.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = Math.round(addonItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const totalAddedQuota = TIER_ORDER.reduce((sum, tier) => sum + counts[tier] * TIER_PRICING[tier].quota, 0);

  const balanceSufficient = balance >= totalAmount;
  const balanceShort = totalAmount - balance;
  const selectedBankName = BANK_OPTIONS.find((b) => b.code === selectedBank)?.name ?? "网银";
  const submitLabel = paymentMethod === "online"
    ? `前往${selectedBankName}支付 ${formatMoney(totalAmount)}`
    : `确认支付 ${formatMoney(totalAmount)}`;

  const handleCountChange = (tier: SeatTier, value: number) => {
    setCounts((prev) => ({ ...prev, [tier]: Math.max(0, value) }));
  };

  const handleSubmit = () => {
    if (!agreed) {
      toast({ title: "请先勾选同意协议", variant: "destructive" });
      return;
    }
    if (totalAddonSeats <= 0) {
      toast({ title: "请至少选择一个席位", variant: "destructive" });
      return;
    }
    if (paymentMethod === "balance" && !balanceSufficient) {
      toast({ title: "余额不足", description: `差 ${formatMoney(balanceShort)}，请前往充值或选择其他支付方式`, variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmPay = () => {
    setShowConfirm(false);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (!orderNo) {
        setOrderNo(`MO${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`);
      }
      if (paymentMethod === "online") {
        setPayResult("processing");
        toast({ title: "订单已创建", description: `正在跳转至${selectedBankName}支付页面...` });
      } else {
        const target = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === activeSub?.id);
        if (target) {
          target.seatCount += totalAddonSeats;
        }
        setPayResult("success");
      }
    }, 800);
  };

  // ── 支付成功结果页 ──
  if (payResult === "success") {
    const now = new Date();
    const effectiveTime = now.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).replace(/\//g, "-");
    const payMethodLabel = paymentMethod === "balance" ? "充值余额" : `${selectedBankName}网银支付`;
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-11 h-11 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">加购成功</h1>
          <p className="text-base text-muted-foreground">席位已加购，可立即使用新增额度</p>
        </div>
        <div className="space-y-4 text-base">
          {addonItems.map((item) => (
            <div key={item.tier} className="flex items-center justify-between py-2 border-b border-border/60">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{seatTierLabel[item.tier]}</h4>
                <p className="text-xs text-muted-foreground mt-1">{item.count} 席 · {formatCredit(TIER_PRICING[item.tier].quota * item.count)} Credit</p>
              </div>
              <span className="text-rose-500 font-semibold">{formatMoney(item.amount)}</span>
            </div>
          ))}
          <ResultRow label="订单号" value={orderNo} />
          <ResultRow label="加购席位" value={`${totalAddonSeats} 席`} />
          <ResultRow label="实际应付" value={formatMoney(totalAmount)} highlight />
          <ResultRow label="支付方式" value={payMethodLabel} />
          <ResultRow label="支付时间" value={effectiveTime} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button className="flex-1 h-12 text-base" onClick={() => navigate("/workspace/team-subscription")}>
            返回席位管理
          </Button>
        </div>
      </div>
    );
  }

  // ── 支付处理中（网银）──
  if (payResult === "processing") {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-9 h-9 text-amber-500 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">支付处理中</h1>
          <p className="text-sm text-muted-foreground">
            已跳转至{selectedBankName}支付页面，支付完成后请返回本页面查看结果
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="space-y-2.5 text-sm">
            <ResultRow label="商品名称" value="加购席位" />
            <ResultRow label="待实际应付" value={formatMoney(totalAmount)} highlight />
            <ResultRow label="支付方式" value={`${selectedBankName}网银支付`} />
          </div>
          <Separator />
          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={submitting}
              onClick={() => {
                setSubmitting(true);
                setTimeout(() => {
                  setSubmitting(false);
                  const target = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === activeSub?.id);
                  if (target) {
                    target.seatCount += totalAddonSeats;
                  }
                  setPayResult("success");
                  toast({ title: "支付成功", description: "席位已加购" });
                }, 800);
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  刷新中...
                </>
              ) : (
                "刷新支付状态"
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/workspace/team-subscription")}>
              返回席位管理
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSub) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <p className="text-muted-foreground">未找到有效订阅</p>
        <Button variant="outline" onClick={() => navigate("/workspace/team-subscription")}>
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
      {/* 顶部返回 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold text-foreground">加购席位</h1>
      </div>

      {/* 顶部提示 */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p>购买成功后立即生效，到期时间将与当前已购套餐保持一致。</p>
          <p>计费说明：新席位按主账户当前周期剩余天数计价，自动续费规则跟随主账户。</p>
          <p>额度说明：本周期内可用额度按主账户当前周期剩余天数对应额度折算，下周期重置至完整额度。</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* ── 左栏：三档位选择 ── */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">选择席位档位</h2>
            </div>

            {TIER_ORDER.map((tier) => {
              const pricing = TIER_PRICING[tier];
              const prorated = proratedPrices[tier];
              const count = counts[tier];
              const subtotal = Math.round(prorated * count * 100) / 100;
              return (
                <div
                  key={tier}
                  className={`rounded-xl border p-5 transition-all ${
                    count > 0 ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-foreground">{seatTierLabel[tier]}</h4>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatCredit(pricing.quota)} Credits/席/月
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground line-through">
                          原价 {formatMoney(pricing.monthlyPrice)}/席
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          折算 {formatMoney(prorated)}/席
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCountChange(tier, count - 1)}
                        disabled={count <= 0}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={count}
                        min={0}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          handleCountChange(tier, v);
                        }}
                        className="w-12 h-8 text-center text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground"
                      />
                      <button
                        onClick={() => handleCountChange(tier, count + 1)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {count > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {count} 席 × {formatMoney(prorated)}
                      </span>
                      <span className="font-medium text-foreground">{formatMoney(subtotal)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 右栏：订单明细 ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="bg-card border border-border rounded-xl overflow-hidden">
            {/* 订单概览 */}
            <div className="bg-muted/40 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">加购席位</h2>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">当前席位</span>
                  <span className="text-foreground font-medium">{activeSub.seatCount} 席</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">加购席位</span>
                  <span className="text-foreground font-medium">{totalAddonSeats} 席</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">到期时间</span>
                  <span className="text-foreground font-medium text-xs">{formatDateTime(activeSub.currentPeriodEnd)}</span>
                </div>
              </div>
            </div>
            <Separator />
            {/* 计费详情 */}
            <div className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">计费详情</h2>
              <Separator />
              <div className="space-y-2.5 text-sm">
                {addonItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">请选择需要加购的席位档位</p>
                ) : (
                  addonItems.map((item) => (
                    <div key={item.tier} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {seatTierLabel[item.tier]} × {item.count} 席
                      </span>
                      <span className="text-foreground">{formatMoney(item.amount)}</span>
                    </div>
                  ))
                )}
                {totalAddonSeats > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">增加 Credit</span>
                      <span className="text-emerald-600 font-medium">+{formatCredit(totalAddedQuota)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-medium">应付</span>
                      <span className="text-rose-500 font-bold text-lg">{formatMoney(totalAmount)}</span>
                    </div>
                  </>
                )}
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
                              {active && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            {opt.value === "balance" && (
                              <div className="text-right shrink-0">
                                <div className="text-[10px] text-muted-foreground leading-none">可用余额</div>
                                <div className={`text-sm font-semibold mt-0.5 ${
                                  totalAddonSeats > 0 && !balanceSufficient ? "text-destructive" : "text-foreground"
                                }`}>
                                  {formatMoney(balance)}
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                        </div>
                      </div>

                      {/* 余额不足提示 */}
                      {opt.value === "balance" && active && totalAddonSeats > 0 && !balanceSufficient && (
                        <div className="mt-2.5 text-xs bg-destructive/5 border border-destructive/20 rounded-md p-2">
                          <span className="text-destructive">余额不足，差 {formatMoney(balanceShort)}，请充值后再下单。</span>
                        </div>
                      )}

                      {/* 网银支付：银行卡片选择 */}
                      {opt.value === "online" && active && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            提交订单后将跳转至所选银行页面完成付款。
                          </p>
                          <div className="grid grid-cols-3 gap-3 max-w-[280px]">
                            {BANK_OPTIONS.map((bank) => {
                              const isBankActive = selectedBank === bank.code;
                              return (
                                <button
                                  key={bank.code}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBank(bank.code);
                                  }}
                                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                                    isBankActive
                                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                                      : "border-border hover:border-primary/40 bg-card"
                                  }`}
                                >
                                  <div
                                    className="w-12 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                                    style={{ background: bank.color }}
                                  >
                                    {bank.name.slice(0, 2)}
                                  </div>
                                  <span className="text-xs text-foreground leading-tight text-center">
                                    {bank.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
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
                  ，了解加购席位到期时间与主订阅一致。
                </span>
              </label>
            </div>
          </section>

          {/* 提交按钮 */}
          <Button
            className="w-full h-12 text-base"
            disabled={totalAddonSeats <= 0 || !agreed || submitting}
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
            <DialogTitle className="text-center pt-2">确认支付</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品</span>
                <span className="text-foreground font-medium">加购席位（{totalAddonSeats} 席）</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">支付方式</span>
                <span className="text-foreground">
                  {paymentMethod === "balance" ? "充值余额" : `${selectedBankName}网银支付`}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">实际应付</span>
                <span className="text-rose-500 font-bold text-lg">
                  {formatMoney(totalAmount)}
                </span>
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
              ) : paymentMethod === "online" ? (
                "前往支付"
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
