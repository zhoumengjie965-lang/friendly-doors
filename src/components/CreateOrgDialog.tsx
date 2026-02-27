import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPhone } from "@/lib/auth";
import { Link, Copy, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId: string;
  existingMembers: { user_phone: string; role: string }[];
  onCreated: () => void;
}

export default function CreateOrgDialog({ open, onOpenChange, enterpriseId, existingMembers, onCreated }: Props) {
  const [orgName, setOrgName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"org_admin" | "member">("org_admin");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const phone = getCurrentPhone();

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const { data: inv, error } = await supabase
        .from("invitations")
        .insert({
          enterprise_id: enterpriseId,
          organization_id: null,
          inviter_phone: phone!,
          invited_role: inviteRole,
          max_uses: 1,
        } as any)
        .select()
        .single();
      if (error || !inv) throw error || new Error("生成失败");
      const link = `${window.location.origin}/workspace/join?code=${inv.invite_code}`;
      setInviteLink(link);
      setInviteId(inv.id);
      setAdminPhone(""); // mutual exclusion
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "邀请链接已生成并复制到剪贴板" });
    } catch (e: any) {
      toast({ title: "生成失败", description: e?.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast({ title: "请填写组织名称", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          enterprise_id: enterpriseId,
          name: orgName.trim(),
          admin_phone: adminPhone.trim() || null,
          monthly_budget: monthlyBudget !== "" ? Number(monthlyBudget) : null,
        } as any)
        .select()
        .single();
      if (orgErr || !org) throw orgErr || new Error("创建失败");

      // Handle admin via phone
      if (adminPhone.trim()) {
        const existingMember = existingMembers.find(m => m.user_phone === adminPhone.trim());
        if (existingMember) {
          await supabase
            .from("members")
            .update({ role: "org_admin", organization_id: org.id } as any)
            .eq("user_phone", adminPhone.trim())
            .eq("enterprise_id", enterpriseId);
        } else {
          await supabase.from("invitations").insert({
            enterprise_id: enterpriseId,
            organization_id: org.id,
            inviter_phone: phone!,
            invitee_phone: adminPhone.trim(),
            invited_role: inviteRole,
            max_uses: 1,
          } as any);
        }
      }

      // Link pre-generated invite link to the new org
      if (inviteId && !adminPhone.trim()) {
        await supabase
          .from("invitations")
          .update({ organization_id: org.id } as any)
          .eq("id", inviteId);
      }

      toast({ title: "创建成功", description: `组织「${orgName}」已创建` });
      setOrgName(""); setAdminPhone(""); setMonthlyBudget(""); setInviteLink(""); setInviteId("");
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "创建失败", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isExistingMember = adminPhone.trim() && existingMembers.find(m => m.user_phone === adminPhone.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建组织</DialogTitle>
          <DialogDescription>填写以下信息创建新的组织单元</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>组织名称 <span className="text-destructive">*</span></Label>
            <Input placeholder="请输入组织名称" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>邀请初始成员 <span className="text-muted-foreground text-xs">（可选）</span></Label>

            {/* Phone input + role select */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  placeholder="请输入手机号"
                  value={adminPhone}
                  onChange={e => { setAdminPhone(e.target.value); if (e.target.value) { setInviteLink(""); setInviteId(""); } }}
                />
                <Select value={inviteRole} onValueChange={v => setInviteRole(v as "org_admin" | "member")}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">管理员</SelectItem>
                    <SelectItem value="member">普通成员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {adminPhone.trim() && (
                <p className={`text-xs ${isExistingMember ? "text-primary" : "text-muted-foreground"}`}>
                  {isExistingMember
                    ? `✓ 企业现有成员，将直接设为${inviteRole === "org_admin" ? "组织管理员" : "普通成员"}`
                    : `→ 将发送邀请并设为${inviteRole === "org_admin" ? "组织管理员" : "普通成员"}`}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">或</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Invite link */}
            {!inviteLink ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGenerateLink}
                disabled={generatingLink || !!adminPhone.trim()}
              >
                <Link className="h-4 w-4 mr-2" />
                {generatingLink ? "生成中..." : "生成邀请链接"}
              </Button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">链接已生成，创建组织后自动关联。角色：{inviteRole === "org_admin" ? "组织管理员" : "普通成员"}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto p-0 text-muted-foreground"
                  onClick={() => { setInviteLink(""); setInviteId(""); }}
                >
                  重新生成
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>默认月预算（元）<span className="text-muted-foreground text-xs">（可选）</span></Label>
            <Input
              type="number"
              min="0"
              placeholder="留空表示不限制"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={loading}>
              {loading ? "创建中..." : "创建组织"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
