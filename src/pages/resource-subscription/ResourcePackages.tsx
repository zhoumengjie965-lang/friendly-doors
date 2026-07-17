import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Inbox,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCredit, formatDateTime } from "./shared";
import {
  ALL_ENTITLEMENTS,
  statusLabel,
  statusClass,
  quotaRuleLabel,
  type Entitlement,
} from "./entitlements-data";

interface Props {
  mode: "enterprise" | "personal";
  role?: string;
}

export default function ResourcePackages({ mode: _mode, role: _role = "member" }: Props) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    return ALL_ENTITLEMENTS.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        if (!(e.orderId ?? "").toLowerCase().includes(k)) return false;
      }
      if (startDate) {
        const t = new Date(e.effectiveAt).getTime();
        const s = new Date(startDate).setHours(0, 0, 0, 0);
        if (t < s) return false;
      }
      if (endDate) {
        const t = new Date(e.effectiveAt).getTime();
        const ed = new Date(endDate).setHours(23, 59, 59, 999);
        if (t > ed) return false;
      }
      return true;
    });
  }, [statusFilter, keyword, startDate, endDate]);

  const goDetail = (e: Entitlement) => navigate(`/workspace/resource-packages/${e.id}`);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 我的权益</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          查看已持有的订阅包和资源包，包括额度使用情况、适用模型范围和消耗明细。
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {/* 筛选条 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">生效中</SelectItem>
              <SelectItem value="exhausted">已用完</SelectItem>
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">生效时间：</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-40 text-sm"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-40 text-sm"
            />
          </div>
          <Input
            placeholder="搜索关联订单号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-9 w-60 text-sm"
          />
        </div>

        {/* 表格 */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground whitespace-nowrap">权益ID</TableHead>
                <TableHead className="text-muted-foreground">来源商品</TableHead>
                <TableHead className="text-muted-foreground w-[90px]">状态</TableHead>
                <TableHead className="text-muted-foreground w-[110px]">额度规则</TableHead>
                <TableHead className="text-muted-foreground w-[140px]">总量</TableHead>
                <TableHead className="text-muted-foreground w-[140px]">余量</TableHead>
                <TableHead className="text-muted-foreground w-[170px]">生效时间</TableHead>
                <TableHead className="text-muted-foreground w-[170px]">失效时间</TableHead>
                <TableHead className="text-muted-foreground">备注</TableHead>
                <TableHead className="text-muted-foreground text-right w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Inbox className="w-10 h-10 opacity-30" />
                      <p className="text-sm">暂无权益记录</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {e.id}
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">{e.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${statusClass[e.status]}`}
                        >
                          {statusLabel[e.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {quotaRuleLabel[e.quotaRule]}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatCredit(e.totalQuota)} credit
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap font-medium text-primary">
                        {formatCredit(e.remainingQuota)} credit
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(e.effectiveAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {e.expiresAt ? formatDateTime(e.expiresAt) : "永久"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.remark}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => goDetail(e)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">共 {filtered.length} 条记录</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">1 / 1</span>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
