import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertCircle,
  Download,
  Receipt,
  Calculator,
  Users,
  BarChart3,
  Search,
  X,
  CalendarDays,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  findAdminEntitlementById,
  STATUS_LABEL,
  STATUS_BADGE,
  type AdminUsageLog,
  type BillingItem,
} from "./admin-entitlements-data";
import { formatCredit, formatDateTime } from "../resource-subscription/shared";

export default function AdminEntitlementDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [entitlement] = useState(() => (id ? findAdminEntitlementById(id) : undefined));
  const [detailLog, setDetailLog] = useState<AdminUsageLog | null>(null);
  const [seatFilter, setSeatFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const filteredLogs = useMemo(() => {
    if (!entitlement?.usageLogs) return [];
    const kw = searchKeyword.trim().toLowerCase();
    return entitlement.usageLogs.filter((l) => {
      if (seatFilter !== "all" && l.seatId !== seatFilter) return false;
      if (dateFrom && new Date(l.time) < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && new Date(l.time) > new Date(`${dateTo}T23:59:59`)) return false;
      if (kw) {
        const matchModel = l.model.toLowerCase().includes(kw);
        const matchSeat = !!l.seatId && l.seatId.toLowerCase().includes(kw);
        if (!matchModel && !matchSeat) return false;
      }
      return true;
    });
  }, [entitlement, seatFilter, dateFrom, dateTo, searchKeyword]);

  const hasActiveFilter =
    seatFilter !== "all" || !!dateFrom || !!dateTo || !!searchKeyword.trim();
  const resetFilters = () => {
    setSeatFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchKeyword("");
  };

  const goBack = () => navigate("/admin/console/entitlement-management");

  if (!entitlement) {
    return (
      <div className="p-6 space-y-6 overflow-y-auto">
        <h1 className="text-xl font-semibold text-foreground">抵扣明细</h1>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">权益不存在或已被删除</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={goBack}>
            返回权益列表
          </Button>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) return;
    const hasSeats = !!entitlement.seats && entitlement.seats.length > 0;
    const headers = [
      "抵扣时间",
      ...(hasSeats ? ["席位ID", "成员名称"] : []),
      "消费模型",
      "抵扣前余量(credit)",
      "抵扣量(credit)",
      "抵扣后余量(credit)",
    ];
    const rows = filteredLogs.map((log) => [
      formatDateTime(log.time),
      ...(hasSeats ? [log.seatId ?? "", log.seatMemberName ?? ""] : []),
      log.model,
      String(log.beforeRemaining),
      String(log.deducted),
      String(log.afterRemaining),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `抵扣明细_${entitlement.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const usedCredits = entitlement.totalQuota - entitlement.remainingQuota;
  const usedPercent =
    entitlement.totalQuota > 0
      ? Math.round((usedCredits / entitlement.totalQuota) * 100)
      : 0;
  const validityPeriod = (() => {
    if (!entitlement.expiresAt) return "永久";
    const start = new Date(entitlement.effectiveAt).getTime();
    const end = new Date(entitlement.expiresAt).getTime();
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (days >= 365) return `${Math.round(days / 365)}年`;
    if (days >= 30) return `${Math.round(days / 30)}个月`;
    return `${days}天`;
  })();

  // 按商品（档位）汇总席位分布
  const seatProductSummary = (() => {
    if (!entitlement.seats || entitlement.seats.length === 0) return null;
    const map = new Map<string, { total: number; assigned: number }>();
    entitlement.seats.forEach((s) => {
      const cur = map.get(s.productName) ?? { total: 0, assigned: 0 };
      cur.total += 1;
      if (s.memberName !== "未分配") cur.assigned += 1;
      map.set(s.productName, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  })();

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* 顶部 */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="gap-1 text-muted-foreground text-base px-2 h-9"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{entitlement.productName}</h1>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${STATUS_BADGE[entitlement.status]}`}
        >
          {STATUS_LABEL[entitlement.status]}
        </span>
      </div>

      {/* 用量概览 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-semibold text-foreground">用量概览</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
            {entitlement.seatCount !== undefined && (
              <DetailRow
                label="席位"
                value={
                  <span className="text-indigo-600 font-semibold">
                    {entitlement.seatCount} 席（已分配 {entitlement.usedSeats ?? 0}）
                  </span>
                }
              />
            )}
            {seatProductSummary && seatProductSummary.length > 1 && (
              <DetailRow
                label="商品分布"
                value={
                  <span className="text-foreground">
                    {seatProductSummary
                      .map((p) => `${p.name} ${p.assigned}/${p.total}`)
                      .join(" · ")}
                  </span>
                }
              />
            )}
            <DetailRow label="有效期" value={validityPeriod} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                已使用 {formatCredit(usedCredits)} / {formatCredit(entitlement.totalQuota)} credit（{usedPercent}%）
              </span>
            </div>
            <Progress value={usedPercent} className="h-2" />
          </div>
        </div>
      </section>

      {/* 席位清单 */}
      {entitlement.seats && entitlement.seats.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-foreground">席位清单</h2>
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs text-muted-foreground">席位ID</TableHead>
                  <TableHead className="text-xs text-muted-foreground">商品</TableHead>
                  <TableHead className="text-xs text-muted-foreground">绑定成员</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">总额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">余量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitlement.seats.map((seat) => {
                  const used = seat.totalQuota - seat.remainingQuota;
                  const idle = seat.memberName === "未分配";
                  return (
                    <TableRow key={seat.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{seat.id}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground">{seat.productName}</TableCell>
                      <TableCell className="text-xs">
                        {idle ? <span className="text-muted-foreground">—</span> : seat.memberName}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">
                        {formatCredit(seat.totalQuota)} credit
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-primary font-medium">
                        {formatCredit(seat.remainingQuota)} credit
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (已用 {formatCredit(used)})
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* 抵扣明细 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">抵扣明细</h2>
            <span className="text-xs text-muted-foreground">
              共 {filteredLogs.length} 条
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>

        {/* 筛选栏：时间范围 + 关键词 + 席位 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-[150px] text-xs"
              aria-label="开始日期"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-[150px] text-xs"
              aria-label="结束日期"
            />
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={entitlement.seats && entitlement.seats.length > 0 ? "搜索模型 / 席位ID" : "搜索模型"}
              className="h-8 pl-7 text-xs"
            />
          </div>
          {entitlement.seats && entitlement.seats.length > 0 && (
            <Select value={seatFilter} onValueChange={setSeatFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="筛选席位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部席位</SelectItem>
                {entitlement.seats
                  .filter((s) => s.memberName !== "未分配")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.memberName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground gap-1"
              onClick={resetFilters}
            >
              <X className="w-3.5 h-3.5" />
              重置
            </Button>
          )}
        </div>
        {filteredLogs.length > 0 ? (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs text-muted-foreground">抵扣时间</TableHead>
                  {entitlement.seats && entitlement.seats.length > 0 && (
                    <>
                      <TableHead className="text-xs text-muted-foreground">席位ID</TableHead>
                      <TableHead className="text-xs text-muted-foreground">成员名称</TableHead>
                    </>
                  )}
                  <TableHead className="text-xs text-muted-foreground">消费模型</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣前额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣后额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-center">计算详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(log.time)}
                    </TableCell>
                    {entitlement.seats && entitlement.seats.length > 0 && (
                      <>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.seatId ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.seatMemberName ?? "—"}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-xs">{log.model}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right">
                      {formatCredit(log.beforeRemaining)} credit
                    </TableCell>
                    <TableCell className="text-xs font-medium text-red-500 text-right">
                      {formatCredit(log.deducted)} credit
                    </TableCell>
                    <TableCell className="text-xs text-foreground text-right">
                      {formatCredit(log.afterRemaining)} credit
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {log.breakdown && log.breakdown.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setDetailLog(log)}
                        >
                          <Calculator className="w-3.5 h-3.5 mr-1" />
                          查看
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border border-border rounded-md p-12 text-center text-muted-foreground">
            <p className="text-sm">暂无抵扣记录</p>
          </div>
        )}
      </section>

      {/* 计算详情弹窗 */}
      <Dialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-500" />
              抵扣计算详情
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3">
              {/* 计费项拆分 */}
              <div className="border border-border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs text-muted-foreground">计费项</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">用量</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">计费系数</TableHead>
                      <TableHead className="text-xs text-muted-foreground text-right">抵扣额度</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailLog.breakdown!.map((item: BillingItem, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{item.name}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">
                          {item.usage.toLocaleString()} {item.unit}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-muted-foreground">
                          × {item.coefficient}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-foreground">
                          {formatCredit(item.deducted)} credit
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/20">
                      <TableCell className="text-xs font-medium" colSpan={3}>
                        合计
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold text-red-500">
                        {formatCredit(
                          detailLog.breakdown!.reduce((s, it) => s + it.deducted, 0)
                        )}{" "}
                        credit
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <p className="text-[11px] text-muted-foreground">
                抵扣额度 = 用量 × 计费系数；各项抵扣之和应与本次抵扣总额一致。
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-right truncate ${
          highlight ? "text-primary font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}


