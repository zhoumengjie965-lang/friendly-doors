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
  status: "pending" | "sent" | "confirmed";
  sentAt?: string;
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
}

interface UserBillDetail {
  modelName: string;
  billingType: "token" | "call";  // 计费类型：按量计费 或 按次计费
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
  voucherDeduction?: number; // 代金券抵扣
  balanceDeduction?: number; // 充值余额支付
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
      // glm-4 按量计费
      { modelName: "glm-4", billingType: "token", inputTokens: 65000000, outputTokens: 28000000, cacheReadTokens: 3000000, cacheCreateTokens: 1000000, inputPrice: 0.0001, outputPrice: 0.0005, cacheDiscount: 0.6, tierDiscount: 1, subtotal: 24700.45, voucherDeduction: 2000, balanceDeduction: 22700.45 },
      // dall-e-3 按次计费（图像生成）
      { modelName: "dall-e-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 1, subtotal: 5120.00, callCount: 6400, callPrice: 0.8, voucherDeduction: 0, balanceDeduction: 5120.00 },
      // tts-1 按次计费（语音合成）
      { modelName: "tts-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 1, subtotal: 3600.00, callCount: 12000, callPrice: 0.3, voucherDeduction: 0, balanceDeduction: 3600.00 },
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
    status: "sent",
    sentAt: "2026-04-02 10:30:00",
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
    sentAt: "2026-04-03 14:20:00",
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
    status: "sent",
    sentAt: "2026-04-05 09:15:00",
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
    status: "sent",
    sentAt: "2026-03-03 11:20:00",
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
  // 代金券记录视图
  const [viewMode, setViewMode] = useState<"bills" | "vouchers">("bills");
  const [voucherSearchQuery, setVoucherSearchQuery] = useState("");
  const [voucherEnterpriseQuery, setVoucherEnterpriseQuery] = useState("");
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string[]>(["using", "used", "expired"]);
  const [voucherPage, setVoucherPage] = useState(1);
  const voucherPageSize = 10;

  // 重新生成账单相关状态
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePeriod, setRegeneratePeriod] = useState<string>("");
  const [regenerateType, setRegenerateType] = useState<"personal" | "enterprise">("enterprise");
  const [regenerateSubject, setRegenerateSubject] = useState<string>("");
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>("");
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerateConfirmType, setRegenerateConfirmType] = useState<"toSend" | "sent" | null>(null);
  const [diffConfirmOpen, setDiffConfirmOpen] = useState(false);

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

  const handleMarkAsSent = (id: string) => {
    setBills(bills.map((b) => b.id === id ? { ...b, status: "sent" as const, sentAt: format(new Date(), "yyyy-MM-dd HH:mm:ss") } : b));
  };

  const handleConfirm = (id: string) => {
    setBills(bills.map((b) => b.id === id ? { ...b, status: "confirmed" as const } : b));
  };

  const handleUndoSent = (id: string) => {
    setBills(bills.map((b) => b.id === id ? { ...b, status: "pending" as const } : b));
  };

  const handleUndoConfirm = (id: string) => {
    setBills(bills.map((b) => b.id === id ? { ...b, status: "sent" as const } : b));
  };

  const handleBatchDownload = () => {
    alert(`批量下载 ${selectedBills.length} 个账单`);
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
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">待结清</Badge>;
      case "sent": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">已发送</Badge>;
      case "confirmed": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">已确认</Badge>;
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
      {viewMode === "bills" && (
      <>
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
              <button
                onClick={() => setViewMode("vouchers")}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                查看代金券记录
              </button>
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
                  <SelectItem value="pending">待结清</SelectItem>
                  <SelectItem value="sent">已发送</SelectItem>
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">账单明细报告</DialogTitle>
          </DialogHeader>
          {previewBill && (
            <div className="space-y-6 py-2">
              {/* 明细表格 */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-foreground border-l-4 border-blue-500 pl-2">消费明细</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      {/* 一级表头 */}
                      <tr className="border-b">
                        <th rowSpan={2} className="px-3 py-2.5 text-left font-medium text-muted-foreground border-r">用户名称</th>
                        <th rowSpan={2} className="px-3 py-2.5 text-left font-medium text-muted-foreground border-r">账期</th>
                        <th rowSpan={2} className="px-3 py-2.5 text-left font-medium text-muted-foreground border-r">模型名称</th>
                        <th colSpan={8} className="px-3 py-1.5 text-center font-medium text-muted-foreground border-b border-r bg-muted/30">按量计费</th>
                        <th colSpan={2} className="px-3 py-1.5 text-center font-medium text-muted-foreground border-b border-r bg-muted/30">按次计费</th>
                        <th rowSpan={2} className="px-3 py-2.5 text-center font-medium text-muted-foreground border-r">阶梯折扣</th>
                        <th rowSpan={2} className="px-3 py-2.5 text-right font-medium text-muted-foreground border-r">单项费用</th>
                        <th rowSpan={2} className="px-3 py-2.5 text-right font-medium text-muted-foreground border-r">代金券抵扣</th>
                        <th rowSpan={2} className="px-3 py-2.5 text-right font-medium text-muted-foreground">充值余额支付</th>
                      </tr>
                      {/* 二级表头 */}
                      <tr className="border-b">
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">输入Token</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">输出Token</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">缓存读取</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">缓存创建</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          <div>输入单价</div>
                          <div className="text-[10px] font-normal text-muted-foreground/70">(元/M)</div>
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                          <div>输出单价</div>
                          <div className="text-[10px] font-normal text-muted-foreground/70">(元/M)</div>
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">缓存读取倍率</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground border-r">缓存创建倍率</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">调用次数</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground border-r">
                          <div>调用单价</div>
                          <div className="text-[10px] font-normal text-muted-foreground/70">(元/次)</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[...previewBill.details].sort((a, b) => a.modelName.localeCompare(b.modelName)).map((detail, idx) => {
                        const isTokenBilling = detail.billingType === "token";
                        return (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium">{previewBill.enterprise}</td>
                            <td className="px-3 py-2 text-muted-foreground">{previewBill.periodStart.slice(0, 7)}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs font-mono">{detail.modelName}</Badge>
                            </td>
                            {/* 按量计费列 - 仅按量时显示数据 */}
                            <td className="px-3 py-2 text-right font-mono">{isTokenBilling ? formatNumber(detail.inputTokens) : "-"}</td>
                            <td className="px-3 py-2 text-right font-mono">{isTokenBilling ? formatNumber(detail.outputTokens) : "-"}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{isTokenBilling ? formatNumber(detail.cacheReadTokens) : "-"}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{isTokenBilling ? formatNumber(detail.cacheCreateTokens) : "-"}</td>
                            <td className="px-3 py-2 text-right font-mono">{isTokenBilling ? `¥${(detail.inputPrice * 1000000 * 7.2).toFixed(2)}` : "-"}</td>
                            <td className="px-3 py-2 text-right font-mono">{isTokenBilling ? `¥${(detail.outputPrice * 1000000 * 7.2).toFixed(2)}` : "-"}</td>
                            <td className="px-3 py-2 text-center">{isTokenBilling ? <span className="text-blue-600">{detail.cacheDiscount}x</span> : "-"}</td>
                            <td className="px-3 py-2 text-center border-r">{isTokenBilling ? <span className="text-blue-600">{detail.cacheDiscount}x</span> : "-"}</td>
                            {/* 按次计费列 - 仅按次时显示数据 */}
                            <td className="px-3 py-2 text-right font-mono">{!isTokenBilling ? formatNumber(detail.callCount || 0) : "-"}</td>
                            <td className="px-3 py-2 text-right font-mono border-r">{!isTokenBilling ? `¥${(detail.callPrice || 0).toFixed(2)}` : "-"}</td>
                            {/* 公共列 */}
                            <td className="px-3 py-2 text-center border-r">
                              <span className="text-green-600">{(detail.tierDiscount * 100).toFixed(0)}%</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium border-r">{formatCurrency(detail.subtotal)}</td>
                            <td className="px-3 py-2 text-right font-mono font-medium border-r text-amber-600">{formatCurrency(detail.voucherDeduction ?? 0)}</td>
                            <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(detail.balanceDeduction ?? detail.subtotal)}</td>
                          </tr>
                        );
                      })}
                      {/* 月度汇总行 */}
                      {(() => {
                        const sortedDetails = [...previewBill.details].sort((a, b) => a.modelName.localeCompare(b.modelName));
                        const totalInputTokens = sortedDetails.reduce((sum, d) => sum + d.inputTokens, 0);
                        const totalOutputTokens = sortedDetails.reduce((sum, d) => sum + d.outputTokens, 0);
                        const totalCacheReadTokens = sortedDetails.reduce((sum, d) => sum + d.cacheReadTokens, 0);
                        const totalCacheCreateTokens = sortedDetails.reduce((sum, d) => sum + d.cacheCreateTokens, 0);
                        const totalCallCount = sortedDetails.reduce((sum, d) => sum + (d.callCount || 0), 0);
                        const totalVoucherDeduction = sortedDetails.reduce((sum, d) => sum + (d.voucherDeduction ?? 0), 0);
                        const totalBalanceDeduction = sortedDetails.reduce((sum, d) => sum + (d.balanceDeduction ?? d.subtotal), 0);
                        return (
                          <tr className="bg-muted/50 border-t-2 border-muted font-medium">
                            <td className="px-3 py-3 font-medium text-muted-foreground" colSpan={3}>月度汇总</td>
                            {/* 按量计费汇总 */}
                            <td className="px-3 py-3 text-right font-mono">{formatNumber(totalInputTokens)}</td>
                            <td className="px-3 py-3 text-right font-mono">{formatNumber(totalOutputTokens)}</td>
                            <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatNumber(totalCacheReadTokens)}</td>
                            <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatNumber(totalCacheCreateTokens)}</td>
                            <td className="px-3 py-3 text-right font-mono">-</td>
                            <td className="px-3 py-3 text-right font-mono">-</td>
                            <td className="px-3 py-3 text-center">-</td>
                            <td className="px-3 py-3 text-center border-r">-</td>
                            {/* 按次计费汇总 */}
                            <td className="px-3 py-3 text-right font-mono">{formatNumber(totalCallCount)}</td>
                            <td className="px-3 py-3 text-right font-mono border-r">-</td>
                            {/* 公共列 */}
                            <td className="px-3 py-3 text-center border-r">-</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-green-700 border-r">{formatCurrency(previewBill.totalAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-amber-600 border-r">{formatCurrency(totalVoucherDeduction)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold">{formatCurrency(totalBalanceDeduction)}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/20">
                    说明：本期可开票金额为充值余额支付金额，代金券抵扣金额不可开票。
                  </div>
                </div>
              </div>

              {/* 底部操作 */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" size="sm" className="gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  导出Excel
                </Button>
                {previewBill.status === "pending" && (
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      handleMarkAsSent(previewBill.id);
                      setPreviewOpen(false);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    标记已发送
                  </Button>
                )}
                {previewBill.status === "sent" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      onClick={() => {
                        handleUndoSent(previewBill.id);
                        setPreviewOpen(false);
                      }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      撤销发送
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        handleConfirm(previewBill.id);
                        setPreviewOpen(false);
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      确认账单
                    </Button>
                  </>
                )}
                {previewBill.status === "confirmed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      handleUndoConfirm(previewBill.id);
                      setPreviewOpen(false);
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

      </>
      )}

      {viewMode === "vouchers" && (
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-sm font-medium">代金券记录</CardTitle>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索代金券编号"
                    value={voucherSearchQuery}
                    onChange={(e) => { setVoucherSearchQuery(e.target.value); setVoucherPage(1); }}
                    className="h-8 w-44 pl-8 text-xs"
                  />
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索主体名称"
                    value={voucherEnterpriseQuery}
                    onChange={(e) => { setVoucherEnterpriseQuery(e.target.value); setVoucherPage(1); }}
                    className="h-8 w-44 pl-8 text-xs"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      使用状态
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-2" align="start">
                    <div className="space-y-2">
                      {[
                        { key: "using", label: "正常" },
                        { key: "used", label: "已用完" },
                        { key: "expired", label: "已过期" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <Checkbox
                            checked={voucherStatusFilter.includes(key)}
                            onCheckedChange={(checked) => {
                              setVoucherStatusFilter(prev =>
                                checked
                                  ? [...prev, key]
                                  : prev.filter(s => s !== key)
                              );
                              setVoucherPage(1);
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setViewMode("bills"); setVoucherSearchQuery(""); setVoucherEnterpriseQuery(""); setVoucherStatusFilter(["using", "used", "expired"]); setVoucherPage(1); }}
              >
                返回账单管理
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">代金券编号</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源账单</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源账期</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">客户名称</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">空间类型</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">代金券金额</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">剩余金额</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">使用状态</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">发放时间</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">过期时间</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">操作人</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(() => {
                    type VoucherItem = { kind: 'main'; bill: UserBillRecord } | { kind: 'diff'; bill: UserBillRecord };
                    const allVouchers: VoucherItem[] = bills
                      .filter(b => b.rebateStatus === "sent")
                      .flatMap(b => {
                        const items: VoucherItem[] = [{ kind: 'main' as const, bill: b }];
                        if (b.diffVoucherCode) {
                          items.push({ kind: 'diff' as const, bill: b });
                        }
                        return items;
                      });
                    const filtered = allVouchers.filter(item => {
                      const bill = item.bill;
                      const isDiff = item.kind === 'diff';
                      const code = isDiff ? bill.diffVoucherCode : bill.voucherCode;
                      const remaining = isDiff ? (bill.diffVoucherAmount || 0) : (bill.voucherRemainingAmount ?? bill.rebateAmount ?? 0);
                      const expired = bill.voucherExpiryDate ? new Date(bill.voucherExpiryDate) < new Date() : false;
                      const status = expired ? "expired" : remaining <= 0 ? "used" : "using";

                      if (voucherSearchQuery && !(code || "").toLowerCase().includes(voucherSearchQuery.toLowerCase())) return false;
                      if (voucherEnterpriseQuery && !bill.enterprise.toLowerCase().includes(voucherEnterpriseQuery.toLowerCase())) return false;
                      if (!voucherStatusFilter.includes(status)) return false;
                      return true;
                    });
                    const total = filtered.length;
                    const totalPages = Math.max(1, Math.ceil(total / voucherPageSize));
                    const currentPage = Math.min(voucherPage, totalPages);
                    const start = (currentPage - 1) * voucherPageSize;
                    const pageItems = filtered.slice(start, start + voucherPageSize);
                    if (total === 0) {
                      return (
                        <tr>
                          <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                            {voucherSearchQuery ? "未找到匹配的代金券" : "暂无代金券记录"}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <>
                        {pageItems.map((item) => {
                          const bill = item.bill;
                          const isDiff = item.kind === 'diff';
                          const code = isDiff ? bill.diffVoucherCode : bill.voucherCode;
                          const amount = isDiff ? (bill.diffVoucherAmount || 0) : (bill.rebateAmount || 0);
                          const remaining = isDiff ? (bill.diffVoucherAmount || 0) : (bill.voucherRemainingAmount ?? bill.rebateAmount ?? 0);
                          const sentAt = isDiff ? bill.diffVoucherSentAt : (bill.rebateStatus === "sent" ? (bill.sentAt || "—") : "—");
                          const expired = bill.voucherExpiryDate ? new Date(bill.voucherExpiryDate) < new Date() : false;
                          const statusBadge = (() => {
                            if (expired) return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 text-xs">已过期</Badge>;
                            if (remaining <= 0) return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">已用完</Badge>;
                            return <Badge className="bg-green-500 text-white border-green-500 hover:bg-green-600 text-xs">正常</Badge>;
                          })();
                          return (
                            <tr key={isDiff ? `${bill.id}-diff` : bill.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2 font-mono">{code || "—"}</td>
                              <td className="px-3 py-2 font-mono text-muted-foreground">{bill.id}</td>
                              <td className="px-3 py-2 text-muted-foreground">{bill.periodStart.slice(0, 7)}</td>
                              <td className="px-3 py-2">{bill.enterprise}</td>
                              <td className="px-3 py-2">
                                <Badge variant="outline" className="text-xs">
                                  {bill.spaceType === "personal" ? "个人空间" : "企业空间"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{formatCurrency(amount)}</td>
                              <td className="px-3 py-2 text-right font-mono">{formatCurrency(remaining)}</td>
                              <td className="px-3 py-2 text-center">{statusBadge}</td>
                              <td className="px-3 py-2 text-muted-foreground">{sentAt || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{bill.voucherExpiryDate || "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">张三</td>
                            </tr>
                          );
                        })}
                        {total > voucherPageSize && (
                          <tr>
                            <td colSpan={11} className="px-3 py-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  共 {total} 条，第 {currentPage} / {totalPages} 页
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={currentPage <= 1}
                                    onClick={() => setVoucherPage(currentPage - 1)}
                                  >
                                    上一页
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setVoucherPage(currentPage + 1)}
                                  >
                                    下一页
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminReconciliation() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">收支对账中心</h1>
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
