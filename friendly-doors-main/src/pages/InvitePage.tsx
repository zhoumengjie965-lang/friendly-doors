import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone, acceptInvitation } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type InviteData = {
  id: string;
  inviter_phone: string;
  invited_role: string;
  expires_at: string;
  status: string;
  use_count: number;
  max_uses: number;
  enterprises: { name: string } | null;
  organizations: { name: string } | null;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "企业管理员",
  org_admin: "组织管理员",
  member: "普通成员",
};

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "used" | "invalid">("loading");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!id) { setStatus("invalid"); return; }
    supabase
      .from("invitations")
      .select("*, enterprises(name), organizations(name)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setStatus("invalid"); return; }
        setInvite(data as InviteData);
        if (data.use_count >= data.max_uses) { setStatus("used"); return; }
        if (new Date(data.expires_at) < new Date()) { setStatus("expired"); return; }
        setStatus("valid");
      });
  }, [id]);

  const handleAccept = async () => {
    const phone = getCurrentPhone();
    if (!phone) {
      navigate(`/login?invite=${id}`);
      return;
    }
    setAccepting(true);
    try {
      await acceptInvitation(id!, phone);
      toast({ title: "加入成功！", description: `欢迎加入 ${invite?.enterprises?.name}` });
      navigate("/onboarding");
    } catch (e: any) {
      toast({ title: "加入失败", description: e.message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, hsl(214,100%,97%), hsl(240,100%,97%))" }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-muted-foreground tracking-wide">AI 网关平台</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {status === "loading" && (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
              <Skeleton className="h-11 w-full mt-6" />
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">🔗</div>
              <h2 className="text-lg font-semibold text-foreground">邀请链接无效</h2>
              <p className="text-sm text-muted-foreground">该邀请链接不存在或已被删除。</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/login")}>返回登录</Button>
            </div>
          )}

          {status === "expired" && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">⏰</div>
              <h2 className="text-lg font-semibold text-foreground">邀请已过期</h2>
              <p className="text-sm text-muted-foreground">
                该邀请于 {invite && formatDate(invite.expires_at)} 到期，请联系管理员重新邀请。
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/login")}>返回登录</Button>
            </div>
          )}

          {status === "used" && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">✅</div>
              <h2 className="text-lg font-semibold text-foreground">邀请次数已用完</h2>
              <p className="text-sm text-muted-foreground">该邀请链接已达到最大使用次数，请联系管理员。</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/login")}>返回登录</Button>
            </div>
          )}

          {status === "valid" && invite && (
            <div className="space-y-6">
              {/* Main invitation message */}
              <div className="text-center space-y-2">
                <div className="text-3xl mb-3">🎉</div>
                <h1 className="text-xl font-bold text-foreground leading-snug">
                  <span className="text-primary">{invite.inviter_phone}</span>
                  <br />
                  邀请你加入
                  <br />
                  <span className="text-primary">{invite.enterprises?.name}</span>
                </h1>
              </div>

              {/* Details */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
                {invite.organizations?.name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">所属组织</span>
                    <span className="font-medium text-foreground">{invite.organizations.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">授予角色</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: "hsl(224,76%,48%,0.1)", color: "hsl(224,76%,48%)" }}>
                    {ROLE_LABELS[invite.invited_role] ?? invite.invited_role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">邀请有效期</span>
                  <span className="text-foreground">{formatDate(invite.expires_at)}</span>
                </div>
              </div>

              {/* CTA */}
              <Button
                className="w-full h-12 text-base font-semibold"
                style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? "处理中..." : "接受邀请并加入"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                已有账号？
                <button
                  className="text-primary hover:underline ml-0.5"
                  onClick={() => navigate(`/login?invite=${id}`)}
                >
                  点此登录
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
