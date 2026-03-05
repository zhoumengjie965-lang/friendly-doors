import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, ExternalLink, Zap, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "@/lib/adminAuth";

interface Enterprise {
  id: string;
  name: string;
  owner_phone: string;
  enterprise_code: string;
  created_at: string;
  cert_status: string;
  balance: number;
  total_consumed: number;
  org_count: number;
  member_count: number;
}

const CERT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uncertified: { label: "未认证", variant: "secondary" },
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "outline" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

export default function AdminEnterprises() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const session = getAdminSession();

  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Quick recharge dialog
  const [rechargeTarget, setRechargeTarget] = useState<Enterprise | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: ents } = await supabase
      .from("enterprises")
      .select("id,name,owner_phone,enterprise_code,created_at")
      .order("created_at", { ascending: false });

    if (!ents) { setLoading(false); return; }

    const ids = ents.map((e) => e.id);
    const [
      { data: certs },
      { data: balances },
      { data: orgs },
      { data: members },
    ] = await Promise.all([
      supabase.from("enterprise_certifications").select("enterprise_id,status").in("enterprise_id", ids),
      supabase.from("enterprise_balances").select("enterprise_id,balance,total_consumed").in("enterprise_id", ids),
      supabase.from("organizations").select("enterprise_id").in("enterprise_id", ids),
      supabase.from("members").select("enterprise_id").in("enterprise_id", ids),
    ]);

    const certMap = Object.fromEntries((certs || []).map((c) => [c.enterprise_id, c.status]));
    const balMap = Object.fromEntries((balances || []).map((b) => [b.enterprise_id, b]));
    const orgCount = (orgs || []).reduce((acc, o) => { acc[o.enterprise_id] = (acc[o.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);
    const memberCount = (members || []).reduce((acc, m) => { acc[m.enterprise_id] = (acc[m.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);

    setEnterprises(ents.map((e) => ({
      ...e,
      cert_status: certMap[e.id] || "uncertified",
      balance: balMap[e.id]?.balance ?? 0,
      total_consumed: balMap[e.id]?.total_consumed ?? 0,
      org_count: orgCount[e.id] ?? 0,
      member_count: memberCount[e.id] ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecharge = async () => {
    if (!rechargeTarget || !rechargeAmount) return;
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "请输入有效金额", variant: "destructive" });
      return;
    }
    setRechargeLoading(true);
    const { error } = await supabase.rpc("admin_recharge_enterprise", {
      p_enterprise_id: rechargeTarget.id,
      p_amount: amount,
      p_operator: session?.phone || "admin",
      p_remark: rechargeRemark || null,
    });
    setRechargeLoading(false);
    if (error) {
      toast({ title: "充值失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `已为「${rechargeTarget.name}」充值 ¥${amount.toFixed(2)}` });
      setRechargeTarget(null);
      setRechargeAmount("");
      setRechargeRemark("");
      fetchData();
    }
  };

  const filtered = enterprises.filter(
    (e) =>
      e.name.includes(search) ||
      e.owner_phone.includes(search) ||
      e.enterprise_code.includes(search)
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">企业管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {enterprises.length} 家企业</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索企业名称 / 负责人手机号…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.4fr_1.2fr_140px] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>企业名称</span>
          <span>负责人</span>
          <span>认证状态</span>
          <span>余额 / 总消耗</span>
          <span>组织 / 成员</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((e) => {
            const certBadge = CERT_STATUS[e.cert_status] || CERT_STATUS.uncertified;
            return (
              <div key={e.id} className="grid grid-cols-[2fr_1fr_1fr_1.4fr_1.2fr_140px] gap-4 px-5 py-3.5 items-center text-sm border-b last:border-0 hover:bg-muted/20 transition-colors">
                {/* 企业名称 */}
                <div
                  className="cursor-pointer group"
                  onClick={() => navigate(`/admin/enterprises/${e.id}`)}
                >
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">{e.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{e.enterprise_code}</p>
                </div>

                {/* 负责人 */}
                <span className="text-muted-foreground text-xs">{e.owner_phone}</span>

                {/* 认证状态 */}
                <span>
                  <Badge variant={certBadge.variant} className="text-xs">{certBadge.label}</Badge>
                </span>

                {/* 余额 / 总消耗 */}
                <div className="text-xs leading-5">
                  <span className="text-foreground font-medium">¥{e.balance.toFixed(2)}</span>
                  <span className="text-muted-foreground"> / ¥{e.total_consumed.toFixed(2)}</span>
                </div>

                {/* 组织 / 成员 */}
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{e.org_count}</span> 组织 ·{" "}
                  <span className="text-foreground font-medium">{e.member_count}</span> 人
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/admin/enterprises/${e.id}`)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    详情
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => { setRechargeTarget(e); setRechargeAmount(""); setRechargeRemark(""); }}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    充值
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => toast({ title: "功能开发中", description: "禁用企业功能即将上线" })}
                  >
                    <Ban className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Recharge Dialog */}
      <Dialog open={!!rechargeTarget} onOpenChange={(open) => { if (!open) setRechargeTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>快速充值</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-1">
            <p className="text-sm text-muted-foreground">企业：<span className="text-foreground font-medium">{rechargeTarget?.name}</span></p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>充值金额（元）</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="请输入金额"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="充值备注…"
                rows={2}
                value={rechargeRemark}
                onChange={(e) => setRechargeRemark(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeTarget(null)}>取消</Button>
            <Button onClick={handleRecharge} disabled={rechargeLoading}>
              {rechargeLoading ? "处理中…" : "确认充值"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
