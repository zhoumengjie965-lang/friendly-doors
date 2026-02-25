import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentPhone, getPendingInvitations, acceptInvitation, rejectInvitation, getUserEnterprises } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, CheckCircle, XCircle } from "lucide-react";

interface Invitation {
  id: string;
  inviter_phone: string;
  enterprises: { name: string; enterprise_code: string } | null;
  expires_at: string;
}

export default function Invitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const phone = getCurrentPhone()!;

  const loadInvitations = async () => {
    const data = await getPendingInvitations(phone);
    setInvitations(data as Invitation[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!phone) { navigate("/login"); return; }
    loadInvitations();
  }, []);

  const handleAccept = async (id: string) => {
    setProcessing(id);
    try {
      await acceptInvitation(id, phone);
      toast({ title: "已成功加入企业" });
      await loadInvitations();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await rejectInvitation(id);
      toast({ title: "已拒绝邀请" });
      await loadInvitations();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleContinue = async () => {
    const enterprises = await getUserEnterprises(phone);
    if (enterprises.length > 0) {
      navigate("/workspace");
    } else {
      navigate("/no-enterprise");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">您有待处理的邀请</h1>
          <p className="text-muted-foreground text-sm mt-1">请处理以下企业邀请</p>
        </div>

        <div className="space-y-4">
          {invitations.map((inv) => (
            <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {inv.enterprises?.name || "未知企业"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      邀请人：{inv.inviter_phone} · 企业码：{inv.enterprises?.enterprise_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      过期时间：{new Date(inv.expires_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={processing === inv.id}
                    onClick={() => handleReject(inv.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    拒绝
                  </Button>
                  <Button
                    size="sm"
                    disabled={processing === inv.id}
                    style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                    onClick={() => handleAccept(inv.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    接受
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {invitations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>所有邀请已处理完毕</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={handleContinue}>
            {invitations.length > 0 ? "稍后再处理，继续" : "继续前往"}
          </Button>
        </div>
      </div>
    </div>
  );
}
