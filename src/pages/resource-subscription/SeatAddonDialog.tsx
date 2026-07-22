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
import type { Entitlement } from "./entitlements-data";
import { MOCK_PLANS } from "./shared";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entitlement: Entitlement | null;
  onConfirm?: (addonSeats: number, amount: number) => void;
}

// 周期月数映射
const CYCLE_MONTHS: Record<string, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

export default function SeatAddonDialog({ open, onOpenChange, entitlement, onConfirm }: Props) {
  const [targetSeats, setTargetSeats] = useState(0);
  const [agreed, setAgreed] = useState(false);

  // 查找关联的套餐配置
  const plan = useMemo(() => {
    if (!entitlement?.planId) return null;
    return MOCK_PLANS.find((p) => p.id === entitlement.planId) ?? null;
  }, [entitlement]);

  const currentSeats = entitlement?.seats ?? 0;
  const maxSeats = plan?.maxSeats ?? 100;
  const minSeats = plan?.minSeats ?? 1;

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

    // 判断周期
    let label = "月";
    if (total >= 350) label = "年";
    else if (total >= 80) label = "季";

    return { remainingDays: remaining, totalDays: total, prorationRatio: ratio, cycleLabel: label };
  }, [entitlement]);

  // 每席位价格（默认取包月价）
  const seatPricePerCycle = useMemo(() => {
    if (!plan?.cyclePricing) return plan?.price ?? 0;
    // 根据周期长度选择价格
    if (cycleLabel === "年") return plan.cyclePricing.year?.price ?? plan.price;
    if (cycleLabel === "季") return plan.cyclePricing.quarter?.price ?? plan.price;
    return plan.cyclePricing.month?.price ?? plan.price;
  }, [plan, cycleLabel]);

  // 计算折算后单价（按剩余天数/30天近似）
  const proratedPricePerSeat = useMemo(() => {
    return Math.round(seatPricePerCycle * (remainingDays / 30) * 100) / 100;
  }, [seatPricePerCycle, remainingDays]);

  const addonSeats = Math.max(0, targetSeats - currentSeats);
  const totalAmount = Math.round(proratedPricePerSeat * addonSeats * 100) / 100;
  const addedQuota = addonSeats * (plan?.totalQuota ?? 0);
  const addedKeys = addonSeats * (plan?.baseKeyLimit ?? plan?.subscriptionKeyLimit ?? 1);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTargetSeats(currentSeats);
      setAgreed(false);
    }
    onOpenChange(open);
  };

  // 初始化目标席位
  useEffect(() => {
    if (open && entitlement) {
      setTargetSeats(currentSeats);
      setAgreed(false);
    }
  }, [open, entitlement, currentSeats]);

  const handleConfirm = () => {
    if (addonSeats <= 0) return;
    onConfirm?.(addonSeats, totalAmount);
    handleOpenChange(false);
  };

  if (!entitlement || !plan) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">
            加购席位 - {entitlement.name}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* 顶部说明 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-blue-700 font-medium">计费说明</p>
                <p className="text-blue-600 text-xs">
                  购买成功后立即生效，到期时间将与当前已购套餐保持一致。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 pl-6">
              <div className="text-blue-600 text-xs">
                <span className="font-medium">用量说明：</span>
                新席位按主账户当前周期剩余天数计价，自动续费规则跟随主账户。
              </div>
            </div>
            <div className="flex items-start gap-2 pl-6">
              <div className="text-blue-600 text-xs">
                <span className="font-medium">限流说明：</span>
                套餐内限流为固定值，加购席位不改变 RPM/TPM 上限。
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* 左侧：席位选择 */}
            <div className="col-span-3 space-y-5">
              <div className="border rounded-lg p-5 space-y-5 bg-gray-50/30">
                <h3 className="text-sm font-medium text-foreground">选择席位</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">当前席位</div>
                    <div className="text-2xl font-semibold text-foreground">{currentSeats} 席</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">加购后席位</div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setTargetSeats((s) => Math.max(currentSeats + 1, s - 1))}
                        disabled={targetSeats <= currentSeats + 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        min={currentSeats + 1}
                        max={maxSeats}
                        value={targetSeats}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || currentSeats;
                          setTargetSeats(Math.min(maxSeats, Math.max(currentSeats, v)));
                        }}
                        className="h-9 w-20 text-center text-lg font-semibold"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setTargetSeats((s) => Math.min(maxSeats, s + 1))}
                        disabled={targetSeats >= maxSeats}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <span className="text-lg font-semibold text-foreground">席</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">本次加购</span>
                    <span className="font-medium text-foreground">{addonSeats} 席</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">原单价（每席位/{cycleLabel}）</span>
                    <span className="text-muted-foreground line-through">
                      {formatMoney(seatPricePerCycle)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">剩余周期</span>
                    <span className="text-foreground">
                      {remainingDays} 天（{formatDate(entitlement.expiresAt!)} 到期）
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">折算后单价（每席位）</span>
                    <span className="font-semibold text-primary">
                      {formatMoney(proratedPricePerSeat)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-5 space-y-3 bg-gray-50/30">
                <h3 className="text-sm font-medium text-foreground">加购后权益变化</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">增加 Credit</span>
                    <span className="font-medium text-green-600">+{formatCredit(addedQuota)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">增加订阅 Key</span>
                    <span className="font-medium text-purple-600">+{addedKeys} 个</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">到期时间</span>
                    <span className="text-foreground">与主订阅一致：{formatDate(entitlement.expiresAt!)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">下次续费</span>
                    <span className="text-foreground">按 {targetSeats} 席全额续费</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：订单明细 */}
            <div className="col-span-2">
              <div className="border rounded-lg p-5 space-y-4 bg-gray-50/50 sticky top-0">
                <h3 className="text-sm font-medium text-foreground">订单明细</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">加购 {addonSeats} 席位</div>
                    </div>
                    <div className="text-right font-medium">{formatMoney(totalAmount)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    到期日：{formatDate(entitlement.expiresAt!)}
                  </div>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">加购席位</span>
                    <span>{addonSeats} 席</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">折算单价</span>
                    <span>{formatMoney(proratedPricePerSeat)}/席</span>
                  </div>
                </div>

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
                  disabled={addonSeats <= 0 || !agreed}
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
