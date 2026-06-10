import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { CalendarDays } from "lucide-react";
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
const mockTrendData = [
  { period: "2025-09", status: "已出账", balancePayment: 80.00, voucherDeduction: 28.00, total: 108.00 },
  { period: "2025-10", status: "已出账", balancePayment: 200.00, voucherDeduction: 90.00, total: 290.00 },
  { period: "2025-11", status: "已出账", balancePayment: 180.00, voucherDeduction: 75.00, total: 255.00 },
  { period: "2026-04", status: "已出账", balancePayment: 45.00, voucherDeduction: 12.00, total: 57.00 },
  { period: "2026-05", status: "未出账", balancePayment: 0.00, voucherDeduction: 0.00, total: 0.00 },
];

const allPeriods = mockTrendData.map(d => d.period);

export default function CostOverview({ enterprise, role }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(allPeriods[allPeriods.length - 1]);

  const currentPeriodData = mockTrendData.find(d => d.period === selectedPeriod);
  const selectedIndex = mockTrendData.findIndex(d => d.period === selectedPeriod);
  const trendData = mockTrendData.slice(Math.max(0, selectedIndex - 5), selectedIndex + 1);

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
          <li>当前账期数据为实时汇总数据，最多可能存在 30 分钟延迟，展示金额仅供参考。</li>
          <li>月度账单将在次月出账后生成，出账前金额可能随数据汇总、计费校准等情况发生变化。</li>
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
        <div className="bg-card border border-border rounded-xl py-8 px-6 space-y-8 flex flex-col">
          {/* 账期标题 */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">
                {selectedPeriod.split("-")[1]}月
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedPeriod} {currentPeriodData?.status}
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

          {/* 费用消耗 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">费用消耗</p>
            <p className="text-4xl font-bold text-foreground">
              ¥{currentPeriodData ? currentPeriodData.total.toFixed(2) : "0.00"}
            </p>
          </div>

          {/* 支付方式明细 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">充值余额支付</p>
                <p className="font-medium text-base">¥{currentPeriodData ? currentPeriodData.balancePayment.toFixed(2) : "0.00"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">代金券抵扣</p>
                <p className="font-medium text-base">¥{currentPeriodData ? currentPeriodData.voucherDeduction.toFixed(2) : "0.00"}</p>
              </div>
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
                <Bar dataKey="balancePayment" name="充值余额支付" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="voucherDeduction" name="代金券抵扣" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
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
                <TableHead className="text-muted-foreground">账期</TableHead>
                <TableHead className="text-muted-foreground">出账状态</TableHead>
                <TableHead className="text-muted-foreground text-right">充值余额支付</TableHead>
                <TableHead className="text-muted-foreground text-right">代金券抵扣</TableHead>
                <TableHead className="text-muted-foreground text-right">费用消耗</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...trendData].reverse().map((row) => (
                <TableRow key={row.period} className="hover:bg-muted/30">
                  <TableCell className="text-sm">{row.period}</TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        row.status === "未出账"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-right">¥{row.balancePayment.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-right">¥{row.voucherDeduction.toFixed(2)}</TableCell>
                  <TableCell className="text-sm font-semibold text-right">¥{row.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
