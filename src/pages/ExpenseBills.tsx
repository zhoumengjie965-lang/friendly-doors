import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  FileText,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// 导出记录类型
interface ExportRecord {
  id: string;
  createTime: string;
  taskName: string;
  status: "success" | "pending" | "failed";
}

interface Enterprise {
  id: string;
  name: string;
  enterprise_code: string;
}

interface BillItem {
  id: string;
  period: string;
  enterpriseName: string;
  enterpriseId: string;
  consumptionAmount: number;
  discountAmount: number;
  payableAmount: number;
  paidAmount: number;
  refundAmount: number;
  rechargeAmount: number;
  endingBalance: number;
  status: "unbilled" | "billed";
  entitlementPurchase?: number;
}

// 明细数据
interface DetailItem {
  id: string;
  timestamp: string;
  model: string;
  apiKey: string;
  department: string;
  member: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheHitTokens?: number;
  amount: number;
  // 计算详情
  calculation?: {
    inputPrice: number;
    outputPrice: number;
    cacheWritePrice?: number;
    cacheHitPrice?: number;
    modelRatio: number;
    cacheRatio?: number;
    outputRatio?: number;
    groupRatio?: number;
    requestPath: string;
    billingMode: string;
  };
}

// 分摊统计项 - 时间(固定) + 动态维度列 + 固定统计列
interface ShareItem {
  // 时间维度（固定）
  timeKey: string;
  // 动态维度值
  model?: string;
  department?: string;
  member?: string;
  apiKey?: string;
  // 固定统计列
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  amount: number;
}

interface Props {
  enterprise: Enterprise | null;
  role: string;
}

// Mock 数据 - 月结算单
const mockBills: BillItem[] = [
  {
    id: "BILL-202504-001",
    period: "2025-04",
    enterpriseName: "腾讯科技",
    enterpriseId: "ENT-2024-001",
    consumptionAmount: 158000.00,
    discountAmount: 15800.00,
    payableAmount: 142200.00,
    paidAmount: 142200.00,
    refundAmount: 0,
    rechargeAmount: 50000.00,
    endingBalance: 85600.50,
    status: "billed",
  },
  {
    id: "BILL-202503-001",
    period: "2025-03",
    enterpriseName: "腾讯科技",
    enterpriseId: "ENT-2024-001",
    consumptionAmount: 125000.00,
    discountAmount: 12500.00,
    payableAmount: 112500.00,
    paidAmount: 112500.00,
    refundAmount: 2000.00,
    rechargeAmount: 0,
    endingBalance: 48800.50,
    status: "unbilled",
  },
  {
    id: "BILL-202502-001",
    period: "2025-02",
    enterpriseName: "腾讯科技",
    enterpriseId: "ENT-2024-001",
    consumptionAmount: 98000.00,
    discountAmount: 9800.00,
    payableAmount: 88200.00,
    paidAmount: 88200.00,
    refundAmount: 0,
    rechargeAmount: 100000.00,
    endingBalance: 61300.50,
    status: "unbilled",
  },
  {
    id: "BILL-202501-001",
    period: "2025-01",
    enterpriseName: "腾讯科技",
    enterpriseId: "ENT-2024-001",
    consumptionAmount: 85000.00,
    discountAmount: 8500.00,
    payableAmount: 76500.00,
    paidAmount: 76500.00,
    refundAmount: 1500.00,
    rechargeAmount: 0,
    endingBalance: 49500.50,
    status: "unbilled",
  },
];

// Mock 数据 - 明细（扩充数据便于聚合查看）
const mockDetails: DetailItem[] = [
  // 2025-04-01
  { id: "REQ-001", timestamp: "2025-04-01 10:23:45", model: "GPT-4", apiKey: "sk-***1234", department: "技术部", member: "张三", inputTokens: 1200, outputTokens: 800, cacheWriteTokens: 100, cacheHitTokens: 50, amount: 15.20, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-002", timestamp: "2025-04-01 11:15:30", model: "GPT-3.5", apiKey: "sk-***5678", department: "产品部", member: "李四", inputTokens: 500, outputTokens: 300, amount: 3.50, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-003", timestamp: "2025-04-01 14:30:00", model: "GPT-4", apiKey: "sk-***1234", department: "技术部", member: "张三", inputTokens: 2500, outputTokens: 1800, amount: 35.50, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-004", timestamp: "2025-04-01 16:45:20", model: "Claude-3", apiKey: "sk-***9012", department: "设计部", member: "王五", inputTokens: 900, outputTokens: 700, amount: 14.50, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },

  // 2025-04-02
  { id: "REQ-005", timestamp: "2025-04-02 09:45:12", model: "GPT-4", apiKey: "sk-***1234", department: "技术部", member: "张三", inputTokens: 2000, outputTokens: 1500, cacheWriteTokens: 200, cacheHitTokens: 100, amount: 28.50, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-006", timestamp: "2025-04-02 10:30:00", model: "GPT-4", apiKey: "sk-***3456", department: "技术部", member: "赵六", inputTokens: 1800, outputTokens: 1200, cacheWriteTokens: 150, cacheHitTokens: 80, amount: 25.20, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-007", timestamp: "2025-04-02 11:20:00", model: "GPT-3.5", apiKey: "sk-***5678", department: "产品部", member: "李四", inputTokens: 800, outputTokens: 500, amount: 5.80, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-008", timestamp: "2025-04-02 14:20:00", model: "Claude-3", apiKey: "sk-***9012", department: "设计部", member: "王五", inputTokens: 1200, outputTokens: 900, amount: 18.00, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },
  { id: "REQ-009", timestamp: "2025-04-02 15:10:30", model: "GPT-3.5", apiKey: "sk-***7890", department: "运营部", member: "孙七", inputTokens: 600, outputTokens: 400, amount: 4.20, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },

  // 2025-04-03
  { id: "REQ-010", timestamp: "2025-04-03 09:00:00", model: "GPT-4", apiKey: "sk-***1234", department: "技术部", member: "张三", inputTokens: 3200, outputTokens: 2100, amount: 45.80, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-011", timestamp: "2025-04-03 10:30:45", model: "GPT-4", apiKey: "sk-***3456", department: "技术部", member: "赵六", inputTokens: 3000, outputTokens: 2000, cacheWriteTokens: 300, cacheHitTokens: 150, amount: 42.00, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-012", timestamp: "2025-04-03 11:15:00", model: "Claude-3.5", apiKey: "sk-***2468", department: "技术部", member: "周八", inputTokens: 1500, outputTokens: 1100, amount: 22.50, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },
  { id: "REQ-013", timestamp: "2025-04-03 14:20:00", model: "GPT-3.5", apiKey: "sk-***5678", department: "产品部", member: "李四", inputTokens: 1000, outputTokens: 600, amount: 7.20, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-014", timestamp: "2025-04-03 15:45:30", model: "GPT-4", apiKey: "sk-***1357", department: "产品部", member: "钱九", inputTokens: 2200, outputTokens: 1600, amount: 32.50, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-015", timestamp: "2025-04-03 16:30:00", model: "Claude-3", apiKey: "sk-***9012", department: "设计部", member: "王五", inputTokens: 1800, outputTokens: 1200, amount: 24.00, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },

  // 2025-04-04
  { id: "REQ-016", timestamp: "2025-04-04 09:10:00", model: "GPT-4", apiKey: "sk-***1234", department: "技术部", member: "张三", inputTokens: 2800, outputTokens: 1900, amount: 40.20, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-017", timestamp: "2025-04-04 10:25:00", model: "GPT-3.5", apiKey: "sk-***7890", department: "运营部", member: "孙七", inputTokens: 1200, outputTokens: 800, amount: 8.50, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-018", timestamp: "2025-04-04 11:40:00", model: "Claude-3.5", apiKey: "sk-***2468", department: "技术部", member: "周八", inputTokens: 2000, outputTokens: 1400, amount: 28.00, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },
  { id: "REQ-019", timestamp: "2025-04-04 14:15:00", model: "GPT-4", apiKey: "sk-***1357", department: "产品部", member: "钱九", inputTokens: 3500, outputTokens: 2300, amount: 48.50, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-020", timestamp: "2025-04-04 16:00:00", model: "Claude-3", apiKey: "sk-***9012", department: "设计部", member: "王五", inputTokens: 1600, outputTokens: 1100, amount: 21.50, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },

  // 2025-04-05
  { id: "REQ-021", timestamp: "2025-04-05 09:30:00", model: "GPT-4", apiKey: "sk-***3456", department: "技术部", member: "赵六", inputTokens: 4000, outputTokens: 2800, amount: 58.00, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-022", timestamp: "2025-04-05 10:45:00", model: "GPT-3.5", apiKey: "sk-***5678", department: "产品部", member: "李四", inputTokens: 1500, outputTokens: 900, amount: 10.50, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-023", timestamp: "2025-04-05 11:30:00", model: "GPT-4", apiKey: "sk-***1234", department: "技术部", member: "张三", inputTokens: 2200, outputTokens: 1500, amount: 32.00, calculation: { inputPrice: 21.0, outputPrice: 105.0, cacheWritePrice: 10.5, cacheHitPrice: 5.25, modelRatio: 1.5, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
  { id: "REQ-024", timestamp: "2025-04-05 14:00:00", model: "Claude-3.5", apiKey: "sk-***2468", department: "技术部", member: "周八", inputTokens: 2500, outputTokens: 1700, amount: 35.00, calculation: { inputPrice: 10.5, outputPrice: 52.5, modelRatio: 1.2, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/messages", billingMode: "上游返回" } },
  { id: "REQ-025", timestamp: "2025-04-05 15:20:00", model: "GPT-3.5", apiKey: "sk-***7890", department: "运营部", member: "孙七", inputTokens: 2000, outputTokens: 1200, amount: 13.20, calculation: { inputPrice: 2.1, outputPrice: 10.5, modelRatio: 1.0, cacheRatio: 1, outputRatio: 5, groupRatio: 1, requestPath: "/v1/chat/completions", billingMode: "上游返回" } },
];

// 分摊维度选项
type ShareDimension = "model" | "department" | "member" | "apiKey";

const dimensionLabels: Record<ShareDimension, string> = {
  model: "模型",
  department: "部门",
  member: "成员",
  apiKey: "API Key",
};

const DIMENSION_ORDER: ShareDimension[] = ["model", "department", "member", "apiKey"];

const apiKeyNames: Record<string, string> = {
  "sk-***1234": "生产环境 Key",
  "sk-***3456": "生产环境 Key",
  "sk-***5678": "产品测试 Key",
  "sk-***7890": "运营自动化 Key",
  "sk-***9012": "设计工具 Key",
  "sk-***2468": "研发测试 Key",
  "sk-***1357": "产品服务 Key",
};

// 月份选择器组件
function MonthPicker({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1);
  });

  const currentYear = viewDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handlePrevYear = () => setViewDate(addMonths(viewDate, -12));
  const handleNextYear = () => setViewDate(addMonths(viewDate, 12));
  const handleSelectMonth = (month: number) => {
    const selected = `${currentYear}-${String(month).padStart(2, "0")}`;
    onChange(selected);
    setOpen(false);
  };

  const displayValue = value ? format(new Date(value + "-01"), "yyyy年MM月", { locale: zhCN }) : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 h-8 px-3 border rounded-md bg-white text-xs hover:bg-slate-50 min-w-[120px]">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">{displayValue}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrevYear} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">{currentYear}年</span>
          <button onClick={handleNextYear} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {months.map((month) => {
            const monthStr = String(month).padStart(2, "0");
            const isSelected = value === `${currentYear}-${monthStr}`;
            return (
              <button
                key={month}
                onClick={() => handleSelectMonth(month)}
                className={`h-8 text-xs rounded ${
                  isSelected ? "bg-primary text-white" : "hover:bg-slate-100"
                }`}
              >
                {month}月
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// 日期范围选择器组件（限制同一个月内选择）
function DayRangePicker({ startDate, endDate, onChange }: { startDate: Date; endDate: Date; onChange: (start: Date, end: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(startDate);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // 锁定月份：已选起始日期后，日历锁定在该月
  const lockedMonth = tempStart ? new Date(tempStart.getFullYear(), tempStart.getMonth(), 1) : null;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(lockedMonth || viewDate),
    end: endOfMonth(lockedMonth || viewDate),
  });

  const handlePrevMonth = () => { if (!lockedMonth) setViewDate(addMonths(viewDate, -1)); };
  const handleNextMonth = () => { if (!lockedMonth) setViewDate(addMonths(viewDate, 1)); };

  const handleSelectDate = (date: Date) => {
    if (!tempStart) {
      setTempStart(date);
      // 选了起始日期后，锁定到该月份
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    } else {
      // 约束结束日期不超过同月的最后一天
      const monthEnd = endOfMonth(tempStart);
      const constrainedEnd = date > monthEnd ? monthEnd : date;
      const start = tempStart < constrainedEnd ? tempStart : constrainedEnd;
      const end = tempStart < constrainedEnd ? constrainedEnd : tempStart;
      onChange(start, end);
      setTempStart(null);
      setOpen(false);
    }
  };

  const isInRange = (date: Date) => {
    if (tempStart && hoverDate) {
      // 悬浮范围也限制在同月内
      const monthEnd = endOfMonth(tempStart);
      const clampedHover = hoverDate > monthEnd ? monthEnd : hoverDate;
      const start = tempStart < clampedHover ? tempStart : clampedHover;
      const end = tempStart < clampedHover ? clampedHover : tempStart;
      return date >= start && date <= end;
    }
    return date >= startDate && date <= endDate;
  };

  const isSelected = (date: Date) => {
    return format(date, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd") ||
           format(date, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd") ||
           (tempStart && format(date, "yyyy-MM-dd") === format(tempStart, "yyyy-MM-dd"));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 h-8 px-3 border rounded-md bg-white text-xs hover:bg-slate-50">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{format(startDate, "yyyy-MM-dd")}</span>
          <span className="text-muted-foreground">→</span>
          <span>{format(endDate, "yyyy-MM-dd")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">{format(viewDate, "yyyy年MM月", { locale: zhCN })}</span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["日", "一", "二", "三", "四", "五", "六"].map(d => (
            <span key={d} className="text-[10px] text-muted-foreground">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => handleSelectDate(date)}
              onMouseEnter={() => tempStart && setHoverDate(date)}
              className={`h-7 text-xs rounded ${
                isSelected(date)
                  ? "bg-primary text-white"
                  : isInRange(date)
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-slate-100"
              }`}
            >
              {date.getDate()}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ExpenseBills({ enterprise }: Props) {
  const navigate = useNavigate();
  const isAllocationPreview = new URLSearchParams(window.location.search).has("allocation");
  // 列表页状态
  const [startPeriod, setStartPeriod] = useState<string>("2025-01");
  const [endPeriod, setEndPeriod] = useState<string>("2025-04");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 明细页状态
  const [detailView, setDetailView] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillItem | null>(null);
  const [viewType, setViewType] = useState<"detail" | "share">("share");
  // 时间范围筛选（Filtering）
  const [detailStartDate, setDetailStartDate] = useState<Date>(new Date("2025-04-01"));
  const [detailEndDate, setDetailEndDate] = useState<Date>(new Date("2025-04-30"));
  // 统计粒度（Grouping）：summary=汇总(无时间维度), day=按天展开
  const [grain, setGrain] = useState<"summary" | "day">("summary");
  // 维度复选框（Dimension Grouping）
  const [selectedDimensions, setSelectedDimensions] = useState<ShareDimension[]>(
    ["model"]
  );
  const [feeType, setFeeType] = useState<"usage" | "entitlement">("usage");
  // 导出记录弹窗
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Mock 数据 - 导出记录
  const mockExportRecords: ExportRecord[] = [
    { id: "EXP-001", createTime: "2026-04-01 14:47:10", taskName: "bet_oZrmqmqDlyNM", status: "success" },
    { id: "EXP-002", createTime: "2026-04-01 13:22:05", taskName: "exp_gH3kLmNpQrSt", status: "success" },
    { id: "EXP-003", createTime: "2026-03-31 09:15:30", taskName: "exp_aBcDeFgHiJk", status: "pending" },
  ];

  // 过滤数据
  const filteredBills = useMemo(() => {
    return mockBills.filter(bill => {
      const matchesPeriod = bill.period >= startPeriod && bill.period <= endPeriod;
      return matchesPeriod;
    });
  }, [startPeriod, endPeriod]);

  // 分页数据
  const totalPages = Math.ceil(filteredBills.length / pageSize);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 格式化金额
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // 查看明细
  const handleViewDetail = (bill: BillItem) => {
    setSelectedBill(bill);
    setDetailView(true);
    setViewType("share");
    setGrain("summary");
    setSelectedDimensions(["model"]);
    setFeeType("usage");
    setDetailStartDate(new Date(bill.period + "-01"));
    setDetailEndDate(endOfMonth(new Date(bill.period + "-01")));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const allocationPeriod = params.get("allocation");
    if (!allocationPeriod) return;

    const amount = Number(params.get("amount")) || 0;
    const paygAmount = Number(params.get("payg"));
    const entitlementPurchase = Number(params.get("entitlement")) || 0;
    const existingBill = mockBills.find((bill) => bill.period === allocationPeriod);
    const allocationBill: BillItem = {
      ...(existingBill ?? {
      id: `BILL-${allocationPeriod.replace("-", "")}-001`,
      enterpriseName: "当前企业",
      enterpriseId: "ENT-CURRENT",
      consumptionAmount: amount,
      discountAmount: 0,
      payableAmount: amount,
      paidAmount: amount,
      refundAmount: 0,
      rechargeAmount: 0,
      endingBalance: 0,
      status: "unbilled",
      }),
      period: allocationPeriod,
      paidAmount: Number.isFinite(paygAmount) ? paygAmount : Math.max(0, amount - entitlementPurchase),
      payableAmount: amount,
      entitlementPurchase,
    };
    handleViewDetail(allocationBill);
  }, []);

  // 生成分摊数据 - Filter(时间范围) -> Group By(统计粒度, 勾选维度)
  const shareData = useMemo(() => {
    const grouped = new Map<string, ShareItem>();

    // Step 1: Filter(时间范围)
    const filteredDetails = mockDetails.filter(item => {
      if (isAllocationPreview) return true;
      const itemDate = new Date(item.timestamp);
      return itemDate >= detailStartDate && itemDate <= detailEndDate;
    });

    // Step 2: Group By(统计粒度, 勾选维度)
    filteredDetails.forEach(item => {
      const date = new Date(item.timestamp);

      // 根据统计粒度生成时间键：汇总=无时间维度，按天展开=按天
      const timeKey = grain === "summary"
        ? ""
        : format(date, "yyyy-MM-dd");
      const keyParts = [timeKey];
      selectedDimensions.forEach(dim => {
        keyParts.push(`${dim}:${item[dim]}`);
      });
      const key = keyParts.join("|");

      const existing = grouped.get(key);
      if (existing) {
        existing.requestCount += 1;
        existing.inputTokens += item.inputTokens;
        existing.outputTokens += item.outputTokens;
        existing.amount += item.amount;
      } else {
        // 创建新记录
        const newItem: ShareItem = {
          timeKey,
          requestCount: 1,
          inputTokens: item.inputTokens,
          outputTokens: item.outputTokens,
          amount: item.amount,
        };
        // 动态添加选中的维度值
        selectedDimensions.forEach(dim => {
          newItem[dim] = item[dim];
        });
        grouped.set(key, newItem);
      }
    });

    // 排序：先按时间降序，再按花费降序
    return Array.from(grouped.values()).sort((a, b) => {
      // 主要排序：时间降序
      if (a.timeKey !== b.timeKey) {
        return b.timeKey.localeCompare(a.timeKey);
      }
      // 次要排序：花费降序
      return b.amount - a.amount;
    });
  }, [selectedDimensions, grain, detailStartDate, detailEndDate, isAllocationPreview]);

  // 切换维度
  const toggleDimension = (dim: ShareDimension) => {
    setSelectedDimensions(prev => {
      const next = prev.includes(dim)
        ? prev.filter(d => d !== dim)
        : [...prev, dim];
      return next.sort((a, b) => DIMENSION_ORDER.indexOf(a) - DIMENSION_ORDER.indexOf(b));
    });
  };

  // 明细页渲染
  if (detailView && selectedBill) {
    return (
      <div className="space-y-4">
        {/* 面包屑 */}
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <button
            onClick={() => {
              navigate(enterprise
                ? "/workspace/enterprise/cost-overview"
                : "/workspace/cost-overview");
            }}
            className="hover:text-foreground"
          >
            费用总览
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">账单明细</span>
        </div>

        {/* 筛选栏 - 第二行：仅分摊视图显示（时间范围 + 统计粒度 + 维度选择） */}
        {viewType === "share" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">费用类型:</span>
                  <Tabs value={feeType} onValueChange={(value) => setFeeType(value as "usage" | "entitlement")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="usage" className="text-xs px-3">按量消费</TabsTrigger>
                      {(selectedBill.entitlementPurchase ?? 0) > 0 && (
                        <TabsTrigger value="entitlement" className="text-xs px-3">权益购买</TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                </div>

                {feeType === "usage" && (
                <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">展示粒度:</span>
                  <Tabs value={grain} onValueChange={(value) => setGrain(value as "summary" | "day")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="summary" className="text-xs px-3">当月汇总</TabsTrigger>
                      <TabsTrigger value="day" className="text-xs px-3">按天</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* 分摊视图选择 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">分摊视图:</span>
                  <div className="flex items-center gap-3">
                    {(enterprise
                      ? DIMENSION_ORDER
                      : (["model", "apiKey"] as ShareDimension[])
                    ).map((dim) => (
                      <label key={dim} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={selectedDimensions.includes(dim)}
                          onCheckedChange={() => {
                            if (selectedDimensions.length === 1 && selectedDimensions.includes(dim)) return;
                            toggleDimension(dim);
                          }}
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-xs">按{dimensionLabels[dim]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                </>
                )}

                <div className="flex-1" />

                {/* 导出按钮 */}
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 明细视图的导出按钮行 */}
        {viewType === "detail" && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setExportDialogOpen(true)}
            >
              查看导出记录
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-3.5 h-3.5" />
              导出
            </Button>
          </div>
        )}

        {/* 导出记录弹窗 */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-base">导出记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 提示信息 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-800">文件保留 7 天，请及时下载</span>
              </div>
              {/* 记录表格 */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-medium">创建时间</TableHead>
                    <TableHead className="text-xs font-medium">任务名称</TableHead>
                    <TableHead className="text-xs font-medium">状态</TableHead>
                    <TableHead className="text-xs font-medium text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockExportRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs">{record.createTime}</TableCell>
                      <TableCell className="text-xs font-mono">{record.taskName}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          {record.status === "success" && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span>导出成功</span>
                            </>
                          )}
                          {record.status === "pending" && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                              <span>处理中</span>
                            </>
                          )}
                          {record.status === "failed" && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span>导出失败</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {record.status === "success" ? (
                          <button className="text-blue-600 hover:text-blue-800 text-xs">
                            下载
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* 分页 */}
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <span>共 {mockExportRecords.length} 条</span>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 border rounded hover:bg-slate-100 disabled:opacity-50" disabled>
                    &lt;
                  </button>
                  <button className="px-2 py-1 bg-primary text-white rounded">1</button>
                  <button className="px-2 py-1 border rounded hover:bg-slate-100 disabled:opacity-50" disabled>
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    {feeType === "entitlement" ? (
                      <>
                        <TableHead className="text-xs font-medium whitespace-nowrap">购买时间</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">权益名称</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">订单号</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">购买人</TableHead>
                        <TableHead className="text-xs font-medium text-right whitespace-nowrap">实际消费</TableHead>
                      </>
                    ) : viewType === "detail" ? (
                      <>
                        <TableHead className="text-xs font-medium whitespace-nowrap">时间</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">部门</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">成员</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">API Key</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">模型</TableHead>
                        <TableHead className="text-xs font-medium whitespace-nowrap">用量</TableHead>
                        <TableHead className="text-xs font-medium text-right whitespace-nowrap">消费金额</TableHead>
                        <TableHead className="text-xs font-medium text-center whitespace-nowrap">计算详情</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-xs font-medium whitespace-nowrap">时间</TableHead>
                        {/* 动态维度列 */}
                        {selectedDimensions.map(dim => (
                          <TableHead key={dim} className="text-xs font-medium whitespace-nowrap">
                            {dimensionLabels[dim]}
                          </TableHead>
                        ))}
                        <TableHead className="text-xs font-medium text-right whitespace-nowrap">实际消费</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeType === "entitlement" ? (
                    <>
                      <TableRow className="hover:bg-slate-50/50">
                        <TableCell className="text-xs whitespace-nowrap">{selectedBill.period}-08</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">企业标准版年度订阅</TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">ORDER-{selectedBill.period.replace("-", "")}-001</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">企业管理员</TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap font-semibold">
                          {formatAmount(selectedBill.entitlementPurchase ?? 0)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableCell colSpan={4} className="text-xs font-semibold">权益购买合计</TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap font-bold">
                          {formatAmount(selectedBill.entitlementPurchase ?? 0)}
                        </TableCell>
                      </TableRow>
                    </>
                  ) : viewType === "detail" ? (
                    mockDetails.map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs whitespace-nowrap">{item.timestamp}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{item.department}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{item.member}</TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">{item.apiKey}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">{item.model}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div>输入: {item.inputTokens.toLocaleString()}</div>
                            <div>输出: {item.outputTokens.toLocaleString()}</div>
                            {item.cacheWriteTokens ? <div>缓存创建: {item.cacheWriteTokens.toLocaleString()}</div> : null}
                            {item.cacheHitTokens ? <div>缓存命中: {item.cacheHitTokens.toLocaleString()}</div> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap">{formatAmount(item.amount)}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <Info className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-sm">计算详情</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 text-xs">
                                {/* 缓存Tokens */}
                                {(item.cacheWriteTokens || item.cacheHitTokens) && (
                                  <div className="flex gap-4">
                                    <span className="text-muted-foreground w-16">缓存Tokens</span>
                                    <span>{(item.cacheWriteTokens || 0) + (item.cacheHitTokens || 0)}</span>
                                  </div>
                                )}
                                {/* 日志详情 */}
                                <div className="flex gap-4">
                                  <span className="text-muted-foreground w-16">日志详情</span>
                                  <span>模型倍率: {item.calculation?.modelRatio}, 缓存倍率: {item.calculation?.cacheRatio}, 输出倍率: {item.calculation?.outputRatio}</span>
                                </div>
                                {/* 计费过程 */}
                                <div className="flex gap-4">
                                  <span className="text-muted-foreground w-16 shrink-0">计费过程</span>
                                  <div className="space-y-1">
                                    <div>输入价格: ¥{item.calculation?.inputPrice} / 1M tokens</div>
                                    <div>输出价格: ¥{item.calculation?.outputPrice} / 1M tokens</div>
                                    {item.calculation?.cacheWritePrice ? <div>缓存价格: ¥{item.calculation.cacheWritePrice} / 1M tokens (缓存倍率: {item.calculation?.cacheRatio})</div> : null}
                                    <div className="text-muted-foreground mt-2">
                                      输入 {item.inputTokens} tokens / 1M tokens * ¥{item.calculation?.inputPrice} + 输出 {item.outputTokens} tokens / 1M tokens * ¥{item.calculation?.outputPrice} = ¥{item.amount.toFixed(5)}
                                    </div>
                                    <div className="text-muted-foreground">仅供参考，以实际扣费为准</div>
                                  </div>
                                </div>
                                {/* 请求路径 */}
                                <div className="flex gap-4">
                                  <span className="text-muted-foreground w-16">请求路径</span>
                                  <span className="font-mono">{item.calculation?.requestPath}</span>
                                </div>
                                {/* 计费模式 */}
                                <div className="flex gap-4">
                                  <span className="text-muted-foreground w-16">计费模式</span>
                                  <span>{item.calculation?.billingMode}</span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <>
                      {/* 数据行 */}
                      {shareData.map((item, idx) => {
                        const rawTotal = shareData.reduce((sum, row) => sum + row.amount, 0);
                        const allocationTotal = selectedBill.paidAmount > 0
                          ? selectedBill.paidAmount
                          : rawTotal;
                        const allocatedAmount = rawTotal > 0
                          ? allocationTotal * (item.amount / rawTotal)
                          : 0;
                        return (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="text-xs whitespace-nowrap">
                            {grain === "day" ? item.timeKey : selectedBill.period}
                          </TableCell>
                          {/* 动态维度列 */}
                          {selectedDimensions.map(dim => (
                            <TableCell key={dim} className="text-xs whitespace-nowrap">
                              {dim === "apiKey" && item.apiKey ? (
                                <div>
                                  <div className="font-medium text-foreground">
                                    {apiKeyNames[item.apiKey] || "未命名 Key"}
                                  </div>
                                  <div className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                                    {item.apiKey}
                                  </div>
                                </div>
                              ) : (
                                item[dim] || "-"
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-xs text-right whitespace-nowrap font-semibold">{formatAmount(allocatedAmount)}</TableCell>
                        </TableRow>
                        );
                      })}
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableCell colSpan={selectedDimensions.length + 1} className="text-xs font-semibold">
                          分摊合计
                        </TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap font-bold">
                          {formatAmount(
                            selectedBill.paidAmount > 0
                              ? selectedBill.paidAmount
                              : shareData.reduce((sum, row) => sum + row.amount, 0)
                          )}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 列表页渲染
  return (
    <div className="space-y-4">
      {/* 面包屑 */}
      <div className="text-sm text-foreground font-medium">月结算单</div>

      {/* 月结算单列表 */}
      <Card>
        <CardContent className="p-0">
          {/* 筛选栏 */}
          <div className="flex items-center justify-between p-4 border-b">
            {/* 账期选择器 - 左侧 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">账期:</span>
              <MonthPicker
                value={startPeriod}
                onChange={setStartPeriod}
                placeholder="请选择月份"
              />
              <span className="text-muted-foreground">-</span>
              <MonthPicker
                value={endPeriod}
                onChange={setEndPeriod}
                placeholder="请选择月份"
              />
            </div>
            {/* 导出按钮 - 右侧 */}
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                console.log("导出账单");
              }}
            >
              <Download className="w-3.5 h-3.5" />
              导出账单
            </Button>
          </div>

          {/* 表格 */}
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-medium whitespace-nowrap">账期</TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap">账户主体</TableHead>
                    <TableHead className="text-xs font-medium text-right whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center justify-end gap-1 cursor-help">
                          消费金额
                          <HelpCircle className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">按官方/标准单价计算的原始总价</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-xs font-medium text-right whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center justify-end gap-1 cursor-help">
                          优惠金额
                          <HelpCircle className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">本账期内已在账单中直接抵扣的模型费用优惠（不包含次月返现及退款）</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-xs font-medium text-right whitespace-nowrap">实际消耗金额</TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap">结算单号</TableHead>
                    <TableHead className="text-xs font-medium text-center whitespace-nowrap">账单状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBills.length > 0 ? (
                    paginatedBills.map((bill) => (
                      <TableRow key={bill.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs whitespace-nowrap">{bill.period}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {bill.enterpriseName}
                          <span className="block text-[10px] text-muted-foreground font-normal">{bill.enterpriseId}</span>
                        </TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap">{formatAmount(bill.consumptionAmount)}</TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap text-green-600">{formatAmount(bill.discountAmount)}</TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap">{formatAmount(bill.paidAmount)}</TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">{bill.id}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge variant="outline" className={`text-xs ${bill.status === "billed" ? "text-green-600 border-green-200 bg-green-50" : "text-gray-500 border-gray-200 bg-gray-50"}`}>
                            {bill.status === "billed" ? "已出账" : "未出账"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-8 h-8 text-muted-foreground/50" />
                          <p className="text-sm">没有找到需要的数据哦~</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>

          {/* 分页 */}
          {filteredBills.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>共 {filteredBills.length} 条</span>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[90px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()} className="text-xs">
                        {size} 条/页
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Pagination className="w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer text-xs"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
