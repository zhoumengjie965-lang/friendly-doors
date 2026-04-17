import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId: string;
  existingMembers: { user_phone: string; role: string }[];
  onCreated: () => void;
}

export default function CreateOrgDialog({ open, onOpenChange, enterpriseId, existingMembers, onCreated }: Props) {
  const [orgName, setOrgName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [orgAdminPhone, setOrgAdminPhone] = useState("__none__");
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast({ title: "请填写部门名称", variant: "destructive" });
      return;
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

      toast({ title: "创建成功", description: `部门「${orgName}」已创建` });
      setOrgName(""); setMonthlyBudget("");
      setOrgAdminPhone("__none__");
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
          <DialogTitle>创建部门</DialogTitle>
          <DialogDescription>填写以下信息创建新的部门</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 部门名称 */}
          <div className="space-y-2">
            <Label>部门名称 <span className="text-destructive">*</span></Label>
            <Input 
              placeholder="请输入部门名称" 
              value={orgName} 
              onChange={e => setOrgName(e.target.value)} 
            />
          </div>

          {/* 默认月预算 */}
          <div className="space-y-2">
            <Label>默认月预算（元/月）</Label>
            <Input
              type="number"
              placeholder="留空表示不限制"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(e.target.value)}
              min={0}
            />
          </div>

          {/* 设置部门管理员 */}
          <div className="space-y-2">
            <Label>设置部门管理员</Label>
            <Select value={orgAdminPhone} onValueChange={setOrgAdminPhone}>
              <SelectTrigger className="h-auto py-2">
                {orgAdminPhone === "__none__" || !orgAdminPhone ? (
                  <div className="flex flex-col items-start">
                    <span>不指定</span>
                    <span className="text-xs text-muted-foreground">不指定时该部门默认由企业管理员管理</span>
                  </div>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <div className="flex flex-col">
                    <span>不指定</span>
                    <span className="text-xs text-muted-foreground">不指定时该部门默认由企业管理员管理</span>
                  </div>
                </SelectItem>
                {existingMembers.map(m => (
                  <SelectItem key={m.user_phone} value={m.user_phone}>
                    {userMap[m.user_phone] || m.user_phone}
                    {userMap[m.user_phone] ? ` - ${m.user_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={loading}>
              {loading ? "创建中..." : "创建部门"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
