import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface DailyRecord {
  date: string;
  recharge: number;
  count: number;
}

export default function AdminStats() {
  const [daily, setDaily] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecharge, setTotalRecharge] = useState(0);
  const [totalApiKeys, setTotalApiKeys] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: records }, { count: apiCount }] = await Promise.all([
        supabase
          .from("balance_records")
          .select("amount,created_at,type")
          .eq("type", "recharge")
          .order("created_at", { ascending: true }),
        supabase.from("api_keys").select("*", { count: "exact", head: true }),
      ]);

      const total = (records || []).reduce((s, r) => s + r.amount, 0);
      setTotalRecharge(total);
      setTotalApiKeys(apiCount || 0);

      // Group by day (last 30 days)
      const now = new Date();
      const days: DailyRecord[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayRecords = (records || []).filter((r) => r.created_at.slice(0, 10) === key);
        days.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          recharge: dayRecords.reduce((s, r) => s + r.amount, 0),
          count: dayRecords.length,
        });
      }
      setDaily(days);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">全局统计</h1>
        <p className="text-sm text-muted-foreground mt-0.5">平台充值趋势与 API Key 数据</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">累计充值金额</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">¥ {totalRecharge.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">API Key 总数</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">{totalApiKeys}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card border rounded-xl p-12 text-center text-sm text-muted-foreground">加载中…</div>
      ) : (
        <>
          {/* Recharge bar chart */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">近 30 天充值金额（¥）</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                />
                <Bar dataKey="recharge" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="充值金额" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Count line chart */}
          <div className="bg-card border rounded-xl p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">近 30 天充值笔数</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="笔数" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
