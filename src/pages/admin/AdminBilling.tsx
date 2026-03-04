import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "@/lib/adminAuth";

interface Enterprise { id: string; name: string; balance: number; }
interface RedeemCode { id: string; code: string; amount: number; status: string; created_at: string; used_by: string | null; }

export default function AdminBilling() {
  const { toast } = useToast();
  const session = getAdminSession();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Recharge form
  const [rechargeEnt, setRechargeEnt] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeNote, setRechargeNote] = useState("");
  const [recharging, setRecharging] = useState(false);

  // Redeem code form
  const [codeAmount, setCodeAmount] = useState("");
  const [codeCount, setCodeCount] = useState("1");
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    const [{ data: ents }, { data: bals }, { data: rcs }] = await Promise.all([
      supabase.from("enterprises").select("id,name").order("created_at", { ascending: false }),
      supabase.from("enterprise_balances").select("enterprise_id,balance"),
      supabase.from("redeem_codes").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const balMap = Object.fromEntries((bals || []).map((b) => [b.enterprise_id, b.balance]));
    setEnterprises((ents || []).map((e) => ({ ...e, balance: balMap[e.id] ?? 0 })));
    setCodes(rcs || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(rechargeAmount);
    if (!rechargeEnt || isNaN(amt) || amt <= 0) return;
    setRecharging(true);
    const { error } = await supabase.rpc("admin_recharge_enterprise", {
      p_enterprise_id: rechargeEnt,
      p_amount: amt,
      p_operator: session?.phone || "admin",
      p_remark: rechargeNote || null,
    });
    setRecharging(false);
    if (error) {
      toast({ title: "充值失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `已为企业充值 ¥${amt.toFixed(2)}` });
      setRechargeAmount("");
      setRechargeNote("");
      fetchData();
    }
  };

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(codeAmount);
    const cnt = parseInt(codeCount);
    if (isNaN(amt) || amt <= 0 || isNaN(cnt) || cnt < 1 || cnt > 100) return;
    setGenerating(true);
    const errors: string[] = [];
    for (let i = 0; i < cnt; i++) {
      const code = Math.random().toString(36).substring(2, 12).toUpperCase();
      const { error } = await supabase.rpc("admin_create_redeem_code", { p_code: code, p_amount: amt });
      if (error) errors.push(error.message);
    }
    setGenerating(false);
    if (errors.length > 0) {
      toast({ title: "部分生成失败", description: errors[0], variant: "destructive" });
    } else {
      toast({ title: `已生成 ${cnt} 张兑换码，面值 ¥${amt}` });
      setCodeAmount("");
      setCodeCount("1");
      fetchData();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">计费管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">充值、兑换码生成与管理</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharge */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-medium text-foreground">企业充值</h2>
          <form onSubmit={handleRecharge} className="space-y-3">
            <div className="space-y-1.5">
              <Label>选择企业</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={rechargeEnt}
                onChange={(e) => setRechargeEnt(e.target.value)}
              >
                <option value="">— 请选择企业 —</option>
                {enterprises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}（¥ {e.balance.toFixed(2)}）
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>充值金额 (¥)</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="如：100.00" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>备注（选填）</Label>
              <Input placeholder="充值说明" value={rechargeNote} onChange={(e) => setRechargeNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={recharging}>
              {recharging ? "处理中…" : "确认充值"}
            </Button>
          </form>
        </div>

        {/* Generate redeem codes */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-medium text-foreground">生成兑换码</h2>
          <form onSubmit={handleGenerateCodes} className="space-y-3">
            <div className="space-y-1.5">
              <Label>面值 (¥)</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="如：50.00" value={codeAmount} onChange={(e) => setCodeAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>生成数量（1–100）</Label>
              <Input type="number" min="1" max="100" value={codeCount} onChange={(e) => setCodeCount(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={generating} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {generating ? "生成中…" : "生成兑换码"}
            </Button>
          </form>
        </div>
      </div>

      {/* Redeem code list */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <h2 className="text-sm font-medium text-foreground">兑换码列表（最近 50 条）</h2>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>兑换码</span>
          <span>面值</span>
          <span>状态</span>
          <span>创建时间</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">加载中…</div>
        ) : codes.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">暂无兑换码</div>
        ) : (
          codes.map((c) => (
            <div key={c.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b last:border-0 text-sm items-center">
              <span className="font-mono text-foreground">{c.code}</span>
              <span>¥ {c.amount}</span>
              <span>
                <Badge variant={c.status === "used" ? "secondary" : "outline"} className="text-xs">
                  {c.status === "used" ? "已使用" : "未使用"}
                </Badge>
              </span>
              <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("zh-CN")}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
