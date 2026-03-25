import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface AdminInfo {
  phone: string;
  name: string | null;
}

export default function EnterpriseInfo({ enterprise, role }: EnterpriseInfoProps) {
  const { toast } = useToast();
  const phone = getCurrentPhone();
  const isAdmin = role === "admin";

  const [enterpriseName, setEnterpriseName] = useState(enterprise.name);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(enterprise.name);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [certStatus, setCertStatus] = useState<string>("uncertified");
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [createdAt, setCreatedAt] = useState<string>("");
  
  // Edit admin name dialog state
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminInfo | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

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

    // Mock: 2 admins
    setAdmins([
      { phone: "13800138001", name: "张三" },
      { phone: "13900139002", name: "李四" },
    ]);

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

  const handleOpenEditName = (admin: AdminInfo) => {
    setEditingAdmin(admin);
    setEditNameValue(admin.name || "");
    setEditNameDialogOpen(true);
  };

  const handleSaveAdminName = async () => {
    if (!editingAdmin) return;
    const { error } = await supabase
      .from("members")
      .update({ name: editNameValue.trim() || null })
      .eq("enterprise_id", enterprise.id)
      .eq("user_phone", editingAdmin.phone);
    if (error) {
      toast({ title: "修改失败", description: error.message, variant: "destructive" });
    } else {
      setAdmins(admins.map(a => a.phone === editingAdmin.phone ? { ...a, name: editNameValue.trim() || null } : a));
      setEditNameDialogOpen(false);
      setEditingAdmin(null);
      toast({ title: "修改成功", description: "管理员姓名已更新" });
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {admins.map((a) => (
                    <span
                      key={a.phone}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white cursor-default"
                      style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                    >
                      {a.name ? `${a.name}（${a.phone}）` : a.phone}
                      {isAdmin && (
                        <Pencil
                          className="w-3.5 h-3.5 cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handleOpenEditName(a); }}
                        />
                      )}
                    </span>
                  ))}
                </div>
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

      {/* Edit Admin Name Dialog */}
      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>设置管理员姓名</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">手机号</label>
              <p className="text-sm font-medium">{editingAdmin?.phone}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">姓名</label>
              <Input
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                placeholder="请输入管理员姓名"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveAdminName}>
                确定
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
