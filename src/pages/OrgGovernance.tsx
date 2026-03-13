import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Plus, Users, Key, TrendingUp, CheckCircle, ArrowRight, Building2, BarChart3, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Mock sub-department data (UI preview only) ──────────────────────────────
interface SubOrg {
  id: string; name: string; adminName: string; adminPhone: string;
  memberCount: number; monthlyBudget: number | null; consumed: number; status: "active" | "disabled";
}
const MOCK_SUB_ORGS: SubOrg[] = [
  { id: "s1", name: "华东销售组", adminName: "张伟",   adminPhone: "13800138001", memberCount: 8,  monthlyBudget: 5000, consumed: 1240, status: "active" },
  { id: "s2", name: "技术支持组", adminName: "李晓梅", adminPhone: "13912345678", memberCount: 5,  monthlyBudget: 3000, consumed: 3100, status: "active" },
  { id: "s3", name: "市场推广组", adminName: "王建国", adminPhone: "18611223344", memberCount: 12, monthlyBudget: 8000, consumed:  320, status: "active" },
];

interface Enterprise { id: string; name: string; }
interface Organization {
  id: string; name: string; status: string;
  monthly_budget: number | null; current_month_budget: number | null;
  enterprise_id: string;
}
interface Member {
  id: string; user_phone: string; role: string;
  organization_id: string | null; daily_limit: number | null; status: string;
}
interface PendingInvite {
  id: string; invitee_phone: string | null; invited_role: string;
  invite_code: string; expires_at: string; created_at: string;
}

interface Props { enterprise: Enterprise; role: string; }

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

type AddMode = "single" | "bulk";

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

export default function OrgGovernance({ enterprise, role }: Props) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
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

  // Sub-department tab state
  const [activeTab, setActiveTab] = useState<"members" | "sub-orgs">("members");
  const [subOrgs, setSubOrgs] = useState<SubOrg[]>(MOCK_SUB_ORGS);
  const [showCreateSubOrg, setShowCreateSubOrg] = useState(false);
  const [subOrgName, setSubOrgName] = useState("");
  const [subOrgBudget, setSubOrgBudget] = useState("");
  const [subOrgAdminName, setSubOrgAdminName] = useState("");
  const [subOrgAdminPhone, setSubOrgAdminPhone] = useState("");

  const { toast } = useToast();
  const phone = getCurrentPhone();
  const tabCardRef = useRef<HTMLDivElement>(null);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  useEffect(() => { fetchOrgs(); }, [enterprise.id]);
  useEffect(() => { if (selectedOrgId) fetchMembers(); }, [selectedOrgId]);

  async function fetchOrgs() {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("enterprise_id", enterprise.id)
      .order("created_at");
    if (data && data.length > 0) {
      setOrgs(data as Organization[]);
      setSelectedOrgId(data[0].id);
    }
    setLoading(false);
  }

  async function fetchMembers() {
    const [{ data: membersData }, { data: invData }] = await Promise.all([
      supabase.from("members").select("*").eq("organization_id", selectedOrgId),
      supabase.from("invitations").select("*")
        .eq("organization_id", selectedOrgId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .not("invitee_phone", "is", null),
    ]);
    const mList = (membersData as Member[]) ?? [];
    const iList = (invData as PendingInvite[]) ?? [];
    setMembers(mList);
    setPendingInvites(iList);

    // Fetch names from users table
    const phones = [
      ...mList.map(m => m.user_phone),
      ...iList.filter(i => i.invitee_phone).map(i => i.invitee_phone!),
    ];
    if (phones.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("phone, name")
        .in("phone", phones);
      if (usersData) {
        const map: Record<string, string | null> = {};
        usersData.forEach((u: { phone: string; name?: string | null }) => {
          map[u.phone] = u.name ?? null;
        });
        setMemberNames(map);
      }
    }
  }

  function formatExpiry(inv: PendingInvite): string {
    if (inv.invitee_phone) {
      const days = Math.round((Date.now() - new Date(inv.created_at).getTime()) / 86400000);
      return `邀请 ${days} 天前发送`;
    }
    const hours = Math.round((new Date(inv.expires_at).getTime() - Date.now()) / 3600000);
    if (hours <= 0) return "已过期";
    if (hours < 24) return `链接 ${hours}h 后过期`;
    return `链接 ${Math.round(hours / 24)} 天后过期`;
  }

  async function revokeInvite(inviteId: string) {
    await supabase.from("invitations").delete().eq("id", inviteId);
    fetchMembers();
    toast({ title: "已取消添加" });
  }

  const budget = selectedOrg?.monthly_budget ?? 0;
  const consumed = selectedOrg?.current_month_budget ?? 0;
  const usageRate = budget > 0 ? Math.round((consumed / budget) * 100) : 0;

  function openEdit(m: Member) {
    setEditMember(m);
    setEditRole(m.role);
    setEditLimit(String(m.daily_limit ?? 2000));
  }

  async function saveMember() {
    if (!editMember) return;
    if (editRole !== "org_admin" && editMember.role === "org_admin") {
      const adminCount = members.filter((m) => m.role === "org_admin").length;
      if (adminCount <= 1) {
        toast({ title: "至少保留 1 名部门管理员", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    await supabase.from("members").update({
      role: editRole,
      daily_limit: Number(editLimit),
    }).eq("id", editMember.id);
    setSaving(false);
    setEditMember(null);
    fetchMembers();
    toast({ title: "已保存" });
  }

  async function toggleStatus(m: Member) {
    const newStatus = m.status === "active" ? "disabled" : "active";
    await supabase.from("members").update({ status: newStatus }).eq("id", m.id);
    fetchMembers();
  }

  async function removeMember(m: Member) {
    await supabase.from("members").delete().eq("id", m.id);
    fetchMembers();
    toast({ title: "成员已移除" });
  }

  const bulkParsed = useMemo(() => parseBulkText(bulkText), [bulkText]);

  function resetAddDialog() {
    setAddPhone(""); setAddName(""); setAddRole("member"); setAddLimit("2000");
    setBulkText(""); setBulkRole("member"); setBulkLimit("2000");
    setAddMode("single");
  }

  async function processSingleMember(memberPhone: string, memberName: string, memberRole: string, memberLimit: string) {
    const { data: existing } = await supabase
      .from("members")
      .select("id, organization_id")
      .eq("enterprise_id", enterprise.id)
      .eq("user_phone", memberPhone)
      .maybeSingle();

    if (existing) {
      if (existing.organization_id === selectedOrgId) {
        return { skipped: true };
      }
      await supabase.from("members").insert({
        enterprise_id: enterprise.id,
        organization_id: selectedOrgId,
        user_phone: memberPhone,
        role: memberRole,
        daily_limit: Number(memberLimit),
        status: "active",
      });
    } else {
      await supabase.from("invitations").insert({
        enterprise_id: enterprise.id,
        organization_id: selectedOrgId,
        inviter_phone: phone ?? "",
        invitee_phone: memberPhone,
        invited_role: memberRole,
      });
    }
    if (memberName.trim()) {
      await supabase.from("users")
        .upsert({ phone: memberPhone, name: memberName.trim() }, { onConflict: "phone" });
    }
    return { skipped: false };
  }

  async function addMember() {
    if (!addPhone.trim()) { toast({ title: "请输入手机号", variant: "destructive" }); return; }
    if (!addName.trim()) { toast({ title: "请输入成员姓名", variant: "destructive" }); return; }
    setSaving(true);
    const result = await processSingleMember(addPhone.trim(), addName.trim(), addRole, addLimit);
    if (result.skipped) {
      toast({ title: "该成员已在本部门中", variant: "destructive" });
      setSaving(false);
      return;
    }
    toast({ title: "添加成功" });
    setSaving(false);
    setShowAdd(false);
    resetAddDialog();
    fetchMembers();
  }

  async function addBulkMembers() {
    if (bulkParsed.length === 0) { toast({ title: "请输入成员信息", variant: "destructive" }); return; }
    if (bulkParsed.some(m => !m.valid)) { toast({ title: "批量导入中有格式错误，请修正后再提交", variant: "destructive" }); return; }
    setSaving(true);
    let added = 0;
    for (const m of bulkParsed) {
      if (m.valid) {
        const result = await processSingleMember(m.phone, m.name, bulkRole, bulkLimit);
        if (!result.skipped) added++;
      }
    }
    toast({ title: `批量添加完成`, description: `共处理 ${added} 位成员` });
    setSaving(false);
    setShowAdd(false);
    resetAddDialog();
    fetchMembers();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">部门管理</h1>
          <p className="text-muted-foreground text-sm mt-0.5">管理部门成员与预算</p>
        </div>
        {orgs.length > 1 && (
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="选择部门" />
            </SelectTrigger>
            <SelectContent>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {orgs.length === 1 && (
          <div className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium text-foreground">
            {selectedOrg?.name}
          </div>
        )}
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">暂无部门</p>
            <p className="text-sm text-muted-foreground mt-1">请先在企业管理中创建部门</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Overview Panel: 3 functional cards ──────────────────── */}
          {(() => {
            // Budget Planning derived values
            const subOrgAllocated = subOrgs.reduce((s, o) => s + (o.monthlyBudget ?? 0), 0);
            const memberAllocated = members.reduce((s, m) => s + (m.daily_limit ?? 2000) * 30, 0);
            const totalAllocated = subOrgAllocated + memberAllocated;
            const remaining = budget > 0 ? budget - totalAllocated : null;
            const allocatedPct = budget > 0 ? Math.min(100, Math.round((totalAllocated / budget) * 100)) : null;

            // Real-time Execution derived values
            const subConsumed = subOrgs.reduce((s, o) => s + o.consumed, 0);
            const totalConsumed = consumed + subConsumed;
            const available = budget > 0 ? budget - totalConsumed : null;
            const execRate = budget > 0 ? Math.min(100, Math.round((totalConsumed / budget) * 100)) : 0;
            const execOverWarning = execRate >= 90;

            function navigateTo(tab: "members" | "sub-orgs") {
              setActiveTab(tab);
              setTimeout(() => tabCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }

            return (
              <div className="grid grid-cols-3 gap-4">
                {/* A. 预算规划 */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">预算规划</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">本月总预算上限</p>
                    <p className="text-3xl font-bold text-foreground mt-0.5 tabular-nums">
                      {budget > 0 ? `¥${budget.toLocaleString()}` : <span className="text-xl text-muted-foreground">未设置</span>}
                    </p>
                  </div>
                  <div className="border-t pt-3 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">已分配总额</span>
                      <span className="font-medium tabular-nums">
                        ¥{totalAllocated.toLocaleString()}
                        {allocatedPct !== null && (
                          <span className="text-xs text-muted-foreground ml-1">({allocatedPct}%)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">剩余可分配额</span>
                      <span className={`font-medium tabular-nums ${remaining !== null && remaining < 0 ? "text-destructive" : ""}`}>
                        {remaining !== null
                          ? `¥${remaining.toLocaleString()}`
                          : <span className="text-muted-foreground">—</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* B. 实时消耗 */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">实时消耗</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">本月累计总消耗</p>
                    <p className="text-3xl font-bold text-foreground mt-0.5 tabular-nums">
                      ¥{totalConsumed.toLocaleString()}
                    </p>
                  </div>
                  <div className="border-t pt-3 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">组织可用余额</span>
                      <span className="font-medium tabular-nums">
                        {available !== null
                          ? <span className={available < 0 ? "text-destructive" : ""}>¥{available.toLocaleString()}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">预算使用率</span>
                        <span className={`font-medium tabular-nums ${execOverWarning ? "text-destructive" : ""}`}>{execRate}%</span>
                      </div>
                      {budget > 0 && (
                        <Progress
                          value={execRate}
                          className={`h-1.5 ${execOverWarning ? "[&>div]:bg-destructive" : ""}`}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* C. 组织资产 */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-violet-500" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">组织资产</p>
                  </div>
                  <div className="space-y-1">
                    {[
                      { icon: <Building2 className="w-4 h-4 text-muted-foreground" />, label: "下级部门", value: `${subOrgs.length} 个`, tab: "sub-orgs" as const },
                      { icon: <Users className="w-4 h-4 text-muted-foreground" />, label: "直属成员", value: `${members.length} 人`, tab: "members" as const },
                      { icon: <Key className="w-4 h-4 text-muted-foreground" />, label: "API Key 总数", value: "42 个", tab: null },
                    ].map(({ icon, label, value, tab }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors group"
                        onClick={() => {
                          if (tab) {
                            navigateTo(tab);
                          } else {
                            toast({ title: "请前往 API Key 页面查看" });
                          }
                        }}
                      >
                        {icon}
                        <span className="text-sm text-muted-foreground flex-1">{label}</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Members + Sub-orgs Card */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                {/* Tab switcher */}
                <div className="flex gap-0 border-b border-transparent">
                  {(["members", "sub-orgs"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "members" ? "直属成员" : "下属子部门"}
                    </button>
                  ))}
                </div>
                {activeTab === "members" ? (
                  <Button size="sm" onClick={() => setShowAdd(true)}>
                    <Plus className="w-4 h-4 mr-1" />添加成员
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setShowCreateSubOrg(true)}>
                    <Plus className="w-4 h-4 mr-1" />创建子部门
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* ── Tab: 直属成员 ─────────────────────────────────────────── */}
            {activeTab === "members" && (
            <CardContent className="p-0 pt-0">
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
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        暂无成员，点击"添加成员"开始
                      </TableCell>
                    </TableRow>
                  ) : members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-foreground">
                            {memberNames[m.user_phone] ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">{maskPhone(m.user_phone)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.role === "org_admin" ? "default" : "secondary"}>
                          {roleLabel(m.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>
                        {m.daily_limit != null ? `¥${m.daily_limit}` : "¥2000"}
                      </TableCell>
                      <TableCell>{statusBadge(m.status ?? "active")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>编辑成员</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(m)}>
                              {m.status === "active" ? "禁用成员" : "启用成员"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => removeMember(m)}
                            >
                              移除成员
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingInvites.map((inv) => (
                    <TableRow key={inv.id} className="opacity-80">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm text-foreground">
                            {inv.invitee_phone ? (memberNames[inv.invitee_phone] ?? "—") : "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {inv.invitee_phone ? maskPhone(inv.invitee_phone) : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.invited_role === "org_admin" ? "default" : "secondary"}>
                          {roleLabel(inv.invited_role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>
                        {pendingBadge}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => revokeInvite(inv.id)}
                            >
                              取消添加
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            )}

            {/* ── Tab: 下属子部门 ───────────────────────────────────────── */}
            {activeTab === "sub-orgs" && (
            <CardContent className="p-0 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>部门名称</TableHead>
                    <TableHead>管理员</TableHead>
                    <TableHead>成员数</TableHead>
                    <TableHead>本月预算上限</TableHead>
                    <TableHead>本月消耗预算</TableHead>
                    <TableHead>使用率</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subOrgs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        暂无下属部门，点击「创建子部门」开始
                      </TableCell>
                    </TableRow>
                  ) : subOrgs.map((s) => {
                    const rate = s.monthlyBudget && s.monthlyBudget > 0 ? Math.min(100, Math.round(s.consumed / s.monthlyBudget * 100)) : 0;
                    const overBudget = s.monthlyBudget && s.consumed >= s.monthlyBudget;
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
                          {s.monthlyBudget ? `¥${s.monthlyBudget.toLocaleString()}` : <span className="text-muted-foreground">不限</span>}
                        </TableCell>
                        <TableCell className={`tabular-nums font-medium ${overBudget ? "text-destructive" : ""}`}>
                          ¥{s.consumed.toLocaleString()}
                        </TableCell>
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
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toast({ title: "功能开发中" })}>编辑子部门</DropdownMenuItem>
                              <DropdownMenuItem onClick={() =>
                                setSubOrgs(prev => prev.map(x => x.id === s.id ? { ...x, status: x.status === "active" ? "disabled" : "active" } : x))
                              }>
                                {s.status === "active" ? "禁用子部门" : "启用子部门"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSubOrgs(prev => prev.filter(x => x.id !== s.id));
                                  toast({ title: "子部门已删除" });
                                }}
                              >
                                删除子部门
                              </DropdownMenuItem>
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
        </>
      )}

      {/* Edit Member Sheet */}
      <Sheet open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>编辑成员</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div>
              <Label className="text-xs text-muted-foreground">成员手机号</Label>
              <p className="mt-1 text-sm font-medium text-foreground">{editMember?.user_phone}</p>
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
            <div className="space-y-2">
              <Label htmlFor="daily-limit">单日上限（元）</Label>
              <Input
                id="daily-limit"
                type="number"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
                placeholder="2000"
              />
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
                <button
                  type="button"
                  onClick={() => setAddMode("single")}
                  className={`px-3 py-1 transition-colors ${addMode === "single" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  单个添加
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("bulk")}
                  className={`px-3 py-1 transition-colors border-l border-input ${addMode === "bulk" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  批量导入
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {addMode === "single" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="手机号"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                  />
                  <Input
                    placeholder="姓名（必填）"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                  />
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">普通成员</SelectItem>
                       <SelectItem value="org_admin">部门管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-limit">单日上限（元）</Label>
                  <Input
                    id="add-limit"
                    type="number"
                    value={addLimit}
                    onChange={(e) => setAddLimit(e.target.value)}
                    placeholder="2000"
                  />
                </div>
              </>
            ) : (
              <>
                <Textarea
                  placeholder={"每行一人，格式：姓名 手机号\n例如：\n张三 13800000001\n李四,13900000002"}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">支持空格或逗号分隔姓名和手机号，每行一人</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-muted-foreground shrink-0">统一角色</span>
                    <Select value={bulkRole} onValueChange={setBulkRole}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">普通成员</SelectItem>
                        <SelectItem value="org_admin">部门管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-muted-foreground shrink-0">单日上限</span>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={bulkLimit}
                      onChange={(e) => setBulkLimit(e.target.value)}
                      placeholder="2000"
                    />
                  </div>
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
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); resetAddDialog(); }}>取消</Button>
            <Button
              onClick={addMode === "single" ? addMember : addBulkMembers}
              disabled={saving}
            >
              {saving ? "添加中…" : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Sub-org Dialog */}
      <Dialog open={showCreateSubOrg} onOpenChange={(open) => {
        setShowCreateSubOrg(open);
        if (!open) { setSubOrgName(""); setSubOrgBudget(""); setSubOrgAdminName(""); setSubOrgAdminPhone(""); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建子部门</DialogTitle>
            <DialogDescription>在当前部门下创建下属子部门，子部门共享月度预算限制。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">子部门名称 <span className="text-destructive">*</span></Label>
              <Input
                id="sub-name"
                placeholder="如：华东销售组"
                value={subOrgName}
                onChange={(e) => setSubOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-budget">本月预算上限（元）</Label>
              <Input
                id="sub-budget"
                type="number"
                placeholder="留空表示不限制"
                value={subOrgBudget}
                onChange={(e) => setSubOrgBudget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">子部门的月度消耗不超过此限额</p>
            </div>
            <div className="space-y-1.5">
              <Label>设置部门管理员（可选）</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="姓名"
                  value={subOrgAdminName}
                  onChange={(e) => setSubOrgAdminName(e.target.value)}
                />
                <Input
                  placeholder="手机号"
                  value={subOrgAdminPhone}
                  onChange={(e) => setSubOrgAdminPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateSubOrg(false)}>取消</Button>
            <Button
              onClick={() => {
                if (!subOrgName.trim()) { toast({ title: "请输入子部门名称", variant: "destructive" }); return; }
                const newSub: SubOrg = {
                  id: `s${Date.now()}`,
                  name: subOrgName.trim(),
                  adminName: subOrgAdminName.trim() || "—",
                  adminPhone: subOrgAdminPhone.trim() || "00000000000",
                  memberCount: 0,
                  monthlyBudget: subOrgBudget ? Number(subOrgBudget) : null,
                  consumed: 0,
                  status: "active",
                };
                setSubOrgs(prev => [...prev, newSub]);
                setShowCreateSubOrg(false);
                setSubOrgName(""); setSubOrgBudget(""); setSubOrgAdminName(""); setSubOrgAdminPhone("");
                toast({ title: "子部门创建成功", description: newSub.name });
              }}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
