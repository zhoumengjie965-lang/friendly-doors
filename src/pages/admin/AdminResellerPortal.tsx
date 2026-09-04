import { useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getResellerDemoState, type DemoResellerBill } from "@/lib/resellerDemo";
import AdminUsers from "./AdminUsers";
import AdminEnterprises from "./AdminEnterprises";

const money = (value = 0) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const points = (value = 0) => value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pointNumber = (value = 0) => value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const billDetailRows = [
  { model: "MiniMax-M3", billingItem: "输入 / 输出 Token", unitPrice: 30.77, priceUnit: "元 / 百万 Tokens", usage: 128640, usageUnit: "Tokens", weight: 0.46 },
  { model: "GPT-4o", billingItem: "文本生成", unitPrice: 24.72, priceUnit: "元 / 百万 Tokens", usage: 111320, usageUnit: "Tokens", weight: 0.32 },
  { model: "Claude Sonnet 4.5", billingItem: "缓存命中", unitPrice: 20.13, priceUnit: "元 / 百万 Tokens", usage: 94000, usageUnit: "Tokens", weight: 0.22 },
];

type BalanceAlertRecipient = { id: string; name: string; email: string; phone: string };
type BalanceAlertSettings = { enabled: boolean; threshold: string; recipients: BalanceAlertRecipient[] };

const getBalanceAlertSettings = (resellerId: string): BalanceAlertSettings => {
  const fallback = { enabled: false, threshold: "10000", recipients: [] };
  try {
    const raw = localStorage.getItem(`reseller-balance-alert:${resellerId}`);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};

export default function AdminResellerPortal({ section }: { section: "users" | "enterprises" | "funds" | "bills" | "logs" }) {
  const { id = "agent-001" } = useParams();
  const initialAlertSettings = getBalanceAlertSettings(id);
  const [enterpriseKeyword, setEnterpriseKeyword] = useState("");
  const [userKeyword, setUserKeyword] = useState("");
  const [apiKeyKeyword, setApiKeyKeyword] = useState("");
  const [modelKeyword, setModelKeyword] = useState("");
  const [logTab, setLogTab] = useState("consumption");
  const [taskModelKeyword, setTaskModelKeyword] = useState("");
  const [taskIdKeyword, setTaskIdKeyword] = useState("");
  const [billMonth, setBillMonth] = useState("");
  const [billSubjectKeyword, setBillSubjectKeyword] = useState("");
  const [previewBill, setPreviewBill] = useState<DemoResellerBill | null>(null);
  const [fundTypeFilter, setFundTypeFilter] = useState("all");
  const [balanceAlertEnabled, setBalanceAlertEnabled] = useState(initialAlertSettings.enabled);
  const [balanceAlertThreshold, setBalanceAlertThreshold] = useState(initialAlertSettings.threshold);
  const [balanceAlertRecipients, setBalanceAlertRecipients] = useState<BalanceAlertRecipient[]>(initialAlertSettings.recipients);
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === id);
  if (!reseller) return <div className="p-6 text-center text-muted-foreground">代理商不存在</div>;
  const users = state.users.filter((item) => item.resellerId === id);
  const ledger = state.ledger.filter((item) => item.resellerId === id);
  const cashLedger = ledger.filter((item) => ["platform_funding", "adjustment", "credit_adjustment"].includes(item.type));
  const filteredCashLedger = fundTypeFilter === "all" ? cashLedger : cashLedger.filter((item) => item.type === fundTypeFilter);
  const ledgerTypeName = (type: string) => type === "platform_funding" ? "后台充值" : type === "adjustment" ? "后台调额" : type === "credit_adjustment" ? "授信充值" : "兑换充值";
  const downloadFundRecords = () => {
    const csv = [
      ["时间", "类型", "充值金额", "操作人", "备注"],
      ...filteredCashLedger.map((item) => [new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false }), ledgerTypeName(item.type), item.amount.toFixed(2), item.operator || "-", item.remark || "-"]),
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `代理商充值记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadCustomerBillDetails = (bill: DemoResellerBill) => {
    const csv = [
      ["客户名称", "账期", "模型名称", "计费项", "计费单价", "计费单位", "用量", "用量单位", "折扣率", "消耗点数"],
      ...billDetailRows.map(row => [bill.customerName, bill.period, row.model, row.billingItem, row.unitPrice.toFixed(2), row.priceUnit, row.usage, row.usageUnit, `${(bill.discount * 100).toFixed(2)}%`, (bill.settlementAmount * row.weight).toFixed(2)]),
      ["合计", "", "", "", "", "", "", "", "", bill.settlementAmount.toFixed(2)],
    ].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bill.customerName}_${bill.period}_点数账单.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const addBalanceAlertRecipient = () => {
    if (balanceAlertRecipients.length >= 5) return;
    setBalanceAlertRecipients((items) => [...items, { id: crypto.randomUUID(), name: "", email: "", phone: "" }]);
  };
  const updateBalanceAlertRecipient = (recipientId: string, field: "name" | "email" | "phone", value: string) => {
    setBalanceAlertRecipients((items) => items.map((item) => item.id === recipientId ? { ...item, [field]: value } : item));
  };
  const saveBalanceAlert = () => {
    if (balanceAlertEnabled && (!balanceAlertThreshold || Number(balanceAlertThreshold) < 0)) {
      toast.error("请输入有效的预警阈值");
      return;
    }
    if (balanceAlertEnabled && balanceAlertRecipients.length === 0) {
      toast.error("请至少添加一名通知接收人");
      return;
    }
    const invalidRecipient = balanceAlertRecipients.find((item) => !item.email.trim() && !item.phone.trim());
    if (balanceAlertEnabled && invalidRecipient) {
      toast.error("每位接收人至少填写邮箱或手机号");
      return;
    }
    localStorage.setItem(`reseller-balance-alert:${id}`, JSON.stringify({
      enabled: balanceAlertEnabled,
      threshold: balanceAlertThreshold,
      recipients: balanceAlertRecipients,
    }));
    toast.success("余额预警设置已保存");
  };
  const bills = state.bills.filter((item) => item.resellerId === id && item.customerType === "enterprise");
  const allocatedBudget = state.enterprises.filter((item) => item.resellerId === id).reduce((sum, item) => sum + (item.balance || 0), 0);
  const catalogTotal = bills.reduce((sum, item) => sum + item.originalAmount, 0);
  const customerBillTotal = bills.reduce((sum, item) => sum + item.settlementAmount, 0);
  const platformTotal = bills.reduce((sum, item) => sum + item.actualConsumed, 0);
  const filteredBills = bills.filter((item) => (!billMonth || item.period === billMonth)
    && item.customerName.toLowerCase().includes(billSubjectKeyword.trim().toLowerCase()));
  const primaryEnterpriseId = state.enterprises.find((item) => item.resellerId === id)?.enterpriseId;
  const primaryEnterpriseName = bills.find((item) => item.customerType === "enterprise" && item.customerId === primaryEnterpriseId)?.customerName || "未关联企业";
  const resellerRate = reseller.settlementRates?.["国内模型"] ?? 0.64;
  const logUsers = users.map((user, index) => ({ user, index })).filter(({ user, index }) => {
    const apiKey = `sk-agent-${index + 1}`;
    const model = index % 2 ? "MiniMax-Hailuo-2.3" : "MiniMax-M3";
    return primaryEnterpriseName.toLowerCase().includes(enterpriseKeyword.trim().toLowerCase())
      && `${user.name} ${user.phone}`.toLowerCase().includes(userKeyword.trim().toLowerCase())
      && apiKey.toLowerCase().includes(apiKeyKeyword.trim().toLowerCase())
      && model.toLowerCase().includes(modelKeyword.trim().toLowerCase());
  });
  const taskRows = users.slice(0, 5).map((user, index) => ({
    user,
    index,
    model: index % 2 ? "Hailuo-2.3" : "MiniMax-M3",
    taskId: `TASK-202608-${String(index + 1).padStart(3, "0")}`,
  })).filter(({ model, taskId }) => model.toLowerCase().includes(taskModelKeyword.trim().toLowerCase())
    && taskId.toLowerCase().includes(taskIdKeyword.trim().toLowerCase()));
  const title = { users: "用户管理", enterprises: "企业管理", funds: "账户余额", bills: "账单管理", logs: "调用日志" }[section];

  return <div className="p-6 space-y-5">
    <div><h1 className="text-xl font-semibold">{title}</h1></div>
    {section === "bills" && <div className="grid grid-cols-3 gap-4"><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">已发放客户点数</p><p className="mt-2 text-2xl font-semibold">{pointNumber(allocatedBudget)}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计消耗点数</p><p className="mt-2 text-2xl font-semibold">{pointNumber(catalogTotal)}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计消费金额</p><p className="mt-2 text-2xl font-semibold">{money(platformTotal)}</p></div></div>}
    {section === "users" && <div className="-mx-6"><AdminUsers resellerScopeId={id} /></div>}
    {section === "enterprises" && <div className="-mx-6"><AdminEnterprises resellerScopeId={id} /></div>}
    {section === "funds" && <>
      <div className="grid max-w-3xl grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">充值余额</p><p className="text-2xl font-semibold mt-2">{money(reseller.balance)}</p><p className="mt-1 text-xs text-muted-foreground">累计充值 {money(reseller.totalFunded)}</p></div>
        <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">授信余额</p><p className="text-2xl font-semibold mt-2">{money(reseller.creditBalance)}</p><p className="mt-1 text-xs text-muted-foreground">累计授信 {money(reseller.creditLimit)}</p></div>
      </div>
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-medium">可用余额预警</h2>
            <Switch checked={balanceAlertEnabled} onCheckedChange={setBalanceAlertEnabled} aria-label="开启可用余额预警" />
            <span className="text-xs text-muted-foreground">{balanceAlertEnabled ? "已开启" : "已关闭"}</span>
          </div>
          <Button type="button" size="sm" onClick={saveBalanceAlert}>保存设置</Button>
        </div>
        <div className="space-y-5 p-5">
          <div className="max-w-md space-y-1.5">
            <Label htmlFor="reseller-balance-alert-threshold">预警阈值</Label>
            <Input
              id="reseller-balance-alert-threshold"
              type="number"
              min="0"
              step="0.01"
              value={balanceAlertThreshold}
              onChange={(event) => setBalanceAlertThreshold(event.target.value)}
              disabled={!balanceAlertEnabled}
              placeholder="请输入预警金额"
            />
            <p className="text-xs text-muted-foreground">当可用余额低于预警金额时，将通过所选方式发送通知。</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><Label>通知接收人</Label><span className="text-xs text-muted-foreground">{balanceAlertRecipients.length}/5</span></div>
                <p className="mt-1 text-xs text-muted-foreground">填写邮箱发送邮件，填写手机号发送短信；两项都填则同时发送。</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBalanceAlertRecipient} disabled={!balanceAlertEnabled || balanceAlertRecipients.length >= 5}>
                <Plus className="mr-1.5 h-4 w-4" />添加接收人
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[1fr_1.5fr_1.2fr_44px] gap-3 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
                <span>接收人</span><span>邮箱</span><span>手机号</span><span />
              </div>
              {balanceAlertRecipients.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">暂未添加接收人</div> : balanceAlertRecipients.map((recipient) => <div key={recipient.id} className="grid grid-cols-[1fr_1.5fr_1.2fr_44px] items-center gap-3 border-t px-4 py-3">
                <Input value={recipient.name} onChange={(event) => updateBalanceAlertRecipient(recipient.id, "name", event.target.value)} placeholder="姓名或角色" disabled={!balanceAlertEnabled} />
                <Input type="email" value={recipient.email} onChange={(event) => updateBalanceAlertRecipient(recipient.id, "email", event.target.value)} placeholder="邮箱（选填）" disabled={!balanceAlertEnabled} />
                <Input value={recipient.phone} onChange={(event) => updateBalanceAlertRecipient(recipient.id, "phone", event.target.value)} placeholder="手机号（选填）" disabled={!balanceAlertEnabled} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setBalanceAlertRecipients((items) => items.filter((item) => item.id !== recipient.id))} disabled={!balanceAlertEnabled} aria-label="删除接收人">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-medium">充值记录</h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadFundRecords} className="h-9 text-primary">
              <Download className="mr-1.5 h-4 w-4" />下载
            </Button>
            <Select value={fundTypeFilter} onValueChange={setFundTypeFilter}>
              <SelectTrigger aria-label="充值类型筛选" className="h-9 w-[132px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="voucher">兑换充值</SelectItem>
                <SelectItem value="platform_funding">后台充值</SelectItem>
                <SelectItem value="adjustment">后台调额</SelectItem>
                <SelectItem value="credit_adjustment">授信充值</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-[190px_150px_170px_160px_1fr] gap-3 border-b bg-blue-50/60 px-4 py-3 text-xs text-muted-foreground">
          <span>时间</span><span>类型</span><span>充值金额</span><span>操作人</span><span>备注</span>
        </div>
        {filteredCashLedger.map((item) => <div key={item.id} className="grid grid-cols-[190px_150px_170px_160px_1fr] items-center gap-3 border-b px-4 py-3 text-sm last:border-0">
          <span>{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
          <span>{ledgerTypeName(item.type)}</span>
          <span className={`font-medium tabular-nums ${item.amount >= 0 ? "text-green-600" : "text-orange-600"}`}>{item.amount >= 0 ? "+" : "-"}{money(Math.abs(item.amount))}</span>
          <span>{item.operator || "-"}</span>
          <span className="text-muted-foreground">{item.remark || "-"}</span>
        </div>)}
        {filteredCashLedger.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">暂无充值记录</div>}
      </div>
    </>}
    {section === "bills" && <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <input type="month" value={billMonth} onChange={(event) => setBillMonth(event.target.value)} aria-label="选择年月" className="h-9 rounded-md border bg-background px-3 text-sm" />
        <input value={billSubjectKeyword} onChange={(event) => setBillSubjectKeyword(event.target.value)} placeholder="搜索主体名称" className="h-9 min-w-[200px] rounded-md border bg-background px-3 text-sm" />
        <button type="button" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">查询</button>
        <button type="button" onClick={() => { setBillMonth(""); setBillSubjectKeyword(""); }} className="h-9 rounded-md border px-4 text-sm">重置</button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="min-w-[1120px]">
          <div className="grid grid-cols-[170px_120px_1fr_170px_100px_140px_180px_80px] gap-3 border-b bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <span>账单编号</span><span>空间类型</span><span>主体名称</span><span>ID</span><span>账期</span><span>消耗点数</span><span>生成时间</span><span className="text-right">操作</span>
          </div>
          {filteredBills.map((item) => <div key={item.id} className="grid grid-cols-[170px_120px_1fr_170px_100px_140px_180px_80px] items-center gap-3 border-b px-4 py-3 text-sm last:border-0">
            <span className="font-mono text-xs">{item.id}</span><Badge variant="secondary" className="w-fit">企业空间</Badge><span className="truncate font-medium">{item.customerName}</span><span className="truncate font-mono text-xs">{item.customerId}</span><span>{item.period}</span><span className="tabular-nums">{pointNumber(item.settlementAmount)}</span><span>{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span><button type="button" onClick={() => setPreviewBill(item)} className="text-right text-sm text-primary hover:underline">预览</button>
          </div>)}
          {filteredBills.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">暂无匹配账单</div>}
        </div>
      </div>
      <Dialog open={Boolean(previewBill)} onOpenChange={(open) => { if (!open) setPreviewBill(null); }}>
        <DialogContent className="w-[calc(100vw-48px)] max-w-[1240px] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex items-center justify-between gap-4 pr-7">
              <div className="flex items-center gap-2"><DialogTitle>账单明细报告</DialogTitle><Badge className="border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-50">待确认</Badge></div>
            </div>
          </DialogHeader>
          {previewBill && <div className="space-y-4 p-6">
            <h3 className="border-l-4 border-blue-500 pl-2 text-sm font-medium">按量消费明细</h3>
            <div className="overflow-x-auto rounded-lg border">
              <div className="min-w-[1038px]">
                <div className="grid grid-cols-[110px_75px_125px_110px_70px_105px_75px_75px_65px_95px] gap-3 border-b bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <span>客户名称</span><span>账期</span><span>模型名称</span><span>计费项</span><span className="text-right">计费单价</span><span>计费单位</span><span className="text-right">用量</span><span>用量单位</span><span>折扣率</span><span className="text-right">消耗点数</span>
                </div>
                {billDetailRows.map((row) => <div key={row.model} className="grid grid-cols-[110px_75px_125px_110px_70px_105px_75px_75px_65px_95px] items-center gap-3 border-b px-4 py-3 text-sm last:border-0">
                  <span className="truncate" title={previewBill.customerName}>{previewBill.customerName}</span><span>{previewBill.period}</span><span><Badge variant="outline" className="font-mono font-normal">{row.model}</Badge></span><span>{row.billingItem}</span><span className="text-right font-mono">{row.unitPrice.toFixed(2)}</span><span>{row.priceUnit}</span><span className="text-right font-mono">{row.usage.toLocaleString()}</span><span>{row.usageUnit}</span><span className="text-emerald-600">{(previewBill.discount * 100).toFixed(2)}%</span><span className="text-right font-mono font-medium">{pointNumber(previewBill.settlementAmount * row.weight)}</span>
                </div>)}
                <div className="grid grid-cols-[110px_75px_125px_110px_70px_105px_75px_75px_65px_95px] gap-3 bg-muted/20 px-4 py-3 text-sm font-medium">
                  <span className="col-span-8">合计</span><span>-</span><span className="text-right font-mono">{pointNumber(previewBill.settlementAmount)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => downloadCustomerBillDetails(previewBill)}><Download className="mr-1.5 h-4 w-4" />下载</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>}
    {section === "logs" && <Tabs value={logTab} onValueChange={setLogTab} className="space-y-4">
      <TabsList><TabsTrigger value="consumption">使用日志</TabsTrigger><TabsTrigger value="tasks">任务日志</TabsTrigger></TabsList>
      {logTab === "tasks" ? <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-3"><label className="text-sm text-muted-foreground">提交时间</label><input type="datetime-local" step="1" defaultValue="2026-08-18T00:00:00" className="h-9 rounded-md border bg-background px-3 text-sm" /><span className="text-muted-foreground">至</span><input type="datetime-local" step="1" defaultValue="2026-08-25T23:59:59" className="h-9 rounded-md border bg-background px-3 text-sm" /><label className="text-sm text-muted-foreground">模型</label><input value={taskModelKeyword} onChange={(event) => setTaskModelKeyword(event.target.value)} placeholder="请输入模型名称" className="h-9 min-w-[160px] flex-1 rounded-md border bg-background px-3 text-sm" /><label className="text-sm text-muted-foreground">任务 ID</label><input value={taskIdKeyword} onChange={(event) => setTaskIdKeyword(event.target.value)} placeholder="请输入任务 ID" className="h-9 min-w-[160px] flex-1 rounded-md border bg-background px-3 text-sm" /><button type="button" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">搜索</button><button type="button" onClick={() => { setTaskModelKeyword(""); setTaskIdKeyword(""); }} className="h-9 rounded-md border px-4 text-sm">重置</button></div> : <div className="rounded-xl border bg-card p-3 space-y-3"><div className="flex flex-wrap items-center gap-3"><label className="text-sm text-muted-foreground">时间</label><input type="datetime-local" step="1" defaultValue="2026-08-01T00:00:00" className="h-9 rounded-md border bg-background px-3 text-sm" /><span className="text-muted-foreground">至</span><input type="datetime-local" step="1" defaultValue="2026-08-20T23:59:59" className="h-9 rounded-md border bg-background px-3 text-sm" /></div><div className="flex flex-wrap items-center gap-3"><input value={enterpriseKeyword} onChange={(event) => setEnterpriseKeyword(event.target.value)} placeholder="搜索企业名称" className="h-9 min-w-[180px] flex-1 rounded-md border bg-background px-3 text-sm" /><input value={userKeyword} onChange={(event) => setUserKeyword(event.target.value)} placeholder="搜索用户名 / 用户 ID" className="h-9 min-w-[180px] flex-1 rounded-md border bg-background px-3 text-sm" /><input value={apiKeyKeyword} onChange={(event) => setApiKeyKeyword(event.target.value)} placeholder="搜索 API Key" className="h-9 min-w-[180px] flex-1 rounded-md border bg-background px-3 text-sm" /><input value={modelKeyword} onChange={(event) => setModelKeyword(event.target.value)} placeholder="搜索模型" className="h-9 min-w-[180px] flex-1 rounded-md border bg-background px-3 text-sm" /><button type="button" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">搜索</button><button type="button" onClick={() => { setEnterpriseKeyword(""); setUserKeyword(""); setApiKeyKeyword(""); setModelKeyword(""); }} className="h-9 rounded-md border px-4 text-sm">重置</button><button type="button" className="h-9 rounded-md border px-4 text-sm">导出</button></div></div>}
      <TabsContent value="consumption"><div className="rounded-xl border bg-card overflow-x-auto"><div className="min-w-[1880px]"><div className="grid grid-cols-[165px_130px_150px_150px_100px_120px_100px_190px_120px_100px_100px_120px_120px_120px_80px] gap-3 px-4 py-3 bg-muted/30 border-b text-xs text-muted-foreground"><span>时间</span><span>用户 ID</span><span>API Key</span><span>企业</span><span>部门</span><span>成员</span><span>类型</span><span>模型</span><span>用时/首字</span><span>输入</span><span>输出</span><span>计费方式</span><span>消耗点数</span><span>消费金额</span><span>详情</span></div>{logUsers.slice(0, 5).map(({ user, index }) => { const resellerDebit = 18.6 + index * 7.35; const customerDebit = resellerDebit / resellerRate; return <div key={`consumption-${user.phone}`} className="grid grid-cols-[165px_130px_150px_150px_100px_120px_100px_190px_120px_100px_100px_120px_120px_120px_80px] gap-3 px-4 py-3 border-b last:border-0 text-sm items-center"><span>2026/8/{16 - index} 14:2{index}:18</span><span className="font-mono text-xs">{user.phone}</span><span className="font-mono text-xs">sk-agent-{index + 1}</span><span className="truncate">{primaryEnterpriseName}</span><span>默认部门</span><span>{user.name}</span><span className={index % 2 ? "text-red-600" : "text-foreground"}>{index % 2 ? "错误" : "消费"}</span><span>{index % 2 ? "MiniMax-Hailuo-2.3" : "MiniMax-M3"}</span><span>{index % 2 ? `${3 + index}分${18 + index}秒` : `1.2s / 0.4s`}</span><span>{(8640 + index * 1100).toLocaleString()}</span><span>{(4200 + index * 760).toLocaleString()}</span><span>按量计费</span><span className="tabular-nums">{index % 2 ? points(0) : points(customerDebit)}</span><span className="tabular-nums">{index % 2 ? money(0) : money(resellerDebit)}</span><button type="button" className="text-primary hover:underline">查看</button></div>; })}</div></div></TabsContent>
      <TabsContent value="tasks"><div className="rounded-xl border bg-card overflow-x-auto"><div className="min-w-[1450px]"><div className="grid grid-cols-[170px_170px_120px_120px_190px_130px_190px_120px_100px_80px] gap-3 px-4 py-3 bg-muted/30 border-b text-xs text-muted-foreground"><span>提交时间</span><span>结束时间</span><span>花费时间</span><span>企业</span><span>模型</span><span>类型</span><span>任务 ID</span><span>任务状态</span><span>进度</span><span>详情</span></div>{taskRows.map(({ user, index, model, taskId }) => { const running = index === 2; return <div key={`task-${user.phone}`} className="grid grid-cols-[170px_170px_120px_120px_190px_130px_190px_120px_100px_80px] gap-3 px-4 py-3 border-b last:border-0 text-sm items-center"><span>2026/8/{15 - index} 10:3{index}:26</span><span>{running ? "-" : `2026/8/${15 - index} 10:${33 + index}:44`}</span><span>{2 + index}分{18 + index * 3}秒</span><span className="truncate">{primaryEnterpriseName}</span><span>{model}</span><span>{index % 2 ? "视频生成" : "批量推理"}</span><span className="font-mono text-xs">{taskId}</span><Badge variant={running ? "secondary" : "outline"} className="w-fit">{running ? "执行中" : "已完成"}</Badge><span>{running ? "68%" : "100%"}</span><button type="button" className="text-primary hover:underline">查看</button></div>; })}</div></div></TabsContent>
    </Tabs>}
  </div>;
}
