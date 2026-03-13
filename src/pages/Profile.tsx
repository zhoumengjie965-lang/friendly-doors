import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, Building2, Layers } from "lucide-react";

const EMAIL_KEY = "ai_gateway_profile_email";

interface MembershipCard {
  enterprise_id: string;
  enterprise_name: string;
  org_name: string | null;
  role: string;
}

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function roleLabel(r?: string) {
  return r === "admin" ? "管理员" : r === "org_admin" ? "组织管理员" : "成员";
}

function avatarInitial(name: string, phone: string) {
  if (name) return name[0];
  return phone.slice(-2);
}

export default function Profile() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || "");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberships, setMemberships] = useState<MembershipCard[]>([]);
  const { toast } = useToast();
  const phone = getCurrentPhone() || "";

  useEffect(() => {
    if (!phone) return;
    async function load() {
      // Fetch user record
      const { data: user } = await supabase
        .from("users")
        .select("id, name")
        .eq("phone", phone)
        .maybeSingle();

      if (user) {
        setUserId(user.id);
        setUsername(user.name || "");
      }

      // Fetch all memberships
      const { data: memberRows } = await supabase
        .from("members")
        .select("enterprise_id, role, organizations(id, name), enterprises(id, name)")
        .eq("user_phone", phone)
        .eq("status", "active");

      if (memberRows) {
        const cards: MembershipCard[] = memberRows.map((m: any) => ({
          enterprise_id: m.enterprise_id,
          enterprise_name: m.enterprises?.name || "—",
          org_name: m.organizations?.name || null,
          role: m.role,
        }));
        setMemberships(cards);
      }

      setLoading(false);
    }
    load();
  }, [phone]);

  async function handleSave() {
    if (!phone) return;
    setSaving(true);
    localStorage.setItem(EMAIL_KEY, email.trim());
    const { error } = await supabase
      .from("users")
      .update({ name: username.trim() })
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

  const shortId = userId ? userId.replace(/-/g, "").slice(0, 6).toUpperCase() : "—";

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="w-5 h-5" />个人信息
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">管理你的账号资料</p>
      </div>

      {/* ── 账号基础信息 ── */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          {/* Avatar + ID */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                {avatarInitial(username, phone)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{username || "未设置用户名"}</p>
              <p className="text-xs text-muted-foreground">用户 ID：{shortId}（系统唯一标识）</p>
            </div>
          </div>

          <Separator />

          {/* 用户名（可编辑） */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">用户名</label>
            <Input
              placeholder="设置用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">注册时自动生成，可自行修改</p>
          </div>

          <Separator />

          {/* 账号安全 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              账号安全
            </p>
            <div className="space-y-2.5">
              {/* 手机号 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">手机号</p>
                  <p className="text-sm font-medium text-foreground font-mono">{maskPhone(phone)}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" disabled>
                  更换绑定
                </Button>
              </div>

              {/* 邮箱 */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">邮箱</p>
                  <Input
                    type="email"
                    placeholder="未绑定，用于接收通知"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中…" : "保存"}
          </Button>
        </CardContent>
      </Card>

      {/* ── 我的名片（每个企业一张） ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
          <Layers className="w-4 h-4 text-muted-foreground" />我的名片
        </h2>

        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              暂未加入任何企业
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {memberships.map((m) => (
              <Card key={m.enterprise_id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{m.enterprise_name}</span>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-2 text-sm">
                    <span className="text-xs text-muted-foreground self-center">企业内姓名</span>
                    <span className="text-foreground font-medium">{username || <span className="text-muted-foreground">—</span>}</span>

                    <span className="text-xs text-muted-foreground self-center">所属组织</span>
                    <span className="text-foreground">{m.org_name || <span className="text-muted-foreground">—</span>}</span>

                    <span className="text-xs text-muted-foreground self-center">我的角色</span>
                    <span className="inline-flex">
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        <Shield className="w-3 h-3" />{roleLabel(m.role)}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
