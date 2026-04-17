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
import { cn } from "@/lib/utils";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Table2,
  Receipt,
  FileText,
  Trash2,
  Loader2,
  FileCheck,
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
  supplier: string;
  startDate: string;
  endDate: string;
  uploader: string;
  uploadTime: string;
  status: "parsing" | "imported" | "failed";
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
  { id: "1", billFileName: "openai_invoice_march.csv", billFileSize: "1.2MB", usageFileName: "openai_usage_march.csv", usageFileSize: "2.4MB", supplier: "OpenAI", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "张三", uploadTime: "2024-04-01 10:30", status: "imported" },
  { id: "2", billFileName: "anthropic_invoice_march.xlsx", billFileSize: "0.8MB", usageFileName: "anthropic_usage_march.xlsx", usageFileSize: "1.8MB", supplier: "Anthropic", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "李四", uploadTime: "2024-04-01 14:15", status: "imported" },
  { id: "3", billFileName: "azure_invoice_march.csv", billFileSize: "2.1MB", usageFileName: "azure_usage_march.csv", usageFileSize: "5.2MB", supplier: "Azure", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "王五", uploadTime: "2024-04-02 09:00", status: "parsing" },
  { id: "4", billFileName: "google_invoice_march.csv", billFileSize: "0.5MB", usageFileName: "google_usage_march.csv", usageFileSize: "1.1MB", supplier: "Google", startDate: "2024-03-01", endDate: "2024-03-31", uploader: "赵六", uploadTime: "2024-04-02 16:45", status: "failed" },
  { id: "5", billFileName: "openai_invoice_feb.csv", billFileSize: "1.0MB", usageFileName: "openai_usage_feb.csv", usageFileSize: "2.1MB", supplier: "OpenAI", startDate: "2024-02-01", endDate: "2024-02-29", uploader: "张三", uploadTime: "2024-03-01 11:20", status: "imported" },
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

  const getStatusBadge = (status: BillRecord["status"]) => {
    switch (status) {
      case "parsing": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />解析中</Badge>;
      case "imported": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs"><FileCheck className="w-3 h-3 mr-1" />已导入</Badge>;
      case "failed": return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs"><AlertCircle className="w-3 h-3 mr-1" />失败</Badge>;
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

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">上游原始凭证管理</h3>
              <p className="text-xs text-muted-foreground mt-1">上传供应商对账单，系统将自动解析并完成对账</p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              上传供应商账单
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">历史上传记录</CardTitle>
            <span className="text-xs text-muted-foreground">共 {filteredBills.length} 条记录</span>
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">上传人</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">上传时间</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">状态</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBills.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">暂无上传记录</td></tr>
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
                      <td className="px-4 py-3 text-muted-foreground">{bill.uploader}</td>
                      <td className="px-4 py-3 text-muted-foreground">{bill.uploadTime}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(bill.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="下载">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" title="删除" onClick={() => handleDelete(bill.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
    </div>
  );
}

// ─── Tab 4: 用户账单管理 ───────────────────────────────────────────────────

function UserBillManagement() {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">用户账单管理</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            管理给客户导出的账单，支持账单生成、导出、发送等功能。
          </p>
          <p className="text-xs text-muted-foreground/70">功能开发中...</p>
        </div>
      </CardContent>
    </Card>
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
      <Tabs defaultValue="workbench" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="workbench" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Table2 className="w-4 h-4" />
            对账工作台
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Receipt className="w-4 h-4" />
            流水明细
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileSpreadsheet className="w-4 h-4" />
            供应商账单管理
          </TabsTrigger>
          <TabsTrigger value="userBills" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4" />
            用户账单管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workbench" className="mt-4">
          <ReconciliationWorkbench />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <TransactionDetails />
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <SupplierBillManagement />
        </TabsContent>

        <TabsContent value="userBills" className="mt-4">
          <UserBillManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
