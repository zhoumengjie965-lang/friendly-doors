import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Repeat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  MOCK_ADMIN_SUBSCRIPTIONS,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_BADGE,
  ACCOUNT_TYPE_LABEL,
  formatMoney,
  formatDateTime,
} from "./admin-subscriptions-data";

const PAGE_SIZE = 10;

export default function AdminSubscriptionList() {
  const [subscriptions] = useState(MOCK_ADMIN_SUBSCRIPTIONS);

  // 筛选
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");

  // 分页
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const hit =
          s.subscriptionNo.toLowerCase().includes(k) ||
          s.subscriberName.toLowerCase().includes(k) ||
          s.planName.toLowerCase().includes(k);
        if (!hit) return false;
      }
      return true;
    });
  }, [subscriptions, statusFilter, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* 页头 */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">订阅管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          管理用户的自动续费订阅关系，处理取消/恢复自动续费等操作。
        </p>
      </div>

      {/* 列表卡片 */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                订阅列表
              </CardTitle>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="订阅状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">生效中</SelectItem>
                  <SelectItem value="pending">待生效</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索订阅编号 / 主体 / 商品名称"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-72 pl-8 text-xs"
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">共 {filtered.length} 条记录</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    订阅编号
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    订阅主体
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    账户类型
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    订阅商品
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                    续费金额
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                    自动续费
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    当前周期
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    最近扣款时间
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    下次续费时间
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                    累计续费
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                    订阅状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                      暂无订阅数据
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">
                        {s.subscriptionNo}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{s.subscriberName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[s.accountType]}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{s.planName}</td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                        {formatMoney(s.price, s.currency)}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {s.autoRenew ? (
                          <Badge
                            variant="outline"
                            className="text-[11px] text-green-600 border-green-200 bg-green-50"
                          >
                            已开启
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[11px] text-gray-500 border-gray-200 bg-gray-50"
                          >
                            已关闭
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        <div className="flex flex-col text-[11px]">
                          <span>起：{formatDateTime(s.currentPeriodStart)}</span>
                          <span>止：{formatDateTime(s.currentPeriodEnd)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-[11px]">
                        {formatDateTime(s.lastChargedAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-[11px]">
                        {s.status === "active" || s.status === "pending"
                          ? formatDateTime(s.currentPeriodEnd)
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap text-muted-foreground tabular-nums">
                        {s.renewalCount} 次
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <Badge
                          variant={s.status === "active" ? "default" : "outline"}
                          className={`${SUBSCRIPTION_STATUS_BADGE[s.status]} text-[11px]`}
                        >
                          {SUBSCRIPTION_STATUS_LABEL[s.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}

                {filtered.length > 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          共 {filtered.length} 条，第 {currentPage} / {totalPages} 页
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={currentPage <= 1}
                            onClick={() => setPage(currentPage - 1)}
                          >
                            <ChevronLeft className="w-3 h-3 mr-1" />
                            上一页
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={currentPage >= totalPages}
                            onClick={() => setPage(currentPage + 1)}
                          >
                            下一页
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
