import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { User, Wallet, Bell } from "lucide-react";

const ALERT_KEY = "ai_gateway_personal_alert";

interface AlertConfig {
  enabled: boolean;
  threshold: string;
  method: "sms" | "email";
}

export default function Profile() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    enabled: false,
    threshold: "",
    method: "sms",
  });
  const [alertSaving, setAlertSaving] = useState(false);
  const { toast } = useToast();
  const phone = getCurrentPhone();

  useEffect(() => {
    async function fetchProfile() {
      if (!phone) return;
      const { data } = await supabase
        .from("users")
        .select("name")
        .eq("phone", phone)
        .maybeSingle();
      if (data?.name) setName(data.name);
      setLoading(false);
    }
    fetchProfile();

    // Load alert config from localStorage
    const stored = localStorage.getItem(ALERT_KEY);
    if (stored) {
      try {
        setAlertConfig(JSON.parse(stored));
      } catch {}
    }
  }, [phone]);

  async function handleSave() {
    if (!phone) return;
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("phone", phone);
    setSaving(false);
    if (error) {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "个人信息已保存" });
    }
  }

  function handleAlertSave() {
    setAlertSaving(true);
    localStorage.setItem(ALERT_KEY, JSON.stringify(alertConfig));
    setTimeout(() => {
      setAlertSaving(false);
      toast({ title: "预警设置已保存" });
    }, 300);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">个人信息</h1>
        <p className="text-muted-foreground text-sm mt-0.5">管理你的个人资料与财务设置</p>
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-4 h-4" />基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">手机号</Label>
            <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted text-sm text-muted-foreground select-none">
              {phone}
            </div>
            <p className="text-xs text-muted-foreground">手机号为登录凭证，不可修改</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-name">姓名</Label>
            <Input
              id="profile-name"
              placeholder="请输入你的姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">姓名将显示在组织成员列表中</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中…" : "保存"}
          </Button>
        </CardContent>
      </Card>

      {/* Personal balance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4" />个人余额
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">可用余额</p>
              <p className="text-3xl font-bold text-foreground">¥ <span className="text-muted-foreground">—</span></p>
              <p className="text-xs text-muted-foreground mt-1">个人余额功能即将上线</p>
            </div>
            <Button variant="outline" disabled size="sm">充值</Button>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">1 额度 = ¥0.01 · 个人账户独立于企业账户</p>
          </div>
        </CardContent>
      </Card>

      {/* Balance alert */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />余额预警
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">启用余额预警</p>
              <p className="text-xs text-muted-foreground">余额不足时发送提醒通知</p>
            </div>
            <Switch
              checked={alertConfig.enabled}
              onCheckedChange={(v) => setAlertConfig(c => ({ ...c, enabled: v }))}
            />
          </div>

          {alertConfig.enabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="alert-threshold">预警阈值（元）</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">当余额低于</span>
                  <Input
                    id="alert-threshold"
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={alertConfig.threshold}
                    onChange={(e) => setAlertConfig(c => ({ ...c, threshold: e.target.value }))}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">元时提醒</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>通知方式</Label>
                <RadioGroup
                  value={alertConfig.method}
                  onValueChange={(v) => setAlertConfig(c => ({ ...c, method: v as "sms" | "email" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sms" id="alert-sms" />
                    <Label htmlFor="alert-sms" className="font-normal cursor-pointer">短信</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="alert-email" />
                    <Label htmlFor="alert-email" className="font-normal cursor-pointer">邮件</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <Button onClick={handleAlertSave} disabled={alertSaving} variant="outline" className="w-full">
            {alertSaving ? "保存中…" : "保存预警设置"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
