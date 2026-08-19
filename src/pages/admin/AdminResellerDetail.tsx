import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CircleDollarSign, Download, ExternalLink, Landmark, ReceiptText, WalletCards } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getResellerDemoState, updateResellerFinanceSettings } from "@/lib/resellerDemo";
import { useToast } from "@/hooks/use-toast";
import AdminUsers from "./AdminUsers";
import AdminEnterprises from "./AdminEnterprises";

const money = (value = 0) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminResellerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [revision, setRevision] = useState(0);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
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
  const monthlyBills = rebateBills;
  const expandedBill = rebateBills.find((item) => item.id === expandedBillId);
  const getBillDetails = (bill: (typeof rebateBills)[number]) => {
    if (bill.period.includes("Q")) {
      return [
        { name: "2026-05", type: "月度汇总", consumed: 0.0844 },
        { name: "2026-06", type: "月度汇总", consumed: Math.max(0, bill.consumptionAfterDiscount - 0.0844) },
      ].map((item) => ({ ...item, rebate: bill.consumptionAfterDiscount ? item.consumed / bill.consumptionAfterDiscount * bill.rebateAmount : 0 }));
    }
    const rows = [
      { name: "MiniMax-M3-512k / MiniMax-M3-1m", type: "文本模型", weight: 0.62 },
      { name: "MiniMax-Hailuo-2.3 系列", type: "视频模型", weight: 0.24 },
      { name: "voice_design / speech-2.8-hd", type: "语音模型", weight: 0.1 },
      { name: "music-2.0", type: "音乐模型", weight: 0.04 },
    ];
    let allocated = 0;
    return rows.map((item, index) => {
      const consumed = index === rows.length - 1 ? bill.consumptionAfterDiscount - allocated : bill.consumptionAfterDiscount * item.weight;
      allocated += consumed;
      return { ...item, consumed, rebate: bill.consumptionAfterDiscount ? consumed / bill.consumptionAfterDiscount * bill.rebateAmount : 0 };
    });
  };

  const saveRebateRate = (form: HTMLFormElement) => {
    const data = new FormData(form);
    updateResellerFinanceSettings(reseller.id, Number(data.get("rebateRate")) / 100);
    toast({ title: "统一返佣比例已保存" });
  };

  const downloadBill = (bill: (typeof rebateBills)[number]) => {
    const rate = Math.round((reseller.commissionRate || 0) * 10000) / 100;
    const rows = getBillDetails(bill);
    const csv = [
      ["账单号", bill.id],
      ["账期", bill.period],
      ["统一返佣比例", `${rate}%`],
      [],
      ["模型明细", "用户实际消耗", "返佣比例", "返佣抵扣", "平台应计收"],
      ...rows.map((detail) => [detail.name, detail.consumed.toFixed(2), `${rate}%`, detail.rebate.toFixed(2), (detail.consumed - detail.rebate).toFixed(2)]),
      ["合计", bill.consumptionAfterDiscount.toFixed(2), "", bill.rebateAmount.toFixed(2), (bill.consumptionAfterDiscount - bill.rebateAmount).toFixed(2)],
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
    <Tabs defaultValue="account"><TabsList><TabsTrigger value="account">资金账户</TabsTrigger><TabsTrigger value="users">用户管理</TabsTrigger><TabsTrigger value="enterprises">企业管理</TabsTrigger><TabsTrigger value="bills">返佣结算</TabsTrigger></TabsList>
      <TabsContent value="account" className="mt-4 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>充值余额</span><WalletCards className="w-5 h-5 text-blue-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.balance)}</p><p className="text-xs text-muted-foreground mt-2">平台已实际充值到账的钱</p></div>
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>授信余额</span><Landmark className="w-5 h-5 text-violet-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.creditBalance)}</p><p className="text-xs text-muted-foreground mt-2">可先使用、后续再与平台结算</p></div>
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>已分配给用户/企业</span><CircleDollarSign className="w-5 h-5 text-orange-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.totalCustomerRecharge)}</p><p className="text-xs text-muted-foreground mt-2">代理商累计给名下客户充值的额度</p></div>
          <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>用户/企业实际消耗</span><ReceiptText className="w-5 h-5 text-green-500" /></div><p className="text-2xl font-semibold mt-3 tabular-nums">{money(reseller.actualCustomerConsumed)}</p><p className="text-xs text-muted-foreground mt-2">已分配额度中实际产生的消费</p></div>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden"><div className="px-4 py-3 border-b flex items-center gap-2 font-medium"><ReceiptText className="w-4 h-4" />资金流水<span className="ml-auto text-xs text-muted-foreground">共 {ledger.length} 条</span></div>
          <div className="grid grid-cols-[160px_120px_1fr_120px_120px_120px] gap-3 px-4 py-3 bg-muted/30 border-b text-xs text-muted-foreground"><span>时间</span><span>业务类型</span><span>对象 / 备注</span><span>变动金额</span><span>调整前</span><span>调整后</span></div>
          {ledger.map((item) => <div key={item.id} className="grid grid-cols-[160px_120px_1fr_120px_120px_120px] gap-3 px-4 py-3 border-b last:border-0 text-sm items-center"><span className="text-xs text-muted-foreground tabular-nums">{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span><span>{item.type === "platform_funding" ? "后台充值" : item.type === "customer_recharge" ? "客户划拨" : item.type === "credit_adjustment" ? "授信调整" : item.type === "commission" ? "佣金结算" : "后台调额"}</span><span className="truncate">{item.targetName ? `${item.targetName} · ` : ""}{item.remark}</span><span className={`font-medium tabular-nums ${item.amount >= 0 ? "text-green-600" : "text-orange-600"}`}>{item.amount >= 0 ? "+" : "-"}{money(Math.abs(item.amount))}</span><span className="tabular-nums text-muted-foreground">{money(item.balanceBefore)}</span><span className="tabular-nums font-medium">{money(item.balanceAfter)}</span></div>)}
          {ledger.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">暂无账目记录</div>}
        </div>
      </TabsContent>
      <TabsContent value="users" className="mt-4 -mx-6"><AdminUsers resellerScopeId={reseller.id} /></TabsContent>
      <TabsContent value="enterprises" className="mt-4 -mx-6"><AdminEnterprises resellerScopeId={reseller.id} /></TabsContent>
      <TabsContent value="bills" className="mt-4 space-y-4">
        <form className="rounded-xl border bg-card p-5 max-w-2xl" onSubmit={(event) => { event.preventDefault(); saveRebateRate(event.currentTarget); }}>
          <div className="mb-4"><h3 className="font-medium">返佣比例设置</h3><p className="text-xs text-muted-foreground mt-1">用户实际消耗乘以返佣比例作为结算抵扣，剩余金额由平台向代理商计收。</p></div>
          <div className="space-y-2"><Label htmlFor="rebate-rate">统一返佣比例</Label><div className="relative"><Input id="rebate-rate" name="rebateRate" type="number" min="0" max="100" step="0.01" defaultValue={(reseller.commissionRate || 0) * 100} className="pr-8" /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span></div></div>
          <Button type="submit" className="mt-4">保存返佣比例</Button>
        </form>
        <div><h3 className="font-medium">结算总览</h3><p className="text-xs text-muted-foreground mt-1">累计全部月度账单，季度汇总不重复计入</p></div>
        <div className="grid grid-cols-3 gap-4"><div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">用户实际消耗总额</p><p className="text-2xl font-semibold mt-2 tabular-nums">{money(monthlyBills.reduce((sum, item) => sum + item.consumptionAfterDiscount, 0))}</p></div><div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">返佣抵扣总额</p><p className="text-2xl font-semibold mt-2 tabular-nums text-green-600">-{money(monthlyBills.reduce((sum, item) => sum + item.rebateAmount, 0))}</p></div><div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">平台应计收总额</p><p className="text-2xl font-semibold mt-2 tabular-nums">{money(monthlyBills.reduce((sum, item) => sum + item.consumptionAfterDiscount - item.rebateAmount, 0))}</p></div></div>
        <div className="rounded-xl border bg-card overflow-hidden"><div className="px-4 py-3 border-b font-medium">代理商结算账单<span className="ml-2 text-xs font-normal text-muted-foreground">用户实际消耗扣除返佣抵扣后，剩余金额由平台计收</span></div><div className="grid grid-cols-[150px_85px_1fr_1fr_1fr_90px_150px] gap-3 px-4 py-3 border-b bg-muted/30 text-xs text-muted-foreground"><span>账单号</span><span>账期</span><span>用户实际消耗</span><span>返佣抵扣</span><span>平台应计收</span><span>状态</span><span className="text-right">操作</span></div>{rebateBills.map((item) => <div key={item.id} className="grid grid-cols-[150px_85px_1fr_1fr_1fr_90px_150px] gap-3 px-4 py-3 border-b last:border-0 items-center text-sm"><span className="font-mono text-xs">{item.id}</span><span>{item.period}</span><span className="tabular-nums">{money(item.consumptionAfterDiscount)}</span><span className="tabular-nums font-medium text-green-600">-{money(item.rebateAmount)}</span><span className="tabular-nums font-medium">{money(item.consumptionAfterDiscount - item.rebateAmount)}</span><Badge variant={item.status === "pending" ? "secondary" : "outline"} className="w-fit">{item.status === "paid" ? "已计收" : item.status === "confirmed" ? "已确认" : "待确认"}</Badge><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setExpandedBillId(item.id)}>预览</Button><Button type="button" variant="outline" size="sm" onClick={() => downloadBill(item)}><Download className="w-4 h-4 mr-1" />下载</Button></div></div>)}{rebateBills.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">暂无结算账单</div>}</div>
        <Dialog open={Boolean(expandedBill)} onOpenChange={(open) => { if (!open) setExpandedBillId(null); }}><DialogContent className="max-w-5xl p-0 overflow-hidden"><DialogHeader className="px-6 pt-6 pb-4 border-b"><DialogTitle>{expandedBill?.period} 代理商结算账单详情</DialogTitle><p className="text-xs text-muted-foreground">账单号 {expandedBill?.id} · 统一返佣比例 {Math.round((reseller.commissionRate || 0) * 10000) / 100}% · 生成时间 {expandedBill ? new Date(expandedBill.createdAt).toLocaleString("zh-CN", { hour12: false }) : "-"}</p></DialogHeader>{expandedBill && <div><div className="grid grid-cols-[1fr_160px_130px_170px] gap-3 px-6 py-3 border-b bg-muted/30 text-xs text-muted-foreground"><span>模型明细</span><span>用户实际消耗</span><span>返佣比例</span><span>平台应计收</span></div>{getBillDetails(expandedBill).map((detail, index) => <div key={`${detail.name}-${index}`} className="grid grid-cols-[1fr_160px_130px_170px] gap-3 px-6 py-3 border-b text-sm"><span className="font-medium truncate">{detail.name}</span><span className="tabular-nums">{money(detail.consumed)}</span><span>{Math.round((reseller.commissionRate || 0) * 10000) / 100}%</span><span className="tabular-nums font-medium">{money(detail.consumed - detail.rebate)}</span></div>)}<div className="px-6 py-4 bg-muted/20 grid grid-cols-3 gap-4 text-sm"><span>用户实际消耗合计<strong className="block mt-1 text-lg tabular-nums">{money(expandedBill.consumptionAfterDiscount)}</strong></span><span>返佣抵扣合计<strong className="block mt-1 text-lg text-green-600 tabular-nums">-{money(expandedBill.rebateAmount)}</strong></span><span>平台应计收<strong className="block mt-1 text-lg tabular-nums">{money(expandedBill.consumptionAfterDiscount - expandedBill.rebateAmount)}</strong></span></div></div>}</DialogContent></Dialog>
      </TabsContent>
    </Tabs>
  </div>;
}
