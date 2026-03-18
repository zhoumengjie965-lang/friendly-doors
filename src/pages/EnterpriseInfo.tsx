import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AdminManageDialog from "@/components/AdminManageDialog";
import CertificationSection from "@/components/CertificationSection";

interface EnterpriseInfoProps {
  enterprise: {
    id: string;
    name: string;
    enterprise_code: string;
    created_at?: string;
  };
  role: string;
}

export default function EnterpriseInfo({ enterprise, role }: EnterpriseInfoProps) {
  const { toast } = useToast();
  const phone = getCurrentPhone();
  const isAdmin = role === "admin";

  const [enterpriseName, setEnterpriseName] = useState(enterprise.name);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(enterprise.name);
  const [admins, setAdmins] = useState<string[]>([]);
  const [certStatus, setCertStatus] = useState<string>("uncertified");
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [createdAt, setCreatedAt] = useState<string>("");

  const loadData = async () => {
    // Load enterprise details (for created_at)
    const { data: ent } = await supabase
      .from("enterprises")
      .select("created_at, name")
      .eq("id", enterprise.id)
      .single();
    if (ent) {
      setCreatedAt(ent.created_at);
      setEnterpriseName(ent.name);
      setEditValue(ent.name);
    }

    // Load admins
    const { data: members } = await supabase
      .from("members")
      .select("user_phone, role")
      .eq("enterprise_id", enterprise.id)
      .eq("role", "admin");
    setAdmins((members || []).map((m) => m.user_phone));

    // Load certification
    const { data: cert } = await supabase
      .from("enterprise_certifications")
      .select("status")
      .eq("enterprise_id", enterprise.id)
      .maybeSingle();
    setCertStatus(cert?.status || "uncertified");
  };

  useEffect(() => {
    loadData();
  }, [enterprise.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(enterprise.enterprise_code);
    toast({ title: "已复制", description: "企业 ID 已复制到剪贴板" });
  };

  const handleSaveName = async () => {
    if (!editValue.trim()) return;
    const { error } = await supabase
      .from("enterprises")
      .update({ name: editValue.trim() })
      .eq("id", enterprise.id);
    if (error) {
      toast({ title: "修改失败", description: error.message, variant: "destructive" });
    } else {
      setEnterpriseName(editValue.trim());
      setEditing(false);
      toast({ title: "修改成功", description: "企业名称已更新" });
    }
  };

  const isCertified = certStatus === "certified";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">企业信息</h1>

      {/* Basic Info Card */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, hsl(224,76%,48%), hsl(262,60%,58%))" }} />
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Enterprise Name */}
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">企业名称</p>
              {editing ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 h-9"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={handleSaveName}>
                    <Check className="w-4 h-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => { setEditing(false); setEditValue(enterpriseName); }}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{enterpriseName}</span>
                  {isAdmin && !isCertified && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {isCertified && (
                    <span className="text-xs text-muted-foreground ml-1">（已认证，不可修改）</span>
                  )}
                </div>
              )}
            </div>

            {/* Enterprise ID */}
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">企业 ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xl font-bold font-mono text-foreground tracking-wider">{enterprise.enterprise_code}</code>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCopyCode}>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Created At */}
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">创建时间</p>
              <span className="text-xl font-bold text-foreground">
                {createdAt ? format(new Date(createdAt), "yyyy-MM-dd HH:mm") : "—"}
              </span>
            </div>

            {/* Admins */}
            <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">企业管理员</p>
              <div className="flex items-center gap-2 flex-wrap">
                {admins.map((a) => (
                  <span key={a} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-mono font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
                    {a}
                  </span>
                ))}
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setAdminDialogOpen(true)}>
                    管理
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certification Section */}
      <CertificationSection
        enterpriseId={enterprise.id}
        isAdmin={isAdmin}
        onUpdate={loadData}
      />

      {/* Admin Manage Dialog */}
      <AdminManageDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        enterpriseId={enterprise.id}
        currentPhone={phone || ""}
        onUpdate={loadData}
      />
    </div>
  );
}
