import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

export default function Profile() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        <p className="text-muted-foreground text-sm mt-0.5">管理你的个人资料</p>
      </div>

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
    </div>
  );
}
