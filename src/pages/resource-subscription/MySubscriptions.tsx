import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Inbox,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  UserMinus,
} from "lucide-react";
import {
  MOCK_SEAT_SUBSCRIPTIONS,
  MOCK_ENTERPRISE_MEMBERS,
  subStatusLabel,
  subStatusClass,
  seatStatusLabel,
  seatStatusClass,
  formatCredit,
  formatDateTime,
  type SeatSubscription,
  type Seat,
} from "./subscriptions-data";
import { useToast } from "@/hooks/use-toast";

interface Props {
  mode: "enterprise" | "personal";
  role?: string;
}

export default function MySubscriptions({ mode: _mode, role: _role = "member" }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");

  // 席位管理弹窗
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [currentSub, setCurrentSub] = useState<SeatSubscription | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);

  // 分配席位弹窗
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // 解绑确认弹窗
  const [unbindDialogOpen, setUnbindDialogOpen] = useState(false);
  const [unbindSeatId, setUnbindSeatId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MOCK_SEAT_SUBSCRIPTIONS.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        if (!s.id.toLowerCase().includes(k) && !s.planName.toLowerCase().includes(k)) return false;
      }
      return true;
    });
  }, [statusFilter, keyword]);

  const goDetail = (s: SeatSubscription) => navigate(`/workspace/my-subscriptions/${s.id}`);

  // 打开席位管理弹窗
  const openSeatDialog = (s: SeatSubscription) => {
    setCurrentSub(s);
    setSeats([...s.seats]);
    setSeatDialogOpen(true);
  };

  // 打开分配弹窗
  const openAssignDialog = (seatId: string) => {
    setSelectedSeatId(seatId);
    setSelectedMemberId("");
    setAssignDialogOpen(true);
  };

  // 确认分配
  const confirmAssign = () => {
    if (!selectedSeatId || !selectedMemberId) return;
    const member = MOCK_ENTERPRISE_MEMBERS.find((m) => m.id === selectedMemberId);
    if (!member) return;
    setSeats((prev) =>
      prev.map((s) =>
        s.id === selectedSeatId
          ? { ...s, memberId: member.id, memberName: member.name, memberAccount: member.username, status: "assigned" }
          : s
      )
    );
    // 同步更新源数据
    if (currentSub) {
      const target = MOCK_SEAT_SUBSCRIPTIONS.find((sub) => sub.id === currentSub.id);
      if (target) {
        const seatIdx = target.seats.findIndex((s) => s.id === selectedSeatId);
        if (seatIdx >= 0) {
          target.seats[seatIdx] = { ...target.seats[seatIdx], memberId: member.id, memberName: member.name, memberAccount: member.username, status: "assigned" };
          target.usedSeats = target.seats.filter((s) => s.status === "assigned").length;
        }
      }
    }
    setAssignDialogOpen(false);
    setSelectedSeatId(null);
    setSelectedMemberId("");
    toast({ title: "席位已分配", description: `席位已分配给 ${member.name}` });
  };

  // 打开解绑弹窗
  const openUnbindDialog = (seatId: string) => {
    setUnbindSeatId(seatId);
    setUnbindDialogOpen(true);
  };

  // 确认解绑
  const confirmUnbind = () => {
    if (!unbindSeatId) return;
    setSeats((prev) =>
      prev.map((s) =>
        s.id === unbindSeatId
          ? { ...s, memberId: null, memberName: null, memberAccount: null, status: "idle", usedQuota: 0 }
          : s
      )
    );
    // 同步更新源数据
    if (currentSub) {
      const target = MOCK_SEAT_SUBSCRIPTIONS.find((sub) => sub.id === currentSub.id);
      if (target) {
        const seatIdx = target.seats.findIndex((s) => s.id === unbindSeatId);
        if (seatIdx >= 0) {
          target.seats[seatIdx] = { ...target.seats[seatIdx], memberId: null, memberName: null, memberAccount: null, status: "idle", usedQuota: 0 };
          target.usedSeats = target.seats.filter((s) => s.status === "assigned").length;
        }
      }
    }
    setUnbindDialogOpen(false);
    setUnbindSeatId(null);
    toast({ title: "席位已解绑", description: "该席位已释放，可重新分配。" });
  };

  // 可分配成员（排除已绑定到当前订阅的成员）
  const boundMemberIds = useMemo(() => new Set(seats.filter((s) => s.memberId).map((s) => s.memberId)), [seats]);
  const availableMembers = useMemo(() => MOCK_ENTERPRISE_MEMBERS.filter((m) => !boundMemberIds.has(m.id)), [boundMemberIds]);
  const usedSeatsCount = seats.filter((s) => s.status === "assigned").length;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 我的订阅包</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          查看席位制订阅包，管理席位分配与自动续费。
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
              <SelectItem value="expired">已过期</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="搜索订阅ID或套餐名称"
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
                <TableHead className="text-muted-foreground whitespace-nowrap">订阅ID</TableHead>
                <TableHead className="text-muted-foreground">订阅套餐</TableHead>
                <TableHead className="text-muted-foreground w-[90px]">订阅状态</TableHead>
                <TableHead className="text-muted-foreground w-[100px] text-center">席位</TableHead>
                <TableHead className="text-muted-foreground w-[100px]">自动续费</TableHead>
                <TableHead className="text-muted-foreground w-[220px]">当前周期</TableHead>
                <TableHead className="text-muted-foreground w-[180px]">下次续费时间</TableHead>
                <TableHead className="text-muted-foreground text-right w-[160px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Inbox className="w-10 h-10 opacity-30" />
                      <p className="text-sm">暂无订阅记录</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {s.id}
                    </TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">{s.planName}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${subStatusClass[s.status]}`}
                      >
                        {subStatusLabel[s.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-center whitespace-nowrap">
                      <span className="font-medium text-foreground">{s.usedSeats}</span>
                      <span className="text-muted-foreground"> / {s.seatCount}</span>
                    </TableCell>
                    <TableCell>
                      {s.status === "active" ? (
                        <span className={`inline-flex items-center text-xs font-medium ${s.autoRenew ? "text-green-600" : "text-gray-400"}`}>
                          {s.autoRenew ? "已开启" : "已关闭"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {formatDateTime(s.currentPeriodStart)} ~ {formatDateTime(s.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {s.nextBillingAt ? formatDateTime(s.nextBillingAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => openSeatDialog(s)}
                        >
                          <Users className="w-3.5 h-3.5 mr-1" />
                          席位分配
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => goDetail(s)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          详情
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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

      {/* 席位管理弹窗 */}
      <Dialog open={seatDialogOpen} onOpenChange={setSeatDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              席位管理 - {currentSub?.planName}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                已分配 {usedSeatsCount} / {currentSub?.seatCount} 席
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-muted-foreground whitespace-nowrap">席位编号</TableHead>
                    <TableHead className="text-muted-foreground">绑定成员</TableHead>
                    <TableHead className="text-muted-foreground">成员账号</TableHead>
                    <TableHead className="text-muted-foreground w-[90px]">状态</TableHead>
                    <TableHead className="text-muted-foreground w-[130px]">本周期额度</TableHead>
                    <TableHead className="text-muted-foreground w-[130px]">已使用额度</TableHead>
                    <TableHead className="text-muted-foreground w-[130px]">剩余额度</TableHead>
                    <TableHead className="text-muted-foreground text-right w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seats.map((seat) => {
                    const remaining = seat.periodQuota - seat.usedQuota;
                    const percent = seat.periodQuota > 0 ? Math.round((seat.usedQuota / seat.periodQuota) * 100) : 0;
                    return (
                      <TableRow key={seat.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {seat.id}
                        </TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {seat.memberName ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {seat.memberAccount ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${seatStatusClass[seat.status]}`}
                          >
                            {seatStatusLabel[seat.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatCredit(seat.periodQuota)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span>{formatCredit(seat.usedQuota)}</span>
                            <Progress value={percent} className="h-1 w-16" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap font-medium text-primary">
                          {formatCredit(remaining)}
                        </TableCell>
                        <TableCell className="text-right">
                          {seat.status === "idle" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-blue-600 hover:text-blue-700"
                              onClick={() => openAssignDialog(seat.id)}
                              disabled={availableMembers.length === 0}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1" />
                              分配
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-500 hover:text-red-600"
                              onClick={() => openUnbindDialog(seat.id)}
                            >
                              <UserMinus className="w-3.5 h-3.5 mr-1" />
                              解绑
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              说明：一个席位绑定一个企业成员，成员创建的多个 API Key 均归属于该席位消耗订阅额度。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分配席位弹窗 */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>分配席位</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              席位编号：<span className="font-mono text-foreground">{selectedSeatId}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">选择成员</label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择要分配的企业成员" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      无可分配成员
                    </SelectItem>
                  ) : (
                    availableMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}（{m.username}）- {m.department}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmAssign} disabled={!selectedMemberId}>
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解绑席位确认弹窗 */}
      <AlertDialog open={unbindDialogOpen} onOpenChange={setUnbindDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>解绑席位</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              解绑后该成员将无法继续使用此席位的额度，席位下已创建的 API Key 调用将被拦截。确定要解绑吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnbindDialogOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnbind} className="bg-red-500 hover:bg-red-600">
              确认解绑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
