import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Wallet, Activity, Database, Zap, BarChart2, CalendarIcon, RefreshCw, LayoutGrid,
  PieChart as PieChartIcon, Users, Search, Building2, TrendingUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import OrgTreeSelect from "@/components/OrgTreeSelect";

interface Props {
  enterprise: { id: string; name: string; enterprise_code: string };
  role: string;
}

// Mock chart data
const mockDayData = [
  { date: "02-01", claude: 1200, gpt4: 800, gemini: 400 },
  { date: "02-03", claude: 900, gpt4: 1100, gemini: 600 },
  { date: "02-05", claude: 1500, gpt4: 700, gemini: 300 },
  { date: "02-07", claude: 800, gpt4: 1300, gemini: 500 },
  { date: "02-09", claude: 1100, gpt4: 900, gemini: 700 },
  { date: "02-11", claude: 600, gpt4: 1500, gemini: 400 },
  { date: "02-13", claude: 1300, gpt4: 600, gemini: 800 },
  { date: "02-15", claude: 950, gpt4: 1200, gemini: 350 },
  { date: "02-17", claude: 1400, gpt4: 800, gemini: 600 },
  { date: "02-19", claude: 700, gpt4: 1100, gemini: 450 },
  { date: "02-21", claude: 1200, gpt4: 900, gemini: 700 },
  { date: "02-23", claude: 850, gpt4: 1400, gemini: 300 },
  { date: "02-25", claude: 1100, gpt4: 700, gemini: 550 },
  { date: "02-27", claude: 1300, gpt4: 1000, gemini: 400 },
  { date: "02-29", claude: 900, gpt4: 800, gemini: 600 },
];

const mockCallData = [
  { date: "02-01", claude: 3, gpt4: 2, gemini: 1 },
  { date: "02-03", claude: 2, gpt4: 3, gemini: 2 },
  { date: "02-05", claude: 4, gpt4: 2, gemini: 1 },
  { date: "02-07", claude: 2, gpt4: 4, gemini: 1 },
  { date: "02-09", claude: 3, gpt4: 3, gemini: 2 },
  { date: "02-11", claude: 2, gpt4: 5, gemini: 1 },
  { date: "02-13", claude: 4, gpt4: 2, gemini: 3 },
  { date: "02-15", claude: 3, gpt4: 4, gemini: 1 },
  { date: "02-17", claude: 4, gpt4: 3, gemini: 2 },
  { date: "02-19", claude: 2, gpt4: 4, gemini: 1 },
  { date: "02-21", claude: 3, gpt4: 3, gemini: 2 },
  { date: "02-23", claude: 3, gpt4: 4, gemini: 1 },
  { date: "02-25", claude: 3, gpt4: 2, gemini: 2 },
  { date: "02-27", claude: 4, gpt4: 3, gemini: 1 },
  { date: "02-29", claude: 3, gpt4: 3, gemini: 2 },
];

// Mock donut data — member
const mockKeyConsumptionData = [
  { name: "gpt-4-turbo-key", value: 8.50, color: "#60a5fa" },
  { name: "claude-opus-key", value: 5.20, color: "#4ade80" },
  { name: "gemini-pro-key",  value: 2.80, color: "#a78bfa" },
  { name: "备用Key-01",      value: 1.20, color: "#fb923c" },
];

const mockInterceptData = [
  { name: "Key 预算不足",   value: 12, color: "#f87171" },
  { name: "个人日限额触达", value: 8,  color: "#fb923c" },
  { name: "组织总限额不足", value: 5,  color: "#facc15" },
  { name: "企业余额欠费",   value: 3,  color: "#a78bfa" },
  { name: "其他系统错误",   value: 2,  color: "#94a3b8" },
];

// Mock donut data — org_admin
const mockOrgKeyConsumptionData = [
  { name: "prod-gpt4-key",   value: 88.50, color: "#60a5fa" },
  { name: "prod-claude-key", value: 62.30, color: "#4ade80" },
  { name: "test-gemini-key", value: 24.70, color: "#a78bfa" },
  { name: "backup-key-01",   value: 13.00, color: "#fb923c" },
];

const mockOrgInterceptData = [
  { name: "Key 预算不足",   value: 45, color: "#f87171" },
  { name: "个人日限额触达", value: 32, color: "#fb923c" },
  { name: "组织总限额不足", value: 18, color: "#facc15" },
  { name: "企业余额欠费",   value: 8,  color: "#a78bfa" },
  { name: "其他系统错误",   value: 5,  color: "#94a3b8" },
];

// Mock donut data — enterprise_admin (全企业聚合)
const mockEnterpriseKeyData = [
  { name: "研发一组",   value: 188.50, color: "#60a5fa" },
  { name: "产品设计组", value: 142.30, color: "#4ade80" },
  { name: "运营支持组", value: 98.60,  color: "#a78bfa" },
  { name: "市场推广组", value: 76.40,  color: "#fb923c" },
  { name: "其他组织",   value: 92.30,  color: "#94a3b8" },
];

const mockEnterpriseInterceptData = [
  { name: "Key 预算不足",   value: 124, color: "#f87171" },
  { name: "个人日限额触达", value: 89,  color: "#fb923c" },
  { name: "组织总限额不足", value: 56,  color: "#facc15" },
  { name: "企业余额欠费",   value: 38,  color: "#a78bfa" },
  { name: "其他系统错误",   value: 15,  color: "#94a3b8" },
];

// Mock org rank data
const mockOrgRankData = [
  { name: "研发一组",   value: 188.50 },
  { name: "产品设计组", value: 142.30 },
  { name: "运营支持组", value: 98.60 },
  { name: "市场推广组", value: 76.40 },
  { name: "客户成功组", value: 54.20 },
  { name: "数据平台组", value: 38.10 },
];

// Per-org mock data for enterprise_admin filtered view
type OrgMockData = {
  cards: { big: string; mid1: string; mid2: string; rpm: string; tpm: string };
  keyData: { name: string; value: number; color: string }[];
  interceptData: { name: string; value: number; color: string }[];
  memberRank: { name: string; value: number }[];
  balance: number;
  consumed: number;
};

const mockOrgDataMap: Record<string, OrgMockData> = {
  "org-1": {
    cards: { big: "¥ 188.50", mid1: "1,624", mid2: "1.18M", rpm: "0.052", tpm: "1.42K" },
    keyData: [
      { name: "prod-gpt4-key",   value: 98.20, color: "#60a5fa" },
      { name: "claude-opus-key", value: 55.30, color: "#4ade80" },
      { name: "gemini-pro-key",  value: 35.00, color: "#a78bfa" },
    ],
    interceptData: [
      { name: "Key 预算不足",   value: 42, color: "#f87171" },
      { name: "个人日限额触达", value: 28, color: "#fb923c" },
      { name: "组织总限额不足", value: 10, color: "#facc15" },
      { name: "其他系统错误",   value: 4,  color: "#94a3b8" },
    ],
    memberRank: [
      { name: "张三", value: 42.50 }, { name: "李四", value: 38.20 },
      { name: "王五", value: 31.80 }, { name: "赵六", value: 28.40 },
      { name: "钱七", value: 22.10 }, { name: "孙八", value: 18.60 },
    ],
    balance: 3200.00,
    consumed: 188.50,
  },
  "org-2": {
    cards: { big: "¥ 142.30", mid1: "1,102", mid2: "890K", rpm: "0.038", tpm: "0.98K" },
    keyData: [
      { name: "design-gpt4",    value: 80.10, color: "#60a5fa" },
      { name: "figma-claude",   value: 40.20, color: "#4ade80" },
      { name: "sketch-gemini",  value: 22.00, color: "#a78bfa" },
    ],
    interceptData: [
      { name: "Key 预算不足",   value: 31, color: "#f87171" },
      { name: "个人日限额触达", value: 20, color: "#fb923c" },
      { name: "企业余额欠费",   value: 8,  color: "#a78bfa" },
      { name: "其他系统错误",   value: 3,  color: "#94a3b8" },
    ],
    memberRank: [
      { name: "陈设", value: 35.60 }, { name: "林美", value: 28.90 },
      { name: "吴绘", value: 22.40 }, { name: "郑图", value: 16.80 },
      { name: "周色", value: 12.30 }, { name: "徐版", value: 8.50 },
    ],
    balance: 2800.00,
    consumed: 142.30,
  },
  "org-3": {
    cards: { big: "¥ 98.60", mid1: "820", mid2: "640K", rpm: "0.029", tpm: "0.75K" },
    keyData: [
      { name: "ops-key-01",  value: 52.30, color: "#60a5fa" },
      { name: "ops-key-02",  value: 30.10, color: "#4ade80" },
      { name: "ops-backup",  value: 16.20, color: "#a78bfa" },
    ],
    interceptData: [
      { name: "Key 预算不足",   value: 22, color: "#f87171" },
      { name: "个人日限额触达", value: 15, color: "#fb923c" },
      { name: "组织总限额不足", value: 9,  color: "#facc15" },
      { name: "其他系统错误",   value: 2,  color: "#94a3b8" },
    ],
    memberRank: [
      { name: "高运", value: 28.10 }, { name: "刘营", value: 22.60 },
      { name: "杨支", value: 18.30 }, { name: "朱持", value: 14.20 },
      { name: "秦保", value: 9.80 },  { name: "许障", value: 5.60 },
    ],
    balance: 1900.00,
    consumed: 98.60,
  },
  "org-4": {
    cards: { big: "¥ 76.40", mid1: "612", mid2: "480K", rpm: "0.022", tpm: "0.58K" },
    keyData: [
      { name: "mkt-gpt4-key",   value: 42.00, color: "#60a5fa" },
      { name: "mkt-claude-key", value: 21.80, color: "#4ade80" },
      { name: "mkt-gemini",     value: 12.60, color: "#a78bfa" },
    ],
    interceptData: [
      { name: "Key 预算不足",   value: 18, color: "#f87171" },
      { name: "个人日限额触达", value: 12, color: "#fb923c" },
      { name: "企业余额欠费",   value: 6,  color: "#a78bfa" },
      { name: "其他系统错误",   value: 2,  color: "#94a3b8" },
    ],
    memberRank: [
      { name: "赵市", value: 22.30 }, { name: "钱场", value: 18.40 },
      { name: "孙推", value: 14.20 }, { name: "李广", value: 10.60 },
      { name: "周告", value: 7.50 },  { name: "吴文", value: 3.40 },
    ],
    balance: 1500.00,
    consumed: 76.40,
  },
  "org-5": {
    cards: { big: "¥ 54.20", mid1: "445", mid2: "328K", rpm: "0.016", tpm: "0.41K" },
    keyData: [
      { name: "cs-primary-key",  value: 30.10, color: "#60a5fa" },
      { name: "cs-support-key",  value: 16.40, color: "#4ade80" },
      { name: "cs-backup",       value: 7.70,  color: "#a78bfa" },
    ],
    interceptData: [
      { name: "Key 预算不足",   value: 14, color: "#f87171" },
      { name: "个人日限额触达", value: 8,  color: "#fb923c" },
      { name: "组织总限额不足", value: 4,  color: "#facc15" },
      { name: "其他系统错误",   value: 1,  color: "#94a3b8" },
    ],
    memberRank: [
      { name: "白客", value: 16.80 }, { name: "苗服", value: 12.50 },
      { name: "方成", value: 9.30 },  { name: "俞功", value: 7.20 },
      { name: "任经", value: 5.10 },  { name: "袁理", value: 3.30 },
    ],
    balance: 1100.00,
    consumed: 54.20,
  },
  "org-6": {
    cards: { big: "¥ 38.10", mid1: "318", mid2: "232K", rpm: "0.011", tpm: "0.29K" },
    keyData: [
      { name: "data-etl-key",    value: 20.40, color: "#60a5fa" },
      { name: "data-report-key", value: 11.30, color: "#4ade80" },
      { name: "data-ml-key",     value: 6.40,  color: "#a78bfa" },
    ],
    interceptData: [
      { name: "Key 预算不足",   value: 10, color: "#f87171" },
      { name: "个人日限额触达", value: 6,  color: "#fb923c" },
      { name: "组织总限额不足", value: 3,  color: "#facc15" },
      { name: "其他系统错误",   value: 1,  color: "#94a3b8" },
    ],
    memberRank: [
      { name: "谢数", value: 12.60 }, { name: "邹据", value: 9.80 },
      { name: "水平", value: 7.20 },  { name: "云台", value: 4.90 },
      { name: "章组", value: 2.80 },  { name: "魏织", value: 0.80 },
    ],
    balance: 800.00,
    consumed: 38.10,
  },
};

const enterpriseBalance = 12580.00;
const enterpriseTotalConsumed = 5598.10;

// Mock member rank
const mockMemberRankData = [
  { name: "张三",   value: 42.50 },
  { name: "李四",   value: 38.20 },
  { name: "王五",   value: 31.80 },
  { name: "赵六",   value: 28.40 },
  { name: "钱七",   value: 22.10 },
  { name: "孙八",   value: 18.60 },
  { name: "周九",   value: 15.30 },
  { name: "吴十",   value: 12.00 },
  { name: "郑十一", value: 8.90 },
  { name: "陈十二", value: 5.20 },
];

// Mock orgs for org_admin (limited view)
const mockOrgs = [
  { id: "org-1", name: "研发一组" },
  { id: "org-2", name: "产品设计组" },
];

// Mock orgs for enterprise_admin (full view)
const mockAllOrgs = [
  { id: "org-1", name: "研发一组" },
  { id: "org-2", name: "产品设计组" },
  { id: "org-3", name: "运营支持组" },
  { id: "org-4", name: "市场推广组" },
  { id: "org-5", name: "客户成功组" },
  { id: "org-6", name: "数据平台组" },
];

const orgMonthlyBudget = 5000;
const orgConsumed = 1800;

type ViewRole = "member" | "org_admin" | "enterprise_admin";

interface DonutChartProps {
  title: string;
  data: { name: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  valueFormatter: (v: number) => string;
}

function DonutChart({ title, data, centerLabel, centerValue, valueFormatter }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-4">{title}</p>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [valueFormatter(v), name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
            <span className="text-base font-bold text-foreground">{centerValue}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((item, i) => {
            const pct = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-foreground">{valueFormatter(item.value)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <Users className="w-10 h-10 mb-2 opacity-30" />
      <p className="text-sm">暂无相关统计数据</p>
    </div>
  );
}

export default function ResourceStats({ enterprise }: Props) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date("2024-02-01")),
    to: endOfMonth(new Date("2024-02-01")),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"consumption" | "calls">("consumption");
  const [granularity, setGranularity] = useState<"hour" | "day" | "week">("day");
  const [viewRole, setViewRole] = useState<ViewRole>("member");
  const [selectedOrg, setSelectedOrg] = useState("org-1");
  const [memberFilter, setMemberFilter] = useState("");
  const [committedMember, setCommittedMember] = useState("");

  // enterprise_admin states
  const [selectedEnterpriseOrg, setSelectedEnterpriseOrg] = useState("all");
  const [enterpriseMemberFilter, setEnterpriseMemberFilter] = useState("");
  const [committedEnterpriseMember, setCommittedEnterpriseMember] = useState("");

  void enterprise;

  const handleSearch = () => {
    if (memberFilter.trim()) setCommittedMember(memberFilter.trim());
  };

  const handleReset = () => {
    setMemberFilter("");
    setCommittedMember("");
  };

  const handleEnterpriseSearch = () => {
    if (enterpriseMemberFilter.trim()) setCommittedEnterpriseMember(enterpriseMemberFilter.trim());
  };

  const handleEnterpriseReset = () => {
    setEnterpriseMemberFilter("");
    setCommittedEnterpriseMember("");
  };

  const chartData = activeSubTab === "consumption" ? mockDayData : mockCallData;
  const yLabel = activeSubTab === "consumption" ? "Tokens" : "次数";

  const cardLabels = { big: "已消耗预算", mid1: "统计调用次数", mid2: "消耗Tokens" };

  const consumed = 12.50;
  const total = 50.00;
  const consumedPct = Math.round((consumed / total) * 100);
  const orgConsumedPct = Math.round((orgConsumed / orgMonthlyBudget) * 100);

  const orgCardValues = committedMember
    ? { big: "¥ 37.50", mid1: "312", mid2: "248K", rpm: "0.008", tpm: "0.62K" }
    : { big: "¥ 188.50", mid1: "1,847", mid2: "1.24M", rpm: "0.041", tpm: "1.28K" };

  // Enterprise derived data — switches based on selectedEnterpriseOrg
  const isEnterpriseFiltered = selectedEnterpriseOrg !== "all";
  const activeOrgData = isEnterpriseFiltered ? mockOrgDataMap[selectedEnterpriseOrg] : null;

  const enterpriseCardValues = committedEnterpriseMember
    ? { big: "¥ 37.50",  mid1: "312",   mid2: "248K",  rpm: "0.008", tpm: "0.62K" }
    : isEnterpriseFiltered && activeOrgData
    ? activeOrgData.cards
    : { big: "¥ 598.10", mid1: "5,234", mid2: "3.82M", rpm: "0.128", tpm: "3.15K" };

  const activeEnterpriseKeyData = isEnterpriseFiltered && activeOrgData
    ? activeOrgData.keyData
    : mockEnterpriseKeyData;

  const activeEnterpriseInterceptData = isEnterpriseFiltered && activeOrgData
    ? activeOrgData.interceptData
    : mockEnterpriseInterceptData;

  const activeEnterpriseKeyCenter = isEnterpriseFiltered && activeOrgData
    ? `¥${activeOrgData.consumed.toFixed(2)}`
    : "¥598.10";

  const activeEnterpriseInterceptCenter = isEnterpriseFiltered && activeOrgData
    ? `${activeOrgData.interceptData.reduce((s, d) => s + d.value, 0)} 次`
    : "322 次";

  const activeEnterpriseOrgRank = isEnterpriseFiltered && activeOrgData
    ? activeOrgData.memberRank   // show member rank for selected org
    : mockOrgRankData;

  const filteredMemberRank = mockMemberRankData;

  const formatDateRange = () => {
    if (!dateRange?.from) return "选择日期范围";
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : from;
    return `${from} ~ ${to}`;
  };

  const roleTabs: { key: ViewRole; label: string }[] = [
    { key: "member", label: "普通成员" },
    { key: "org_admin", label: "组织管理员" },
    { key: "enterprise_admin", label: "企业管理员" },
  ];

  return (
    <div>
      {/* Role switcher — top */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center bg-muted rounded-lg p-1 h-9">
          {roleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewRole(tab.key)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                viewRole === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <span>资源统计</span>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 gap-2 text-sm font-normal border-border">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{formatDateRange()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="h-9 w-9 border-border">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* org_admin: top control bar */}
      {viewRole === "org_admin" && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">当前组织</span>
          </div>
          <Select value={selectedOrg} onValueChange={(v) => { setSelectedOrg(v); handleReset(); }}>
            <SelectTrigger className="h-8 w-36 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs">
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-px h-5 bg-border shrink-0" />
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索成员姓名（留空显示全组织）..."
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-8 pl-8 text-xs border-border"
            />
          </div>
          <Button size="sm" className="h-8 text-xs px-3 shrink-0" onClick={handleSearch}>
            查询
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs px-3 shrink-0" onClick={handleReset}>
            重置
          </Button>
          {committedMember && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>当前查看：{committedMember}</span>
            </div>
          )}
        </div>
      )}

      {/* enterprise_admin: top control bar */}
      {viewRole === "enterprise_admin" && (
        <div className="bg-card border border-border rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">组织筛选</span>
          </div>
          <Select
            value={selectedEnterpriseOrg}
            onValueChange={(v) => {
              setSelectedEnterpriseOrg(v);
              setEnterpriseMemberFilter("");
              setCommittedEnterpriseMember("");
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">全部组织（默认）</SelectItem>
              {mockAllOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs">
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="w-px h-5 bg-border shrink-0" />
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索成员姓名（留空显示全企业）..."
              value={enterpriseMemberFilter}
              onChange={(e) => setEnterpriseMemberFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnterpriseSearch()}
              className="h-8 pl-8 text-xs border-border"
            />
          </div>
          <Button size="sm" className="h-8 text-xs px-3 shrink-0" onClick={handleEnterpriseSearch}>
            查询
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs px-3 shrink-0" onClick={handleEnterpriseReset}>
            重置
          </Button>
          {committedEnterpriseMember && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 shrink-0">
              <Users className="w-3.5 h-3.5" />
              <span>当前查看：{committedEnterpriseMember}</span>
              <button onClick={handleEnterpriseReset} className="ml-0.5 hover:text-blue-800">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quota banner — member */}
      {viewRole === "member" && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-blue-700">实时配额监控</span>
          </div>
          <div className="w-px h-5 bg-blue-200 shrink-0" />
          <span className="text-sm text-blue-600 shrink-0">
            今日个人预算剩余：<span className="font-bold text-blue-800">¥ {(total - consumed).toFixed(2)}</span> / ¥ {total.toFixed(2)}
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${consumedPct}%` }} />
            </div>
            <span className="text-xs text-blue-500 shrink-0">{consumedPct}% 已消耗</span>
          </div>
        </div>
      )}

      {/* Quota banner — org_admin (aggregated) */}
      {viewRole === "org_admin" && committedMember === "" && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-blue-700">组织本月配额监控</span>
          </div>
          <div className="w-px h-5 bg-blue-200 shrink-0" />
          <span className="text-sm text-blue-600 shrink-0">
            本月组织剩余预算：
            <span className="font-bold text-blue-800">
              ¥ {(orgMonthlyBudget - orgConsumed).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </span>
            {" "}/ ¥ {orgMonthlyBudget.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${orgConsumedPct}%` }} />
            </div>
            <span className="text-xs text-blue-500 shrink-0">{orgConsumedPct}% 已消耗</span>
          </div>
        </div>
      )}

      {/* Quota banner — org_admin (member drill-through) */}
      {viewRole === "org_admin" && committedMember !== "" && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-blue-700">实时配额监控</span>
          </div>
          <div className="w-px h-5 bg-blue-200 shrink-0" />
          <span className="text-sm text-blue-600 shrink-0">
            成员 <strong className="text-blue-800">{committedMember}</strong> 今日预算剩余：
            <span className="font-bold text-blue-800">¥ 37.50</span> / ¥ 50.00
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: "25%" }} />
            </div>
            <span className="text-xs text-blue-500 shrink-0">25% 已消耗</span>
          </div>
        </div>
      )}

      {/* Enterprise financial banner — aggregated */}
      {viewRole === "enterprise_admin" && committedEnterpriseMember === "" && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-emerald-700">企业财务看板</span>
          </div>
          <div className="w-px h-5 bg-emerald-200 shrink-0" />
          <span className="text-sm text-emerald-700 shrink-0">
            当前余额：<span className="font-bold text-emerald-800">¥ {enterpriseBalance.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs px-3 shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
            充值
          </Button>
          <div className="w-px h-5 bg-emerald-200 shrink-0" />
          <span className="text-sm text-emerald-600 shrink-0">
            本期已消耗：<span className="font-bold text-emerald-800">¥ {enterpriseTotalConsumed.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
          </span>
        </div>
      )}

      {/* Enterprise member drill-through banner */}
      {viewRole === "enterprise_admin" && committedEnterpriseMember !== "" && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-blue-700">实时配额监控</span>
          </div>
          <div className="w-px h-5 bg-blue-200 shrink-0" />
          <span className="text-sm text-blue-600 shrink-0">
            成员 <strong className="text-blue-800">{committedEnterpriseMember}</strong> 今日预算剩余：
            <span className="font-bold text-blue-800">¥ 37.50</span> / ¥ 50.00
          </span>
          <div className="flex items-center gap-2 flex-1 min-w-[160px]">
            <div className="flex-1 h-2 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: "25%" }} />
            </div>
            <span className="text-xs text-blue-500 shrink-0">25% 已消耗</span>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-3 grid-rows-2 gap-4 mb-6" style={{ gridTemplateRows: "auto auto" }}>
        <div className="row-span-2 bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: "hsl(32,90%,55%)" }}>
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">{cardLabels.big}</p>
          <p className="text-4xl font-bold text-foreground">
            {viewRole === "org_admin"
              ? orgCardValues.big
              : viewRole === "enterprise_admin"
              ? enterpriseCardValues.big
              : "¥2.27"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{cardLabels.mid1}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(340,85%,95%)" }}>
              <Activity className="w-4 h-4" style={{ color: "hsl(340,75%,55%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {viewRole === "org_admin"
              ? orgCardValues.mid1
              : viewRole === "enterprise_admin"
              ? enterpriseCardValues.mid1
              : "29"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">平均RPM</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(142,70%,92%)" }}>
              <Zap className="w-4 h-4" style={{ color: "hsl(142,70%,40%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {viewRole === "org_admin"
              ? orgCardValues.rpm
              : viewRole === "enterprise_admin"
              ? enterpriseCardValues.rpm
              : "0.001"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">{cardLabels.mid2}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(214,85%,93%)" }}>
              <Database className="w-4 h-4" style={{ color: "hsl(214,80%,50%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {viewRole === "org_admin"
              ? orgCardValues.mid2
              : viewRole === "enterprise_admin"
              ? enterpriseCardValues.mid2
              : "14.4K"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">平均TPM</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(262,60%,93%)" }}>
              <BarChart2 className="w-4 h-4" style={{ color: "hsl(262,60%,55%)" }} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {viewRole === "org_admin"
              ? orgCardValues.tpm
              : viewRole === "enterprise_admin"
              ? enterpriseCardValues.tpm
              : "0.357"}
          </p>
        </div>
      </div>

      {/* Chart card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">模型数据分析</span>
            </div>
            <div className="flex items-center bg-muted rounded-lg p-1 h-8">
              <button
                onClick={() => setActiveSubTab("consumption")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  activeSubTab === "consumption"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                模型消耗分布
              </button>
              <button
                onClick={() => setActiveSubTab("calls")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  activeSubTab === "calls"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                模型调用分布
              </button>
            </div>
          </div>
          <div className="flex items-center bg-muted rounded-lg p-1 h-8">
            {(["hour", "day", "week"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  granularity === g
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {g === "hour" ? "按小时" : g === "day" ? "按天" : "按周"}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => activeSubTab === "consumption" && v >= 1000 ? `${v / 1000}K` : String(v)}
              label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              cursor={{ fill: "hsl(var(--muted))" }}
            />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="claude" name="Claude 3" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gpt4" name="GPT-4" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gemini" name="Gemini Pro" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* org_admin: Member rank card */}
      {viewRole === "org_admin" && committedMember === "" && (
        <div className="mt-4 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">成员消耗排行榜</span>
            <span className="text-xs text-muted-foreground ml-1">Top 10</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              layout="vertical"
              data={filteredMemberRank.slice(0, 10)}
              margin={{ top: 4, right: 64, left: 8, bottom: 4 }}
              barSize={16}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `¥${v}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={56}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`¥${v.toFixed(2)}`, "消耗金额"]}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar
                dataKey="value"
                name="消耗金额"
                fill="#60a5fa"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))", formatter: (v: number) => `¥${v.toFixed(2)}` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* enterprise_admin: Org rank card */}
      {viewRole === "enterprise_admin" && committedEnterpriseMember === "" && (
        <div className="mt-4 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {isEnterpriseFiltered ? `${mockAllOrgs.find(o => o.id === selectedEnterpriseOrg)?.name} · 成员消耗排行榜` : "组织消耗排行榜"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">Top {activeEnterpriseOrgRank.length}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={activeEnterpriseOrgRank}
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              barSize={18}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `¥${v}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={64}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`¥${v.toFixed(2)}`, "消耗金额"]}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar
                dataKey="value"
                name="消耗金额"
                fill="#60a5fa"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))", formatter: (v: number) => `¥${v.toFixed(2)}` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* APIkey analysis — member, org_admin & enterprise_admin */}
      {(viewRole === "member" || viewRole === "org_admin" || viewRole === "enterprise_admin") && (
        <div className="mt-4 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">APIkey 调用分析</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DonutChart
              title={viewRole === "enterprise_admin" && committedEnterpriseMember === "" ? (isEnterpriseFiltered ? "Key 消耗占比" : "组织 Key 消耗占比") : "API Key 消耗占比"}
              data={
                viewRole === "enterprise_admin" && committedEnterpriseMember === ""
                  ? activeEnterpriseKeyData
                  : viewRole === "org_admin" && committedMember === ""
                  ? mockOrgKeyConsumptionData
                  : mockKeyConsumptionData
              }
              centerLabel="总消耗"
              centerValue={
                viewRole === "enterprise_admin" && committedEnterpriseMember === ""
                  ? activeEnterpriseKeyCenter
                  : viewRole === "org_admin" && committedMember === ""
                  ? "¥188.50"
                  : "¥17.70"
              }
              valueFormatter={(v) => `¥${v.toFixed(2)}`}
            />
            <DonutChart
              title="请求拦截原因分布"
              data={
                viewRole === "enterprise_admin" && committedEnterpriseMember === ""
                  ? activeEnterpriseInterceptData
                  : viewRole === "org_admin" && committedMember === ""
                  ? mockOrgInterceptData
                  : mockInterceptData
              }
              centerLabel="总失败"
              centerValue={
                viewRole === "enterprise_admin" && committedEnterpriseMember === ""
                  ? activeEnterpriseInterceptCenter
                  : viewRole === "org_admin" && committedMember === ""
                  ? "108 次"
                  : "30 次"
              }
              valueFormatter={(v) => `${v} 次`}
            />
          </div>
        </div>
      )}

      {/* Empty state for enterprise member drill-through with no data */}
      {viewRole === "enterprise_admin" && committedEnterpriseMember !== "" && false && (
        <EmptyState />
      )}
    </div>
  );
}
