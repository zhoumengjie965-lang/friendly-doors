import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Search, Lock, Building2, Folder, ChevronRight, ChevronDown,
  Users, Key, Plus, MoreHorizontal, Wallet, TrendingUp, BarChart3,
  Sliders, SlidersHorizontal, Pencil, UserCog, Power,
  Trash2, AlertTriangle, MoreVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateOrgDialog from "@/components/CreateOrgDialog";
import OrgBudgetSheet from "@/components/OrgBudgetSheet";
import InlineBudgetEdit from "@/components/InlineBudgetEdit";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Enterprise { id: string; name: string; enterprise_code: string }

interface Org {
  id: string;
  name: string;
  status: string;
  monthly_budget: number | null;
  current_month_budget: number | null;
  admin_phone: string | null;
  enterprise_id: string;
  parent_id?: string | null;
  memberCount?: number;
}

// ─── Tree utilities ───────────────────────────────────────────────────────────
type OrgTreeNode = Org & { children: OrgTreeNode[] };

function buildTree(orgs: Org[], parentId: string | null = null): OrgTreeNode[] {
  return orgs
    .filter(o => (o.parent_id ?? null) === parentId)
    .map(o => ({ ...o, children: buildTree(orgs, o.id) }));
}

function flattenTree(nodes: OrgTreeNode[], depth = 0): { node: OrgTreeNode; depth: number }[] {
  const result: { node: OrgTreeNode; depth: number }[] = [];
  for (const n of nodes) {
    result.push({ node: n, depth });
    result.push(...flattenTree(n.children, depth + 1));
  }
  return result;
}

function getAncestors(orgs: Org[], nodeId: string): Org[] {
  const map = new Map(orgs.map(o => [o.id, o]));
  const chain: Org[] = [];
  let cur = map.get(nodeId);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent_id ? map.get(cur.parent_id) : undefined;
  }
  return chain;
}

interface Member {
  id: string;
  user_phone: string;
  role: string;
  organization_id: string | null;
  daily_limit: number | null;
  status: string;
}

interface PendingInvite {
  id: string;
  invitee_phone: string | null;
  invited_role: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
}




type AddMode = "single" | "bulk";
interface ParsedMember { name: string; phone: string; valid: boolean; reason?: string }

function parseBulkText(text: string): ParsedMember[] {
  return text.split("\n").map(l => l.trim()).filter(l => l.length > 0).map(line => {
    const parts = line.split(/[\s,，]+/).filter(p => p.length > 0);
    if (parts.length < 2) return { name: line, phone: "", valid: false, reason: "格式错误，请用空格或逗号分隔姓名和手机号" };
    const name = parts[0];
    const phone = parts[1];
    if (!/^1[3-9]\d{9}$/.test(phone)) return { name, phone, valid: false, reason: "手机号格式错误" };
    return { name, phone, valid: true };
  });
}

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component Props
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  enterprise: Enterprise;
  role: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RootView — 企业总部视图 (原 OrgManagement)
// ─────────────────────────────────────────────────────────────────────────────
function RootView({ enterprise, role, orgs, loadOrgs }: {
  enterprise: Enterprise;
  role: string;
  orgs: Org[];
  loadOrgs: () => void;
}) {
  const [members, setMembers] = useState<{ user_phone: string; role: string }[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [budgetOrg, setBudgetOrg] = useState<Org | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<Org | null>(null);
  const [cannotDeleteOrg, setCannotDeleteOrg] = useState<Org | null>(null);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editName, setEditName] = useState("");
  const [setAdminOrg, setSetAdminOrg] = useState<Org | null>(null);
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [totalPackage, setTotalPackage] = useState("");
  const [distributing, setDistributing] = useState(false);
  const [statsFlashKey, setStatsFlashKey] = useState(0);
  const { toast } = useToast();
  const isAdmin = role === "admin";

  // Enterprise balance
  const [enterpriseBalance, setEnterpriseBalance] = useState({ total: 50000, consumed: 12300 });

  const load = async () => {
    setLoading(true);
    const [membersRes, usersRes, enterpriseRes] = await Promise.all([
      supabase.from("members").select("user_phone, role, organization_id").eq("enterprise_id", enterprise.id),
      supabase.from("users").select("phone, name"),
      supabase.from("enterprises").select("balance, total_consumed").eq("id", enterprise.id).maybeSingle(),
    ]);
    const allMembers = membersRes.data || [];
    setMembers(allMembers);
    const map: Record<string, string> = {};
    for (const u of (usersRes.data || [])) { if (u.phone) map[u.phone] = u.name || ""; }
    setUserMap(map);
    // Load enterprise balance (fallback to mock data if not available)
    if (enterpriseRes.data) {
      const data = enterpriseRes.data as any;
      setEnterpriseBalance({
        total: data.balance ?? 50000,
        consumed: data.total_consumed ?? 12300,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [enterprise.id]);

  const orgCount = orgs.length;
  const memberCount = members.length;

  // Disable confirm dialog state
  const [disableConfirmOrg, setDisableConfirmOrg] = useState<Org | null>(null);

  const toggleStatus = async (org: Org, skipConfirm = false) => {
    const newStatus = org.status === "active" ? "disabled" : "active";

    // Show confirm dialog when disabling (not enabling)
    if (newStatus === "disabled" && !skipConfirm) {
      setDisableConfirmOrg(org);
      return;
    }

    const { error } = await supabase.from("organizations").update({ status: newStatus } as any).eq("id", org.id);
    if (error) { toast({ title: "操作失败", variant: "destructive" }); return; }
    if (newStatus === "active") {
      toast({
        title: "已启用",
        description: "已恢复部门内所有Key 权限，可正常调用",
      });
    } else {
      toast({
        title: "已禁用",
        description: "部门内所有 API Key 将立即失效，无法调用",
      });
    }
    loadOrgs();
  };

  const confirmDisable = async () => {
    if (!disableConfirmOrg) return;
    setDisableConfirmOrg(null);
    await toggleStatus(disableConfirmOrg, true);
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;
    if (deleteOrg.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      setDeleteOrg(null); return;
    }
    const recovered = deleteOrg.monthly_budget ?? 0;
    await supabase.from("organizations").delete().eq("id", deleteOrg.id);
    toast({ title: "已删除部门", description: recovered > 0 ? `¥${recovered.toLocaleString()} 预算已回收至企业` : undefined });
    setDeleteOrg(null);
    setStatsFlashKey(k => k + 1);
    loadOrgs();
  };

  // Check if org can be deleted (mock data check)
  const checkAndShowDeleteDialog = (org: Org) => {
    if (org.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      return;
    }
    // Mock check: assume some departments have resources
    // In real implementation, check: members count, API keys count, child departments count
    const hasResources = org.memberCount && org.memberCount > 0;
    // For demo: B部门 or any org with "B" in name will show cannot delete
    if (org.name.includes("B") || hasResources) {
      setCannotDeleteOrg(org);
    } else {
      setDeleteOrg(org);
    }
  };

  const handleEditName = async () => {
    if (!editOrg || !editName.trim()) return;
    setSaving(true);
    await supabase.from("organizations").update({ name: editName.trim() } as any).eq("id", editOrg.id);
    toast({ title: "名称已更新" });
    setSaving(false); setEditOrg(null);
    loadOrgs();
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
      setSetAdminOrg(null); setNewAdminPhone("");
      loadOrgs();
    } catch { toast({ title: "操作失败", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">部门管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理企业下的部门单元及预算分配</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* 1. 企业余额 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">企业余额</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10">
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">累计消耗</span>
              <span className="font-semibold text-foreground">¥{enterpriseBalance.consumed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">剩余可用</span>
              <span className="font-semibold text-emerald-600">¥{(enterpriseBalance.total - enterpriseBalance.consumed).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 2. 本月预算 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">本月预算</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/10">
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">本月已分配</span>
              <span className="font-semibold text-foreground">¥30,000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">本月已消耗</span>
              <span className="font-semibold text-destructive">¥20,000</span>
            </div>
          </div>
        </div>

        {/* 3. 企业资产 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">企业资产</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10">
              <Building2 className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">部门</span>
              <span className="font-semibold text-foreground">{orgCount}个</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">成员</span>
              <span className="font-semibold text-foreground">{memberCount}人</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">API Key</span>
              <span className="font-semibold text-foreground">42个</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">部门列表</h2>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBudgetDialog(true)} className="gap-1.5">
                <Sliders className="w-3.5 h-3.5" />一键配置预算
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />创建部门
              </Button>
            </div>
          )}
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
                        ? (userMap[org.admin_phone] || `${org.admin_phone.slice(0,3)}****${org.admin_phone.slice(-4)}`)
                        : <span className="text-muted-foreground/50 text-xs">未设置</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{org.memberCount ?? 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{org.monthly_budget != null ? `¥${org.monthly_budget}` : "不限"}</span>
                        {isAdmin && (
                          <button onClick={() => setBudgetOrg(org)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">{org.current_month_budget != null ? `¥${org.current_month_budget.toFixed(2)}` : "¥0.00"}</span>
                    </td>
                    <td className="px-6 py-4">
                      {org.monthly_budget != null && org.monthly_budget > 0 ? (
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, ((org.current_month_budget ?? 0) / org.monthly_budget) * 100).toFixed(1)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {Math.min(100, Math.round(((org.current_month_budget ?? 0) / org.monthly_budget) * 100))}%
                          </span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">0%</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={org.status === "active" ? "default" : "secondary"}
                        className={org.status === "active" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15" : "bg-muted text-muted-foreground"}>
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
                                <Power className="w-3.5 h-3.5" />{org.status === "active" ? "禁用部门" : "启用部门"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => checkAndShowDeleteDialog(org)} className="gap-2 text-destructive focus:text-destructive" disabled={org.name === "默认组织"}>
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
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} enterpriseId={enterprise.id} existingMembers={members} onCreated={loadOrgs} />

      {/* Budget Sheet */}
      <OrgBudgetSheet open={!!budgetOrg} onOpenChange={(o) => { if (!o) setBudgetOrg(null); }} org={budgetOrg} onSaved={loadOrgs} />

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
                <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不指定（默认企业管理员）</SelectItem>
                  {members.filter(m => m.user_phone).map(m => (
                    <SelectItem key={m.user_phone} value={m.user_phone}>
                      {userMap[m.user_phone] ? `${userMap[m.user_phone]} - ${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}` : `${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">不指定时，该部门默认由企业管理员管理</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSetAdminOrg(null)}>取消</Button>
              <Button className="flex-1" onClick={handleSetAdmin} disabled={saving || !newAdminPhone}>{saving ? "保存中..." : "确认"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm - Case 1: Can delete (no resources) */}
      <AlertDialog open={!!deleteOrg} onOpenChange={(o) => { if (!o) setDeleteOrg(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除部门「{deleteOrg?.name}」？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              该部门当前无成员和资源，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cannot Delete - Case 2: Has resources */}
      <AlertDialog open={!!cannotDeleteOrg} onOpenChange={(o) => { if (!o) setCannotDeleteOrg(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>该部门暂无法删除</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              部门「{cannotDeleteOrg?.name}」仍存在成员、API Key 或子部门，请先清理后再删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setCannotDeleteOrg(null)}>
              知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Confirm Dialog */}
      <AlertDialog open={!!disableConfirmOrg} onOpenChange={(o) => { if (!o) setDisableConfirmOrg(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              确认禁用部门「{disableConfirmOrg?.name}」？
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">禁用后将产生以下影响：</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1.5">•</span>
                <span>所有 API Key 将立即停止调用</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1.5">•</span>
                <span>该部门成员无法创建新 Key 或使用资源</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1.5">•</span>
                <span>当前进行中的请求可能会失败</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-1.5">•</span>
                <span>历史数据仍可查看，后续可重新启用</span>
              </li>
            </ul>
          </div>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
            是否继续？
          </div>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 一键配置预算 Dialog */}
      {(() => {
        const n = orgs.length;
        const monthlyBudget = Number(totalPackage);
        const [syncDefault, setSyncDefault] = useState(false);
        return (
          <Dialog open={showBudgetDialog} onOpenChange={(open) => { setShowBudgetDialog(open); if (!open) { setTotalPackage(""); setSyncDefault(false); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>一键配置预算</DialogTitle>
                <DialogDescription>为所有部门统一设置当月预算上限。</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="total-pkg">当月部门预算上限（元）</Label>
                  <Input id="total-pkg" type="number" placeholder="请输入当月预算上限" value={totalPackage} onChange={(e) => setTotalPackage(e.target.value)} />
                </div>
                {n > 0 && monthlyBudget > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                    共 <span className="font-semibold">{n}</span> 个部门，每个部门将设置为{" "}
                    <span className="font-bold text-primary tabular-nums">¥{monthlyBudget.toLocaleString()}</span>/月
                  </div>
                )}
                {/* 同步为默认月预算 */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sync-default"
                    checked={syncDefault}
                    onChange={(e) => setSyncDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="sync-default" className="text-sm font-normal cursor-pointer">
                    同步为默认月预算（下月生效）
                  </Label>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setShowBudgetDialog(false); setTotalPackage(""); setSyncDefault(false); }}>取消</Button>
                <Button disabled={distributing || n === 0 || monthlyBudget <= 0} onClick={async () => {
                  setDistributing(true);
                  try {
                    // 更新当月预算
                    await Promise.all(orgs.map(org => supabase.from("organizations").update({ monthly_budget: monthlyBudget } as any).eq("id", org.id)));
                    // 如果勾选了同步为默认，则更新默认预算字段（mock实现，实际需根据数据库结构调整）
                    if (syncDefault) {
                      // TODO: 更新默认月预算字段，供下月使用
                      console.log("已同步为默认月预算，下月生效");
                    }
                    setStatsFlashKey(k => k + 1);
                    toast({ title: `已成功为 ${n} 个部门设置预算`, description: `每个部门 ¥${monthlyBudget.toLocaleString()}/月${syncDefault ? "，已同步为默认预算" : ""}` });
                    setShowBudgetDialog(false); setTotalPackage(""); setSyncDefault(false); loadOrgs();
                  } catch { toast({ title: "操作失败", variant: "destructive" }); }
                  finally { setDistributing(false); }
                }}>
                  {distributing ? "保存中…" : "确认配置"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrgView — 部门详情视图 (原 OrgGovernance)
// ─────────────────────────────────────────────────────────────────────────────
function OrgView({ enterprise, role, orgId, orgs, onOrgUpdated }: {
  enterprise: Enterprise;
  role: string;
  orgId: string;
  orgs: Org[];
  onOrgUpdated: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState("member");
  const [editRemark, setEditRemark] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [addLimit, setAddLimit] = useState("2000");
  const [bulkText, setBulkText] = useState("");
  const [bulkRole, setBulkRole] = useState("member");
  const [bulkLimit, setBulkLimit] = useState("2000");
  const [saving, setSaving] = useState(false);
  // Sub-dept creation
  const [showCreateSubOrg, setShowCreateSubOrg] = useState(false);
  const [subOrgName, setSubOrgName] = useState("");
  const [subOrgBudget, setSubOrgBudget] = useState("");
  // Budget batch dialog
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [memberDailyLimit, setMemberDailyLimit] = useState("");
  const [distributing, setDistributing] = useState(false);
  // Sub-org batch budget dialog (一键配置预算)
  const [showSubOrgBudgetDialog, setShowSubOrgBudgetDialog] = useState(false);
  const [subOrgTotalPackage, setSubOrgTotalPackage] = useState("");
  const [subOrgDistributing, setSubOrgDistributing] = useState(false);
  // 预算配置弹窗的三个输入值
  const [memberBudgetInput, setMemberBudgetInput] = useState("");
  const [subOrgBudgetInput, setSubOrgBudgetInput] = useState("");
  const [apiKeyBudgetInput, setApiKeyBudgetInput] = useState("");
  const [statsFlashKey, setStatsFlashKey] = useState(0);
  const { toast } = useToast();
  const phone = getCurrentPhone();

  // Tab state
  const [activeTab, setActiveTab] = useState<"members" | "suborgs">("members");

  // Child orgs management states (for sub-org table)
  const [childBudgetOrg, setChildBudgetOrg] = useState<Org | null>(null);
  const [childEditOrg, setChildEditOrg] = useState<Org | null>(null);
  const [childEditName, setChildEditName] = useState("");
  const [childSetAdminOrg, setChildSetAdminOrg] = useState<Org | null>(null);
  const [childNewAdminPhone, setChildNewAdminPhone] = useState("");
  const [childDeleteOrg, setChildDeleteOrg] = useState<Org | null>(null);
  const [childCannotDeleteOrg, setChildCannotDeleteOrg] = useState<Org | null>(null);
  const [childDisableOrg, setChildDisableOrg] = useState<Org | null>(null);
  const [childSaving, setChildSaving] = useState(false);

  const selectedOrg = orgs.find(o => o.id === orgId);
  const budget = selectedOrg?.monthly_budget ?? 0;
  const consumed = selectedOrg?.current_month_budget ?? 0;

  // Children in the recursive tree
  const childOrgsList = orgs.filter(o => o.parent_id === orgId);
  const childCount = childOrgsList.length;
  const hasChildren = childCount > 0;

  // 预算分配计算
  const membersWithLimit = members.filter(m => m.daily_limit && m.daily_limit > 0);
  const membersUnlimited = members.filter(m => !m.daily_limit || m.daily_limit === 0);
  const subOrgsWithBudget = childOrgsList.filter(o => o.monthly_budget && o.monthly_budget > 0);
  const subOrgsUnlimited = childOrgsList.filter(o => !o.monthly_budget || o.monthly_budget === 0);
  // mock: 业务Key数据 (假设有业务Key数据)
  const apiKeyTotal = 1; // mock: 业务Key总数
  const apiKeyWithBudget = 1; // mock: 有预算限制的业务Key数
  const apiKeyUnlimited = 0; // mock: 无限预算的业务Key数

  const memberBudgetAlloc = membersWithLimit.reduce((s, m) => s + (m.daily_limit || 0) * 30, 0);
  const subOrgBudgetAlloc = subOrgsWithBudget.reduce((s, o) => s + (o.monthly_budget || 0), 0);
  const apiKeyBudgetAlloc = 1000; // mock: 业务Key预算
  const totalAllocated = memberBudgetAlloc + subOrgBudgetAlloc + apiKeyBudgetAlloc;
  const remainingBudget = Math.max(0, budget - totalAllocated);

  // 消耗分布计算（mock数据用于展示）
  const memberConsumedAmt = Math.floor(consumed * 0.6); // mock: 成员消耗占60%
  const subOrgConsumedAmt = Math.floor(consumed * 0.3); // mock: 子部门消耗占30%
  const apiKeyConsumedAmt = consumed - memberConsumedAmt - subOrgConsumedAmt; // mock: Key消耗占剩余

  // 可用余额和使用率
  const availableBalance = Math.max(0, budget - consumed);
  const usageRate = budget > 0 ? Math.min(100, Math.round((consumed / budget) * 100)) : 0;
  const usageWarning = usageRate >= 90;

  useEffect(() => { fetchMembers(); }, [orgId]);

  async function fetchMembers() {
    setLoading(true);
    const [{ data: membersData }, { data: invData }] = await Promise.all([
      supabase.from("members").select("*").eq("organization_id", orgId),
      supabase.from("invitations").select("*").eq("organization_id", orgId).eq("status", "pending").gt("expires_at", new Date().toISOString()).not("invitee_phone", "is", null),
    ]);
    const mList = (membersData as Member[]) ?? [];
    const iList = (invData as PendingInvite[]) ?? [];
    setMembers(mList);
    setPendingInvites(iList);
    const phones = [...mList.map(m => m.user_phone), ...iList.filter(i => i.invitee_phone).map(i => i.invitee_phone!)];
    if (phones.length > 0) {
      const { data: usersData } = await supabase.from("users").select("phone, name").in("phone", phones);
      if (usersData) {
        const map: Record<string, string | null> = {};
        usersData.forEach((u: { phone: string; name?: string | null }) => { map[u.phone] = u.name ?? null; });
        setMemberNames(map);
      }
    }
    setLoading(false);
  }

  async function revokeInvite(inviteId: string) {
    await supabase.from("invitations").delete().eq("id", inviteId);
    fetchMembers();
    toast({ title: "已取消添加" });
  }

  function openEdit(m: Member) { setEditMember(m); setEditRole(m.role); setEditRemark(memberNames[m.user_phone] ?? ""); }

  async function saveMember() {
    if (!editMember) return;
    if (editRole !== "org_admin" && editMember.role === "org_admin") {
      if (members.filter(m => m.role === "org_admin").length <= 1) {
        toast({ title: "至少保留 1 名部门管理员", variant: "destructive" }); return;
      }
    }
    setSaving(true);
    // Update member role
    await supabase.from("members").update({ role: editRole }).eq("id", editMember.id);
    // Update user remark name
    if (editRemark.trim()) {
      await supabase.from("users").upsert({ phone: editMember.user_phone, name: editRemark.trim() }, { onConflict: "phone" });
    }
    setSaving(false); setEditMember(null); fetchMembers();
    toast({ title: "已保存" });
  }

  const [disableMemberConfirm, setDisableMemberConfirm] = useState<Member | null>(null);

  async function toggleMemberStatus(m: Member, skipConfirm = false) {
    const newStatus = m.status === "active" ? "disabled" : "active";

    // Show confirm dialog when disabling (not enabling)
    if (newStatus === "disabled" && !skipConfirm) {
      setDisableMemberConfirm(m);
      return;
    }

    await supabase.from("members").update({ status: newStatus }).eq("id", m.id);
    fetchMembers();
  }

  async function confirmDisableMember() {
    if (!disableMemberConfirm) return;
    setDisableMemberConfirm(null);
    await toggleMemberStatus(disableMemberConfirm, true);
  }

  // Delete member confirmation state
  const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<Member | null>(null);
  const [deleteMemberApiKeyCount, setDeleteMemberApiKeyCount] = useState(0);

  async function fetchMemberApiKeyCount(memberPhone: string) {
    // 参数校验：手机号为空时直接返回0
    if (!memberPhone || memberPhone.trim() === "") {
      setDeleteMemberApiKeyCount(0);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("owner_phone", memberPhone) as any;
      const result: { count: number | null; error: Error | null } = await query;

      if (result.error) {
        console.error("获取成员 API Key 数量失败:", result.error);
        setDeleteMemberApiKeyCount(0);
        return;
      }

      setDeleteMemberApiKeyCount(result.count ?? 0);
    } catch (err) {
      console.error("获取 API Key 计数异常:", err);
      setDeleteMemberApiKeyCount(0);
    }
  }

  async function openDeleteMemberConfirm(m: Member) {
    // Check if member is the only org_admin in the department
    if (m.role === "org_admin") {
      const adminCount = members.filter(member => member.role === "org_admin").length;
      if (adminCount <= 1) {
        toast({
          title: "无法删除",
          description: "该成员为当前部门唯一管理员，请先转移管理员权限后再删除",
          variant: "destructive",
        });
        return;
      }
    }
    setDeleteMemberConfirm(m);
    fetchMemberApiKeyCount(m.user_phone);
  }

  async function confirmRemoveMember() {
    if (!deleteMemberConfirm) return;
    await supabase.from("members").delete().eq("id", deleteMemberConfirm.id);
    setDeleteMemberConfirm(null);
    fetchMembers();
    toast({ title: "成员已移除" });
  }

  // Child orgs management functions
  const childOrgs = orgs.filter(o => o.parent_id === orgId);

  const handleChildOrgToggleStatus = async (org: Org, skipConfirm = false) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    if (newStatus === "disabled" && !skipConfirm) {
      setChildDisableOrg(org);
      return;
    }
    const { error } = await supabase.from("organizations").update({ status: newStatus } as any).eq("id", org.id);
    if (error) { toast({ title: "操作失败", variant: "destructive" }); return; }
    toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
    onOrgUpdated();
  };

  const confirmChildDisable = async () => {
    if (!childDisableOrg) return;
    setChildDisableOrg(null);
    await handleChildOrgToggleStatus(childDisableOrg, true);
  };

  const handleChildOrgDelete = async () => {
    if (!childDeleteOrg) return;
    if (childDeleteOrg.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      setChildDeleteOrg(null); return;
    }
    const recovered = childDeleteOrg.monthly_budget ?? 0;
    await supabase.from("organizations").delete().eq("id", childDeleteOrg.id);
    toast({ title: "已删除部门", description: recovered > 0 ? `¥${recovered.toLocaleString()} 预算已回收` : undefined });
    setChildDeleteOrg(null);
    onOrgUpdated();
  };

  const checkChildOrgDelete = (org: Org) => {
    if (org.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      return;
    }
    const hasResources = org.memberCount && org.memberCount > 0;
    if (org.name.includes("B") || hasResources) {
      setChildCannotDeleteOrg(org);
    } else {
      setChildDeleteOrg(org);
    }
  };

  const handleChildOrgEditName = async () => {
    if (!childEditOrg || !childEditName.trim()) return;
    setChildSaving(true);
    await supabase.from("organizations").update({ name: childEditName.trim() } as any).eq("id", childEditOrg.id);
    toast({ title: "名称已更新" });
    setChildSaving(false); setChildEditOrg(null);
    onOrgUpdated();
  };

  const handleChildOrgSetAdmin = async () => {
    if (!childSetAdminOrg) return;
    setChildSaving(true);
    try {
      const phone = childNewAdminPhone === "__none__" ? null : childNewAdminPhone;
      await supabase.from("organizations").update({ admin_phone: phone } as any).eq("id", childSetAdminOrg.id);
      toast({ title: "部门管理员已更新" });
      setChildSetAdminOrg(null); setChildNewAdminPhone("");
      onOrgUpdated();
    } catch { toast({ title: "操作失败", variant: "destructive" }); }
    finally { setChildSaving(false); }
  };

  const bulkParsed = useMemo(() => parseBulkText(bulkText), [bulkText]);

  function resetAddDialog() {
    setAddPhone(""); setAddName(""); setAddRole("member"); setAddLimit("2000");
    setBulkText(""); setBulkRole("member"); setBulkLimit("2000"); setAddMode("single");
  }

  function resetBudgetConfigDialog() {
    setMemberBudgetInput("");
  }

  async function processSingleMember(memberPhone: string, memberName: string, memberRole: string, memberLimit: string) {
    const { data: existing } = await supabase.from("members").select("id, organization_id").eq("enterprise_id", enterprise.id).eq("user_phone", memberPhone).maybeSingle();
    if (existing) {
      if (existing.organization_id === orgId) return { skipped: true };
      await supabase.from("members").insert({ enterprise_id: enterprise.id, organization_id: orgId, user_phone: memberPhone, role: memberRole, daily_limit: Number(memberLimit), status: "active" });
    } else {
      await supabase.from("invitations").insert({ enterprise_id: enterprise.id, organization_id: orgId, inviter_phone: phone ?? "", invitee_phone: memberPhone, invited_role: memberRole });
    }
    if (memberName.trim()) await supabase.from("users").upsert({ phone: memberPhone, name: memberName.trim() }, { onConflict: "phone" });
    return { skipped: false };
  }

  async function addMember() {
    if (!addPhone.trim()) { toast({ title: "请输入手机号", variant: "destructive" }); return; }
    if (!addName.trim()) { toast({ title: "请输入成员姓名", variant: "destructive" }); return; }
    setSaving(true);
    const result = await processSingleMember(addPhone.trim(), addName.trim(), addRole, addLimit);
    if (result.skipped) { toast({ title: "该成员已在本部门中", variant: "destructive" }); setSaving(false); return; }
    toast({ title: "添加成功" });
    setSaving(false); setShowAdd(false); resetAddDialog(); fetchMembers();
  }

  async function addBulkMembers() {
    if (bulkParsed.length === 0) { toast({ title: "请输入成员信息", variant: "destructive" }); return; }
    if (bulkParsed.some(m => !m.valid)) { toast({ title: "批量导入中有格式错误，请修正后再提交", variant: "destructive" }); return; }
    setSaving(true);
    let added = 0;
    for (const m of bulkParsed) { if (m.valid) { const r = await processSingleMember(m.phone, m.name, bulkRole, bulkLimit); if (!r.skipped) added++; } }
    toast({ title: `批量添加完成`, description: `共处理 ${added} 位成员` });
    setSaving(false); setShowAdd(false); resetAddDialog(); fetchMembers();
  }

  const roleLabel = (r: string) => r === "org_admin" ? "部门管理员" : "普通成员";
  const statusBadge = (s: string) =>
    s === "active"
      ? <Badge variant="outline" style={{color:"hsl(142,70%,40%)",borderColor:"hsl(142,70%,75%)",background:"hsl(142,70%,97%)"}}>正常</Badge>
      : <Badge variant="outline" className="text-muted-foreground border-border">禁用</Badge>;
  const pendingBadge = <Badge variant="outline" className="w-fit" style={{color:"hsl(32,95%,44%)",borderColor:"hsl(32,95%,72%)",background:"hsl(32,95%,97%)"}}>待激活</Badge>;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Disabled Banner */}
      {selectedOrg?.status === "disabled" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <span className="text-sm font-medium text-destructive">
            当前部门已被禁用，无法进行调用或创建新资源
          </span>
        </div>
      )}

      {/* Header — page-level actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{selectedOrg?.name ?? "部门管理"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">管理部门成员与预算</p>
        </div>
      </div>

      {/* 3 overview cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* A. 预算规划 */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Wallet className="w-4 h-4 text-primary" /></div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">预算规划</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">本月预算上限</p>
            <p className="text-3xl font-bold text-foreground mt-0.5 tabular-nums">
              {budget > 0 ? `¥${budget.toLocaleString()}` : <span className="text-xl text-muted-foreground">未设置</span>}
            </p>
          </div>
          <div className="border-t pt-3 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">本月已分配</span>
              <span className="font-medium tabular-nums">¥{totalAllocated.toLocaleString()}</span>
            </div>
          </div>
          {/* 预算分布 - 始终显示三项 */}
          <div className="border-t pt-3">
            <div className="flex justify-between">
              {/* 直属成员 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">直属成员</span>
                <span className="text-sm font-medium tabular-nums">
                  {membersWithLimit.length > 0 ? `¥${memberBudgetAlloc.toLocaleString()}` : "无限预算"}
                </span>
              </div>
              {/* 子部门 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">子部门</span>
                <span className="text-sm font-medium tabular-nums">
                  {subOrgsWithBudget.length > 0 ? `¥${subOrgBudgetAlloc.toLocaleString()}` : "无限预算"}
                </span>
              </div>
              {/* 业务Key */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">业务Key</span>
                <span className="text-sm font-medium tabular-nums">
                  {apiKeyWithBudget > 0 ? `¥${apiKeyBudgetAlloc.toLocaleString()}` : "无限预算"}
                </span>
              </div>
            </div>
            {/* 无限预算统计提示 - 只显示子部门和业务Key */}
            {(subOrgsUnlimited.length > 0 || apiKeyUnlimited > 0) && (
              <p className="text-xs text-muted-foreground mt-2">
                目前有
                {subOrgsUnlimited.length > 0 ? `${subOrgsUnlimited.length}个子部门` : ""}
                {subOrgsUnlimited.length > 0 && apiKeyUnlimited > 0 ? "、" : ""}
                {apiKeyUnlimited > 0 ? `${apiKeyUnlimited}个业务Key` : ""}
                设置为无限预算
              </p>
            )}
          </div>
        </div>

        {/* B. 实时消耗 */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-destructive" /></div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">实时消耗</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">本月累计消耗</p>
            <p className="text-3xl font-bold text-foreground mt-0.5 tabular-nums">¥{consumed.toLocaleString()}</p>
          </div>
          <div className="border-t pt-3 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">部门可用余额</span>
              <span className="font-medium tabular-nums">¥{availableBalance.toLocaleString()}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预算使用率</span>
                <span className={`font-medium tabular-nums ${usageWarning ? "text-destructive" : ""}`}>{usageRate}%</span>
              </div>
              {budget > 0 && <Progress value={usageRate} className={`h-1.5 ${usageWarning ? "[&>div]:bg-destructive" : ""}`} />}
            </div>
          </div>
          {/* 消耗分布 - 始终显示三项 */}
          <div className="border-t pt-3">
            <div className="flex justify-between">
              {/* 直属成员消耗 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">直属成员</span>
                <span className="text-sm font-medium tabular-nums">¥{memberConsumedAmt.toLocaleString()}</span>
              </div>
              {/* 子部门消耗 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">子部门</span>
                <span className="text-sm font-medium tabular-nums">¥{subOrgConsumedAmt.toLocaleString()}</span>
              </div>
              {/* 业务Key消耗 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">业务Key</span>
                <span className="text-sm font-medium tabular-nums">¥{apiKeyConsumedAmt.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* C. 组织资产 */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center"><BarChart3 className="w-4 h-4 text-secondary-foreground" /></div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">组织资产</p>
          </div>
          <div className="space-y-1">
            {[
              { icon: <Building2 className="w-4 h-4 text-muted-foreground" />, label: "下级部门", value: `${childCount} 个` },
              { icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "直属成员", value: `${members.length} 人` },
              { icon: <Key className="w-4 h-4 text-muted-foreground" />, label: "API Key", value: "42 个" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                {icon}
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Card - Members & Sub-orgs */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between pb-0">
            {/* Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("members")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "members"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                直属成员
              </button>
              <button
                onClick={() => setActiveTab("suborgs")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "suborgs"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                子部门
                {childCount > 0 && (
                  <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{childCount}</span>
                )}
              </button>
            </div>
            {/* Actions based on active tab */}
            <div className="flex items-center gap-2 pb-3">
              {activeTab === "members" ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => { resetBudgetConfigDialog(); setShowSubOrgBudgetDialog(true); }} className="gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />一键配置预算
                  </Button>
                  <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />添加成员
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setShowCreateSubOrg(true)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />创建子部门
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {activeTab === "members" ? (
            /* Members Table */
            <>
              {members.filter(m => !m.daily_limit || m.daily_limit === 0).length > 0 && (
                <div className="px-4 pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-sm font-medium text-orange-800 dark:text-orange-300">检测到 {members.filter(m => !m.daily_limit || m.daily_limit === 0).length} 个成员未配置预算</span>
                    </div>
                    <button className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400 underline underline-offset-2" onClick={() => { setMemberDailyLimit(""); setShowBudgetDialog(true); }}>点击一键配置</button>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>成员</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>今日消耗</TableHead>
                    <TableHead>本月消耗</TableHead>
                    <TableHead>单日上限</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 && pendingInvites.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">暂无成员，点击"添加成员"开始</TableCell></TableRow>
                  ) : members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-foreground">{memberNames[m.user_phone] ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">{maskPhone(m.user_phone)}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={m.role === "org_admin" ? "default" : "secondary"}>{roleLabel(m.role)}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>
                        <InlineBudgetEdit
                          value={m.daily_limit ?? 2000} label="单日上限" unit="元/天"
                          onSave={async (val) => {
                            await supabase.from("members").update({ daily_limit: val }).eq("id", m.id);
                            setMembers(prev => prev.map(x => x.id === m.id ? { ...x, daily_limit: val } : x));
                            toast({ title: "单日上限已更新", description: `¥${val}/天` });
                          }}
                        />
                      </TableCell>
                      <TableCell>{statusBadge(m.status ?? "active")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>编辑成员</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleMemberStatus(m)}>{m.status === "active" ? "禁用成员" : "启用成员"}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteMemberConfirm(m)}>移除成员</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingInvites.map((inv) => (
                    <TableRow key={inv.id} className="opacity-80">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-foreground">{inv.invitee_phone ? (memberNames[inv.invitee_phone] ?? "—") : "—"}</span>
                          <span className="text-xs text-muted-foreground">{inv.invitee_phone ? maskPhone(inv.invitee_phone) : "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={inv.invited_role === "org_admin" ? "default" : "secondary"}>{roleLabel(inv.invited_role)}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>{pendingBadge}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => revokeInvite(inv.id)}>取消添加</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            /* Sub-orgs Table */
            <div className="overflow-x-auto">
              {childOrgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Building2 className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">暂无子部门</p>
                  <Button variant="outline" className="mt-4 gap-2" size="sm" onClick={() => setShowCreateSubOrg(true)}>
                    <Plus className="w-4 h-4" />创建第一个子部门
                  </Button>
                </div>
              ) : (
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
                    {childOrgs.map((org, i) => (
                      <tr key={org.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="px-6 py-4 font-medium text-foreground">{org.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {org.admin_phone
                            ? (memberNames[org.admin_phone] || `${org.admin_phone.slice(0,3)}****${org.admin_phone.slice(-4)}`)
                            : <span className="text-muted-foreground/50 text-xs">未设置</span>}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{org.memberCount ?? 0}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">{org.monthly_budget != null ? `¥${org.monthly_budget}` : "不限"}</span>
                            <button onClick={() => setChildBudgetOrg(org)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-foreground">{org.current_month_budget != null ? `¥${org.current_month_budget.toFixed(2)}` : "¥0.00"}</span>
                        </td>
                        <td className="px-6 py-4">
                          {org.monthly_budget != null && org.monthly_budget > 0 ? (
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(100, ((org.current_month_budget ?? 0) / org.monthly_budget) * 100).toFixed(1)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {Math.min(100, Math.round(((org.current_month_budget ?? 0) / org.monthly_budget) * 100))}%
                              </span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">0%</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={org.status === "active" ? "default" : "secondary"}
                            className={org.status === "active" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15" : "bg-muted text-muted-foreground"}>
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
                              <DropdownMenuItem onClick={() => { setChildEditOrg(org); setChildEditName(org.name); }} className="gap-2">
                                <Pencil className="w-3.5 h-3.5" /> 编辑部门名称
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setChildSetAdminOrg(org); setChildNewAdminPhone(org.admin_phone || "__none__"); }} className="gap-2">
                                <UserCog className="w-3.5 h-3.5" /> 设置管理员
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleChildOrgToggleStatus(org)} className="gap-2">
                                <Power className="w-3.5 h-3.5" />{org.status === "active" ? "禁用部门" : "启用部门"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => checkChildOrgDelete(org)} className="gap-2 text-destructive focus:text-destructive" disabled={org.name === "默认组织"}>
                                <Trash2 className="w-3.5 h-3.5" /> 删除部门
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Member Confirm Dialog */}
      <AlertDialog open={!!deleteMemberConfirm} onOpenChange={(o) => { if (!o) { setDeleteMemberConfirm(null); setDeleteMemberApiKeyCount(0); } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              确认删除该成员？
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              删除后，该成员将无法访问平台，其创建的 API Key 将被自动禁用，且无法恢复。剩余预算将自动回收至部门，调用记录仍保留用于统计。
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">• 成员：</span>
                <span className="font-medium text-foreground">
                  {deleteMemberConfirm ? (memberNames[deleteMemberConfirm.user_phone] ?? "—") : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">• 当前所属部门：</span>
                <span className="font-medium text-foreground">{selectedOrg?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">• 名下 API Key：</span>
                <span className="font-medium text-foreground">{deleteMemberApiKeyCount} 个</span>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel onClick={() => { setDeleteMemberConfirm(null); setDeleteMemberApiKeyCount(0); }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Member Confirm Dialog */}
      <AlertDialog open={!!disableMemberConfirm} onOpenChange={(o) => { if (!o) setDisableMemberConfirm(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>确认禁用成员「{disableMemberConfirm ? (memberNames[disableMemberConfirm.user_phone] ?? disableMemberConfirm.user_phone) : ""}」？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              禁用后，该成员将无法继续调用 API 和使用资源，正在调用的key将立即失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
            是否继续？
          </div>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisableMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => { if (!open) setEditMember(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">成员手机号</Label>
              <p className="mt-1 text-sm font-medium text-foreground">{editMember?.user_phone}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remark-name">备注名</Label>
              <Input
                id="remark-name"
                placeholder="请输入备注名"
                value={editRemark}
                onChange={(e) => setEditRemark(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <RadioGroup value={editRole} onValueChange={setEditRole} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="org_admin" id="r-admin" />
                  <Label htmlFor="r-admin" className="font-normal cursor-pointer">部门管理员</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="member" id="r-member" />
                  <Label htmlFor="r-member" className="font-normal cursor-pointer">普通成员</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditMember(null)}>取消</Button>
            <Button onClick={saveMember} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetAddDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>添加成员</DialogTitle>
              <div className="flex rounded-md border border-input overflow-hidden text-xs mr-6">
                <button type="button" onClick={() => setAddMode("single")} className={`px-3 py-1 transition-colors ${addMode === "single" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>单个添加</button>
                <button type="button" onClick={() => setAddMode("bulk")} className={`px-3 py-1 transition-colors border-l border-input ${addMode === "bulk" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>批量导入</button>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addMode === "single" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="手机号" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
                  <Input placeholder="姓名（必填）" value={addName} onChange={(e) => setAddName(e.target.value)} />
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="member">普通成员</SelectItem><SelectItem value="org_admin">部门管理员</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-limit">单日上限（元）</Label>
                  <Input id="add-limit" type="number" value={addLimit} onChange={(e) => setAddLimit(e.target.value)} placeholder="2000" />
                </div>
              </>
            ) : (
              <>
                <Textarea placeholder={"每行一人，格式：姓名 手机号\n例如：\n张三 13800000001\n李四,13900000002"} value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="min-h-[100px] font-mono text-sm" />
                <p className="text-xs text-muted-foreground">支持空格或逗号分隔姓名和手机号，每行一人</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-muted-foreground shrink-0">统一角色</span>
                    <Select value={bulkRole} onValueChange={setBulkRole}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="member">普通成员</SelectItem><SelectItem value="org_admin">部门管理员</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-muted-foreground shrink-0">单日上限</span>
                    <Input type="number" className="h-8 text-xs" value={bulkLimit} onChange={(e) => setBulkLimit(e.target.value)} placeholder="2000" />
                  </div>
                </div>
                {bulkParsed.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1 max-h-36 overflow-y-auto">
                    {bulkParsed.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium truncate">{m.name}</span>
                        <span className="text-muted-foreground shrink-0">{m.phone || "—"}</span>
                        <span className={m.valid ? "text-green-600 shrink-0" : "text-destructive shrink-0"}>{m.valid ? "✓ 正确" : `✗ ${m.reason}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetAddDialog(); }}>取消</Button>
            <Button onClick={addMode === "single" ? addMember : addBulkMembers} disabled={saving}>{saving ? "添加中…" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sub-dept Dialog */}
      <Dialog open={showCreateSubOrg} onOpenChange={(open) => { setShowCreateSubOrg(open); if (!open) { setSubOrgName(""); setSubOrgBudget(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建子部门</DialogTitle>
            <DialogDescription>在当前部门下创建下属子部门，子部门共享月度预算限制。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">子部门名称 <span className="text-destructive">*</span></Label>
              <Input id="sub-name" placeholder="如：华东销售组" value={subOrgName} onChange={(e) => setSubOrgName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-budget">本月预算上限（元）</Label>
              <Input id="sub-budget" type="number" placeholder="留空表示不限制" value={subOrgBudget} onChange={(e) => setSubOrgBudget(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateSubOrg(false)}>取消</Button>
            <Button onClick={async () => {
              if (!subOrgName.trim()) { toast({ title: "请输入子部门名称", variant: "destructive" }); return; }
              const { error } = await supabase.from("organizations").insert({
                enterprise_id: enterprise.id,
                name: subOrgName.trim(),
                monthly_budget: subOrgBudget ? Number(subOrgBudget) : null,
                parent_id: orgId,
                status: "active",
              } as any);
              if (error) { toast({ title: "创建失败", variant: "destructive" }); return; }
              toast({ title: "子部门创建成功", description: subOrgName.trim() });
              setShowCreateSubOrg(false); setSubOrgName(""); setSubOrgBudget("");
              setStatsFlashKey(k => k + 1);
              onOrgUpdated();
            }}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成员批量分配 Dialog */}
      {(() => {
        const dailyLimitNum = Number(memberDailyLimit);
        const perMonthBudget = dailyLimitNum > 0 ? dailyLimitNum * 30 : 0;
        const totalMonthCost = perMonthBudget * members.length;
        return (
          <Dialog open={showBudgetDialog} onOpenChange={(open) => { setShowBudgetDialog(open); if (!open) setMemberDailyLimit(""); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>成员批量分配</DialogTitle>
                <DialogDescription>为本部门所有直属成员统一设置单日消耗上限。</DialogDescription>
              </DialogHeader>
              {budget > 0 && (
                <div className={`rounded-lg p-3 flex justify-between text-sm ${remainingBudget < 0 ? "bg-destructive/10 border border-destructive/30" : "bg-muted/60"}`}>
                  <span className="text-muted-foreground">部门剩余可分配额</span>
                  <span className={`font-semibold tabular-nums ${remainingBudget < 0 ? "text-destructive" : "text-foreground"}`}>¥{remainingBudget.toLocaleString()}</span>
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>统一单日上限（元/天）</Label>
                  <Input type="number" placeholder="如：2000" value={memberDailyLimit} onChange={(e) => setMemberDailyLimit(e.target.value)} />
                </div>
                {dailyLimitNum > 0 && members.length > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    共 <span className="font-semibold">{members.length}</span> 人，月总消耗上限约 <span className="font-bold text-primary">¥{totalMonthCost.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>取消</Button>
                <Button disabled={distributing || dailyLimitNum <= 0 || members.length === 0}
                  onClick={async () => {
                    setDistributing(true);
                    await Promise.all(members.map(m => supabase.from("members").update({ daily_limit: dailyLimitNum }).eq("id", m.id)));
                    setMembers(prev => prev.map(m => ({ ...m, daily_limit: dailyLimitNum })));
                    toast({ title: `已为 ${members.length} 位成员设置单日上限 ¥${dailyLimitNum}` });
                    setDistributing(false); setShowBudgetDialog(false); setMemberDailyLimit("");
                  }}
                >{distributing ? "分配中…" : "确认分配"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* 一键配置预算 Dialog */}
      {(() => {
        const memberCount = members.length;

        const handleNumberInput = (value: string, setter: (v: string) => void) => {
          // 只允许非负数字
          if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setter(value);
          }
        };

        const handleSaveBudget = async () => {
          const dailyLimit = Math.max(0, Number(memberBudgetInput) || 0);
          if (dailyLimit <= 0 || memberCount === 0) return;

          setSubOrgDistributing(true);
          try {
            // 为所有成员设置每日预算上限
            const validMembers = members.filter(m => m.id);
            if (validMembers.length > 0) {
              await Promise.all(
                validMembers.map(m =>
                  supabase.from("members").update({ daily_limit: dailyLimit }).eq("id", m.id)
                )
              );
              // 更新本地状态
              setMembers(prev => prev.map(m => ({ ...m, daily_limit: dailyLimit })));
            }

            toast({ title: "预算配置已保存", description: `已为 ${memberCount} 位成员设置单日上限 ¥${dailyLimit}` });
            setShowSubOrgBudgetDialog(false);
            resetBudgetConfigDialog();
            onOrgUpdated();
          } catch (error) {
            console.error("预算配置保存失败:", error);
            toast({
              title: "保存失败",
              description: "预算配置保存过程中出现错误，请稍后重试",
              variant: "destructive"
            });
          } finally {
            setSubOrgDistributing(false);
          }
        };

        return (
          <Dialog open={showSubOrgBudgetDialog} onOpenChange={(open) => { if (!open) { setShowSubOrgBudgetDialog(false); resetBudgetConfigDialog(); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>一键配置预算</DialogTitle>
                <DialogDescription>为当前部门所有直属成员统一设置每日预算上限。</DialogDescription>
              </DialogHeader>

              {/* 直属成员每日预算上限输入 */}
              <div className="space-y-3 py-2">
                <Label className="text-sm font-medium">直属成员每日预算上限</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="输入每人每日预算上限（元）"
                  value={memberBudgetInput}
                  onChange={(e) => handleNumberInput(e.target.value, setMemberBudgetInput)}
                  className="h-10"
                />
                {memberCount === 0 ? (
                  <div className="text-xs text-muted-foreground">当前部门暂无成员</div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    当前共 {memberCount} 位成员，设置后将统一应用此每日预算上限
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowSubOrgBudgetDialog(false); resetBudgetConfigDialog(); }} className="h-10 px-6">
                  取消
                </Button>
                <Button
                  disabled={subOrgDistributing || memberCount === 0 || !memberBudgetInput || Number(memberBudgetInput) <= 0}
                  onClick={handleSaveBudget}
                  className="h-10 px-6"
                >
                  {subOrgDistributing ? "保存中…" : "确认配置"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Child Org Management Dialogs ── */}
      {/* Child Org Budget Sheet */}
      <OrgBudgetSheet open={!!childBudgetOrg} onOpenChange={(o) => { if (!o) setChildBudgetOrg(null); }} org={childBudgetOrg} onSaved={onOrgUpdated} />

      {/* Child Org Edit Name Dialog */}
      <Dialog open={!!childEditOrg} onOpenChange={(o) => { if (!o) setChildEditOrg(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>编辑部门名称</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>部门名称</Label>
              <Input value={childEditName} onChange={e => setChildEditName(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setChildEditOrg(null)}>取消</Button>
              <Button className="flex-1" onClick={handleChildOrgEditName} disabled={childSaving}>{childSaving ? "保存中..." : "保存"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Child Org Set Admin Dialog */}
      <Dialog open={!!childSetAdminOrg} onOpenChange={(o) => { if (!o) setChildSetAdminOrg(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>设置部门管理员</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>选择管理员</Label>
              <Select value={childNewAdminPhone} onValueChange={setChildNewAdminPhone}>
                <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不指定（默认企业管理员）</SelectItem>
                  {members.filter(m => m.user_phone).map(m => (
                    <SelectItem key={m.user_phone} value={m.user_phone}>
                      {memberNames[m.user_phone] ? `${memberNames[m.user_phone]} - ${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}` : `${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">不指定时，该部门默认由企业管理员管理</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setChildSetAdminOrg(null)}>取消</Button>
              <Button className="flex-1" onClick={handleChildOrgSetAdmin} disabled={childSaving || !childNewAdminPhone}>{childSaving ? "保存中..." : "确认"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Child Org Delete Dialog */}
      <AlertDialog open={!!childDeleteOrg} onOpenChange={(o) => { if (!o) setChildDeleteOrg(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除部门「{childDeleteOrg?.name}」？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              该部门当前无成员和资源，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleChildOrgDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Child Org Cannot Delete Dialog */}
      <AlertDialog open={!!childCannotDeleteOrg} onOpenChange={(o) => { if (!o) setChildCannotDeleteOrg(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>该部门暂无法删除</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              部门「{childCannotDeleteOrg?.name}」仍存在成员、API Key 或子部门，请先清理后再删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setChildCannotDeleteOrg(null)}>知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Child Org Disable Confirm Dialog */}
      <AlertDialog open={!!childDisableOrg} onOpenChange={(o) => { if (!o) setChildDisableOrg(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              确认禁用部门「{childDisableOrg?.name}」？
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">禁用后将产生以下影响：</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>所有 API Key 将立即停止调用</span></li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>该部门成员无法创建新 Key 或使用资源</span></li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>当前进行中的请求可能会失败</span></li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>历史数据仍可查看，后续可重新启用</span></li>
            </ul>
          </div>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
            是否继续？
          </div>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChildDisable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeptManagement — Main page with left org tree + right dynamic content
// ─────────────────────────────────────────────────────────────────────────────
export default function DeptManagement({ enterprise, role }: Props) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<"root" | string>("root");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const phone = getCurrentPhone();
  const [currentUserOrgId, setCurrentUserOrgId] = useState<string | null>(null);
  const { toast } = useToast();
  const isAdmin = role === "admin";

  // Organization management states (shared between tree and RootView)
  const [members, setMembers] = useState<{ user_phone: string; role: string }[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [budgetOrg, setBudgetOrg] = useState<Org | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<Org | null>(null);
  const [cannotDeleteOrg, setCannotDeleteOrg] = useState<Org | null>(null);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editName, setEditName] = useState("");
  const [setAdminOrg, setSetAdminOrg] = useState<Org | null>(null);
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [disableConfirmOrg, setDisableConfirmOrg] = useState<Org | null>(null);

  // Load members for admin operations
  const loadMembers = async () => {
    const [membersRes, usersRes] = await Promise.all([
      supabase.from("members").select("user_phone, role, organization_id").eq("enterprise_id", enterprise.id),
      supabase.from("users").select("phone, name"),
    ]);
    const allMembers = membersRes.data || [];
    setMembers(allMembers);
    const map: Record<string, string> = {};
    for (const u of (usersRes.data || [])) { if (u.phone) map[u.phone] = u.name || ""; }
    setUserMap(map);
  };

  // Organization management handlers
  const toggleOrgStatus = async (org: Org, skipConfirm = false) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    if (newStatus === "disabled" && !skipConfirm) {
      setDisableConfirmOrg(org);
      return;
    }
    const { error } = await supabase.from("organizations").update({ status: newStatus } as any).eq("id", org.id);
    if (error) { toast({ title: "操作失败", variant: "destructive" }); return; }
    if (newStatus === "active") {
      toast({ title: "已启用", description: "已恢复部门内所有Key 权限，可正常调用" });
    } else {
      toast({ title: "已禁用", description: "部门内所有 API Key 将立即失效，无法调用" });
    }
    loadOrgs();
  };

  const confirmDisableOrg = async () => {
    if (!disableConfirmOrg) return;
    setDisableConfirmOrg(null);
    await toggleOrgStatus(disableConfirmOrg, true);
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrg) return;
    if (deleteOrg.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      setDeleteOrg(null); return;
    }
    const recovered = deleteOrg.monthly_budget ?? 0;
    await supabase.from("organizations").delete().eq("id", deleteOrg.id);
    toast({ title: "已删除部门", description: recovered > 0 ? `¥${recovered.toLocaleString()} 预算已回收至企业` : undefined });
    setDeleteOrg(null);
    loadOrgs();
  };

  const checkAndShowDeleteDialog = (org: Org) => {
    if (org.name === "默认组织") {
      toast({ title: "无法删除默认部门", variant: "destructive" });
      return;
    }
    const hasResources = org.memberCount && org.memberCount > 0;
    if (org.name.includes("B") || hasResources) {
      setCannotDeleteOrg(org);
    } else {
      setDeleteOrg(org);
    }
  };

  const handleEditOrgName = async () => {
    if (!editOrg || !editName.trim()) return;
    setSaving(true);
    await supabase.from("organizations").update({ name: editName.trim() } as any).eq("id", editOrg.id);
    toast({ title: "名称已更新" });
    setSaving(false); setEditOrg(null);
    loadOrgs();
  };

  const handleSetOrgAdmin = async () => {
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
      setSetAdminOrg(null); setNewAdminPhone("");
      loadOrgs();
    } catch { toast({ title: "操作失败", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const loadOrgs = async () => {
    const [orgsRes, membersRes] = await Promise.all([
      supabase.from("organizations").select("*").eq("enterprise_id", enterprise.id).order("created_at"),
      supabase.from("members").select("user_phone, organization_id").eq("enterprise_id", enterprise.id),
    ]);
    const allMembers = (membersRes.data || []) as { user_phone: string; organization_id: string | null }[];
    const rawOrgs = (orgsRes.data || []) as any[];
    const orgsWithCount = rawOrgs.map(org => ({
      ...org,
      memberCount: allMembers.filter(m => m.organization_id === org.id).length,
    }));
    setOrgs(orgsWithCount);
    if (role === "org_admin" && phone) {
      const myMembership = allMembers.find(m => m.user_phone === phone);
      setCurrentUserOrgId(myMembership?.organization_id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { loadOrgs(); }, [enterprise.id]);

  useEffect(() => {
    if (role === "org_admin" && currentUserOrgId) {
      setSelectedNode(currentUserOrgId);
    }
  }, [role, currentUserOrgId]);

  const canAccess = (nodeId: "root" | string): boolean => {
    if (role === "admin") return true;
    if (nodeId === "root") return false;
    if (role === "org_admin") {
      if (nodeId === currentUserOrgId) return true;
      // 递归检查是否是子孙部门
      const isDescendant = (orgs: Org[], targetId: string): boolean => {
        const target = orgs.find(o => o.id === targetId);
        if (!target) return false;
        if (target.parent_id === currentUserOrgId) return true;
        if (!target.parent_id) return false;
        return isDescendant(orgs, target.parent_id);
      };
      return isDescendant(orgs, nodeId);
    }
    return false;
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Build recursive tree
  const rootTree = useMemo(() => buildTree(orgs, null), [orgs]);

  // Flatten tree for search — when searching, show all matching nodes
  const flatAll = useMemo(() => flattenTree(rootTree), [rootTree]);

  // Breadcrumb ancestors for selected node
  const breadcrumb = useMemo(() => {
    if (selectedNode === "root") return [];
    return getAncestors(orgs, selectedNode);
  }, [selectedNode, orgs]);

  // Filter nodes by search
  const searchActive = searchTerm.trim().length > 0;
  const filteredFlat = useMemo(() => {
    if (!searchActive) return null;
    const term = searchTerm.toLowerCase();
    return flatAll.filter(({ node }) => node.name.toLowerCase().includes(term));
  }, [flatAll, searchTerm, searchActive]);

  function renderTreeNode(node: OrgTreeNode, depth: number): React.ReactNode {
    const isSelected = selectedNode === node.id;
    const isLocked = !canAccess(node.id);
    const hasKids = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id}>
        <div
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className={`w-full flex items-center gap-1.5 pr-1 py-1.5 rounded-md text-left text-xs transition-colors ${
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : isLocked
                ? "text-muted-foreground/40"
                : "text-foreground hover:bg-muted/60"
          }`}
        >
          {/* Expand/collapse chevron */}
          {hasKids ? (
            <button
              className="shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            >
              {isExpanded
                ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {/* Folder icon + name (clickable) */}
          <button
            disabled={isLocked}
            onClick={() => { if (!isLocked) setSelectedNode(node.id); }}
            className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
          >
            {isLocked
              ? <Lock className="w-3 h-3 shrink-0 text-muted-foreground/30" />
              : <Folder className={`w-3 h-3 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
            }
            <span className="truncate">{node.name}</span>
          </button>

          {/* More actions dropdown (admin only, not for locked nodes) */}
          {!isLocked && isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setEditOrg(node); setEditName(node.name); }}
                  className="gap-2 text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" /> 编辑部门名称
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); loadMembers(); setSetAdminOrg(node); setNewAdminPhone(node.admin_phone || "__none__"); }}
                  className="gap-2 text-xs"
                >
                  <UserCog className="w-3.5 h-3.5" /> 设置管理员
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); toggleOrgStatus(node); }}
                  className="gap-2 text-xs"
                >
                  <Power className="w-3.5 h-3.5" /> {node.status === "active" ? "禁用部门" : "启用部门"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); checkAndShowDeleteDialog(node); }}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                  disabled={node.name === "默认组织"}
                >
                  <Trash2 className="w-3.5 h-3.5" /> 删除部门
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {hasKids && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full -m-6 overflow-hidden" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* ── Left org tree panel ── */}
      <div className="w-56 shrink-0 border-r border-border bg-background flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索部门..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Label */}
        <div className="px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">组织架构</p>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {/* Root node */}
          {(!searchActive || enterprise.name.toLowerCase().includes(searchTerm.toLowerCase())) && (
            <button
              onClick={() => canAccess("root") && setSelectedNode("root")}
              disabled={!canAccess("root")}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs transition-colors ${
                selectedNode === "root"
                  ? "bg-primary/10 text-primary font-medium"
                  : !canAccess("root")
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-muted/60"
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 shrink-0 ${selectedNode === "root" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="truncate">{enterprise.name}</span>
            </button>
          )}

          {/* Recursive org tree (or flat search results) */}
          {searchActive ? (
            filteredFlat?.map(({ node, depth }) => {
              const isSelected = selectedNode === node.id;
              const isLocked = !canAccess(node.id);
              return (
                <button key={node.id} disabled={isLocked} onClick={() => !isLocked && setSelectedNode(node.id)}
                  style={{ paddingLeft: `${8 + depth * 14}px` }}
                  className={`w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-md text-left text-xs transition-colors ${
                    isSelected ? "bg-primary/10 text-primary font-medium" : isLocked ? "text-muted-foreground/40 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                  }`}>
                  {isLocked ? <Lock className="w-3 h-3 shrink-0 text-muted-foreground/30" /> : <Folder className={`w-3 h-3 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />}
                  <span className="truncate flex-1">{node.name}</span>
                  {!isLocked && <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">{node.memberCount ?? 0}</span>}
                </button>
              );
            })
          ) : (
            rootTree.map(node => renderTreeNode(node, 0))
          )}

          {searchActive && filteredFlat?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">无匹配部门</p>
          )}
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        {selectedNode !== "root" && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
            <button onClick={() => setSelectedNode("root")} className="hover:text-foreground transition-colors">{enterprise.name}</button>
            {breadcrumb.map((anc, i) => (
              <span key={anc.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                {i === breadcrumb.length - 1
                  ? <span className="text-foreground font-medium">{anc.name}</span>
                  : <button onClick={() => setSelectedNode(anc.id)} className="hover:text-foreground transition-colors">{anc.name}</button>
                }
              </span>
            ))}
          </div>
        )}

        {selectedNode === "root" ? (
          <RootView
            enterprise={enterprise}
            role={role}
            orgs={orgs}
            loadOrgs={loadOrgs}
          />
        ) : (
          <OrgView
            enterprise={enterprise}
            role={role}
            orgId={selectedNode}
            orgs={orgs}
            onOrgUpdated={loadOrgs}
          />
        )}
      </div>

      {/* ── Organization Management Dialogs ── */}
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
              <Button className="flex-1" onClick={handleEditOrgName} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
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
                <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不指定（默认企业管理员）</SelectItem>
                  {members.filter(m => m.user_phone).map(m => (
                    <SelectItem key={m.user_phone} value={m.user_phone}>
                      {userMap[m.user_phone] ? `${userMap[m.user_phone]} - ${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}` : `${m.user_phone.slice(0,3)}****${m.user_phone.slice(-4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">不指定时，该部门默认由企业管理员管理</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSetAdminOrg(null)}>取消</Button>
              <Button className="flex-1" onClick={handleSetOrgAdmin} disabled={saving || !newAdminPhone}>{saving ? "保存中..." : "确认"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteOrg} onOpenChange={(o) => { if (!o) setDeleteOrg(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除部门「{deleteOrg?.name}」？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              该部门当前无成员和资源，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cannot Delete Dialog */}
      <AlertDialog open={!!cannotDeleteOrg} onOpenChange={(o) => { if (!o) setCannotDeleteOrg(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>该部门暂无法删除</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              部门「{cannotDeleteOrg?.name}」仍存在成员、API Key 或子部门，请先清理后再删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setCannotDeleteOrg(null)}>知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Confirm Dialog */}
      <AlertDialog open={!!disableConfirmOrg} onOpenChange={(o) => { if (!o) setDisableConfirmOrg(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              确认禁用部门「{disableConfirmOrg?.name}」？
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">禁用后将产生以下影响：</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>所有 API Key 将立即停止调用</span></li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>该部门成员无法创建新 Key 或使用资源</span></li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>当前进行中的请求可能会失败</span></li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-1.5">•</span><span>历史数据仍可查看，后续可重新启用</span></li>
            </ul>
          </div>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
            是否继续？
          </div>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableOrg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认禁用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Budget Sheet for org */}
      <OrgBudgetSheet open={!!budgetOrg} onOpenChange={(o) => { if (!o) setBudgetOrg(null); }} org={budgetOrg} onSaved={loadOrgs} />
    </div>
  );
}
