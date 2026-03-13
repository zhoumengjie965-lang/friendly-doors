import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";

interface Org {
  id: string;
  name: string;
  monthly_budget: number | null;
  current_month_budget: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: Org | null;
  onSaved: () => void;
}

export default function OrgBudgetSheet({ open, onOpenChange, org, onSaved }: Props) {
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [currentMonthBudget, setCurrentMonthBudget] = useState("");
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && org) {
      setMonthlyBudget(org.monthly_budget != null ? String(org.monthly_budget) : "");
      setCurrentMonthBudget(org.current_month_budget != null ? String(org.current_month_budget) : "");
      setWarningThreshold(80);
      setAlertEnabled(false);
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          monthly_budget: monthlyBudget === "" ? null : Number(monthlyBudget),
          current_month_budget: currentMonthBudget === "" ? null : Number(currentMonthBudget),
        } as any)
        .eq("id", org.id);
      if (error) throw error;
      toast({ title: "保存成功", description: "预算设置已更新" });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "保存失败", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <SheetTitle>预算设置</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">{org?.name}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">默认月预算（元/月）</Label>
            <Input
              type="number"
              min="0"
              placeholder="留空表示不限制"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">每月自动重置的预算上限，为空表示无限制</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">当前月预算覆盖（元）</Label>
            <Input
              type="number"
              min="0"
              placeholder="留空则使用默认月预算"
              value={currentMonthBudget}
              onChange={(e) => setCurrentMonthBudget(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">仅本月生效，优先级高于默认月预算</p>
          </div>

          <Separator />

          {/* 预警与通知 */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">预警与通知</p>

            <div className="space-y-2">
              <Label className="text-sm font-medium">预警阈值</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  className="w-28"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">当月消耗达到预算的该比例时触发预警</p>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium cursor-pointer">开启紧急预警通知</Label>
                <p className="text-xs text-muted-foreground">当消耗达到阈值时，将通过短信通知管理员</p>
              </div>
              <Switch
                checked={alertEnabled}
                onCheckedChange={setAlertEnabled}
              />
            </div>
          </div>

          <Separator />

          <div className="bg-muted/40 rounded-lg p-4 space-y-1">
            <p className="text-xs font-medium text-foreground">本月实际预算</p>
            <p className="text-2xl font-bold text-primary">
              {currentMonthBudget !== "" ? `¥${currentMonthBudget}`
                : monthlyBudget !== "" ? `¥${monthlyBudget}`
                : "不限制"}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentMonthBudget !== "" ? "使用当前月覆盖值" : "使用默认月预算"}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
