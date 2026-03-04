import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  enterprise_name?: string;
  role?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data: usersData } = await supabase
        .from("users")
        .select("id,phone,name,created_at")
        .order("created_at", { ascending: false });

      if (!usersData) { setLoading(false); return; }

      const phones = usersData.map((u) => u.phone);
      const { data: membersData } = await supabase
        .from("members")
        .select("user_phone,role,enterprise_id")
        .in("user_phone", phones);

      const enterpriseIds = [...new Set((membersData || []).map((m) => m.enterprise_id))];
      const { data: enterprises } = await supabase
        .from("enterprises")
        .select("id,name")
        .in("id", enterpriseIds);

      const entMap = Object.fromEntries((enterprises || []).map((e) => [e.id, e.name]));
      const memberMap = Object.fromEntries(
        (membersData || []).map((m) => [m.user_phone, { enterprise_name: entMap[m.enterprise_id], role: m.role }])
      );

      setUsers(
        usersData.map((u) => ({
          ...u,
          ...memberMap[u.phone],
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = users.filter(
    (u) => u.phone.includes(search) || (u.name || "").includes(search)
  );

  const roleLabel = (role?: string) => {
    const map: Record<string, string> = { owner: "企业主", org_admin: "组织管理员", member: "成员" };
    return role ? (map[role] || role) : "—";
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {users.length} 名用户</p>
        </div>
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索手机号或姓名…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>手机号</span>
          <span>姓名</span>
          <span>所属企业</span>
          <span>角色</span>
          <span>注册时间</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id} className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr] gap-4 px-5 py-3.5 border-b last:border-0 text-sm items-center">
              <span className="font-medium text-foreground">{u.phone}</span>
              <span className="text-muted-foreground">{u.name || "—"}</span>
              <span className="text-muted-foreground truncate">{u.enterprise_name || "未加入企业"}</span>
              <span className="text-muted-foreground">{roleLabel(u.role)}</span>
              <span className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString("zh-CN")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
