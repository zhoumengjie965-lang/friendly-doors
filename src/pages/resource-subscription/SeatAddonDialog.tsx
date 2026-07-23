import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Minus, Plus, AlertCircle } from "lucide-react";
import { formatCredit, formatMoney, formatDate } from "./shared";
import { MOCK_PLANS } from "./shared";
import { seatTierLabel, type SeatTier } from "./subscriptions-data";

// 加购席位目标的最小契约：Entitlement 与 SeatSubscription 均可适配
export interface SeatAddonTarget {
  name: string;
  planId?: string;
  seats?: number;
  effectiveAt: string;
  expiresAt: string | null;
}

export interface SeatAddonItem {
  tier: SeatTier;
  count: number;
  unitPrice: number; // 折算后单价
  amount: number; // 该档位小计
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entitlement: SeatAddonTarget | null;
  onConfirm?: (items: SeatAddonItem[], totalAmount: number) => void;
}

// 三档位定价（月价 + 每席位额度）
const TIER_PRICING: Record<SeatTier, { monthlyPrice: number; quota: number }> = {
  lite: { monthlyPrice: 199, quota: 31_000_000 },
  standard: { monthlyPrice: 599, quota: 93_700_000 },
  premium: { monthlyPrice: 1299, quota: 233_000_000 },
};

const TIER_ORDER: SeatTier[] = ["lite", "standard", "premium"];

export default function SeatAddonDialog({ open, onOpenChange, entitlement, onConfirm }: Props) {
  const [counts, setCounts] = useState<Record<SeatTier, number>>({
    lite: 0,
    standard: 0,
    premium: 0,
  });
  const [agreed, setAgreed] = useState(false);

  // 查找关联的套餐配置
  const plan = useMemo(() => {
    if (!entitlement?.planId) return null;
    return MOCK_PLANS.find((p) => p.id === entitlement.planId) ?? null;
  }, [entitlement]);

  // 计算剩余天数和折算系数
  const { remainingDays, totalDays, prorationRatio, cycleLabel } = useMemo(() => {
    if (!entitlement?.effectiveAt || !entitlement?.expiresAt) {
      return { remainingDays: 0, totalDays: 30, prorationRatio: 1, cycleLabel: "月" };
    }
    const now = new Date();
    const start = new Date(entitlement.effectiveAt);
    const end = new Date(entitlement.expiresAt);
    const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const ratio = total > 0 ? remaining / total : 0;

    let label = "月";
    if (total >= 350) label = "年";
    else if (total >= 80) label = "季";

    return { remainingDays: remaining, totalDays: total, prorationRatio: ratio, cycleLabel: label };
  }, [entitlement]);

  // 每档位折算后单价（按剩余天数/30天近似）
  const proratedPrices = useMemo(() => {
    const result: Record<SeatTier, number> = {} as Record<SeatTier, number>;
    TIER_ORDER.forEach((tier) => {
      result[tier] = Math.round(TIER_PRICING[tier].monthlyPrice * (remainingDays / 30) * 100) / 100;
    });
    return result;
  }, [remainingDays]);

  // 计算各档位小计和总额
  const addonItems = useMemo<SeatAddonItem[]>(() => {
    return TIER_ORDER.filter((tier) => counts[tier] > 0).map((tier) => {
      const count = counts[tier];
      const unitPrice = proratedPrices[tier];
      return {
        tier,
        count,
        unitPrice,
        amount: Math.round(unitPrice * count * 100) / 100,
      };
    });
  }, [counts, proratedPrices]);

  const totalAddonSeats = addonItems.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = Math.round(addonItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const totalAddedQuota = TIER_ORDER.reduce((sum, tier) => sum + counts[tier] * TIER_PRICING[tier].quota, 0);

  const handleCountChange = (tier: SeatTier, value: number) => {
    setCounts((prev) => ({ ...prev, [tier]: Math.max(0, value) }));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCounts({ lite: 0, standard: 0, premium: 0 });
      setAgreed(false);
    }
    onOpenChange(open);
  };

  useEffect(() => {
    if (open) {
      setCounts({ lite: 0, standard: 0, premium: 0 });
      setAgreed(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (addonItems.length === 0) return;
    onConfirm?.(addonItems, totalAmount);
    handleOpenChange(false);
  };

  if (!entitlement || !plan) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">
            加购席位 - {entitlement.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* 计费 & 用量说明 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-blue-700 font-medium">计费说明</p>
                <p className="text-blue-600 text-xs">
                  购买成功后立即生效，到期时间将与当前已购套餐保持一致。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-blue-700 font-medium">用量说明</p>
                <p className="text-blue-600 text-xs">
                  新席位按主账户当前周期剩余天数计价，自动续费规则跟随主账户。
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* 左侧：三档位选择 */}
            <div className="col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">选择席位档位</h3>
                <span className="text-xs text-muted-foreground">
                  剩余周期 {remainingDays} 天（{formatDate(entitlement.expiresAt!)} 到期）
                </span>
              </div>

              {TIER_ORDER.map((tier) => {
                const pricing = TIER_PRICING[tier];
                const prorated = proratedPrices[tier];
                const count = counts[tier];
                const subtotal = Math.round(prorated * count * 100) / 100;
                return (
                  <div
                    key={tier}
                    className={`border rounded-lg p-4 space-y-3 transition-colors ${
                      count > 0 ? "border-primary/40 bg-primary/5" : "bg-gray-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{seatTierLabel[tier]}</span>
                          <span className="text-xs text-muted-foreground">每席 {formatCredit(pricing.quota)} credit</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-muted-foreground line-through">
                            原价 {formatMoney(pricing.monthlyPrice)}/{cycleLabel}
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            折算 {formatMoney(prorated)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCountChange(tier, count - 1)}
                          disabled={count <= 0}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          value={count}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 0;
                            handleCountChange(tier, v);
                          }}
                          className="h-8 w-16 text-center text-sm font-medium"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCountChange(tier, count + 1)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {count > 0 && (
                      <div className="flex items-center justify-between text-xs pt-2 border-t">
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

            {/* 右侧：订单明细 */}
            <div className="col-span-2">
              <div className="border rounded-lg p-5 space-y-4 bg-gray-50/50 sticky top-0">
                <h3 className="text-sm font-medium text-foreground">订单明细</h3>

                <div className="space-y-3 text-sm">
                  {addonItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">请选择需要加购的席位档位</p>
                  ) : (
                    addonItems.map((item) => (
                      <div key={item.tier} className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-foreground">{seatTierLabel[item.tier]}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.count} 席 × {formatMoney(item.unitPrice)}
                          </div>
                        </div>
                        <div className="text-right font-medium">{formatMoney(item.amount)}</div>
                      </div>
                    ))
                  )}
                </div>

                {totalAddonSeats > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">加购席位合计</span>
                      <span>{totalAddonSeats} 席</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">增加 Credit</span>
                      <span className="font-medium text-green-600">+{formatCredit(totalAddedQuota)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">到期时间</span>
                      <span className="text-foreground text-xs">{formatDate(entitlement.expiresAt!)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">应付金额</span>
                    <span className="text-xl font-bold text-primary">{formatMoney(totalAmount)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="agree-terms"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                  />
                  <Label htmlFor="agree-terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                    我已阅读并同意《服务协议》和《隐私政策》，了解加购席位到期时间与主订阅一致。
                  </Label>
                </div>

                <Button
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={totalAddonSeats <= 0 || !agreed}
                  onClick={handleConfirm}
                >
                  确认支付 {formatMoney(totalAmount)}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
          <Button variant="outline" className="h-9 px-4" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
