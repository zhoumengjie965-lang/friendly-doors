import { useState, useEffect, useMemo, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Search, Lock, Building2, Folder, ChevronRight, ChevronDown,
  Users, Key, Plus, MoreHorizontal, Wallet, TrendingUp, BarChart3,
  ArrowRight, Sliders, SlidersHorizontal, Pencil, UserCog, Power,
  Trash2, AlertTriangle, CheckCircle, ArrowLeftRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateOrgDialog from "@/components/CreateOrgDialog";
import OrgBudgetSheet from "@/components/OrgBudgetSheet";
import InlineBudgetEdit from "@/components/InlineBudgetEdit";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface SubOrg {
  id: string; name: string; adminName: string; adminPhone: string;
  memberCount: number; monthlyBudget: number | null; consumed: number; status: "active" | "disabled";
}

const MOCK_SUB_ORGS: SubOrg[] = [
  { id: "s1", name: "华东销售组", adminName: "张伟",   adminPhone: "13800138001", memberCount: 8,  monthlyBudget: 5000, consumed: 1240, status: "active" },
  { id: "s2", name: "技术支持组", adminName: "李晓梅", adminPhone: "13912345678", memberCount: 5,  monthlyBudget: 3000, consumed: 3100, status: "active" },
  { id: "s3", name: "市场推广组", adminName: "王建国", adminPhone: "18611223344", memberCount: 12, monthlyBudget: 8000, consumed:  320, status: "active" },
];

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
// TransferMemberDialog — mini org tree for moving a member to another dept
// ─────────────────────────────────────────────────────────────────────────────
function TransferMemberDialog({
  open, onOpenChange, orgs, currentOrgId, memberName, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgs: Org[];
  currentOrgId: string;
  memberName: string;
  onConfirm: (targetOrgId: string) => void;
}) {
  const [target, setTarget] = useState<string>("");
  const candidates = orgs.filter(o => o.id !== currentOrgId && o.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>转移成员</DialogTitle>
          <DialogDescription>将「{memberName}」转移到目标部门</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-56 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无其他可选部门</p>
          ) : candidates.map(org => (
            <label
              key={org.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                target === org.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={target === org.id}
                onChange={() => setTarget(org.id)}
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                target === org.id ? "border-primary" : "border-muted-foreground/40"
              }`}>
                {target === org.id && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{org.name}</span>
            </label>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); setTarget(""); }}>取消</Button>
          <Button disabled={!target} onClick={() => { onConfirm(target); setTarget(""); }}>确认转移</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

  const load = async () => {
    setLoading(true);
    const [membersRes, usersRes] = await Promise.all([
      supabase.from("members").select("user_phone, role, organization_id").eq("enterprise_id", enterprise.id),
      supabase.from("users").select("phone, name"),
    ]);
    const allMembers = membersRes.data || [];
    setMembers(allMembers);
    const map: Record<string, string> = {};
    for (const u of (usersRes.data || [])) { if (u.phone) map[u.phone] = u.name || ""; }
    setUserMap(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [enterprise.id]);

  const orgCount = orgs.length;
  const memberCount = members.length;

  const toggleStatus = async (org: Org) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    const { error } = await supabase.from("organizations").update({ status: newStatus } as any).eq("id", org.id);
    if (error) { toast({ title: "操作失败", variant: "destructive" }); return; }
    toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
    loadOrgs();
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

  const stats = [
    { label: "部门总数",  value: String(orgCount),   icon: Building2, color: "hsl(224,76%,48%)" },
    { label: "企业成员",  value: String(memberCount), icon: Users,     color: "hsl(142,70%,45%)" },
    { label: "API Key",  value: "—",                 icon: Key,       color: "hsl(262,60%,58%)" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">部门管理</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理企业下的部门单元及预算分配</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowBudgetDialog(true)} className="gap-2">
              <Sliders className="w-4 h-4" />一键配置预算
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />创建部门
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}20` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p key={statsFlashKey} className="text-2xl font-bold text-foreground animate-in zoom-in-95 duration-300">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">部门列表</h2>
        </div>
        {!loading && orgs.some(o => o.monthly_budget == null || o.monthly_budget === 0) && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">存在未分配预算的部门，建议为所有部门配置月度预算上限。</span>
              </div>
              {isAdmin && (
                <button className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400 underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-300 transition-colors" onClick={() => setShowBudgetDialog(true)}>
                  立即均分
                </button>
              )}
            </div>
          </div>
        )}
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
                              <DropdownMenuItem onClick={() => setDeleteOrg(org)} className="gap-2 text-destructive focus:text-destructive" disabled={org.name === "默认组织"}>
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteOrg} onOpenChange={(o) => { if (!o) setDeleteOrg(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除部门</AlertDialogTitle>
            <AlertDialogDescription>将永久删除部门「{deleteOrg?.name}」。该操作不可撤销，部门内成员不会被删除，但将失去部门归属。</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteOrg?.monthly_budget != null && deleteOrg.monthly_budget > 0 && (
            <div className="rounded-lg bg-muted/60 p-3 text-sm flex justify-between items-center mx-1">
              <span className="text-muted-foreground">即将回收至企业的预算金额</span>
              <span className="font-bold text-primary tabular-nums ml-2">¥{deleteOrg.monthly_budget.toLocaleString()}/月</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 一键配置预算 Dialog */}
      {(() => {
        const n = orgs.length;
        const pkg = Number(totalPackage);
        const perBudget = n > 0 && pkg > 0 ? pkg / n : 0;
        return (
          <Dialog open={showBudgetDialog} onOpenChange={(open) => { setShowBudgetDialog(open); if (!open) setTotalPackage(""); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>一键配置预算</DialogTitle>
                <DialogDescription>将输入的总金额均分给所有部门，统一设置月度预算上限。</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="total-pkg">要分配的总预算（元）</Label>
                  <Input id="total-pkg" type="number" placeholder="请输入总金额" value={totalPackage} onChange={(e) => setTotalPackage(e.target.value)} />
                </div>
                {n > 0 && pkg > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                    共 <span className="font-semibold">{n}</span> 个部门，每个部门将分得{" "}
                    <span className="font-bold text-primary tabular-nums">¥{perBudget.toFixed(2)}</span>/月
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setShowBudgetDialog(false); setTotalPackage(""); }}>取消</Button>
                <Button disabled={distributing || n === 0 || pkg <= 0} onClick={async () => {
                  setDistributing(true);
                  try {
                    await Promise.all(orgs.map(org => supabase.from("organizations").update({ monthly_budget: perBudget } as any).eq("id", org.id)));
                    setStatsFlashKey(k => k + 1);
                    toast({ title: `已成功为 ${n} 个部门分配预算`, description: `每个部门 ¥${perBudget.toFixed(2)}/月` });
                    setShowBudgetDialog(false); setTotalPackage(""); loadOrgs();
                  } catch { toast({ title: "操作失败", variant: "destructive" }); }
                  finally { setDistributing(false); }
                }}>
                  {distributing ? "分配中…" : "确认均分"}
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
  const [editLimit, setEditLimit] = useState("2000");
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
  const [showCreateSubOrg, setShowCreateSubOrg] = useState(false);
  const [subOrgName, setSubOrgName] = useState("");
  const [subOrgBudget, setSubOrgBudget] = useState("");
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [budgetDialogMode, setBudgetDialogMode] = useState<"members">("members");
  const [memberDailyLimit, setMemberDailyLimit] = useState("");
  const [distributing, setDistributing] = useState(false);
  const [statsFlashKey, setStatsFlashKey] = useState(0);
  // Transfer member state
  const [transferMember, setTransferMember] = useState<Member | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const phone = getCurrentPhone();

  const selectedOrg = orgs.find(o => o.id === orgId);
  const budget = selectedOrg?.monthly_budget ?? 0;
  const consumed = selectedOrg?.current_month_budget ?? 0;

  // Children count from the recursive tree (orgs with parent_id === orgId)
  const childCount = orgs.filter(o => o.parent_id === orgId).length;
  const hasChildren = childCount > 0;

  const memberAllocated = members.reduce((s, m) => s + (m.daily_limit ?? 2000) * 30, 0);
  const totalAllocated = memberAllocated;
  const remaining = budget > 0 ? budget - totalAllocated : null;
  const allocatedPct = budget > 0 ? Math.min(100, Math.round((totalAllocated / budget) * 100)) : null;
  const totalConsumed = consumed;
  const available = budget > 0 ? budget - totalConsumed : null;
  const execRate = budget > 0 ? Math.min(100, Math.round((totalConsumed / budget) * 100)) : 0;
  const execOverWarning = execRate >= 90;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <p className="text-xs text-muted-foreground">本月总预算上限</p>
            <p key={statsFlashKey} className="text-3xl font-bold text-foreground mt-0.5 tabular-nums animate-in zoom-in-95 duration-300">
              {budget > 0 ? `¥${budget.toLocaleString()}` : <span className="text-xl text-muted-foreground">未设置</span>}
            </p>
          </div>
          <div className="border-t pt-3 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">已分配总额</span>
              <span className="font-medium tabular-nums">¥{totalAllocated.toLocaleString()}{allocatedPct !== null && <span className="text-xs text-muted-foreground ml-1">({allocatedPct}%)</span>}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">剩余可分配额</span>
              <span className={`font-medium tabular-nums ${remaining !== null && remaining < 0 ? "text-destructive" : ""}`}>
                {remaining !== null ? `¥${remaining.toLocaleString()}` : <span className="text-muted-foreground">—</span>}
              </span>
            </div>
          </div>
        </div>

        {/* B. 实时消耗 */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-destructive" /></div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">实时消耗</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">本月累计总消耗</p>
            <p key={`consumed-${statsFlashKey}`} className="text-3xl font-bold text-foreground mt-0.5 tabular-nums animate-in zoom-in-95 duration-300">¥{totalConsumed.toLocaleString()}</p>
          </div>
          <div className="border-t pt-3 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">组织可用余额</span>
              <span className="font-medium tabular-nums">
                {available !== null ? <span className={available < 0 ? "text-destructive" : ""}>¥{available.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">预算使用率</span>
                <span className={`font-medium tabular-nums ${execOverWarning ? "text-destructive" : ""}`}>{execRate}%</span>
              </div>
              {budget > 0 && <Progress value={execRate} className={`h-1.5 ${execOverWarning ? "[&>div]:bg-destructive" : ""}`} />}
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
              { icon: <Building2 className="w-4 h-4 text-muted-foreground" />, label: "下级部门", value: `${subOrgs.length} 个`, tab: "sub-orgs" as const },
              { icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "直属成员", value: `${members.length} 人`, tab: "members" as const },
              { icon: <Key className="w-4 h-4 text-muted-foreground" />, label: "API Key 总数", value: "42 个", tab: null },
            ].map(({ icon, label, value, tab }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group"
                onClick={() => { if (tab) navigateTo(tab); else toast({ title: "请前往 API Key 页面查看" }); }}>
                {icon}
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Members + Sub-orgs Card */}
      <Card ref={tabCardRef}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-0 border-b border-transparent">
              {(["members", "sub-orgs"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {tab === "members" ? "直属成员" : "下属子部门"}
                </button>
              ))}
            </div>
            {activeTab === "members" ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setBudgetDialogMode("members"); setMemberDailyLimit(""); setShowBudgetDialog(true); }}>
                  <Sliders className="w-4 h-4 mr-1" />成员批量分配
                </Button>
                <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" />添加成员</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setBudgetDialogMode("sub-orgs"); setTotalPackage(""); setShowBudgetDialog(true); }}>
                  <Sliders className="w-4 h-4 mr-1" />部门批量分配
                </Button>
                <Button size="sm" onClick={() => setShowCreateSubOrg(true)}><Plus className="w-4 h-4 mr-1" />创建子部门</Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Tab: 直属成员 */}
        {activeTab === "members" && (
          <CardContent className="p-0 pt-0">
            {members.filter(m => !m.daily_limit || m.daily_limit === 0).length > 0 && (
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-300">检测到 {members.filter(m => !m.daily_limit || m.daily_limit === 0).length} 个成员未配置预算</span>
                  </div>
                  <button className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400 underline underline-offset-2" onClick={() => { setBudgetDialogMode("members"); setMemberDailyLimit(""); setShowBudgetDialog(true); }}>点击一键配置</button>
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
                          <DropdownMenuItem onClick={() => setTransferMember(m)} className="gap-2">
                            <ArrowLeftRight className="w-3.5 h-3.5" />转移成员
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeMember(m)}>移除成员</DropdownMenuItem>
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
          </CardContent>
        )}

        {/* Tab: 下属子部门 */}
        {activeTab === "sub-orgs" && (
          <CardContent className="p-0 pt-0">
            {subOrgs.filter(s => !s.monthlyBudget || s.monthlyBudget === 0).length > 0 && (
              <div className="px-4 pt-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-300">检测到 {subOrgs.filter(s => !s.monthlyBudget || s.monthlyBudget === 0).length} 个子部门未配置预算</span>
                  </div>
                  <button className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400 underline underline-offset-2" onClick={() => { setBudgetDialogMode("sub-orgs"); setTotalPackage(""); setShowBudgetDialog(true); }}>点击一键配置</button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>部门名称</TableHead><TableHead>管理员</TableHead><TableHead>成员数</TableHead>
                  <TableHead>本月预算上限</TableHead><TableHead>本月消耗预算</TableHead><TableHead>使用率</TableHead>
                  <TableHead>状态</TableHead><TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subOrgs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">暂无下属部门，点击「创建子部门」开始</TableCell></TableRow>
                ) : subOrgs.map((s) => {
                  const rate = s.monthlyBudget && s.monthlyBudget > 0 ? Math.min(100, Math.round(s.consumed / s.monthlyBudget * 100)) : 0;
                  const overBudget = !!(s.monthlyBudget && s.consumed >= s.monthlyBudget);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-foreground">{s.adminName}</span>
                          <span className="text-xs text-muted-foreground">{maskPhone(s.adminPhone)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{s.memberCount}</TableCell>
                      <TableCell className="tabular-nums">
                        <InlineBudgetEdit value={s.monthlyBudget ?? 0} label="本月预算上限" unit="元/月" emptyLabel="不限"
                          onSave={(val) => { setSubOrgs(prev => prev.map(x => x.id === s.id ? { ...x, monthlyBudget: val === 0 ? null : val } : x)); toast({ title: "预算上限已更新" }); }}
                        />
                      </TableCell>
                      <TableCell className={`tabular-nums font-medium ${overBudget ? "text-destructive" : ""}`}>¥{s.consumed.toLocaleString()}</TableCell>
                      <TableCell>
                        {s.monthlyBudget ? (
                          <div className="flex items-center gap-2 min-w-[90px]">
                            <Progress value={rate} className={`h-1.5 flex-1 ${overBudget ? "[&>div]:bg-destructive" : ""}`} />
                            <span className={`text-xs tabular-nums ${overBudget ? "text-destructive" : "text-muted-foreground"}`}>{rate}%</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {s.status === "active"
                          ? <Badge variant="outline" style={{color:"hsl(142,70%,40%)",borderColor:"hsl(142,70%,75%)",background:"hsl(142,70%,97%)"}}>正常</Badge>
                          : <Badge variant="outline" className="text-muted-foreground border-border">禁用</Badge>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast({ title: "功能开发中" })}>编辑子部门</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSubOrgs(prev => prev.map(x => x.id === s.id ? { ...x, status: x.status === "active" ? "disabled" : "active" } : x))}>
                              {s.status === "active" ? "禁用子部门" : "启用子部门"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(s)}>删除子部门</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Edit Member Sheet */}
      <Sheet open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <SheetContent side="right" className="w-96">
          <SheetHeader><SheetTitle>编辑成员</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-6">
            <div>
              <Label className="text-xs text-muted-foreground">成员手机号</Label>
              <p className="mt-1 text-sm font-medium text-foreground">{editMember?.user_phone}</p>
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <RadioGroup value={editRole} onValueChange={setEditRole} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="org_admin" id="r-admin" /><Label htmlFor="r-admin" className="font-normal cursor-pointer">部门管理员</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="member" id="r-member" /><Label htmlFor="r-member" className="font-normal cursor-pointer">普通成员</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-limit">单日上限（元）</Label>
              <Input id="daily-limit" type="number" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} placeholder="2000" />
              <p className="text-xs text-muted-foreground">成员共享部门月预算，单日上限为个人每日最高消耗</p>
            </div>
          </div>
          <SheetFooter className="mt-8 flex gap-2">
            <Button variant="outline" onClick={() => setEditMember(null)}>取消</Button>
            <Button onClick={saveMember} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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

      {/* Create Sub-org Dialog */}
      <Dialog open={showCreateSubOrg} onOpenChange={(open) => { setShowCreateSubOrg(open); if (!open) { setSubOrgName(""); setSubOrgBudget(""); setSubOrgAdminName(""); setSubOrgAdminPhone(""); } }}>
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
            <div className="space-y-1.5">
              <Label>设置部门管理员（可选）</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="姓名" value={subOrgAdminName} onChange={(e) => setSubOrgAdminName(e.target.value)} />
                <Input placeholder="手机号" value={subOrgAdminPhone} onChange={(e) => setSubOrgAdminPhone(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateSubOrg(false)}>取消</Button>
            <Button onClick={() => {
              if (!subOrgName.trim()) { toast({ title: "请输入子部门名称", variant: "destructive" }); return; }
              const newSub: SubOrg = { id: `s${Date.now()}`, name: subOrgName.trim(), adminName: subOrgAdminName.trim() || "—", adminPhone: subOrgAdminPhone.trim() || "00000000000", memberCount: 0, monthlyBudget: subOrgBudget ? Number(subOrgBudget) : null, consumed: 0, status: "active" };
              setSubOrgs(prev => [...prev, newSub]);
              setShowCreateSubOrg(false); setSubOrgName(""); setSubOrgBudget(""); setSubOrgAdminName(""); setSubOrgAdminPhone("");
              toast({ title: "子部门创建成功", description: newSub.name });
            }}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete sub-org confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除子部门</AlertDialogTitle>
            <AlertDialogDescription>将永久删除子部门「{deleteTarget?.name}」，此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setSubOrgs(prev => prev.filter(s => s.id !== deleteTarget?.id)); setDeleteTarget(null); toast({ title: "已删除" }); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量分配预算 Dialog */}
      {(() => {
        const n = subOrgs.length;
        const pkg = Number(totalPackage);
        const perBudget = n > 0 && pkg > 0 ? pkg / n : 0;
        const dailyLimitNum = Number(memberDailyLimit);
        const perMonthBudget = dailyLimitNum > 0 ? dailyLimitNum * 30 : 0;
        const totalMonthCost = perMonthBudget * members.length;
        return (
          <Dialog open={showBudgetDialog} onOpenChange={(open) => { setShowBudgetDialog(open); if (!open) { setTotalPackage(""); setMemberDailyLimit(""); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{budgetDialogMode === "members" ? "成员批量分配" : "部门批量分配"}</DialogTitle>
                <DialogDescription>{budgetDialogMode === "members" ? "为本部门所有直属成员统一设置单日消耗上限。" : "将输入的总金额均分给所有子部门。"}</DialogDescription>
              </DialogHeader>
              {remaining !== null && (
                <div className={`rounded-lg p-3 flex justify-between text-sm ${remaining < 0 ? "bg-destructive/10 border border-destructive/30" : "bg-muted/60"}`}>
                  <span className="text-muted-foreground">部门剩余可分配额</span>
                  <span className={`font-semibold tabular-nums ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>¥{remaining.toLocaleString()}</span>
                </div>
              )}
              {budgetDialogMode === "sub-orgs" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>要分配的总预算（元）</Label>
                    <Input type="number" placeholder="请输入总金额" value={totalPackage} onChange={(e) => setTotalPackage(e.target.value)} />
                  </div>
                  {n > 0 && pkg > 0 && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">共 <span className="font-semibold">{n}</span> 个子部门，每个分得 <span className="font-bold text-primary">¥{perBudget.toFixed(2)}</span>/月</div>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>统一单日上限（元/天）</Label>
                    <Input type="number" placeholder="如：2000" value={memberDailyLimit} onChange={(e) => setMemberDailyLimit(e.target.value)} />
                  </div>
                  {dailyLimitNum > 0 && members.length > 0 && <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">共 <span className="font-semibold">{members.length}</span> 人，月总消耗上限约 <span className="font-bold text-primary">¥{totalMonthCost.toLocaleString()}</span></div>}
                </div>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>取消</Button>
                <Button disabled={distributing || (budgetDialogMode === "sub-orgs" ? (n === 0 || pkg <= 0) : (dailyLimitNum <= 0 || members.length === 0))}
                  onClick={async () => {
                    setDistributing(true);
                    if (budgetDialogMode === "sub-orgs") {
                      setSubOrgs(prev => prev.map(s => ({ ...s, monthlyBudget: perBudget })));
                      toast({ title: `已为 ${n} 个子部门分配预算` });
                    } else {
                      await Promise.all(members.map(m => supabase.from("members").update({ daily_limit: dailyLimitNum }).eq("id", m.id)));
                      setMembers(prev => prev.map(m => ({ ...m, daily_limit: dailyLimitNum })));
                      toast({ title: `已为 ${members.length} 位成员设置单日上限 ¥${dailyLimitNum}` });
                    }
                    setDistributing(false); setShowBudgetDialog(false); setTotalPackage(""); setMemberDailyLimit("");
                  }}
                >{distributing ? "分配中…" : "确认分配"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Transfer Member Dialog */}
      <TransferMemberDialog
        open={!!transferMember}
        onOpenChange={(open) => { if (!open) setTransferMember(null); }}
        orgs={orgs}
        currentOrgId={orgId}
        memberName={transferMember ? (memberNames[transferMember.user_phone] ?? maskPhone(transferMember.user_phone)) : ""}
        onConfirm={handleTransfer}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeptManagement — Main page with left org tree + right dynamic content
// ─────────────────────────────────────────────────────────────────────────────
export default function DeptManagement({ enterprise, role }: Props) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<{ user_phone: string; organization_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<"root" | string>("root");
  const phone = getCurrentPhone();

  // Permission: which org does the current user manage?
  // If org_admin, find their org from members list
  const [currentUserOrgId, setCurrentUserOrgId] = useState<string | null>(null);

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
    setMembers(allMembers);

    // Find current user's org (for org_admin permission check)
    if (role === "org_admin" && phone) {
      const myMembership = allMembers.find(m => m.user_phone === phone);
      setCurrentUserOrgId(myMembership?.organization_id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { loadOrgs(); }, [enterprise.id]);

  // Auto-select first org for org_admin
  useEffect(() => {
    if (role === "org_admin" && currentUserOrgId) {
      setSelectedNode(currentUserOrgId);
    }
  }, [role, currentUserOrgId]);

  const canAccess = (nodeId: "root" | string): boolean => {
    if (role === "admin") return true;
    if (nodeId === "root") return false; // only admins see root
    if (role === "org_admin") return nodeId === currentUserOrgId;
    return false;
  };

  // Build flat tree node list with search filter
  const treeNodes = useMemo(() => {
    const nodes: { id: "root" | string; label: string; locked: boolean }[] = [];
    const term = searchTerm.toLowerCase();

    // Root node
    if (!term || enterprise.name.toLowerCase().includes(term)) {
      nodes.push({ id: "root", label: enterprise.name, locked: !canAccess("root") });
    }

    // Org nodes
    orgs
      .filter(o => !term || o.name.toLowerCase().includes(term))
      .forEach(o => {
        nodes.push({ id: o.id, label: o.name, locked: !canAccess(o.id) });
      });

    return nodes;
  }, [orgs, searchTerm, enterprise.name, currentUserOrgId, role]);

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
          {treeNodes.map(node => {
            const isRoot = node.id === "root";
            const isSelected = selectedNode === node.id;
            const isLocked = node.locked;

            return (
              <button
                key={node.id}
                disabled={isLocked}
                onClick={() => !isLocked && setSelectedNode(node.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm transition-colors ${
                  isRoot ? "" : "pl-5"
                } ${
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : isLocked
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-foreground hover:bg-muted/60"
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
                ) : isRoot ? (
                  <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                ) : (
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                )}
                <span className="truncate text-xs">{node.label}</span>
                {!isLocked && !isRoot && (
                  <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                    {orgs.find(o => o.id === node.id)?.memberCount ?? 0}人
                  </span>
                )}
              </button>
            );
          })}

          {treeNodes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">无匹配部门</p>
          )}
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
}
