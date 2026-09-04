import { useState } from "react";
import { Check, ChevronsUpDown, Download, Eye, KeyRound, Plus, ReceiptText, RefreshCw, Trash2, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Account = { id: number; supplier: string; pullTime: string; enabled: boolean };
type ModelDiscount = { model: string; discount: string };
type KeyMapping = { id: number; accountId: number; key: string; credentialConfigured: boolean; customer: string; discount: string; modelDiscounts: ModelDiscount[]; enabled?: boolean };
type BillDetail = { model: string; billingItem: string; unitPrice: number; priceUnit: string; usage: number; usageUnit: string; catalogAmount: number; discount: string; actualAmount: number; couponAmount: number; balanceAmount: number; creditAmount: number };
type Bill = { id: number; date: string; customer: string; supplier: string; keyName: string; calls: number; tokens: number; catalog: number; customerDiscount: string; receivable: number; status: "generated" | "failed"; generatedAt?: string; details: BillDetail[] };
type KeyBalance = { totalRecharge: number; totalConsumption: number };
type RechargeRecord = { id: number; mappingId: number; createdAt: string; amount: number; operator: string; remark: string; cumulativeAmount: number };

const customers = ["星海科技有限公司", "远山智能有限公司", "云杉网络有限公司", "北辰数据有限公司"];
const initialAccounts: Account[] = [
  { id: 1, supplier: "DeepSeek", pullTime: "02:00", enabled: true },
  { id: 2, supplier: "智谱 AI", pullTime: "02:30", enabled: true },
  { id: 3, supplier: "阿里云百炼", pullTime: "03:00", enabled: false },
];
const initialMappings: KeyMapping[] = [
  { id: 1, accountId: 1, key: "星海生产环境", credentialConfigured: true, customer: "星海科技有限公司", discount: "85", modelDiscounts: [] },
  { id: 2, accountId: 1, key: "远山智能助手", credentialConfigured: true, customer: "远山智能有限公司", discount: "90", modelDiscounts: [] },
  { id: 3, accountId: 1, key: "云杉客服应用", credentialConfigured: true, customer: "云杉网络有限公司", discount: "88", modelDiscounts: [] },
  { id: 6, accountId: 2, key: "星海 GLM 生产", credentialConfigured: true, customer: "星海科技有限公司", discount: "95", modelDiscounts: [{ model: "glm-4-plus", discount: "85" }, { model: "glm-4-air", discount: "90" }] },
  { id: 9, accountId: 3, key: "云杉百炼生产", credentialConfigured: true, customer: "云杉网络有限公司", discount: "88", modelDiscounts: [] },
];
const bills: Bill[] = [
  { id: 1, date: "2026-08-24", customer: "星海科技有限公司", supplier: "智谱 AI", keyName: "星海 GLM 生产", calls: 12860, tokens: 10456600, catalog: 1536.04, customerDiscount: "多个折扣", receivable: 1344.63, status: "generated", generatedAt: "2026-08-25 02:36", details: [
    { model: "glm-4-plus", billingItem: "输入", unitPrice: 1.00, priceUnit: "元/百万 Tokens", usage: 724.02, usageUnit: "百万 Tokens", catalogAmount: 724.02, discount: "85%", actualAmount: 615.42, couponAmount: 0, balanceAmount: 615.42, creditAmount: 0 },
    { model: "glm-4-plus", billingItem: "输出", unitPrice: 0.66, priceUnit: "元/百万 Tokens", usage: 321.64, usageUnit: "百万 Tokens", catalogAmount: 212.02, discount: "85%", actualAmount: 180.21, couponAmount: 0, balanceAmount: 180.21, creditAmount: 0 },
    { model: "glm-4-air", billingItem: "输入", unitPrice: 0.50, priceUnit: "元/百万 Tokens", usage: 600.00, usageUnit: "百万 Tokens", catalogAmount: 300.00, discount: "90%", actualAmount: 270.00, couponAmount: 0, balanceAmount: 270.00, creditAmount: 0 },
    { model: "glm-4-air", billingItem: "输出", unitPrice: 1.00, priceUnit: "元/百万 Tokens", usage: 120.00, usageUnit: "百万 Tokens", catalogAmount: 120.00, discount: "90%", actualAmount: 108.00, couponAmount: 0, balanceAmount: 108.00, creditAmount: 0 },
    { model: "glm-4-flash", billingItem: "输入", unitPrice: 0.10, priceUnit: "元/百万 Tokens", usage: 1000.00, usageUnit: "百万 Tokens", catalogAmount: 100.00, discount: "95%", actualAmount: 95.00, couponAmount: 0, balanceAmount: 95.00, creditAmount: 0 },
    { model: "glm-4-flash", billingItem: "输出", unitPrice: 0.20, priceUnit: "元/百万 Tokens", usage: 400.00, usageUnit: "百万 Tokens", catalogAmount: 80.00, discount: "95%", actualAmount: 76.00, couponAmount: 0, balanceAmount: 76.00, creditAmount: 0 },
  ]},
  { id: 2, date: "2026-08-24", customer: "远山智能有限公司", supplier: "DeepSeek", keyName: "远山智能助手", calls: 5560, tokens: 2403832, catalog: 350, customerDiscount: "90%", receivable: 315, status: "generated", generatedAt: "2026-08-25 02:08", details: [
    { model: "deepseek-reasoner", billingItem: "输入", unitPrice: 1.00, priceUnit: "元/百万 Tokens", usage: 148.08, usageUnit: "百万 Tokens", catalogAmount: 148.08, discount: "90%", actualAmount: 133.27, couponAmount: 0, balanceAmount: 133.27, creditAmount: 0 },
    { model: "deepseek-reasoner", billingItem: "输出", unitPrice: 2.00, priceUnit: "元/百万 Tokens", usage: 92.30, usageUnit: "百万 Tokens", catalogAmount: 201.92, discount: "90%", actualAmount: 181.73, couponAmount: 0, balanceAmount: 181.73, creditAmount: 0 },
  ]},
  { id: 3, date: "2026-08-24", customer: "北辰数据有限公司", supplier: "智谱 AI", keyName: "北辰 GLM 生产", calls: 3280, tokens: 1842000, catalog: 420, customerDiscount: "—", receivable: 0, status: "failed", details: [] },
];

const money = (value: number) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const count = (value: number) => value.toLocaleString("zh-CN");

const initialKeyBalances: Record<number, KeyBalance> = {
  1: { totalRecharge: 10000, totalConsumption: 3268.42 },
  2: { totalRecharge: 5000, totalConsumption: 1285.6 },
  3: { totalRecharge: 8000, totalConsumption: 2450 },
  6: { totalRecharge: 20000, totalConsumption: 8654.37 },
  9: { totalRecharge: 6000, totalConsumption: 1800 },
};
const initialRechargeRecords: RechargeRecord[] = [
  { id: 1, mappingId: 6, createdAt: "2026-08-20 10:18", amount: 12000, operator: "admin", remark: "客户首笔预充值", cumulativeAmount: 12000 },
  { id: 2, mappingId: 6, createdAt: "2026-08-24 16:42", amount: 8000, operator: "finance_zhou", remark: "客户追加充值", cumulativeAmount: 20000 },
  { id: 3, mappingId: 2, createdAt: "2026-08-18 09:30", amount: 5000, operator: "admin", remark: "合同预充值到账", cumulativeAmount: 5000 },
];

export default function AdminOfficialKeyData() {
  const { toast } = useToast();
  const [tab, setTab] = useState("accounts");
  const accounts = initialAccounts;
  const [mappings, setMappings] = useState(initialMappings);
  const [keyBalances, setKeyBalances] = useState(initialKeyBalances);
  const [rechargeRecords, setRechargeRecords] = useState(initialRechargeRecords);
  const [rechargeMapping, setRechargeMapping] = useState<KeyMapping | null>(null);
  const [rechargeHistoryMapping, setRechargeHistoryMapping] = useState<KeyMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<KeyMapping | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [mappingDialog, setMappingDialog] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<KeyMapping | null>(null);
  const [mappingForm, setMappingForm] = useState<{ accountId: number; key: string; secret: string; customer: string; discount: string; modelDiscounts: ModelDiscount[] }>({ accountId: initialAccounts[0].id, key: "", secret: "", customer: "", discount: "80", modelDiscounts: [] });
  const [keySupplierFilter, setKeySupplierFilter] = useState("all");
  const [keyKeyword, setKeyKeyword] = useState("");
  const [billStartDate, setBillStartDate] = useState("2026-08-18");
  const [billEndDate, setBillEndDate] = useState("2026-08-24");
  const [billSupplierFilter, setBillSupplierFilter] = useState("all");
  const [billKeyword, setBillKeyword] = useState("");
  const [detailBill, setDetailBill] = useState<Bill | null>(null);

  const supplierOptions = accounts.map((account) => account.supplier);
  const normalizedKeyKeyword = keyKeyword.trim().toLowerCase();
  const shownMappings = mappings.filter((item) => (keySupplierFilter === "all" || String(item.accountId) === keySupplierFilter) && (!normalizedKeyKeyword || item.key.toLowerCase().includes(normalizedKeyKeyword) || item.customer.toLowerCase().includes(normalizedKeyKeyword)));
  const canDeleteMapping = (mapping: KeyMapping) => {
    const balance = keyBalances[mapping.id];
    return !(balance?.totalRecharge || balance?.totalConsumption || rechargeRecords.some((record) => record.mappingId === mapping.id) || bills.some((bill) => bill.keyName === mapping.key && bill.customer === mapping.customer));
  };
  const normalizedBillKeyword = billKeyword.trim().toLowerCase();
  const shownBills = bills.filter((bill) => bill.date >= billStartDate && bill.date <= billEndDate && (billSupplierFilter === "all" || bill.supplier === billSupplierFilter) && (!normalizedBillKeyword || bill.customer.toLowerCase().includes(normalizedBillKeyword) || bill.keyName.toLowerCase().includes(normalizedBillKeyword))).sort((a, b) => b.date.localeCompare(a.date));
  const detailGroups = detailBill ? [...new Set(detailBill.details.map((row) => row.model))].map((model) => {
    const rows = detailBill.details.filter((row) => row.model === model);
    return {
      model,
      rows,
      discount: rows[0]?.discount || "—",
      catalogAmount: rows.reduce((sum, row) => sum + row.catalogAmount, 0),
      actualAmount: rows.reduce((sum, row) => sum + row.actualAmount, 0),
      couponAmount: rows.reduce((sum, row) => sum + row.couponAmount, 0),
      balanceAmount: rows.reduce((sum, row) => sum + row.balanceAmount, 0),
      creditAmount: rows.reduce((sum, row) => sum + row.creditAmount, 0),
    };
  }) : [];

  const openMapping = (mapping?: KeyMapping) => {
    setEditingMapping(mapping || null);
    setMappingForm(mapping ? { accountId: mapping.accountId, key: mapping.key, secret: "", customer: mapping.customer, discount: mapping.discount, modelDiscounts: mapping.modelDiscounts } : { accountId: initialAccounts[0].id, key: "", secret: "", customer: "", discount: "80", modelDiscounts: [] });
    setMappingDialog(true);
  };
  const saveMapping = () => {
    const fallbackDiscount = Number(mappingForm.discount);
    const normalizedRules = mappingForm.modelDiscounts.map((item) => ({ model: item.model.trim(), discount: item.discount }));
    const discountsValid = Number.isFinite(fallbackDiscount) && fallbackDiscount > 0 && fallbackDiscount <= 100 && normalizedRules.every((item) => item.model && Number.isFinite(Number(item.discount)) && Number(item.discount) > 0 && Number(item.discount) <= 100);
    if (!mappingForm.accountId || !mappingForm.key.trim() || (!editingMapping?.credentialConfigured && !mappingForm.secret) || !mappingForm.customer || !discountsValid) return toast({ title: "请完善供应商、Key、密钥、客户和折扣规则", description: "折扣必须大于 0% 且不超过 100%", variant: "destructive" });
    const normalizedModelIds = normalizedRules.map((item) => item.model.toLowerCase());
    if (new Set(normalizedModelIds).size !== normalizedModelIds.length) return toast({ title: "模型 ID 不能重复", description: "请合并重复模型的特殊折扣规则", variant: "destructive" });
    const value: KeyMapping = { id: editingMapping?.id || Date.now(), accountId: mappingForm.accountId, key: mappingForm.key.trim(), credentialConfigured: editingMapping?.credentialConfigured || !!mappingForm.secret, customer: mappingForm.customer, discount: mappingForm.discount, modelDiscounts: normalizedRules, enabled: editingMapping?.enabled ?? true };
    setMappings((items) => editingMapping ? items.map((item) => item.id === editingMapping.id ? value : item) : [...items, value]);
    if (!editingMapping) setKeyBalances((items) => ({ ...items, [value.id]: { totalRecharge: 0, totalConsumption: 0 } }));
    setMappingDialog(false);
    toast({ title: editingMapping ? "Key 已更新" : "Key 已新增" });
  };

  const openRecharge = (mapping: KeyMapping) => {
    setRechargeMapping(mapping);
    setRechargeAmount("");
    setRechargeRemark("");
  };
  const saveRecharge = () => {
    const amount = Number(rechargeAmount);
    if (!rechargeMapping || !Number.isFinite(amount) || amount <= 0) {
      return toast({ title: "请输入有效的充值金额", variant: "destructive" });
    }
    const current = keyBalances[rechargeMapping.id] || { totalRecharge: 0, totalConsumption: 0 };
    const cumulativeAmount = current.totalRecharge + amount;
    setKeyBalances((items) => ({ ...items, [rechargeMapping.id]: { ...current, totalRecharge: cumulativeAmount } }));
    setRechargeRecords((items) => [{
      id: Date.now(),
      mappingId: rechargeMapping.id,
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }).replaceAll("/", "-"),
      amount,
      operator: "admin",
      remark: rechargeRemark.trim() || "—",
      cumulativeAmount,
    }, ...items]);
    setRechargeMapping(null);
    toast({ title: "充值记录已保存", description: `${rechargeMapping.customer} · ${rechargeMapping.key} · ${money(amount)}` });
  };
  const confirmDeleteMapping = () => {
    if (!deletingMapping || !canDeleteMapping(deletingMapping)) return;
    setMappings((items) => items.filter((item) => item.id !== deletingMapping.id));
    setKeyBalances((items) => { const next = { ...items }; delete next[deletingMapping.id]; return next; });
    setRechargeRecords((items) => items.filter((record) => record.mappingId !== deletingMapping.id));
    setDeletingMapping(null);
    toast({ title: "Key 已删除" });
  };

  return <div className="p-6 space-y-5 overflow-y-auto">
    <div><h1 className="text-xl font-semibold">官 Key 数据管理</h1><p className="text-sm text-muted-foreground mt-1">维护数据来源与 Key 归属，核对上游全量数据并生成每日客户账单</p></div>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="bg-muted/60"><TabsTrigger value="accounts" className="gap-2"><KeyRound className="h-4 w-4" />Key 管理</TabsTrigger><TabsTrigger value="bills" className="gap-2"><ReceiptText className="h-4 w-4" />每日账单</TabsTrigger></TabsList>

      <TabsContent value="accounts" className="mt-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-4 p-4 border-b"><div><h2 className="font-medium">Key 管理</h2><p className="text-xs text-muted-foreground mt-1">维护 Key 密钥、客户归属、折扣规则及预充值余额</p></div><div className="flex items-center gap-2"><Select value={keySupplierFilter} onValueChange={setKeySupplierFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部供应商</SelectItem>{accounts.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.supplier}</SelectItem>)}</SelectContent></Select><Input className="w-52" value={keyKeyword} onChange={(event) => setKeyKeyword(event.target.value)} placeholder="搜索客户 / Key" /><Button onClick={() => openMapping()}><Plus className="h-4 w-4 mr-1" />新增 Key</Button></div></div>
        <div className="overflow-x-auto"><Table className="min-w-[1250px]"><TableHeader><TableRow><TableHead className="w-16">ID</TableHead><TableHead>供应商</TableHead><TableHead>Key 名称</TableHead><TableHead>对应平台客户</TableHead><TableHead>折扣</TableHead><TableHead className="text-right">累计充值</TableHead><TableHead className="text-right">累计消费</TableHead><TableHead className="text-right">最新余额</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{shownMappings.length ? shownMappings.map((item) => { const balance = keyBalances[item.id] || { totalRecharge: 0, totalConsumption: 0 }; const supplier = accounts.find((account) => account.id === item.accountId)?.supplier || "—"; return <TableRow key={item.id}><TableCell className="font-mono text-muted-foreground">{item.id}</TableCell><TableCell>{supplier}</TableCell><TableCell className="font-medium">{item.key}</TableCell><TableCell>{item.customer}</TableCell><TableCell>{item.modelDiscounts.length ? `兜底 ${item.discount}% · ${item.modelDiscounts.length} 个特殊模型` : `兜底 ${item.discount}%`}</TableCell><TableCell className="text-right"><Button variant="link" size="sm" className="h-auto p-0 font-normal" onClick={() => setRechargeHistoryMapping(item)}>{money(balance.totalRecharge)}</Button></TableCell><TableCell className="text-right">{money(balance.totalConsumption)}</TableCell><TableCell className="text-right font-semibold text-primary">{money(balance.totalRecharge - balance.totalConsumption)}</TableCell><TableCell><Badge variant={item.enabled === false ? "secondary" : "default"}>{item.enabled === false ? "已停用" : "启用"}</Badge></TableCell><TableCell className="text-right whitespace-nowrap"><Button variant="outline" size="sm" onClick={() => openRecharge(item)}><WalletCards className="h-3.5 w-3.5 mr-1" />录入充值</Button><Button variant="ghost" size="sm" onClick={() => openMapping(item)}>编辑</Button><Button variant="ghost" size="sm" className={item.enabled === false ? "" : "text-destructive"} onClick={() => setMappings((items) => items.map((row) => row.id === item.id ? { ...row, enabled: row.enabled === false } : row))}>{item.enabled === false ? "启用" : "停用"}</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingMapping(item)}>删除</Button></TableCell></TableRow>; }) : <TableRow><TableCell colSpan={10} className="h-32 text-center text-muted-foreground">暂无匹配的 Key</TableCell></TableRow>}</TableBody></Table></div>
      </TabsContent>

      <TabsContent value="bills" className="mt-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between p-4 border-b"><div><h2 className="font-medium">每日客户账单</h2></div><div className="flex items-center gap-2 whitespace-nowrap"><span className="text-sm text-muted-foreground">账单日期</span><Input type="date" className="w-36" value={billStartDate} max={billEndDate} onChange={(event) => setBillStartDate(event.target.value)} /><span className="text-muted-foreground">—</span><Input type="date" className="w-36" value={billEndDate} min={billStartDate} onChange={(event) => setBillEndDate(event.target.value)} /><span className="ml-2 text-sm text-muted-foreground">供应商</span><Select value={billSupplierFilter} onValueChange={setBillSupplierFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部供应商</SelectItem>{supplierOptions.map((supplier) => <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>)}</SelectContent></Select><Input className="w-44" value={billKeyword} onChange={(event) => setBillKeyword(event.target.value)} placeholder="搜索客户 / Key" /></div></div>
        <div className="overflow-x-auto"><Table className="min-w-[1200px]"><TableHeader><TableRow><TableHead className="w-16">ID</TableHead><TableHead>供应商</TableHead><TableHead>账单日期</TableHead><TableHead>客户</TableHead><TableHead>Key 名称</TableHead><TableHead className="text-right">目录金额</TableHead><TableHead>客户折扣</TableHead><TableHead className="text-right">当日消费</TableHead><TableHead>账单状态</TableHead><TableHead>生成时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{shownBills.length ? shownBills.map((bill) => <TableRow key={bill.id}><TableCell className="font-mono text-muted-foreground">{bill.id}</TableCell><TableCell>{bill.supplier}</TableCell><TableCell>{bill.date}</TableCell><TableCell className="font-medium">{bill.customer}</TableCell><TableCell>{bill.keyName}</TableCell><TableCell className="text-right">{money(bill.catalog)}</TableCell><TableCell>{bill.status === "generated" ? bill.customerDiscount : "—"}</TableCell><TableCell className="text-right font-semibold text-primary">{bill.status === "generated" ? money(bill.receivable) : "—"}</TableCell><TableCell>{bill.status === "generated" ? <Badge>成功</Badge> : <Badge variant="destructive">失败</Badge>}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{bill.generatedAt || "—"}</TableCell><TableCell className="text-right whitespace-nowrap"><Button variant="ghost" size="sm" disabled={!bill.details.length} onClick={() => setDetailBill(bill)}><Eye className="h-3.5 w-3.5 mr-1" />查看详情</Button><Button variant="ghost" size="sm" onClick={() => toast({ title: "已重新发起账单生成", description: `${bill.customer} · ${bill.keyName} · ${bill.date}` })}><RefreshCw className="h-3.5 w-3.5 mr-1" />重新生成</Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={11} className="h-32 text-center text-muted-foreground">当前日期范围暂无账单</TableCell></TableRow>}</TableBody></Table></div>
      </TabsContent>
    </Tabs>

    <Dialog open={mappingDialog} onOpenChange={setMappingDialog}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editingMapping ? "编辑 Key" : "新增 Key"}</DialogTitle><DialogDescription>选择系统已对接供应商，并维护 Key 密钥、对应客户及计费折扣。</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>供应商 *</Label><Select value={String(mappingForm.accountId)} onValueChange={(value) => setMappingForm({ ...mappingForm, accountId: Number(value) })}><SelectTrigger><SelectValue placeholder="请选择系统已对接供应商" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.supplier}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">供应商由系统预置，不支持运营新增。</p></div><div className="space-y-2"><Label>Key 名称 *</Label><Input value={mappingForm.key} onChange={(event) => setMappingForm({ ...mappingForm, key: event.target.value })} placeholder="请输入便于识别的 Key 名称" /></div><div className="space-y-2"><Label>Key 密钥 {editingMapping ? "" : "*"}</Label><Input type="password" autoComplete="new-password" value={mappingForm.secret} onChange={(event) => setMappingForm({ ...mappingForm, secret: event.target.value })} placeholder={editingMapping ? "••••••••（不修改请留空）" : "请输入完整 Key 密钥"} /><p className="text-xs text-muted-foreground">密钥加密存储，保存后不回显；编辑时留空表示不修改。</p></div><div className="space-y-2"><Label>对应平台客户 *</Label><Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={customerPickerOpen} className="w-full justify-between font-normal">{mappingForm.customer || "搜索并选择已创建客户"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"><Command><CommandInput placeholder="搜索客户名称..." /><CommandList><CommandEmpty>未找到已创建的客户</CommandEmpty><CommandGroup>{customers.map((item) => <CommandItem key={item} value={item} onSelect={() => { setMappingForm({ ...mappingForm, customer: item }); setCustomerPickerOpen(false); }}><Check className={cn("mr-2 h-4 w-4", mappingForm.customer === item ? "opacity-100" : "opacity-0")} />{item}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div><div className="space-y-2"><Label>模型折扣 *</Label><div className="relative"><Input type="number" min="0.1" max="100" step="0.1" className="pr-9" value={mappingForm.discount} onChange={(event) => setMappingForm({ ...mappingForm, discount: event.target.value })} /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span></div><p className="text-xs text-muted-foreground">未配置特殊折扣的上游模型，统一按此折扣计算账单。</p></div><div className="space-y-2"><div className="flex items-center justify-between"><div><Label>特殊模型折扣</Label><p className="mt-1 text-xs text-muted-foreground">仅添加折扣不同于兜底规则的模型。</p></div><Button type="button" variant="outline" size="sm" onClick={() => setMappingForm({ ...mappingForm, modelDiscounts: [...mappingForm.modelDiscounts, { model: "", discount: mappingForm.discount || "80" }] })}><Plus className="h-3.5 w-3.5 mr-1" />新增</Button></div>{mappingForm.modelDiscounts.length > 0 && <div className="space-y-2">{mappingForm.modelDiscounts.map((rule, index) => <div key={index} className="flex gap-2"><Input className="flex-1" value={rule.model} placeholder="请输入模型 ID" onChange={(event) => setMappingForm({ ...mappingForm, modelDiscounts: mappingForm.modelDiscounts.map((item, itemIndex) => itemIndex === index ? { ...item, model: event.target.value } : item) })} /><div className="relative w-28"><Input type="number" min="0.1" max="100" step="0.1" className="pr-8" value={rule.discount} onChange={(event) => setMappingForm({ ...mappingForm, modelDiscounts: mappingForm.modelDiscounts.map((item, itemIndex) => itemIndex === index ? { ...item, discount: event.target.value } : item) })} /><span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span></div><Button type="button" variant="ghost" size="icon" aria-label={`删除 ${rule.model || "该模型"} 的特殊折扣`} className="text-destructive" onClick={() => setMappingForm({ ...mappingForm, modelDiscounts: mappingForm.modelDiscounts.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}</div></div><DialogFooter><Button variant="outline" onClick={() => setMappingDialog(false)}>取消</Button><Button onClick={saveMapping}>保存</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!detailBill} onOpenChange={(open) => !open && setDetailBill(null)}><DialogContent className="max-w-[1240px]"><DialogHeader><DialogTitle>按量消费明细</DialogTitle><DialogDescription>按客户、单日账期和模型计费项展示客户账单。</DialogDescription></DialogHeader><div className="overflow-x-auto rounded-md border"><Table className="min-w-[1600px]"><TableHeader><TableRow><TableHead>客户名称</TableHead><TableHead>账期</TableHead><TableHead>模型名称</TableHead><TableHead>计费项</TableHead><TableHead className="text-right">计费单价</TableHead><TableHead>计费单位</TableHead><TableHead className="text-right">用量</TableHead><TableHead>用量单位</TableHead><TableHead className="text-right">目录总价（元）</TableHead><TableHead>折扣率</TableHead><TableHead className="text-right">实际消费（元）</TableHead><TableHead className="text-right">代金券抵扣（元）</TableHead><TableHead className="text-right">充值余额支付（元）</TableHead><TableHead className="text-right">授信额度支付（元）</TableHead></TableRow></TableHeader><TableBody>{detailGroups.flatMap((group, groupIndex) => group.rows.map((row, rowIndex) => <TableRow key={`${group.model}-${row.billingItem}`}>{groupIndex === 0 && rowIndex === 0 && <><TableCell rowSpan={detailBill?.details.length} className="font-medium align-middle">{detailBill?.customer}</TableCell><TableCell rowSpan={detailBill?.details.length} className="align-middle">{detailBill?.date}</TableCell></>}{rowIndex === 0 && <TableCell rowSpan={group.rows.length} className="align-middle"><Badge variant="outline" className="font-mono font-normal">{group.model}</Badge></TableCell>}<TableCell>{row.billingItem}</TableCell><TableCell className="text-right font-mono">{row.unitPrice.toFixed(2)}</TableCell><TableCell>{row.priceUnit}</TableCell><TableCell className="text-right font-mono">{count(row.usage)}</TableCell><TableCell>{row.usageUnit}</TableCell>{rowIndex === 0 && <><TableCell rowSpan={group.rows.length} className="text-right font-mono align-middle border-l">{money(group.catalogAmount)}</TableCell><TableCell rowSpan={group.rows.length} className="text-emerald-600 align-middle">{group.discount}</TableCell><TableCell rowSpan={group.rows.length} className="text-right font-mono align-middle">{money(group.actualAmount)}</TableCell><TableCell rowSpan={group.rows.length} className="text-right font-mono text-amber-600 align-middle">{money(group.couponAmount)}</TableCell><TableCell rowSpan={group.rows.length} className="text-right font-mono align-middle">{money(group.balanceAmount)}</TableCell><TableCell rowSpan={group.rows.length} className="text-right font-mono text-red-500 align-middle">{money(group.creditAmount)}</TableCell></>}</TableRow>))}</TableBody></Table></div><DialogFooter><Button onClick={() => detailBill && toast({ title: "开始下载客户账单", description: `${detailBill.customer} · ${detailBill.date}` })}><Download className="h-4 w-4 mr-1" />下载账单</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!deletingMapping} onOpenChange={(open) => !open && setDeletingMapping(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>{deletingMapping && canDeleteMapping(deletingMapping) ? <><DialogTitle>确认删除 Key？</DialogTitle><DialogDescription>删除后无法恢复。该 Key 尚未产生充值、消费或账单数据。</DialogDescription></> : <DialogTitle className="pr-6 text-base font-normal">该 Key 已产生充值、消费或账单数据，为保证历史数据可追溯，仅支持停用。</DialogTitle>}</DialogHeader>
        {deletingMapping && canDeleteMapping(deletingMapping) && <DialogFooter><Button variant="outline" onClick={() => setDeletingMapping(null)}>取消</Button><Button variant="destructive" onClick={confirmDeleteMapping}>确认删除</Button></DialogFooter>}
      </DialogContent>
    </Dialog>

    <Dialog open={!!rechargeHistoryMapping} onOpenChange={(open) => !open && setRechargeHistoryMapping(null)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>充值记录</DialogTitle><DialogDescription>{rechargeHistoryMapping?.customer} · {rechargeHistoryMapping?.key}，按充值时间倒序展示。</DialogDescription></DialogHeader>
        <div className="rounded-md border overflow-hidden"><Table><TableHeader><TableRow><TableHead>充值时间</TableHead><TableHead className="text-right">本次充值</TableHead><TableHead>操作人</TableHead><TableHead>备注</TableHead></TableRow></TableHeader><TableBody>{rechargeRecords.filter((record) => record.mappingId === rechargeHistoryMapping?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((record) => <TableRow key={record.id}><TableCell className="whitespace-nowrap">{record.createdAt}</TableCell><TableCell className="text-right font-semibold text-emerald-600">+{money(record.amount)}</TableCell><TableCell>{record.operator}</TableCell><TableCell>{record.remark}</TableCell></TableRow>)}</TableBody></Table></div>
        {!rechargeRecords.some((record) => record.mappingId === rechargeHistoryMapping?.id) && <div className="py-8 text-center text-sm text-muted-foreground">暂无充值记录</div>}
      </DialogContent>
    </Dialog>

    <Dialog open={!!rechargeMapping} onOpenChange={(open) => !open && setRechargeMapping(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>新增充值记录</DialogTitle><DialogDescription>记录客户为该 Key 充值的金额，仅用于运营统计。</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[76px_1fr] gap-x-2 gap-y-2 rounded-md bg-muted/60 p-3 text-sm"><span className="text-muted-foreground">Key 名称</span><span className="font-medium">{rechargeMapping?.key}</span><span className="text-muted-foreground">客户名称</span><span>{rechargeMapping?.customer}</span></div>
          <div className="space-y-2"><Label>充值金额 *</Label><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-muted-foreground">¥</span><Input type="number" min="0.01" step="0.01" className="pl-7" value={rechargeAmount} onChange={(event) => setRechargeAmount(event.target.value)} placeholder="请输入充值金额" /></div></div>
          <div className="space-y-2"><Label>备注</Label><Input value={rechargeRemark} onChange={(event) => setRechargeRemark(event.target.value)} placeholder="例如：客户 8 月追加充值" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setRechargeMapping(null)}>取消</Button><Button onClick={saveRecharge}>保存</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
