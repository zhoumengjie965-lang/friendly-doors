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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import {
  MOCK_ORDER_ROWS,
  productTypeExtLabel,
  orderTypeExtLabel,
  purchaseMethodExtLabel,
  orderStatusExtLabel,
  orderStatusExtClass,
  formatMoney,
  formatDateTime,
  type OrderRow,
  type OrderStatus,
} from "./orders-data";

interface Props {
  mode: "enterprise" | "personal";
  role?: string;
}

export default function ResourceOrders({ mode }: Props) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);

  const filtered = useMemo(() => {
    return MOCK_ORDER_ROWS.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (productTypeFilter !== "all" && o.productType !== productTypeFilter) return false;
      if (orderTypeFilter !== "all" && o.orderType !== orderTypeFilter) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        if (!o.orderNo.toLowerCase().includes(k) && !o.productName.toLowerCase().includes(k)) return false;
      }
      if (startDate) {
        const created = new Date(o.createdAt).getTime();
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (created < start) return false;
      }
      if (endDate) {
        const created = new Date(o.createdAt).getTime();
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [statusFilter, productTypeFilter, orderTypeFilter, keyword, startDate, endDate]);

  const goDetail = (o: OrderRow) => navigate(`/workspace/resource-orders/${o.id}`);
  const goPay = (o: OrderRow) => {
    navigate(`/workspace/confirm-order?orderId=${o.id}`);
  };
  const cancelOrder = (o: OrderRow) => {
    setCancelTarget(o);
  };
  const confirmCancel = () => {
    if (cancelTarget) {
      cancelTarget.status = "cancelled";
    }
    setCancelTarget(null);
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 订单管理</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "enterprise" ? "查看企业所有商品购买与续费订单。" : "查看个人所有商品购买与续费订单。"}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {/* 筛选条：单行 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="订单状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待支付</SelectItem>
              <SelectItem value="paid">已支付</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
          <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="商品类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部商品类型</SelectItem>
              <SelectItem value="subscription">订阅包</SelectItem>
              <SelectItem value="one-time">资源包</SelectItem>
            </SelectContent>
          </Select>
          <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="订单类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部订单类型</SelectItem>
              <SelectItem value="new">新购</SelectItem>
              <SelectItem value="renewal">续费</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">创建时间：</span>
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
            placeholder="搜索订单号 / 商品名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-9 w-64 text-sm"
          />
        </div>

        {/* 表格 */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground w-[170px]">订单号</TableHead>
                <TableHead className="text-muted-foreground min-w-[200px]">商品名称</TableHead>
                <TableHead className="text-muted-foreground w-[120px]">商品类型</TableHead>
                <TableHead className="text-muted-foreground w-[90px]">订单类型</TableHead>
                <TableHead className="text-muted-foreground w-[110px]">订单金额</TableHead>
                <TableHead className="text-muted-foreground w-[110px]">支付方式</TableHead>
                <TableHead className="text-muted-foreground w-[160px]">创建时间</TableHead>
                <TableHead className="text-muted-foreground w-[160px]">支付时间</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">订单状态</TableHead>
                <TableHead className="text-muted-foreground text-right w-[180px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Inbox className="w-10 h-10 opacity-30" />
                      <p className="text-sm">暂无订单记录</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">{o.orderNo}</TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">{o.productName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {productTypeExtLabel(o.productType)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        o.orderType === "new"
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "bg-purple-50 text-purple-600 border border-purple-200"
                      }`}>
                        {orderTypeExtLabel(o.orderType)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground whitespace-nowrap">
                      {formatMoney(o.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {o.status === "paid"
                        ? purchaseMethodExtLabel(o.purchaseMethod)
                        : o.purchaseMethod
                          ? purchaseMethodExtLabel(o.purchaseMethod)
                          : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {o.paidAt ? formatDateTime(o.paidAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions order={o} onDetail={goDetail} onPay={goPay} onCancel={cancelOrder} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
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

      {/* 取消订单确认弹窗 */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">取消订单</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-base text-foreground">确定取消以下产品的订单吗？</p>
              <div className="border border-border rounded-md overflow-hidden">
                <div className="grid grid-cols-2 bg-muted/50 px-5 py-3 text-sm text-muted-foreground font-medium">
                  <span>产品名称</span>
                  <span className="text-right">金额</span>
                </div>
                <div className="grid grid-cols-2 px-5 py-4 text-sm text-foreground">
                  <span>{cancelTarget?.productName} x {cancelTarget?.quantity ?? 1}</span>
                  <span className="text-right">{cancelTarget ? formatMoney(cancelTarget.amount) : ""}</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter className="sm:justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="px-6">取消</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button className="bg-sky-500 hover:bg-sky-600 text-white px-6" onClick={confirmCancel}>确定</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${orderStatusExtClass[status]}`}>
      {orderStatusExtLabel[status]}
    </span>
  );
}

function RowActions({
  order,
  onDetail,
  onPay,
  onCancel,
}: {
  order: OrderRow;
  onDetail: (o: OrderRow) => void;
  onPay: (o: OrderRow) => void;
  onCancel: (o: OrderRow) => void;
}) {
  const linkCls = "text-xs text-blue-600 hover:text-blue-700 px-0 h-auto";
  if (order.status === "pending") {
    return (
      <div className="flex items-center justify-end gap-3">
        <Button variant="link" size="sm" className={linkCls} onClick={() => onDetail(order)}>
          查看详情
        </Button>
        <Button variant="link" size="sm" className={linkCls} onClick={() => onPay(order)}>
          支付
        </Button>
        <Button variant="link" size="sm" className={linkCls} onClick={() => onCancel(order)}>
          取消
        </Button>
      </div>
    );
  }
  return (
    <Button variant="link" size="sm" className={`${linkCls} ml-auto`} onClick={() => onDetail(order)}>
      查看详情
    </Button>
  );
}
