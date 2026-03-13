import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type AddMode = "single" | "bulk";
type Role = "admin" | "org_admin" | "member";

interface ParsedMember {
  name: string;
  phone: string;
  valid: boolean;
  reason?: string;
}

function parseBulkText(text: string): ParsedMember[] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Support: "姓名 手机号" or "姓名,手机号" or "姓名，手机号"
      const parts = line.split(/[\s,，]+/).filter(p => p.length > 0);
      if (parts.length < 2) {
        return { name: line, phone: "", valid: false, reason: "格式错误，请用空格或逗号分隔姓名和手机号" };
      }
      const name = parts[0];
      const phone = parts[1];
      const phoneValid = /^1[3-9]\d{9}$/.test(phone);
      if (!phoneValid) {
        return { name, phone, valid: false, reason: "手机号格式错误" };
      }
      return { name, phone, valid: true };
    });
}

const roleLabel = (r: string) => r === "admin" ? "企业管理员" : r === "org_admin" ? "部门管理员" : "普通成员";

export default function CreateOrgDialog({ open, onOpenChange, enterpriseId, existingMembers, onCreated }: Props) {
  const [orgName, setOrgName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("single");

  // Single mode
  const [adminPhone, setAdminPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("org_admin");

  // Bulk mode
  const [bulkText, setBulkText] = useState("");
  const [bulkRole, setBulkRole] = useState<Role>("member");

  // Org admin
  const [orgAdminPhone, setOrgAdminPhone] = useState("__none__");
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const phone = getCurrentPhone();

  // Load user names when dialog opens
  useEffect(() => {
    if (!open || existingMembers.length === 0) return;
    const phones = existingMembers.map(m => m.user_phone);
    supabase.from("users").select("phone,name").in("phone", phones).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(u => { if (u.name) map[u.phone] = u.name; });
        setUserMap(map);
      }
    });
  }, [open, existingMembers]);

  const bulkParsed = useMemo(() => parseBulkText(bulkText), [bulkText]);

  const switchMode = (mode: AddMode) => {
    setAddMode(mode);
    setAdminPhone(""); setAdminName("");
    setBulkText("");
  };

  const processMember = async (orgId: string, memberPhone: string, memberName: string, role: Role) => {
    await supabase.from("users").upsert({ phone: memberPhone, name: memberName }, { onConflict: "phone" });
    const existingMember = existingMembers.find(m => m.user_phone === memberPhone);
    if (existingMember) {
      await supabase.from("members")
        .update({ role, organization_id: orgId } as any)
        .eq("user_phone", memberPhone)
        .eq("enterprise_id", enterpriseId);
    } else {
      await supabase.from("invitations").insert({
        enterprise_id: enterpriseId,
        organization_id: orgId,
        inviter_phone: phone!,
        invitee_phone: memberPhone,
        invited_role: role,
        max_uses: 1,
      } as any);
    }
  };

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast({ title: "请填写部门名称", variant: "destructive" });
      return;
    }

    if (addMode === "single") {
      if (adminPhone.trim() && !adminName.trim()) {
        toast({ title: "请填写成员姓名", variant: "destructive" });
        return;
      }
      if (adminName.trim() && !adminPhone.trim()) {
        toast({ title: "请填写成员手机号", variant: "destructive" });
        return;
      }
    } else {
      if (bulkText.trim() && bulkParsed.some(m => !m.valid)) {
        toast({ title: "批量导入中有格式错误，请修正后再提交", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          enterprise_id: enterpriseId,
          name: orgName.trim(),
          monthly_budget: monthlyBudget === "" ? null : Number(monthlyBudget),
          admin_phone: orgAdminPhone !== "__none__" ? orgAdminPhone : null,
        } as any)
        .select()
        .single();
      if (orgErr || !org) throw orgErr || new Error("创建失败");

      if (addMode === "single" && adminPhone.trim() && adminName.trim()) {
        await processMember(org.id, adminPhone.trim(), adminName.trim(), inviteRole);
      } else if (addMode === "bulk" && bulkParsed.length > 0) {
        for (const m of bulkParsed) {
          if (m.valid) {
            await processMember(org.id, m.phone, m.name, bulkRole);
          }
        }
      }

      toast({ title: "创建成功", description: `部门「${orgName}」已创建` });
      setOrgName(""); setMonthlyBudget(""); setAdminPhone(""); setAdminName(""); setBulkText("");
      setOrgAdminPhone("__none__");
      setAddMode("single");
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "创建失败", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isExistingMember = adminPhone.trim() ? existingMembers.find(m => m.user_phone === adminPhone.trim()) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建部门</DialogTitle>
          <DialogDescription>填写以下信息创建新的部门</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>部门名称 <span className="text-destructive">*</span></Label>
          <Input placeholder="请输入部门名称" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>默认月预算（元）<span className="text-muted-foreground text-xs">（可选）</span></Label>
            <Input
              type="number"
              placeholder="留空表示不限制"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(e.target.value)}
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label>设置部门管理员 <span className="text-muted-foreground text-xs">（可选）</span></Label>
            <Select value={orgAdminPhone} onValueChange={setOrgAdminPhone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不指定（默认企业管理员）</SelectItem>
                {existingMembers.map(m => (
                  <SelectItem key={m.user_phone} value={m.user_phone}>
                    {userMap[m.user_phone] || m.user_phone}
                    {userMap[m.user_phone] ? ` - ${m.user_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">不指定时该部门默认由企业管理员管理</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>邀请初始成员 <span className="text-muted-foreground text-xs">（可选）</span></Label>
              <div className="flex rounded-md border border-input overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => switchMode("single")}
                  className={`px-3 py-1 transition-colors ${addMode === "single" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  单个添加
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("bulk")}
                  className={`px-3 py-1 transition-colors border-l border-input ${addMode === "bulk" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  批量导入
                </button>
              </div>
            </div>

            {addMode === "single" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="手机号"
                    value={adminPhone}
                    onChange={e => setAdminPhone(e.target.value)}
                  />
                  <Input
                    placeholder="姓名（必填）"
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                  />
                  <Select value={inviteRole} onValueChange={v => setInviteRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">普通成员</SelectItem>
                      <SelectItem value="org_admin">部门管理员</SelectItem>
                      <SelectItem value="admin">企业管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {adminPhone.trim() && (
                  <p className={`text-xs ${isExistingMember ? "text-primary" : "text-muted-foreground"}`}>
                    {isExistingMember
                      ? `✓ 企业现有成员，将直接设为${roleLabel(inviteRole)}`
                      : `→ 将发送邀请并设为${roleLabel(inviteRole)}`}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder={"每行一人，格式：姓名 手机号\n例如：\n张三 13800000001\n李四,13900000002"}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">支持空格或逗号分隔姓名和手机号，每行一人</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">统一角色</span>
                  <Select value={bulkRole} onValueChange={v => setBulkRole(v as Role)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">普通成员</SelectItem>
                      <SelectItem value="org_admin">组织管理员</SelectItem>
                      <SelectItem value="admin">企业管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {bulkParsed.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1 max-h-36 overflow-y-auto">
                    {bulkParsed.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium truncate">{m.name}</span>
                        <span className="text-muted-foreground shrink-0">{m.phone || "—"}</span>
                        <span className={m.valid ? "text-green-600 shrink-0" : "text-destructive shrink-0"}>
                          {m.valid ? "✓ 正确" : `✗ ${m.reason}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
