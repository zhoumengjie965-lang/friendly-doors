import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Sparkles,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  SubscriptionPlan,
  Cycle,
  MOCK_PLANS,
} from "./shared";
import { cn } from "@/lib/utils";

interface Props {
  mode: "enterprise" | "personal";
  role?: string;
}

const FAQ_LIST = [
  { q: "模型积分是如何结算的？", a: "模型调用按后台统一基准价（¥0.01/积分）与各模型抵扣系数折算为积分后，从套餐额度中扣减。" },
  { q: "我可以同时购买多个订阅吗？", a: "同一企业/个人同时只能持有 1 个生效中的周期订阅。如需更多席位，可在订阅详情页加购席位。" },
  { q: "订阅内的模型是否会随时变动？", a: "适用模型清单以购买时的商品配置为准。后台新增可用模型时，自动加入「全部模型」类套餐；指定模型套餐不会自动变化。" },
  { q: "如果团队额度用完了怎么办？", a: "可在下单时开启「用尽即停」避免超量扣费；未开启时额度用完将自动按量计费，从充值余额扣款。" },
  { q: "席位如何分配与管理？", a: "购买后管理员可在「订阅管理」中为团队成员分配席位，每席位独立享有 Credit 额度与 API Key 配额。" },
];

// 每个套餐的主题色（用于装饰条/光晕/选中态）
const PLAN_THEMES: Record<string, { from: string; to: string; accent: string; glow: string }> = {
  lite:    { from: "from-sky-50",    to: "to-white",    accent: "bg-sky-500",    glow: "shadow-sky-200/60" },
  standard:{ from: "from-violet-50", to: "to-white",    accent: "bg-violet-600", glow: "shadow-violet-300/60" },
  premium: { from: "from-amber-50",  to: "to-white",    accent: "bg-amber-500",  glow: "shadow-amber-200/60" },
};

function getTheme(planId: string) {
  return PLAN_THEMES[planId] ?? PLAN_THEMES.standard;
}

export default function TokenPlan({ mode, role = "member" }: Props) {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<Cycle>("month");

  const canPurchase = mode === "personal" || role === "admin";

  const subscriptionPlans = useMemo(() => {
    return MOCK_PLANS
      .filter((p) => {
        if (p.status !== "active") return false;
        if (p.productType !== "subscription") return false;
        if (mode === "personal" && p.purchaseSubject === "enterprise") return false;
        if (mode === "enterprise" && p.purchaseSubject === "personal") return false;
        return true;
      })
      .sort((a, b) => a.sort - b.sort);
  }, [mode]);

  const priceFor = (plan: SubscriptionPlan) => {
    if (plan.productType === "subscription" && plan.cyclePricing && plan.cyclePricing[cycle]) {
      return plan.cyclePricing[cycle]!;
    }
    return { originalPrice: plan.originalPrice ?? plan.price, price: plan.price, discountLabel: plan.discountLabel };
  };

  const periodLabel = cycle === "month" ? "月" : cycle === "quarter" ? "季" : "年";

  const handlePurchase = (plan: SubscriptionPlan) => {
    if (!canPurchase) return;
    // 企业版订阅套餐：组合购买模式，三档可混合下单，记录来源套餐（默认选购 1 席）
    if (mode === "enterprise" && plan.productType === "subscription") {
      navigate(`/workspace/confirm-order?planId=${plan.id}&cycle=${cycle}&combo=1`);
      return;
    }
    // 个人版 / 资源包：单档购买
    navigate(`/workspace/confirm-order?planId=${plan.id}&cycle=${cycle}`);
  };

  const pageTitle = mode === "enterprise" ? "Token Plan 团队版" : "Token Plan 个人版";
  const pageDesc = mode === "enterprise"
    ? "灵活的团队定价方案，满足不同使用强度和角色的需求"
    : "灵活的个人定价方案，满足不同使用强度的需求";

  const cycleTabs: { value: Cycle; label: string }[] = [
    { value: "month", label: "按月购买" },
    { value: "year",  label: "按年购买" },
  ];

  return (
    <div className="relative space-y-14">
      {/* 背景装饰光晕 */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[480px] overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-gradient-to-br from-primary/20 via-violet-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute left-[15%] top-10 h-40 w-40 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="absolute right-[15%] top-20 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      {/* 头部 Hero */}
      <header className="relative text-center pt-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
          {pageTitle}
        </h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          {pageDesc}
        </p>
      </header>

      {/* 周期切换 + 套餐卡片 */}
      <section className="relative space-y-8">
        {/* 分段控件 */}
        <div className="flex justify-center">
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-card/80 border border-border shadow-lg shadow-black/5 backdrop-blur-sm">
            {cycleTabs.map((o) => {
              const active = cycle === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setCycle(o.value)}
                  className={`relative px-7 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {subscriptionPlans.length === 0 ? (
          <EmptyState text="暂无可购买的订阅计划" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {subscriptionPlans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.id}
                plan={plan}
                periodLabel={periodLabel}
                priceInfo={priceFor(plan)}
                canPurchase={canPurchase}
                isPersonal={mode === "personal"}
                onPurchase={() => handlePurchase(plan)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 常见问题 */}
      <section className="relative bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">常见问题</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_LIST.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-sm text-left hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}

// 订阅计划卡片
function SubscriptionPlanCard({
  plan,
  periodLabel,
  priceInfo,
  canPurchase,
  isPersonal,
  onPurchase,
}: {
  plan: SubscriptionPlan;
  periodLabel: string;
  priceInfo: { originalPrice: number; price: number; discountLabel?: string };
  canPurchase: boolean;
  isPersonal: boolean;
  onPurchase: () => void;
}) {
  const theme = getTheme(plan.id);

  // 个人版：去掉 "Enterprise" 前缀，价格单位为 /月，features 文案去掉"每席位"
  const displayName = isPersonal
    ? plan.name.replace(/^Enterprise\s*/i, "").trim()
    : plan.name;
  const priceUnit = isPersonal ? `/${periodLabel}` : `/席/${periodLabel}`;
  const features = (plan.features ?? []).map((f) =>
    isPersonal ? f.replace(/每席位(含|提供)/g, (_, t) => (t === "含" ? "每月含" : "提供")) : f
  );

  return (
    <div
      className={`group relative bg-gradient-to-b ${theme.from} rounded-2xl p-6 flex flex-col transition-all duration-300 h-full overflow-hidden border border-border/70 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 hover:shadow-black/5`}
    >
      {/* 顶部装饰条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

      {/* 背景装饰光斑 */}
      <div className={`pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full ${theme.accent} opacity-[0.06] blur-2xl group-hover:opacity-[0.12] transition-opacity`} />

      {/* 名称 + 定位 */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl ${theme.accent} flex items-center justify-center shadow-sm`}>
            <Zap className="w-4.5 h-4.5 text-white" fill="currentColor" />
          </div>
          <h3 className="text-xl font-bold text-foreground tracking-tight">{displayName}</h3>
        </div>
        {plan.positioning && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {plan.positioning}
          </p>
        )}
      </div>

      {/* 价格块 */}
      <div className="relative mt-6 rounded-xl bg-white/70 backdrop-blur-sm border border-border/50 p-4 shadow-sm">
        {priceInfo.originalPrice > priceInfo.price && (
          <div className="text-xs text-muted-foreground line-through mb-0.5">
            原价 ¥{priceInfo.originalPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-medium text-rose-500/90 -mb-1">¥</span>
          <span className="text-[40px] font-bold leading-none text-rose-500 tracking-tight">
            {priceInfo.price.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-muted-foreground ml-1">{priceUnit}</span>
        </div>
      </div>

      {/* 分隔 */}
      <div className="my-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* 商品特性 */}
      {features.length > 0 && (
        <ul className="space-y-2.5 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 购买按钮 */}
      <div className="mt-6">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onPurchase();
          }}
          disabled={!canPurchase}
          className={cn(
            "w-full h-11 text-sm font-semibold group/btn border-0",
            canPurchase
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-700 group-hover:shadow-lg group-hover:shadow-blue-600/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          {!canPurchase ? "仅企业管理员可购买" : (
            <span className="inline-flex items-center gap-1.5">
              立即购买
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </span>
          )}
        </Button>
        {!canPurchase && !isPersonal && (
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            请联系企业管理员开通订阅
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <Sparkles className="w-10 h-10 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
