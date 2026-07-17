import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  SubscriptionPlan,
  Cycle,
  CYCLE_OPTIONS,
  MOCK_PLANS,
  formatCredit,
  scopeModels,
} from "./shared";

interface Props {
  mode: "enterprise" | "personal";
  role?: string; // 企业模式：admin / org_admin / member
}

const FAQ_LIST = [
  { q: "模型积分是如何结算的？", a: "模型调用按后台统一基准价（¥0.01/积分）与各模型抵扣系数折算为积分后，从套餐额度中扣减。" },
  { q: "我可以同时购买多个订阅吗？", a: "同一企业/个人同时只能持有 1 个生效中的周期订阅。资源包可与订阅同时持有，按「先用资源包后用订阅」的顺序抵扣。" },
  { q: "订阅内的模型是否会随时变动？", a: "适用模型清单以购买时的商品配置为准。后台新增可用模型时，自动加入「全部模型」类套餐；指定模型套餐不会自动变化。" },
  { q: "如果团队额度用完了怎么办？", a: "额度用完后将自动按量计费，从充值余额扣款。可在「充值余额」页设置余额预警。" },
  { q: "API 访问权限如何保障安全？", a: "通过订阅 Key 调用，每个 Key 独立鉴权且可单独停用。请在「订阅管理」→「管理订阅 Key」中维护。" },
];

export default function TokenPlan({ mode, role = "member" }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<Cycle>("month");
  // 卡片选中态：默认选中 isPopular 那一档订阅，其余资源包默认未选中
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  // 卡片内勾选协议
  const [cardAgreed, setCardAgreed] = useState<Record<string, boolean>>({});

  const canPurchase = mode === "personal" || role === "admin";

  // 按 mode 过滤可见商品
  const visiblePlans = useMemo(() => {
    return MOCK_PLANS.filter((p) => {
      if (p.status !== "active") return false;
      if (mode === "personal" && p.purchaseSubject === "enterprise") return false;
      if (mode === "enterprise" && p.purchaseSubject === "personal") return false;
      return true;
    });
  }, [mode]);

  const subscriptionPlans = useMemo(
    () => visiblePlans.filter((p) => p.productType === "subscription").sort((a, b) => a.sort - b.sort),
    [visiblePlans]
  );

  const oneTimePlans = useMemo(
    () => visiblePlans.filter((p) => p.productType === "one-time").sort((a, b) => a.sort - b.sort),
    [visiblePlans]
  );

  // 选中态懒初始化
  useMemo(() => {
    if (selectedPlanId === null && subscriptionPlans.length > 0) {
      const popular = subscriptionPlans.find((p) => p.isPopular) ?? subscriptionPlans[0];
      setSelectedPlanId(popular.id);
    }
  }, [selectedPlanId, subscriptionPlans]);

  // 点击购买 → 跳转确认订单页（协议和余额校验由确认页接管）
  const handleCardPurchase = (plan: SubscriptionPlan) => {
    if (!canPurchase) {
      toast({ title: "权限不足", description: "仅企业管理员可购买，请联系管理员开通。", variant: "destructive" });
      return;
    }
    const params = new URLSearchParams({ planId: plan.id });
    if (plan.productType === "subscription") params.set("cycle", cycle);
    navigate(`/workspace/confirm-order?${params.toString()}`);
  };

  // 当前周期对应价格
  const priceFor = (plan: SubscriptionPlan) => {
    if (plan.productType === "subscription" && plan.cyclePricing && plan.cyclePricing[cycle]) {
      return plan.cyclePricing[cycle]!;
    }
    return { originalPrice: plan.originalPrice ?? plan.price, price: plan.price, discountLabel: plan.discountLabel };
  };

  const pageTitle = mode === "enterprise" ? "企业 AI 订阅计划" : "个人 AI 订阅计划";
  const pageDesc = mode === "enterprise"
    ? "面向企业与团队场景，灵活接入国产与全球顶级大模型，按积分灵活消耗，支持轻量到高频多种业务规模"
    : "面向个人开发者与独立创作者，按需选购模型调用额度，灵活轻量，性价比优先";

  return (
    <div className="space-y-12">
      {/* ── 头部 Hero ─────────────────────────── */}
      <header className="text-center pt-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {pageTitle}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {pageDesc}
        </p>
      </header>

      {/* ── 区域一：企业订阅计划 ─────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          {/* 周期切换 */}
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-card border border-border shadow-sm">
            {CYCLE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setCycle(o.value)}
                className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  cycle === o.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {subscriptionPlans.length === 0 ? (
          <EmptyState text="暂无可购买的订阅计划" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {subscriptionPlans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                priceInfo={priceFor(plan)}
                canPurchase={canPurchase}
                selected={selectedPlanId === plan.id}
                onSelect={() => setSelectedPlanId(plan.id)}
                agreed={!!cardAgreed[plan.id]}
                onAgreedChange={(v: boolean) => setCardAgreed((s) => ({ ...s, [plan.id]: v }))}
                submitting={false}
                onPurchase={() => handleCardPurchase(plan)}
              />
            ))}
          </div>
        )}

        {/* 订阅计划页面级统一说明（与三档套餐配套） */}
        <div className="max-w-3xl mx-auto space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            所有订阅计划均兼容平台现有 API 调用方式。订阅适用模型范围以套餐详情为准，平台新增模型是否纳入订阅范围由平台统一维护。
          </p>
        </div>
      </section>

      {/* ── 区域二：资源包 ─────────────────────────── */}
      <section className="space-y-6">
        <header className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">资源包</h2>
          <p className="text-sm text-muted-foreground">
            一次性购买固定 Credit，有效期内按调用抵扣，适用于不同模型覆盖范围。
          </p>
        </header>

        {oneTimePlans.length === 0 ? (
          <EmptyState text="暂无可购买的资源包" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {oneTimePlans.map((plan) => (
              <OneTimePackageCard
                key={plan.id}
                plan={plan}
                canPurchase={canPurchase}
                selected={selectedPackageId === plan.id}
                onSelect={() => setSelectedPackageId(plan.id)}
                agreed={!!cardAgreed[plan.id]}
                onAgreedChange={(v: boolean) => setCardAgreed((s) => ({ ...s, [plan.id]: v }))}
                submitting={false}
                onPurchase={() => handleCardPurchase(plan)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 区域三：常见问题 ─────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <HelpCircle className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">常见问题</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_LIST.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-sm text-left">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* 下单确认弹窗已移除：购买逻辑下沉到卡片内部直接提交 */}
    </div>
  );
}

// ─── 订阅计划卡片（参考售卖页风格 + 选中态） ────────────────────────────

function SubscriptionPlanCard({
  plan,
  cycle,
  priceInfo,
  canPurchase,
  selected,
  onSelect,
  agreed,
  onAgreedChange,
  submitting,
  onPurchase,
}: {
  plan: SubscriptionPlan;
  cycle: Cycle;
  priceInfo: { originalPrice: number; price: number; discountLabel?: string };
  canPurchase: boolean;
  selected: boolean;
  onSelect: () => void;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  submitting: boolean;
  onPurchase: () => void;
}) {
  const periodLabel = cycle === "month" ? "月" : cycle === "quarter" ? "季" : "年";
  const features = plan.features ?? [];
  const popular = !!plan.isPopular;

  // 主推卡片（标准版）：始终高亮+主色实心按钮；其他卡片：浅色/描边按钮
  const highlighted = popular || selected;

  return (
    <div
      onClick={onSelect}
      className={`relative bg-card rounded-2xl p-6 flex flex-col cursor-pointer transition-all h-full ${
        popular
          ? "border-2 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20 bg-primary/5"
          : selected
            ? "border-2 border-primary shadow-md bg-primary/5"
            : "border border-border hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {/* 推荐标签（主推卡片右上角胶囊） */}
      {popular && (
        <span className="absolute -top-3 right-4 inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary text-primary-foreground shadow-sm">
          推荐
        </span>
      )}

      {/* 选中标识（非主推卡片被选中时显示） */}
      {!popular && selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* 名称 */}
      <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
      {plan.positioning && (
        <p className="text-xs text-muted-foreground mt-1.5">{plan.positioning}</p>
      )}

      {/* 价格块 */}
      <div className="mt-5">
        {priceInfo.originalPrice > priceInfo.price && (
          <div className="text-xs text-muted-foreground line-through">
            原价 ¥{priceInfo.originalPrice.toLocaleString("zh-CN")}
          </div>
        )}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-3xl font-bold text-rose-500">
            ¥{priceInfo.price.toLocaleString("zh-CN")}
          </span>
          <span className="text-sm text-muted-foreground">/ {periodLabel}</span>
          {priceInfo.discountLabel && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-rose-50 text-rose-500 border border-rose-200">
              {priceInfo.discountLabel}
            </span>
          )}
        </div>
        {/* 自动续费说明（统一文案，放在价格下方） */}
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3" />
          <span>到期自动续费，可随时取消；取消后当前周期权益仍可使用至到期。</span>
        </div>
      </div>

      {/* 立即订阅按钮：主推卡片主色实心；其他卡片浅色/描边 */}
      <Button
        onClick={(e) => { e.stopPropagation(); onPurchase(); }}
        disabled={!canPurchase || submitting}
        variant={highlighted ? "default" : "outline"}
        className={`mt-4 w-full ${
          popular
            ? "text-white shadow-sm"
            : highlighted
              ? "text-white shadow-sm"
              : "bg-muted/50 text-foreground hover:bg-muted border-border"
        }`}
        style={
          highlighted && canPurchase
            ? { background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }
            : undefined
        }
      >
        {!canPurchase
          ? "仅企业管理员可订阅"
          : submitting
            ? "提交中..."
            : "立即订阅"}
      </Button>

      {/* 协议勾选 */}
      <label
        onClick={(e) => e.stopPropagation()}
        className="mt-3 flex items-start gap-2 cursor-pointer select-none"
      >
        <Checkbox
          checked={agreed}
          onCheckedChange={(c) => onAgreedChange(c === true)}
          className="mt-0.5"
        />
        <span className="text-[11px] text-muted-foreground leading-relaxed">
          我已阅读并同意
          <a href="#" className="text-primary mx-0.5 hover:underline">《订阅使用协议》</a>
          与
          <a href="#" className="text-primary mx-0.5 hover:underline">《自动续费协议》</a>
        </span>
      </label>

      {/* 权益清单（统一 4 项核心权益） */}
      <ul className="mt-4 space-y-2.5 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${popular ? "text-primary" : "text-emerald-500"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── 一次性资源包卡片（参考方案页风格 + 选中态） ────────────────────────

function OneTimePackageCard({
  plan,
  canPurchase,
  selected,
  onSelect,
  agreed,
  onAgreedChange,
  submitting,
  onPurchase,
}: {
  plan: SubscriptionPlan;
  canPurchase: boolean;
  selected: boolean;
  onSelect: () => void;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  submitting: boolean;
  onPurchase: () => void;
}) {
  const popular = !!plan.isPopular;
  const modelCount = scopeModels(plan).length;
  const scopeText = plan.scope === "global"
    ? `全部模型 ${modelCount}个`
    : plan.scope === "domestic"
      ? `国内模型 ${modelCount}个`
      : plan.scope === "overseas"
        ? `海外模型 ${modelCount}个`
        : `适用模型 ${modelCount}个`;
  const features = plan.features ?? [
    `有效期 ${plan.validityMonths ?? 6} 个月`,
    scopeText,
    "用完后自动转按量计费",
  ];

  // 推荐卡：主色边框 + 浅色背景；普通卡：浅色边框
  const baseCls = popular
    ? "border-2 border-primary bg-primary/5 shadow-lg shadow-primary/10"
    : "border border-border bg-card";

  // 顶部右上角"推荐"标签（仅推荐卡）
  const tagCls = "bg-primary text-primary-foreground";

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl p-6 flex flex-col cursor-pointer transition-all h-full ${baseCls} ${
        selected ? "ring-1 ring-primary/30" : "hover:shadow-md"
      }`}
    >
      {/* 顶部：商品名称 + 推荐标签（仅推荐卡展示） */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
          {plan.positioning && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed min-h-[2.5rem]">
              {plan.positioning}
            </p>
          )}
        </div>
        {popular && plan.scopeLabel && (
          <span className={`shrink-0 inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full ${tagCls}`}>
            {plan.scopeLabel}
          </span>
        )}
      </div>

      {/* 价格块：原价（划线）+ 售价（红色大号）+ 折扣徽章 + Credit 总量 */}
      <div className="mt-5">
        {plan.originalPrice && plan.originalPrice > plan.price && (
          <div className="text-xs text-muted-foreground line-through">
            原价 ¥{plan.originalPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold text-rose-500">
            <span className="text-base font-normal align-top">¥</span>
            {plan.price.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {plan.discountLabel && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-rose-50 text-rose-500 border border-rose-200">
              {plan.discountLabel}
            </span>
          )}
        </div>
        <div className="mt-1.5 text-sm font-medium text-foreground">
          共 {formatCredit(plan.totalQuota)} Credit
        </div>
      </div>

      {/* 权益清单（统一 3 条核心权益） */}
      <ul className="mt-5 space-y-2.5 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${popular ? "text-primary" : "text-emerald-500"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* 协议勾选 */}
      <label
        onClick={(e) => e.stopPropagation()}
        className="mt-5 flex items-start gap-2 cursor-pointer select-none"
      >
        <Checkbox
          checked={agreed}
          onCheckedChange={(c) => onAgreedChange(c === true)}
          className="mt-0.5"
        />
        <span className="text-[11px] text-muted-foreground leading-relaxed">
          我已阅读并同意
          <a href="#" className="text-primary mx-0.5 hover:underline">《资源包服务协议》</a>
        </span>
      </label>

      {/* 购买按钮：占满卡片宽度 */}
      <Button
        onClick={(e) => { e.stopPropagation(); onPurchase(); }}
        disabled={!canPurchase || submitting}
        className={`mt-4 w-full ${
          popular
            ? "text-white shadow-sm"
            : selected
              ? "text-white shadow-sm"
              : "bg-muted/50 text-foreground hover:bg-muted border border-border"
        }`}
        style={
          (popular || selected) && canPurchase
            ? { background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }
            : undefined
        }
        variant={(popular || selected) ? "default" : "outline"}
      >
        {!canPurchase
          ? "仅管理员可购买"
          : submitting
            ? "提交中..."
            : "立即购买"}
      </Button>
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
