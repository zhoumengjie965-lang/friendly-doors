import { useState, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth, addDays } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Info,
  Table2,
  Receipt,
  FileText,
  Loader2,
  FileCheck,
  Lock,
  ChevronDown,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

interface ReconciliationRow {
  id: string;
  date: string;
  enterprise: string;
  supplier: string;
  model: string;
  downstreamRevenue: number;
  estimatedCost: number;
  actualCost: number | null;
  difference: number;
  differenceRate: number;
  profit: number;
  status: "normal" | "warning" | "pending";
}

interface BillRecord {
  id: string;
  billFileName: string;
  billFileSize: string;
  usageFileName?: string;
  usageFileSize?: string;
  matchRate?: number; // 匹配率百分比
  totalRecords?: number; // 总记录数
  matchedRecords?: number; // 已匹配记录数
  diffAmount?: number; // 用量/金额差异数
  noPlatformRecords?: number; // 平台无记录数
  supplier: string;
  startDate: string;
  endDate: string;
  uploader: string;
  uploadTime: string;
  status: "parsing" | "imported" | "failed" | "confirmed"; // 解析中、已导入、失败、已确认
  // 成本核算相关字段
  supplierBillTotal?: number; // 供应商账单总额
  matchedAmount?: number; // 匹配成功总金额
  platformEstimatedCost?: number; // 平台预估成本
  diffCostAmount?: number; // 用量/金额差异的成本
  orphanedCostAmount?: number; // 平台无记录的供应商实扣金额
  totalCostDeviation?: number; // 成本偏差总计
}

// ─── Mock Data ───────────────────────────────────────────────────────────

const ENTERPRISES = ["星辰科技", "未来智能", "云图网络", "数链信息", "智联系统", "启明数据", "创新科技", "智慧云端"];
const SUPPLIERS = ["OpenAI", "Anthropic", "Google", "Azure", "AWS", "智谱AI", "文心一言"];
const MODELS = ["gpt-4o", "gpt-4-turbo", "claude-3.5-sonnet", "claude-3-opus", "gemini-1.5-pro", "glm-4", "ernie-4.0"];

const generateMockData = (): ReconciliationRow[] => {
  const data: ReconciliationRow[] = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = format(date, "yyyy-MM-dd");
    
    ENTERPRISES.forEach((enterprise) => {
      SUPPLIERS.forEach((supplier) => {
        MODELS.forEach((model) => {
          if (Math.random() > 0.8) return;
          
          const downstreamRevenue = Math.round((1000 + Math.random() * 10000) * 100) / 100;
          const estimatedCost = Math.round(downstreamRevenue * (0.6 + Math.random() * 0.2) * 100) / 100;
          
          const hasActualCost = Math.random() > 0.2;
          let actualCost: number | null = null;
          let difference = 0;
          let differenceRate = 0;
          let profit = 0;
          let status: "normal" | "warning" | "pending" = "pending";
          
          if (hasActualCost) {
            const variance = (Math.random() - 0.5) * 0.1;
            actualCost = Math.round(estimatedCost * (1 + variance) * 100) / 100;
            difference = Math.round((actualCost - estimatedCost) * 100) / 100;
            differenceRate = Math.round((difference / estimatedCost) * 10000) / 100;
            profit = Math.round((downstreamRevenue - actualCost) * 100) / 100;
            
            if (Math.abs(differenceRate) > 1) {
              status = "warning";
            } else {
              status = "normal";
            }
          }
          
          data.push({
            id: `${dateStr}-${enterprise}-${supplier}-${model}`,
            date: dateStr,
            enterprise,
            supplier,
            model,
            downstreamRevenue,
            estimatedCost,
            actualCost,
            difference,
            differenceRate,
            profit,
            status,
          });
        });
      });
    });
  }
  
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const MOCK_BILLS: BillRecord[] = [
  {
    id: "1", billFileName: "openai_invoice_march.csv", billFileSize: "1.2MB", usageFileName: "openai_usage_march.csv", usageFileSize: "2.4MB",
    supplier: "OpenAI", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "张三", uploadTime: "2024-04-01 10:30", status: "imported",
    matchRate: 99.8, totalRecords: 100000, matchedRecords: 99800, diffAmount: 150, noPlatformRecords: 50,
    supplierBillTotal: 10050, matchedAmount: 9900, platformEstimatedCost: 9950, diffCostAmount: 30, orphanedCostAmount: 70, totalCostDeviation: 100
  },
  {
    id: "2", billFileName: "anthropic_invoice_march.xlsx", billFileSize: "0.8MB", usageFileName: "anthropic_usage_march.xlsx", usageFileSize: "1.8MB",
    supplier: "Anthropic", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "李四", uploadTime: "2024-04-01 14:15", status: "imported",
    matchRate: 98.5, totalRecords: 50000, matchedRecords: 49250, diffAmount: 500, noPlatformRecords: 250,
    supplierBillTotal: 5200, matchedAmount: 4800, platformEstimatedCost: 5100, diffCostAmount: 150, orphanedCostAmount: 250, totalCostDeviation: 300
  },
  { id: "3", billFileName: "azure_invoice_march.csv", billFileSize: "2.1MB", usageFileName: "azure_usage_march.csv", usageFileSize: "5.2MB", supplier: "Azure", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "王五", uploadTime: "2024-04-02 09:00", status: "parsing" },
  { id: "4", billFileName: "google_invoice_march.csv", billFileSize: "0.5MB", usageFileName: "google_usage_march.csv", usageFileSize: "1.1MB", supplier: "Google", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "赵六", uploadTime: "2024-04-02 16:45", status: "failed" },
  {
    id: "5", billFileName: "openai_invoice_feb.csv", billFileSize: "1.0MB", usageFileName: "openai_usage_feb.csv", usageFileSize: "2.1MB",
    supplier: "OpenAI", startDate: "2024-02-01", endDate: "2024-02-29", uploader: "张三", uploadTime: "2024-03-01 11:20", status: "confirmed",
    matchRate: 100, totalRecords: 80000, matchedRecords: 80000, diffAmount: 0, noPlatformRecords: 0,
    supplierBillTotal: 8950, matchedAmount: 8950, platformEstimatedCost: 8900, diffCostAmount: 0, orphanedCostAmount: 0, totalCostDeviation: 50
  },
];

const MOCK_DATA = generateMockData();

// ─── Components ──────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  trend,
  trendValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ElementType;
  color: "blue" | "green" | "red" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-xl font-bold text-foreground font-mono tracking-tight">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" ? <TrendingUp className="w-3 h-3 text-green-500" /> : trend === "down" ? <TrendingDown className="w-3 h-3 text-red-500" /> : null}
                <span className={cn("text-xs", trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground")}>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", colorClasses[color])}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DateRangePicker({ dateRange, onChange }: { dateRange: { from: Date; to: Date }; onChange: (range: { from: Date; to: Date }) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 text-xs gap-2 w-[240px] justify-start">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{format(dateRange.from, "yyyy-MM-dd")} ~ {format(dateRange.to, "yyyy-MM-dd")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-2 p-3 border-b">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { const today = new Date(); onChange({ from: startOfMonth(today), to: endOfMonth(today) }); }}>本月</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { const today = new Date(); onChange({ from: subDays(today, 7), to: today }); }}>近7天</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { const today = new Date(); onChange({ from: subDays(today, 30), to: today }); }}>近30天</Button>
        </div>
        <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => { if (range?.from && range?.to) onChange({ from: range.from, to: range.to }); }} numberOfMonths={2} locale={zhCN} />
      </PopoverContent>
    </Popover>
  );
}

// ─── Tab 1: 对账工作台 ───────────────────────────────────────────────────

function ReconciliationWorkbench() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ from: subDays(new Date(), 7), to: new Date() });
  const [enterpriseFilter, setEnterpriseFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<ReconciliationRow[]>(MOCK_DATA);
  const [editingCell, setEditingCell] = useState<{ id: string; value: string } | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchDate = new Date(row.date) >= dateRange.from && new Date(row.date) <= dateRange.to;
      const matchEnterprise = enterpriseFilter === "all" || row.enterprise === enterpriseFilter;
      const matchSupplier = supplierFilter === "all" || row.supplier === supplierFilter;
      const matchModel = modelFilter === "all" || row.model === modelFilter;
      const matchSearch = searchQuery === "" || row.enterprise.toLowerCase().includes(searchQuery.toLowerCase()) || row.supplier.toLowerCase().includes(searchQuery.toLowerCase()) || row.model.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDate && matchEnterprise && matchSupplier && matchModel && matchSearch;
    });
  }, [data, dateRange, enterpriseFilter, supplierFilter, modelFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, row) => sum + row.downstreamRevenue, 0);
    const totalActualCost = filteredData.reduce((sum, row) => sum + (row.actualCost || 0), 0);
    const totalEstimatedCost = filteredData.reduce((sum, row) => sum + row.estimatedCost, 0);
    const totalProfit = filteredData.reduce((sum, row) => sum + row.profit, 0);
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalActualCost) / totalRevenue) * 100 : 0;
    const warningDays = new Set(filteredData.filter((row) => row.status === "warning").map((row) => row.date)).size;
    const pendingDays = new Set(filteredData.filter((row) => row.status === "pending").map((row) => row.date)).size;
    return { totalRevenue, totalActualCost, totalEstimatedCost, totalProfit, grossMargin, warningDays, pendingDays };
  }, [filteredData]);

  const handleActualCostEdit = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    setData((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      const difference = Math.round((numValue - row.estimatedCost) * 100) / 100;
      const differenceRate = row.estimatedCost !== 0 ? Math.round((difference / row.estimatedCost) * 10000) / 100 : 0;
      const profit = Math.round((row.downstreamRevenue - numValue) * 100) / 100;
      let status: "normal" | "warning" | "pending" = "normal";
      if (Math.abs(differenceRate) > 1) status = "warning";
      return { ...row, actualCost: numValue, difference, differenceRate, profit, status };
    }));
    setEditingCell(null);
  };

  const formatCurrency = (value: number) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "normal": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />正常</Badge>;
      case "warning": return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />异常</Badge>;
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs"><AlertCircle className="w-3 h-3 mr-1" />待录入</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="下游总收入 (A)" value={formatCurrency(stats.totalRevenue)} trend="neutral" icon={DollarSign} color="blue" />
        <StatCard title="上游实际成本 (C)" value={formatCurrency(stats.totalActualCost)} trendValue={`预估: ${formatCurrency(stats.totalEstimatedCost)}`} icon={TrendingDown} color="red" />
        <StatCard title="最终利润 (A-C)" value={formatCurrency(stats.totalProfit)} trend={stats.totalProfit >= 0 ? "up" : "down"} trendValue={`毛利率 ${stats.grossMargin.toFixed(2)}%`} icon={TrendingUp} color="green" />
        <StatCard title="异常待处理" value={`${stats.warningDays} 天异常 / ${stats.pendingDays} 天待录入`} trend={stats.warningDays > 0 ? "down" : "up"} trendValue={stats.warningDays > 0 ? "需关注" : "正常"} icon={AlertTriangle} color={stats.warningDays > 0 ? "red" : "amber"} />
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
            <Select value={enterpriseFilter} onValueChange={setEnterpriseFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="所属企业" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部企业</SelectItem>
                {ENTERPRISES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="供应商" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部供应商</SelectItem>
                {SUPPLIERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="模型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模型</SelectItem>
                {MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索企业/供应商/模型" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-[180px] pl-8 text-xs" />
            </div>
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setDateRange({ from: subDays(new Date(), 7), to: new Date() }); setEnterpriseFilter("all"); setSupplierFilter("all"); setModelFilter("all"); setSearchQuery(""); }}>重置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">对账明细工作台</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />导出
              </Button>
              <span className="text-xs text-muted-foreground">共 {filteredData.length} 条记录</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">日期</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">所属企业/租户</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">渠道/供应商</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">模型</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">下游总收入 (A)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">平台预估成本 (B)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">上游实际成本 (C)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">差异金额 (C-B)</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">差异率</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">最终利润 (A-C)</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={11} className="px-3 py-12 text-center text-muted-foreground">暂无数据</td></tr>
                ) : (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className="text-xs font-medium">{row.enterprise}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.supplier}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><Badge variant="outline" className="text-xs font-mono">{row.model}</Badge></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-mono">{formatCurrency(row.downstreamRevenue)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-mono text-muted-foreground">{formatCurrency(row.estimatedCost)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-mono">
                        {row.actualCost === null ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted-foreground">-</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingCell({ id: row.id, value: "" })}><Upload className="w-3 h-3" /></Button>
                          </div>
                        ) : editingCell?.id === row.id ? (
                          <Input type="number" step="0.01" value={editingCell.value} onChange={(e) => setEditingCell({ id: row.id, value: e.target.value })} onBlur={() => handleActualCostEdit(row.id, editingCell.value)} onKeyDown={(e) => { if (e.key === "Enter") handleActualCostEdit(row.id, editingCell.value); }} className="h-6 w-24 text-right text-xs py-0 px-1" autoFocus />
                        ) : (
                          <button onClick={() => setEditingCell({ id: row.id, value: row.actualCost?.toString() || "" })} className="hover:underline">{formatCurrency(row.actualCost)}</button>
                        )}
                      </td>
                      <td className={cn("px-3 py-2 text-right whitespace-nowrap font-mono", row.difference > 0 ? "text-red-600" : row.difference < 0 ? "text-green-600" : "")}>{row.actualCost !== null ? `${row.difference > 0 ? "+" : ""}${formatCurrency(row.difference)}` : "-"}</td>
                      <td className={cn("px-3 py-2 text-right whitespace-nowrap font-mono", Math.abs(row.differenceRate) > 1 ? "text-red-600 font-medium" : "")}>{row.actualCost !== null ? `${row.differenceRate > 0 ? "+" : ""}${row.differenceRate.toFixed(2)}%` : "-"}</td>
                      <td className={cn("px-3 py-2 text-right whitespace-nowrap font-mono font-medium", row.profit >= 0 ? "text-green-600" : "text-red-600")}>{row.actualCost !== null ? formatCurrency(row.profit) : "-"}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{getStatusBadge(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: 流水明细 ─────────────────────────────────────────────────────

function TransactionDetails() {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">流水明细</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            展示所有平台交易流水记录，支持按时间、企业、供应商等维度筛选查询。
          </p>
          <p className="text-xs text-muted-foreground/70">功能开发中...</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tab 3: 供应商账单管理 ─────────────────────────────────────────────────

function SupplierBillManagement() {
  const [bills, setBills] = useState<BillRecord[]>(MOCK_BILLS);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    supplier: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd")
  });
  const [uploading, setUploading] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [usageFile, setUsageFile] = useState<File | null>(null);
  const billFileInputRef = useRef<HTMLInputElement>(null);
  const usageFileInputRef = useRef<HTMLInputElement>(null);
  const [matchReportOpen, setMatchReportOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);

  const handleUpload = () => {
    if (!uploadForm.supplier || !billFile) return;
    
    setUploading(true);
    setTimeout(() => {
      const newBill: BillRecord = {
        id: Date.now().toString(),
        billFileName: billFile.name,
        billFileSize: `${(billFile.size / 1024 / 1024).toFixed(1)}MB`,
        usageFileName: usageFile?.name,
        usageFileSize: usageFile ? `${(usageFile.size / 1024 / 1024).toFixed(1)}MB` : undefined,
        supplier: uploadForm.supplier,
        startDate: uploadForm.startDate,
        endDate: uploadForm.endDate,
        uploader: "当前用户",
        uploadTime: format(new Date(), "yyyy-MM-dd HH:mm"),
        status: "parsing",
      };
      setBills([newBill, ...bills]);
      setUploading(false);
      setUploadDialogOpen(false);
      setUploadForm({ supplier: "", startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(), "yyyy-MM-dd") });
      setBillFile(null);
      setUsageFile(null);
    }, 1500);
  };

  const handleDelete = (id: string) => {
    setBills(bills.filter((b) => b.id !== id));
  };

  const handleConfirmCost = (id: string) => {
    setBills(bills.map((b) => b.id === id ? { ...b, status: "confirmed" as const } : b));
  };

  const getStatusBadge = (status: BillRecord["status"]) => {
    switch (status) {
      case "parsing": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />解析中</Badge>;
      case "imported": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs"><FileCheck className="w-3 h-3 mr-1" />已导入</Badge>;
      case "failed": return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs"><AlertCircle className="w-3 h-3 mr-1" />失败</Badge>;
      case "confirmed": return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50 text-xs"><Lock className="w-3 h-3 mr-1" />已确认</Badge>;
      default: return null;
    }
  };

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchSupplier = supplierFilter === "all" || bill.supplier === supplierFilter;
      const matchStartDate = startDateFilter === "" || bill.startDate >= startDateFilter;
      const matchEndDate = endDateFilter === "" || bill.endDate <= endDateFilter;
      return matchSupplier && matchStartDate && matchEndDate;
    });
  }, [bills, supplierFilter, startDateFilter, endDateFilter]);

  const handleBillFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBillFile(e.target.files[0]);
    }
  };

  const handleUsageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUsageFile(e.target.files[0]);
    }
  };

  const handleOpenMatchReport = (bill: BillRecord) => {
    setSelectedBill(bill);
    setMatchReportOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-sm font-medium">历史上传记录</CardTitle>
              <span className="text-xs text-muted-foreground">共 {filteredBills.length} 条记录</span>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2 h-8 text-xs">
              <Upload className="w-3.5 h-3.5" />
              上传供应商账单
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b bg-muted/20">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="所属供应商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部供应商</SelectItem>
                  {SUPPLIERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="h-9 w-[140px] text-xs"
                  placeholder="开始日期"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="h-9 w-[140px] text-xs"
                  placeholder="结束日期"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={() => { setSupplierFilter("all"); setStartDateFilter(""); setEndDateFilter(""); }}
              >
                重置
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">账单</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">消耗明细</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">所属供应商</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">账期</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">匹配率</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">上传人</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">上传时间</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBills.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">暂无上传记录</td></tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[120px]" title={bill.billFileName}>{bill.billFileName}</p>
                            <p className="text-[10px] text-muted-foreground">{bill.billFileSize}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {bill.usageFileName ? (
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[120px]" title={bill.usageFileName}>{bill.usageFileName}</p>
                              <p className="text-[10px] text-muted-foreground">{bill.usageFileSize}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{bill.supplier}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{bill.startDate} ~ {bill.endDate}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(bill.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {bill.matchRate !== undefined ? (
                          <button
                            onClick={() => handleOpenMatchReport(bill)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            {bill.matchRate}%
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{bill.uploader}</td>
                      <td className="px-4 py-3 text-muted-foreground">{bill.uploadTime}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 功能位1: 确认成本 */}
                          {bill.status === "parsing" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" disabled>
                              确认成本
                            </Button>
                          )}
                          {bill.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(bill.id)}
                            >
                              删除
                            </Button>
                          )}
                          {bill.status === "imported" && (
                            <Button
                              variant={bill.matchRate === 100 || (bill.diffAmount === 0 && bill.noPlatformRecords === 0) ? "default" : "outline"}
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={bill.matchRate !== 100 && !(bill.diffAmount === 0 && bill.noPlatformRecords === 0)}
                              onClick={() => handleConfirmCost(bill.id)}
                            >
                              确认成本
                            </Button>
                          )}
                          {bill.status === "confirmed" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" disabled>
                              确认成本
                            </Button>
                          )}

                          {/* 功能位2: 查看明细 */}
                          {bill.status === "parsing" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" disabled>
                              查看明细
                            </Button>
                          )}
                          {(bill.status === "imported" || bill.status === "confirmed") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenMatchReport(bill)}
                            >
                              查看明细
                            </Button>
                          )}

                          {/* 功能位3: 导出明细 */}
                          {bill.status === "parsing" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" disabled>
                              导出明细
                            </Button>
                          )}
                          {(bill.status === "imported" || bill.status === "confirmed") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              导出明细
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setBillFile(null);
          setUsageFile(null);
        }
        setUploadDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">上传供应商账单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择供应商 <span className="text-red-500">*</span></label>
              <Select value={uploadForm.supplier} onValueChange={(v) => setUploadForm({ ...uploadForm, supplier: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">账期 <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <Input type="date" value={uploadForm.startDate} onChange={(e) => setUploadForm({ ...uploadForm, startDate: e.target.value })} />
                <span className="text-muted-foreground">~</span>
                <Input type="date" value={uploadForm.endDate} onChange={(e) => setUploadForm({ ...uploadForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">账单文件 <span className="text-red-500">*</span></label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => billFileInputRef.current?.click()}
              >
                <input type="file" ref={billFileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleBillFileSelect} />
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{billFile ? billFile.name : "点击上传账单文件"}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">支持 CSV、Excel 格式</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">消耗明细文件</label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => usageFileInputRef.current?.click()}
              >
                <input type="file" ref={usageFileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleUsageFileSelect} />
                <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{usageFile ? usageFile.name : "点击上传消耗明细文件"}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">支持 CSV、Excel 格式</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setBillFile(null); setUsageFile(null); }}>取消</Button>
            <Button onClick={handleUpload} disabled={!uploadForm.supplier || !billFile || uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Report Dialog */}
      <Dialog open={matchReportOpen} onOpenChange={setMatchReportOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">账单匹配报告</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6 py-2">
              {/* 数据概览 */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground border-l-4 border-blue-500 pl-2">数据概览</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">账单记录总数：</span>
                    <span className="font-medium">{selectedBill.totalRecords?.toLocaleString()} 条</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">供应商账单总额：</span>
                    <span className="font-medium">${selectedBill.supplierBillTotal?.toFixed(6) || "0.000000"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">精准匹配成功：</span>
                    <span className="font-medium">{selectedBill.matchedRecords?.toLocaleString()} 条 ({selectedBill.matchRate}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">匹配成功总金额：</span>
                    <span className="font-medium">${selectedBill.matchedAmount?.toFixed(6) || "0.000000"}</span>
                  </div>
                </div>
              </div>

              {/* 异常待处理 */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground border-l-4 border-orange-500 pl-2">异常待处理</h4>
                <div className="space-y-4">
                  {/* 1. 用量/金额差异 */}
                  <div className="bg-orange-50/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">1. 用量/金额差异 (Mismatched)</span>
                      <span className="text-sm text-orange-600">{selectedBill.diffAmount} 条</span>
                    </div>
                    <div className="space-y-1 text-sm pl-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">平台预估成本：</span>
                        <span>${selectedBill.platformEstimatedCost?.toFixed(6) || "0.000000"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">供应商实扣金额：</span>
                        <span>${((selectedBill.platformEstimatedCost || 0) + (selectedBill.diffCostAmount || 0)).toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">差异金额：</span>
                        <span className="text-red-600 font-medium">+${selectedBill.diffCostAmount?.toFixed(6) || "0.000000"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 平台无记录 */}
                  <div className="bg-orange-50/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">2. 平台无记录 (Orphaned)</span>
                      <span className="text-sm text-orange-600">{selectedBill.noPlatformRecords} 条</span>
                    </div>
                    <div className="space-y-1 text-sm pl-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">供应商实扣金额：</span>
                        <span>${selectedBill.orphanedCostAmount?.toFixed(6) || "0.000000"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">差异金额：</span>
                        <span className="text-red-600 font-medium">+${selectedBill.orphanedCostAmount?.toFixed(6) || "0.000000"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 核算结论 */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground border-l-4 border-green-500 pl-2">核算结论</h4>
                <div className="bg-green-50/50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">平台系统预估总成本：</span>
                    <span className="font-medium">${selectedBill.platformEstimatedCost?.toFixed(6) || "0.000000"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">本次确认入账成本：</span>
                    <span className="font-medium">${selectedBill.supplierBillTotal?.toFixed(6) || "0.000000"} (按供应商实扣金额)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">成本偏差总计：</span>
                    <span className="text-red-600 font-medium">+${selectedBill.totalCostDeviation?.toFixed(6) || "0.000000"}</span>
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground border-t border-green-200 mt-2">
                    提示：确认成本后，系统将以供应商账单金额作为最终执行成本，并锁定数据。
                  </div>
                </div>
              </div>

              {/* 底部操作按钮 */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="w-3.5 h-3.5" />
                  导出差异明细
                </Button>
                {selectedBill.status !== "confirmed" && (
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={selectedBill.matchRate !== 100 && !(selectedBill.diffAmount === 0 && selectedBill.noPlatformRecords === 0)}
                    onClick={() => {
                      handleConfirmCost(selectedBill.id);
                      setMatchReportOpen(false);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    确认成本并入账
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: 用户账单管理 ───────────────────────────────────────────────────

// 用户账单相关类型
type RebateStatus = "none" | "pending" | "toSend" | "sent";

interface UserBillRecord {
  id: string;
  enterprise: string;
  subjectId: string;         // 主体ID
  spaceType: "personal" | "enterprise";  // 空间类型：个人空间、企业空间
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  currency: string;
  generatedAt: string;
  status: "pending" | "confirmed";  // 待确认 / 已确认
  settledAt?: string;  // 结清时间
  sentAt?: string;     // 返券发放时间
  rebateStatus: RebateStatus;
  rebateAmount?: number;
  voucherCode?: string;
  voucherExpiryDate?: string;
  voucherExpiryDays?: number;
  voucherRemainingAmount?: number;
  sentRebateAmount?: number;   // 已发放金额（重新生成后保留）
  voucherUsedAmount?: number;  // 已使用金额
  diffVoucherCode?: string;    // 差额补发代金券编号
  diffVoucherAmount?: number;  // 差额补发金额
  diffVoucherSentAt?: string;  // 差额补发时间
  diffVoucherRemark?: string;  // 差额补发备注
  details: UserBillDetail[];
  subscriptionOrders?: SubscriptionOrder[]; // 订阅购买明细
}

interface UserBillDetail {
  modelName: string;
  billingType: "token" | "call";  // 计费类型：按量计费 或 按次计费
  pricingItems?: Array<{
    billingType: "按量计费" | "按次计费" | "按时长计费";
    itemName: string;
    specification: string;
    usage: string;
    unitPrice: string;
    amount: number;
  }>;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  inputPrice: number;
  outputPrice: number;
  cacheDiscount: number;
  tierDiscount: number;
  subtotal: number;
  rebateDiscount?: number;   // 返券折扣(%)
  callCount?: number;        // 调用次数（按次计费时有效）
  callPrice?: number;        // 调用单价（元/次，按次计费时有效）
  subscriptionDeduction?: number; // 订阅包抵扣
  resourcePackDeduction?: number; // 资源包抵扣
  voucherDeduction?: number; // 代金券抵扣
  balanceDeduction?: number; // 充值余额支付
  creditDeduction?: number;  // 授信额度支付
}

interface SubscriptionOrder {
  orderNo: string;           // 订单号
  productName: string;       // 商品名称
  productType: "订阅包" | "资源包"; // 商品类型
  orderType: "新购" | "续费" | "升级"; // 订单类型
  billingCycle: "按月" | "按年"; // 计费周期
  unitPrice: number;         // 单价
  quantity: number;          // 数量
  orderAmount: number;       // 订单金额
  paymentMethod: string;     // 支付方式
  createdAt: string;         // 创建时间
  paidAt: string;            // 支付时间
  effectiveStart: string;    // 生效开始时间
  effectiveEnd: string;      // 生效结束时间
  config: string;            // 配置
  billingMethod: string;     // 计费方式
  duration: string;          // 生效时长
  discountAmount: number;    // 价格优惠
  paidAmount: number;        // 实付金额
}

// Mock 数据 - 用户账单
const MOCK_USER_BILLS: UserBillRecord[] = [
  {
    id: "BILL-202604-001",
    enterprise: "星辰科技",
    subjectId: "ENT-001",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 158000.50,
    currency: "CNY",
    generatedAt: "2026-04-01 00:05:23",
    status: "pending",
    rebateStatus: "toSend",
    rebateAmount: 11492.55,
    voucherCode: "VCBILL-2029379",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 11492.55,
    details: [
      // gpt-4o 按量计费（第一行展示按量计费）
      { modelName: "gpt-4o", billingType: "token", inputTokens: 125000000, outputTokens: 45000000, cacheReadTokens: 8000000, cacheCreateTokens: 2000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 1, subtotal: 45800.25, voucherDeduction: 5000, balanceDeduction: 40800.25 },
      // whisper-1 按次计费（语音转文字）
      { modelName: "whisper-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 1, subtotal: 4100.00, callCount: 8200, callPrice: 0.5, voucherDeduction: 0, balanceDeduction: 4100.00 },
      // claude-3.5-sonnet 按量计费
      { modelName: "claude-3.5-sonnet", billingType: "token", inputTokens: 98000000, outputTokens: 32000000, cacheReadTokens: 5000000, cacheCreateTokens: 1500000, inputPrice: 0.00016, outputPrice: 0.0008, cacheDiscount: 0.5, tierDiscount: 1, subtotal: 38500.80, voucherDeduction: 3000, balanceDeduction: 35500.80 },
      // text-embedding-3 按次计费（嵌入模型）
      { modelName: "text-embedding-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 1, subtotal: 1720.00, callCount: 4300, callPrice: 0.4, voucherDeduction: 0, balanceDeduction: 1720.00 },
      // 智谱模型：按上下文长度区分计费
      {
        modelName: "glm-4-long-context", billingType: "token", inputTokens: 0, outputTokens: 0,
        cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0,
        cacheDiscount: 1, tierDiscount: 0.9, subtotal: 24700.45,
        voucherDeduction: 2000, balanceDeduction: 22700.45,
        pricingItems: [
          { billingType: "按量计费", itemName: "输入", specification: "上下文 ≤32K", usage: "65,000,000 Tokens", unitPrice: "¥5.00/M Tokens", amount: 14166.85 },
          { billingType: "按量计费", itemName: "输出", specification: "上下文 ≤32K", usage: "28,000,000 Tokens", unitPrice: "¥22.00/M Tokens", amount: 9625.20 },
          { billingType: "按量计费", itemName: "缓存命中", specification: "上下文 ≤32K", usage: "5,000,000 Tokens", unitPrice: "¥1.20/M Tokens", amount: 93.75 },
          { billingType: "按量计费", itemName: "输入", specification: "上下文 >32K", usage: "3,000,000 Tokens", unitPrice: "¥7.00/M Tokens", amount: 328.05 },
          { billingType: "按量计费", itemName: "输出", specification: "上下文 >32K", usage: "1,000,000 Tokens", unitPrice: "¥26.00/M Tokens", amount: 406.20 },
          { billingType: "按量计费", itemName: "缓存命中", specification: "上下文 >32K", usage: "3,000,000 Tokens", unitPrice: "¥1.80/M Tokens", amount: 80.40 },
        ],
      },
      // dall-e-3 按次计费（图像生成）
      {
        modelName: "video-generation-pro", billingType: "call", inputTokens: 0, outputTokens: 0,
        cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0,
        cacheDiscount: 1, tierDiscount: 1, subtotal: 5120.00, callCount: 1920, callPrice: 0,
        voucherDeduction: 0, balanceDeduction: 5120.00,
        pricingItems: [
          { billingType: "按次计费", itemName: "输出", specification: "文生/图生视频、768P、6s", usage: "1,200 次", unitPrice: "¥2.00/次", amount: 2400 },
          { billingType: "按次计费", itemName: "输出", specification: "文生/图生视频、768P、10s", usage: "400 次", unitPrice: "¥4.00/次", amount: 1600 },
          { billingType: "按次计费", itemName: "输出", specification: "文生/图生视频、1080P、6s", usage: "320 次", unitPrice: "¥3.50/次", amount: 1120 },
        ],
      },
      // tts-1 按次计费（语音合成）
      { modelName: "tts-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 1, subtotal: 3600.00, callCount: 12000, callPrice: 0.3, voucherDeduction: 0, balanceDeduction: 3600.00 },
      // MiniMax：按音频字符量计费
      {
        modelName: "minimax-speech-2.6", billingType: "token", inputTokens: 0, outputTokens: 0,
        cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0,
        cacheDiscount: 1, tierDiscount: 1, subtotal: 3600.00,
        voucherDeduction: 0, balanceDeduction: 3600.00,
        pricingItems: [
          { billingType: "按量计费", itemName: "输出", specification: "音频", usage: "18,000,000 字符", unitPrice: "¥200.00/M 字符", amount: 3600.00 },
        ],
      },
      // Seedance：按分辨率及输入是否包含视频区分计费
      {
        modelName: "doubao-seedance-2-0-260128", billingType: "token", inputTokens: 0, outputTokens: 0,
        cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0,
        cacheDiscount: 1, tierDiscount: 0.9, subtotal: 51047.39,
        voucherDeduction: 3000, balanceDeduction: 48047.39,
        pricingItems: [
          { billingType: "按量计费", itemName: "输出", specification: "包含视频输入、480/720p", usage: "384,397,113 Tokens", unitPrice: "¥28.00/M Tokens", amount: 9686.81 },
          { billingType: "按量计费", itemName: "输出", specification: "不包含视频输入、480/720p", usage: "216,879,637 Tokens", unitPrice: "¥46.00/M Tokens", amount: 8978.17 },
          { billingType: "按量计费", itemName: "输出", specification: "包含视频输入、1080p", usage: "144,441,996 Tokens", unitPrice: "¥31.00/M Tokens", amount: 4029.93 },
          { billingType: "按量计费", itemName: "输出", specification: "不包含视频输入、1080p", usage: "289,489,249 Tokens", unitPrice: "¥51.00/M Tokens", amount: 13285.67 },
          { billingType: "按量计费", itemName: "输出", specification: "包含视频输入、4K", usage: "140,089,456 Tokens", unitPrice: "¥16.00/M Tokens", amount: 2017.29 },
          { billingType: "按量计费", itemName: "输出", specification: "不包含视频输入、4K", usage: "557,563,795 Tokens", unitPrice: "¥26.00/M Tokens", amount: 13049.52 },
        ],
      },
    ],
    subscriptionOrders: [
      { orderNo: "ORD20260314001", productName: "Enterprise 标准版", productType: "订阅包", orderType: "新购", billingCycle: "按月", unitPrice: 2999.00, quantity: 1, orderAmount: 2999.00, paymentMethod: "充值余额", createdAt: "2026-03-14 10:23:18", paidAt: "2026-03-14 10:23:25", effectiveStart: "2026-03-14 10:23:25", effectiveEnd: "2026-04-14 10:23:25", config: "Enterprise 标准版 × 5席", billingMethod: "包年包月", duration: "1 个月", discountAmount: 300.00, paidAmount: 2699.00 },
      { orderNo: "ORD20260320002", productName: "Token 资源包 1000万", productType: "资源包", orderType: "新购", billingCycle: "按年", unitPrice: 999.00, quantity: 1, orderAmount: 999.00, paymentMethod: "充值余额", createdAt: "2026-03-20 09:15:02", paidAt: "2026-03-20 09:15:40", effectiveStart: "2026-03-20 09:15:40", effectiveEnd: "2027-03-20 09:15:40", config: "", billingMethod: "一次性", duration: "12 个月", discountAmount: 100.00, paidAmount: 899.00 },
      { orderNo: "ORD20260325003", productName: "Enterprise 标准版", productType: "订阅包", orderType: "续费", billingCycle: "按月", unitPrice: 2999.00, quantity: 1, orderAmount: 2999.00, paymentMethod: "充值余额", createdAt: "2026-03-25 14:05:00", paidAt: "2026-03-25 14:05:30", effectiveStart: "2026-03-25 14:05:30", effectiveEnd: "2026-04-25 14:05:30", config: "Enterprise 标准版 × 5席", billingMethod: "包年包月", duration: "1 个月", discountAmount: 0, paidAmount: 2999.00 },
    ]
  },
  {
    id: "BILL-202604-002",
    enterprise: "未来智能",
    subjectId: "ENT-002",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 89500.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:05:45",
    status: "confirmed",
    settledAt: "2026-04-02 10:30:00",
    rebateStatus: "sent",
    rebateAmount: 5237.00,
    voucherCode: "VCBILL-2029380",
    voucherExpiryDate: "2026-05-31 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 4451.45,
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 85000000, outputTokens: 25000000, cacheReadTokens: 5000000, cacheCreateTokens: 1000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 28500.00 },
      { modelName: "gemini-1.5-pro", billingType: "token", inputTokens: 45000000, outputTokens: 15000000, cacheReadTokens: 2000000, cacheCreateTokens: 500000, inputPrice: 0.00012, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.93, subtotal: 15200.00 },
      { modelName: "text-embedding-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.93, subtotal: 1800.00, callCount: 3000, callPrice: 0.6 },
      { modelName: "dall-e-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 2800.00, callCount: 5600, callPrice: 0.5 },
      { modelName: "tts-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 1500.00, callCount: 5000, callPrice: 0.3 },
      { modelName: "whisper-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 2100.00, callCount: 4200, callPrice: 0.5 },
      { modelName: "claude-3-haiku", billingType: "token", inputTokens: 35000000, outputTokens: 12000000, cacheReadTokens: 2000000, cacheCreateTokens: 600000, inputPrice: 0.00008, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.93, subtotal: 7800.00 },
      { modelName: "moderation", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.98, subtotal: 800.00, callCount: 4000, callPrice: 0.2 },
    ]
  },
  {
    id: "BILL-202604-003",
    enterprise: "云图网络",
    subjectId: "ENT-003",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 256000.80,
    currency: "CNY",
    generatedAt: "2026-04-01 00:06:12",
    status: "confirmed",
    settledAt: "2026-04-03 14:20:00",
    rebateStatus: "pending",
    rebateAmount: 26048.06,
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 200000000, outputTokens: 80000000, cacheReadTokens: 15000000, cacheCreateTokens: 5000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.88, subtotal: 75600.80, rebateDiscount: 8 },
      { modelName: "claude-3-opus", billingType: "token", inputTokens: 120000000, outputTokens: 50000000, cacheReadTokens: 8000000, cacheCreateTokens: 3000000, inputPrice: 0.00025, outputPrice: 0.00125, cacheDiscount: 0.5, tierDiscount: 0.88, subtotal: 98000.00, rebateDiscount: 12 },
      { modelName: "azure-gpt-4", billingType: "token", inputTokens: 80000000, outputTokens: 35000000, cacheReadTokens: 4000000, cacheCreateTokens: 2000000, inputPrice: 0.00018, outputPrice: 0.00072, cacheDiscount: 0.5, tierDiscount: 0.88, subtotal: 82400.00, rebateDiscount: 10 },
    ]
  },
  {
    id: "BILL-202604-004",
    enterprise: "数链信息",
    subjectId: "ENT-004",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 45600.25,
    currency: "CNY",
    generatedAt: "2026-04-01 00:06:38",
    status: "pending",
    rebateStatus: "toSend",
    rebateAmount: 4231.62,
    voucherCode: "VCBILL-2029381",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 4231.62,
    details: [
      { modelName: "gpt-4o-mini", billingType: "token", inputTokens: 500000000, outputTokens: 120000000, cacheReadTokens: 20000000, cacheCreateTokens: 5000000, inputPrice: 0.000015, outputPrice: 0.00006, cacheDiscount: 0.5, tierDiscount: 0.98, subtotal: 15600.25 },
      { modelName: "ernie-4.0", billingType: "token", inputTokens: 40000000, outputTokens: 15000000, cacheReadTokens: 2000000, cacheCreateTokens: 500000, inputPrice: 0.00012, outputPrice: 0.00048, cacheDiscount: 0.6, tierDiscount: 0.95, subtotal: 13000.00 },
      { modelName: "glm-4", billingType: "token", inputTokens: 35000000, outputTokens: 12000000, cacheReadTokens: 1500000, cacheCreateTokens: 400000, inputPrice: 0.0001, outputPrice: 0.0005, cacheDiscount: 0.6, tierDiscount: 0.95, subtotal: 12000.00 },
      { modelName: "text-embedding-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 1250.00, callCount: 2500, callPrice: 0.5 },
      { modelName: "tts-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.98, subtotal: 660.00, callCount: 2200, callPrice: 0.3 },
      { modelName: "whisper-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 1500.00, callCount: 3000, callPrice: 0.5 },
      { modelName: "moderation", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.98, subtotal: 320.00, callCount: 1600, callPrice: 0.2 },
      { modelName: "dall-e-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 270.00, callCount: 540, callPrice: 0.5 },
    ]
  },
  {
    id: "BILL-202604-005",
    enterprise: "智联系统",
    subjectId: "ENT-005",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 67800.60,
    currency: "CNY",
    generatedAt: "2026-04-01 00:07:05",
    status: "pending",
    rebateStatus: "none",
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 60000000, outputTokens: 25000000, cacheReadTokens: 4000000, cacheCreateTokens: 1000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 22800.60 },
      { modelName: "claude-3.5-sonnet", billingType: "token", inputTokens: 45000000, outputTokens: 18000000, cacheReadTokens: 3000000, cacheCreateTokens: 800000, inputPrice: 0.00016, outputPrice: 0.0008, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 18500.00 },
      { modelName: "gemini-1.5-pro", billingType: "token", inputTokens: 38000000, outputTokens: 12000000, cacheReadTokens: 2500000, cacheCreateTokens: 600000, inputPrice: 0.00012, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 13000.00 },
      { modelName: "glm-4", billingType: "token", inputTokens: 30000000, outputTokens: 10000000, cacheReadTokens: 2000000, cacheCreateTokens: 500000, inputPrice: 0.0001, outputPrice: 0.0005, cacheDiscount: 0.6, tierDiscount: 0.95, subtotal: 13500.00 },
    ]
  },
  {
    id: "BILL-202604-006",
    enterprise: "领航科技",
    subjectId: "ENT-006",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 32000.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:08:12",
    status: "confirmed",
    settledAt: "2026-04-05 09:15:00",
    rebateStatus: "sent",
    rebateAmount: 3000.00,
    voucherCode: "VCBILL-2029382",
    voucherExpiryDate: "2026-06-30 23:59:59",
    voucherExpiryDays: 180,
    voucherRemainingAmount: 0,
    details: [
      { modelName: "gpt-4o-mini", billingType: "token", inputTokens: 120000000, outputTokens: 40000000, cacheReadTokens: 8000000, cacheCreateTokens: 2000000, inputPrice: 0.000015, outputPrice: 0.00006, cacheDiscount: 0.5, tierDiscount: 0.97, subtotal: 4200.00 },
      { modelName: "gemini-1.5-pro", billingType: "token", inputTokens: 80000000, outputTokens: 25000000, cacheReadTokens: 5000000, cacheCreateTokens: 1200000, inputPrice: 0.00012, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 5200.00 },
    ]
  },
  {
    id: "BILL-202604-007",
    enterprise: "云海数据",
    subjectId: "ENT-007",
    spaceType: "enterprise",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    totalAmount: 95000.00,
    currency: "CNY",
    generatedAt: "2026-03-01 00:03:45",
    status: "confirmed",
    settledAt: "2026-03-03 11:20:00",
    rebateStatus: "sent",
    rebateAmount: 8500.00,
    voucherCode: "VCBILL-2029383",
    voucherExpiryDate: "2026-04-30 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 8500.00,
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 180000000, outputTokens: 60000000, cacheReadTokens: 12000000, cacheCreateTokens: 4000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.9, subtotal: 58800.00 },
      { modelName: "claude-3.5-sonnet", billingType: "token", inputTokens: 90000000, outputTokens: 35000000, cacheReadTokens: 6000000, cacheCreateTokens: 2000000, inputPrice: 0.00016, outputPrice: 0.0008, cacheDiscount: 0.5, tierDiscount: 0.9, subtotal: 36200.00 },
    ]
  },
  // 以下5条为重新生成后差额处理状态示例
  {
    id: "BILL-202604-008",
    enterprise: "恒通科技",
    subjectId: "ENT-008",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 68000.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:08:00",
    status: "confirmed",
    rebateStatus: "sent",
    rebateAmount: 5200.00,
    sentRebateAmount: 5200.00,
    voucherCode: "VCBILL-2029384",
    voucherExpiryDate: "2026-05-31 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 5200.00,
    voucherUsedAmount: 0,
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 80000000, outputTokens: 30000000, cacheReadTokens: 5000000, cacheCreateTokens: 2000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.9, subtotal: 28200.00, rebateDiscount: 10 },
      { modelName: "claude-3-haiku", billingType: "token", inputTokens: 60000000, outputTokens: 20000000, cacheReadTokens: 4000000, cacheCreateTokens: 1500000, inputPrice: 0.00008, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.9, subtotal: 12800.00, rebateDiscount: 10 },
    ]
  },
  {
    id: "BILL-202604-009",
    enterprise: "先锋智能",
    subjectId: "ENT-009",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 88000.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:08:30",
    status: "confirmed",
    rebateStatus: "sent",
    rebateAmount: 7500.00,
    sentRebateAmount: 5000.00,
    voucherCode: "VCBILL-2029385",
    voucherExpiryDate: "2026-05-31 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 5000.00,
    voucherUsedAmount: 0,
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 100000000, outputTokens: 35000000, cacheReadTokens: 6000000, cacheCreateTokens: 2000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.9, subtotal: 34500.00, rebateDiscount: 10 },
      { modelName: "gemini-1.5-pro", billingType: "token", inputTokens: 50000000, outputTokens: 15000000, cacheReadTokens: 3000000, cacheCreateTokens: 1000000, inputPrice: 0.00012, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.9, subtotal: 15500.00, rebateDiscount: 10 },
    ]
  },
  {
    id: "BILL-202604-010",
    enterprise: "信达信息",
    subjectId: "ENT-010",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 55000.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:09:00",
    status: "confirmed",
    rebateStatus: "sent",
    rebateAmount: 3500.00,
    sentRebateAmount: 5000.00,
    voucherCode: "VCBILL-2029386",
    voucherExpiryDate: "2026-05-31 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 5000.00,
    voucherUsedAmount: 0,
    details: [
      { modelName: "gpt-4o-mini", billingType: "token", inputTokens: 200000000, outputTokens: 50000000, cacheReadTokens: 10000000, cacheCreateTokens: 3000000, inputPrice: 0.000015, outputPrice: 0.00006, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 10500.00, rebateDiscount: 10 },
      { modelName: "text-embedding-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 8000.00, callCount: 20000, callPrice: 0.4 },
    ]
  },
  {
    id: "BILL-202604-011",
    enterprise: "远航系统",
    subjectId: "ENT-011",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 62000.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:09:30",
    status: "confirmed",
    rebateStatus: "sent",
    rebateAmount: 3000.00,
    sentRebateAmount: 5000.00,
    voucherCode: "VCBILL-2029387",
    voucherExpiryDate: "2026-05-31 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 2000.00,
    voucherUsedAmount: 3000.00,
    details: [
      { modelName: "glm-4", billingType: "token", inputTokens: 70000000, outputTokens: 25000000, cacheReadTokens: 4000000, cacheCreateTokens: 1500000, inputPrice: 0.0001, outputPrice: 0.0005, cacheDiscount: 0.6, tierDiscount: 0.92, subtotal: 16200.00, rebateDiscount: 10 },
      { modelName: "tts-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.92, subtotal: 3800.00, callCount: 12666, callPrice: 0.3 },
    ]
  },
  {
    id: "BILL-202604-012",
    enterprise: "启明数字",
    subjectId: "ENT-012",
    spaceType: "enterprise",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    totalAmount: 48000.00,
    currency: "CNY",
    generatedAt: "2026-04-01 00:10:00",
    status: "confirmed",
    rebateStatus: "sent",
    rebateAmount: 2800.00,
    sentRebateAmount: 5000.00,
    voucherCode: "VCBILL-2029388",
    voucherExpiryDate: "2026-05-31 23:59:59",
    voucherExpiryDays: 60,
    voucherRemainingAmount: 0,
    voucherUsedAmount: 5000.00,
    details: [
      { modelName: "dall-e-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.9, subtotal: 12000.00, callCount: 15000, callPrice: 0.8 },
      { modelName: "whisper-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.9, subtotal: 8000.00, callCount: 16000, callPrice: 0.5 },
    ]
  },
];

function UserBillManagement() {
  const [bills, setBills] = useState<UserBillRecord[]>(MOCK_USER_BILLS);
  const [subjectNameFilter, setSubjectNameFilter] = useState<string>("");  // 主体名称搜索
  const [spaceTypeFilter, setSpaceTypeFilter] = useState<string>("all");   // 空间类型筛选
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rebateStatusFilter, setRebateStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [previewBill, setPreviewBill] = useState<UserBillRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 返券处理弹窗状态
  const [rebateDialogOpen, setRebateDialogOpen] = useState(false);
  const [rebateBill, setRebateBill] = useState<UserBillRecord | null>(null);
  const [rebateStep, setRebateStep] = useState<0 | 1 | 2>(0);
  const [rebateExpiryDays, setRebateExpiryDays] = useState<number>(60);
  const [specialExpiryOpen, setSpecialExpiryOpen] = useState(false);
  const [use180Days, setUse180Days] = useState(false);
  const [specialConfirmOpen, setSpecialConfirmOpen] = useState(false);
  // 重新生成账单相关状态
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePeriod, setRegeneratePeriod] = useState<string>("");
  const [regenerateType, setRegenerateType] = useState<"personal" | "enterprise">("enterprise");
  const [regenerateSubject, setRegenerateSubject] = useState<string>("");
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>("");
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerateConfirmType, setRegenerateConfirmType] = useState<"toSend" | "sent" | null>(null);
  const [diffConfirmOpen, setDiffConfirmOpen] = useState(false);
  // 全量客户账单导出
  const availableBillPeriods = useMemo(
    () => Array.from(new Set(bills.map((bill) => bill.periodStart.slice(0, 7)))).sort().reverse(),
    [bills]
  );
  const [fullBillOpen, setFullBillOpen] = useState(false);
  const [fullBillPeriod, setFullBillPeriod] = useState("");
  const [fullBillStatus, setFullBillStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [fullBillGeneratedAt, setFullBillGeneratedAt] = useState("");

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // 主体名称模糊搜索
      const matchSubject = subjectNameFilter === "" || 
        bill.enterprise.toLowerCase().includes(subjectNameFilter.toLowerCase());
      // 空间类型筛选
      const matchSpaceType = spaceTypeFilter === "all" || bill.spaceType === spaceTypeFilter;
      const matchPeriod = periodFilter === "" || bill.periodStart.startsWith(periodFilter);
      const matchStatus = statusFilter === "all" || bill.status === statusFilter;
      const matchRebateStatus = rebateStatusFilter === "all" || bill.rebateStatus === rebateStatusFilter;
      const matchSearch = searchQuery === "" ||
        bill.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSpaceType && matchPeriod && matchStatus && matchRebateStatus && matchSearch;
    });
  }, [bills, subjectNameFilter, spaceTypeFilter, periodFilter, statusFilter, rebateStatusFilter, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBills(filteredBills.map((b) => b.id));
    } else {
      setSelectedBills([]);
    }
  };

  const handleSelectBill = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedBills([...selectedBills, id]);
    } else {
      setSelectedBills(selectedBills.filter((bid) => bid !== id));
    }
  };

  // 确认账单（运营确认收到款项）
  const handleMarkSettled = (id: string) => {
    const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    setBills(bills.map((b) => b.id === id ? { ...b, status: "confirmed" as const, settledAt: now } : b));
    setPreviewBill((prev) => prev && prev.id === id ? { ...prev, status: "confirmed" as const, settledAt: now } : prev);
  };

  // 撤销确认（款项未到账或误操作）
  const handleUndoSettled = (id: string) => {
    setBills(bills.map((b) => b.id === id ? { ...b, status: "pending" as const, settledAt: undefined } : b));
    setPreviewBill((prev) => prev && prev.id === id ? { ...prev, status: "pending" as const, settledAt: undefined } : prev);
  };

  const handleBatchDownload = () => {
    alert(`批量下载 ${selectedBills.length} 个账单`);
  };

  const getBillingLineItems = (detail: UserBillDetail) => {
    if (detail.pricingItems?.length) return detail.pricingItems;

    if (detail.billingType === "call") {
      const outputSpecification = detail.modelName.includes("embedding")
        ? "向量化"
        : detail.modelName.includes("tts")
          ? "语音合成"
          : detail.modelName.includes("whisper")
            ? "语音识别"
            : "按次调用";
      return [{
        billingType: "按次计费" as const,
        itemName: "输出",
        specification: outputSpecification,
        usage: `${formatNumber(detail.callCount || 0)} 次`,
        unitPrice: `¥${(detail.callPrice || 0).toFixed(2)}/次`,
        amount: detail.subtotal,
      }];
    }

    const weightedItems = [
      detail.inputTokens > 0 ? {
        billingType: "按量计费" as const, itemName: "输入", specification: "文本",
        usage: `${formatNumber(detail.inputTokens)} Tokens`,
        unitPrice: `¥${(detail.inputPrice * 1000000 * 7.2).toFixed(2)}/M Tokens`,
        weight: detail.inputTokens * detail.inputPrice,
      } : null,
      detail.outputTokens > 0 ? {
        billingType: "按量计费" as const, itemName: "输出", specification: "文本",
        usage: `${formatNumber(detail.outputTokens)} Tokens`,
        unitPrice: `¥${(detail.outputPrice * 1000000 * 7.2).toFixed(2)}/M Tokens`,
        weight: detail.outputTokens * detail.outputPrice,
      } : null,
      detail.cacheReadTokens > 0 ? {
        billingType: "按量计费" as const, itemName: "缓存读取", specification: "—",
        usage: `${formatNumber(detail.cacheReadTokens)} Tokens`,
        unitPrice: `¥${(detail.inputPrice * detail.cacheDiscount * 1000000 * 7.2).toFixed(2)}/M Tokens`,
        weight: detail.cacheReadTokens * detail.inputPrice * detail.cacheDiscount,
      } : null,
      detail.cacheCreateTokens > 0 ? {
        billingType: "按量计费" as const, itemName: "缓存创建", specification: "—",
        usage: `${formatNumber(detail.cacheCreateTokens)} Tokens`,
        unitPrice: `¥${(detail.inputPrice * detail.cacheDiscount * 1000000 * 7.2).toFixed(2)}/M Tokens`,
        weight: detail.cacheCreateTokens * detail.inputPrice * detail.cacheDiscount,
      } : null,
    ].filter(Boolean) as Array<{
      billingType: "按量计费";
      itemName: string;
      specification: string;
      usage: string;
      unitPrice: string;
      weight: number;
    }>;

    const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0) || 1;
    return weightedItems.map((item) => ({
      billingType: item.billingType,
      itemName: item.itemName,
      specification: item.specification,
      usage: item.usage,
      unitPrice: item.unitPrice,
      amount: detail.subtotal * item.weight / totalWeight,
    }));
  };

  const getUsageDisplay = (usage: string, unitPrice: string) => {
    const match = usage.trim().match(/^([\d,]+(?:\.\d+)?)\s+(.+)$/);
    if (!match) return { value: usage, unit: "—" };
    const rawValue = Number(match[1].replace(/,/g, ""));
    const rawUnit = match[2];
    if (unitPrice.includes("/M Tokens") && rawUnit === "Tokens") {
      return { value: formatNumber(rawValue / 1_000_000), unit: "百万 Tokens" };
    }
    if (unitPrice.includes("/M 字符") && rawUnit === "字符") {
      return { value: formatNumber(rawValue / 1_000_000), unit: "百万字符" };
    }
    return { value: match[1], unit: rawUnit };
  };

  const getPriceDisplay = (unitPrice: string) => {
    const match = unitPrice.trim().match(/^([¥$])([\d,]+(?:\.\d+)?)(?:\/(.+))?$/);
    if (!match) return { value: unitPrice, unit: "—" };
    const currency = match[1] === "¥" ? "元" : "美元";
    const denominator = match[3]
      ?.replace(/^M Tokens$/, "百万 Tokens")
      .replace(/^M 字符$/, "百万字符");
    return { value: match[2], unit: denominator ? `${currency}/${denominator}` : currency };
  };

  const fullBillRecords = useMemo(
    () => bills.filter((bill) => bill.periodStart.startsWith(fullBillPeriod)),
    [bills, fullBillPeriod]
  );
  const isTestCustomer = (bill: UserBillRecord) => ["ENT-010", "ENT-011", "ENT-012"].includes(bill.subjectId);
  const fullBillFormalCount = fullBillRecords.filter((bill) => !isTestCustomer(bill)).length;
  const fullBillTestCount = fullBillRecords.filter(isTestCustomer).length;

  const handleOpenFullBill = () => {
    setFullBillPeriod(periodFilter || availableBillPeriods[0] || "");
    setFullBillStatus("idle");
    setFullBillGeneratedAt("");
    setFullBillOpen(true);
  };

  const handleGenerateFullBill = () => {
    if (!fullBillPeriod || fullBillRecords.length === 0) return;
    setFullBillStatus("generating");
    window.setTimeout(() => {
      setFullBillGeneratedAt(format(new Date(), "yyyy-MM-dd HH:mm:ss"));
      setFullBillStatus("ready");
    }, 900);
  };

  const handleDownloadFullBill = () => {
    const escapeCell = (value: string | number) =>
      String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = fullBillRecords.flatMap((bill) =>
      bill.details.flatMap((detail) =>
        getBillingLineItems(detail).map((item, itemIndex) => {
          const billingItemLabel = item.specification && !["—", "文本"].includes(item.specification)
            ? `${item.itemName}（${item.specification}）`
            : item.itemName;
          const usage = getUsageDisplay(item.usage, item.unitPrice);
          const price = getPriceDisplay(item.unitPrice);
          return `
        <tr>
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell(fullBillPeriod)}</td>` : ""}
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell(bill.enterprise)}</td>` : ""}
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell(detail.modelName)}</td>` : ""}
          <td>${escapeCell(billingItemLabel)}</td>
          <td>${escapeCell(price.value)}</td>
          <td>${escapeCell(price.unit)}</td>
          <td>${escapeCell(usage.value)}</td>
          <td>${escapeCell(usage.unit)}</td>
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell(`${(detail.tierDiscount * 100).toFixed(0)}%`)}</td>` : ""}
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell(detail.subtotal.toFixed(2))}</td>` : ""}
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell((detail.voucherDeduction || 0).toFixed(2))}</td>` : ""}
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell((detail.balanceDeduction ?? detail.subtotal).toFixed(2))}</td>` : ""}
          ${itemIndex === 0 ? `<td rowspan="${getBillingLineItems(detail).length}">${escapeCell((detail.creditDeduction || 0).toFixed(2))}</td>` : ""}
        </tr>`;
        })
      )
    ).join("");
    const workbook = `<!doctype html><html><head><meta charset="UTF-8"></head><body>
      <table border="1">
        <thead><tr>
          <th>账期</th><th>客户名称</th><th>模型名称</th><th>计费项</th><th>计费单价</th><th>计费单位</th><th>用量</th><th>用量单位</th>
          <th>阶梯折扣</th><th>实际消费（元）</th><th>代金券抵扣（元）</th><th>充值余额支付（元）</th><th>授信额度支付（元）</th>
        </tr></thead><tbody>${rows}</tbody>
      </table>
    </body></html>`;
    const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `全量客户账单_${fullBillPeriod}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    // 默认使用当前筛选的账期，如果没有则使用上个月
    const defaultPeriod = periodFilter || format(new Date(), "yyyy-MM");
    setRegeneratePeriod(defaultPeriod);
    setRegenerateOpen(true);
  };

  const handleDoRegenerate = () => {
    if (regenerateConfirmType === "toSend") {
      // 待发放状态：重置返券状态为待确认，清除代金券信息
      setBills((prev) => prev.map((b) =>
        b.subjectId === regenerateSubject && b.periodStart.startsWith(regeneratePeriod)
          ? { ...b, rebateStatus: "pending" as const, voucherCode: undefined, voucherExpiryDays: undefined, voucherExpiryDate: undefined }
          : b
      ));
    }
    alert(`正在重新生成【${MOCK_USER_BILLS.find(b => b.subjectId === regenerateSubject)?.enterprise || "未知主体"}】在【${regeneratePeriod}】账期内的账单...`);
    setRegenerateOpen(false);
    setRegenerateConfirmOpen(false);
    setRegenerateConfirmType(null);
  };

  const handleConfirmRegenerate = () => {
    const targetBill = bills.find(
      (b) => b.subjectId === regenerateSubject && b.periodStart.startsWith(regeneratePeriod)
    );
    if (targetBill && (targetBill.rebateStatus === "toSend" || targetBill.rebateStatus === "sent")) {
      setRegenerateConfirmType(targetBill.rebateStatus);
      setRegenerateConfirmOpen(true);
      return;
    }
    handleDoRegenerate();
  };

  const handleSendDiffRebate = () => {
    if (!rebateBill) return;
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace("T", " ");
    const code = `VCBILL-DIFF-${Date.now().toString().slice(-6)}`;
    const remark = `${rebateBill.periodStart.slice(0, 7)} 账期返券差额补发`;
    const patch = {
      diffVoucherCode: code,
      diffVoucherAmount: (rebateBill.rebateAmount || 0) - (rebateBill.sentRebateAmount || 0),
      diffVoucherSentAt: nowStr,
      diffVoucherRemark: remark,
    };
    setBills((prev) => prev.map((b) => (b.id === rebateBill.id ? { ...b, ...patch } : b)));
    setRebateBill((prev) => (prev ? { ...prev, ...patch } : null));
    setDiffConfirmOpen(false);
  };

  const handlePreview = (bill: UserBillRecord) => {
    setPreviewBill(bill);
    setPreviewOpen(true);
  };

  const handleOpenRebate = (bill: UserBillRecord) => {
    let targetBill = bill;
    // 兜底：已生成/已发放状态下若缺少代金券编号，自动补一个并同步更新列表
    if (bill.rebateStatus !== "pending" && !bill.voucherCode) {
      const code = `VC${bill.id.slice(0, 8).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
      targetBill = { ...bill, voucherCode: code };
      setBills((prev) => prev.map((b) => (b.id === bill.id ? targetBill : b)));
    }
    setRebateBill(targetBill);
    const initialStep = targetBill.rebateStatus === "pending" ? 0 : 2;
    setRebateStep(initialStep as 0 | 1 | 2);
    // 若已生成/已发放且已有天数配置，则沿用；否则默认60天
    setRebateExpiryDays(targetBill.voucherExpiryDays ?? 60);
    setSpecialExpiryOpen(false);
    setUse180Days(false);
    setSpecialConfirmOpen(false);
    setRebateDialogOpen(true);
  };

  const handleGenerateVoucher = (id: string) => {
    const code = `VC${id.slice(0, 8).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const finalDays = use180Days ? 180 : rebateExpiryDays;
    setBills(bills.map((b) => b.id === id ? { ...b, rebateStatus: "toSend" as const, voucherCode: code, voucherExpiryDays: finalDays } : b));
    setRebateBill((prev) => (prev && prev.id === id ? { ...prev, rebateStatus: "toSend" as const, voucherCode: code, voucherExpiryDays: finalDays } : prev));
    setRebateStep(2);
  };

  const handleSendVoucher = (id: string) => {
    const now = new Date();
    const nowStr = format(now, "yyyy-MM-dd HH:mm:ss");
    const days = rebateBill?.voucherExpiryDays ?? rebateExpiryDays ?? 60;
    const expiry = addDays(now, days);
    expiry.setHours(23, 59, 59, 0);
    const expiryStr = format(expiry, "yyyy-MM-dd HH:mm:ss");
    setBills(bills.map((b) => b.id === id ? { ...b, rebateStatus: "sent" as const, sentAt: nowStr, voucherExpiryDate: expiryStr, voucherExpiryDays: days } : b));
    setRebateBill((prev) => (prev && prev.id === id ? { ...prev, rebateStatus: "sent" as const, sentAt: nowStr, voucherExpiryDate: expiryStr, voucherExpiryDays: days } : prev));
  };

  const getStatusBadge = (status: UserBillRecord["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1" />待确认
        </Badge>;
      case "confirmed":
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />已确认
        </Badge>;
      default: return null;
    }
  };

  const getRebateStatusBadge = (rebateStatus: RebateStatus) => {
    switch (rebateStatus) {
      case "none": return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 text-xs">无需返券</Badge>;
      case "pending": return <Badge className="bg-red-500 text-white border-red-500 hover:bg-red-600 text-xs">待确认</Badge>;
      case "toSend": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">待发放</Badge>;
      case "sent": return <Badge className="bg-green-500 text-white border-green-500 hover:bg-green-600 text-xs">已发放</Badge>;
      default: return null;
    }
  };

  const formatCurrency = (value: number) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAmount = (value: number) => value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatTokens = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
    if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
    return value.toLocaleString();
  };

  // 格式化数字为原始个数（用于模型用量和调用次数）
  const formatNumber = (value: number) => {
    return value.toLocaleString("zh-CN");
  };

  return (
    <div className="space-y-4">
      {/* Bills Table */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-sm font-medium">客户账单列表</CardTitle>
              <span className="text-xs text-muted-foreground">共 {filteredBills.length} 条记录</span>
              {selectedBills.length > 0 && (
                <span className="text-xs text-blue-600">已选择 {selectedBills.length} 项</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenFullBill}
                size="sm"
                className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                生成全量账单
              </Button>
              <Button 
                onClick={handleRegenerate} 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 text-xs"
              >
                <Loader2 className="w-3.5 h-3.5" />
                重新生成
              </Button>
              <Button 
                onClick={handleBatchDownload} 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 text-xs"
                disabled={selectedBills.length === 0}
              >
                <Download className="w-3.5 h-3.5" />
                批量下载
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b bg-muted/20">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="month"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="h-9 w-[140px] text-xs"
                placeholder="账期月份"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="账单状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待确认</SelectItem>
                  <SelectItem value="confirmed">已确认</SelectItem>
                </SelectContent>
              </Select>
              <Select value={spaceTypeFilter} onValueChange={setSpaceTypeFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="空间类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部主体</SelectItem>
                  <SelectItem value="personal">个人空间</SelectItem>
                  <SelectItem value="enterprise">企业空间</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rebateStatusFilter} onValueChange={setRebateStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue placeholder="全部返券状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部返券状态</SelectItem>
                  <SelectItem value="none">无需返券</SelectItem>
                  <SelectItem value="pending">待确认</SelectItem>
                  <SelectItem value="toSend">待发放</SelectItem>
                  <SelectItem value="sent">已发放</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="主体名称"
                  value={subjectNameFilter}
                  onChange={(e) => setSubjectNameFilter(e.target.value)}
                  className="h-9 w-[160px] pl-8 text-xs"
                />
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索账单编号"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[200px] pl-8 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={() => { setSubjectNameFilter(""); setSpaceTypeFilter("all"); setPeriodFilter(""); setStatusFilter("all"); setSearchQuery(""); }}
              >
                重置
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground w-10">
                    <input
                      type="checkbox"
                      checked={filteredBills.length > 0 && selectedBills.length === filteredBills.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">账单编号</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">空间类型</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">主体名称</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">账期</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">账单总额</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">生成时间</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">返券状态</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">应返券金额</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBills.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">暂无账单记录</td></tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-muted/30">
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBills.includes(bill.id)}
                          onChange={(e) => handleSelectBill(bill.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{bill.id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${bill.spaceType === "enterprise" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-purple-600 border-purple-200 bg-purple-50"}`}>
                          {bill.spaceType === "enterprise" ? "企业空间" : "个人空间"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{bill.enterprise}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{bill.subjectId}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {bill.periodStart.slice(0, 7)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        {formatCurrency(bill.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(bill.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{bill.generatedAt}</td>
                      <td className="px-4 py-3 text-center">{getRebateStatusBadge(bill.rebateStatus)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {bill.rebateStatus === "toSend" || bill.rebateStatus === "sent"
                          ? formatCurrency(bill.rebateAmount || 0)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handlePreview(bill)}
                          >
                            预览
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            下载
                          </Button>
                          {bill.rebateStatus !== "none" && (
                            <Button
                              size="sm"
                              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleOpenRebate(bill)}
                            >
                              返券处理
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 生成全量账单 */}
      <Dialog open={fullBillOpen} onOpenChange={setFullBillOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-base">生成全量账单</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label className="text-sm font-medium">账期</Label>
              <Select
                value={fullBillPeriod}
                onValueChange={(value) => {
                  setFullBillPeriod(value);
                  setFullBillStatus("idle");
                  setFullBillGeneratedAt("");
                }}
                disabled={fullBillStatus === "generating"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择账期" />
                </SelectTrigger>
                <SelectContent>
                  {availableBillPeriods.map((period) => (
                    <SelectItem key={period} value={period}>{period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              将合并 <span className="font-semibold">{fullBillRecords.length}</span> 份客户账单
              <span className="ml-2 text-xs text-muted-foreground">
                （正式客户 {fullBillFormalCount}，测试客户 {fullBillTestCount}）
              </span>
            </div>

            {fullBillRecords.length === 0 && fullBillPeriod && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                当前账期暂无可生成的客户账单。
              </div>
            )}

            {fullBillStatus === "generating" && (
              <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-700">正在生成全量账单</p>
                  <p className="text-xs text-blue-600/80">正在合并客户账单明细，请稍候…</p>
                </div>
              </div>
            )}

            {fullBillStatus === "ready" && (
              <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-700">全量账单已生成</p>
                  <p className="text-xs text-green-700/80 truncate">全量客户账单_{fullBillPeriod}.xls</p>
                  <p className="text-xs text-muted-foreground mt-1">生成时间：{fullBillGeneratedAt}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFullBillOpen(false)}>
              取消
            </Button>
            {fullBillStatus === "ready" ? (
              <Button onClick={handleDownloadFullBill} className="gap-1.5">
                <Download className="w-4 h-4" />
                下载 Excel
              </Button>
            ) : (
              <Button
                onClick={handleGenerateFullBill}
                disabled={!fullBillPeriod || fullBillRecords.length === 0 || fullBillStatus === "generating"}
              >
                {fullBillStatus === "generating" ? "生成中…" : "确认生成"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="text-base flex items-center gap-3">
              账单明细报告
              {previewBill && getStatusBadge(previewBill.status)}
              {previewBill?.settledAt && (
                <span className="text-xs font-normal text-muted-foreground">结清时间：{previewBill.settledAt}</span>
              )}
            </DialogTitle>
            <Badge variant="outline" className="text-sm font-normal px-3 py-1">
              账期：{previewBill?.periodStart?.slice(0, 7)}
            </Badge>
          </DialogHeader>
          {previewBill && (
            <div className="space-y-6 py-2">
              {/* 明细表格 */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground border-l-4 border-blue-500 pl-2">按量消费明细</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">模型名称</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground min-w-[220px]">计费项</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground min-w-[90px]">计费单价</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground min-w-[120px]">计费单位</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground min-w-[110px]">用量</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground min-w-[100px]">用量单位</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">阶梯折扣</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">实际消费（元）</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">代金券抵扣（元）</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">充值余额支付（元）</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">授信额度支付（元）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...previewBill.details]
                        .sort((a, b) => a.modelName.localeCompare(b.modelName))
                        .flatMap((detail, detailIndex) => {
                          const lineItems = getBillingLineItems(detail);
                          return lineItems.map((item, itemIndex) => {
                            const usage = getUsageDisplay(item.usage, item.unitPrice);
                            const price = getPriceDisplay(item.unitPrice);
                            return (
                              <tr key={`${detailIndex}-${itemIndex}`} className="hover:bg-muted/20">
                                {itemIndex === 0 && (
                                  <td rowSpan={lineItems.length} className="px-3 py-2 align-top border-r">
                                    <Badge variant="outline" className="text-xs font-mono">{detail.modelName}</Badge>
                                  </td>
                                )}
                                <td className="px-3 py-2">
                                  <span className="font-medium">{item.itemName}</span>
                                  {item.specification && !["—", "文本"].includes(item.specification) && (
                                    <span className="ml-1 text-muted-foreground">（{item.specification}）</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{price.value}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap">{price.unit}</td>
                                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{usage.value}</td>
                                <td className="px-3 py-2 text-center text-muted-foreground whitespace-nowrap">{usage.unit}</td>
                                {itemIndex === 0 && (
                                  <>
                                    <td rowSpan={lineItems.length} className="px-3 py-2 text-center align-middle border-l">
                                      <span className="text-green-600">{(detail.tierDiscount * 100).toFixed(0)}%</span>
                                    </td>
                                    <td rowSpan={lineItems.length} className="px-3 py-2 text-right font-mono font-medium align-middle border-l">
                                      {formatAmount(detail.subtotal)}
                                    </td>
                                    <td rowSpan={lineItems.length} className="px-3 py-2 text-right font-mono text-amber-600 align-middle">
                                      {formatAmount(detail.voucherDeduction ?? 0)}
                                    </td>
                                    <td rowSpan={lineItems.length} className="px-3 py-2 text-right font-mono align-middle">
                                      {formatAmount(detail.balanceDeduction ?? detail.subtotal)}
                                    </td>
                                    <td rowSpan={lineItems.length} className="px-3 py-2 text-right font-mono text-red-600 align-middle">
                                      {formatAmount(detail.creditDeduction ?? 0)}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          });
                        })}
                      {/* 月度汇总行 */}
                        {(() => {
                          const sortedDetails = [...previewBill.details].sort((a, b) => a.modelName.localeCompare(b.modelName));
                        const totalVoucherDeduction = sortedDetails.reduce((sum, d) => sum + (d.voucherDeduction ?? 0), 0);
                        const totalBalanceDeduction = sortedDetails.reduce((sum, d) => sum + (d.balanceDeduction ?? d.subtotal), 0);
                        const totalCreditDeduction = sortedDetails.reduce((sum, d) => sum + (d.creditDeduction ?? 0), 0);
                        return (
                          <tr className="bg-muted/50 border-t-2 border-muted font-medium">
                            <td className="px-3 py-3 font-medium text-muted-foreground" colSpan={6}>月度汇总</td>
                            <td className="px-3 py-3 text-center">-</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-green-700 border-r">{formatAmount(previewBill.totalAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-amber-600 border-r">{formatAmount(totalVoucherDeduction)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold border-r">{formatAmount(totalBalanceDeduction)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-red-600">{formatAmount(totalCreditDeduction)}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 权益购买明细表格 */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground border-l-4 border-purple-500 pl-2">权益购买明细</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr className="border-b">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">用户名称</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">商品名称</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">配置</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">计费方式</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">订单类型</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">订单号</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">数量</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">生效时长</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">生效时间</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">单价（元）</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">价格优惠（元）</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">实付金额（元）</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">充值余额支付（元）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(previewBill.subscriptionOrders || []).length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">本期无权益购买记录</td>
                        </tr>
                      ) : (
                        <>
                          {(previewBill.subscriptionOrders || []).map((order, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-medium">{previewBill.enterprise}</td>
                              <td className="px-3 py-2 font-medium">{order.productName}</td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-pre-line">{order.config || "-"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{order.billingMethod}</td>
                              <td className="px-3 py-2 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    order.orderType === "新购"
                                      ? "text-blue-600 border-blue-200 bg-blue-50"
                                      : order.orderType === "续费"
                                      ? "text-purple-600 border-purple-200 bg-purple-50"
                                      : "text-amber-600 border-amber-200 bg-amber-50"
                                  }`}
                                >
                                  {order.orderType}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{order.orderNo}</td>
                              <td className="px-3 py-2 text-right font-mono">{order.quantity}</td>
                              <td className="px-3 py-2 text-muted-foreground">{order.duration}</td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{order.effectiveStart} ~ {order.effectiveEnd}</td>
                              <td className="px-3 py-2 text-right font-mono">{formatAmount(order.unitPrice)}</td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-600">{order.discountAmount > 0 ? `-${formatAmount(order.discountAmount)}` : "-"}</td>
                              <td className="px-3 py-2 text-right font-mono font-medium">{formatAmount(order.paidAmount)}</td>
                              <td className="px-3 py-2 text-right font-mono font-medium">{formatAmount(order.orderAmount)}</td>
                            </tr>
                          ))}
                          {/* 汇总行 */}
                          <tr className="bg-muted/50 border-t-2 border-muted font-medium">
                            <td className="px-3 py-3 font-medium text-muted-foreground" colSpan={10}>权益购买汇总</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600">
                              {formatAmount((previewBill.subscriptionOrders || []).reduce((sum, o) => sum + o.discountAmount, 0))}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold">
                              {formatAmount((previewBill.subscriptionOrders || []).reduce((sum, o) => sum + o.paidAmount, 0))}
                            </td>
                            <td className="px-3 py-3 text-right font-mono font-bold">
                              {formatAmount((previewBill.subscriptionOrders || []).reduce((sum, o) => sum + o.orderAmount, 0))}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 金额汇总 - 弹窗最底部 */}
              <div className="flex items-center justify-end gap-4 pt-3 pb-1 border-t text-base">
                <span className="font-medium">本期消费金额：<span className="font-mono text-green-700 text-lg font-bold">
                  {formatCurrency(
                    previewBill.details.reduce((sum, d) => sum + (d.balanceDeduction ?? d.subtotal), 0) +
                    (previewBill.subscriptionOrders || []).reduce((sum, o) => sum + o.orderAmount, 0)
                  )}
                </span></span>
              </div>

              {/* 底部操作 */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  导出Excel
                </Button>
                {previewBill.status === "pending" && (
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleMarkSettled(previewBill.id);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    确认账单
                  </Button>
                )}
                {previewBill.status === "confirmed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                    onClick={() => {
                      handleUndoSettled(previewBill.id);
                    }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    撤销确认
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 重新生成账单弹窗 */}
      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重新生成账单</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* 个人/企业单选 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">主体类型</Label>
              <RadioGroup
                value={regenerateType}
                onValueChange={(v) => {
                  setRegenerateType(v as "personal" | "enterprise");
                  setRegenerateSubject("");
                  setSubjectSearchQuery("");
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="text-sm cursor-pointer">个人</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="enterprise" id="enterprise" />
                  <Label htmlFor="enterprise" className="text-sm cursor-pointer">企业</Label>
                </div>
              </RadioGroup>
            </div>

            {/* 选择主体 - 模糊搜索 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">选择主体</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                <Input
                  placeholder="搜索主体名称..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="h-10 pl-10"
                />
                {regenerateSubject && !subjectSearchQuery && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">已选:</span>
                    <Badge variant="secondary" className="text-xs">
                      {MOCK_USER_BILLS.find(b => b.subjectId === regenerateSubject)?.enterprise || regenerateSubject}
                    </Badge>
                    <X
                      className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setRegenerateSubject("");
                        setSubjectSearchQuery("");
                      }}
                    />
                  </div>
                )}
                {/* 搜索结果下拉 */}
                {subjectSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                    {MOCK_USER_BILLS
                      .filter(b => b.spaceType === regenerateType)
                      .filter(b => b.enterprise.toLowerCase().includes(subjectSearchQuery.toLowerCase()))
                      .slice(0, 10)
                      .map((bill) => (
                        <div
                          key={bill.subjectId}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                            regenerateSubject === bill.subjectId ? "bg-muted font-medium" : ""
                          }`}
                          onClick={() => {
                            setRegenerateSubject(bill.subjectId);
                            setSubjectSearchQuery("");
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{bill.enterprise}</span>
                            <span className="text-xs text-muted-foreground">{bill.subjectId}</span>
                          </div>
                        </div>
                      ))}
                    {MOCK_USER_BILLS.filter(b => b.spaceType === regenerateType).filter(b =>
                      b.enterprise.toLowerCase().includes(subjectSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        未找到匹配的主体
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 账期选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">选择账期</Label>
              <Input
                type="month"
                value={regeneratePeriod}
                onChange={(e) => setRegeneratePeriod(e.target.value)}
                className="h-10"
              />
            </div>

            {/* 提示文字 - 选择后才显示 */}
            {regenerateSubject && regeneratePeriod && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-700 leading-relaxed">
                  将重新生成【{MOCK_USER_BILLS.find(b => b.subjectId === regenerateSubject)?.enterprise || "未知主体"}】在【{regeneratePeriod}】账期内的账单，若存在已生成账单将被立即覆盖，是否确认执行？
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirmRegenerate}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!regeneratePeriod || !regenerateSubject}
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新生成账单二次确认弹窗 */}
      <Dialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重新生成账单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              {regenerateConfirmType === "toSend" ? (
                <p className="text-sm text-amber-700 leading-relaxed">
                  当前账单已确认返券方案，重新生成账单后，原返券方案将失效，需重新核实返券金额并确认方案。是否继续重新生成？
                </p>
              ) : (
                <>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    当前客户该账期已发放代金券。重新生成后，系统将重新计算应返券金额，并与已发放金额进行差额对比，不会再次按完整金额发放代金券。
                  </p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    若重算金额大于已发放金额，仅可补发差额；若重算金额小于已发放金额，需线下处理或后台调整。
                  </p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    是否继续重新生成？
                  </p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateConfirmOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleDoRegenerate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              确认重新生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 差额补发确认弹窗 */}
      <Dialog open={diffConfirmOpen} onOpenChange={setDiffConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认补发差额</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-amber-700 leading-relaxed">
                系统将为客户「{rebateBill?.enterprise}」补发差额代金券，金额为 {formatCurrency((rebateBill?.rebateAmount || 0) - (rebateBill?.sentRebateAmount || 0))}，补发后客户代金券余额将立即增加。是否确认执行？
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffConfirmOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSendDiffRebate} className="bg-blue-600 hover:bg-blue-700">
              确认补发
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 返券处理弹窗 */}
      <Dialog open={rebateDialogOpen} onOpenChange={setRebateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">返券处理</DialogTitle>
          </DialogHeader>
          {rebateBill && (
            <div className="space-y-5 py-2">
              {/* 账单信息 */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{rebateBill.enterprise}</p>
                    <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-5 ${rebateBill.spaceType === "enterprise" ? "text-blue-600 border-blue-200 bg-blue-50" : "text-purple-600 border-purple-200 bg-purple-50"}`}>
                      {rebateBill.spaceType === "enterprise" ? "企业空间" : "个人空间"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rebateBill.id} · {rebateBill.periodStart.slice(0, 7)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">应返券金额</p>
                  <p className="text-lg font-bold text-blue-600 font-mono">{formatCurrency(rebateBill.rebateAmount || 0)}</p>
                </div>
              </div>

              {/* 流程步骤条 */}
              <div className="flex items-center gap-2">
                {[
                  { label: "核实返券金额" },
                  { label: "确认返券方案" },
                  { label: "生成并发放" },
                ].map((step, idx) => {
                  const isActive = rebateStep >= idx;
                  const isCurrent = rebateStep === idx;
                  return (
                    <div key={idx} className="flex items-center gap-2 flex-1">
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0",
                        isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                      )}>
                        {idx + 1}
                      </div>
                      <span className={cn(
                        "text-xs whitespace-nowrap",
                        isCurrent ? "text-blue-600 font-medium" : isActive ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                      {idx < 2 && (
                        <div className={cn("flex-1 h-0.5 mx-1", rebateStep > idx ? "bg-blue-600" : "bg-gray-200")} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 动态提示 */}
              {(rebateStep === 0 || (rebateStep === 1 && rebateBill.rebateStatus === "pending") || (rebateStep === 2 && rebateBill.rebateStatus === "toSend")) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {rebateStep === 0 && "请核对应返券金额，确认无误后进入下一步确认返券方案。"}
                    {rebateStep === 1 && rebateBill.rebateStatus === "pending" && "请确认返券方案，确认后进入待发放状态，有效期配置不可修改。"}

                    {rebateStep === 2 && rebateBill.rebateStatus === "toSend" && "请确认客户已确认账单无误，并已完成打款。确认后系统将生成代金券并发放至客户账户，客户将立即可见并可用于消费抵扣。"}
                  </p>
                </div>
              )}

              {/* Step 0: 核实返券金额 */}
              {rebateStep === 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">模型名称</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">充值余额支付</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">返券比例</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">应返券金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rebateBill.details.map((d, i) => {
                        const deduction = d.balanceDeduction ?? d.subtotal;
                        return (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs font-mono">{d.modelName}</Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{formatCurrency(deduction)}</td>
                            <td className="px-3 py-2 text-right font-mono">{d.rebateDiscount ?? 0}%</td>
                            <td className="px-3 py-2 text-right font-mono text-blue-600">{formatCurrency(deduction * (d.rebateDiscount ?? 0) / 100)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-blue-50 font-medium">
                        <td className="px-3 py-2">合计</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(rebateBill.details.reduce((sum, d) => sum + (d.balanceDeduction ?? d.subtotal), 0))}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right font-mono text-blue-600">{formatCurrency(rebateBill.rebateAmount || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Step 1: 确认返券方案 */}
              {rebateStep === 1 && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-blue-500 text-white p-4 space-y-3">
                    <div className="text-center py-1">
                      <p className="text-xs text-blue-100 mb-0.5">代金券金额</p>
                      <p className="text-3xl font-bold font-mono">{formatCurrency(rebateBill.rebateAmount || 0)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-blue-100">
                      <div className="flex items-center gap-1">
                        <span className="text-blue-200 text-[10px]">有效期</span>
                        <span>发放成功后 {use180Days ? 180 : rebateExpiryDays} 天有效</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-200 text-[10px]">可用范围</span>
                        <span>模型 API 服务</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-200 text-[10px]">过期时间</span>
                        <span>发放成功后自动生成</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-blue-200 text-[10px]">备注</span>
                        <span>
                          {rebateBill.periodStart.slice(0, 7)} 账期返券，自发放成功起{use180Days ? 180 : rebateExpiryDays}天有效
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 特殊有效期配置 */}
                  {rebateBill.rebateStatus === "pending" ? (
                    <Collapsible open={specialExpiryOpen} onOpenChange={setSpecialExpiryOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2">
                          <ChevronDown className={cn("w-3 h-3 transition-transform", specialExpiryOpen && "rotate-180")} />
                          特殊有效期配置
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
                          <label className="flex items-start gap-2 cursor-pointer select-none">
                            <Checkbox
                              checked={use180Days}
                              onCheckedChange={(checked) => setUse180Days(!!checked)}
                              className="mt-0.5"
                            />
                            <div className="space-y-0.5">
                              <p className="text-foreground">启用 180 天有效期</p>
                              <p className="text-xs text-muted-foreground">该配置仅适用于已完成业务审批的特殊返券场景，默认不启用。</p>
                            </div>
                          </label>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="text-xs text-muted-foreground px-2">
                      有效期配置已锁定：发放成功后 {(rebateBill.voucherExpiryDays ?? rebateExpiryDays)} 天有效
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: 生成并发放 */}
              {rebateStep === 2 && (
                <div className="space-y-3">
                  {rebateBill.rebateStatus === "sent" ? (
                    (() => {
                      const isRegenerated = rebateBill.sentRebateAmount !== undefined;
                      const newAmount = rebateBill.rebateAmount || 0;
                      const sentAmount = rebateBill.sentRebateAmount || newAmount;
                      const diff = newAmount - sentAmount;
                      const remaining = rebateBill.voucherRemainingAmount ?? sentAmount;
                      const used = rebateBill.voucherUsedAmount ?? (sentAmount - remaining);

                      if (!isRegenerated) {
                        return (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-3">
                            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                            <p className="text-sm font-medium text-green-700">代金券已发放成功</p>
                            <div className="space-y-1">
                              <p className="text-base font-bold text-green-800 font-mono">{formatCurrency(newAmount)}</p>
                              <p className="text-xs text-green-600">接收方：{rebateBill.enterprise}</p>
                            </div>
                            <p className="text-xs font-medium text-green-700 font-mono">代金券编号：{rebateBill.voucherCode || "—"}</p>
                            <div className="space-y-1 pt-1">
                              <p className="text-xs text-muted-foreground">有效期至：{rebateBill.voucherExpiryDate ? format(new Date(rebateBill.voucherExpiryDate), "yyyy-MM-dd HH:mm:ss") : "—"}</p>
                              <p className="text-xs text-muted-foreground">备注：{rebateBill.periodStart.slice(0, 7)} 账期返券</p>
                            </div>
                          </div>
                        );
                      }

                      // Case 1: 无差额
                      if (diff === 0) {
                        return (
                          <div className="space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <p className="text-sm text-amber-700 leading-relaxed">
                                账单已重新生成，系统已重新计算应返券金额，请查看下方差额结果并按提示处理。
                              </p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center space-y-3">
                              <Info className="w-8 h-8 text-blue-600 mx-auto" />
                              <p className="text-sm font-medium text-blue-700">重算后无差额</p>
                              <div className="space-y-2 text-xs text-muted-foreground">
                                <p>已发放金额：<span className="font-mono text-foreground">{formatCurrency(sentAmount)}</span></p>
                                <p>重算应返券金额：<span className="font-mono text-foreground">{formatCurrency(newAmount)}</span></p>
                                <p>差额：<span className="font-mono text-foreground">¥0.00</span></p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Case 2: 少发
                      if (diff > 0) {
                        const alreadySent = !!rebateBill.diffVoucherCode;
                        return (
                          <div className="space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <p className="text-sm text-amber-700 leading-relaxed">
                                账单已重新生成，系统已重新计算应返券金额，请查看下方差额结果并按提示处理。
                              </p>
                            </div>
                            {alreadySent ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center space-y-3">
                                <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto" />
                                <p className="text-sm font-medium text-blue-700">差额补发成功</p>
                                <div className="space-y-1">
                                  <p className="text-base font-bold text-blue-800 font-mono">{formatCurrency(rebateBill.diffVoucherAmount || 0)}</p>
                                  <p className="text-xs text-blue-600">接收方：{rebateBill.enterprise}</p>
                                </div>
                                <p className="text-xs font-medium text-blue-700 font-mono">代金券编号：{rebateBill.diffVoucherCode}</p>
                                <div className="space-y-1 pt-1">
                                  <p className="text-xs text-muted-foreground">来源账单：{rebateBill.id}</p>
                                  <p className="text-xs text-muted-foreground">备注：{rebateBill.diffVoucherRemark || "—"}</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center space-y-3">
                                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                                  <p className="text-sm font-medium text-amber-700">待补发差额</p>
                                  <div className="space-y-2 text-xs text-muted-foreground">
                                    <p>已发放金额：<span className="font-mono text-foreground">{formatCurrency(sentAmount)}</span></p>
                                    <p>重算应返券金额：<span className="font-mono text-foreground">{formatCurrency(newAmount)}</span></p>
                                    <p>待补发金额：<span className="font-mono text-red-600 font-bold">{formatCurrency(diff)}</span></p>
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => setDiffConfirmOpen(true)}
                                  >
                                    确认补发差额
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      }

                      // Case 3-5: 多发异常（统一页面）
                      const overpaid = Math.abs(diff);
                      const canInvalidate = Math.min(overpaid, remaining);
                      const offlineAmount = overpaid - canInvalidate;
                      return (
                        <div className="space-y-3">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-700 leading-relaxed">
                              账单已重新生成，系统已重新计算应返券金额，请查看下方差额结果并按提示处理。
                            </p>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-3">
                            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                            <p className="text-sm font-medium text-red-700">多发异常</p>
                            <div className="space-y-2 text-xs text-muted-foreground">
                              <p>上次已发放金额：<span className="font-mono text-foreground">{formatCurrency(sentAmount)}</span></p>
                              <p>本次应发放金额：<span className="font-mono text-foreground">{formatCurrency(newAmount)}</span></p>
                              <p>多发金额：<span className="font-mono text-red-600 font-bold">{formatCurrency(overpaid)}</span></p>
                              {used > 0 && (
                                <p>已使用金额：<span className="font-mono text-foreground">{formatCurrency(used)}</span></p>
                              )}
                              {canInvalidate > 0 && (
                                <p>可失效金额：<span className="font-mono text-foreground">{formatCurrency(canInvalidate)}</span></p>
                              )}
                              {offlineAmount > 0 && (
                                <p>需线下处理金额：<span className="font-mono text-foreground">{formatCurrency(offlineAmount)}</span></p>
                              )}
                            </div>
                            {offlineAmount > 0 && (
                              <p className="text-xs text-red-600">
                                请联系系统管理员后台人工处理
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">即将发放至</p>
                      <p className="text-xl font-bold text-green-700">{rebateBill.enterprise}</p>
                      <p className="text-lg font-mono text-green-600">{formatCurrency(rebateBill.rebateAmount || 0)}</p>
                      <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                        <p>有效期：发放成功后 {rebateBill.voucherExpiryDays ?? rebateExpiryDays ?? 60} 天</p>
                        <p>备注：{rebateBill.periodStart.slice(0, 7)} 账期返券</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 底部操作按钮 */}
              <div className="flex justify-end items-center pt-3 border-t gap-2">
                {rebateStep === 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        // 重新计算应返券金额
                        const recalculated = rebateBill.details.reduce(
                          (sum, d) => sum + (d.balanceDeduction ?? d.subtotal) * ((d.rebateDiscount ?? 0) / 100),
                          0
                        );
                        setRebateBill((prev) => (prev ? { ...prev, rebateAmount: recalculated } : prev));
                      }}
                    >
                      重新计算
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => setRebateStep(1)}
                    >
                      下一步
                    </Button>
                  </>
                )}
                {rebateStep === 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setRebateStep(0)}
                    >
                      上一步
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        if (!rebateBill) return;
                        if (use180Days) {
                          setSpecialConfirmOpen(true);
                        } else {
                          handleGenerateVoucher(rebateBill.id);
                        }
                      }}
                    >
                      确认方案
                    </Button>
                  </>
                )}
                {rebateStep === 2 && (
                  <>
                    {rebateBill.rebateStatus === "toSend" && (
                      <Button
                        size="sm"
                        className="text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => rebateBill && handleSendVoucher(rebateBill.id)}
                      >
                        确认并发放
                      </Button>
                    )}
                    {rebateBill.rebateStatus === "sent" && rebateBill.sentRebateAmount !== undefined && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setRebateDialogOpen(false)}
                      >
                        关闭
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 特殊有效期二次确认 */}
      <Dialog open={specialConfirmOpen} onOpenChange={setSpecialConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">特殊返券场景确认</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-700 leading-relaxed">
                该配置为特殊返券场景使用，仅适用于已完成业务审批的情况。启用 180 天有效期后，本次代金券的有效期将按发放成功后 180 天计算。确认后方可生效。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSpecialConfirmOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setSpecialConfirmOpen(false);
                if (rebateBill) handleGenerateVoucher(rebateBill.id);
              }}
            >
              确认生效
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminReconciliation() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">账单管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          下游收入与上游成本对账分析，差异率超过 1% 自动预警
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bills" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="bills" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileSpreadsheet className="w-4 h-4" />
            供应商账单管理
          </TabsTrigger>
          <TabsTrigger value="userBills" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4" />
            用户账单管理
          </TabsTrigger>
          <TabsTrigger value="workbench" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Table2 className="w-4 h-4" />
            对账工作台
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Receipt className="w-4 h-4" />
            流水明细
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-4">
          <SupplierBillManagement />
        </TabsContent>

        <TabsContent value="userBills" className="mt-4">
          <UserBillManagement />
        </TabsContent>

        <TabsContent value="workbench" className="mt-4">
          <ReconciliationWorkbench />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <TransactionDetails />
        </TabsContent>
      </Tabs>
    </div>
  );
}
