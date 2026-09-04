import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getResellerDemoState, type DemoResellerRebateBill } from "@/lib/resellerDemo";
import AdminEnterprises from "./AdminEnterprises";
import AdminUsers from "./AdminUsers";

const money = (value = 0) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const points = (value = 0) => value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminResellerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<DemoResellerRebateBill | null>(null);
  const [fundTypeFilter, setFundTypeFilter] = useState("all");
  const state = getResellerDemoState();
  const reseller = state.resellers.find(item => item.id === id);
  if (!reseller) return <div className="p-6"><Button variant="ghost" onClick={() => navigate("/admin/console/resellers")}><ArrowLeft className="mr-2 h-4 w-4" />返回代理商列表</Button></div>;

  const ledger = state.ledger.filter(item => item.resellerId === reseller.id && ["platform_funding", "adjustment", "credit_adjustment"].includes(item.type));
  const filteredLedger = fundTypeFilter === "all" ? ledger : ledger.filter(item => item.type === fundTypeFilter);
  const ledgerTypeName = (type: string) => type === "platform_funding" ? "后台充值" : type === "adjustment" ? "后台调额" : type === "credit_adjustment" ? "授信充值" : "兑换充值";
  const downloadFundRecords = () => {
    const csv = [
      ["时间", "类型", "充值金额", "操作人", "备注"],
      ...filteredLedger.map(item => [new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false }), ledgerTypeName(item.type), item.amount.toFixed(2), item.operator || "-", item.remark || "-"]),
    ].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reseller.name}_充值记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const monthly = state.rebateBills.filter(item => item.resellerId === reseller.id && !item.period.includes("Q"));
  const allEnterpriseBills = state.bills.filter(item => item.resellerId === reseller.id && item.customerType === "enterprise");
  const catalogConsumed = allEnterpriseBills.reduce((sum, item) => sum + item.originalAmount, 0);
  const consumedPoints = catalogConsumed;
  const resellerConsumed = allEnterpriseBills.reduce((sum, item) => sum + item.actualConsumed, 0);
  const billsFor = (period: string) => state.bills.filter(item => item.resellerId === reseller.id && item.customerType === "enterprise" && item.period === period);
  const totals = (period: string, fallback: number) => {
    const rows = billsFor(period);
    const catalog = rows.reduce((sum, row) => sum + row.originalAmount, 0) || fallback;
    const consumedPoints = catalog;
    const platform = rows.reduce((sum, row) => sum + row.actualConsumed, 0) || catalog * .6;
    return { rows, catalog, consumedPoints, platform };
  };
  const previewRowsFor = (bill: DemoResellerRebateBill) => {
    const total = totals(bill.period, bill.consumptionAfterDiscount);
    if (total.rows.length) return total.rows;
    const samples = [
      { id: "mock-enterprise-1", customerName: "凯世通企业", weight: 0.36 },
      { id: "mock-enterprise-2", customerName: "远航科技", weight: 0.28 },
      { id: "mock-enterprise-3", customerName: "星云互动", weight: 0.21 },
      { id: "mock-enterprise-4", customerName: "新加坡区域客户", weight: 0.15 },
    ];
    return samples.map(item => ({
      id: item.id,
      customerName: item.customerName,
      originalAmount: total.catalog * item.weight,
      actualConsumed: total.platform * item.weight,
    }));
  };
  const downloadSettlementPreview = (bill: DemoResellerRebateBill) => {
    const rows = previewRowsFor(bill);
    const csv = [
      ["代理商", "账期", "企业名称", "目录总价消费", "消耗点数", "消费金额"],
      ...rows.map(row => [reseller.name, bill.period, row.customerName, row.originalAmount.toFixed(2), row.originalAmount.toFixed(2), row.actualConsumed.toFixed(2)]),
    ].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reseller.name}_${bill.period}_结算账单.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="p-6 space-y-5">
    <Button variant="ghost" className="-ml-2" onClick={() => navigate("/admin/console/resellers")}><ArrowLeft className="mr-2 h-4 w-4" />返回</Button>
    <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{reseller.logoDataUrl ? <img src={reseller.logoDataUrl} className="h-full w-full rounded-lg object-cover" /> : <Building2 />}</div><div><h1 className="text-xl font-semibold">{reseller.name}管理中心</h1><p className="text-sm text-muted-foreground">{reseller.domain}</p></div></div>
    <Tabs defaultValue="account"><TabsList><TabsTrigger value="account">账户余额</TabsTrigger><TabsTrigger value="bills">结算账单</TabsTrigger><TabsTrigger value="enterprises">企业管理</TabsTrigger><TabsTrigger value="users">用户管理</TabsTrigger></TabsList>
      <TabsContent value="account" className="space-y-4">
        <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">充值余额</p><p className="mt-3 text-2xl font-semibold">{money(reseller.balance)}</p><p className="mt-1 text-xs text-muted-foreground">累计充值 {money(reseller.totalFunded)}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">授信余额</p><p className="mt-3 text-2xl font-semibold">{money(reseller.creditBalance)}</p><p className="mt-1 text-xs text-muted-foreground">累计授信 {money(reseller.creditLimit)}</p></div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">充值记录</h2>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadFundRecords} className="h-9 text-primary"><Download className="mr-1.5 h-4 w-4" />下载</Button>
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
          <div className="grid grid-cols-[190px_150px_170px_160px_1fr] gap-3 border-b bg-blue-50/60 px-4 py-3 text-xs text-muted-foreground"><span>时间</span><span>类型</span><span>充值金额</span><span>操作人</span><span>备注</span></div>
          {filteredLedger.map(item => <div key={item.id} className="grid grid-cols-[190px_150px_170px_160px_1fr] items-center gap-3 border-b px-4 py-3 text-sm last:border-0"><span>{new Date(item.createdAt).toLocaleString("zh-CN", { hour12:false })}</span><span>{ledgerTypeName(item.type)}</span><span className={`font-medium tabular-nums ${item.amount >= 0 ? "text-green-600" : "text-orange-600"}`}>{item.amount >= 0 ? "+" : "-"}{money(Math.abs(item.amount))}</span><span>{item.operator || "-"}</span><span className="text-muted-foreground">{item.remark || "-"}</span></div>)}
          {filteredLedger.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">暂无充值记录</div>}
        </div>
      </TabsContent>
      <TabsContent value="bills" className="space-y-4">
        <div className="grid grid-cols-3 gap-4"><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">已发放客户点数</p><p className="mt-2 text-2xl font-semibold">{points(reseller.totalCustomerRecharge)}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计消耗点数</p><p className="mt-2 text-2xl font-semibold">{points(consumedPoints)}</p></div><div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">累计消费金额</p><p className="mt-2 text-2xl font-semibold">{money(resellerConsumed)}</p></div></div>
        <div className="overflow-x-auto rounded-xl border bg-card"><div className="min-w-[1050px]"><div className="grid grid-cols-[170px_100px_170px_160px_160px_180px_80px] gap-3 border-b bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><span>账单编号</span><span>账期</span><span>目录总价消费</span><span>消耗点数</span><span>消费金额</span><span>生成时间</span><span>预览</span></div>{monthly.map(item => { const total = totals(item.period,item.consumptionAfterDiscount); return <div key={item.id} className="grid grid-cols-[170px_100px_170px_160px_160px_180px_80px] gap-3 border-b px-4 py-3 text-sm"><span className="font-mono text-xs">{item.id}</span><span>{item.period}</span><span>{money(total.catalog)}</span><span>{points(total.consumedPoints)}</span><span className="font-medium">{money(total.platform)}</span><span>{new Date(item.createdAt).toLocaleString("zh-CN",{hour12:false})}</span><button className="text-primary hover:underline" onClick={() => setPreview(item)}>预览</button></div>})}</div></div>
      </TabsContent>
      <TabsContent value="enterprises" className="-mx-6 mt-4"><AdminEnterprises resellerScopeId={reseller.id} adminScope /></TabsContent>
      <TabsContent value="users" className="-mx-6 mt-4"><AdminUsers resellerScopeId={reseller.id} adminScope /></TabsContent>
    </Tabs>
    <Dialog open={!!preview} onOpenChange={open => !open && setPreview(null)}><DialogContent className="max-w-5xl"><DialogHeader><div className="flex items-center justify-between gap-4 pr-8"><DialogTitle>结算账单预览</DialogTitle>{preview && <Button type="button" variant="outline" size="sm" onClick={() => downloadSettlementPreview(preview)}><Download className="mr-1.5 h-4 w-4" />下载</Button>}</div></DialogHeader>{preview && (() => { const rows = previewRowsFor(preview); return <div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-[140px_100px_1fr_170px_160px_160px] gap-3 border-b bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><span>代理商</span><span>账期</span><span>企业名称</span><span>目录总价消费</span><span>消耗点数</span><span>消费金额</span></div>{rows.map(row => <div key={row.id} className="grid grid-cols-[140px_100px_1fr_170px_160px_160px] gap-3 border-b px-4 py-3 text-sm last:border-0"><span>{reseller.name}</span><span>{preview.period}</span><span>{row.customerName}</span><span>{money(row.originalAmount)}</span><span>{points(row.originalAmount)}</span><span>{money(row.actualConsumed)}</span></div>)}</div>; })()}</DialogContent></Dialog>
  </div>;
}
