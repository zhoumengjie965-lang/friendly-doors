import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import {
  MOCK_ADMIN_ORDERS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  PRODUCT_TYPE_LABEL,
  ORDER_TYPE_LABEL,
  ORDER_TYPE_BADGE,
  ACCOUNT_TYPE_LABEL,
  PURCHASE_METHOD_LABEL,
  formatMoney,
  formatDateTime,
} from "./admin-orders-data";

const PAGE_SIZE = 10;

export default function AdminOrderManagement() {
  const navigate = useNavigate();
  const [orders] = useState(MOCK_ADMIN_ORDERS);

  // 筛选
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  // 分页
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (productTypeFilter !== "all" && o.productType !== productTypeFilter) return false;
      if (orderTypeFilter !== "all" && o.orderType !== orderTypeFilter) return false;
      if (startDate) {
        if (o.createdAt.slice(0, 10) < startDate) return false;
      }
      if (endDate) {
        if (o.createdAt.slice(0, 10) > endDate) return false;
      }
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const hit =
          o.orderNo.toLowerCase().includes(k) ||
          o.productName.toLowerCase().includes(k) ||
          o.buyerName.toLowerCase().includes(k);
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, statusFilter, productTypeFilter, orderTypeFilter, startDate, endDate, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* 页头 */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">订单管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          查看所有用户购买商品产生的订单记录，支持按状态、商品类型、订单类型、时间范围筛选查询。
        </p>
      </div>

      {/* 列表卡片 */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                订单列表
              </CardTitle>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="订单状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待支付</SelectItem>
                  <SelectItem value="paid">已支付</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>

              <Select value={productTypeFilter} onValueChange={(v) => { setProductTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="商品类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部商品类型</SelectItem>
                  <SelectItem value="subscription">订阅包</SelectItem>
                  <SelectItem value="one-time">资源包</SelectItem>
                  <SelectItem value="test">测试包</SelectItem>
                </SelectContent>
              </Select>

              <Select value={orderTypeFilter} onValueChange={(v) => { setOrderTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="订单类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部订单类型</SelectItem>
                  <SelectItem value="new">新购</SelectItem>
                  <SelectItem value="renewal">续费</SelectItem>
                  <SelectItem value="upgrade">升级</SelectItem>
                  <SelectItem value="addon">加购</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">创建时间：</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="h-8 w-36 text-xs"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="h-8 w-36 text-xs"
                />
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索订单号 / 商品名称 / 购买主体"
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                  className="h-8 w-64 pl-8 text-xs"
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
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">订单号</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">购买主体</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">账户类型</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">商品名称</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">商品类型</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">订单类型</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">关联订阅号</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">原价金额</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">实际应付</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">支付方式</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">交易流水号</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">订单状态</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">创建时间</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-3 py-8 text-center text-muted-foreground">
                      暂无订单数据
                    </td>
                  </tr>
                ) : (
                  pageRows.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">{o.orderNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{o.buyerName}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{ACCOUNT_TYPE_LABEL[o.accountType]}</td>
                      <td className="px-3 py-2 whitespace-nowrap min-w-[160px]">
                        {o.productName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{PRODUCT_TYPE_LABEL[o.productType]}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <Badge variant="outline" className={`${ORDER_TYPE_BADGE[o.orderType]} text-xs`}>
                          {ORDER_TYPE_LABEL[o.orderType]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {o.subscriptionNo ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-muted-foreground">{formatMoney(o.originalAmount ?? o.amount)}</td>
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{formatMoney(o.amount)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {o.purchaseMethod ? PURCHASE_METHOD_LABEL[o.purchaseMethod] : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {o.transactionId ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <Badge
                          variant={o.status === "paid" ? "default" : "outline"}
                          className={`${ORDER_STATUS_BADGE[o.status]} text-xs`}
                        >
                          {ORDER_STATUS_LABEL[o.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700" onClick={() => navigate(`/admin/console/order-management/${o.id}`)}>
                          查看详情
                        </Button>
                      </td>
                    </tr>
                  ))
                )}

                {filtered.length > 0 && (
                  <tr>
                    <td colSpan={14} className="px-3 py-3">
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
