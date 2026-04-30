import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Activity, Filter, Clock, AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, Search, ChevronDown, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────

type ChannelStatus = "normal" | "warning" | "error" | "disabled";

interface TrendPoint {
  time: Date;
  successRate: number;
  cacheHitRate: number;
}

interface Channel {
  id: string;
  name: string;
  status: ChannelStatus;
  successRate: number;
  avgResponseTime: number;
  p95Latency: number;
  p99Latency: number;
  requestCount: number;
  cacheHitRate: number;
  rpm: number;
  tpm: number;
  models: string[];
  trendData: TrendPoint[];
}

// ─── Constants ───────────────────────────────────────────────────────────

const CHANNEL_NAMES = [
  "渠道A-Claude", "渠道B-Gemini", "渠道C-OpenAI", "渠道D-Azure", "渠道E-Claude",
  "渠道F-GPT4", "渠道G-GPT4o", "渠道H-Claude", "渠道I-Claude", "渠道J-Gemini",
  "渠道K-Gemini", "渠道L-Llama", "渠道M-Llama", "渠道N-Mistral", "渠道O-Mistral",
  "渠道P-Qwen", "渠道Q-Qwen", "渠道R-Qwen", "渠道S-Baichuan", "渠道T-Baichuan",
  "渠道U-ChatGLM", "渠道V-ChatGLM", "渠道W-Wenxin", "渠道X-Wenxin", "渠道Y-Spark",
  "渠道Z-Spark", "渠道AA-Hunyuan", "渠道AB-Hunyuan", "渠道AC-Doubao", "渠道AD-Doubao",
  "渠道AE-Kimi", "渠道AF-Kimi", "渠道AG-DeepSeek", "渠道AH-DeepSeek", "渠道AI-Step",
  "渠道AJ-GLM", "渠道AK-MiniMax"
];

const MODEL_NAMES = [
  "gpt-4o", "gpt-4-turbo", "claude-3.5-sonnet", "claude-3-opus", "gemini-1.5-pro",
  "gemini-1.5-flash", "llama-3-70b", "llama-3-8b", "mistral-large", "qwen-max",
  "qwen-plus", "baichuan-4", "chatglm-4", "wenxin-4", "spark-max",
  "hunyuan-pro", "doubao-pro", "kimi-k1.5", "deepseek-v3", "deepseek-r1"
];

const TREND_POINTS = 72; // 6小时 * 12个5分钟点/小时
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟

// ─── Helper Functions ────────────────────────────────────────────────────

// 生成6小时的历史趋势数据（每5分钟一个点）
function generateTrendData(currentSuccessRate: number, currentCacheRate: number): TrendPoint[] {
  const data: TrendPoint[] = [];
  const now = new Date();
  
  // 将当前时间对齐到5分钟边界
  const alignedNow = new Date(now);
  alignedNow.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);
  
  for (let i = TREND_POINTS - 1; i >= 0; i--) {
    const time = new Date(alignedNow.getTime() - i * 5 * 60 * 1000);
    
    // 生成波动数据，越靠近当前越接近期望值
    const progress = (TREND_POINTS - i) / TREND_POINTS;
    const variance = (1 - progress) * 20; // 早期数据波动更大
    
    const successRate = Math.max(0, Math.min(100, 
      currentSuccessRate + (Math.random() - 0.5) * variance * 2
    ));
    const cacheHitRate = Math.max(0, Math.min(100, 
      currentCacheRate + (Math.random() - 0.5) * variance * 2
    ));
    
    data.push({
      time,
      successRate: Math.round(successRate),
      cacheHitRate: Math.round(cacheHitRate),
    });
  }
  
  return data;
}

// 生成36个渠道的模拟数据
function generateChannels(): Channel[] {
  return CHANNEL_NAMES.slice(0, 36).map((name, index) => {
    // 根据用户提供的示例设置特定渠道的数据
    if (name === "渠道A-Claude") {
      const successRate = 25;
      const cacheHitRate = 27;
      return {
        id: `ch-${String(index + 1).padStart(3, "0")}`,
        name,
        status: "error",
        successRate,
        avgResponseTime: 2.3,
        p95Latency: 3.5,
        p99Latency: 4.8,
        requestCount: 3456,
        cacheHitRate,
        rpm: 120,
        tpm: 45000,
        models: ["claude-3.5-sonnet", "claude-3-opus"],
        trendData: generateTrendData(successRate, cacheHitRate),
      };
    }
    if (name === "渠道C-OpenAI") {
      const successRate = 96;
      const cacheHitRate = 85;
      return {
        id: `ch-${String(index + 1).padStart(3, "0")}`,
        name,
        status: "normal",
        successRate,
        avgResponseTime: 1.2,
        p95Latency: 1.8,
        p99Latency: 2.5,
        requestCount: 12345,
        cacheHitRate,
        rpm: 850,
        tpm: 320000,
        models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        trendData: generateTrendData(successRate, cacheHitRate),
      };
    }
    if (name === "渠道B-Gemini") {
      const successRate = 78;
      const cacheHitRate = 40;
      return {
        id: `ch-${String(index + 1).padStart(3, "0")}`,
        name,
        status: "warning",
        successRate,
        avgResponseTime: 1.8,
        p95Latency: 2.8,
        p99Latency: 3.6,
        requestCount: 6789,
        cacheHitRate,
        rpm: 420,
        tpm: 168000,
        models: ["gemini-1.5-pro", "gemini-1.5-flash"],
        trendData: generateTrendData(successRate, cacheHitRate),
      };
    }

    // 随机生成其他渠道数据
    const rand = Math.random();
    let status: ChannelStatus = "normal";
    if (rand < 0.10) status = "error";
    else if (rand < 0.25) status = "warning";
    else if (rand < 0.35) status = "disabled";

    const successRate = status === "error" 
      ? 20 + Math.random() * 30 
      : status === "warning" 
        ? 70 + Math.random() * 15 
        : 90 + Math.random() * 9;
    
    const cacheRate = Math.floor(30 + Math.random() * 60);
    const rpm = Math.floor(50 + Math.random() * 1000);
    const tpm = Math.floor(rpm * 200 + Math.random() * 100000);
    const avgLatency = Number((0.8 + Math.random() * 2.5).toFixed(1));
    const p95 = Number((avgLatency * (1.3 + Math.random() * 0.5)).toFixed(1));
    const p99 = Number((p95 * (1.2 + Math.random() * 0.3)).toFixed(1));

    return {
      id: `ch-${String(index + 1).padStart(3, "0")}`,
      name,
      status,
      successRate: Math.round(successRate),
      avgResponseTime: avgLatency,
      p95Latency: p95,
      p99Latency: p99,
      requestCount: Math.floor(1000 + Math.random() * 50000),
      cacheHitRate: cacheRate,
      rpm,
      tpm,
      models: MODEL_NAMES.slice(Math.floor(Math.random() * 10), Math.floor(Math.random() * 10) + 3),
      trendData: generateTrendData(successRate, cacheRate),
    };
  });
}

// 获取对齐到5分钟边界的当前时间
function getAlignedTime(date: Date): Date {
  const aligned = new Date(date);
  aligned.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
  return aligned;
}

// ─── Components ──────────────────────────────────────────────────────────

// 渠道搜索选择器组件
function ChannelSearchSelect({
  channels,
  selectedChannel,
  onSelect,
}: {
  channels: Channel[];
  selectedChannel: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedChannelName = useMemo(() => {
    if (selectedChannel === "all") return "全部渠道";
    const ch = channels.find((c) => c.id === selectedChannel);
    return ch?.name || "全部渠道";
  }, [selectedChannel, channels]);

  const filteredChannels = useMemo(() => {
    if (!search) return channels;
    return channels.filter((ch) =>
      ch.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [channels, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-44 h-8 justify-between text-xs bg-background font-normal"
        >
          <span className="truncate">{selectedChannelName}</span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0">
        <div className="flex items-center border-b px-2 py-1.5">
          <Search className="mr-2 h-3 w-3 shrink-0 opacity-50" />
          <Input
            placeholder="搜索渠道..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
          />
          {search && (
            <X
              className="ml-1 h-3 w-3 shrink-0 cursor-pointer opacity-50 hover:opacity-100"
              onClick={() => setSearch("")}
            />
          )}
        </div>
        <div className="max-h-48 overflow-y-auto">
          <div
            className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-muted ${
              selectedChannel === "all" ? "bg-muted font-medium" : ""
            }`}
            onClick={() => {
              onSelect("all");
              setOpen(false);
              setSearch("");
            }}
          >
            全部渠道
          </div>
          {filteredChannels.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground text-center">
              未找到渠道
            </div>
          ) : (
            filteredChannels.map((ch) => (
              <div
                key={ch.id}
                className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-muted truncate ${
                  selectedChannel === ch.id ? "bg-muted font-medium" : ""
                }`}
                onClick={() => {
                  onSelect(ch.id);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {ch.name}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// 模型搜索选择器组件
function ModelSearchSelect({
  models,
  selectedModel,
  onSelect,
}: {
  models: string[];
  selectedModel: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedModelName = useMemo(() => {
    if (selectedModel === "all") return "全部模型";
    return selectedModel;
  }, [selectedModel]);

  const filteredModels = useMemo(() => {
    if (!search) return models;
    return models.filter((m) => m.toLowerCase().includes(search.toLowerCase()));
  }, [models, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-44 h-8 justify-between text-xs bg-background font-normal"
        >
          <span className="truncate">{selectedModelName}</span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0">
        <div className="flex items-center border-b px-2 py-1.5">
          <Search className="mr-2 h-3 w-3 shrink-0 opacity-50" />
          <Input
            placeholder="搜索模型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
          />
          {search && (
            <X
              className="ml-1 h-3 w-3 shrink-0 cursor-pointer opacity-50 hover:opacity-100"
              onClick={() => setSearch("")}
            />
          )}
        </div>
        <div className="max-h-48 overflow-y-auto">
          <div
            className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-muted ${
              selectedModel === "all" ? "bg-muted font-medium" : ""
            }`}
            onClick={() => {
              onSelect("all");
              setOpen(false);
              setSearch("");
            }}
          >
            全部模型
          </div>
          {filteredModels.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground text-center">
              未找到模型
            </div>
          ) : (
            filteredModels.map((model) => (
              <div
                key={model}
                className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-muted truncate ${
                  selectedModel === model ? "bg-muted font-medium" : ""
                }`}
                onClick={() => {
                  onSelect(model);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {model}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusBadge({ status }: { status: ChannelStatus }) {
  const config = {
    normal: {
      label: "正常",
      icon: CheckCircle2,
      className: "bg-green-50 text-green-600 border-green-200 hover:bg-green-50",
    },
    warning: {
      label: "警告",
      icon: AlertTriangle,
      className: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50",
    },
    error: {
      label: "异常",
      icon: AlertCircle,
      className: "bg-red-50 text-red-600 border-red-200 hover:bg-red-50",
    },
    disabled: {
      label: "禁用",
      icon: AlertCircle,
      className: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={`gap-1 px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

function MetricBar({ 
  label, 
  value, 
  color = "blue",
  unit = "%",
}: { 
  label: string; 
  value: number; 
  color?: "green" | "blue" | "amber" | "red";
  unit?: string;
}) {
  const colorClasses = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {value}{unit}
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// SVG 趋势折线图组件
function TrendChart({ data }: { data: TrendPoint[] }) {
  const height = 100;
  const padding = { top: 22, right: 10, bottom: 18, left: 38 };
  
  // 使用百分比宽度计算
  const chartWidthPercent = 100;
  const paddingLeftPercent = (padding.left / 300) * 100; // 基于300px参考宽度
  const paddingRightPercent = (padding.right / 300) * 100;
  const chartInnerWidthPercent = chartWidthPercent - paddingLeftPercent - paddingRightPercent;

  const { successPath, cachePath, yTicks, timeLabels, viewBoxWidth } = useMemo(() => {
    if (data.length === 0) return { successPath: "", cachePath: "", yTicks: [], timeLabels: [], viewBoxWidth: 300 };

    const minValue = 0;
    const maxValue = 100;
    const width = 300; // SVG viewBox 宽度
    const chartHeight = height - padding.top - padding.bottom;
    const chartW = width - padding.left - padding.right;
    
    // Y轴刻度
    const yTicks = [0, 50, 100];

    // 生成路径
    const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartW;
    const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

    // 生成平滑曲线
    const generateSmoothPath = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return "";
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (curr.x - prev.x) * 0.3;
        const cpx2 = curr.x - (curr.x - prev.x) * 0.3;
        path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
      }
      
      return path;
    };

    const successPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.successRate) }));
    const cachePoints = data.map((d, i) => ({ x: getX(i), y: getY(d.cacheHitRate) }));

    // 时间标签 - 显示整点
    const labels: { index: number; label: string; x: number }[] = [];
    const firstTime = data[0].time.getTime();
    const lastTime = data[data.length - 1].time.getTime();
    
    // 找到第一个整点
    const firstHour = new Date(firstTime);
    firstHour.setMinutes(0, 0, 0);
    if (firstHour.getTime() < firstTime) {
      firstHour.setHours(firstHour.getHours() + 1);
    }
    
    // 添加整点标签
    for (let t = firstHour.getTime(); t <= lastTime; t += 60 * 60 * 1000) {
      const hourDate = new Date(t);
      const hourLabel = hourDate.getHours().toString().padStart(2, '0') + ':00';
      
      // 找到最接近的索引
      let closestIndex = 0;
      let minDiff = Infinity;
      for (let i = 0; i < data.length; i++) {
        const diff = Math.abs(data[i].time.getTime() - t);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
      
      labels.push({
        index: closestIndex,
        label: hourLabel,
        x: getX(closestIndex),
      });
    }

    return {
      successPath: generateSmoothPath(successPoints),
      cachePath: generateSmoothPath(cachePoints),
      yTicks,
      timeLabels: labels,
      viewBoxWidth: width,
    };
  }, [data, height, padding.top, padding.bottom, padding.left, padding.right]);

  return (
    <div className="pt-1">
      <svg width="100%" height={height} viewBox={`0 0 ${viewBoxWidth} ${height}`} preserveAspectRatio="none">
        {/* Y轴网格线和标签 */}
        {yTicks.map((tick) => {
          const chartH = height - padding.top - padding.bottom;
          const y = padding.top + chartH - (tick / 100) * chartH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={viewBoxWidth - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="#9ca3af"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* 成功率折线 */}
        <path
          d={successPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 缓存率折线 */}
        <path
          d={cachePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X轴时间标签（整点） */}
        {timeLabels.map(({ index, label, x }) => (
          <text
            key={index}
            x={x}
            y={height - 4}
            textAnchor="middle"
            fontSize="9"
            fill="#9ca3af"
          >
            {label}
          </text>
        ))}

        {/* 图例 - 右上角 */}
        <g transform={`translate(${viewBoxWidth - 115}, 10)`}>
          {/* 成功率图例 */}
          <line x1="0" y1="0" x2="10" y2="0" stroke="#22c55e" strokeWidth={1.5} />
          <text x="13" y="3" fontSize="9" fill="#6b7280">成功率</text>
          
          {/* 缓存命中率图例 */}
          <line x1="46" y1="0" x2="56" y2="0" stroke="#3b82f6" strokeWidth={1.5} />
          <text x="59" y="3" fontSize="9" fill="#6b7280">缓存命中率</text>
        </g>
      </svg>
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  // 根据状态决定进度条颜色
  const getSuccessRateColor = (rate: number): "green" | "amber" | "red" => {
    if (rate >= 90) return "green";
    if (rate >= 70) return "amber";
    return "red";
  };

  // 缓存命中率始终使用蓝色
  const successRateColor = getSuccessRateColor(channel.successRate);
  
  // 缓存命中率颜色根据值变化（使用指定色号）
  const getCacheColor = (rate: number): string => {
    if (rate >= 90) return "#1D39C4"; // 深蓝色
    if (rate >= 80) return "#1890FF"; // 中蓝色
    return "#91D5FF"; // 浅蓝色
  };
  const cacheColorValue = getCacheColor(channel.cacheHitRate);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              channel.status === "normal" ? "bg-green-500" : 
              channel.status === "warning" ? "bg-amber-500" : 
              channel.status === "error" ? "bg-red-500" : "bg-gray-400"
            }`} />
            <h3 className="font-semibold text-sm text-foreground truncate" title={channel.name}>
              {channel.name}
            </h3>
          </div>
          <StatusBadge status={channel.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4 space-y-4">
        {/* 关键指标 - 5列布局 */}
        <div className="grid grid-cols-5 gap-2 text-sm">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">请求次数</p>
            <p className="font-semibold text-foreground text-xs">{channel.requestCount.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">RPM</p>
            <p className="font-semibold text-foreground text-xs">{channel.rpm.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">TPM</p>
            <p className="font-semibold text-foreground text-xs">{(channel.tpm / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">平均首字响应</p>
            <p className="font-semibold text-xs text-foreground">{channel.avgResponseTime}s</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground mb-0.5">P95 / P99</p>
            <p className="font-semibold text-xs text-foreground">{channel.p95Latency}s / {channel.p99Latency}s</p>
          </div>
        </div>

        {/* 进度条指标 */}
        <div className="space-y-3">
          <MetricBar 
            label="成功率" 
            value={channel.successRate} 
            color={successRateColor}
            unit="%"
          />
          {/* 缓存命中率 - 使用动态颜色 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">缓存命中率</span>
              <span className="font-medium text-foreground">{channel.cacheHitRate}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(channel.cacheHitRate, 100)}%`, backgroundColor: cacheColorValue }}
              />
            </div>
          </div>
        </div>

        {/* 趋势折线图 */}
        <div className="border-t pt-3 mt-3">
          <TrendChart data={channel.trendData} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function AdminChannelMonitor() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(getAlignedTime(new Date()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // 初始化数据
  useEffect(() => {
    const data = generateChannels();
    setChannels(data);
    setFilteredChannels(data);
  }, []);

  // 自动刷新（每5分钟）
  useEffect(() => {
    const checkAndRefresh = () => {
      const now = new Date();
      const alignedNow = getAlignedTime(now);
      
      // 如果当前对齐时间大于上次更新时间，则刷新
      if (alignedNow.getTime() > lastUpdateTime.getTime()) {
        handleRefresh();
      }
    };

    // 每分钟检查一次是否需要刷新
    const interval = setInterval(checkAndRefresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  // 筛选和排序逻辑
  useEffect(() => {
    let result = [...channels];

    if (selectedChannel !== "all") {
      result = result.filter(ch => ch.id === selectedChannel);
    }

    if (selectedModel !== "all") {
      result = result.filter(ch => ch.models.includes(selectedModel));
    }

    if (selectedStatus !== "all") {
      result = result.filter(ch => ch.status === selectedStatus);
    }

    // 排序：①按状态优先级（异常 > 警告 > 正常 > 禁用）②同状态下按名称A-Z
    const statusPriority: Record<ChannelStatus, number> = {
      error: 0,
      warning: 1,
      normal: 2,
      disabled: 3,
    };

    result.sort((a, b) => {
      // 先按状态优先级排序
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同状态下按名称字母序排序
      return a.name.localeCompare(b.name, "en");
    });

    setFilteredChannels(result);
  }, [selectedChannel, selectedModel, selectedStatus, channels]);

  // 刷新数据
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const data = generateChannels();
      setChannels(data);
      setLastUpdateTime(getAlignedTime(new Date()));
      setIsRefreshing(false);
    }, 800);
  };

  // 格式化时间（5分钟粒度）
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 统计信息
  const stats = {
    total: channels.length,
    normal: channels.filter(c => c.status === "normal").length,
    warning: channels.filter(c => c.status === "warning").length,
    error: channels.filter(c => c.status === "error").length,
    disabled: channels.filter(c => c.status === "disabled").length,
  };

  return (
    <div className="p-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            渠道监控
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控上游渠道运行状态（每5分钟更新）
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* 状态统计 */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">异常</span>
              <span className="font-medium text-foreground">{stats.error}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">警告</span>
              <span className="font-medium text-foreground">{stats.warning}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">正常</span>
              <span className="font-medium text-foreground">{stats.normal}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-muted-foreground">禁用</span>
              <span className="font-medium text-foreground">{stats.disabled}</span>
            </div>
          </div>
          
          {/* 更新时间 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>更新于 {formatTime(lastUpdateTime)}</span>
          </div>
          
          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>筛选:</span>
        </div>
        
        {/* 渠道搜索选择器 */}
        <ChannelSearchSelect
          channels={channels}
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
        />

        {/* 模型搜索选择器 */}
        <ModelSearchSelect
          models={MODEL_NAMES}
          selectedModel={selectedModel}
          onSelect={setSelectedModel}
        />

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-32 h-8 text-xs bg-background">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">全部状态</SelectItem>
            <SelectItem value="error" className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                异常
              </div>
            </SelectItem>
            <SelectItem value="warning" className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                警告
              </div>
            </SelectItem>
            <SelectItem value="normal" className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                正常
              </div>
            </SelectItem>
            <SelectItem value="disabled" className="text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                禁用
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {(selectedChannel !== "all" || selectedModel !== "all" || selectedStatus !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSelectedChannel("all");
              setSelectedModel("all");
              setSelectedStatus("all");
            }}
          >
            清除筛选
          </Button>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          共 {filteredChannels.length} 个渠道
        </div>
      </div>

      {/* Channel Cards Grid */}
      {filteredChannels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Activity className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">暂无符合条件的渠道</p>
          <Button
            variant="link"
            size="sm"
            className="mt-2"
            onClick={() => {
              setSelectedChannel("all");
              setSelectedModel("all");
              setSelectedStatus("all");
            }}
          >
            清除筛选条件
          </Button>
        </div>
      )}
    </div>
  );
}
