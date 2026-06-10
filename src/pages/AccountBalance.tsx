import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, TrendingUp, Activity, Ticket, Mail, MessageSquare, ChevronLeft, ChevronRight, Inbox, Download, HelpCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";


interface Enterprise { id: string; name: string; enterprise_code: string }

interface BalanceData {
  id: string;
  enterprise_id: string;
  balance: number;
  voucher_balance: number;
  total_consumed: number;
  total_recharge: number;
  request_count: number;
  alert_threshold: number | null;
  alert_email: string | null;
  alert_method: string;
}

interface BalanceRecord {
  id: string;
  type: "voucher_recharge" | "redeem_recharge" | "admin_recharge" | "admin_adjust";
  source: string; // 二级来源
  amount: number; // 正数=收入，负数=支出
  balance_after: number; // 操作后余额
  operator: string | null;
  remark: string | null;
  expiryDate?: string | null; // 代金券有效期
  remainingAmount?: number; // 代金券剩余金额
  created_at: string;
}

interface Props {
  enterprise: Enterprise | null;
  role: string;
}

export default function AccountBalance({ enterprise, role }: Props) {

  const [balanceData] = useState<BalanceData>({
    id: "bal-001",
    enterprise_id: enterprise?.id ?? "personal",
    balance: 600.00,
    voucher_balance: 11492.55,
    total_consumed: 0,
    total_recharge: 600,
    request_count: 0,
    alert_threshold: null,
    alert_email: null,
    alert_method: "email",
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [timePreset, setTimePreset] = useState<string>("month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading] = useState(false);

  // Mock 数据（已按时间倒序）
  const allMockRecords: BalanceRecord[] = [
    { id: "v1", type: "voucher_recharge", source: "系统", amount: 11492.55, balance_after: 12092.55, operator: "系统", remark: "2026-03 账期返券", expiryDate: "2026-05-31T23:59:59", remainingAmount: 11492.55, created_at: "2026-04-02T10:30:00" },
    { id: "r1", type: "redeem_recharge", source: "兑换码充值", amount: 500, balance_after: 550, operator: "18833334444", remark: "兑换码: TEST2024", created_at: "2026-02-27T14:25:48" },
    { id: "r2", type: "admin_recharge", source: "后台充值", amount: 100, balance_after: 650, operator: "管理员", remark: "后台手动充值", created_at: "2026-02-27T14:25:48" },
    { id: "a1", type: "admin_adjust", source: "后台调额", amount: -50, balance_after: 600, operator: "管理员", remark: "额度调整", created_at: "2026-02-26T10:30:00" },
  ];

  // 充值记录（排除代金券）
  const rechargeRecords = allMockRecords.filter((r) => r.type !== "voucher_recharge").filter((r) => {
    if (typeFilter !== "all") {
      return r.type === typeFilter;
    }
    return true;
  });

  // 代金券记录
  const voucherRecords = allMockRecords.filter((r) => r.type === "voucher_recharge");

  // Alert settings
  const [alertMethod, setAlertMethod] = useState("email");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);

  // Redeem dialog
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Mock 模式下不需要 fetch

  const handleSaveAlert = async () => {
    // Mock 模式下暂不执行
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) { toast.error("请输入兑换码"); return; }
    toast.success(`充值成功！已到账 ¥100.00`);
    setRedeeming(false);
    setRedeemOpen(false);
    setRedeemCode("");
  };

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
              <span className="text-white/70 text-sm">充值余额</span>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              ¥{(balanceData?.balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* Voucher balance */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Ticket className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">代金券余额</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-white/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    代金券可用于优先抵扣 Token Switch 平台的 AI 大模型调用费用，余额会随消费实时减少，不支持提现、退款、开票、转移。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              ¥{(balanceData?.voucher_balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* Right: stats */}
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
                <span className="text-white/60 text-xs">累计充值</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-white/60 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      累计充值仅统计客户真实充值金额，不包含平台发放的代金券金额。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xl font-semibold">¥{(balanceData?.total_recharge ?? 0).toFixed(2)}</p>
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

      {/* 余额预警设置 */}
        <div className="bg-card border border-border rounded-xl p-5">
          {/* Title row with save button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">余额预警设置</h2>
            <Button onClick={handleSaveAlert} disabled={savingAlert} size="sm">
              {savingAlert ? "保存中..." : "保存设置"}
            </Button>
          </div>
          <div className="space-y-4">
            {/* Row 1: notification method */}
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
            {/* Row 2: email + threshold side by side */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">通知邮箱</Label>
                <Input
                  placeholder="留空则使用账号绑定邮箱"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
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
                  {alertThreshold
                    ? `¥${(parseFloat(alertThreshold) * 0.01).toFixed(2)} = ${alertThreshold} 额度`
                    : "1 额度 = ¥0.01"}
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* 充值记录 */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {/* 标题行 + 筛选器 */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-foreground">充值记录</h2>
              {/* 时间筛选器 */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">时间：</span>
                <div className="flex items-center gap-1">
                  {["today", "week", "month"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTimePreset(preset)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        timePreset === preset
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "text-gray-500 hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      {preset === "today" ? "今天" : preset === "week" ? "近1周" : "近1个月"}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-sm"
                disabled={rechargeRecords.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                下载
              </Button>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="redeem_recharge">兑换充值</SelectItem>
                  <SelectItem value="admin_recharge">后台充值</SelectItem>
                  <SelectItem value="admin_adjust">后台调额</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">记录ID</TableHead>
                <TableHead className="text-muted-foreground">类型</TableHead>
                <TableHead className="text-muted-foreground">时间</TableHead>
                <TableHead className="text-muted-foreground">充值额度</TableHead>
                <TableHead className="text-muted-foreground">操作人</TableHead>
                <TableHead className="text-muted-foreground">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rechargeRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Inbox className="w-10 h-10 opacity-30" />
                      <p className="text-sm">暂无数据</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rechargeRecords.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">{r.id}</TableCell>
                    <TableCell className="text-sm">
                      {r.type === "voucher_recharge" ? "代金券" : r.type === "redeem_recharge" ? "兑换充值" : r.type === "admin_recharge" ? "后台充值" : "后台调额"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }).replace(/\//g, "-")}
                    </TableCell>
                    <TableCell className={`font-semibold ${r.amount >= 0 ? "text-primary" : "text-red-500"}`}>
                      {r.amount >= 0 ? "+" : "-"}¥{Math.abs(r.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">{r.operator ?? "—"}</TableCell>
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
        {rechargeRecords.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">共 {rechargeRecords.length} 条记录</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                disabled
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                1 / 1
              </span>
              <Button
                variant="outline" size="sm"
                disabled
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 代金券记录 */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">代金券记录</h2>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">代金券编号</TableHead>
                <TableHead className="text-muted-foreground">发放金额</TableHead>
                <TableHead className="text-muted-foreground">剩余金额</TableHead>
                <TableHead className="text-muted-foreground">使用状态</TableHead>
                <TableHead className="text-muted-foreground">发放时间</TableHead>
                <TableHead className="text-muted-foreground">有效期至</TableHead>
                <TableHead className="text-muted-foreground">备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voucherRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Inbox className="w-10 h-10 opacity-30" />
                      <p className="text-sm">暂无代金券记录</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                voucherRecords.map((r) => {
                  const remaining = r.remainingAmount ?? r.amount;
                  const expired = r.expiryDate ? new Date(r.expiryDate) < new Date() : false;
                  let statusLabel = "正常";
                  let statusClass = "bg-green-500 text-white border-green-500";
                  if (remaining <= 0) {
                    statusLabel = "已用完";
                    statusClass = "text-orange-600 border-orange-200 bg-orange-50";
                  } else if (expired) {
                    statusLabel = "已过期";
                    statusClass = "text-gray-500 border-gray-200 bg-gray-50";
                  }
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm font-mono text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        +¥{Math.abs(r.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        ¥{remaining.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }).replace(/\//g, "-")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {r.expiryDate
                          ? new Date(r.expiryDate).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/\//g, "-")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {r.remark ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {voucherRecords.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">共 {voucherRecords.length} 条记录</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">1 / 1</span>
              <Button variant="outline" size="sm" disabled>
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
