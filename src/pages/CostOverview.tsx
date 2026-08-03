import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { CalendarDays, PieChart } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend,
} from "recharts";

interface Enterprise { id: string; name: string; enterprise_code: string }

interface Props {
  enterprise: Enterprise | null;
  role: string;
}

// 只保留有实际数据的月份，不填充空数据
// balancePayment: 按量消费部分的充值余额支付
// voucherDeduction: 代金券抵扣（按量消费）
// creditPayment: 授信额度支付（按量消费，先用后付，属于待支付）
// entitlementPurchase: 权益（订阅包/资源包）购买金额，仅支持充值余额支付
// 充值余额支付 = balancePayment + entitlementPurchase
// 已支付 = voucherDeduction + 充值余额支付
// 授信额度支付（待支付）= creditPayment
// total = 已支付 + 授信额度支付
// 账单状态：未出账 / 已出账
const mockTrendData = [
  { period: "2025-09", status: "未出账", balancePayment: 80.00, voucherDeduction: 28.00, creditPayment: 0.00, entitlementPurchase: 0.00, total: 108.00 },
  { period: "2025-10", status: "未出账", balancePayment: 200.00, voucherDeduction: 90.00, creditPayment: 150.00, entitlementPurchase: 999.00, total: 1439.00 },
  { period: "2025-11", status: "未出账", balancePayment: 180.00, voucherDeduction: 75.00, creditPayment: 0.00, entitlementPurchase: 0.00, total: 255.00 },
  { period: "2026-04", status: "未出账", balancePayment: 45.00, voucherDeduction: 12.00, creditPayment: 80.00, entitlementPurchase: 0.00, total: 137.00 },
  { period: "2026-05", status: "已出账", balancePayment: 0.00, voucherDeduction: 0.00, creditPayment: 0.00, entitlementPurchase: 0.00, total: 0.00 },
];

const calcBalancePayment = (d: { balancePayment: number; entitlementPurchase: number }) =>
  d.balancePayment + d.entitlementPurchase;
const calcPaid = (d: { voucherDeduction: number; balancePayment: number; entitlementPurchase: number }) =>
  d.voucherDeduction + calcBalancePayment(d);
const calcCreditPayment = (d: { creditPayment: number }) => d.creditPayment;

const allPeriods = mockTrendData.map(d => d.period);

// 为柱状图准备数据：充值余额支付拆分为「按量消费」+「权益购买」，便于区分一次性大额购包
const chartData = mockTrendData.map(d => ({
  ...d,
  balancePayg: d.balancePayment,           // 按量消费部分
  entitlementPurchase: d.entitlementPurchase, // 权益购买部分
}));

export default function CostOverview({ enterprise, role }: Props) {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(allPeriods[allPeriods.length - 1]);

  const currentPeriodData = mockTrendData.find(d => d.period === selectedPeriod);
  const selectedIndex = chartData.findIndex(d => d.period === selectedPeriod);
  const trendData = chartData.slice(Math.max(0, selectedIndex - 5), selectedIndex + 1);

  const balancePaymentTotal = currentPeriodData ? calcBalancePayment(currentPeriodData) : 0;
  const paid = currentPeriodData ? calcPaid(currentPeriodData) : 0;
  const creditPayment = currentPeriodData ? calcCreditPayment(currentPeriodData) : 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">费用总览</h1>
        <p className="text-muted-foreground mt-1 text-sm">查看企业费用消耗趋势与构成分析</p>
      </div>

      {/* 账单数据说明 */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">账单数据说明：</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>账单总包 T+1 汇总出具，当前展示的是截至最近一日发生的费用。</li>
          <li>
            <span className="font-medium text-green-700">已支付</span>为代金券抵扣与充值余额支付（包括资源包/订阅包的购买金额）等已实际计收金额；
            <span className="font-medium text-orange-600">待支付</span>为授信额度先用后付部分，需在账单出账后补缴。
          </li>
          <li>如需查看完整明细账单，请联系运营获取。</li>
        </ol>
      </div>

      {/* 账期选择器 */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">账单查看</span>
        <div className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-8 w-32 pl-8 pr-6 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
          >
            {allPeriods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 当前账期 + 费用趋势 */}
      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* 左侧：当前账期概览 */}
        <div className="bg-card border border-border rounded-xl py-8 px-6 space-y-6 flex flex-col">
          {/* 账期标题 */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">
                {selectedPeriod.split("-")[1]}月
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                {selectedPeriod}
                {currentPeriodData && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    currentPeriodData.status === "已出账"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      currentPeriodData.status === "已出账"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`} />
                    {currentPeriodData.status}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                统计周期：计费周期
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <svg className="w-3 h-3 text-muted-foreground cursor-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      计费周期指费用归属的账期月份。系统按请求创建时间判断账期归属；若请求创建于当月，则相关费用计入当月账单，不受响应完成时间、异步任务完成时间影响。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
            </div>
          </div>

          {/* 总费用 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">总费用</p>
            <p className="text-4xl font-bold text-foreground">
              ¥{currentPeriodData ? currentPeriodData.total.toFixed(2) : "0.00"}
            </p>
          </div>

          {/* 支付构成 */}
          <div className="bg-muted/40 border border-border rounded-lg p-4 grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                充值余额支付
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <svg className="w-3 h-3 cursor-help text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between gap-6">
                          <span>按量消费：</span>
                          <span className="font-medium">¥{currentPeriodData ? currentPeriodData.balancePayment.toFixed(2) : "0.00"}</span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span>权益购买：</span>
                          <span className="font-medium">¥{currentPeriodData ? currentPeriodData.entitlementPurchase.toFixed(2) : "0.00"}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="font-semibold text-foreground">¥{balancePaymentTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">代金券抵扣</p>
              <p className="font-semibold text-foreground">¥{currentPeriodData ? currentPeriodData.voucherDeduction.toFixed(2) : "0.00"}</p>
            </div>
            <div className="col-span-2">
              <p className={`text-xs mb-0.5 flex items-center gap-1 ${creditPayment > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                欠费（授信额度支付）
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <svg className="w-3 h-3 cursor-help" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      该部分费用由授信额度先行垫付（先用后付），账单出账后需在约定期限内补缴。
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className={`font-semibold ${creditPayment > 0 ? "text-orange-600" : "text-muted-foreground"}`}>¥{creditPayment.toFixed(2)}</p>
            </div>
          </div>

        </div>

        {/* 右侧：费用趋势柱状图 */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">费用趋势</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `¥${v}`} />
                <ReTooltip
                  formatter={(value: number, name: string) => [`¥${value.toFixed(2)}`, name]}
                  labelFormatter={(label: string) => `账期：${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="balancePayg" name="充值余额支付（按量消费）" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                <Bar dataKey="entitlementPurchase" name="充值余额支付（权益购买）" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="voucherDeduction" name="代金券抵扣" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="creditPayment" name="欠费(授信额度支付)" stackId="a" fill="#fbbf24" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-foreground">月度账单</h2>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">账单月份</TableHead>
                <TableHead className="text-muted-foreground text-right">实际消费（元）</TableHead>
                <TableHead className="text-muted-foreground text-right">代金券抵扣（元）</TableHead>
                <TableHead className="text-muted-foreground text-right">充值余额支付（元）</TableHead>
                <TableHead className="text-muted-foreground text-right">欠费（元）</TableHead>
                <TableHead className="text-muted-foreground">状态</TableHead>
                <TableHead className="text-muted-foreground text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...trendData].reverse().map((row) => {
                const rowBalance = calcBalancePayment(row);
                const rowCredit = calcCreditPayment(row);
                return (
                  <TableRow key={row.period} className="hover:bg-muted/30">
                    <TableCell className="text-sm">{row.period}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">¥{row.total.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-right">¥{row.voucherDeduction.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help border-b border-dotted border-muted-foreground/40">¥{rowBalance.toFixed(2)}</span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            <div className="space-y-1">
                              <div className="flex justify-between gap-6">
                                <span>按量消费：</span>
                                <span className="font-medium">¥{row.balancePayment.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span>权益购买：</span>
                                <span className="font-medium">¥{row.entitlementPurchase.toFixed(2)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className={`text-sm text-right ${rowCredit > 0 ? "text-orange-600" : "text-muted-foreground"}`}>¥{rowCredit.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        row.status === "已出账"
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          row.status === "已出账"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`} />
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          const billsPath = enterprise ? "/workspace/enterprise/bills" : "/workspace/bills";
                          const paygAmount = row.balancePayment + row.voucherDeduction + row.creditPayment;
                          navigate(`${billsPath}?allocation=${row.period}&amount=${row.total}&payg=${paygAmount}&entitlement=${row.entitlementPurchase}`);
                        }}
                      >
                        <PieChart className="w-3.5 h-3.5 mr-1" />
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
