import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  Info,
  Zap,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import {
  SubscriptionPlan,
  Cycle,
  MOCK_PLANS,
  formatMoney,
  formatCredit,
  formatDateTime,
} from "./shared";
import {
  findOrderById,
  orderStatusExtLabel,
  orderStatusExtClass,
  orderTypeExtLabel,
  purchaseMethodExtLabel,
  billingMethodLabel,
} from "./orders-data";

interface Props {
  mode: "enterprise" | "personal";
}

export default function OrderDetail({ mode }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const id = (() => {
    const m = location.pathname.match(/\/resource-orders\/([^/]+)/);
    return m ? m[1] : null;
  })();
  const order = id ? findOrderById(id) : null;

  // 判断是否是"加购席位"场景（通过 URL 参数 action=add-seats 或 orderType 判断）
  const isAddonFlow = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("action") === "add-seats" || location.pathname.includes("add-seats");
  }, [location]);

  // 如果是加购席位流程，渲染加购下单页
  if (isAddonFlow || (order && order.orderType === "seat-addon")) {
    return <AddSeatsOrderPage mode={mode} order={order} navigate={navigate} />;
  }

  const goBack = () => navigate("/workspace/resource-orders");

  if (!order) {
    return (
      <div className="w-full space-y-6">
        <h1 className="text-2xl font-bold text-foreground">订单详情</h1>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">订单不存在或已被删除</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={goBack}>
            返回订单列表
          </Button>
        </div>
      </div>
    );
  }

  const isPaid = order.status === "paid";
  const isPending = order.status === "pending";
  const isCancelled = order.status === "cancelled";
  const purchaserName = "周梦洁";
  const purchaserUsername = "zhou_mengjie";
  const entityName = mode === "enterprise" ? "北京科技创新有限公司" : null;
  const entityId = mode === "enterprise" ? "ENT-20260318" : null;

  const original = order.originalAmount ?? order.amount;
  const discount = order.discountAmount ?? 0;

  const expireAt = useMemo(() => {
    if (!isPending) return "";
    const d = new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, [order, isPending]);

  return (
    <div className="w-full max-w-7xl space-y-6">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">
          订单详情 <span className="text-muted-foreground font-mono text-xl">({order.orderNo})</span>
        </h1>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${orderStatusExtClass[order.status]}`}>
          {orderStatusExtLabel[order.status]}
        </span>
      </div>

      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-sm text-amber-900">
          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p>
            请于 <span className="font-semibold">{expireAt}</span> 前完成支付，逾期订单将自动取消。
          </p>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">支付信息</h3>
        </div>
        <div className="bg-card p-8">
          {isCancelled ? (
            <div className="text-sm text-muted-foreground">-</div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">¥</span>
                <span className="text-sm text-muted-foreground">{isPending ? "待实际应付" : "实际应付"}</span>
              </div>
              <div className="text-[40px] font-bold text-foreground leading-none tracking-tight mb-5">
                {formatMoney(order.amount)}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground/60">=</span>
                <span>原价金额 {formatMoney(original)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-muted-foreground/60">-</span>
                    <span>优惠金额 {formatMoney(discount)}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 订单信息 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">订单信息</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1 p-6">
          <InfoItem label="订单号" value={order.orderNo} />
          <InfoItem label="订单类型" value={orderTypeExtLabel(order.orderType)} />
          <div />
          <InfoItem label="创建人" value={`${purchaserName}（${purchaserUsername}）`} />
          {entityName && entityId ? (
            <InfoItem label="购买主体" value={`${entityName}（${entityId}）`} />
          ) : (
            <div />
          )}
          <div />
          <InfoItem label="创建时间" value={formatDateTime(order.createdAt)} />
          <InfoItem label="付款时间" value={order.paidAt ? formatDateTime(order.paidAt) : "-"} />
          <InfoItem label="支付方式" value={order.purchaseMethod ? purchaseMethodExtLabel(order.purchaseMethod) : "-"} />
        </div>
      </div>

      {/* 配置信息 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-3 bg-muted/40 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">配置信息</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">商品名称</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">配置</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">计费方式</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">数量</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">生效时长</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">单价</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">价格优惠</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">实付金额</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const isSub = order.productType === "subscription";
                const configText = isSub
                  ? order.items.map(i => `${i.productName} × ${i.seats ?? 1}席`).join("\n")
                  : "-";
                const quantity = isSub
                  ? "1"
                  : `${order.items.reduce((s, i) => s + (i.quantity ?? 1), 0)}`;
                const firstItem = order.items[0];
                const durationText = firstItem?.duration ?? "-";
                const unitTotal = order.originalAmount ?? order.amount;
                return (
                  <tr className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{order.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-pre-line">{configText}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{billingMethodLabel(order.productType)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{durationText || "-"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{formatMoney(unitTotal)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 whitespace-nowrap">
                      {order.discountAmount ? `-${formatMoney(order.discountAmount)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                      {formatMoney(order.amount)}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 加购席位下单页（参考截图2：扩充席位） ────────────────────────────

function AddSeatsOrderPage({
  mode,
  order,
  navigate,
}: {
  mode: "enterprise" | "personal";
  order: ReturnType<typeof findOrderById> | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  // 获取订阅套餐列表（仅订阅类）
  const plans = useMemo(() => {
    return MOCK_PLANS.filter(
      (p) => p.status === "active" && p.productType === "subscription"
    ).sort((a, b) => a.sort - b.sort);
  }, []);

  // 默认选中的套餐（从 order 推断或选第一个）
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    order?.planId ?? plans[0]?.id ?? ""
  );
  // 各套餐的席位数
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [agreed, setAgreed] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // 初始化席位数
  useMemo(() => {
    plans.forEach((p) => {
      if (seatCounts[p.id] === undefined) {
        setSeatCounts((s) => ({ ...s, [p.id]: 0 }));
      }
    });
  }, [plans]);

  const cycle: Cycle = "month";
  const periodLabel = "月";

  // 计算价格（按剩余天数折算，模拟：剩余约20天）
  const remainingRatio = 20 / 30; // 模拟剩余天数比例

  const getProratedPrice = (plan: SubscriptionPlan) => {
    const basePrice = plan.cyclePricing?.[cycle]?.price ?? plan.price;
    return Math.round(basePrice * remainingRatio * 100) / 100;
  };

  const getOriginalPrice = (plan: SubscriptionPlan) => {
    return plan.cyclePricing?.[cycle]?.originalPrice ?? plan.originalPrice ?? plan.price;
  };

  // 订单明细计算
  const orderItems = plans.map((plan) => {
    const seats = seatCounts[plan.id] ?? 0;
    const unitPrice = getProratedPrice(plan);
    const originalUnitPrice = getOriginalPrice(plan);
    return {
      plan,
      seats,
      unitPrice,
      originalUnitPrice,
      subtotal: Math.round(unitPrice * seats * 100) / 100,
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const hasSelection = orderItems.some((item) => item.seats > 0);

  const handleSeatChange = (planId: string, delta: number, plan: SubscriptionPlan) => {
    setSeatCounts((s) => {
      const cur = s[planId] ?? 0;
      const next = Math.max(0, Math.min(plan.maxSeats ?? 100, cur + delta));
      return { ...s, [planId]: next };
    });
  };

  const handleSeatInput = (planId: string, val: number, plan: SubscriptionPlan) => {
    const v = Math.max(0, Math.min(plan.maxSeats ?? 100, val || 0));
    setSeatCounts((s) => ({ ...s, [planId]: v }));
  };

  const handlePay = () => {
    if (!agreed || !hasSelection) return;
    // 模拟支付成功，跳转回订单列表
    navigate("/workspace/resource-orders");
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* 返回 */}
      <button
        onClick={() => navigate("/workspace/my-subscriptions")}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* 标题 */}
      <h1 className="text-xl font-bold text-foreground">扩充席位</h1>

      {/* 顶部说明区（参考截图2） */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-2.5 text-sm">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">计费说明</span>
            <span className="ml-2">加购成功后立即生效，新增席位与当前企业订阅同时到期</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">用量说明</span>
            <span className="ml-2">新增席位按当前企业订阅的剩余天数计价，自动续费设置跟随企业订阅；本周期额度按剩余天数折算，下个周期恢复为完整周期额度</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">限流说明</span>
            <span className="ml-2">为保障服务稳定性，Token Plan 企业版采用动态限流机制。短时间内使用强度较高可能触发临时限流，通常可在约 1 分钟后恢复</span>
          </div>
        </div>
      </div>

      {/* 主体：左侧套餐选择 + 右侧订单明细 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* 左侧：选择套餐 */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h2 className="text-base font-semibold text-foreground">选择套餐</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const seats = seatCounts[plan.id] ?? 0;
              const unitPrice = getProratedPrice(plan);
              const originalUnitPrice = getOriginalPrice(plan);
              const isSelected = selectedPlanId === plan.id;
              const popular = !!plan.isPopular;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative rounded-xl p-5 flex flex-col cursor-pointer transition-all bg-card ${
                    popular
                      ? "border-2 border-primary shadow-md bg-gradient-to-b from-primary/5 to-transparent"
                      : isSelected
                        ? "border-2 border-primary shadow-sm"
                        : "border border-border hover:border-primary/50"
                  }`}
                >
                  {/* 名称 */}
                  <div className="flex items-center gap-1.5">
                    {popular && <span className="text-primary">◆</span>}
                    <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {plan.positioning}
                  </p>

                  {/* 价格 /席位 */}
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">
                        ¥{unitPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-muted-foreground">/席位</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-through">
                      原价 ¥{originalUnitPrice.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* 席位数量加减器 */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">席位数量</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSeatChange(plan.id, -1, plan); }}
                        disabled={seats <= 0}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={seats}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleSeatInput(plan.id, parseInt(e.target.value), plan)}
                        className="w-10 h-7 text-center text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSeatChange(plan.id, 1, plan); }}
                        disabled={seats >= (plan.maxSeats ?? 100)}
                        className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Credit 额度 */}
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-foreground">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span>{formatCredit(plan.totalQuota)} 积分/席位/{periodLabel}</span>
                  </div>

                  {/* 权益列表 */}
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {(plan.features ?? []).slice(0, 2).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                        <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：订单明细 */}
        <div className="lg:sticky lg:top-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-foreground">订单明细</h3>

            {/* 商品类型 & 有效期 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品类型</span>
                <span className="text-foreground">Token Plan 企业版</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">有效期</span>
                <span className="text-foreground">2026/08/20 10:51:17 到期</span>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* 费用 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">费用</h4>
              {orderItems.map((item) => (
                <div key={item.plan.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.plan.name}</span>
                    <span className="text-muted-foreground">{item.seats}席位</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                      {item.subtotal > 0 ? formatMoney(item.subtotal) : "0 元"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border" />

            {/* 金额 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">金额</span>
              <button className="text-xs text-primary hover:underline">明细</button>
            </div>
            <div className="text-2xl font-bold text-rose-500">
              {formatMoney(totalAmount)}
            </div>

            {/* 去支付按钮 */}
            <Button
              className="w-full h-11 text-sm font-semibold"
              disabled={!hasSelection || !agreed}
              onClick={handlePay}
            >
              去支付
            </Button>

            {/* 协议 */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <Checkbox
                checked={agreed}
                onCheckedChange={(c) => setAgreed(c === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                我已阅读并同意
                <a href="#" className="text-primary mx-0.5 hover:underline">《订阅服务协议》</a>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs text-muted-foreground mb-1">{label}</dt>
      <dd className="text-sm text-foreground break-all">{value}</dd>
    </div>
  );
}
