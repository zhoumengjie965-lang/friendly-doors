import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, Key, Plus, SlidersHorizontal, Pencil, UserCog, Power, Trash2, ChevronDown } from "lucide-react";
import CreateOrgDialog from "@/components/CreateOrgDialog";
import OrgBudgetSheet from "@/components/OrgBudgetSheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Enterprise { id: string; name: string; enterprise_code: string }

interface Org {
  id: string;
  name: string;
  status: string;
  monthly_budget: number | null;
  current_month_budget: number | null;
  admin_phone: string | null;
  memberCount?: number;
}

interface Props {
  enterprise: Enterprise;
  role: string;
}

export default function OrgManagement({ enterprise, role }: Props) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<{ user_phone: string; role: string }[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({}); // phone -> name
  const [orgCount, setOrgCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [budgetOrg, setBudgetOrg] = useState<Org | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<Org | null>(null);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editName, setEditName] = useState("");
  const [setAdminOrg, setSetAdminOrg] = useState<Org | null>(null);
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const load = async () => {
    setLoading(true);
    const [orgsRes, membersRes, usersRes] = await Promise.all([
      supabase.from("organizations").select("*").eq("enterprise_id", enterprise.id).order("created_at"),
      supabase.from("members").select("user_phone, role, organization_id").eq("enterprise_id", enterprise.id),
      supabase.from("users").select("phone, name"),
    ]);
    const allMembers = membersRes.data || [];
    setMembers(allMembers);
    setMemberCount(allMembers.length);

    const map: Record<string, string> = {};
    for (const u of (usersRes.data || [])) { if (u.phone) map[u.phone] = u.name || ""; }
    setUserMap(map);

    const rawOrgs = (orgsRes.data || []) as any[];
    const orgsWithCount = rawOrgs.map(org => ({
      ...org,
      memberCount: allMembers.filter(m => m.organization_id === org.id).length,
    }));
    setOrgs(orgsWithCount);
    setOrgCount(orgsWithCount.length);
    setLoading(false);
  };

  useEffect(() => { load(); }, [enterprise.id]);

  const toggleStatus = async (org: Org) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    const { error } = await supabase.from("organizations").update({ status: newStatus } as any).eq("id", org.id);
    if (error) { toast({ title: "操作失败", variant: "destructive" }); return; }
    toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
    load();
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;
    if (deleteOrg.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      setDeleteOrg(null);
      return;
    }
    await supabase.from("organizations").delete().eq("id", deleteOrg.id);
    toast({ title: "已删除部门" });
    setDeleteOrg(null);
    load();
  };

  const handleEditName = async () => {
    if (!editOrg || !editName.trim()) return;
    setSaving(true);
    await supabase.from("organizations").update({ name: editName.trim() } as any).eq("id", editOrg.id);
    toast({ title: "名称已更新" });
    setSaving(false);
    setEditOrg(null);
    load();
  };

  const handleSetAdmin = async () => {
    if (!setAdminOrg) return;
    setSaving(true);
    try {
      const phone = newAdminPhone === "__none__" ? null : newAdminPhone;
      await supabase.from("organizations").update({ admin_phone: phone } as any).eq("id", setAdminOrg.id);
      if (phone) {
        const existingMember = members.find(m => m.user_phone === phone);
        if (existingMember) {
          await supabase.from("members").update({ role: "org_admin", organization_id: setAdminOrg.id } as any)
            .eq("user_phone", phone).eq("enterprise_id", enterprise.id);
        }
      }
      toast({ title: "部门管理员已更新" });
      setSetAdminOrg(null);
      setNewAdminPhone("");
      load();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: "部门总数", value: String(orgCount), icon: Building2, color: "hsl(224,76%,48%)" },
    { label: "企业成员", value: String(memberCount), icon: Users, color: "hsl(142,70%,45%)" },
    { label: "API Key", value: "—", icon: Key, color: "hsl(262,60%,58%)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">部门治理</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理企业下的部门单元及预算分配</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            创建部门
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}20` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">部门列表</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无部门</p>
            {isAdmin && <Button variant="outline" className="mt-4 gap-2" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" />创建第一个部门</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">部门名称</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">部门管理员</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">成员数</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">本月预算上限</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">本月消耗预算</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">使用率</th>
                  <th className="text-left px-6 py-3 text-muted-foreground font-medium">状态</th>
                  <th className="text-right px-6 py-3 text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, i) => (
                  <tr key={org.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-6 py-4 font-medium text-foreground">{org.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {org.admin_phone
                        ? (userMap[org.admin_phone]
                            ? userMap[org.admin_phone]
                            : `${org.admin_phone.slice(0,3)}****${org.admin_phone.slice(-4)}`)
                        : <span className="text-muted-foreground/50 text-xs">未设置</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{org.memberCount ?? 0}</td>
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         <span className="text-foreground">
                           {org.monthly_budget != null ? `¥${org.monthly_budget}` : "不限"}
                         </span>
                         {isAdmin && (
                           <button onClick={() => setBudgetOrg(org)}
                             className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                             <SlidersHorizontal className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <span className="text-foreground">
                         {org.current_month_budget != null ? `¥${org.current_month_budget.toFixed(2)}` : "¥0.00"}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       {org.monthly_budget != null && org.monthly_budget > 0 ? (
                         <div className="flex items-center gap-2 min-w-[80px]">
                           <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                             <div
                               className="h-full rounded-full bg-primary transition-all"
                               style={{ width: `${Math.min(100, ((org.current_month_budget ?? 0) / org.monthly_budget) * 100).toFixed(1)}%` }}
                             />
                           </div>
                           <span className="text-xs text-muted-foreground whitespace-nowrap">
                             {Math.min(100, Math.round(((org.current_month_budget ?? 0) / org.monthly_budget) * 100))}%
                           </span>
                         </div>
                       ) : (
                         <span className="text-xs text-muted-foreground">0%</span>
                       )}
                     </td>
                    <td className="px-6 py-4">
                      <Badge variant={org.status === "active" ? "default" : "secondary"}
                        className={org.status === "active"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15"
                          : "bg-muted text-muted-foreground"}>
                        {org.status === "active" ? "已启用" : "已禁用"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs px-3">
                            管理 <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                           <DropdownMenuItem onClick={() => { setEditOrg(org); setEditName(org.name); }} className="gap-2">
                             <Pencil className="w-3.5 h-3.5" /> 编辑部门名称
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => { setSetAdminOrg(org); setNewAdminPhone(org.admin_phone || "__none__"); }} className="gap-2">
                             <UserCog className="w-3.5 h-3.5" /> 设置管理员
                           </DropdownMenuItem>
                           {isAdmin && (
                             <>
                               <DropdownMenuSeparator />
                               <DropdownMenuItem onClick={() => toggleStatus(org)} className="gap-2">
                                 <Power className="w-3.5 h-3.5" />
                                 {org.status === "active" ? "禁用部门" : "启用部门"}
                               </DropdownMenuItem>
                               <DropdownMenuItem
                                 onClick={() => setDeleteOrg(org)}
                                 className="gap-2 text-destructive focus:text-destructive"
                                 disabled={org.name === "默认组织"}>
                                 <Trash2 className="w-3.5 h-3.5" /> 删除部门
                               </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        enterpriseId={enterprise.id}
        existingMembers={members}
        onCreated={load}
      />

      {/* Budget Sheet */}
      <OrgBudgetSheet
        open={!!budgetOrg}
        onOpenChange={(o) => { if (!o) setBudgetOrg(null); }}
        org={budgetOrg}
        onSaved={load}
      />

      {/* Edit Name Dialog */}
      <Dialog open={!!editOrg} onOpenChange={(o) => { if (!o) setEditOrg(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>编辑部门名称</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>部门名称</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditOrg(null)}>取消</Button>
              <Button className="flex-1" onClick={handleEditName} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Admin Dialog */}
      <Dialog open={!!setAdminOrg} onOpenChange={(o) => { if (!o) setSetAdminOrg(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>设置部门管理员</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>选择管理员</Label>
              <Select value={newAdminPhone} onValueChange={setNewAdminPhone}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不指定（默认企业管理员）</SelectItem>
                  {members.filter(m => m.user_phone).map(m => (
                    <SelectItem key={m.user_phone} value={m.user_phone}>
                      {userMap[m.user_phone]
                        ? `${userMap[m.user_phone]} - ${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}`
                        : `${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">不指定时，该组织默认由企业管理员管理</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSetAdminOrg(null)}>取消</Button>
              <Button className="flex-1" onClick={handleSetAdmin} disabled={saving || !newAdminPhone}>{saving ? "保存中..." : "确认"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteOrg} onOpenChange={(o) => { if (!o) setDeleteOrg(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除组织</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除组织「{deleteOrg?.name}」。该操作不可撤销，组织内成员不会被删除，但将失去组织归属。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
