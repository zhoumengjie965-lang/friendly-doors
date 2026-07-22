import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Key, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import {
  MOCK_ADMIN_ENTITLEMENTS,
  ACCOUNT_TYPE_LABEL,
  PRODUCT_TYPE_LABEL,
  STATUS_LABEL,
  STATUS_BADGE,
  type AdminEntitlement,
} from "./admin-entitlements-data";
import { formatCredit, formatDateTime } from "../resource-subscription/shared";

const PAGE_SIZE = 10;

export default function AdminEntitlementManagement() {
  const navigate = useNavigate();
  const [entitlements] = useState<AdminEntitlement[]>(MOCK_ADMIN_ENTITLEMENTS);

  // 筛选
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  // 分页
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return entitlements.filter((e) => {
      if (productTypeFilter !== "all" && e.productType !== productTypeFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (startDate) {
        if (e.effectiveAt.slice(0, 10) < startDate) return false;
      }
      if (endDate) {
        if (e.effectiveAt.slice(0, 10) > endDate) return false;
      }
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const hit =
          e.productName.toLowerCase().includes(k) ||
          e.orderId.toLowerCase().includes(k) ||
          e.ownerName.toLowerCase().includes(k);
        if (!hit) return false;
      }
      return true;
    });
  }, [entitlements, productTypeFilter, statusFilter, startDate, endDate, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* 页头 */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">权益管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          管理用户购买商品后生成的权益实例，支持按权益类型、生效时间筛选查询。
        </p>
      </div>

      {/* 列表卡片 */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                权益列表
              </CardTitle>

              <Select
                value={productTypeFilter}
                onValueChange={(v) => {
                  setProductTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="权益类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="subscription">订阅包</SelectItem>
                  <SelectItem value="package">资源包</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">生效中</SelectItem>
                  <SelectItem value="frozen">已冻结</SelectItem>
                  <SelectItem value="exhausted">已用完</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">生效时间：</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-36 text-xs"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-36 text-xs"
                />
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索商品名称 / 订单号 / 购买主体"
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
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">权益ID</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源商品</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap w-[90px]">状态</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">商品类型</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">购买主体</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">账户类型</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">来源订单</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">总量</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">余量</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">生效时间</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">失效时间</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">备注</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">
                      暂无权益数据
                    </td>
                  </tr>
                ) : (
                  pageRows.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">{e.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap min-w-[180px]">{e.productName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[e.status]}`}
                        >
                          {STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {PRODUCT_TYPE_LABEL[e.productType]}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{e.ownerName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[e.accountType]}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {e.orderId}
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                        {formatCredit(e.totalQuota)} credit
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-primary font-medium">
                        {formatCredit(e.remainingQuota)} credit
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(e.effectiveAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {e.expiresAt ? formatDateTime(e.expiresAt) : "永久"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{e.remark}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => navigate(`/admin/console/entitlement-management/${e.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            明细
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {filtered.length > 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-3">
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
