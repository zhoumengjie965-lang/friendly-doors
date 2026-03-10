import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, AlertTriangle, Activity, Coins, TrendingDown, Info, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EnterpriseRow {
  id: string;
  name: string;
  totalConsumed: number;
  requestCount: number;
  // mock fields
  successRate: number;
  topFailReason: string;
}

const MOCK_FAIL_REASONS = ["超时", "认证失败", "频率限制", "模型不可用", "参数错误"];
const INTERNAL_KEYWORDS = ["内部", "测试", "demo", "test", "internal"];

function isInternal(name: string) {
  return INTERNAL_KEYWORDS.some((k) => name.toLowerCase().includes(k));
}

function mockSuccessRate(id: string): number {
  // deterministic pseudo-random based on id chars
  const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  const rates = [99.2, 97.8, 94.1, 98.5, 92.3, 99.7, 96.0, 88.5];
  return rates[seed % rates.length];
}

function mockFailReason(id: string): string {
  const seed = id.charCodeAt(2) || 0;
  return MOCK_FAIL_REASONS[seed % MOCK_FAIL_REASONS.length];
}

export default function AdminResourceStats() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EnterpriseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: enterprises }, { data: balances }] = await Promise.all([
        supabase.from("enterprises").select("id,name"),
        supabase.from("enterprise_balances").select("enterprise_id,total_consumed,request_count"),
      ]);

      const balanceMap = new Map(
        (balances ?? []).map((b) => [b.enterprise_id, b])
      );

      const merged: EnterpriseRow[] = (enterprises ?? []).map((e) => {
        const bal = balanceMap.get(e.id);
        return {
          id: e.id,
          name: e.name,
          totalConsumed: bal?.total_consumed ?? 0,
          requestCount: bal?.request_count ?? 0,
          successRate: mockSuccessRate(e.id),
          topFailReason: mockFailReason(e.id),
        };
      });

      setRows(merged);
      setLoading(false);
    }
    load();
  }, []);

  const totalRequests = rows.reduce((s, r) => s + r.requestCount, 0);
  const totalConsumed = rows.reduce((s, r) => s + r.totalConsumed, 0);

  const summaryCards = [
    {
      label: "今日总请求数",
      value: loading ? "—" : totalRequests.toLocaleString(),
      sub: "来自所有企业的汇总请求量",
      icon: Activity,
      real: true,
    },
    {
      label: "今日总 Tokens",
      value: "—",
      sub: "待接入 Token 计量字段",
      icon: FlaskConical,
      real: false,
    },
    {
      label: "今日总金额",
      value: loading ? "—" : `¥${totalConsumed.toFixed(2)}`,
      sub: "全平台累计消耗预算",
      icon: Coins,
      real: true,
    },
    {
      label: "全局失败率",
      value: "2.3%",
      sub: "模拟数据，待接入",
      icon: TrendingDown,
      real: false,
    },
  ];

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">资源统计</h1>
          <p className="text-sm text-muted-foreground mt-0.5">平台级资源使用概览</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <div className="flex items-center gap-1">
                    {!c.real && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">模拟数据，待接入真实字段</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Tenant monitoring table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-medium text-foreground">租户业务监控</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                点击企业名称可穿透至该企业令牌管理页
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
              <Info className="h-3 w-3" />
              <span>带 <span className="text-amber-500">⚠</span> 的字段为模拟数据</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>企业名称</TableHead>
                <TableHead>今日金额</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    今日 Tokens
                    <span className="text-muted-foreground/60 font-normal">⚠</span>
                  </span>
                </TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    请求成功率
                    <span className="text-muted-foreground/60 font-normal">⚠</span>
                  </span>
                </TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    Top 1 失败原因
                    <span className="text-muted-foreground/60 font-normal">⚠</span>
                  </span>
                </TableHead>
                <TableHead>空间标识</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    加载中...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    暂无企业数据
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const isLowRate = row.successRate < 95;
                const isZeroAmount = row.totalConsumed === 0;
                const rowBg = isLowRate
                  ? "bg-destructive/5"
                  : isZeroAmount
                  ? "bg-amber-50/30 dark:bg-amber-900/10"
                  : "";

                return (
                  <TableRow key={row.id} className={rowBg}>
                    {/* 企业名称 — 蓝色链接 */}
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/tokens?enterprise_id=${row.id}`)}
                        className="text-primary hover:underline font-medium text-sm text-left"
                      >
                        {row.name}
                      </button>
                    </TableCell>

                    {/* 今日金额 */}
                    <TableCell>
                      {isZeroAmount ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium text-sm">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          ¥0.00
                        </span>
                      ) : (
                        <span className="text-sm text-foreground">
                          ¥{row.totalConsumed.toFixed(2)}
                        </span>
                      )}
                    </TableCell>

                    {/* 今日 Tokens — mock */}
                    <TableCell className="text-muted-foreground text-sm">—</TableCell>

                    {/* 请求成功率 — mock */}
                    <TableCell>
                      {isLowRate ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 text-destructive font-bold text-sm cursor-help">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {row.successRate.toFixed(1)}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">成功率低于 95%，请关注</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-sm text-foreground">{row.successRate.toFixed(1)}%</span>
                      )}
                    </TableCell>

                    {/* Top 1 失败原因 — mock */}
                    <TableCell className="text-muted-foreground text-sm">
                      {row.topFailReason}
                    </TableCell>

                    {/* 空间标识 */}
                    <TableCell>
                      {isInternal(row.name) ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/20 text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          内部自用
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
