import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPhone } from "@/lib/auth";

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
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const phone = getCurrentPhone();

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast({ title: "请填写组织名称", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // 1. Create org
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

      // 2. Handle admin assignment
      if (adminPhone.trim()) {
        const existingMember = existingMembers.find(m => m.user_phone === adminPhone.trim());
        if (existingMember) {
          // Update existing member to org_admin
          await supabase
            .from("members")
            .update({ role: "org_admin", organization_id: org.id } as any)
            .eq("user_phone", adminPhone.trim())
            .eq("enterprise_id", enterpriseId);
        } else {
          // Create invitation with org_admin role
          await supabase.from("invitations").insert({
            enterprise_id: enterpriseId,
            organization_id: org.id,
            inviter_phone: phone!,
            invitee_phone: adminPhone.trim(),
            invited_role: "org_admin",
            max_uses: 1,
          } as any);
        }
      }

      toast({ title: "创建成功", description: `组织「${orgName}」已创建` });
      setOrgName(""); setAdminPhone(""); setMonthlyBudget("");
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "创建失败", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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

          <div className="space-y-2">
            <Label>组织管理员手机号 <span className="text-muted-foreground text-xs">（可选）</span></Label>
            <Input
              placeholder="现有成员或新手机号（将收到邀请）"
              value={adminPhone}
              onChange={e => setAdminPhone(e.target.value)}
            />
            {adminPhone.trim() && (
              <p className="text-xs text-muted-foreground">
                {existingMembers.find(m => m.user_phone === adminPhone.trim())
                  ? "✓ 企业现有成员，将直接设为组织管理员"
                  : "→ 非企业成员，将发送邀请并设为组织管理员"}
              </p>
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
