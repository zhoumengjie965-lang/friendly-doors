import { useState } from "react";
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
  ArrowLeft,
  AlertCircle,
  Download,
  Receipt,
  Calculator,
} from "lucide-react";
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
    if (!entitlement.usageLogs || entitlement.usageLogs.length === 0) return;
    const headers = [
      "抵扣时间",
      "APIKey名称",
      "消费模型",
      "抵扣前余量(credit)",
      "抵扣量(credit)",
      "抵扣后余量(credit)",
    ];
    const rows = entitlement.usageLogs.map((log) => [
      formatDateTime(log.time),
      log.apiKeyName,
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

      {/* 抵扣明细 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">抵扣明细</h2>
            <span className="text-xs text-muted-foreground">
              共 {entitlement.usageLogs?.length ?? 0} 条
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleExport}
            disabled={!entitlement.usageLogs || entitlement.usageLogs.length === 0}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
        {entitlement.usageLogs && entitlement.usageLogs.length > 0 ? (
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs text-muted-foreground">抵扣时间</TableHead>
                  <TableHead className="text-xs text-muted-foreground">APIKey名称</TableHead>
                  <TableHead className="text-xs text-muted-foreground">消费模型</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣前额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-right">抵扣后额度</TableHead>
                  <TableHead className="text-xs text-muted-foreground text-center">计算详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitlement.usageLogs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(log.time)}
                    </TableCell>
                    <TableCell className="text-xs">{log.apiKeyName}</TableCell>
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


