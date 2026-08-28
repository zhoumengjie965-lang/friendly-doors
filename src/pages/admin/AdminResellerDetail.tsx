import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CircleDollarSign, Download, ExternalLink, Landmark, Pencil, ReceiptText, WalletCards } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getResellerDemoState, updateResellerFinanceSettings } from "@/lib/resellerDemo";
import { useToast } from "@/hooks/use-toast";
import AdminUsers from "./AdminUsers";
import AdminEnterprises from "./AdminEnterprises";

const money = (value = 0) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
const billMoney = (value = 0) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;

export default function AdminResellerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [revision, setRevision] = useState(0);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [commissionEditOpen, setCommissionEditOpen] = useState(false);
  const [commissionRateDraft, setCommissionRateDraft] = useState("8");
  const [commissionUpdatedAt, setCommissionUpdatedAt] = useState("2026/06/01 09:00:00");
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("reseller-demo-changed", refresh);
    return () => window.removeEventListener("reseller-demo-changed", refresh);
  }, []);
  const state = (() => { void revision; return getResellerDemoState(); })();
  const reseller = state.resellers.find((item) => item.id === id);

  if (!reseller) return <div className="p-6"><Button variant="ghost" onClick={() => navigate("/admin/console/resellers")}><ArrowLeft className="w-4 h-4 mr-2" />返回代理商列表</Button><div className="mt-20 text-center text-muted-foreground">代理商不存在或已被删除</div></div>;
  const ledger = state.ledger.filter((item) => item.resellerId === reseller.id);
  const rebateBills = state.rebateBills.filter((item) => item.resellerId === reseller.id && !item.period.includes("Q"));
  const totalOriginalConsumption = rebateBills.reduce((sum, item) => sum + item.consumptionAfterDiscount, 0);
  const totalCommission = rebateBills.reduce((sum, item) => sum + item.rebateAmount, 0);
  const totalPlatformCharge = totalOriginalConsumption - totalCommission;
  const totalActualConsumption = totalOriginalConsumption * (reseller.customerDiscount ?? 1);
  const expandedBill = rebateBills.find((item) => item.id === expandedBillId);
  const getBillDetails = (bill: (typeof rebateBills)[number]) => {
    const enterpriseBills = state.bills.filter((item) => item.resellerId === reseller.id && item.customerType === "enterprise" && item.period === bill.period);
    const rows = enterpriseBills.length > 0 ? enterpriseBills.map((item) => ({ name: item.customerName, id: item.customerId, billId: item.id, weight: item.originalAmount })) : [
      { name: "凯世通企业", id: "mock-001", billId: "-", weight: 0.38 },
      { name: "远航研发中心", id: "demo-ent-001-2", billId: "-", weight: 0.27 },
      { name: "星云智能科技", id: "demo-ent-001-3", billId: "-", weight: 0.21 },
      { name: "启明数据服务", id: "demo-ent-001-4", billId: "-", weight: 0.14 },
    ];
    const totalWeight = rows.reduce((sum, item) => sum + item.weight, 0) || 1;
    return rows.map((item) => {
      const originalAmount = bill.consumptionAfterDiscount * item.weight / totalWeight;
      const commission = bill.rebateAmount * item.weight / totalWeight;
      return { ...item, actualAmount: originalAmount * (reseller.customerDiscount ?? 1), originalAmount, commission, chargeAmount: originalAmount - commission };
    });
  };

  const saveRebateRate = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const rate = Number(data.get("rebateRate"));
    updateResellerFinanceSettings(reseller.id, rate / 100);
    setCommissionRateDraft(String(rate));
    setCommissionUpdatedAt(new Date().toLocaleString("zh-CN", { hour12: false }));
    setCommissionEditOpen(false);
    toast({ title: "佣金规则已保存", description: "新比例将用于后续生成的代理商账单，历史账单不会变化。" });
  };

  const downloadBill = (bill: (typeof rebateBills)[number]) => {
    const rate = bill.consumptionAfterDiscount ? Math.round(bill.rebateAmount / bill.consumptionAfterDiscount * 10000) / 100 : 0;
    const rows = getBillDetails(bill);
    const csv = [
      ["账单号", bill.id],
      ["账期", bill.period],
      ["统一返佣比例", `${rate}%`],
      [],
      ["代理商", "账期", "企业名称", "实际消费", "目录总价", "返佣比例", "应返佣金额"],
      ...rows.map((detail) => [reseller.name, bill.period, detail.name, detail.actualAmount.toFixed(6), detail.originalAmount.toFixed(6), `${rate}%`, detail.commission.toFixed(6)]),
      ["合计", "", "", (bill.consumptionAfterDiscount * (reseller.customerDiscount ?? 1)).toFixed(6), bill.consumptionAfterDiscount.toFixed(6), "", bill.rebateAmount.toFixed(6)],
    ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bill.id}-结算账单.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "账单已下载" });
  };

  return <div className="p-6 space-y-5">
    <Button variant="ghost" className="-ml-2" onClick={() => navigate("/admin/console/resellers")}><ArrowLeft className="w-4 h-4 mr-2" />返回</Button>
    <div className="border rounded-xl bg-card px-5 py-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center overflow-hidden shrink-0">{reseller.logoDataUrl ? <img src={reseller.logoDataUrl} alt={`${reseller.name} Logo`} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}</div>
      <div><h1 className="text-xl font-semibold">{reseller.name}管理中心</h1></div>
      <a href={`https://${reseller.domain}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">{reseller.domain}<ExternalLink className="w-4 h-4" /></a>
    </div>
    <Tabs defaultValue="account"><TabsList><TabsTrigger value="account">资金账户</TabsTrigger><TabsTrigger value="bills">佣金结算</TabsTrigger><TabsTrigger value="enterprises">企业管理</TabsTrigger><TabsTrigger value="users">用户管理</TabsTrigger></TabsList>
      <TabsContent value="account" className="mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>充值余额</span><WalletCards className="w-5 h-5 text-blue-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.balance)}</p></div>
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>授信余额</span><Landmark className="w-5 h-5 text-violet-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.creditBalance)}</p></div>
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>已分配给用户/企业</span><CircleDollarSign className="w-5 h-5 text-orange-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.totalCustomerRecharge)}</p></div>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden"><div className="px-4 py-3 border-b flex items-center gap-2 font-medium"><ReceiptText className="w-4 h-4" />资金流水<span className="ml-auto text-xs text-muted-foreground">共 {ledger.length} 条</span></div>
          <div className="grid grid-cols-[170px_130px_140px_150px_1fr] gap-3 px-4 py-3 bg-muted/30 border-b text-xs text-muted-foreground"><span>时间</span><span>业务类型</span><span>变动金额</span><span>操作人</span><span>备注</span></div>
          {ledger.map((item) => <div key={item.id} className="grid grid-cols-[170px_130px_140px_150px_1fr] gap-3 px-4 py-3 border-b last:border-0 text-sm items-center"><span className="text-xs text-muted-foreground tabular-nums">{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span><span>{item.type === "platform_funding" ? "后台充值" : item.type === "customer_recharge" ? "客户划拨" : item.type === "credit_adjustment" ? "授信调整" : item.type === "commission" ? "佣金结算" : "后台调额"}</span><span className={`font-medium tabular-nums ${item.amount >= 0 ? "text-green-600" : "text-orange-600"}`}>{item.amount >= 0 ? "+" : "-"}{money(Math.abs(item.amount))}</span><span className="truncate">{item.operator || "-"}</span><span className="truncate">{item.targetName ? `${item.targetName} · ` : ""}{item.remark}</span></div>)}
          {ledger.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">暂无账目记录</div>}
        </div>
      </TabsContent>
      <TabsContent value="users" className="mt-4 -mx-6"><AdminUsers resellerScopeId={reseller.id} adminScope /></TabsContent>
      <TabsContent value="enterprises" className="mt-4 -mx-6"><AdminEnterprises resellerScopeId={reseller.id} adminScope /></TabsContent>
      <TabsContent value="bills" className="mt-4 space-y-4">
        <div className="rounded-xl border bg-card overflow-hidden"><div className="flex items-start justify-between gap-4 border-b px-5 py-4"><div><h3 className="font-medium">佣金规则</h3><p className="mt-1 text-xs text-muted-foreground">每月汇总代理商名下企业钱包账单的消费原价，并按佣金比例计算佣金及平台计收金额。</p></div><Button type="button" variant="outline" size="sm" onClick={() => { setCommissionRateDraft(String((reseller.commissionRate || 0) * 100)); setCommissionEditOpen(true); }}><Pencil className="mr-1.5 h-4 w-4" />编辑</Button></div><div className="grid grid-cols-3 gap-6 px-5 py-4"><div><p className="text-xs text-muted-foreground">当前佣金比例</p><p className="mt-1 text-xl font-semibold tabular-nums">{((reseller.commissionRate || 0) * 100).toFixed(2)}%</p></div><div><p className="text-xs text-muted-foreground">最近更新时间</p><p className="mt-1 text-sm">{commissionUpdatedAt}</p></div><div><p className="text-xs text-muted-foreground">操作人</p><p className="mt-1 text-sm">admin</p></div></div></div>
        <Dialog open={commissionEditOpen} onOpenChange={setCommissionEditOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>编辑佣金比例</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); saveRebateRate(event.currentTarget); }}><div className="space-y-2"><Label htmlFor="rebate-rate">佣金比例</Label><div className="relative"><Input id="rebate-rate" name="rebateRate" type="number" min="0" max="100" step="0.01" value={commissionRateDraft} onChange={(event) => setCommissionRateDraft(event.target.value)} className="pr-8" /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span></div></div><p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">新比例仅用于后续生成的代理商账单，已生成账单不会变化。</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCommissionEditOpen(false)}>取消</Button><Button type="submit">确认保存</Button></div></form></DialogContent></Dialog>
        <div className="grid grid-cols-3 gap-4"><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计消费原价金额</p><p className="mt-2 text-2xl font-semibold tabular-nums">{billMoney(totalOriginalConsumption)}</p><p className="mt-2 text-xs text-muted-foreground">累计消费实际金额：{billMoney(totalActualConsumption)}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计佣金</p><p className="mt-2 text-2xl font-semibold tabular-nums text-green-600">{billMoney(totalCommission)}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计平台计收</p><p className="mt-2 text-2xl font-semibold tabular-nums">{billMoney(totalPlatformCharge)}</p></div></div>
        <div className="rounded-xl border bg-card overflow-x-auto"><div className="min-w-[1030px]"><div className="px-4 py-3 border-b font-medium">代理商账单<span className="ml-2 text-xs font-normal text-muted-foreground">仅汇总企业钱包账单</span></div><div className="grid grid-cols-[160px_90px_150px_150px_150px_180px_80px] gap-3 px-4 py-3 border-b bg-muted/30 text-xs text-muted-foreground"><span>账单编号</span><span>账期</span><span>实际消费</span><span>目录总价</span><span>平台计收金额</span><span>生成时间</span><span className="text-right">操作</span></div>{rebateBills.map((item) => { const actualAmount = item.consumptionAfterDiscount * (reseller.customerDiscount ?? 1); return <div key={item.id} className="grid grid-cols-[160px_90px_150px_150px_150px_180px_80px] gap-3 px-4 py-3 border-b last:border-0 items-center text-sm"><span className="font-mono text-xs">{item.id}</span><span>{item.period}</span><span className="tabular-nums">{money(actualAmount)}</span><span className="tabular-nums">{money(item.consumptionAfterDiscount)}</span><span className="tabular-nums font-medium">{money(item.consumptionAfterDiscount - item.rebateAmount)}</span><span>{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span><div className="flex justify-end"><Button type="button" variant="outline" size="sm" onClick={() => setExpandedBillId(item.id)}>预览</Button></div></div>; })}{rebateBills.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">暂无代理商账单</div>}</div></div>
        <Dialog open={Boolean(expandedBill)} onOpenChange={(open) => { if (!open) setExpandedBillId(null); }}><DialogContent className="max-w-6xl p-0 overflow-hidden"><DialogHeader className="px-6 pt-6 pb-4 border-b"><DialogTitle>代理商账单</DialogTitle></DialogHeader>{expandedBill && <div><div className="grid grid-cols-[130px_100px_1.2fr_150px_150px_120px_150px] gap-3 px-6 py-3 border-b bg-muted/30 text-xs text-muted-foreground"><span>代理商</span><span>账期</span><span>企业名称</span><span>实际消费</span><span>目录总价</span><span>返佣比例</span><span>应返佣金额</span></div>{getBillDetails(expandedBill).map((detail, index) => <div key={`${detail.id}-${index}`} className="grid grid-cols-[130px_100px_1.2fr_150px_150px_120px_150px] gap-3 px-6 py-3 border-b text-sm"><span>{reseller.name}</span><span>{expandedBill.period}</span><span className="font-medium truncate">{detail.name}</span><span className="tabular-nums">{money(detail.actualAmount)}</span><span className="tabular-nums">{money(detail.originalAmount)}</span><span>{(expandedBill.rebateAmount / expandedBill.consumptionAfterDiscount * 100).toFixed(2)}%</span><span className="tabular-nums text-green-600">{money(detail.commission)}</span></div>)}<div className="grid grid-cols-[130px_100px_1.2fr_150px_150px_120px_150px] gap-3 bg-muted/20 px-6 py-4 text-sm font-medium"><span className="col-span-3">合计</span><span className="tabular-nums">{money(expandedBill.consumptionAfterDiscount * (reseller.customerDiscount ?? 1))}</span><span className="tabular-nums">{money(expandedBill.consumptionAfterDiscount)}</span><span>-</span><span className="tabular-nums text-green-600">{money(expandedBill.rebateAmount)}</span></div><div className="flex justify-end border-t px-6 py-3"><Button type="button" onClick={() => downloadBill(expandedBill)}><Download className="mr-1.5 h-4 w-4" />下载账单</Button></div></div>}</DialogContent></Dialog>
      </TabsContent>
    </Tabs>
  </div>;
}
