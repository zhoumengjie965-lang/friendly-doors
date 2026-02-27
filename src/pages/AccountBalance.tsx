import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentPhone } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, TrendingUp, Activity, Ticket, Mail, MessageSquare, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Enterprise { id: string; name: string; enterprise_code: string }

interface BalanceData {
  id: string;
  enterprise_id: string;
  balance: number;
  total_consumed: number;
  request_count: number;
  alert_threshold: number | null;
  alert_email: string | null;
  alert_method: string;
}

interface BalanceRecord {
  id: string;
  type: string;
  amount: number;
  operator: string | null;
  remark: string | null;
  created_at: string;
}

interface Props {
  enterprise: Enterprise;
  role: string;
}

const PAGE_SIZE = 5;

export default function AccountBalance({ enterprise, role }: Props) {
  const phone = getCurrentPhone();
  const isAdmin = role === "admin";

  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [records, setRecords] = useState<BalanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Alert settings
  const [alertMethod, setAlertMethod] = useState("email");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);

  // Redeem dialog
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Fetch / init balance record
  const fetchBalance = async () => {
    const { data, error } = await (supabase as any)
      .from("enterprise_balances")
      .select("*")
      .eq("enterprise_id", enterprise.id)
      .maybeSingle();

    if (error) { console.error(error); return; }

    if (!data) {
      // init
      const { data: inserted } = await (supabase as any)
        .from("enterprise_balances")
        .insert({ enterprise_id: enterprise.id })
        .select()
        .single();
      setBalanceData(inserted);
    } else {
      setBalanceData(data);
      setAlertMethod(data.alert_method ?? "email");
      setAlertThreshold(data.alert_threshold != null ? String(data.alert_threshold) : "");
      setAlertEmail(data.alert_email ?? "");
    }
  };

  const fetchRecords = async () => {
    let query = (supabase as any)
      .from("balance_records")
      .select("*", { count: "exact" })
      .eq("enterprise_id", enterprise.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data, count, error } = await query;
    if (!error) {
      setRecords(data ?? []);
      setTotal(count ?? 0);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchBalance();
      setLoading(false);
    })();
  }, [enterprise.id]);

  useEffect(() => {
    fetchRecords();
  }, [enterprise.id, page, typeFilter]);

  const handleSaveAlert = async () => {
    if (!balanceData) return;
    setSavingAlert(true);
    const { error } = await (supabase as any)
      .from("enterprise_balances")
      .update({
        alert_method: alertMethod,
        alert_threshold: alertThreshold ? parseFloat(alertThreshold) : null,
        alert_email: alertEmail || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", balanceData.id);
    setSavingAlert(false);
    if (error) { toast.error("保存失败"); return; }
    toast.success("预警设置已保存");
    fetchBalance();
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) { toast.error("请输入兑换码"); return; }
    setRedeeming(true);

    const { data: codeRow, error: codeErr } = await (supabase as any)
      .from("redeem_codes")
      .select("*")
      .eq("code", redeemCode.trim().toUpperCase())
      .maybeSingle();

    if (codeErr || !codeRow || codeRow.status !== "unused") {
      toast.error("兑换码无效或已使用");
      setRedeeming(false);
      return;
    }

    // Mark as used
    await (supabase as any)
      .from("redeem_codes")
      .update({ status: "used", used_by: phone, used_at: new Date().toISOString() })
      .eq("id", codeRow.id);

    // Insert balance record
    await (supabase as any)
      .from("balance_records")
      .insert({
        enterprise_id: enterprise.id,
        type: "redeem_code",
        amount: codeRow.amount,
        operator: phone,
        remark: `兑换码：${codeRow.code}`,
      });

    // Update balance
    const newBalance = (balanceData?.balance ?? 0) + Number(codeRow.amount);
    await (supabase as any)
      .from("enterprise_balances")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("enterprise_id", enterprise.id);

    toast.success(`充值成功！已到账 ¥${Number(codeRow.amount).toFixed(2)}`);
    setRedeeming(false);
    setRedeemOpen(false);
    setRedeemCode("");
    fetchBalance();
    fetchRecords();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const thresholdAmount = alertThreshold ? (parseFloat(alertThreshold) * 0.01).toFixed(2) : null;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">账户余额</h1>
        <p className="text-muted-foreground mt-1 text-sm">查看企业账户余额及充值消耗记录</p>
      </div>

      {/* Balance Overview Card */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Left: main balance */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">当前可用余额</span>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              ¥{(balanceData?.balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* Middle: stats */}
          <div className="flex gap-8">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs">历史消耗</span>
              </div>
              <p className="text-xl font-semibold">¥{(balanceData?.total_consumed ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs">请求次数</span>
              </div>
              <p className="text-xl font-semibold">{balanceData?.request_count ?? 0}</p>
            </div>
          </div>

          {/* Right: button */}
          <Button
            variant="secondary"
            className="shrink-0 bg-white text-primary hover:bg-white/90 font-medium"
            onClick={() => setRedeemOpen(true)}
          >
            <Ticket className="w-4 h-4 mr-2" />
            兑换码充值
          </Button>
        </div>
      </div>

      {/* Alert Settings - admin only */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">余额预警设置</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 items-end">
            {/* Row 1 left: notification method */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">通知方式</Label>
              <RadioGroup value={alertMethod} onValueChange={setAlertMethod} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="email" id="method-email" />
                  <Label htmlFor="method-email" className="flex items-center gap-1 cursor-pointer text-sm">
                    <Mail className="w-3.5 h-3.5" /> 邮件通知
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="sms" id="method-sms" />
                  <Label htmlFor="method-sms" className="flex items-center gap-1 cursor-pointer text-sm">
                    <MessageSquare className="w-3.5 h-3.5" /> 短信通知
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Row 1 right: threshold amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">预警金额（元）</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="输入预警金额"
                value={alertThreshold ? (parseFloat(alertThreshold) * 0.01).toFixed(2) : ""}
                onChange={(e) => {
                  const yuan = parseFloat(e.target.value);
                  setAlertThreshold(isNaN(yuan) ? "" : String(Math.round(yuan / 0.01)));
                }}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {alertThreshold ? `等同于 ${alertThreshold} 额度` : "1 额度 = ¥0.01"}
              </p>
            </div>

            {/* Row 2 left: email */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">通知邮箱</Label>
              <Input
                placeholder="留空则使用账号绑定邮箱"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Row 2 right: save button bottom-aligned */}
            <div className="flex justify-end">
              <Button onClick={handleSaveAlert} disabled={savingAlert}>
                {savingAlert ? "保存中..." : "保存设置"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Records */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-foreground">充值记录</h2>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="筛选类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="redeem_code">兑换码充值</SelectItem>
              <SelectItem value="manual">后台充值</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">时间</TableHead>
                <TableHead className="text-muted-foreground">类型</TableHead>
                <TableHead className="text-muted-foreground">金额</TableHead>
                <TableHead className="text-muted-foreground">操作人</TableHead>
                <TableHead className="text-muted-foreground">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Inbox className="w-10 h-10 opacity-30" />
                      <p className="text-sm">暂无数据</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.type === "redeem_code" ? "secondary" : "outline"} className="text-xs">
                        {r.type === "redeem_code" ? "兑换码充值" : "后台充值"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      +¥{Number(r.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.operator ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {r.remark ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">共 {total} 条记录</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Redeem Dialog */}
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              兑换码充值
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>兑换码</Label>
              <Input
                placeholder="请输入兑换码"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleRedeem(); }}
                className="font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRedeemOpen(false)}>取消</Button>
              <Button onClick={handleRedeem} disabled={redeeming}>
                {redeeming ? "兑换中..." : "立即兑换"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
