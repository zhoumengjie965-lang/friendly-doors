import { useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  ChevronDown,
  Ticket,
  Plus,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────

type VoucherSource = "bill" | "manual";
type VoucherStatus = "using" | "used" | "expired";
type SpaceType = "personal" | "enterprise";

interface SubjectOption {
  id: string;
  name: string;           // 企业名/用户名/显示名
  displayName: string;    // 显示名（用于搜索展示）
  spaceType: SpaceType;
  keyword: string;        // 搜索关键词（合并所有可搜索字段）
}

interface VoucherRecord {
  id: string;                    // 代金券编号
  source: VoucherSource;         // 来源类型
  sourceRef: string;             // 来源说明（账单号或备注）
  period?: string;               // 来源账期（账单返券时有值，如 2026-04）
  subjectId: string;
  subjectName: string;           // 主体名称（客户名称）
  spaceType: SpaceType;
  amount: number;                // 代金券金额
  remaining: number;             // 剩余金额
  sentAt: string;                // 发放时间
  expiryDate: string;            // 过期时间
  operator: string;              // 操作人
  remark?: string;               // 备注（手工发放时）
}

// ─── Mock 数据 ──────────────────────────────────────────────────────────

// 可选发放主体（企业/个人）
const MOCK_SUBJECTS: SubjectOption[] = [
  { id: "SUBJ-002", name: "未来智能", displayName: "未来智能", spaceType: "enterprise", keyword: "未来智能 wlzn" },
  { id: "SUBJ-006", name: "领航科技", displayName: "领航科技", spaceType: "enterprise", keyword: "领航科技 lhkj" },
  { id: "SUBJ-007", name: "云海数据", displayName: "云海数据", spaceType: "enterprise", keyword: "云海数据 yhsj" },
  { id: "SUBJ-008", name: "恒通科技", displayName: "恒通科技", spaceType: "enterprise", keyword: "恒通科技 htkj" },
  { id: "SUBJ-009", name: "先锋智能", displayName: "先锋智能", spaceType: "enterprise", keyword: "先锋智能 xfzn" },
  { id: "SUBJ-010", name: "信达信息", displayName: "信达信息", spaceType: "enterprise", keyword: "信达信息 xdxx" },
  { id: "SUBJ-011", name: "远航系统", displayName: "远航系统", spaceType: "enterprise", keyword: "远航系统 yhxt" },
  { id: "SUBJ-012", name: "启明数字", displayName: "启明数字", spaceType: "enterprise", keyword: "启明数字 qmsz" },
  { id: "SUBJ-013", name: "星辰科技", displayName: "星辰科技", spaceType: "enterprise", keyword: "星辰科技 xckj" },
  { id: "SUBJ-014", name: "智云互联", displayName: "智云互联", spaceType: "enterprise", keyword: "智云互联 zyhl" },
  { id: "USER-001", name: "张三", displayName: "张三 (zhangsan)", spaceType: "personal", keyword: "张三 zhangsan zs" },
  { id: "USER-002", name: "李四", displayName: "李四 (lisi)", spaceType: "personal", keyword: "李四 lisi ls" },
  { id: "USER-003", name: "王五", displayName: "王五 (wangwu)", spaceType: "personal", keyword: "王五 wangwu ww" },
];

// 初始代金券记录（账单返券）
const INITIAL_VOUCHERS: VoucherRecord[] = [
  {
    id: "VCBILL-2029380",
    source: "bill",
    sourceRef: "BILL-202604-002",
    period: "2026-04",
    subjectId: "SUBJ-002",
    subjectName: "未来智能",
    spaceType: "enterprise",
    amount: 5237.00,
    remaining: 4451.45,
    sentAt: "2026-04-02 10:30:00",
    expiryDate: "2026-05-31 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029382",
    source: "bill",
    sourceRef: "BILL-202604-006",
    period: "2026-04",
    subjectId: "SUBJ-006",
    subjectName: "领航科技",
    spaceType: "enterprise",
    amount: 3000.00,
    remaining: 0,
    sentAt: "2026-04-05 09:15:00",
    expiryDate: "2026-06-30 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029383",
    source: "bill",
    sourceRef: "BILL-202604-007",
    period: "2026-03",
    subjectId: "SUBJ-007",
    subjectName: "云海数据",
    spaceType: "enterprise",
    amount: 8500.00,
    remaining: 8500.00,
    sentAt: "2026-03-03 11:20:00",
    expiryDate: "2026-04-30 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029384",
    source: "bill",
    sourceRef: "BILL-202604-008",
    period: "2026-04",
    subjectId: "SUBJ-008",
    subjectName: "恒通科技",
    spaceType: "enterprise",
    amount: 5200.00,
    remaining: 5200.00,
    sentAt: "2026-04-02 14:00:00",
    expiryDate: "2026-05-31 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029385",
    source: "bill",
    sourceRef: "BILL-202604-009",
    period: "2026-04",
    subjectId: "SUBJ-009",
    subjectName: "先锋智能",
    spaceType: "enterprise",
    amount: 7500.00,
    remaining: 5000.00,
    sentAt: "2026-04-03 16:45:00",
    expiryDate: "2026-05-31 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029386",
    source: "bill",
    sourceRef: "BILL-202604-010",
    period: "2026-04",
    subjectId: "SUBJ-010",
    subjectName: "信达信息",
    spaceType: "enterprise",
    amount: 3500.00,
    remaining: 5000.00,
    sentAt: "2026-04-04 08:30:00",
    expiryDate: "2026-05-31 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029387",
    source: "bill",
    sourceRef: "BILL-202604-011",
    period: "2026-04",
    subjectId: "SUBJ-011",
    subjectName: "远航系统",
    spaceType: "enterprise",
    amount: 3000.00,
    remaining: 2000.00,
    sentAt: "2026-04-05 10:00:00",
    expiryDate: "2026-05-31 23:59:59",
    operator: "张三",
  },
  {
    id: "VCBILL-2029388",
    source: "bill",
    sourceRef: "BILL-202604-012",
    period: "2026-04",
    subjectId: "SUBJ-012",
    subjectName: "启明数字",
    spaceType: "enterprise",
    amount: 2800.00,
    remaining: 0,
    sentAt: "2026-04-06 13:20:00",
    expiryDate: "2026-05-31 23:59:59",
    operator: "张三",
  },
];

const formatCurrency = (value: number) =>
  `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const now = () => format(new Date(), "yyyy-MM-dd HH:mm:ss");

const genVoucherId = () =>
  `VCMANUAL-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`;

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AdminVoucherRecords() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<VoucherRecord[]>(INITIAL_VOUCHERS);

  // 筛选状态
  const [voucherSearchQuery, setVoucherSearchQuery] = useState("");
  const [voucherEnterpriseQuery, setVoucherEnterpriseQuery] = useState("");
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string[]>(["using", "used", "expired"]);
  const [voucherPage, setVoucherPage] = useState(1);
  const voucherPageSize = 10;

  // 发放弹窗状态
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueSubject, setIssueSubject] = useState<SubjectOption | null>(null);
  const [issueSubjectOpen, setIssueSubjectOpen] = useState(false);
  const [issueAmount, setIssueAmount] = useState<string>("");
  const [issueValidDays, setIssueValidDays] = useState<number>(60);
  const [issueRemark, setIssueRemark] = useState("");
  const [issuing, setIssuing] = useState(false);
  // 二次确认弹窗状态
  const [confirmOpen, setConfirmOpen] = useState(false);

  const getVoucherStatus = (v: VoucherRecord): VoucherStatus => {
    if (new Date(v.expiryDate) < new Date()) return "expired";
    if (v.remaining <= 0) return "used";
    return "using";
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const status = getVoucherStatus(v);
      if (voucherSearchQuery && !v.id.toLowerCase().includes(voucherSearchQuery.toLowerCase())) return false;
      if (voucherEnterpriseQuery && !v.subjectName.toLowerCase().includes(voucherEnterpriseQuery.toLowerCase())) return false;
      if (!voucherStatusFilter.includes(status)) return false;
      return true;
    });
  }, [vouchers, voucherSearchQuery, voucherEnterpriseQuery, voucherStatusFilter]);

  const total = filteredVouchers.length;
  const totalPages = Math.max(1, Math.ceil(total / voucherPageSize));
  const currentPage = Math.min(voucherPage, totalPages);
  const start = (currentPage - 1) * voucherPageSize;
  const pageItems = filteredVouchers.slice(start, start + voucherPageSize);

  const resetIssueForm = () => {
    setIssueSubject(null);
    setIssueAmount("");
    setIssueValidDays(60);
    setIssueRemark("");
  };

  const openIssueDialog = () => {
    resetIssueForm();
    setIssueOpen(true);
  };

  const handleIssue = async () => {
    if (!issueSubject) {
      toast({ title: "请选择发放对象", variant: "destructive" });
      return;
    }
    const amount = parseFloat(issueAmount);
    if (!amount || amount <= 0) {
      toast({ title: "请输入有效的代金券金额", variant: "destructive" });
      return;
    }
    if (!issueValidDays || issueValidDays <= 0) {
      toast({ title: "请输入有效的有效期天数", variant: "destructive" });
      return;
    }
    // 校验通过，打开二次确认弹窗
    setConfirmOpen(true);
  };

  const confirmIssue = async () => {
    if (!issueSubject) return;
    const amount = parseFloat(issueAmount);

    setIssuing(true);
    await new Promise((r) => setTimeout(r, 500));
    setIssuing(false);

    const expiry = addDays(new Date(), issueValidDays);
    expiry.setHours(23, 59, 59, 0);

    const newVoucher: VoucherRecord = {
      id: genVoucherId(),
      source: "manual",
      sourceRef: issueRemark.trim() || "运营赠送",
      subjectId: issueSubject.id,
      subjectName: issueSubject.name,
      spaceType: issueSubject.spaceType,
      amount,
      remaining: amount,
      sentAt: now(),
      expiryDate: format(expiry, "yyyy-MM-dd HH:mm:ss"),
      operator: "管理员",
      remark: issueRemark.trim() || undefined,
    };

    setVouchers((prev) => [newVoucher, ...prev]);
    setConfirmOpen(false);
    setIssueOpen(false);
    resetIssueForm();
    setVoucherPage(1);
    toast({ title: "发放成功", description: `已向「${issueSubject.name}」发放 ${formatCurrency(amount)} 代金券` });
  };

  // 预览到期日期
  const previewExpiryDate = useMemo(() => {
    const d = addDays(new Date(), issueValidDays || 0);
    return format(d, "yyyy-MM-dd") + " 23:59:59";
  }, [issueValidDays]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">代金券管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            查看所有已发放代金券的使用情况、剩余金额及过期状态，支持手工发放
          </p>
        </div>
        <Button onClick={openIssueDialog} className="gap-1.5">
          <Plus className="w-4 h-4" />
          发放代金券
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                代金券管理
              </CardTitle>
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
            <span className="text-xs text-muted-foreground">共 {total} 条记录</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">代金券编号</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源类型</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源说明</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源账期</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">主体名称</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">空间类型</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">代金券金额</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">剩余金额</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">状态</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">发送时间</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">过期时间</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">操作人</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {total === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                      {voucherSearchQuery || voucherEnterpriseQuery ? "未找到匹配的代金券" : "暂无代金券记录"}
                    </td>
                  </tr>
                ) : (
                  <>
                    {pageItems.map((v) => {
                      const status = getVoucherStatus(v);
                      const statusBadge = (() => {
                        if (status === "expired") return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 text-xs">已过期</Badge>;
                        if (status === "used") return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">已用完</Badge>;
                        return <Badge className="bg-green-500 text-white border-green-500 hover:bg-green-600 text-xs">正常</Badge>;
                      })();
                      const sourceBadge = v.source === "bill"
                        ? <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">账单返券</Badge>
                        : <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 text-xs">运营赠送</Badge>;
                      return (
                        <tr key={v.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono">{v.id}</td>
                          <td className="px-3 py-2">{sourceBadge}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <span className={v.source === "bill" ? "font-mono" : ""}>{v.sourceRef}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">
                            {v.source === "bill" ? (v.period ?? "-") : "-"}
                          </td>
                          <td className="px-3 py-2">{v.subjectName}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-xs">
                              {v.spaceType === "personal" ? "个人空间" : "企业空间"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(v.amount)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatCurrency(v.remaining)}</td>
                          <td className="px-3 py-2 text-center">{statusBadge}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{v.sentAt}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{v.expiryDate}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{v.operator}</td>
                        </tr>
                      );
                    })}
                    {total > voucherPageSize && (
                      <tr>
                        <td colSpan={12} className="px-3 py-3">
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
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 发放代金券弹窗 ── */}
      <Dialog open={issueOpen} onOpenChange={(open) => { if (!issuing) setIssueOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>发放代金券</DialogTitle>
            <DialogDescription>
              手工向指定主体发放代金券，发放后立即生效
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 发放对象 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                发放对象 <span className="text-destructive">*</span>
              </Label>
              <Popover open={issueSubjectOpen} onOpenChange={setIssueSubjectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={issueSubjectOpen}
                    className="w-full justify-between h-9 font-normal"
                  >
                    {issueSubject ? (
                      <span className="flex items-center gap-2">
                        {issueSubject.displayName}
                        <Badge
                          className={`text-[10px] h-4 px-1 border-0 ${
                            issueSubject.spaceType === "personal"
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-violet-500 text-white hover:bg-violet-600"
                          }`}
                        >
                          {issueSubject.spaceType === "personal" ? "个人空间" : "企业空间"}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">搜索企业名称 / 用户名 / 显示名</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command filter={(value, search) => {
                    if (!search) return 1;
                    const opt = MOCK_SUBJECTS.find(s => s.id === value);
                    if (!opt) return 0;
                    return opt.keyword.toLowerCase().includes(search.toLowerCase())
                      || opt.name.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                  }}>
                    <CommandInput placeholder="搜索企业名称 / 用户名 / 显示名" className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty>未找到匹配的主体</CommandEmpty>
                      <CommandGroup>
                        {MOCK_SUBJECTS.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.id}
                            onSelect={() => {
                              setIssueSubject(s);
                              setIssueSubjectOpen(false);
                            }}
                            className="text-xs flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <Check className={cn("h-3.5 w-3.5", issueSubject?.id === s.id ? "opacity-100" : "opacity-0")} />
                              {s.displayName}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto">
                              {s.spaceType === "personal" ? "个人" : "企业"}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* 代金券金额 */}
            <div className="space-y-1.5">
              <Label htmlFor="voucher-amount" className="text-sm">
                代金券金额 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="voucher-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="请输入金额"
                  value={issueAmount}
                  onChange={(e) => setIssueAmount(e.target.value)}
                  className="h-9 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">元</span>
              </div>
            </div>

            {/* 有效期 */}
            <div className="space-y-1.5">
              <Label htmlFor="voucher-days" className="text-sm">
                有效期 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="voucher-days"
                  type="number"
                  min="1"
                  value={issueValidDays}
                  onChange={(e) => setIssueValidDays(parseInt(e.target.value) || 0)}
                  className="h-9 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">天</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                默认 60 天，到期时间为 {format(addDays(new Date(), issueValidDays || 0), "yyyy-MM-dd")} 23:59:59
              </p>
            </div>

            {/* 来源说明 */}
            <div className="space-y-1.5">
              <Label htmlFor="voucher-remark" className="text-sm">来源说明</Label>
              <Textarea
                id="voucher-remark"
                placeholder="选填，如发放原因、活动名称等"
                value={issueRemark}
                onChange={(e) => setIssueRemark(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueOpen(false)} disabled={issuing}>
              取消
            </Button>
            <Button onClick={handleIssue} disabled={issuing}>
              确认发放
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 二次确认弹窗 ── */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!issuing) setConfirmOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认发放代金券</DialogTitle>
            <DialogDescription>
              请核对以下发券信息，确认后将立即生效
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="rounded-lg border bg-muted/30 divide-y">
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">发放对象</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {issueSubject?.name}
                  {issueSubject && (
                    <Badge
                      className={`text-[10px] h-4 px-1 border-0 ${
                        issueSubject.spaceType === "personal"
                          ? "bg-blue-500 text-white"
                          : "bg-violet-500 text-white"
                      }`}
                    >
                      {issueSubject.spaceType === "personal" ? "个人空间" : "企业空间"}
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">代金券金额</span>
                <span className="font-mono font-semibold text-base text-primary">
                  {formatCurrency(parseFloat(issueAmount) || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">有效期</span>
                <span className="font-medium">{issueValidDays} 天</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">到期时间</span>
                <span className="font-mono text-xs">{previewExpiryDate}</span>
              </div>
              {issueRemark.trim() && (
                <div className="px-3 py-2 text-sm">
                  <div className="text-muted-foreground mb-0.5">来源说明</div>
                  <div className="text-sm break-all">{issueRemark.trim()}</div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={issuing}>
              返回修改
            </Button>
            <Button onClick={confirmIssue} disabled={issuing} variant="default">
              {issuing ? "发放中..." : "确认发放"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
