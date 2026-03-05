import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search } from "lucide-react";

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

type FilterType = "all" | "no_enterprise" | "has_enterprise";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const fetchAll = async () => {
      // 1. Fetch all users
      const { data: usersData } = await supabase
        .from("users")
        .select("id,phone,name,created_at,status")
        .order("created_at", { ascending: false });

      if (!usersData) { setLoading(false); return; }

      const phones = usersData.map((u) => u.phone);

      // 2. Fetch all members for these phones
      const { data: membersData } = await supabase
        .from("members")
        .select("user_phone,role,enterprise_id")
        .in("user_phone", phones);

      // 3. Fetch all enterprises referenced
      const enterpriseIds = [...new Set((membersData || []).map((m) => m.enterprise_id))];
      const { data: enterprises } = enterpriseIds.length > 0
        ? await supabase.from("enterprises").select("id,name,owner_phone").in("id", enterpriseIds)
        : { data: [] };

      // 4. Fetch enterprises owned by these users (for personal balance)
      const { data: ownedEnterprises } = await supabase
        .from("enterprises")
        .select("id,owner_phone")
        .in("owner_phone", phones);

      // 5. Fetch enterprise_balances for owned enterprises
      const ownedIds = (ownedEnterprises || []).map((e) => e.id);
      const { data: balances } = ownedIds.length > 0
        ? await supabase.from("enterprise_balances").select("enterprise_id,balance").in("enterprise_id", ownedIds)
        : { data: [] };

      // Build maps
      const entMap: Record<string, string> = Object.fromEntries(
        (enterprises || []).map((e) => [e.id, e.name])
      );

      // Group members by phone (ALL records)
      const membersByPhone: Record<string, EnterpriseRef[]> = {};
      (membersData || []).forEach((m) => {
        if (!membersByPhone[m.user_phone]) membersByPhone[m.user_phone] = [];
        membersByPhone[m.user_phone].push({
          id: m.enterprise_id,
          name: entMap[m.enterprise_id] || "未知企业",
          role: m.role,
        });
      });

      // Map owned enterprise_id -> balance
      const balanceMap: Record<string, number> = Object.fromEntries(
        (balances || []).map((b) => [b.enterprise_id, b.balance])
      );

      // Map owner_phone -> balance (sum owned enterprise balances)
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
    fetchAll();
  }, []);

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
    if (ents.length === 0) return <span className="text-muted-foreground/60 italic">个人用户</span>;
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

  const roleCell = (ents: EnterpriseRef[]) => {
    if (ents.length === 0) return <span className="text-muted-foreground">—</span>;
    if (ents.length === 1) return <span className="text-muted-foreground">{roleLabel(ents[0].role)}</span>;
    return <span className="text-muted-foreground">多企业</span>;
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
        <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>手机号</span>
          <span>姓名</span>
          <span>所属企业</span>
          <span>角色</span>
          <span>个人余额</span>
          <span>注册时间</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b last:border-0 text-sm items-center"
            >
              <span className="font-medium text-foreground">{u.phone}</span>
              <span className="text-muted-foreground">{u.name || "—"}</span>
              <div className="flex items-center min-w-0">{enterpriseCell(u.enterprises)}</div>
              <div>{roleCell(u.enterprises)}</div>
              <span className="text-muted-foreground tabular-nums">
                ¥{u.personal_balance.toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString("zh-CN")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
