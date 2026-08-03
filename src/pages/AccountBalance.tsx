import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wallet, Ticket, ChevronLeft, ChevronRight, Inbox, Download, HelpCircle, CreditCard, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";


interface Enterprise { id: string; name: string; enterprise_code: string }

interface BalanceData {
  id: string;
  enterprise_id: string;
  balance: number;
  voucher_balance: number;
  credit_balance: number; // 授信可用余额
  request_count: number;
  alert_threshold: number | null;
  alert_email: string | null;
  alert_method: string;
}

interface BalanceRecord {
  id: string;
  type: "voucher_recharge" | "redeem_recharge" | "admin_recharge" | "admin_adjust" | "credit_recharge";
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

interface AlertRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const MAX_ALERT_RECIPIENTS = 5;

export default function AccountBalance({ enterprise, role }: Props) {
  const isEnterpriseMode = Boolean(enterprise);

  const [balanceData] = useState<BalanceData>({
    id: "bal-001",
    enterprise_id: enterprise?.id ?? "personal",
    balance: 600.00,
    voucher_balance: 11492.55,
    credit_balance: 4770.00,
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
    { id: "c1", type: "credit_recharge", source: "授信充值", amount: 5000, balance_after: 5000, operator: "系统", remark: "企业开通授信额度", created_at: "2026-03-01T09:00:00" },
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

  // Alert settings（Mock：默认已绑定联系方式并开启预警）
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState("50000");
  const [alertRecipients, setAlertRecipients] = useState<AlertRecipient[]>([
    { id: "recipient-1", name: "财务负责人", email: "finance@example.com", phone: "" },
    { id: "recipient-2", name: "技术负责人", email: "", phone: "13800138000" },
  ]);
  const serializedAlertSettings = useMemo(
    () => JSON.stringify({ alertThreshold, alertRecipients }),
    [alertThreshold, alertRecipients],
  );
  const [savedAlertSettings, setSavedAlertSettings] = useState(serializedAlertSettings);
  const hasUnsavedAlertChanges = serializedAlertSettings !== savedAlertSettings;
  const [savingAlert, setSavingAlert] = useState(false);

  // Redeem dialog
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Mock 模式下不需要 fetch

  useEffect(() => {
    if (!hasUnsavedAlertChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || event.defaultPrevented) return;

      const destination = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.href === current.href) return;

      if (!window.confirm("当前余额预警设置尚未保存，离开后修改将丢失。确定离开吗？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedAlertChanges]);

  const handleSaveAlert = async () => {
    if (!alertEnabled) {
      toast.info("请先开启余额预警，再保存设置");
      return;
    }

    if (!alertThreshold || Number(alertThreshold) < 0) {
      toast.error("请输入有效的预警金额");
      return;
    }
    if (isEnterpriseMode && alertRecipients.length === 0) {
      toast.error("请至少添加一名接收人");
      return;
    }

    const unavailableRecipient = isEnterpriseMode && alertRecipients.find((recipient) => {
      return !recipient.email.trim() && !recipient.phone.trim();
    });
    if (unavailableRecipient) {
      toast.error(`${unavailableRecipient.name.trim() || "未命名接收人"}没有可用的通知联系方式`);
      return;
    }

    const invalidEmailRecipient = isEnterpriseMode && alertRecipients.find(
      (recipient) => recipient.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email.trim()),
    );
    if (invalidEmailRecipient) {
      toast.error(`${invalidEmailRecipient.name.trim() || "未命名接收人"}的邮箱格式不正确`);
      return;
    }

    const invalidPhoneRecipient = isEnterpriseMode && alertRecipients.find(
      (recipient) => recipient.phone.trim() && !/^1\d{10}$/.test(recipient.phone.replace(/\s/g, "")),
    );
    if (invalidPhoneRecipient) {
      toast.error(`${invalidPhoneRecipient.name.trim() || "未命名接收人"}的手机号格式不正确`);
      return;
    }

    const normalizedEmails = alertRecipients
      .map((recipient) => recipient.email.trim().toLowerCase())
      .filter(Boolean);
    if (isEnterpriseMode && new Set(normalizedEmails).size !== normalizedEmails.length) {
      toast.error("接收人中存在重复邮箱，请修改后再保存");
      return;
    }

    const normalizedPhones = alertRecipients
      .map((recipient) => recipient.phone.replace(/\s/g, ""))
      .filter(Boolean);
    if (isEnterpriseMode && new Set(normalizedPhones).size !== normalizedPhones.length) {
      toast.error("接收人中存在重复手机号，请修改后再保存");
      return;
    }

    setSavingAlert(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSavedAlertSettings(serializedAlertSettings);
    setSavingAlert(false);
    toast.success("余额预警设置已保存");
  };

  const updateRecipient = (id: string, field: keyof Omit<AlertRecipient, "id">, value: string) => {
    setAlertRecipients((current) => current.map((recipient) => (
      recipient.id === id ? { ...recipient, [field]: value } : recipient
    )));
  };

  const addRecipient = () => {
    if (alertRecipients.length >= MAX_ALERT_RECIPIENTS) {
      toast.info(`最多添加 ${MAX_ALERT_RECIPIENTS} 名接收人`);
      return;
    }
    setAlertRecipients((current) => [
      ...current,
      { id: `recipient-${Date.now()}`, name: "", email: "", phone: "" },
    ]);
  };

  const removeRecipient = (id: string) => {
    setAlertRecipients((current) => current.filter((recipient) => recipient.id !== id));
  };

  const getEmailError = (recipient: AlertRecipient) => {
    const email = recipient.email.trim().toLowerCase();
    if (!email) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "邮箱格式不正确";
    if (alertRecipients.some((item) => item.id !== recipient.id && item.email.trim().toLowerCase() === email)) {
      return "该邮箱已添加";
    }
    return "";
  };

  const getPhoneError = (recipient: AlertRecipient) => {
    const phone = recipient.phone.replace(/\s/g, "");
    if (!phone) return "";
    if (!/^1\d{10}$/.test(phone)) return "请输入11位手机号";
    if (alertRecipients.some((item) => item.id !== recipient.id && item.phone.replace(/\s/g, "") === phone)) {
      return "该手机号已添加";
    }
    return "";
  };

  const hasRecipientFieldErrors = alertRecipients.some(
    (recipient) => Boolean(getEmailError(recipient) || getPhoneError(recipient)),
  );

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

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">充值余额</h1>
        <p className="text-muted-foreground mt-1 text-sm">查看企业充值余额及充值消耗记录</p>
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
          {/* 充值余额 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">充值余额</span>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              ¥{(balanceData?.balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* 代金券余额 */}
          <div className="flex-1 min-w-0">
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

          {/* 授信余额 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm">授信余额</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-white/70 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    平台授予企业的先用后付可用额度，账期内优先使用充值余额与代金券抵扣，不足部分由授信余额垫付；账单出账后需在约定期限内补缴。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              ¥{(balanceData?.credit_balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* 兑换码充值按钮 */}
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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">充值余额预警设置</h2>
              <Switch
                checked={alertEnabled}
                onCheckedChange={setAlertEnabled}
                aria-label="启用充值余额预警"
              />
              <span className="text-xs text-muted-foreground">{alertEnabled ? "已开启" : "已关闭"}</span>
            </div>
          </div>
          <div>
            <Button
              onClick={handleSaveAlert}
              disabled={savingAlert || !alertEnabled || !hasUnsavedAlertChanges || (isEnterpriseMode && hasRecipientFieldErrors)}
              size="sm"
            >
              {savingAlert ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="max-w-sm">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">预警金额（元）</Label>
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

          {isEnterpriseMode ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">通知接收人</Label>
                  <span className="text-xs text-muted-foreground">
                    {alertRecipients.length}/{MAX_ALERT_RECIPIENTS}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">接收人无需注册为企业成员；填写邮箱则发送邮件，填写手机号则发送短信，两项都填则同时发送。</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRecipient}
                disabled={alertRecipients.length >= MAX_ALERT_RECIPIENTS}
                title={alertRecipients.length >= MAX_ALERT_RECIPIENTS ? `最多添加 ${MAX_ALERT_RECIPIENTS} 名接收人` : undefined}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {alertRecipients.length >= MAX_ALERT_RECIPIENTS ? "已达上限" : "添加接收人"}
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="hidden grid-cols-[1fr_1.5fr_1.2fr_44px] gap-3 bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
                <span>接收人</span>
                <span>邮箱</span>
                <span>手机号</span>
                <span />
              </div>
              {alertRecipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <Inbox className="mb-2 h-7 w-7 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">暂未添加接收人</p>
                  <Button type="button" variant="link" size="sm" onClick={addRecipient}>添加接收人</Button>
                </div>
              ) : (
                alertRecipients.map((recipient, index) => {
                  const emailError = getEmailError(recipient);
                  const phoneError = getPhoneError(recipient);
                  return (
                    <div
                      key={recipient.id}
                      className="grid grid-cols-1 gap-3 border-t border-border px-4 py-3 first:border-t-0 md:grid-cols-[1fr_1.5fr_1.2fr_44px] md:items-start"
                    >
                      <Input
                        aria-label={`接收人 ${index + 1} 名称`}
                        placeholder="姓名或角色（选填）"
                        value={recipient.name}
                        onChange={(e) => updateRecipient(recipient.id, "name", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div>
                        <Input
                          type="email"
                          aria-label={`接收人 ${index + 1} 邮箱`}
                          aria-invalid={Boolean(emailError)}
                          placeholder="邮箱（选填）"
                          value={recipient.email}
                          onChange={(e) => updateRecipient(recipient.id, "email", e.target.value)}
                          className={`h-9 text-sm ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
                      </div>
                      <div>
                        <Input
                          type="tel"
                          aria-label={`接收人 ${index + 1} 手机号`}
                          aria-invalid={Boolean(phoneError)}
                          placeholder="手机号（选填）"
                          value={recipient.phone}
                          onChange={(e) => updateRecipient(recipient.id, "phone", e.target.value)}
                          className={`h-9 text-sm ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`删除接收人 ${index + 1}`}
                        onClick={() => removeRecipient(recipient.id)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              预警通知将发送至当前账号已绑定的邮箱和手机号。
            </p>
          )}

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
                  <SelectItem value="credit_recharge">授信充值</SelectItem>
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
                      {
                        r.type === "voucher_recharge" ? "代金券"
                          : r.type === "redeem_recharge" ? "兑换充值"
                          : r.type === "admin_recharge" ? "后台充值"
                          : r.type === "admin_adjust" ? "后台调额"
                          : "授信充值"
                      }
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
