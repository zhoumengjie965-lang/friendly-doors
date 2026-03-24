import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Search, Pencil, Ban, CheckCircle2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EnterpriseRef { id: string; name: string; role: string; }

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  status: string;
  enterprises: EnterpriseRef[];
  personal_balance: number;
}

interface MemberDetail {
  id: string;
  enterprise_id: string;
  enterprise_name: string;
  org_name: string | null;
  role: string;
}

interface DrawerDetail {
  personal_enterprise_id: string | null;
  personal_balance: number;
  members: MemberDetail[];
}

type FilterType = "all" | "no_enterprise" | "has_enterprise";

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<DrawerDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editBalance, setEditBalance] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: usersData } = await supabase
      .from("users")
      .select("id,phone,name,created_at,status")
      .order("created_at", { ascending: false });

    if (!usersData) { setLoading(false); return; }

    const phones = usersData.map((u) => u.phone);

    const { data: membersData } = await supabase
      .from("members")
      .select("user_phone,role,enterprise_id")
      .in("user_phone", phones);

    const enterpriseIds = [...new Set((membersData || []).map((m) => m.enterprise_id))];
    const { data: enterprises } = enterpriseIds.length > 0
      ? await supabase.from("enterprises").select("id,name,owner_phone").in("id", enterpriseIds)
      : { data: [] };

    const { data: ownedEnterprises } = await supabase
      .from("enterprises")
      .select("id,owner_phone")
      .in("owner_phone", phones);

    const ownedIds = (ownedEnterprises || []).map((e) => e.id);
    const { data: balances } = ownedIds.length > 0
      ? await supabase.from("enterprise_balances").select("enterprise_id,balance").in("enterprise_id", ownedIds)
      : { data: [] };

    const entMap: Record<string, string> = Object.fromEntries(
      (enterprises || []).map((e) => [e.id, e.name])
    );

    const membersByPhone: Record<string, EnterpriseRef[]> = {};
    (membersData || []).forEach((m) => {
      if (!membersByPhone[m.user_phone]) membersByPhone[m.user_phone] = [];
      membersByPhone[m.user_phone].push({
        id: m.enterprise_id,
        name: entMap[m.enterprise_id] || "未知企业",
        role: m.role,
      });
    });

    const balanceMap: Record<string, number> = Object.fromEntries(
      (balances || []).map((b) => [b.enterprise_id, b.balance])
    );

    const ownerBalanceMap: Record<string, number> = {};
    (ownedEnterprises || []).forEach((e) => {
      ownerBalanceMap[e.owner_phone] = (ownerBalanceMap[e.owner_phone] || 0) + (balanceMap[e.id] || 0);
    });

    setUsers(
      usersData.map((u) => ({
        ...u,
        enterprises: membersByPhone[u.phone] || [],
        personal_balance: ownerBalanceMap[u.phone] || 0,
      }))
    );
    setLoading(false);
  };

  const fetchDrawerDetail = async (phone: string) => {
    setDrawerLoading(true);
    setDrawerDetail(null);

    // 1. Personal enterprise
    const { data: ownedEnts } = await supabase
      .from("enterprises")
      .select("id")
      .eq("owner_phone", phone);
    const personalEntId = ownedEnts?.[0]?.id || null;

    // 2. Personal balance
    let personalBalance = 0;
    if (personalEntId) {
      const { data: bal } = await supabase
        .from("enterprise_balances")
        .select("balance")
        .eq("enterprise_id", personalEntId)
        .maybeSingle();
      personalBalance = bal?.balance || 0;
    }

    // 3. Members
    const { data: membersRaw } = await supabase
      .from("members")
      .select("id,enterprise_id,organization_id,role")
      .eq("user_phone", phone);

    if (!membersRaw || membersRaw.length === 0) {
      setDrawerDetail({ personal_enterprise_id: personalEntId, personal_balance: personalBalance, members: [] });
      setDrawerLoading(false);
      return;
    }

    // 4. Enterprise names
    const entIds = [...new Set(membersRaw.map((m) => m.enterprise_id))];
    const { data: ents } = await supabase.from("enterprises").select("id,name").in("id", entIds);
    const entMap: Record<string, string> = Object.fromEntries((ents || []).map((e) => [e.id, e.name]));

    // 5. Org names
    const orgIds = membersRaw.map((m) => m.organization_id).filter(Boolean) as string[];
    const { data: orgs } = orgIds.length > 0
      ? await supabase.from("organizations").select("id,name").in("id", orgIds)
      : { data: [] };
    const orgMap: Record<string, string> = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));

    const members: MemberDetail[] = membersRaw.map((m) => ({
      id: m.id,
      enterprise_id: m.enterprise_id,
      enterprise_name: entMap[m.enterprise_id] || "未知企业",
      org_name: m.organization_id ? (orgMap[m.organization_id] || null) : null,
      role: m.role,
    }));

    setDrawerDetail({ personal_enterprise_id: personalEntId, personal_balance: personalBalance, members });
    setDrawerLoading(false);
  };

  const openDrawer = (user: UserRow) => {
    setDrawerUser(user);
    setEditBalance("");
    setDrawerOpen(true);
    fetchDrawerDetail(user.phone);
  };

  const handleToggleStatus = async (user: UserRow) => {
    const newStatus = user.status === "active" ? "banned" : "active";
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    if (drawerUser?.id === user.id) setDrawerUser((prev) => prev ? { ...prev, status: newStatus } : prev);
    await supabase.from("users").update({ status: newStatus }).eq("id", user.id);
  };

  const handleSaveBalance = async () => {
    if (!drawerDetail?.personal_enterprise_id) return;
    const val = parseFloat(editBalance);
    if (isNaN(val)) return;
    setSavingBalance(true);
    await supabase.from("enterprise_balances")
      .update({ balance: val })
      .eq("enterprise_id", drawerDetail.personal_enterprise_id);
    setDrawerDetail((prev) => prev ? { ...prev, personal_balance: val } : prev);
    setSavingBalance(false);
    setEditBalance("");
    toast({ title: "已保存", description: `个人余额已更新为 ¥${val.toFixed(2)}` });
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("members").delete().eq("id", memberId);
    setDrawerDetail((prev) => prev
      ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) }
      : prev
    );
    if (drawerUser) {
      setUsers((prev) => prev.map((u) => u.phone === drawerUser.phone
        ? { ...u, enterprises: u.enterprises.filter((e) => e.id !== drawerDetail?.members.find((m) => m.id === memberId)?.enterprise_id) }
        : u
      ));
    }
    toast({ title: "已解除", description: "用户已从该企业移除" });
  };

  const filtered = users
    .filter((u) => u.phone.includes(search) || (u.name || "").includes(search))
    .filter((u) => {
      if (filter === "no_enterprise") return u.enterprises.length === 0;
      if (filter === "has_enterprise") return u.enterprises.length > 0;
      return true;
    });

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { owner: "企业主", org_admin: "组织管理员", member: "成员" };
    return map[role] || role;
  };

  const enterpriseCell = (ents: EnterpriseRef[]) => {
    if (ents.length === 0) return <span className="text-muted-foreground/50">-</span>;
    if (ents.length === 1) return <span className="text-muted-foreground truncate">{ents[0].name}</span>;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground truncate cursor-default inline-flex items-center gap-1">
              {ents[0].name}
              <span className="text-xs bg-muted rounded px-1 py-0.5">+{ents.length - 1}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <ul className="space-y-1 text-xs">
              {ents.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span>{e.name}</span>
                  <span className="opacity-60">({roleLabel(e.role)})</span>
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {users.length} 名用户</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              <SelectItem value="no_enterprise">仅个人用户</SelectItem>
              <SelectItem value="has_enterprise">仅企业成员</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索手机号或姓名…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[0.8fr_1fr_1.2fr_1fr_1.5fr_1fr_80px] text-xs font-medium text-muted-foreground border-b">
          <span className="px-5 py-3">用户ID</span>
          <span className="px-5 py-3">用户名</span>
          <span className="px-5 py-3">手机号</span>
          <span className="px-3 py-3 bg-blue-50/60 border-l-2 border-l-blue-200">个人空间余额</span>
          <span className="px-5 py-3 bg-amber-50/40">所属企业空间</span>
          <span className="px-5 py-3">注册时间</span>
          <span className="px-3 py-3">操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[0.8fr_1fr_1.2fr_1fr_1.5fr_1fr_80px] border-b last:border-0 text-sm items-center"
            >
              <span className="text-muted-foreground px-5 py-3.5 font-mono text-xs truncate" title={u.id}>
                {u.id.slice(0, 8)}…
              </span>
              <span className="text-foreground px-5 py-3.5 truncate">{u.name || "—"}</span>
              <div className="flex items-center gap-2 min-w-0 px-5 py-3.5">
                <span className="font-medium text-foreground truncate">{u.phone}</span>
                {u.status === "banned" && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0 shrink-0">已封禁</Badge>
                )}
              </div>
              <span className="text-muted-foreground tabular-nums px-3 py-3.5 bg-blue-50/40 border-l-2 border-l-blue-200">
                ¥{u.personal_balance.toFixed(2)}
              </span>
              <div className="flex items-center min-w-0 px-5 py-3.5 bg-amber-50/30">{enterpriseCell(u.enterprises)}</div>
              <span className="text-muted-foreground px-5 py-3.5">
                {new Date(u.created_at).toLocaleDateString("zh-CN")}
              </span>
              <div className="flex items-center gap-1 px-3 py-3.5">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openDrawer(u)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>编辑</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${u.status === "banned" ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive/80"}`}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === "banned"
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <Ban className="w-3.5 h-3.5" />
                        }
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{u.status === "banned" ? "解除封禁" : "封禁"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>编辑用户</SheetTitle>
          </SheetHeader>

          {drawerUser && (
            <div className="space-y-6">
              {/* Section A: 基本信息 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">基本信息</h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {/* 用户ID — top-left */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">用户ID</Label>
                      <p className="text-sm mt-0.5 font-mono">{drawerUser.id}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => { navigator.clipboard.writeText(drawerUser.id); toast({ title: "已复制" }); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* 用户名 — top-right */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">用户名</Label>
                      <p className="text-sm mt-0.5">{drawerUser.name || "—"}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0"
                      onClick={() => { navigator.clipboard.writeText(drawerUser.name || ""); toast({ title: "已复制" }); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* 手机号 — bottom-left */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">手机号</Label>
                      <p className="text-sm mt-0.5 font-medium tabular-nums">{drawerUser.phone}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                      onClick={() => toast({ title: "功能开发中", description: "解绑手机号功能即将上线" })}
                    >
                      解绑
                    </Button>
                  </div>

                  {/* 密码重置 — bottom-right */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">密码重置</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">强制重置密码</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      onClick={() => toast({ title: "功能开发中", description: "密码重置功能即将上线" })}
                    >
                      重置密码
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section B: 空间关联管理 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">空间关联管理</h3>

                {drawerLoading ? (
                  <p className="text-sm text-muted-foreground">加载中…</p>
                ) : drawerDetail ? (
                  <>
                    {/* 个人空间 */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">个人空间</p>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">当前余额</span>
                          <span className="font-semibold tabular-nums">¥{drawerDetail.personal_balance.toFixed(2)}</span>
                        </div>
                        {drawerDetail.personal_enterprise_id ? (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">修改余额</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={editBalance}
                                onChange={(e) => setEditBalance(e.target.value)}
                                placeholder={drawerDetail.personal_balance.toFixed(2)}
                                className="h-8 text-sm"
                              />
                              <Button size="sm" variant="outline" onClick={handleSaveBalance} disabled={savingBalance || !editBalance} className="h-8 shrink-0">
                                {savingBalance ? "保存中…" : "保存"}
                              </Button>
                            </div>
                            <p className="text-xs text-blue-500/70 mt-1">此操作仅影响个人钱包，不影响企业配额</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/60">该用户尚未创建企业空间</p>
                        )}
                      </div>
                    </div>

                    {/* 企业空间列表 */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">企业空间</p>
                      {drawerDetail.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground/60 italic">未加入任何企业</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                            <span>企业名称</span>
                            <span>所属组织</span>
                            <span>角色</span>
                            <span></span>
                          </div>
                          {drawerDetail.members.map((m) => (
                            <div key={m.id} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 px-3 py-2.5 border-b last:border-0 text-sm items-center">
                              <span className="truncate font-medium">{m.enterprise_name}</span>
                              <span className="text-muted-foreground truncate">{m.org_name || "—"}</span>
                              <span className="text-muted-foreground text-xs">{roleLabel(m.role)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                                onClick={() => handleRemoveMember(m.id)}
                              >
                                解绑
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
