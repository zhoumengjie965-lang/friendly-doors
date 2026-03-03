import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Shield } from "lucide-react";

const EMAIL_KEY = "ai_gateway_profile_email";

interface Enterprise {
  id: string;
  name: string;
  enterprise_code: string;
}

interface OrgInfo {
  id: string;
  name: string;
}

interface ProfileProps {
  enterprise?: Enterprise | null;
  currentOrg?: OrgInfo | null;
  role?: string;
}

export default function Profile({ enterprise, currentOrg, role }: ProfileProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || "");
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
    localStorage.setItem(EMAIL_KEY, email.trim());
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

  const roleLabel = (r?: string) =>
    r === "admin" ? "管理员" : r === "org_admin" ? "组织管理员" : "普通成员";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="w-5 h-5" />个人信息
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">管理你的账号资料</p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          {/* Account info */}
          <div className="grid grid-cols-[80px_1fr] items-center gap-x-3 gap-y-3.5">
            <Label className="text-muted-foreground text-xs text-right">手机号</Label>
            <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted text-sm text-muted-foreground select-none">
              {phone}
            </div>

            <Label htmlFor="profile-name" className="text-xs text-right">姓名</Label>
            <Input
              id="profile-name"
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />

            <Label htmlFor="profile-email" className="text-xs text-right">邮箱</Label>
            <div className="space-y-0.5">
              <Input
                id="profile-email"
                type="email"
                placeholder="用于接收通知"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <Separator />

          {/* Enterprise info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />所属企业
            </p>
            {enterprise ? (
              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 text-sm">
                <span className="text-muted-foreground text-xs text-right self-center">企业</span>
                <span className="font-medium text-foreground">{enterprise.name}</span>

                <span className="text-muted-foreground text-xs text-right self-center">组织</span>
                <span className="text-foreground">{currentOrg?.name || <span className="text-muted-foreground">—</span>}</span>

                <span className="text-muted-foreground text-xs text-right self-center">角色</span>
                <span className="inline-flex">
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    <Shield className="w-3 h-3" />{roleLabel(role)}
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂未加入企业</p>
            )}
          </div>

          <Separator />

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中…" : "保存"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
