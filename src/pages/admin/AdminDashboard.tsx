import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, CreditCard, Activity, TrendingUp, Clock } from "lucide-react";

interface Stats {
  enterpriseCount: number;
  userCount: number;
  totalBalance: number;
  apiKeyCount: number;
  pendingCerts: number;
  recentRecharges: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    enterpriseCount: 0,
    userCount: 0,
    totalBalance: 0,
    apiKeyCount: 0,
    pendingCerts: 0,
    recentRecharges: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentEnterprises, setRecentEnterprises] = useState<{ id: string; name: string; owner_phone: string; created_at: string }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: enterpriseCount },
        { count: userCount },
        { count: apiKeyCount },
        { count: pendingCerts },
        { data: balances },
        { data: recent },
        { data: recentRecharges },
      ] = await Promise.all([
        supabase.from("enterprises").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("api_keys").select("*", { count: "exact", head: true }),
        supabase.from("enterprise_certifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("enterprise_balances").select("balance"),
        supabase.from("enterprises").select("id,name,owner_phone,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("balance_records").select("id,type").eq("type", "recharge"),
      ]);

      const totalBalance = (balances || []).reduce((sum, b) => sum + (b.balance || 0), 0);

      setStats({
        enterpriseCount: enterpriseCount || 0,
        userCount: userCount || 0,
        totalBalance,
        apiKeyCount: apiKeyCount || 0,
        pendingCerts: pendingCerts || 0,
        recentRecharges: recentRecharges?.length || 0,
      });
      setRecentEnterprises(recent || []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "企业总数", value: stats.enterpriseCount, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "注册用户", value: stats.userCount, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "平台余额总额", value: `¥ ${stats.totalBalance.toFixed(2)}`, icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "API Key 总数", value: stats.apiKeyCount, icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "待审认证", value: stats.pendingCerts, icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "充值记录", value: stats.recentRecharges, icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">数据总览</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台核心指标一览</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-xl font-semibold text-foreground mt-0.5">
                {loading ? <span className="animate-pulse text-muted-foreground text-sm">加载中…</span> : card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent enterprises */}
      <div className="bg-card border rounded-xl">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-medium text-foreground">最近注册企业</h2>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">加载中…</div>
          ) : recentEnterprises.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">暂无数据</div>
          ) : (
            recentEnterprises.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.owner_phone}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
