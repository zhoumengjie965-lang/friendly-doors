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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
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
  Table2,
  Receipt,
  FileText,
  Loader2,
  FileCheck,
  Lock,
  ChevronDown,
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
      {/* Bills Table */}
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
  callCount?: number;        // 调用次数（按次计费时有效）
  callPrice?: number;        // 调用单价（元/次，按次计费时有效）
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
    details: [
      // gpt-4o 按量计费（第一行展示按量计费）
      { modelName: "gpt-4o", billingType: "token", inputTokens: 125000000, outputTokens: 45000000, cacheReadTokens: 8000000, cacheCreateTokens: 2000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 45800.25 },
      // whisper-1 按次计费（语音转文字）
      { modelName: "whisper-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 4100.00, callCount: 8200, callPrice: 0.5 },
      // claude-3.5-sonnet 按量计费
      { modelName: "claude-3.5-sonnet", billingType: "token", inputTokens: 98000000, outputTokens: 32000000, cacheReadTokens: 5000000, cacheCreateTokens: 1500000, inputPrice: 0.00016, outputPrice: 0.0008, cacheDiscount: 0.5, tierDiscount: 0.92, subtotal: 38500.80 },
      // text-embedding-3 按次计费（嵌入模型）
      { modelName: "text-embedding-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.90, subtotal: 1720.00, callCount: 4300, callPrice: 0.4 },
      // glm-4 按量计费
      { modelName: "glm-4", billingType: "token", inputTokens: 65000000, outputTokens: 28000000, cacheReadTokens: 3000000, cacheCreateTokens: 1000000, inputPrice: 0.0001, outputPrice: 0.0005, cacheDiscount: 0.6, tierDiscount: 0.90, subtotal: 24700.45 },
      // dall-e-3 按次计费（图像生成）
      { modelName: "dall-e-3", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.92, subtotal: 5120.00, callCount: 6400, callPrice: 0.8 },
      // tts-1 按次计费（语音合成）
      { modelName: "tts-1", billingType: "call", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, inputPrice: 0, outputPrice: 0, cacheDiscount: 1, tierDiscount: 0.95, subtotal: 3600.00, callCount: 12000, callPrice: 0.3 },
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
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 200000000, outputTokens: 80000000, cacheReadTokens: 15000000, cacheCreateTokens: 5000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.88, subtotal: 75600.80 },
      { modelName: "claude-3-opus", billingType: "token", inputTokens: 120000000, outputTokens: 50000000, cacheReadTokens: 8000000, cacheCreateTokens: 3000000, inputPrice: 0.00025, outputPrice: 0.00125, cacheDiscount: 0.5, tierDiscount: 0.88, subtotal: 98000.00 },
      { modelName: "azure-gpt-4", billingType: "token", inputTokens: 80000000, outputTokens: 35000000, cacheReadTokens: 4000000, cacheCreateTokens: 2000000, inputPrice: 0.00018, outputPrice: 0.00072, cacheDiscount: 0.5, tierDiscount: 0.88, subtotal: 82400.00 },
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
    details: [
      { modelName: "gpt-4o", billingType: "token", inputTokens: 60000000, outputTokens: 25000000, cacheReadTokens: 4000000, cacheCreateTokens: 1000000, inputPrice: 0.00015, outputPrice: 0.0006, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 22800.60 },
      { modelName: "claude-3.5-sonnet", billingType: "token", inputTokens: 45000000, outputTokens: 18000000, cacheReadTokens: 3000000, cacheCreateTokens: 800000, inputPrice: 0.00016, outputPrice: 0.0008, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 18500.00 },
      { modelName: "gemini-1.5-pro", billingType: "token", inputTokens: 38000000, outputTokens: 12000000, cacheReadTokens: 2500000, cacheCreateTokens: 600000, inputPrice: 0.00012, outputPrice: 0.0004, cacheDiscount: 0.5, tierDiscount: 0.95, subtotal: 13000.00 },
      { modelName: "glm-4", billingType: "token", inputTokens: 30000000, outputTokens: 10000000, cacheReadTokens: 2000000, cacheCreateTokens: 500000, inputPrice: 0.0001, outputPrice: 0.0005, cacheDiscount: 0.6, tierDiscount: 0.95, subtotal: 13500.00 },
    ]
  },
];

function UserBillManagement() {
  const [bills, setBills] = useState<UserBillRecord[]>(MOCK_USER_BILLS);
  const [subjectNameFilter, setSubjectNameFilter] = useState<string>("");  // 主体名称搜索
  const [spaceTypeFilter, setSpaceTypeFilter] = useState<string>("all");   // 空间类型筛选
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [previewBill, setPreviewBill] = useState<UserBillRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // 主体名称模糊搜索
      const matchSubject = subjectNameFilter === "" || 
        bill.enterprise.toLowerCase().includes(subjectNameFilter.toLowerCase());
      // 空间类型筛选
      const matchSpaceType = spaceTypeFilter === "all" || bill.spaceType === spaceTypeFilter;
      const matchPeriod = periodFilter === "" || bill.periodStart.startsWith(periodFilter);
      const matchStatus = statusFilter === "all" || bill.status === statusFilter;
      const matchSearch = searchQuery === "" ||
        bill.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSpaceType && matchPeriod && matchStatus && matchSearch;
    });
  }, [bills, subjectNameFilter, spaceTypeFilter, periodFilter, statusFilter, searchQuery]);

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

  const handlePreview = (bill: UserBillRecord) => {
    setPreviewBill(bill);
    setPreviewOpen(true);
  };

  const getStatusBadge = (status: UserBillRecord["status"]) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">待结清</Badge>;
      case "sent": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">已发送</Badge>;
      case "confirmed": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">已确认</Badge>;
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
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBills.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">暂无账单记录</td></tr>
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
                          {/* 发送状态列 */}
                          {bill.status === "pending" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleMarkAsSent(bill.id)}
                            >
                              标记发送
                            </Button>
                          ) : bill.status === "sent" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleUndoSent(bill.id)}
                            >
                              撤销发送
                            </Button>
                          ) : (
                            <span className="h-7 px-2 text-xs text-muted-foreground flex items-center">已发送</span>
                          )}
                          {/* 确认状态列 */}
                          {bill.status === "confirmed" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleUndoConfirm(bill.id)}
                            >
                              撤销确认
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleConfirm(bill.id)}
                              disabled={bill.status === "pending"}
                            >
                              确认
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
                        <th rowSpan={2} className="px-3 py-2.5 text-right font-medium text-muted-foreground">单项费用</th>
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
                            <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(detail.subtotal)}</td>
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
                            <td className="px-3 py-3 text-right font-mono font-bold text-green-700">{formatCurrency(previewBill.totalAmount)}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
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
