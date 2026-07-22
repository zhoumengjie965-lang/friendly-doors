import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  Wallet,
  Clock,
  RefreshCw,
  CreditCard,
  Loader2,
  Package,
  KeyRound,
  AlertCircle,
  Minus,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Cycle,
  MOCK_PLANS,
  formatMoney,
  formatCredit,
} from "./shared";
import { findOrderById } from "./orders-data";

interface Props {
  mode: "enterprise" | "personal";
  role?: string;
  balance?: number;
}

type PaymentMethod = "balance" | "online";
type PayResult = null | "success" | "processing";

// 后续可扩展的支付方式配置
interface PaymentOption {
  value: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof Wallet;
  disabled?: boolean;
  disabledHint?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: "balance",
    label: "充值余额支付",
    desc: "使用充值余额直接付款，支持自动续费",
    icon: Wallet,
  },
  {
    value: "online",
    label: "网上银行支付",
    desc: "选择银行后跳转至对应网银页面完成付款",
    icon: CreditCard,
  },
];

// 网银支付：可选银行列表
interface BankOption {
  code: string;
  name: string;
  color: string;
}

const BANK_OPTIONS: BankOption[] = [
  { code: "boc", name: "中国银行", color: "#b71c1c" },
];

export default function ConfirmOrder({ mode, balance = 5000 }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const planId = searchParams.get("planId") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const cycle = (searchParams.get("cycle") as Cycle) ?? "month";
  const isPersonal = mode === "personal";
  // 企业版订阅套餐组合购买模式：三档可混合下单
  const isCombo = searchParams.get("combo") === "1" && mode === "enterprise";
  // 个人版固定 1 席，企业版可调整
  const initialSeats = isPersonal ? 1 : (parseInt(searchParams.get("seats") ?? "1", 10) || 1);

  // 席位数量（本地状态，企业版用户可在下单页调整，个人版固定 1）
  const [seats, setSeats] = useState<number>(initialSeats);
  // 用尽即停开关
  const [stopOnExhaust, setStopOnExhaust] = useState<boolean>(searchParams.get("stopOnExhaust") !== "0");

  // 支持从「待支付订单」进入支付：传入 orderId 时构造伪 plan 对象复用现有支付流程
  const existingOrder = orderId ? findOrderById(orderId) : null;
  const plan = useMemo(() => {
    if (isCombo) return null; // 组合购买模式不绑定单一套餐
    if (existingOrder) {
      return {
        id: existingOrder.id,
        name: existingOrder.productName,
        productType: existingOrder.productType,
        price: existingOrder.amount,
        originalPrice: existingOrder.originalAmount ?? existingOrder.amount,
        totalQuota: 0,
        cyclePricing: undefined,
        discountLabel: existingOrder.discountAmount ? `已优惠 ¥${existingOrder.discountAmount}` : undefined,
        validityMonths: 6,
        subscriptionKeyLimit: 0,
      } as any;
    }
    return MOCK_PLANS.find((p) => p.id === planId);
  }, [planId, existingOrder, isCombo]);

  // ── 组合购买：三档订阅套餐 ──
  const comboPlans = useMemo(() => {
    if (!isCombo) return [];
    return MOCK_PLANS
      .filter((p) => p.productType === "subscription" && p.status === "active" && p.purchaseSubject !== "personal")
      .sort((a, b) => a.sort - b.sort);
  }, [isCombo]);

  // 各档席位数（本地状态，来源套餐默认选购 1 席）
  const [comboSeats, setComboSeats] = useState<Record<string, number>>(() => {
    if (isCombo && planId) return { [planId]: 1 };
    return {};
  });

  // 各档明细行
  const comboLines = useMemo(() => {
    if (!isCombo) return [];
    return comboPlans.map((p) => {
      const s = comboSeats[p.id] ?? 0;
      const unit = p.cyclePricing?.[cycle] ?? { originalPrice: p.originalPrice ?? p.price, price: p.price, discountLabel: p.discountLabel };
      return {
        plan: p,
        seats: s,
        unitPrice: unit.price,
        originalUnitPrice: unit.originalPrice,
        subtotal: unit.price * s,
        originalSubtotal: unit.originalPrice * s,
        credit: p.totalQuota * s,
        keys: (p.baseKeyLimit ?? p.subscriptionKeyLimit ?? 0) * s,
      };
    });
  }, [isCombo, comboPlans, comboSeats, cycle]);

  const comboTotalSeats = comboLines.reduce((s, l) => s + l.seats, 0);
  const comboTotalPrice = comboLines.reduce((s, l) => s + l.subtotal, 0);
  const comboTotalOriginal = comboLines.reduce((s, l) => s + l.originalSubtotal, 0);
  const comboTotalCredit = comboLines.reduce((s, l) => s + l.credit, 0);
  const comboTotalKeys = comboLines.reduce((s, l) => s + l.keys, 0);
  const comboActiveLines = comboLines.filter((l) => l.seats > 0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("balance");
  const [selectedBank, setSelectedBank] = useState<string>("boc"); // 默认选中中国银行
  const [agreed, setAgreed] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true); // 订阅类套餐默认开启自动续费
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payResult, setPayResult] = useState<PayResult>(null);
  const [orderCountdown, setOrderCountdown] = useState(30 * 60); // 30 分钟

  // BOC 订单倒计时
  useEffect(() => {
    if (payResult !== "processing") return;
    const t = setInterval(() => {
      setOrderCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [payResult]);

  const fmtCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!plan && !isCombo) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
        <p className="text-muted-foreground">商品不存在或已下架</p>
        <Button variant="outline" onClick={() => navigate("/workspace/token-plan")}>
          返回选购
        </Button>
      </div>
    );
  }

  const isSubscription = isCombo || plan?.productType === "subscription";
  const isResource = !isCombo && plan?.productType === "one-time";

  // 价格计算（每席位单价）
  const unitPriceInfo = useMemo(() => {
    if (isCombo) return { originalPrice: 0, price: 0, discountLabel: "" };
    if (isSubscription && plan!.cyclePricing?.[cycle]) {
      return plan!.cyclePricing[cycle]!;
    }
    return {
      originalPrice: plan!.originalPrice ?? plan!.price,
      price: plan!.price,
      discountLabel: plan!.discountLabel,
    };
  }, [plan, cycle, isSubscription, isCombo]);

  // 多席位总价（combo 模式下为三档汇总）
  const priceInfo = useMemo(() => {
    if (isCombo) {
      return { originalPrice: comboTotalOriginal, price: comboTotalPrice, discountLabel: undefined };
    }
    return {
      originalPrice: unitPriceInfo.originalPrice * seats,
      price: unitPriceInfo.price * seats,
      discountLabel: unitPriceInfo.discountLabel,
    };
  }, [unitPriceInfo, seats, isCombo, comboTotalOriginal, comboTotalPrice]);

  const discount = priceInfo.originalPrice - priceInfo.price;
  const balanceShort = priceInfo.price - balance;
  const balanceSufficient = balance >= priceInfo.price;


  // 订单号：待支付订单复用原订单号，新购生成模拟订单号
  const orderNo = useMemo(
    () => existingOrder?.orderNo ?? `MO${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
    [planId, existingOrder]
  );
  // 订单过期时间（30分钟）
  const orderExpireAt = useMemo(() => {
    const base = existingOrder?.createdAt ? new Date(existingOrder.createdAt).getTime() : Date.now();
    const d = new Date(base + 30 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, [existingOrder]);
  const periodLabel = cycle === "month" ? "月" : cycle === "quarter" ? "季" : "年";

  // 组合购买：时长、到期日、席位上限
  const durationLabel = cycle === "month" ? "1 个月" : cycle === "quarter" ? "3 个月" : "1 年";
  const comboExpireDateStr = useMemo(() => {
    const d = new Date();
    if (cycle === "month") d.setMonth(d.getMonth() + 1);
    else if (cycle === "quarter") d.setMonth(d.getMonth() + 3);
    else d.setFullYear(d.getFullYear() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, [cycle]);
  const comboMaxSeats = comboPlans.reduce((s, p) => s + (p.maxSeats ?? 0), 0);

  // 按钮文案
  const selectedBankName = BANK_OPTIONS.find((b) => b.code === selectedBank)?.name ?? "网银";
  const submitLabel = paymentMethod === "online"
    ? `前往${selectedBankName}支付 ¥${priceInfo.price.toLocaleString("zh-CN")}`
    : isSubscription
      ? `确认订阅并支付 ¥${priceInfo.price.toLocaleString("zh-CN")}`
      : `确认购买并支付 ¥${priceInfo.price.toLocaleString("zh-CN")}`;

  const canSubmit = agreed && (!isCombo || comboTotalSeats > 0);

  const handleSubmit = () => {
    if (!agreed) {
      toast({ title: "请先勾选同意协议", variant: "destructive" });
      return;
    }
    if (paymentMethod === "balance" && !balanceSufficient) {
      // 余额不足时提示用户
      toast({ title: "余额不足", description: `差 ${formatMoney(balanceShort)}，请前往充值或选择其他支付方式`, variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmPay = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);

    if (paymentMethod === "online") {
      setPayResult("processing");
      toast({ title: existingOrder ? "正在跳转支付" : "订单已创建", description: `正在跳转至${selectedBankName}支付页面...` });
    } else {
      setPayResult("success");
      toast({ title: "支付成功", description: existingOrder ? "订单支付完成" : isCombo ? `组合套餐已开通（${comboActiveLines.length} 个档位）` : `${plan!.name} 已开通` });
    }
  };

  const handleRefreshPayStatus = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setPayResult("success");
    toast({ title: "支付成功", description: existingOrder ? "订单支付完成" : isCombo ? `组合套餐已开通（${comboActiveLines.length} 个档位）` : `${plan!.name} 已开通` });
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

    // 计算失效时间
    const expireDate = new Date(now);
    if (isResource) {
      expireDate.setMonth(expireDate.getMonth() + (plan.validityMonths ?? 6));
    } else {
      if (cycle === "month") expireDate.setMonth(expireDate.getMonth() + 1);
      else if (cycle === "quarter") expireDate.setMonth(expireDate.getMonth() + 3);
      else expireDate.setFullYear(expireDate.getFullYear() + 1);
    }
    expireDate.setHours(23, 59, 59, 999);
    const expireTime = expireDate.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).replace(/\//g, "-");

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="text-center space-y-4 py-8">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-11 h-11 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">支付成功</h1>
          <p className="text-base text-muted-foreground">
            {isSubscription ? "订阅已开通，可立即开始使用" : "资源包已购买，可立即开始调用"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-5">
          {isResource ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">购买详情</h2>
                <div className="text-base">
                  <span className="text-muted-foreground">订单号：</span>
                  <span className="font-mono text-foreground">{orderNo}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-base">
                <ResultRow label="购买账户" value={mode === "personal" ? "个人账户" : "某某科技有限公司"} />
                <ResultRow label="商品名称" value={isCombo ? "Enterprise 组合套餐" : plan!.name} />
                <ResultRow label="Credit 总量" value={`${formatCredit(plan.totalQuota)} Credit`} highlight />
                <ResultRow label="有效期" value={`${plan.validityMonths ?? 6} 个月`} />
                <ResultRow label="生效时间" value={effectiveTime} />
                <ResultRow label="失效时间" value={expireTime} />
              </div>
              <Separator className="mt-2" />
              <div className="flex gap-3 pt-1">
                {existingOrder ? (
                  <Button className="flex-1 h-12 text-base" onClick={() => navigate("/workspace/resource-orders")}>
                    返回订单列表
                  </Button>
                ) : (
                  <>
                    <Button className="flex-1 h-12 text-base" onClick={() => navigate("/workspace/resource-packages")}>
                      <Package className="w-5 h-5 mr-2" />
                      查看资源包
                    </Button>
                    <Button variant="outline" className="h-12 text-base px-8" onClick={() => navigate("/workspace/token-plan")}>
                      返回选购
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : isCombo ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">订阅详情</h2>
                <div className="text-base">
                  <span className="text-muted-foreground">订单号：</span>
                  <span className="font-mono text-foreground">{orderNo}</span>
                </div>
              </div>
              {/* 各档明细 */}
              <div className="space-y-3">
                {comboActiveLines.map((line) => (
                  <div key={line.plan.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{line.plan.name}</h4>
                          {line.plan.isPopular && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">推荐</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{line.seats} 席 · {formatCredit(line.credit)} Credit · {line.keys} 个 API Key</p>
                      </div>
                      <span className="text-rose-500 font-semibold">¥{line.subtotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="mt-2" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-base">
                <ResultRow label="购买账户" value="某某科技有限公司" />
                <ResultRow label="订阅周期" value={`包${periodLabel}`} />
                <ResultRow label="购买席位" value={`${comboTotalSeats} 席（${comboActiveLines.length} 个档位）`} />
                <ResultRow label="Credit 总量" value={`${formatCredit(comboTotalCredit)} Credit / ${periodLabel}`} highlight />
                <ResultRow label="API Key" value={`支持创建 ${comboTotalKeys} 个`} />
                <ResultRow label="生效时间" value={effectiveTime} />
                <ResultRow label="到期时间" value={expireTime} />
                <ResultRow label="自动续费" value={autoRenew && paymentMethod === "balance" ? "已开启" : "未开启"} />
              </div>
              <Separator className="mt-2" />
              <div className="flex gap-3 pt-1">
                <Button className="flex-1 h-12 text-base" onClick={() => navigate("/workspace/resource-packages")}>
                  管理订阅
                </Button>
                <Button variant="outline" className="h-12 text-base px-8" onClick={() => navigate("/workspace/resource-packages")}>
                  <KeyRound className="w-5 h-5 mr-2" />
                  创建订阅 Key
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">订阅详情</h2>
                <div className="text-base">
                  <span className="text-muted-foreground">订单号：</span>
                  <span className="font-mono text-foreground">{orderNo}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-base">
                <ResultRow label="购买账户" value={mode === "personal" ? "个人账户" : "某某科技有限公司"} />
                <ResultRow label="套餐名称" value={plan.name} />
                <ResultRow label="订阅周期" value={`包${periodLabel}`} />
                <ResultRow label="Credit 总量" value={`${formatCredit(plan.totalQuota)} Credit / ${periodLabel}`} highlight />
                <ResultRow label="API Key" value={`支持创建 ${plan.subscriptionKeyLimit} 个`} />
                <ResultRow label="生效时间" value={effectiveTime} />
                <ResultRow label="到期时间" value={expireTime} />
                <ResultRow label="自动续费" value={autoRenew && paymentMethod === "balance" ? "已开启" : "未开启"} />
              </div>
              <Separator className="mt-2" />
              <div className="flex gap-3 pt-1">
                {existingOrder ? (
                  <Button className="flex-1 h-12 text-base" onClick={() => navigate("/workspace/resource-orders")}>
                    返回订单列表
                  </Button>
                ) : (
                  <>
                    <Button className="flex-1 h-12 text-base" onClick={() => navigate("/workspace/resource-packages")}>
                      管理订阅
                    </Button>
                    <Button variant="outline" className="h-12 text-base px-8" onClick={() => navigate("/workspace/resource-packages")}>
                      <KeyRound className="w-5 h-5 mr-2" />
                      创建订阅 Key
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">订单有效时间</span>
            </div>
            <span className={`text-sm font-mono font-semibold ${orderCountdown > 0 ? "text-foreground" : "text-destructive"}`}>
              {orderCountdown > 0 ? fmtCountdown(orderCountdown) : "已超时"}
            </span>
          </div>
          <Separator />
          <div className="space-y-2.5 text-sm">
            <ResultRow label="商品名称" value={isCombo ? "Enterprise 组合套餐" : plan!.name} />
            <ResultRow label="订单金额" value={`¥${priceInfo.price.toLocaleString("zh-CN")}`} highlight />
            <ResultRow label="支付方式" value={`${selectedBankName}网银支付`} />
          </div>
          {orderCountdown === 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
              订单已超时，请重新下单
            </div>
          )}
          <Separator />
          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={submitting || orderCountdown === 0}
              onClick={handleRefreshPayStatus}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  刷新中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  刷新支付状态
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate(existingOrder ? "/workspace/resource-orders" : "/workspace/token-plan")}>
              {existingOrder ? "返回订单" : "返回选购"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 确认订单主页面 ──
  return (
    <div className="max-w-7xl space-y-6">
      {/* 支付超时提示条 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-amber-900">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <p>
          请于 <span className="font-semibold">{orderExpireAt}</span> 前完成支付，逾期订单将自动取消。
        </p>
      </div>

      {/* 顶部返回（仅在 lg 以下或主流程中） */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-bold text-foreground">确认订单</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_440px] gap-8 items-start">
        {/* ── 左栏 ── */}
        <div className="space-y-6">
          {isCombo ? (
            <>
              {/* 三档套餐卡片 */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <span className="text-base font-semibold text-foreground">选择套餐与席位</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {comboLines.map((line) => (
                    <div
                      key={line.plan.id}
                      className={`rounded-2xl border p-5 transition-all ${
                        line.seats > 0
                          ? "border-primary/40 bg-primary/[0.03]"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-foreground">{line.plan.name}</h4>
                            {line.plan.isPopular && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">推荐</span>
                            )}
                          </div>
                          {line.plan.positioning && (
                            <p className="text-xs text-muted-foreground mt-1">{line.plan.positioning}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline gap-0.5 justify-end">
                            <span className="text-xs text-rose-500/80">¥</span>
                            <span className="text-xl font-bold text-rose-500">{line.unitPrice.toLocaleString("zh-CN", { minimumFractionDigits: 0 })}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">/席/{periodLabel}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatCredit(line.plan.totalQuota)} Credit/席</span>
                        <span>{line.plan.baseKeyLimit ?? line.plan.subscriptionKeyLimit} Key/席</span>
                        {line.plan.rpmLimit && <span>{line.plan.rpmLimit} RPM</span>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-sm text-foreground">购买席位</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setComboSeats((prev) => ({ ...prev, [line.plan.id]: Math.max(0, (prev[line.plan.id] ?? 0) - 1) }))}
                            disabled={(comboSeats[line.plan.id] ?? 0) <= 0}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={comboSeats[line.plan.id] ?? 0}
                            min={0}
                            max={line.plan.maxSeats ?? 500}
                            onChange={(e) => {
                              const v = Math.max(0, parseInt(e.target.value) || 0);
                              setComboSeats((prev) => ({ ...prev, [line.plan.id]: Math.min(line.plan.maxSeats ?? 500, v) }));
                            }}
                            className="w-12 h-8 text-center text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground"
                          />
                          <button
                            onClick={() => setComboSeats((prev) => ({ ...prev, [line.plan.id]: Math.min(line.plan.maxSeats ?? 500, (prev[line.plan.id] ?? 0) + 1) }))}
                            disabled={(comboSeats[line.plan.id] ?? 0) >= (line.plan.maxSeats ?? 500)}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </section>

              {/* 购买说明 */}
              <div className="space-y-1.5 text-xs text-muted-foreground/80 leading-relaxed px-1">
                <p>计费说明：单次消耗的 Credits 由模型类型、Token 用量等动态决定，实际消耗以明细为准。</p>
                <p>支付说明：不支持使用代金券下单购买。</p>
                <p>退款政策：Token Plan 企业版不支持退款，订阅后不可退订。</p>
              </div>
            </>
          ) : (
            <>
          {/* 待支付金额（最显眼） */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <span className="text-sm font-semibold text-foreground">待支付金额</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-medium text-rose-500">¥</span>
              <span className="text-5xl font-bold text-rose-500 leading-none">
                {priceInfo.price.toLocaleString("zh-CN")}
              </span>
              {isSubscription && (
                <span className="text-sm text-muted-foreground ml-1">/ {periodLabel}</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>原价 <span className="line-through">¥{priceInfo.originalPrice.toLocaleString("zh-CN")}</span></span>
              {discount > 0 && (
                <span className="text-emerald-600">优惠 ¥{discount.toLocaleString("zh-CN")}</span>
              )}
            </div>
          </section>

          {/* 支付明细 / 商品信息 */}
          <section className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <span className="text-base font-semibold text-foreground">支付明细</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{isCombo ? "Enterprise 组合套餐" : plan.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary">新购</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">订单号：{orderNo}</p>
            </div>

            <Separator className="h-px bg-border/70" />

            {isResource ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <DetailRow label="购买账户" value={mode === "personal" ? "个人账户" : "某某科技有限公司"} />
                <DetailRow label="商品名称" value={plan.name} />
                <DetailRow label="购买数量" value="1" />
                <DetailRow label="Credit 总量" value={`${formatCredit(plan.totalQuota)} Credit`} highlight />
                <DetailRow label="有效期" value={`${plan.validityMonths ?? 6} 个月`} />
                <DetailRow label="生效时间" value="购买后立即生效" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* 席位数量选择（仅企业版显示） */}
                {mode === "enterprise" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">席位数量</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSeats((s) => Math.max(1, s - 1))}
                        disabled={seats <= 1}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={seats}
                        min={1}
                        max={plan.maxSeats ?? 100}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 1;
                          setSeats(Math.max(1, Math.min(plan.maxSeats ?? 100, v)));
                        }}
                        className="w-14 h-9 text-center text-base font-medium border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground"
                      />
                      <button
                        onClick={() => setSeats((s) => Math.min(plan.maxSeats ?? 100, s + 1))}
                        disabled={seats >= (plan.maxSeats ?? 100)}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 用尽即停开关 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">用尽即停</span>
                  <Switch
                    checked={stopOnExhaust}
                    onCheckedChange={setStopOnExhaust}
                    aria-label="用尽即停"
                  />
                </div>

                <Separator />

                {/* 订单信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <DetailRow label="购买账户" value={mode === "personal" ? "个人账户" : "某某科技有限公司"} />
                  <DetailRow label="套餐名称" value={plan.name} />
                  <DetailRow label="套餐周期" value={`包${periodLabel}`} />
                  {mode === "enterprise" && <DetailRow label="购买席位" value={`${seats} 席`} />}
                  <DetailRow
                    label="Credit额度"
                    value={
                      mode === "personal"
                        ? `${formatCredit(plan.totalQuota)} Credit / ${periodLabel}`
                        : `${formatCredit(plan.totalQuota * seats)} Credit / ${periodLabel}（共${seats}席）`
                    }
                    highlight
                  />
                  <DetailRow label="用尽即停" value={stopOnExhaust ? "已开启" : "未开启"} />
                  <DetailRow
                    label="API Key"
                    value={
                      mode === "personal"
                        ? `支持创建 ${plan.baseKeyLimit ?? plan.subscriptionKeyLimit ?? 1} 个`
                        : `支持创建 ${(plan.baseKeyLimit ?? plan.subscriptionKeyLimit ?? 1) * seats} 个`
                    }
                  />
                  <DetailRow label="生效时间" value="付款成功后立即生效" />
                </div>
              </div>
            )}
          </section>
            </>
          )}
        </div>

        {/* ── 右栏：订单概览 + 计费详情 + 支付方式 + 协议 + 立即支付 ── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          {/* 订单概览 + 计费详情（仅组合购买模式） */}
          {isCombo && (
            <>
              <section className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Token Plan 企业版</h2>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">合计席位</span>
                    <span className="text-foreground font-medium">{comboTotalSeats} 席（上限 {comboMaxSeats.toLocaleString("zh-CN")} 席）</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">时长</span>
                    <span className="text-foreground font-medium">{durationLabel}（到期：{comboExpireDateStr}）</span>
                  </div>
                </div>
              </section>

              <section className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">计费详情</h2>
                <Separator />
                <div className="space-y-2.5 text-sm">
                  {comboActiveLines.map((line) => (
                    <div key={line.plan.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{line.plan.name} × {line.seats} 席</span>
                      <span className="text-foreground">¥ {line.subtotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">优惠</span>
                      <span className="text-emerald-600">- ¥ {discount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">应付</span>
                    <span className="text-rose-500 font-bold text-lg">¥ {comboTotalPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </section>
            </>
          )}
          {/* 支付方式 */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-3">
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
                    onClick={() => {
                      setPaymentMethod(opt.value);
                    }}
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
                              <div className={`text-sm font-semibold mt-0.5 ${balanceSufficient ? "text-foreground" : "text-destructive"}`}>
                                ¥{balance.toLocaleString("zh-CN")}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 余额不足提示 */}
                    {opt.value === "balance" && active && !balanceSufficient && (
                      <div className="mt-2.5 flex items-center justify-between text-xs bg-destructive/5 border border-destructive/20 rounded-md p-2">
                        <span className="text-destructive">余额不足，差 ¥{balanceShort.toLocaleString("zh-CN")}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast({ title: "充值入口", description: "即将跳转至充值页面（Mock）" });
                          }}
                        >
                          前往充值
                        </Button>
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

            {/* 自动续费（仅订阅类套餐） */}
            {isSubscription && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">自动续费</p>
                    <Switch
                      checked={autoRenew && paymentMethod === "balance"}
                      disabled={paymentMethod !== "balance"}
                      onCheckedChange={(checked) => setAutoRenew(checked)}
                      aria-label="自动续费开关"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {paymentMethod === "balance" ? (
                      <>订阅到期后，将自动从充值余额扣除对应金额续订。可在订阅管理中取消自动续费。</>
                    ) : (
                      <span className="text-amber-600">网银支付暂不支持自动续费，可在到期后手动续订。</span>
                    )}
                  </p>
                </div>
              </>
            )}
          </section>

          {/* 协议 */}
          <section className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <Checkbox
                checked={agreed}
                onCheckedChange={(c) => setAgreed(c === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                我已阅读并同意
                <a href="#" className="text-primary mx-0.5 hover:underline">
                  {isResource ? "《资源包服务协议》" : "《订阅服务协议》"}
                </a>
                {isSubscription && (
                  <>
                    与
                    <a href="#" className="text-primary mx-0.5 hover:underline">《自动续费协议》</a>
                  </>
                )}
              </span>
            </label>
          </section>

          {/* 提交按钮（大尺寸） */}
          <Button
            className="w-full h-12 text-base"
            disabled={!canSubmit || submitting}
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
            <DialogTitle className="text-center pt-2">
              确认{isSubscription ? "订阅" : "购买"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {paymentMethod === "online"
                ? `将创建待支付订单并跳转至${selectedBankName}支付页面`
                : "确认后将直接扣除充值余额"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品</span>
                <span className="text-foreground font-medium">{isCombo ? "Enterprise 组合套餐" : plan!.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">支付方式</span>
                <span className="text-foreground">
                  {paymentMethod === "balance" ? "充值余额支付" : `${selectedBankName}网银支付`}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">支付金额</span>
                <span className="text-rose-500 font-bold text-lg">
                  ¥{priceInfo.price.toLocaleString("zh-CN")}
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

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-muted-foreground shrink-0 text-base">{label}</span>
      <span className={`text-base ${highlight ? "text-primary font-medium" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-lg">{label}</span>
      <span className={`text-right text-lg font-mono ${highlight ? "text-primary font-semibold" : "text-foreground font-medium"}`}>{value}</span>
    </div>
  );
}




