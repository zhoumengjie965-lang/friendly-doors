import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Crown, Users, UserPlus, UserMinus, Inbox, Download, Plus, RefreshCw, Wallet, ArrowUpCircle, Filter, Search, Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { MOCK_SEAT_SUBSCRIPTIONS, MOCK_ENTERPRISE_MEMBERS, subStatusLabel, subStatusClass, seatTierLabel, formatCredit, formatDateTime, type Seat, type SeatTier } from "./subscriptions-data";
import { useToast } from "@/hooks/use-toast";

interface Props { role?: string }

const TIER_ORDER: SeatTier[] = ["lite", "standard", "premium"];

export default function TeamSubscription({ role: _role = "admin" }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const activeSub = useMemo(() => MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.status === "active") ?? null, []);
  const [seats, setSeats] = useState<Seat[]>(activeSub ? [...activeSub.seats] : []);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [assignSearch, setAssignSearch] = useState<string>("");
  const [assignBatchMode, setAssignBatchMode] = useState(false);
  const [assignBatchMemberIds, setAssignBatchMemberIds] = useState<Set<string>>(new Set());
  const [usageDrawerOpen, setUsageDrawerOpen] = useState(false);
  const [usageDateFrom, setUsageDateFrom] = useState("");
  const [usageDateTo, setUsageDateTo] = useState("");
  const [usageKeyword, setUsageKeyword] = useState("");
  const [autoRenew, setAutoRenew] = useState<boolean>(!!activeSub?.autoRenew);
  const [showCancelAutoRenew, setShowCancelAutoRenew] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [recycleDialogOpen, setRecycleDialogOpen] = useState(false);
  const [recycleSeatIds, setRecycleSeatIds] = useState<string[]>([]);
  const [tierFilter, setTierFilter] = useState<SeatTier | "all">("all");

  if (!activeSub) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 企业订阅</h1>
          <p className="text-muted-foreground mt-1 text-sm">管理当前生效的席位制订阅。</p>
        </div>
        <div className="border border-border rounded-lg p-12 text-center text-muted-foreground">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">当前没有生效的订阅</p>
          <p className="text-xs mt-1">前往 token plan 购买席位制订阅后即可在此管理。</p>
        </div>
      </div>
    );
  }

  const boundMemberIds = new Set(seats.filter((s) => s.memberId).map((s) => s.memberId));
  const availableMembers = MOCK_ENTERPRISE_MEMBERS.filter((m) => !boundMemberIds.has(m.id));
  const usedSeatsCount = seats.filter((s) => s.status === "assigned").length;

  const tierStats = TIER_ORDER.map((tier) => {
    const tierSeats = seats.filter((s) => s.tier === tier);
    return {
      tier,
      label: seatTierLabel[tier],
      total: tierSeats.length,
      unassigned: tierSeats.filter((s) => s.status === "idle").length,
    };
  });

  // ── 按席位规格筛选 ──
  const filteredSeats = useMemo(
    () => (tierFilter === "all" ? seats : seats.filter((s) => s.tier === tierFilter)),
    [seats, tierFilter]
  );

  // ── 选择操作 ──
  const allSelected = filteredSeats.length > 0 && filteredSeats.every((s) => selectedSeatIds.has(s.id));
  const someSelected = selectedSeatIds.size > 0;
  // 选中席位的档位集合
  const selectedTiers = new Set(
    seats.filter((s) => selectedSeatIds.has(s.id)).map((s) => s.tier)
  );
  // 可批量升级：有选中、档位统一、且非全为 premium
  const canBatchUpgrade = someSelected && selectedTiers.size === 1 && !selectedTiers.has("premium");
  const toggleSelectAll = () => {
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        filteredSeats.forEach((s) => next.delete(s.id));
      } else {
        filteredSeats.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };
  const toggleSelectOne = (seatId: string) => {
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  };

  // ── 分配 ──
  const openAssignDialog = (seatId: string) => {
    setSelectedSeatId(seatId);
    setSelectedMemberId("");
    setAssignSearch("");
    setAssignBatchMode(false);
    setAssignBatchMemberIds(new Set());
    setAssignDialogOpen(true);
  };
  const openAssignBatch = () => {
    if (!someSelected) return;
    const idleSelected = seats.filter((s) => selectedSeatIds.has(s.id) && s.status === "idle");
    if (idleSelected.length === 0) {
      toast({ title: "无可分配的席位", description: "所选席位均已分配成员。" });
      return;
    }
    setSelectedSeatId(null);
    setSelectedMemberId("");
    setAssignSearch("");
    setAssignBatchMode(true);
    setAssignBatchMemberIds(new Set());
    setAssignDialogOpen(true);
  };
  const toggleBatchMember = (memberId: string) => {
    setAssignBatchMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };
  const confirmAssign = () => {
    if (assignBatchMode) {
      const memberIds = Array.from(assignBatchMemberIds);
      if (memberIds.length === 0) return;
      const idleSeats = seats.filter((s) => selectedSeatIds.has(s.id) && s.status === "idle");
      const assignCount = Math.min(memberIds.length, idleSeats.length);
      const members = memberIds
        .map((id) => MOCK_ENTERPRISE_MEMBERS.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => !!m)
        .slice(0, assignCount);
      const seatUpdates = new Map<string, { memberId: string; memberName: string; memberAccount: string }>();
      idleSeats.slice(0, assignCount).forEach((seat, i) => {
        seatUpdates.set(seat.id, { memberId: members[i].id, memberName: members[i].name, memberAccount: members[i].username });
      });
      setSeats((prev) => prev.map((s) => {
        const u = seatUpdates.get(s.id);
        return u ? { ...s, memberId: u.memberId, memberName: u.memberName, memberAccount: u.memberAccount, status: "assigned" } : s;
      }));
      const target = MOCK_SEAT_SUBSCRIPTIONS.find((sub) => sub.id === activeSub.id);
      if (target) {
        target.seats = target.seats.map((s) => {
          const u = seatUpdates.get(s.id);
          return u ? { ...s, memberId: u.memberId, memberName: u.memberName, memberAccount: u.memberAccount, status: "assigned" } : s;
        });
        target.usedSeats = target.seats.filter((s) => s.status === "assigned").length;
      }
      setAssignDialogOpen(false);
      setSelectedSeatIds(new Set());
      setAssignBatchMemberIds(new Set());
      toast({ title: "批量分配成功", description: `已为 ${assignCount} 个席位分配成员。` });
    } else {
      if (!selectedSeatId || !selectedMemberId) return;
      const member = MOCK_ENTERPRISE_MEMBERS.find((m) => m.id === selectedMemberId);
      if (!member) return;
      setSeats((prev) => prev.map((s) => s.id === selectedSeatId ? { ...s, memberId: member.id, memberName: member.name, memberAccount: member.username, status: "assigned" } : s));
      const target = MOCK_SEAT_SUBSCRIPTIONS.find((sub) => sub.id === activeSub.id);
      if (target) {
        const i = target.seats.findIndex((s) => s.id === selectedSeatId);
        if (i >= 0) {
          target.seats[i] = { ...target.seats[i], memberId: member.id, memberName: member.name, memberAccount: member.username, status: "assigned" };
          target.usedSeats = target.seats.filter((s) => s.status === "assigned").length;
        }
      }
      setAssignDialogOpen(false);
      setSelectedSeatId(null);
      setSelectedMemberId("");
      toast({ title: "席位已分配", description: `席位已分配给 ${member.name}` });
    }
  };

  // ── 升级（单个 / 批量）──
  const handleUpgradeSingle = (seatId: string) => {
    navigate(`/workspace/upgrade-order?seatIds=${seatId}`);
  };
  const handleUpgradeBatch = () => {
    if (!someSelected) return;
    const ids = Array.from(selectedSeatIds).join(",");
    navigate(`/workspace/upgrade-order?seatIds=${ids}`);
  };

  // ── 回收（单个 / 批量）──
  const openRecycleSingle = (seatId: string) => {
    setRecycleSeatIds([seatId]);
    setRecycleDialogOpen(true);
  };
  const openRecycleBatch = () => {
    if (!someSelected) return;
    setRecycleSeatIds(Array.from(selectedSeatIds));
    setRecycleDialogOpen(true);
  };
  const confirmRecycle = () => {
    const idSet = new Set(recycleSeatIds);
    setSeats((prev) => prev.map((s) => idSet.has(s.id) ? { ...s, memberId: null, memberName: null, memberAccount: null, status: "idle", usedQuota: 0 } : s));
    const target = MOCK_SEAT_SUBSCRIPTIONS.find((sub) => sub.id === activeSub.id);
    if (target) {
      target.seats = target.seats.map((s) => idSet.has(s.id) ? { ...s, memberId: null, memberName: null, memberAccount: null, status: "idle", usedQuota: 0 } : s);
      target.usedSeats = target.seats.filter((s) => s.status === "assigned").length;
    }
    setSelectedSeatIds(new Set());
    setRecycleDialogOpen(false);
    setRecycleSeatIds([]);
    toast({ title: "席位已回收", description: `已回收 ${idSet.size} 个席位。` });
  };

  // ── 自动续费 ──
  const handleAutoRenewToggle = (checked: boolean) => {
    if (checked) {
      setAutoRenew(true);
      const t = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === activeSub.id);
      if (t) t.autoRenew = true;
      toast({ title: "已开启自动续费", description: "到期时将自动从充值余额扣款续费。" });
    } else {
      setShowCancelAutoRenew(true);
    }
  };
  const confirmCancelAutoRenew = () => {
    setAutoRenew(false);
    const t = MOCK_SEAT_SUBSCRIPTIONS.find((s) => s.id === activeSub.id);
    if (t) t.autoRenew = false;
    setShowCancelAutoRenew(false);
    toast({ title: "已关闭自动续费", description: "当前套餐将在到期后失效。" });
  };

  const totalUsedQuota = seats.reduce((sum, s) => sum + s.usedQuota, 0);
  const totalQuota = activeSub.seatCount * activeSub.planDetail.totalQuota;
  const totalUsedPercent = totalQuota > 0 ? Math.round((totalUsedQuota / totalQuota) * 100) : 0;
  const deductions = activeSub.deductionRecords ?? [];

  // ── 抵扣明细筛选 ──
  const filteredDeductions = useMemo(() => {
    const kw = usageKeyword.trim().toLowerCase();
    return deductions.filter((d) => {
      const dDate = d.time.slice(0, 10);
      if (usageDateFrom && dDate < usageDateFrom) return false;
      if (usageDateTo && dDate > usageDateTo) return false;
      if (kw && !d.seatId.toLowerCase().includes(kw) && !d.modelName.toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [deductions, usageDateFrom, usageDateTo, usageKeyword]);

  const resetUsageFilters = () => {
    setUsageDateFrom("");
    setUsageDateTo("");
    setUsageKeyword("");
  };

  const handleExportUsage = () => {
    const records = activeSub.deductionRecords ?? [];
    const map = new Map<string, { time: string; seatId: string; seatMemberName: string; modelName: string; inputTokens: number; outputTokens: number; totalCredits: number }>();
    records.forEach((d) => {
      const key = `${d.seatId}_${d.modelId}`;
      const cur = map.get(key) ?? { time: d.time, seatId: d.seatId, seatMemberName: d.seatMemberName, modelName: d.modelName, inputTokens: 0, outputTokens: 0, totalCredits: 0 };
      if (d.time > cur.time) cur.time = d.time;
      if (d.billingItem.includes("输入")) cur.inputTokens += d.usage;
      else if (d.billingItem.includes("输出")) cur.outputTokens += d.usage;
      else if (d.billingItem.includes("图片")) cur.inputTokens += d.usage;
      cur.totalCredits += d.deductedCredits;
      map.set(key, cur);
    });
    const grouped = Array.from(map.values()).sort((a, b) => b.totalCredits - a.totalCredits);
    const header = "时间,席位ID,成员,模型,抵扣项,消耗积分\n";
    const rows = grouped
      .map((g) => `${g.time},${g.seatId},${g.seatMemberName},${g.modelName},输入${g.inputTokens}tokens/输出${g.outputTokens}tokens,${g.totalCredits}`)
      .join("\n");
    const csv = "\uFEFF" + header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `用量明细_${activeSub.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "导出成功", description: "用量明细已导出为 CSV 文件" });
  };

  return (
    <div className="w-full space-y-6">
      {/* 页头 + 操作按钮 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">资源与订阅 / 企业订阅</h1>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${subStatusClass[activeSub.status]}`}>
            {subStatusLabel[activeSub.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/workspace/addon-order")}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />加购席位
          </Button>
          <Button size="sm" className="h-8 text-xs text-white" style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }} onClick={() => navigate("/workspace/renew-order")}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />续费
          </Button>
        </div>
      </div>

      {/* 订阅概览 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-purple-500" />
          <h2 className="text-base font-semibold text-foreground">订阅概览</h2>
        </div>

        {/* 基本信息行：左侧权益ID+过期时间，右侧自动续费开关 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">权益ID：</span>
              <span className="font-mono text-xs text-foreground">{activeSub.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">过期时间：</span>
              <span className="font-mono text-xs text-foreground">{formatDateTime(activeSub.currentPeriodEnd)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">自动续费</span>
            <Switch checked={autoRenew} onCheckedChange={handleAutoRenewToggle} aria-label="自动续费开关" />
          </div>
        </div>

        {/* 席位档位看板 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between gap-2">
            <span className="text-xl font-bold text-foreground">总席位</span>
            <span className="text-2xl font-bold text-foreground">{activeSub.seatCount}</span>
            <span className="text-xs text-muted-foreground">已分配 {usedSeatsCount}</span>
          </div>
          {tierStats.map((t) => (
            <div key={t.tier} className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-between gap-2">
              <span className="text-xl font-bold text-foreground">{t.label}</span>
              <span className="text-2xl font-bold text-foreground">{t.unassigned}<span className="text-sm font-normal text-muted-foreground">/{t.total}</span></span>
              <span className="text-xs text-muted-foreground">未分配 / 总数</span>
            </div>
          ))}
        </div>

        {/* 用量百分比 + 查看调用明细 */}
        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">整体额度使用</span>
              <span className="text-sm text-muted-foreground">{formatCredit(totalUsedQuota)} / {formatCredit(totalQuota)} credit</span>
              <span className="text-xs font-semibold text-primary">{totalUsedPercent}%</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setUsageDrawerOpen(true)}>
              查看调用明细
            </Button>
          </div>
          <Progress value={totalUsedPercent} className="h-2" />
        </div>
      </section>

      {/* 席位管理 */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-500" />
          <h2 className="text-base font-semibold text-foreground">席位管理</h2>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[260px] text-xs leading-relaxed">
                一个席位绑定一个企业成员，成员在「我的订阅」中生成专属 API Key，调用消耗该席位额度。
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as SeatTier | "all")}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="席位规格" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部规格</SelectItem>
                {TIER_ORDER.map((t) => <SelectItem key={t} value={t}>{seatTierLabel[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {someSelected && <span className="text-xs text-muted-foreground">已选 {selectedSeatIds.size} 席</span>}
            <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700" disabled={!someSelected} onClick={openAssignBatch}>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />分配
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 hover:text-red-600" disabled={!someSelected} onClick={openRecycleBatch}>
              <UserMinus className="w-3.5 h-3.5 mr-1.5" />回收
            </Button>
            {selectedTiers.size > 1 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-not-allowed">
                      <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                        <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />升级
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>仅支持同一档位批量操作</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={!canBatchUpgrade} onClick={handleUpgradeBatch}>
                <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />升级
              </Button>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[40px] pr-0">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="全选" />
                </TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">席位规格</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">席位ID</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">额度</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">余量</TableHead>
                <TableHead className="text-muted-foreground whitespace-nowrap">分配成员</TableHead>
                <TableHead className="text-muted-foreground text-right w-[220px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeats.map((seat) => {
                const remaining = seat.periodQuota - seat.usedQuota;
                const remainPercent = seat.periodQuota > 0 ? Math.round((remaining / seat.periodQuota) * 100) : 0;
                const isChecked = selectedSeatIds.has(seat.id);
                return (
                  <TableRow key={seat.id} className={isChecked ? "bg-muted/40" : "hover:bg-muted/30"}>
                    <TableCell className="pr-0">
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleSelectOne(seat.id)} aria-label={`选择 ${seat.id}`} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap"><Badge variant="outline" className="font-normal text-xs">{seatTierLabel[seat.tier]}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{seat.id}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatCredit(seat.periodQuota)} <span className="text-xs text-muted-foreground">credits</span></TableCell>
                    <TableCell className="text-sm whitespace-nowrap font-medium text-primary">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{remainPercent}%</span>
                        <Progress value={remainPercent} className="h-1 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {seat.memberName ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{seat.memberName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{seat.memberAccount ?? seat.memberId ?? "—"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {seat.status === "idle" ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700" onClick={() => openAssignDialog(seat.id)} disabled={availableMembers.length === 0}>
                            <UserPlus className="w-3.5 h-3.5 mr-0.5" />分配
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={() => openRecycleSingle(seat.id)}>
                            <UserMinus className="w-3.5 h-3.5 mr-0.5" />回收
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700" disabled={seat.tier === "premium"} onClick={() => handleUpgradeSingle(seat.id)}>
                          <ArrowUpCircle className="w-3.5 h-3.5 mr-0.5" />升级
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredSeats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">当前筛选条件下无席位</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 抵扣明细弹窗 */}
      <Dialog open={usageDrawerOpen} onOpenChange={setUsageDrawerOpen}>
        <DialogContent className="sm:max-w-5xl p-0 flex flex-col max-h-[85vh]">
          <DialogHeader className="flex-row items-center justify-between border-b border-border p-4 space-y-0">
            <DialogTitle className="text-base">抵扣明细</DialogTitle>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportUsage}>
              <Download className="w-3.5 h-3.5 mr-1.5" />导出
            </Button>
          </DialogHeader>
          {/* 筛选栏 */}
          <div className="flex items-center gap-2 flex-wrap border-b border-border px-4 py-2.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input type="date" value={usageDateFrom} onChange={(e) => setUsageDateFrom(e.target.value)} className="h-8 w-[150px] text-xs" />
            <span className="text-xs text-muted-foreground">—</span>
            <Input type="date" value={usageDateTo} onChange={(e) => setUsageDateTo(e.target.value)} className="h-8 w-[150px] text-xs" />
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
              <Input placeholder="搜索席位ID / 模型" value={usageKeyword} onChange={(e) => setUsageKeyword(e.target.value)} className="h-8 w-[180px] text-xs pl-7" />
            </div>
            {(usageDateFrom || usageDateTo || usageKeyword) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={resetUsageFilters}>重置</Button>
            )}
          </div>
          <div className="flex-1 overflow-auto px-4 py-3">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground whitespace-nowrap">时间</TableHead>
                  <TableHead className="text-muted-foreground whitespace-nowrap">席位ID</TableHead>
                  <TableHead className="text-muted-foreground whitespace-nowrap">成员</TableHead>
                  <TableHead className="text-muted-foreground">模型</TableHead>
                  <TableHead className="text-muted-foreground">抵扣项</TableHead>
                  <TableHead className="text-muted-foreground text-right">消耗积分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (filteredDeductions.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                          {deductions.length === 0 ? "暂无抵扣明细" : "当前筛选条件下无记录"}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const map = new Map<string, { time: string; seatId: string; seatMemberName: string; modelName: string; inputTokens: number; outputTokens: number; totalCredits: number }>();
                  filteredDeductions.forEach((d) => {
                    const key = `${d.seatId}_${d.modelId}`;
                    const cur = map.get(key) ?? { time: d.time, seatId: d.seatId, seatMemberName: d.seatMemberName, modelName: d.modelName, inputTokens: 0, outputTokens: 0, totalCredits: 0 };
                    if (d.time > cur.time) cur.time = d.time;
                    if (d.billingItem.includes("输入")) cur.inputTokens += d.usage;
                    else if (d.billingItem.includes("输出")) cur.outputTokens += d.usage;
                    else if (d.billingItem.includes("图片")) cur.inputTokens += d.usage;
                    cur.totalCredits += d.deductedCredits;
                    map.set(key, cur);
                  });
                  const grouped = Array.from(map.values()).sort((a, b) => b.totalCredits - a.totalCredits);
                  return grouped.map((g) => (
                    <TableRow key={`${g.seatId}_${g.modelName}`} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">{formatDateTime(g.time)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{g.seatId}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{g.seatMemberName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap"><Badge variant="outline" className="font-normal text-xs">{g.modelName}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {g.inputTokens > 0 && <div>输入：{g.inputTokens.toLocaleString()}tokens</div>}
                        {g.outputTokens > 0 && <div>输出：{g.outputTokens.toLocaleString()}tokens</div>}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium text-orange-600 whitespace-nowrap font-mono">-{formatCredit(g.totalCredits)}</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 分配席位弹窗 */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{assignBatchMode ? "批量分配席位" : "分配席位"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {!assignBatchMode && selectedSeatId && (
              <div className="text-sm text-muted-foreground">席位编号：<span className="font-mono text-foreground">{selectedSeatId}</span></div>
            )}
            {assignBatchMode && (
              <div className="text-sm text-muted-foreground">已选 {seats.filter((s) => selectedSeatIds.has(s.id) && s.status === "idle").length} 个空闲席位，选择成员后批量分配。</div>
            )}
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 border-b text-sm text-muted-foreground">
                从企业全员中选择
              </div>
              <div className="p-2 border-b">
                <Input
                  placeholder="搜索姓名或部门"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="overflow-y-auto h-64">
                {availableMembers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">暂无可用成员</div>
                ) : (
                  availableMembers
                    .filter((m) =>
                      !assignSearch ||
                      m.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                      m.department.toLowerCase().includes(assignSearch.toLowerCase())
                    )
                    .map((m) => {
                      const isSelected = assignBatchMode ? assignBatchMemberIds.has(m.id) : selectedMemberId === m.id;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                          onClick={() => assignBatchMode ? toggleBatchMember(m.id) : setSelectedMemberId(isSelected ? "" : m.id)}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="text-sm flex-1">{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.department}</span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>取消</Button>
            <Button onClick={confirmAssign} disabled={assignBatchMode ? assignBatchMemberIds.size === 0 : !selectedMemberId}>
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 回收席位确认 */}
      <AlertDialog open={recycleDialogOpen} onOpenChange={setRecycleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定回收该席位吗？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              回收后，席位的使用者将无法继续使用相关服务。选中的 {recycleSeatIds.length} 个席位将重置为空闲状态，确定要回收吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRecycleDialogOpen(false); setRecycleSeatIds([]); }}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRecycle} className="bg-red-500 hover:bg-red-600">确认回收</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 关闭自动续费确认 */}
      <AlertDialog open={showCancelAutoRenew} onOpenChange={setShowCancelAutoRenew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>关闭自动续费</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">关闭后，当前套餐将在到期后失效。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelAutoRenew(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelAutoRenew}>确认关闭</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
