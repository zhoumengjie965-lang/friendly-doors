import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Settings,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  TestTube,
  Ban,
  Edit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Play,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────

type ChannelType =
  | "openai"
  | "suno"
  | "anthropic"
  | "deepseek"
  | "qwen"
  | "glm"
  | "gemini"
  | "moonshot"
  | "silicon"
  | "doubao"
  | "custom";

type ChannelStatus = "enabled" | "disabled" | "testing" | "error";

interface Channel {
  id: number;
  name: string;
  groups: string[];
  type: ChannelType;
  status: ChannelStatus;
  responseTime: string;
  usedQuota: string;
  remainingQuota: string;
  priority: number;
  weight: number;
  monitoring: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────

const PROVIDER_TABS = [
  { key: "all", label: "全部", count: 36 },
  { key: "openai", label: "OpenAI", count: 10 },
  { key: "suno", label: "Suno API", count: 1 },
  { key: "anthropic", label: "Anthropic Claude", count: 7 },
  { key: "deepseek", label: "DeepSeek", count: 1 },
  { key: "qwen", label: "阿里通义千问", count: 4 },
  { key: "glm", label: "智谱GLM-4", count: 1 },
  { key: "gemini", label: "Google Gemini", count: 4 },
  { key: "moonshot", label: "Moonshot", count: 1 },
  { key: "silicon", label: "SiliconCloud", count: 1 },
  { key: "doubao", label: "字节火山方舟/豆包通用", count: 5 },
];

const TYPE_CONFIG: Record<
  ChannelType,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  openai: { label: "OpenAI", color: "text-emerald-600", bgColor: "bg-emerald-50", dotColor: "bg-emerald-500" },
  suno: { label: "Suno", color: "text-gray-600", bgColor: "bg-gray-100", dotColor: "bg-gray-400" },
  anthropic: { label: "Anthropic", color: "text-amber-600", bgColor: "bg-amber-50", dotColor: "bg-amber-500" },
  deepseek: { label: "DeepSeek", color: "text-blue-600", bgColor: "bg-blue-50", dotColor: "bg-blue-500" },
  qwen: { label: "阿里通义千问", color: "text-orange-600", bgColor: "bg-orange-50", dotColor: "bg-orange-500" },
  glm: { label: "智谱", color: "text-purple-600", bgColor: "bg-purple-50", dotColor: "bg-purple-500" },
  gemini: { label: "Google Gemini", color: "text-blue-500", bgColor: "bg-blue-50", dotColor: "bg-blue-400" },
  moonshot: { label: "Moonshot", color: "text-gray-600", bgColor: "bg-gray-100", dotColor: "bg-gray-400" },
  silicon: { label: "SiliconCloud", color: "text-cyan-600", bgColor: "bg-cyan-50", dotColor: "bg-cyan-500" },
  doubao: { label: "字节豆包", color: "text-blue-600", bgColor: "bg-blue-50", dotColor: "bg-blue-500" },
  custom: { label: "自定义", color: "text-gray-600", bgColor: "bg-gray-100", dotColor: "bg-gray-400" },
};

const GROUP_OPTIONS: Record<string, { color: string }> = {
  default: { color: "bg-blue-100 text-blue-700" },
  basic: { color: "bg-gray-100 text-gray-700" },
  vip: { color: "bg-amber-100 text-amber-700" },
  "claude-fast": { color: "bg-purple-100 text-purple-700" },
  "claude-basic": { color: "bg-purple-100 text-purple-700" },
  "gemini-fast": { color: "bg-blue-100 text-blue-700" },
  "gemini-slow": { color: "bg-blue-100 text-blue-700" },
  "gpt4-fast": { color: "bg-emerald-100 text-emerald-700" },
  "gpt4-basic": { color: "bg-emerald-100 text-emerald-700" },
  "vip-dp": { color: "bg-amber-100 text-amber-700" },
  suno: { color: "bg-gray-100 text-gray-700" },
  "openai-fast": { color: "bg-emerald-100 text-emerald-700" },
  "openai-basic": { color: "bg-emerald-100 text-emerald-700" },
};

// ─── Mock Data ───────────────────────────────────────────────────────────

const MOCK_CHANNELS: Channel[] = [
  {
    id: 58,
    name: "Anthropic Official",
    groups: ["claude-basic", "claude-fast"],
    type: "anthropic",
    status: "enabled",
    responseTime: "1.28秒",
    usedQuota: "¥8,631.24",
    remainingQuota: "¥21,368.76",
    priority: 110,
    weight: 20,
    monitoring: true,
  },
  {
    id: 40,
    name: "oracle-xai",
    groups: ["basic", "claude-fast", "gemini-fast", "gpt4-fast", "openai-fast", "vip-dp"],
    type: "anthropic",
    status: "testing",
    responseTime: "未测试",
    usedQuota: "¥0.07",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 45,
    name: "polo-nano",
    groups: ["default", "basic", "gemini-slow"],
    type: "gemini",
    status: "enabled",
    responseTime: "未测试",
    usedQuota: "¥41.73",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 53,
    name: "aliyun-glm",
    groups: ["default"],
    type: "glm",
    status: "enabled",
    responseTime: "未测试",
    usedQuota: "¥0.02",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 54,
    name: "aliyun-deepseek",
    groups: ["default"],
    type: "deepseek",
    status: "enabled",
    responseTime: "未测试",
    usedQuota: "¥0.01",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 52,
    name: "aliyun-qwen",
    groups: ["default"],
    type: "qwen",
    status: "enabled",
    responseTime: "未测试",
    usedQuota: "¥1.15",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 31,
    name: "测试Suno",
    groups: ["default", "suno"],
    type: "suno",
    status: "enabled",
    responseTime: "未测试",
    usedQuota: "¥8.17",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 28,
    name: "kingai",
    groups: ["default"],
    type: "openai",
    status: "enabled",
    responseTime: "已启用",
    usedQuota: "¥54.60",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 32,
    name: "mock-error",
    groups: ["default", "claude-basic", "claude-fast", "openai-basic", "openai-fast"],
    type: "openai",
    status: "enabled",
    responseTime: "未测试",
    usedQuota: "¥0.02",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
  {
    id: 33,
    name: "polo-gpt4",
    groups: ["default"],
    type: "openai",
    status: "disabled",
    responseTime: "9.39秒",
    usedQuota: "¥0.01",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: false,
  },
  {
    id: 27,
    name: "siliconflow",
    groups: ["default"],
    type: "silicon",
    status: "enabled",
    responseTime: "3.33秒",
    usedQuota: "¥0.07",
    remainingQuota: "¥0",
    priority: 0,
    weight: 0,
    monitoring: true,
  },
];

// ─── Components ──────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ChannelType }) {
  const config = TYPE_CONFIG[type];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${config.bgColor}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span className={`text-xs ${config.color}`}>{config.label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ChannelStatus }) {
  const config = {
    enabled: { icon: CheckCircle2, label: "已开启", className: "text-emerald-500" },
    disabled: { icon: XCircle, label: "已禁用", className: "text-red-500" },
    testing: { icon: Loader2, label: "测试中", className: "text-blue-500" },
    error: { icon: AlertTriangle, label: "异常", className: "text-red-500" },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${status === "testing" ? "animate-spin" : ""}`} />
      <span className="text-xs">{label}</span>
    </div>
  );
}

function GroupTags({ groups }: { groups: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {groups.map((group) => {
        const config = GROUP_OPTIONS[group] || { color: "bg-gray-100 text-gray-700" };
        return (
          <span
            key={group}
            className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${config.color}`}
          >
            {group}
          </span>
        );
      })}
    </div>
  );
}

export default function AdminChannels() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [disableChannel, setDisableChannel] = useState<Channel | null>(null);

  const affectedUsers = [
    { id: "ent_441", subjectType: "企业", subject: "凯世通企业" },
    { id: "ent_442", subjectType: "企业", subject: "远航研发中心" },
    { id: "ent_443", subjectType: "企业", subject: "星海科技" },
    { id: "u_2216", subjectType: "用户", subject: "王敏" },
    { id: "u_2217", subjectType: "用户", subject: "张三" },
    { id: "res_101", subjectType: "代理商", subject: "代理商 A" },
    { id: "res_102", subjectType: "代理商", subject: "云启科技" },
  ];
  const affectedSubjectGroups = ["企业", "用户", "代理商"].map((subjectType) => ({
    subjectType,
    subjects: affectedUsers.filter((item) => item.subjectType === subjectType),
  })).filter((group) => group.subjects.length > 0);

  const openDisableDialog = (channel: Channel) => {
    setDisableChannel(channel);
  };

  const confirmDisable = () => {
    if (!disableChannel) return;
    setChannels((prev) => prev.map((channel) => channel.id === disableChannel.id ? { ...channel, status: "disabled" } : channel));
    setDisableChannel(null);
  };

  const pageSize = 10;

  const filteredData = useMemo(() => {
    let data = [...channels];
    if (selectedTab !== "all") data = data.filter((ch) => ch.type === selectedTab);
    if (statusFilter !== "all") data = data.filter((ch) => ch.status === statusFilter);
    if (searchQuery) {
      data = data.filter(
        (ch) =>
          ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ch.groups.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return data;
  }, [channels, selectedTab, statusFilter, searchQuery]);

  const toggleMonitoring = (id: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, monitoring: !ch.monitoring } : ch))
    );
  };

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map((ch) => ch.id));
    }
  };

  const toggleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rid) => rid !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Provider Tabs - 单行显示 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {PROVIDER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSelectedTab(tab.key);
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
              selectedTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] ${selectedTab === tab.key ? "opacity-80" : ""}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Quick Actions & Filters - 单行紧凑 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 text-red-500">
            <Trash2 className="w-3 h-3" />
            删除所有渠道
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                <Settings className="w-3 h-3" />
                批量操作
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuItem
                onClick={() => {
                  setChannels((prev) =>
                    selectedRows.length > 0
                      ? prev.map((ch) =>
                          selectedRows.includes(ch.id) ? { ...ch, monitoring: true } : ch
                        )
                      : prev.map((ch) => ({ ...ch, monitoring: true }))
                  );
                }}
                className="gap-2 text-blue-600"
              >
                <Play className="w-3 h-3" />
                批量开启监控
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setChannels((prev) =>
                    selectedRows.length > 0
                      ? prev.map((ch) =>
                          selectedRows.includes(ch.id) ? { ...ch, monitoring: false } : ch
                        )
                      : prev.map((ch) => ({ ...ch, monitoring: false }))
                  );
                }}
                className="gap-2 text-gray-600"
              >
                <Square className="w-3 h-3" />
                批量关闭监控
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2">
            紧凑列表
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">使用ID排序</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">开启批量操作</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">标签聚合模式</span>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">全部状态</SelectItem>
              <SelectItem value="enabled" className="text-xs">已启用</SelectItem>
              <SelectItem value="disabled" className="text-xs">已禁用</SelectItem>
              <SelectItem value="testing" className="text-xs">测试中</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="渠道ID、名称、密钥、API地址"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 h-7 pl-7 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" className="h-7 text-xs px-2">
            查询
          </Button>

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
            <Settings className="w-3 h-3" />
            更多
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-xs gap-1 px-2">
          <Plus className="w-3 h-3" />
          添加渠道
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
          <RefreshCw className="w-3 h-3" />
          刷新
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
          <Settings className="w-3 h-3" />
          列设置
        </Button>
      </div>

      {/* Data Table - 紧凑 */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 h-8">
              <TableHead className="w-8 px-2 py-0">
                <Checkbox
                  checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                  onCheckedChange={toggleSelectAll}
                  className="h-3.5 w-3.5"
                />
              </TableHead>
              <TableHead className="w-10 px-2 py-0 text-xs font-medium">ID</TableHead>
              <TableHead className="w-24 px-2 py-0 text-xs font-medium">名称</TableHead>
              <TableHead className="px-2 py-0 text-xs font-medium">分组</TableHead>
              <TableHead className="w-24 px-2 py-0 text-xs font-medium">类型</TableHead>
              <TableHead className="w-20 px-2 py-0 text-xs font-medium">状态</TableHead>
              <TableHead className="w-20 px-2 py-0 text-xs font-medium">响应时间</TableHead>
              <TableHead className="w-24 px-2 py-0 text-xs font-medium">已用/剩余额度</TableHead>
              <TableHead className="w-12 px-2 py-0 text-xs font-medium">优先级</TableHead>
              <TableHead className="w-12 px-2 py-0 text-xs font-medium">权重</TableHead>
              <TableHead className="w-14 px-2 py-0 text-xs font-medium text-center">监控</TableHead>
              <TableHead className="w-40 px-2 py-0 text-xs font-medium text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((channel) => (
              <TableRow key={channel.id} className="h-9 hover:bg-muted/20">
                <TableCell className="px-2 py-0">
                  <Checkbox
                    checked={selectedRows.includes(channel.id)}
                    onCheckedChange={() => toggleSelectRow(channel.id)}
                    className="h-3.5 w-3.5"
                  />
                </TableCell>
                <TableCell className="px-2 py-0 text-xs">{channel.id}</TableCell>
                <TableCell className="px-2 py-0 text-xs font-medium">{channel.name}</TableCell>
                <TableCell className="px-2 py-0">
                  <GroupTags groups={channel.groups} />
                </TableCell>
                <TableCell className="px-2 py-0">
                  <TypeBadge type={channel.type} />
                </TableCell>
                <TableCell className="px-2 py-0">
                  <StatusBadge status={channel.status} />
                </TableCell>
                <TableCell className="px-2 py-0 text-xs text-muted-foreground">{channel.responseTime}</TableCell>
                <TableCell className="px-2 py-0 text-xs">
                  {channel.usedQuota} / {channel.remainingQuota}
                </TableCell>
                <TableCell className="px-2 py-0 text-xs">{channel.priority}</TableCell>
                <TableCell className="px-2 py-0 text-xs">{channel.weight}</TableCell>
                <TableCell className="px-2 py-0">
                  <div className="flex items-center justify-center">
                    <Switch
                      checked={channel.monitoring}
                      onCheckedChange={() => toggleMonitoring(channel.id)}
                      className="scale-75"
                    />
                  </div>
                </TableCell>
                <TableCell className="px-2 py-0">
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <TestTube className="w-3 h-3 mr-0.5" />
                      测试
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-1.5 text-xs ${
                        channel.status === "disabled"
                          ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                          : "text-red-500 hover:text-red-600 hover:bg-red-50"
                      }`}
                      onClick={() => {
                        if (channel.status === "disabled") {
                          setChannels((prev) => prev.map((item) => item.id === channel.id ? { ...item, status: "enabled" } : item));
                        } else {
                          openDisableDialog(channel);
                        }
                      }}
                    >
                      <Ban className="w-3 h-3 mr-0.5" />
                      {channel.status === "disabled" ? "启用" : "禁用"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-3 h-3 mr-0.5" />
                      编辑
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-xs">复制</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs text-red-500">删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(disableChannel)} onOpenChange={(open) => !open && setDisableChannel(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>确认禁用渠道？</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">禁用后，以下已在特殊渠道策略中启用该渠道的用户、企业和代理商将无法继续使用该渠道，请确认影响范围。</p>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[120px_1fr] bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                <span>主体类型</span><span>主体</span>
              </div>
              {affectedSubjectGroups.map((group) => (
                <div key={group.subjectType} className="grid grid-cols-[120px_1fr] items-start border-t px-4 py-3 text-sm">
                  <span><Badge variant="secondary" className="font-normal">{group.subjectType}</Badge></span>
                  <div className="flex flex-wrap gap-1.5">{group.subjects.map((item) => <Badge key={item.id} variant="outline" className="font-normal">{item.subject}</Badge>)}</div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableChannel(null)}>取消</Button>
            <Button variant="destructive" onClick={confirmDisable}>确认禁用</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          共 {filteredData.length} 条记录，第 {currentPage}/{totalPages || 1} 页
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft className="w-3 h-3 mr-0.5" />
            上一页
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className="h-7 w-7 text-xs p-0"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            下一页
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
