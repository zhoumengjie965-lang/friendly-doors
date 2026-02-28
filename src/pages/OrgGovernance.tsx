import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Plus, Users, Key, TrendingUp, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("member");
  const [addLimit, setAddLimit] = useState("2000");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const phone = getCurrentPhone();

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
        toast({ title: "至少保留 1 名组织管理员", variant: "destructive" });
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

  async function addMember() {
    if (!addPhone.trim()) { toast({ title: "请输入手机号", variant: "destructive" }); return; }
    setSaving(true);

    const { data: existing } = await supabase
      .from("members")
      .select("id, organization_id")
      .eq("enterprise_id", enterprise.id)
      .eq("user_phone", addPhone.trim())
      .maybeSingle();

    if (existing) {
      if (existing.organization_id === selectedOrgId) {
        toast({ title: "该成员已在本组织中", variant: "destructive" });
        setSaving(false);
        return;
      }
      await supabase.from("members").insert({
        enterprise_id: enterprise.id,
        organization_id: selectedOrgId,
        user_phone: addPhone.trim(),
        role: addRole,
        daily_limit: Number(addLimit),
        status: "active",
      });
      toast({ title: "成员已添加" });
    } else {
      await supabase.from("invitations").insert({
        enterprise_id: enterprise.id,
        organization_id: selectedOrgId,
        inviter_phone: phone ?? "",
        invitee_phone: addPhone.trim(),
        invited_role: addRole,
      });
      toast({ title: "邀请已发送", description: "对方接受邀请后将出现在成员列表" });
    }

    // Upsert name if provided
    if (addName.trim()) {
      await supabase.from("users")
        .upsert({ phone: addPhone.trim(), name: addName.trim() }, { onConflict: "phone" });
    }

    setSaving(false);
    setShowAdd(false);
    setAddPhone(""); setAddName(""); setAddRole("member"); setAddLimit("2000");
    fetchMembers();
  }

  const roleLabel = (r: string) => r === "org_admin" ? "管理员" : "成员";
  const statusBadge = (s: string) =>
    s === "active"
      ? <Badge variant="outline" style={{color:"hsl(142,70%,40%)",borderColor:"hsl(142,70%,75%)",background:"hsl(142,70%,97%)"}}>正常</Badge>
      : <Badge variant="outline" className="text-muted-foreground border-border">禁用</Badge>;
  const pendingBadge = <Badge variant="outline" style={{color:"hsl(32,95%,44%)",borderColor:"hsl(32,95%,72%)",background:"hsl(32,95%,97%)"}}>邀请中</Badge>;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">组织治理</h1>
          <p className="text-muted-foreground text-sm mt-0.5">管理组织成员与预算</p>
        </div>
        {orgs.length > 1 && (
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="选择组织" />
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
            <p className="text-lg font-medium text-foreground">暂无组织</p>
            <p className="text-sm text-muted-foreground mt-1">请先在企业管理中创建组织</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">组织数据总览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">本月预算上限</p>
                  <p className="text-lg font-semibold text-foreground">
                    {budget > 0 ? `¥${budget.toLocaleString()}` : "未设置"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">本月累计消耗</p>
                  <p className="text-lg font-semibold text-foreground">
                    {consumed > 0 ? `¥${consumed.toLocaleString()}` : "¥0"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">本月使用率</p>
                  <p className="text-lg font-semibold text-foreground">{usageRate}%</p>
                </div>
              </div>
              {budget > 0 && (
                <div>
                  <Progress value={usageRate} className="h-2" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">成员数量</span>
                  <span className="text-sm font-medium text-foreground ml-auto">{members.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">API Key</span>
                  <span className="text-sm font-medium text-foreground ml-auto">—</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">组织状态</span>
                  <span className="ml-auto">
                    {selectedOrg?.status === "active"
                      ? <span className="text-sm font-medium flex items-center gap-1" style={{color:"hsl(142,70%,40%)"}}><span className="w-1.5 h-1.5 rounded-full inline-block" style={{background:"hsl(142,70%,45%)"}} />正常</span>
                      : <span className="text-sm font-medium text-muted-foreground">禁用</span>}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">成员管理</CardTitle>
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4 mr-1" />添加成员
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                        <div className="flex flex-col gap-0.5">
                          {pendingBadge}
                          <span className="text-xs text-muted-foreground">{formatExpiry(inv)}</span>
                        </div>
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
                  <Label htmlFor="r-admin" className="font-normal cursor-pointer">管理员</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="member" id="r-member" />
                  <Label htmlFor="r-member" className="font-normal cursor-pointer">成员</Label>
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
              <p className="text-xs text-muted-foreground">成员共享组织月预算，单日上限为个人每日最高消耗</p>
            </div>
          </div>
          <SheetFooter className="mt-8 flex gap-2">
            <Button variant="outline" onClick={() => setEditMember(null)}>取消</Button>
            <Button onClick={saveMember} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Member Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-phone">手机号</Label>
              <Input
                id="add-phone"
                placeholder="请输入手机号"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">成员姓名（可选）</Label>
              <Input
                id="add-name"
                placeholder="请输入姓名"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>指定角色</Label>
              <RadioGroup value={addRole} onValueChange={setAddRole} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="member" id="a-member" />
                  <Label htmlFor="a-member" className="font-normal cursor-pointer">成员</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="org_admin" id="a-admin" />
                  <Label htmlFor="a-admin" className="font-normal cursor-pointer">管理员</Label>
                </div>
              </RadioGroup>
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={addMember} disabled={saving}>{saving ? "添加中…" : "添加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
