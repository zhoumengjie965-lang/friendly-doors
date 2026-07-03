import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  Search,
  RotateCcw,
  TrendingUp,
  User,
  Building2,
  Wallet,
  Gift,
  ChevronRight,
  Crown,
  Layers,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

type AccountType = "personal" | "enterprise";
type AccountStatus = "正常" | "禁用" | "过期" | "欠费" | "冻结";

interface SearchResultItem {
  id: string;
  accountType: AccountType;
  // Personal
  displayName?: string; // 真实姓名/备注
  username?: string;
  phone?: string;
  email?: string;
  enterprise?: string;
  remark?: string;
  remarkType?: string; // 备注类型：正式用户/测试用户/内结用户等
  // Enterprise
  enterpriseName?: string;
  enterpriseId?: string;
  adminName?: string;
  memberCount?: number;
  status?: AccountStatus;
}

interface AccountInfo {
  accountType: AccountType;
  accountId: string;
  displayName: string; // 主显示名
  username?: string; // 辅助
  phone?: string;
  email?: string;
  enterprise?: string; // 归属企业（个人）/ 管理员（企业）
  enterpriseId?: string;
  adminName?: string;
  memberCount?: number;
  remarkType?: string; // 备注类型：正式用户/测试用户/内结用户等
  groupName: string;
  status: AccountStatus;
  balance: number;
  voucherBalance?: number; // 代金券余额
  totalSpent: number;
  // 关联关系
  relatedAccountId?: string;
  relatedAccountName?: string;
  relatedAccountType?: AccountType;
}

interface ModelUsageRecord {
  date: string;
  [model: string]: number | string;
}

interface DailySpendRecord {
  date: string;
  amount: number;
  requestCount: number;
  tokenCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatToken(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
}

function formatMoney(val: number): string {
  return `¥${val.toFixed(2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("zh-CN");
}

function getLastNDaysDates(n: number): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

function formatDateShort(d: string): string {
  const parts = d.split("-");
  return `${parts[1]}/${parts[2]}`;
}

function formatDateLong(d: string): string {
  return d;
}

// 备注类型标签样式（实心饱和色，显眼）
function getRemarkTypeBadgeClass(type?: string): string {
  const base = "text-[10px] px-1.5 py-0.5 font-medium shrink-0 border";
  switch (type) {
    case "正式用户":
      return `${base} bg-green-500 text-white border-green-600`;
    case "测试用户":
    case "测试用户（付费）":
      return `${base} bg-amber-500 text-white border-amber-600`;
    case "内结用户":
      return `${base} bg-violet-500 text-white border-violet-600`;
    case "研发":
      return `${base} bg-blue-500 text-white border-blue-600`;
    case "演示":
      return `${base} bg-pink-500 text-white border-pink-600`;
    default:
      return `${base} bg-gray-500 text-white border-gray-600`;
  }
}

// ─── Mock Data ──────────────────────────────────────────────────────────

const MOCK_SEARCH_RESULTS: SearchResultItem[] = [
  // 个人账户
  { id: "user_001", accountType: "personal", displayName: "张三", username: "zhang_san", phone: "138****1234", email: "zhangsan@example.com", enterprise: "科技有限公司A", remark: "VIP客户", remarkType: "正式用户" },
  { id: "user_002", accountType: "personal", displayName: "李四", username: "li_si_002", phone: "139****5678", email: "lisi@example.com", enterprise: "科技有限公司B", remarkType: "正式用户" },
  { id: "user_003", accountType: "personal", displayName: "王五", username: "wang_wu", phone: "137****9012", enterprise: "科技有限公司A", remark: "测试账号", remarkType: "测试用户" },
  { id: "user_004", accountType: "personal", displayName: "赵六", username: "zhao_liu", phone: "136****3456", email: "zhaoliu@test.com", enterprise: "数据科技B", remarkType: "测试用户" },
  { id: "user_005", accountType: "personal", displayName: "孙七", username: "sun_qi", phone: "135****7890", enterprise: "智能科技C", remarkType: "内结用户" },
  // 企业账户
  { id: "ent_001", accountType: "enterprise", enterpriseName: "科技有限公司A", enterpriseId: "ent_001", adminName: "张三", memberCount: 28, status: "正常", remarkType: "正式用户" },
  { id: "ent_002", accountType: "enterprise", enterpriseName: "科技有限公司B", enterpriseId: "ent_002", adminName: "李四", memberCount: 15, status: "正常", remarkType: "正式用户" },
  { id: "ent_003", accountType: "enterprise", enterpriseName: "数据科技B", enterpriseId: "ent_003", adminName: "赵六", memberCount: 8, status: "正常", remarkType: "测试用户" },
  { id: "ent_004", accountType: "enterprise", enterpriseName: "智能科技C", enterpriseId: "ent_004", adminName: "钱八", memberCount: 52, status: "欠费", remarkType: "内结用户" },
];

const MOCK_ACCOUNTS: Record<string, AccountInfo> = {
  user_001: {
    accountType: "personal", accountId: "user_001", displayName: "张三", username: "zhang_san",
    phone: "138****1234", email: "zhangsan@example.com", enterprise: "科技有限公司A", remarkType: "正式用户",
    groupName: "default", status: "正常", balance: 9850.60, voucherBalance: 3000.00, totalSpent: 45680.30,
    relatedAccountId: "ent_001", relatedAccountName: "科技有限公司A", relatedAccountType: "enterprise",
  },
  user_002: {
    accountType: "personal", accountId: "user_002", displayName: "李四", username: "li_si_002",
    phone: "139****5678", email: "lisi@example.com", enterprise: "科技有限公司B", remarkType: "正式用户",
    groupName: "vip", status: "正常", balance: 4000.15, voucherBalance: 1230.00, totalSpent: 12890.55,
    relatedAccountId: "ent_002", relatedAccountName: "科技有限公司B", relatedAccountType: "enterprise",
  },
  user_003: {
    accountType: "personal", accountId: "user_003", displayName: "王五", username: "wang_wu",
    phone: "137****9012", enterprise: "科技有限公司A", remarkType: "测试用户",
    groupName: "default", status: "禁用", balance: 0, voucherBalance: 0, totalSpent: 3200.00,
    relatedAccountId: "ent_001", relatedAccountName: "科技有限公司A", relatedAccountType: "enterprise",
  },
  user_004: {
    accountType: "personal", accountId: "user_004", displayName: "赵六", username: "zhao_liu",
    phone: "136****3456", email: "zhaoliu@test.com", enterprise: "数据科技B", remarkType: "测试用户",
    groupName: "default", status: "正常", balance: 500.20, voucherBalance: 390.00, totalSpent: 5600.00,
    relatedAccountId: "ent_003", relatedAccountName: "数据科技B", relatedAccountType: "enterprise",
  },
  user_005: {
    accountType: "personal", accountId: "user_005", displayName: "孙七", username: "sun_qi",
    phone: "135****7890", enterprise: "智能科技C", remarkType: "内结用户",
    groupName: "default", status: "过期", balance: 0, voucherBalance: 800.00, totalSpent: 1200.00,
  },
  ent_001: {
    accountType: "enterprise", accountId: "ent_001", displayName: "科技有限公司A",
    enterpriseId: "ent_001", adminName: "张三", memberCount: 28, remarkType: "正式用户",
    groupName: "vip", status: "正常", balance: 128000.50, voucherBalance: 28800.00, totalSpent: 523600.80,
  },
  ent_002: {
    accountType: "enterprise", accountId: "ent_002", displayName: "科技有限公司B",
    enterpriseId: "ent_002", adminName: "李四", memberCount: 15, remarkType: "正式用户",
    groupName: "default", status: "正常", balance: 28000.00, voucherBalance: 4500.00, totalSpent: 89600.20,
  },
  ent_003: {
    accountType: "enterprise", accountId: "ent_003", displayName: "数据科技B",
    enterpriseId: "ent_003", adminName: "赵六", memberCount: 8, remarkType: "测试用户",
    groupName: "default", status: "正常", balance: 6000.00, voucherBalance: 2900.00, totalSpent: 23400.00,
  },
  ent_004: {
    accountType: "enterprise", accountId: "ent_004", displayName: "智能科技C",
    enterpriseId: "ent_004", adminName: "钱八", memberCount: 52, remarkType: "内结用户",
    groupName: "default", status: "欠费", balance: -1200.00, voucherBalance: 0, totalSpent: 156000.00,
  },
};

// Mock chart data generators
const MODEL_LIST = ["gpt-4o", "gpt-4o-mini", "claude-3.5-sonnet", "gemini-2.0-flash", "deepseek-chat", "kimi-k2.5-code", "glm-4"];

function genMockUsageData(accountId: string, startDate: string, endDate: string): ModelUsageRecord[] {
  if (!MOCK_ACCOUNTS[accountId]) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const records: ModelUsageRecord[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const rec: ModelUsageRecord = { date: formatDateShort(key) };
    MODEL_LIST.forEach((m) => {
      rec[m] = Math.floor(Math.random() * 8000 + 500);
    });
    records.push(rec);
  }
  return records;
}

function genMockSpendData(accountId: string, startDate: string, endDate: string): DailySpendRecord[] {
  if (!MOCK_ACCOUNTS[accountId]) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const records: DailySpendRecord[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const amount = Math.round((Math.random() * 2000 + 100) * 100) / 100;
    const requestCount = Math.floor(Math.random() * 80000 + 5000);
    const tokenCount = Math.floor(Math.random() * 60000 + 5000);
    records.push({ date: formatDateShort(key), amount, requestCount, tokenCount });
  }
  return records;
}

function genMockCallCountData(accountId: string, startDate: string, endDate: string): ModelUsageRecord[] {
  if (!MOCK_ACCOUNTS[accountId]) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const records: ModelUsageRecord[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const rec: ModelUsageRecord = { date: formatDateShort(key) };
    MODEL_LIST.forEach((m) => {
      rec[m] = Math.floor(Math.random() * 3000 + 100);
    });
    records.push(rec);
  }
  return records;
}

const MODEL_COLOR_LIST = [
  "#10b981", "#34d399", "#8b5cf6", "#3b82f6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#a855f7", "#f97316", "#94a3b8",
];

// ─── Custom Tooltips ─────────────────────────────────────────────────────

function UsageTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  const modelItems = sorted.filter((p) => p.dataKey !== "Others");
  const othersItem = sorted.find((p) => p.dataKey === "Others");
  const total = sorted.reduce((sum, p) => sum + p.value, 0);
  const displayItems = modelItems.slice(0, 10);

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <p className="text-sm font-medium text-primary mb-1">Total：{formatToken(total)}</p>
      <div className="space-y-0.5">
        {displayItems.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.dataKey}</span>
            </span>
            <span className="font-medium tabular-nums text-foreground">{formatToken(item.value)}</span>
          </div>
        ))}
        {othersItem && (
          <div className="flex items-center justify-between gap-2 text-xs pt-0.5 border-t mt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: othersItem.color }} />
              <span className="text-muted-foreground font-medium">Others</span>
            </span>
            <span className="font-medium tabular-nums text-foreground">{formatToken(othersItem.value)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────

export default function AdminConsumptionTrends() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const [usageData, setUsageData] = useState<ModelUsageRecord[]>([]);
  const [callCountData, setCallCountData] = useState<ModelUsageRecord[]>([]);
  const [spendData, setSpendData] = useState<DailySpendRecord[]>([]);
  const [hasData, setHasData] = useState(true);
  const [chartMode, setChartMode] = useState<"usage" | "calls">("usage");

  // 当前图表展示的数据（根据 mode 切换）
  const currentChartData = chartMode === "usage" ? usageData : callCountData;
  const currentModelKeys = useMemo(() => {
    if (currentChartData.length === 0) return [];
    return Object.keys(currentChartData[0]).filter((k) => k !== "date");
  }, [currentChartData]);

  // Summary metrics
  const summary = useMemo(() => {
    const totalAmount = spendData.reduce((s, r) => s + r.amount, 0);
    const totalRequests = spendData.reduce((s, r) => s + r.requestCount, 0);
    const totalTokens = spendData.reduce((s, r) => s + r.tokenCount, 0);

    // Top model by token usage
    const modelTotals: Record<string, number> = {};
    usageData.forEach((rec) => {
      Object.keys(rec).forEach((k) => {
        if (k !== "date" && k !== "Others") {
          modelTotals[k] = (modelTotals[k] || 0) + ((rec[k] as number) || 0);
        }
      });
    });
    const sortedModels = Object.entries(modelTotals).sort((a, b) => b[1] - a[1]);
    const topTokenModel = sortedModels.length > 0 ? sortedModels[0][0] : "-";

    // Top model by call count
    const callTotals: Record<string, number> = {};
    callCountData.forEach((rec) => {
      Object.keys(rec).forEach((k) => {
        if (k !== "date" && k !== "Others") {
          callTotals[k] = (callTotals[k] || 0) + ((rec[k] as number) || 0);
        }
      });
    });
    const sortedCalls = Object.entries(callTotals).sort((a, b) => b[1] - a[1]);
    const topCallModel = sortedCalls.length > 0 ? sortedCalls[0][0] : "-";

    return { totalAmount, totalRequests, totalTokens, topTokenModel, topCallModel };
  }, [spendData, usageData, callCountData]);

  // ── Handlers ──
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const q = value.toLowerCase().trim();
    const filtered = MOCK_SEARCH_RESULTS.filter((r) => {
      if (r.accountType === "personal") {
        return (
          (r.displayName?.toLowerCase().includes(q)) ||
          (r.username?.toLowerCase().includes(q)) ||
          (r.remark?.toLowerCase().includes(q))
        );
      } else {
        return (
          (r.enterpriseName?.toLowerCase().includes(q)) ||
          (r.adminName?.toLowerCase().includes(q))
        );
      }
    });
    setSearchResults(filtered.slice(0, 10));
  };

  const handleSelectResult = (item: SearchResultItem) => {
    const account = MOCK_ACCOUNTS[item.id];
    if (!account) {
      setSelectedAccount(null);
      setHasData(false);
      return;
    }
    setSelectedAccount(account);
    setSearchText(item.accountType === "personal" ? item.displayName! : item.enterpriseName!);
    setSearchResults([]);
    doQuery(account.accountId);
  };

  const handleQuery = () => {
    if (!selectedAccount) return;
    doQuery(selectedAccount.accountId);
  };

  const doQuery = (accountId: string) => {
    setLoading(true);
    const today = new Date();
    const start = dateRange?.from ?? new Date(Date.now() - 6 * 86400000);
    const end = dateRange?.to ?? today;
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    setTimeout(() => {
      let uData = genMockUsageData(accountId, startStr, endStr);

      // 在设置 state 前聚合 Others：保留 Top 10 模型，其余合并为 Others
      const allKeys = new Set<string>();
      uData.forEach((rec) => {
        Object.keys(rec).forEach((k) => {
          if (k !== "date" && k !== "Others") allKeys.add(k);
        });
      });
      const totals: Record<string, number> = {};
      allKeys.forEach((k) => {
        totals[k] = uData.reduce((s, r) => s + ((r[k] as number) || 0), 0);
      });
      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      const remaining = sorted.slice(10).map(([k]) => k);

      if (remaining.length > 0) {
        uData = uData.map((rec) => {
          const othersVal = remaining.reduce((s, k) => s + ((rec[k] as number) || 0), 0);
          const newRec: ModelUsageRecord = { ...rec, Others: othersVal };
          // 删除已合并进 Others 的原始 key，保持图表干净
          remaining.forEach((k) => {
            delete (newRec as Record<string, unknown>)[k];
          });
          return newRec;
        });
      }

      const sData = genMockSpendData(accountId, startStr, endStr);

      // 生成并聚合调用次数数据（与 usageData 相同的 Others 聚合逻辑）
      let ccData = genMockCallCountData(accountId, startStr, endStr);
      if (remaining.length > 0) {
        ccData = ccData.map((rec) => {
          const othersVal = remaining.reduce((s, k) => s + ((rec[k] as number) || 0), 0);
          const newRec: ModelUsageRecord = { ...rec, Others: othersVal };
          remaining.forEach((k) => {
            delete (newRec as Record<string, unknown>)[k];
          });
          return newRec;
        });
      }

      setUsageData(uData);
      setCallCountData(ccData);
      setSpendData(sData);
      setHasData(uData.length > 0);
      setLoading(false);
    }, 400);
  };

  const handleReset = () => {
    setSelectedAccount(null);
    setSearchText("");
    setSearchResults([]);
    setDateRange(undefined);
    setUsageData([]);
    setCallCountData([]);
    setSpendData([]);
    setHasData(true);
    setChartMode("usage");
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">消费趋势</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          查看单个客户主体在指定时间范围内的调用量和消费金额趋势
        </p>
      </div>

      {/* 筛选区 */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-end gap-3 flex-wrap">
          {/* 客户主体搜索 */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索企业名称 / 用户名 / 显示名"
              className="pl-8 h-9"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-[320px] overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={`${item.accountType}-${item.id}`}
                    className="w-full px-3 py-2.5 text-left hover:bg-accent transition-colors text-sm border-b last:border-b-0"
                    onClick={() => handleSelectResult(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {item.accountType === "personal" ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              {item.remarkType && (
                                <Badge className={getRemarkTypeBadgeClass(item.remarkType)}>{item.remarkType}</Badge>
                              )}
                              <span className="font-medium text-foreground">{item.displayName}</span>
                              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 shrink-0">个人</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              用户名：{item.username}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              {item.remarkType && (
                                <Badge className={getRemarkTypeBadgeClass(item.remarkType)}>{item.remarkType}</Badge>
                              )}
                              <span className="font-medium text-foreground truncate">{item.enterpriseName}</span>
                              <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] px-1.5 py-0 shrink-0">企业</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              企业ID：{item.enterpriseId}｜企业拥有者：{item.adminName}
                            </p>
                          </>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 时间范围：单控件，点击弹出日历选起始和结束 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 justify-start text-left font-normal w-[220px]",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="w-4 h-4 mr-1.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {dateRange.from.toISOString().slice(0, 10)} ~{" "}
                      {dateRange.to.toISOString().slice(0, 10)}
                    </>
                  ) : (
                    dateRange.from.toISOString().slice(0, 10)
                  )
                ) : (
                  <span>选择时间范围</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleQuery} disabled={!selectedAccount} className="bg-blue-600 hover:bg-blue-700 h-9">
            查询
          </Button>
          <Button variant="outline" onClick={handleReset} className="h-9">
            <RotateCcw className="w-4 h-4 mr-1" />
            重置
          </Button>
        </div>
      </div>

      {/* 账户信息卡片 */}
      {selectedAccount && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            {selectedAccount.accountType === "personal" ? (
              <User className="w-5 h-5 text-blue-500" />
            ) : (
              <Building2 className="w-5 h-5 text-purple-500" />
            )}
            {selectedAccount.remarkType && (
              <Badge className={getRemarkTypeBadgeClass(selectedAccount.remarkType)}>
                {selectedAccount.remarkType}
              </Badge>
            )}
            {selectedAccount.displayName}
            {selectedAccount.accountType === "personal" ? (
              selectedAccount.username && (
                <span className="text-xs text-muted-foreground font-normal ml-0.5">@{selectedAccount.username}</span>
              )
            ) : (
              <>
                {selectedAccount.enterpriseId && (
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">{selectedAccount.enterpriseId}</span>
                )}
              </>
            )}
            <Badge variant="outline" className={
              selectedAccount.accountType === "personal"
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-purple-50 text-purple-600 border-purple-200"
            }>
              {selectedAccount.accountType === "personal" ? "个人" : "企业"}
            </Badge>
          </h2>

          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
            <InfoField icon={Wallet} label="充值余额" value={formatMoney(selectedAccount.balance)} highlight={selectedAccount.balance >= 0} />
            <InfoField icon={Gift} label="代金券余额" value={formatMoney(selectedAccount.voucherBalance ?? 0)} highlight />
            <InfoField icon={TrendingUp} label="累计消费金额" value={formatMoney(selectedAccount.totalSpent)} highlight />
          </div>
        </div>
      )}

      {/* 汇总指标 */}
      {selectedAccount && hasData && !loading && spendData.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard icon={TrendingUp} label="查询周期消费金额" value={formatMoney(summary.totalAmount)} color="text-primary" />
          <SummaryCardWithModel icon={Layers} label="查询周期 Token 用量" value={formatToken(summary.totalTokens)} modelLabel="Top 调用量模型" modelValue={summary.topTokenModel} color="text-green-600" />
          <SummaryCardWithModel icon={Crown} label="查询周期调用次数" value={formatNumber(summary.totalRequests)} modelLabel="Top 调用次数模型" modelValue={summary.topCallModel} color="text-purple-600" />
        </div>
      )}

      {/* 图表区域 */}
      {!selectedAccount ? (
        <EmptyState message="请先搜索并选择客户后查看消费分析" />
      ) : loading ? (
        <div className="bg-card border rounded-xl p-16 text-center">
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      ) : !hasData ? (
        <EmptyState message="当前时间范围内暂无消费数据" />
      ) : (
        <div className="space-y-5">
          {/* 图表一：每日消费金额 */}
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">每日消费金额</h3>
            {spendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spendData} margin={{ top: 24, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.ceil(spendData.length / 14) - 1)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => `¥${v}`} width={70} />
                  <Bar dataKey="amount" name="消费金额" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}>
                    <LabelList
                      dataKey="amount"
                      position="top"
                      formatter={(v: number) => formatMoney(v)}
                      style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="当前时间范围内暂无消费数据" compact />
            )}
          </div>

          {/* 图表二：调用量分布 / 调用次数分布 */}
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">{chartMode === "usage" ? "调用量分布" : "调用次数分布"}</h3>
              <div className="flex items-center rounded-lg bg-muted p-0.5">
                <button
                  onClick={() => setChartMode("usage")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    chartMode === "usage"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  调用量
                </button>
                <button
                  onClick={() => setChartMode("calls")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    chartMode === "calls"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  调用次数
                </button>
              </div>
            </div>
            {currentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={currentChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={Math.max(0, Math.ceil(currentChartData.length / 12) - 1)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={chartMode === "calls" ? formatNumber : formatToken} width={60} />
                  <Tooltip content={<UsageTooltipContent />} cursor={{ fill: "hsl(var(--muted))" }} />
                  {currentModelKeys.map((key, idx) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      stackId="usage"
                      fill={MODEL_COLOR_LIST[idx % MODEL_COLOR_LIST.length]}
                      radius={key === currentModelKeys[currentModelKeys.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="当前时间范围内暂无用量数据" compact />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────

function InfoField({
  icon: IconComp,
  label,
  value,
  monospace,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  monospace?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
        <IconComp className="w-3.5 h-3.5" />
        {label}
      </p>
      <p className={`text-sm ${monospace ? "font-mono" : ""} ${highlight ? "font-semibold text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function SummaryCard({
  icon: IconComp,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm">
      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
        <IconComp className={`w-3.5 h-3.5 ${color}`} />
        {label}
      </p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function SummaryCardWithModel({
  icon: IconComp,
  label,
  value,
  modelLabel,
  modelValue,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  modelLabel: string;
  modelValue: string;
  color: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <IconComp className={`w-3.5 h-3.5 ${color}`} />
          {label}
        </p>
        <span className={`text-xl font-semibold ${color}`}>{value}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">{modelLabel}</span>
        <span className={`text-lg font-semibold ${color}`}>{modelValue}</span>
      </div>
    </div>
  );
}

function EmptyState({ message, compact }: { message: string; compact?: boolean }) {
  return (
    <div className={`bg-card border rounded-xl ${compact ? "py-8" : "py-24"} text-center`}>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
