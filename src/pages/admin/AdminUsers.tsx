import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, X, UserCircle, Eye, EyeOff, Shield, ChevronDown, RotateCcw, Check, Download, GripVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { addDemoUser, getResellerDemoState, getResellerName, migrateUser, preflightUserMigration, rechargeCustomer, setCustomerDiscount, setDemoUserStatus } from "@/lib/resellerDemo";

interface EnterpriseRef { id: string; name: string; role: string; enterprise_type?: "formal" | "test"; }

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  status: string;
  enterprises: EnterpriseRef[];
  personal_balance: number;
  personal_credit_balance: number;
  personal_total: number;
  group: string;
  role: string;
  invite_count: number;
  invite_revenue: number;
  inviter: string | null;
  user_type?: "formal" | "test";
  reseller_code?: string | null;
}

interface MemberDetail {
  id: string;
  enterprise_id: string;
  enterprise_name: string;
  org_name: string | null;
  role: string;
}

interface DrawerDetail {
  personal_enterprise_id: string | null;
  personal_balance: number;
  personal_credit_balance: number;
  personal_total: number;
  members: MemberDetail[];
}

const MODEL_ACCESS_OPTIONS = [
  { value: "国内", label: "国内" },
  { value: "国际", label: "国际" },
];



// 备注类型选项
const REMARK_TYPE_OPTIONS = ["正式用户", "内结用户", "测试用户", "测试用户（付费）", "研发", "演示", "其他"];

// 绿色标签组件 - 用户标签
function GreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}
    </span>
  );
}

// 绿色标签组件 - 企业标签
function EnterpriseGreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}
    </span>
  );
}

// 分组模板选项
const TEMPLATE_OPTIONS = [
  {
    value: "default",
    name: "default",
    remark: "默认分组",
    description: "全量基础通道",
    availableGroups: [
      { name: "openai-fast", rate: 1, desc: "OpenAI 高速通道" },
      { name: "gemini-fast", rate: 1, desc: "Gemini 高速通道" },
      { name: "claude-fast", rate: 1, desc: "Claude 高速通道" },
      { name: "grok-fast", rate: 1, desc: "Grok 高速通道" },
      { name: "qwen", rate: 1, desc: "通义千问通道" },
      { name: "glm", rate: 1, desc: "GLM 通道" },
      { name: "deepseek", rate: 1, desc: "DeepSeek 通道" },
      { name: "kimi", rate: 1, desc: "Kimi 通道" },
    ],
  },
  {
    value: "vip-cd",
    name: "vip-cd",
    remark: "VIP-CD 模板",
    description: "VIP 客户优选通道",
    availableGroups: [
      { name: "openai-fast", rate: 0.9, desc: "OpenAI 高速通道" },
      { name: "claude-fast", rate: 0.95, desc: "Claude 高速通道" },
      { name: "gemini-fast", rate: 0.85, desc: "Gemini 高速通道" },
      { name: "qwen", rate: 0.7, desc: "通义千问通道" },
    ],
  },
  {
    value: "vip-md",
    name: "vip-md",
    remark: "VIP-MD 模板",
    description: "VIP 中度折扣",
    availableGroups: [
      { name: "openai-fast", rate: 0.85, desc: "OpenAI 高速通道" },
      { name: "claude-fast", rate: 0.9, desc: "Claude 高速通道" },
      { name: "deepseek", rate: 1, desc: "DeepSeek 通道" },
      { name: "glm", rate: 1, desc: "GLM 通道" },
    ],
  },
  {
    value: "vip-cr",
    name: "vip-cr",
    remark: "VIP-CR 模板",
    description: "VIP 全量通道",
    availableGroups: [
      { name: "openai-fast", rate: 0.88, desc: "OpenAI 高速通道" },
      { name: "claude-fast", rate: 0.92, desc: "Claude 高速通道" },
      { name: "gemini-fast", rate: 1, desc: "Gemini 高速通道" },
      { name: "grok-fast", rate: 1, desc: "Grok 高速通道" },
      { name: "qwen", rate: 1, desc: "通义千问通道" },
      { name: "glm", rate: 1, desc: "GLM 通道" },
      { name: "deepseek", rate: 1, desc: "DeepSeek 通道" },
      { name: "kimi", rate: 1, desc: "Kimi 通道" },
    ],
  },
];

// 代理商选项
const AGENT_OPTIONS = [
  { value: "agent-001", label: "代理商A" },
  { value: "agent-002", label: "代理商B" },
  { value: "agent-003", label: "代理商C" },
];

// 所有可配置的基础令牌分组
const ALL_BASE_GROUPS = [
  { name: "openai-fast", desc: "OpenAI 高速通道", defaultRate: 1 },
  { name: "gemini-fast", desc: "Gemini 高速通道", defaultRate: 1 },
  { name: "claude-fast", desc: "Claude 高速通道", defaultRate: 1 },
  { name: "claude-basic", desc: "Claude 基础通道", defaultRate: 1 },
  { name: "grok-fast", desc: "Grok 高速通道", defaultRate: 1 },
  { name: "qwen", desc: "通义千问通道", defaultRate: 1 },
  { name: "glm", desc: "GLM 通道", defaultRate: 1 },
  { name: "glm-zhipu", desc: "智谱 GLM 通道", defaultRate: 1 },
  { name: "deepseek", desc: "DeepSeek 通道", defaultRate: 1 },
  { name: "kimi", desc: "Kimi 通道", defaultRate: 1 },
  { name: "minimax", desc: "MiniMax 通道", defaultRate: 1 },
];

// 返券配置使用的分组选项（兼容旧格式）
const VOUCHER_GROUP_OPTIONS = [
  ...ALL_BASE_GROUPS.map((g) => ({ value: g.name, name: g.name, remark: g.desc, models: [g.desc], discountChannels: `${g.desc} (x1)`, rebateEnabled: false })),
];

// 自定义分组条目类型
interface CustomGroupEntry { available: boolean; rate: number; }

// 历史分组选项（对应 GroupRateSettings 中 category=historical 的分组）
const HISTORICAL_GROUP_OPTIONS = [
  { value: "default-fast", label: "default-fast", remark: "", availableGroups: [
    { name: "openai-fast", desc: "OpenAI 高速通道", rate: 1 },
    { name: "gemini-fast", desc: "Gemini 高速通道", rate: 1 },
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
    { name: "grok-fast", desc: "Grok 高速通道", rate: 1 },
  ]},
  { value: "gemini-test", label: "gemini-test", remark: "", availableGroups: [
    { name: "gemini-fast", desc: "Gemini 高速通道", rate: 1 },
  ]},
  { value: "claude-test", label: "claude-test", remark: "", availableGroups: [
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
  ]},
  { value: "claude-official-test", label: "claude-official-test", remark: "", availableGroups: [
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
  ]},
  { value: "guochan-test", label: "guochan-test", remark: "", availableGroups: [
    { name: "qwen", desc: "通义千问通道", rate: 1 },
    { name: "glm", desc: "GLM 通道", rate: 1 },
    { name: "deepseek", desc: "DeepSeek 通道", rate: 1 },
  ]},
  { value: "glm-test", label: "glm-test", remark: "", availableGroups: [
    { name: "glm", desc: "GLM 通道", rate: 1 },
    { name: "glm-zhipu", desc: "智谱 GLM 通道", rate: 1 },
  ]},
  { value: "claude-fast-only", label: "claude-fast-only", remark: "", availableGroups: [
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
  ]},
  { value: "claude-fast-test", label: "claude-fast-test", remark: "", availableGroups: [
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
    { name: "claude-basic", desc: "Claude 基础通道", rate: 1 },
  ]},
  { value: "youai-test", label: "youai-test", remark: "", availableGroups: [
    { name: "qwen", desc: "通义千问通道", rate: 1 },
  ]},
  { value: "vip-vnet", label: "vip-vnet", remark: "", availableGroups: [
    { name: "openai-fast", desc: "OpenAI 高速通道", rate: 1 },
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
    { name: "gemini-fast", desc: "Gemini 高速通道", rate: 1 },
    { name: "grok-fast", desc: "Grok 高速通道", rate: 1 },
    { name: "qwen", desc: "通义千问通道", rate: 1 },
    { name: "glm", desc: "GLM 通道", rate: 1 },
    { name: "deepseek", desc: "DeepSeek 通道", rate: 1 },
    { name: "kimi", desc: "Kimi 通道", rate: 1 },
  ]},
  { value: "basic", label: "basic", remark: "", availableGroups: [
    { name: "openai-fast", desc: "OpenAI 高速通道", rate: 1 },
    { name: "gemini-fast", desc: "Gemini 高速通道", rate: 1 },
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
    { name: "grok-fast", desc: "Grok 高速通道", rate: 1 },
    { name: "qwen", desc: "通义千问通道", rate: 1 },
    { name: "glm", desc: "GLM 通道", rate: 1 },
    { name: "deepseek", desc: "DeepSeek 通道", rate: 1 },
    { name: "kimi", desc: "Kimi 通道", rate: 1 },
  ]},
  { value: "vip-dp", label: "vip-dp", remark: "", availableGroups: [
    { name: "openai-fast", desc: "OpenAI 高速通道", rate: 1 },
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
    { name: "gemini-fast", desc: "Gemini 高速通道", rate: 1 },
    { name: "qwen", desc: "通义千问通道", rate: 1 },
  ]},
  { value: "vip-pp", label: "vip-pp", remark: "", availableGroups: [
    { name: "openai-fast", desc: "OpenAI 高速通道", rate: 1 },
    { name: "claude-fast", desc: "Claude 高速通道", rate: 1 },
    { name: "deepseek", desc: "DeepSeek 通道", rate: 1 },
    { name: "glm", desc: "GLM 通道", rate: 1 },
  ]},
  { value: "vip-st", label: "vip-st", remark: "", availableGroups: [
    { name: "openai-fast", desc: "OpenAI 高速通道", rate: 0.88 },
    { name: "claude-fast", desc: "Claude 高速通道", rate: 0.92 },
    { name: "gemini-fast", desc: "Gemini 高速通道", rate: 1 },
    { name: "grok-fast", desc: "Grok 高速通道", rate: 1 },
    { name: "qwen", desc: "通义千问通道", rate: 1 },
    { name: "glm", desc: "GLM 通道", rate: 1 },
    { name: "deepseek", desc: "DeepSeek 通道", rate: 1 },
    { name: "kimi", desc: "Kimi 通道", rate: 1 },
  ]},
];

// 分组配置选择器组件（模板 / 自定义 / 全部分组）
function GroupConfigSelector({
  groupMode,
  setGroupMode,
  selectedTemplate,
  setSelectedTemplate,
  selectedHistoricalGroup,
  setSelectedHistoricalGroup,
  customGroups,
  setCustomGroups,
}: {
  groupMode: "template" | "custom" | "all";
  setGroupMode: (mode: "template" | "custom" | "all") => void;
  selectedTemplate: string;
  setSelectedTemplate: (value: string) => void;
  selectedHistoricalGroup: string;
  setSelectedHistoricalGroup: (value: string) => void;
  customGroups: Record<string, CustomGroupEntry>;
  setCustomGroups: (groups: Record<string, CustomGroupEntry>) => void;
}) {
  // 二级弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomGroups, setEditingCustomGroups] = useState<Record<string, CustomGroupEntry>>({});
  const [customBaseTemplate, setCustomBaseTemplate] = useState("__none__");
  const [pendingBaseTemplate, setPendingBaseTemplate] = useState("__none__");
  const [importedBaseTemplate, setImportedBaseTemplate] = useState("__none__");
  const [customBaselineGroups, setCustomBaselineGroups] = useState<Record<string, CustomGroupEntry>>({});
  const [showTemplateCopy, setShowTemplateCopy] = useState(false);
  const [hasImportedTemplate, setHasImportedTemplate] = useState(false);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const activeTemplate = TEMPLATE_OPTIONS.find((t) => t.value === selectedTemplate);

  const buildCustomGroupsFromTemplate = (templateValue: string) => {
    const template = TEMPLATE_OPTIONS.find((item) => item.value === templateValue);
    const templateGroups = new Map(template?.availableGroups.map((item) => [item.name, item.rate]) ?? []);
    return Object.fromEntries(
      ALL_BASE_GROUPS.map((group) => [
        group.name,
        {
          available: templateGroups.has(group.name),
          rate: templateGroups.get(group.name) ?? group.defaultRate,
        },
      ])
    );
  };

  // 打开自定义分组弹窗前，快照当前数据
  const handleOpenDialog = () => {
    if (Object.keys(customGroups).length > 0) {
      setEditingCustomGroups({ ...customGroups });
      setPendingBaseTemplate(customBaseTemplate);
      setImportedBaseTemplate(customBaseTemplate);
      setCustomBaselineGroups(
        customBaseTemplate === "__none__" ? {} : buildCustomGroupsFromTemplate(customBaseTemplate)
      );
      setShowTemplateCopy(true);
      setHasImportedTemplate(customBaseTemplate !== "__none__");
    } else {
      setPendingBaseTemplate("__none__");
      setImportedBaseTemplate("__none__");
      const initialGroups = Object.fromEntries(
        ALL_BASE_GROUPS.map((group) => [
          group.name,
          { available: false, rate: group.defaultRate },
        ])
      );
      setEditingCustomGroups(initialGroups);
      setCustomBaselineGroups({});
      setShowTemplateCopy(true);
      setHasImportedTemplate(false);
    }
    setDialogOpen(true);
    setGroupOrder([...ALL_BASE_GROUPS].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")).map((g) => g.name));
  };
  const handleSaveCustomDialog = () => {
    const validEntries = Object.fromEntries(
      Object.entries(editingCustomGroups).filter(([, entry]) => entry.available)
    );
    setCustomGroups(validEntries);
    setCustomBaseTemplate(importedBaseTemplate);
    setShowTemplateCopy(false);
    setHasImportedTemplate(false);
    setCustomBaselineGroups({});
    setDialogOpen(false);
  };

  // 取消二级弹窗
  const handleCancelCustomDialog = () => {
    setShowTemplateCopy(false);
    setHasImportedTemplate(false);
    setCustomBaselineGroups({});
    setDialogOpen(false);
  };

  // 在弹窗中切换某个分组的可用性
  const toggleAvailableInDialog = (name: string, checked: boolean) => {
    setEditingCustomGroups((prev) => ({
      ...prev,
      [name]: { ...prev[name], available: checked },
    }));
  };

  // 在弹窗中修改倍率
  const updateRateInDialog = (name: string, val: number) => {
    setEditingCustomGroups((prev) => ({
      ...prev,
      [name]: { ...prev[name], rate: val },
    }));
  };

  // ── 渲染：模板模式的分组列表（按名称排序） ──
  const templateGroupItems = activeTemplate
    ? [...activeTemplate.availableGroups]
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
        .map((g) => ({ key: `tpl-${g.name}`, name: g.name, desc: g.desc, rate: g.rate }))
    : [];

  // ── 渲染：全部分组（历史分组）模式的分组列表（按名称排序） ──
  const selectedHistoricalOption = HISTORICAL_GROUP_OPTIONS.find((h) => h.value === selectedHistoricalGroup);
  const historicalGroupItems = selectedHistoricalOption?.availableGroups
    ? [...selectedHistoricalOption.availableGroups]
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
        .map((g) => ({ key: `his-${g.name}`, name: g.name, desc: g.desc, rate: g.rate }))
    : [];

  // ── 渲染：自定义模式的分组列表（按名称排序） ──
  const enabledCount = Object.values(customGroups).filter((e) => e.available).length;
  const savedTemplateDiffCount = customBaseTemplate === "__none__"
    ? 0
    : (() => {
        const savedBaseline = buildCustomGroupsFromTemplate(customBaseTemplate);
        return ALL_BASE_GROUPS.filter((group) => {
          const current = customGroups[group.name] ?? { available: false, rate: group.defaultRate };
          const baseline = savedBaseline[group.name] ?? { available: false, rate: group.defaultRate };
          return current.available !== baseline.available || current.rate !== baseline.rate;
        }).length;
      })();
  const customGroupItems = Object.entries(customGroups)
    .filter(([, e]) => e.available)
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))
    .map(([name, e]) => ({ key: `cus-${name}`, name, desc: undefined as string | undefined, rate: e.rate }));

  return (
    <div className="space-y-3">
      {/* 模式切换：Radio 样式 */}
      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
              groupMode === "template"
                ? "border-blue-500"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => setGroupMode("template")}
          >
            {groupMode === "template" && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </span>
          <span
            className={`text-sm ${groupMode === "template" ? "text-foreground font-medium" : "text-muted-foreground"}`}
            onClick={() => setGroupMode("template")}
          >
            分组模板
          </span>
        </label>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                groupMode === "custom"
                  ? "border-blue-500"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onClick={() => setGroupMode("custom")}
            >
              {groupMode === "custom" && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </span>
            <span
              className={`text-sm ${groupMode === "custom" ? "text-foreground font-medium" : "text-muted-foreground"}`}
              onClick={() => setGroupMode("custom")}
            >
              自定义分组
            </span>
          </label>
          {groupMode === "custom" && (
            <button
              type="button"
              onClick={handleOpenDialog}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              去配置
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
              groupMode === "all"
                ? "border-blue-500"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => { setGroupMode("all"); if (!selectedHistoricalGroup) setSelectedHistoricalGroup(HISTORICAL_GROUP_OPTIONS[0]?.value || ""); }}
          >
            {groupMode === "all" && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </span>
          <span
            className={`text-sm ${groupMode === "all" ? "text-foreground font-medium" : "text-muted-foreground"}`}
            onClick={() => { setGroupMode("all"); if (!selectedHistoricalGroup) setSelectedHistoricalGroup(HISTORICAL_GROUP_OPTIONS[0]?.value || ""); }}
          >
            全部分组
          </span>
        </label>
      </div>

      {/* ── 模板模式 ── */}
      {groupMode === "template" && (
        <div className="space-y-2">
          <select
            className="w-full h-9 px-3 border border-gray-200 rounded-md bg-white text-sm"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.name} ({t.remark})
              </option>
            ))}
          </select>
          {activeTemplate && (
            <div className="border border-gray-200 rounded-md bg-white p-2 max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1 sticky top-0 bg-white">
                对应令牌分组（{templateGroupItems.length}）：
              </p>
              <ul className="space-y-1">
                {templateGroupItems.map((g) => (
                  <li key={g.key} className="text-xs text-muted-foreground">
                    {g.name}
                    {g.desc ? ` ${g.desc}` : ""}
                    （x{g.rate}）
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 全部分组模式：历史分组选择 ── */}
      {groupMode === "all" && (
        <div className="space-y-2">
          <select
            className="w-full h-9 px-3 border border-gray-200 rounded-md bg-white text-sm"
            value={selectedHistoricalGroup}
            onChange={(e) => setSelectedHistoricalGroup(e.target.value)}
          >
            {HISTORICAL_GROUP_OPTIONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
          {selectedHistoricalGroup && historicalGroupItems.length > 0 && (
            <div className="border border-gray-200 rounded-md bg-white p-2 max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1 sticky top-0 bg-white">
                对应令牌分组（{historicalGroupItems.length}）：
              </p>
              <ul className="space-y-1">
                {historicalGroupItems.map((g) => (
                  <li key={g.key} className="text-xs text-muted-foreground">
                    {g.name}
                    {g.desc ? ` ${g.desc}` : ""}
                    （x{g.rate}）
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!selectedHistoricalGroup && (
            <p className="text-xs text-muted-foreground">选择一个历史分组，该分组将作为用户/企业的默认分组</p>
          )}
        </div>
      )}

      {/* ── 自定义模式：分组列表 ── */}
      {groupMode === "custom" && enabledCount > 0 && (
        <div className="border border-gray-200 rounded-md bg-white p-2 max-h-32 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-1 sticky top-0 bg-white">
            已自定义配置 {enabledCount} 个令牌分组：
          </p>
          <ul className="space-y-1">
            {customGroupItems.map((g) => (
              <li key={g.key} className="text-xs text-muted-foreground">
                {g.name}（x{g.rate}）
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 自定义分组配置二级弹窗 ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleCancelCustomDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置自定义分组</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground mb-3">
            可选择模板对比当前配置；只有点击“导入模板”才会替换当前表单。
          </p>

          {showTemplateCopy && (
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 mb-3 space-y-2">
            <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-sm font-medium text-foreground">从模板复制</p>
              <p className="text-xs text-muted-foreground">
                基于模板：{customBaseTemplate === "__none__"
                  ? "未使用"
                  : `${TEMPLATE_OPTIONS.find((item) => item.value === customBaseTemplate)?.name ?? customBaseTemplate}，差异 ${savedTemplateDiffCount} 项`}
              </p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground shrink-0">查看对比</span>
            <select
              className="h-9 min-w-52 rounded-md border border-input bg-background px-3 text-sm"
              value={pendingBaseTemplate}
              onChange={(e) => {
                const templateValue = e.target.value;
                setPendingBaseTemplate(templateValue);
                if (templateValue === "__none__") {
                  setCustomBaselineGroups({});
                  setHasImportedTemplate(false);
                  setImportedBaseTemplate("__none__");
                } else {
                  setCustomBaselineGroups(buildCustomGroupsFromTemplate(templateValue));
                  setHasImportedTemplate(true);
                }
              }}
            >
              <option value="__none__">不使用模板</option>
              {TEMPLATE_OPTIONS.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.name}（{template.remark}）
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={pendingBaseTemplate === "__none__"}
              onClick={() => {
                const nextGroups = buildCustomGroupsFromTemplate(pendingBaseTemplate);
                setEditingCustomGroups(nextGroups);
                setImportedBaseTemplate(pendingBaseTemplate);
              }}
            >
              导入模板
            </Button>
            </div>
          </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1.5 w-[32px]"></th>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">基础令牌分组</th>
                  <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[90px]">是否可用</th>
                  <th className="px-3 py-1.5 text-right font-medium text-muted-foreground w-[90px]">当前倍率</th>
                  <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[90px]">模板配置</th>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">描述/模型系列</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groupOrder.map((groupName, index) => {
                  const bg = ALL_BASE_GROUPS.find((g) => g.name === groupName);
                  if (!bg) return null;
                  const entry = editingCustomGroups[bg.name] ?? { available: false, rate: bg.defaultRate };
                  const baseline = customBaselineGroups[bg.name] ?? entry;
                  return (
                    <tr
                      key={bg.name}
                      draggable
                      onDragStart={() => setDraggedIndex(index)}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={() => {
                        if (draggedIndex === null || draggedIndex === index) return;
                        const newOrder = [...groupOrder];
                        const [moved] = newOrder.splice(draggedIndex, 1);
                        newOrder.splice(index, 0, moved);
                        setGroupOrder(newOrder);
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                      className={`${entry.available ? "" : "opacity-45"} hover:bg-muted/30 ${draggedIndex === index ? "opacity-30" : ""} cursor-grab active:cursor-grabbing`}
                    >
                      <td className="px-2 py-1.5 text-center text-muted-foreground/50">
                        <GripVertical className="w-4 h-4 mx-auto" />
                      </td>
                      <td className="px-3 py-1.5 font-medium">{bg.name}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Checkbox
                          checked={entry.available}
                          onCheckedChange={(v) => toggleAvailableInDialog(bg.name, !!v)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <Input
                          type="number"
                          step={0.05}
                          min={0.01}
                          disabled={!entry.available}
                          value={entry.rate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateRateInDialog(bg.name, isNaN(val) ? 1 : val);
                          }}
                          className={`h-7 text-sm w-full text-right ${!entry.available ? "opacity-40 cursor-not-allowed bg-muted" : ""}`}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">
                        {!hasImportedTemplate ? "—" : baseline.available ? `×${baseline.rate}` : "未启用"}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground text-xs">{bg.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCustomDialog}>取消</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveCustomDialog}
            >
              确认配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Multi-select dropdown component for model access
function ModelAccessSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tagValue: string) => {
    if (value.includes(tagValue)) {
      onChange(value.filter((v) => v !== tagValue));
    } else {
      onChange([...value, tagValue]);
    }
  };

  const removeTag = (tagValue: string) => {
    onChange(value.filter((v) => v !== tagValue));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[40px] px-3 py-2 border rounded-md bg-white flex items-center justify-between gap-2 hover:border-gray-400 transition-colors"
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground text-sm">请选择模型访问权限</span>
          ) : (
            value.map((tag) => (
              <Badge
                key={tag}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 text-xs flex items-center gap-1"
              >
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                />
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg py-1">
            {MODEL_ACCESS_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                  value.includes(option.value) ? "bg-blue-50/50" : ""
                }`}
                onClick={() => toggleTag(option.value)}
              >
                <span className="text-sm">{option.label}</span>
                {value.includes(option.value) && (
                  <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUsers({ resellerScopeId }: { resellerScopeId?: string } = {}) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [tokenGroupFilter, setTokenGroupFilter] = useState<string>("all");
  const [tokenGroupSearchQuery, setTokenGroupSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [resellerFilter, setResellerFilter] = useState<string>("all");
  const [demoRevision, setDemoRevision] = useState(0);
  const demoState = (() => { void demoRevision; return getResellerDemoState(); })();
  const enabledResellers = demoState.resellers.filter((item) => item.status === "enabled");
  const [migrationTarget, setMigrationTarget] = useState<UserRow | null>(null);
  const [migrationResellerId, setMigrationResellerId] = useState("direct");
  const [migrationReason, setMigrationReason] = useState("");
  const [migrationChecked, setMigrationChecked] = useState(false);

  // 标签类型选项
  const TAG_TYPE_OPTIONS = [
    { value: "all", label: "全部标签" },
    { value: "正式用户", label: "正式用户" },
    { value: "内结用户", label: "内结用户" },
    { value: "测试用户", label: "测试用户" },
    { value: "测试用户（付费）", label: "测试用户（付费）" },
    { value: "研发", label: "研发" },
    { value: "演示", label: "演示" },
    { value: "其他", label: "其他" },
    { value: "none", label: "无标签" },
  ];

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<DrawerDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editBalance, setEditBalance] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  // Recharge dialog state
  const [rechargeTarget, setRechargeTarget] = useState<UserRow | null>(null);
  const [rechargeType, setRechargeType] = useState<"balance" | "credit">("balance");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<UserRow | null>(null);
  const [discountValue, setDiscountValue] = useState("100");

  const openRechargeDialog = (user: UserRow) => {
    setRechargeTarget(user);
    setRechargeType("balance");
    setRechargeAmount("");
    setRechargeRemark("");
  };

  const handleRecharge = async () => {
    if (!rechargeTarget || rechargeAmount === "" || rechargeAmount === null) return;
    const inputVal = parseFloat(rechargeAmount);
    if (isNaN(inputVal)) {
      toast({ title: "请输入有效金额", variant: "destructive" });
      return;
    }
    if (resellerScopeId && inputVal <= 0) {
      toast({ title: "划拨金额必须大于 0", variant: "destructive" });
      return;
    }
    setRechargeLoading(true);
    try {
      const currentBalance = rechargeType === "balance" ? rechargeTarget.personal_balance : (rechargeTarget.personal_credit_balance || 0);
      // 授信模式：输入值为目标剩余额度，delta = 目标 - 当前
      const delta = rechargeType === "balance" ? inputVal : inputVal - currentBalance;
      const newBalance = currentBalance + delta;
      if (resellerScopeId) {
        if (rechargeType !== "balance") throw new Error("代理商仅可使用账户余额给客户充值");
        rechargeCustomer({ resellerId: resellerScopeId, amount: inputVal, targetType: "user", targetId: rechargeTarget.phone, targetName: rechargeTarget.name || rechargeTarget.phone, remark: rechargeRemark.trim() });
        setDemoRevision((value) => value + 1);
      }
      await new Promise(resolve => setTimeout(resolve, 400));
      // 更新本地 mock 数据
      setUsers(prev => prev.map(u => {
        if (u.id !== rechargeTarget.id) return u;
        if (rechargeType === "balance") {
          return { ...u, personal_balance: u.personal_balance + delta };
        } else {
          return { ...u, personal_credit_balance: newBalance };
        }
      }));
      const userName = rechargeTarget.name || rechargeTarget.phone;
      const toastText = rechargeType === "balance"
        ? resellerScopeId
          ? `已向「${userName}」划拨 ¥${delta.toFixed(2)}`
          : `已为「${userName}」充值余额 ¥${delta.toFixed(2)}`
        : `已将「${userName}」授信额度调整为 ¥${newBalance.toFixed(2)}`;
      toast({ title: toastText });
      setRechargeTarget(null);
      setRechargeAmount("");
      setRechargeRemark("");
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setRechargeLoading(false);
    }
  };

  // Edit user form state
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    displayName: "",
    remarkType: "正式用户",
    remarkName: "",
    voucherEnabled: false,
    groupMode: "template" as "template" | "custom" | "all",
    selectedTemplate: "default",
    selectedHistoricalGroup: "",
    customGroups: {} as Record<string, CustomGroupEntry>,
    customConfigEnabled: false,
    modelAccess: [] as string[],
    agentId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Voucher config dialog state
  const [voucherConfigOpen, setVoucherConfigOpen] = useState(false);
  const [voucherConfigTarget, setVoucherConfigTarget] = useState<UserRow | null>(null);
  const [voucherTypeTab, setVoucherTypeTab] = useState<"billing" | "other">("billing");
  const [voucherConfigForm, setVoucherConfigForm] = useState({
    enabled: false,
    groupDiscounts: {} as Record<string, number>,
    expiryDays: 60,
    remark: "",
  });
  const [savingVoucherConfig, setSavingVoucherConfig] = useState(false);
  // mock 存储：已保存的代金券配置（页面内有效）
  const [voucherConfigMap, setVoucherConfigMap] = useState<Record<string, { enabled: boolean; voucherType: string }>>({});
  // mock 存储完整配置，用于打开时回填
  const [voucherConfigStore, setVoucherConfigStore] = useState<Record<string, { enabled: boolean; groupDiscounts: Record<string, number>; expiryDays: number; remark: string }>>({});
  const [voucherConfigEditing, setVoucherConfigEditing] = useState(false);

  const openVoucherConfig = (user: UserRow) => {
    setVoucherConfigTarget(user);
    setVoucherTypeTab("billing");
    setSavingVoucherConfig(false);
    // 从 mock 存储加载已有配置
    const saved = voucherConfigStore[user.id];
    if (saved) {
      setVoucherConfigForm({
        enabled: saved.enabled,
        groupDiscounts: saved.groupDiscounts,
        expiryDays: saved.expiryDays,
        remark: saved.remark,
      });
      setVoucherConfigEditing(false);
    } else {
      setVoucherConfigForm({
        enabled: false,
        groupDiscounts: {},
        expiryDays: 60,
        remark: "",
      });
      setVoucherConfigEditing(true);
    }
    setVoucherConfigOpen(true);
  };

  const handleToggleEnabled = () => {
    if (!voucherConfigTarget) return;
    const newEnabled = !voucherConfigForm.enabled;
    setVoucherConfigForm((prev) => ({ ...prev, enabled: newEnabled }));
    // 如果已有保存的配置，直接同步更新 mock store
    if (voucherConfigStore[voucherConfigTarget.id]) {
      setVoucherConfigStore((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: { ...prev[voucherConfigTarget.id], enabled: newEnabled },
      }));
      setVoucherConfigMap((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: { enabled: newEnabled, voucherType: voucherTypeTab },
      }));
    }
  };

  const handleSaveVoucherConfig = async () => {
    if (!voucherConfigTarget) return;
    setSavingVoucherConfig(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      // 保存到 mock 存储
      setVoucherConfigStore((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: {
          enabled: voucherConfigForm.enabled,
          groupDiscounts: { ...voucherConfigForm.groupDiscounts },
          expiryDays: voucherConfigForm.expiryDays,
          remark: voucherConfigForm.remark,
        },
      }));
      setVoucherConfigMap((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: { enabled: voucherConfigForm.enabled, voucherType: voucherTypeTab },
      }));
      toast({ title: "保存成功", description: `用户「${voucherConfigTarget.name || voucherConfigTarget.phone}」的返券配置已更新` });
      setVoucherConfigEditing(false);
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setSavingVoucherConfig(false);
    }
  };

  // Add user dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    displayName: "",
    password: "",
    remarkType: "正式用户",
    remarkName: "",
    voucherEnabled: false,
    groupMode: "template" as "template" | "custom" | "all",
    selectedTemplate: TEMPLATE_OPTIONS[0]?.value || "default",
    selectedHistoricalGroup: "",
    customGroups: {} as Record<string, CustomGroupEntry>,
    modelAccess: ["国际"] as string[],
    agentId: "",
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: usersData, error } = await supabase
      .from("users")
      .select("id,phone,name,created_at,status")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取用户数据失败:", error);
      toast({ title: "获取用户数据失败", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const remoteUsers = usersData || [];
    const localUsers = getResellerDemoState().users
      .filter((item) => (item.locallyCreated || (!!resellerScopeId && item.resellerId === resellerScopeId)) && !remoteUsers.some((user) => user.phone === item.phone))
      .map((item) => ({ id: `demo-${item.phone}`, phone: item.phone, name: item.name, created_at: item.createdAt, status: item.status }));
    const allUsersData = [...remoteUsers, ...localUsers];
    const phones = allUsersData.map((u) => u.phone);

    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("user_phone,role,enterprise_id")
      .in("user_phone", phones);
    if (membersError) console.error("获取成员数据失败:", membersError);

    const enterpriseIds = [...new Set((membersData || []).map((m) => m.enterprise_id))];
    const { data: enterprises, error: entError } = enterpriseIds.length > 0
      ? await supabase.from("enterprises").select("id,name,owner_phone").in("id", enterpriseIds)
      : { data: [], error: null };
    if (entError) console.error("获取企业数据失败:", entError);

    const { data: ownedEnterprises, error: ownedError } = await supabase
      .from("enterprises")
      .select("id,owner_phone")
      .in("owner_phone", phones);
    if (ownedError) console.error("获取所属企业失败:", ownedError);

    const ownedIds = (ownedEnterprises || []).map((e) => e.id);
    const { data: balances, error: balError } = ownedIds.length > 0
      ? await supabase.from("enterprise_balances").select("enterprise_id,balance,total_consumed").in("enterprise_id", ownedIds)
      : { data: [], error: null };
    if (balError) console.error("获取余额数据失败:", balError);

    const entMap: Record<string, string> = Object.fromEntries(
      (enterprises || []).map((e) => [e.id, e.name])
    );

    const membersByPhone: Record<string, EnterpriseRef[]> = {};
    (membersData || []).forEach((m) => {
      if (!membersByPhone[m.user_phone]) membersByPhone[m.user_phone] = [];
      membersByPhone[m.user_phone].push({
        id: m.enterprise_id,
        name: entMap[m.enterprise_id] || "未知企业",
        role: m.role,
        enterprise_type: "test",
      });
    });

    const balanceMap: Record<string, { balance: number; total: number }> = {};
    (balances || []).forEach((b) => {
      balanceMap[b.enterprise_id] = { balance: b.balance || 0, total: b.total_consumed || 0 };
    });

    const ownerBalanceMap: Record<string, { balance: number; total: number }> = {};
    (ownedEnterprises || []).forEach((e) => {
      const bal = balanceMap[e.id] || { balance: 0, total: 0 };
      ownerBalanceMap[e.owner_phone] = {
        balance: (ownerBalanceMap[e.owner_phone]?.balance || 0) + bal.balance,
        total: (ownerBalanceMap[e.owner_phone]?.total || 0) + bal.total,
      };
    });

    setUsers(
      allUsersData.map((u) => {
        const userEnts = [...(membersByPhone[u.phone] || [])];
        const assignment = getResellerDemoState().users.find((item) => item.phone === u.phone);
        const ownerBal = ownerBalanceMap[u.phone] || { balance: 0, total: 0 };
        const isOwner = userEnts.some((e) => e.role === "owner");
        return {
          ...u,
          enterprises: userEnts,
          personal_balance: assignment?.balance ?? ownerBal.balance,
          personal_credit_balance: 0,
          personal_total: ownerBal.total,
          group: "default",
          role: isOwner ? "企业主" : (userEnts.length > 0 ? "成员" : "普通用户"),
          invite_count: 0,
          invite_revenue: 0,
          inviter: null,
          user_type: "test",
          reseller_code: assignment?.resellerId ?? null,
        };
      })
    );
    setLoading(false);
  };

  const fetchDrawerDetail = async (phone: string) => {
    setDrawerLoading(true);
    setDrawerDetail(null);

    const { data: ownedEnts } = await supabase
      .from("enterprises")
      .select("id")
      .eq("owner_phone", phone);
    const personalEntId = ownedEnts?.[0]?.id || null;

    let personalBalance = 0;
    let personalTotal = 0;
    if (personalEntId) {
      const { data: bal } = await supabase
        .from("enterprise_balances")
        .select("balance,total_consumed")
        .eq("enterprise_id", personalEntId)
        .maybeSingle();
      personalBalance = bal?.balance || 0;
      personalTotal = bal?.total_consumed || 0;
    }

    const { data: membersRaw } = await supabase
      .from("members")
      .select("id,enterprise_id,organization_id,role")
      .eq("user_phone", phone);

    if (!membersRaw || membersRaw.length === 0) {
      setDrawerDetail({ personal_enterprise_id: personalEntId, personal_balance: personalBalance, personal_credit_balance: 0, personal_total: personalTotal, members: [] });
      setDrawerLoading(false);
      return;
    }

    const entIds = [...new Set(membersRaw.map((m) => m.enterprise_id))];
    const { data: ents } = await supabase.from("enterprises").select("id,name").in("id", entIds);
    const entMap: Record<string, string> = Object.fromEntries((ents || []).map((e) => [e.id, e.name]));

    const orgIds = membersRaw.map((m) => m.organization_id).filter(Boolean) as string[];
    const { data: orgs } = orgIds.length > 0
      ? await supabase.from("organizations").select("id,name").in("id", orgIds)
      : { data: [] };
    const orgMap: Record<string, string> = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));

    const members: MemberDetail[] = membersRaw.map((m) => ({
      id: m.id,
      enterprise_id: m.enterprise_id,
      enterprise_name: entMap[m.enterprise_id] || "未知企业",
      org_name: m.organization_id ? (orgMap[m.organization_id] || null) : null,
      role: m.role,
    }));

    setDrawerDetail({ personal_enterprise_id: personalEntId, personal_balance: personalBalance, personal_credit_balance: 0, personal_total: personalTotal, members });
    setDrawerLoading(false);
  };

  const openDrawer = (user: UserRow) => {
    setDrawerUser(user);
    setEditBalance("");
    // 解析备注格式 "类型_输入信息"
    const mockRemark = "正式用户_测试备注"; // 实际应从用户数据中获取
    const parts = mockRemark.split("_");
    const type = parts[0] && REMARK_TYPE_OPTIONS.includes(parts[0]) ? parts[0] : "正式用户";
    const name = parts.slice(1).join("_") || "";
    setEditForm({
      username: user.name || "",
      password: "",
      displayName: user.name || "",
      remarkType: type,
      remarkName: name,
      voucherEnabled: false,
      groupMode: "template",
      selectedTemplate: user.group && TEMPLATE_OPTIONS.some(t => t.value === user.group) ? user.group : "default",
      selectedHistoricalGroup: "",
      customGroups: {},
      customConfigEnabled: false,
      modelAccess: ["国际"],
      agentId: user.reseller_code || "",
    });
    setShowPassword(false);
    setDrawerOpen(true);
    fetchDrawerDetail(user.phone);
  };

  const handleToggleStatus = async (user: UserRow) => {
    const newStatus = user.status === "active" ? "banned" : "active";
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    if (drawerUser?.id === user.id) setDrawerUser((prev) => prev ? { ...prev, status: newStatus } : prev);
    await supabase.from("users").update({ status: newStatus }).eq("id", user.id);
    setDemoUserStatus(user.phone, newStatus);
    toast({ title: newStatus === "active" ? "已启用" : "已禁用", description: `用户 ${user.name || user.phone} 已${newStatus === "active" ? "启用" : "禁用"}` });
  };

  const handlePromote = async (user: UserRow) => {
    toast({ title: "提升用户", description: `用户 ${user.name || user.phone} 权限提升功能开发中` });
  };

  const handleDemote = async (user: UserRow) => {
    toast({ title: "降级用户", description: `用户 ${user.name || user.phone} 权限降级功能开发中` });
  };

  const handleSaveBalance = async () => {
    if (!drawerDetail?.personal_enterprise_id) return;
    const val = parseFloat(editBalance);
    if (isNaN(val)) return;
    setSavingBalance(true);
    await supabase.from("enterprise_balances")
      .update({ balance: val })
      .eq("enterprise_id", drawerDetail.personal_enterprise_id);
    setDrawerDetail((prev) => prev ? { ...prev, personal_balance: val } : prev);
    setSavingBalance(false);
    setEditBalance("");
    toast({ title: "已保存", description: `个人余额已更新为 ¥${val.toFixed(2)}` });
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("members").delete().eq("id", memberId);
    setDrawerDetail((prev) => prev
      ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) }
      : prev
    );
    if (drawerUser) {
      setUsers((prev) => prev.map((u) => u.phone === drawerUser.phone
        ? { ...u, enterprises: u.enterprises.filter((e) => e.id !== drawerDetail?.members.find((m) => m.id === memberId)?.enterprise_id) }
        : u
      ));
    }
    toast({ title: "已解除", description: "用户已从该企业移除" });
  };

  const handleAddUser = async () => {
    if (!addForm.username.trim()) {
      toast({ title: "请输入用户名", variant: "destructive" });
      return;
    }
    if (!addForm.password.trim()) {
      toast({ title: "请输入密码", variant: "destructive" });
      return;
    }
    const effectiveAgentId = resellerScopeId || addForm.agentId;
    if (!effectiveAgentId) {
      toast({ title: "请选择用户归属（平台直客或代理商）", variant: "destructive" });
      return;
    }

    // 组合备注：类型_输入信息（选填）
    const remark = addForm.remarkName.trim() ? `${addForm.remarkType}_${addForm.remarkName}` : "";

    setAddingUser(true);
    try {
      addDemoUser({ phone: addForm.username.trim(), name: addForm.displayName.trim() || addForm.username.trim(), resellerId: effectiveAgentId === "direct" ? null : effectiveAgentId });

      toast({ title: "用户创建成功", description: `用户 ${addForm.username} 已添加` });
      setAddDialogOpen(false);
      setAddForm({ username: "", displayName: "", password: "", remarkType: "正式用户", remarkName: "", voucherEnabled: false, groupMode: "template" as const, selectedTemplate: TEMPLATE_OPTIONS[0]?.value || "default", selectedHistoricalGroup: "", customGroups: {}, modelAccess: ["国际"], agentId: "" });
      setDemoRevision((value) => value + 1); fetchAll();
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setAddingUser(false);
    }
  };

  const handleSearch = () => {
    fetchAll();
  };

  const handleReset = () => {
    setSearch("");
    setGroupFilter("all");
    fetchAll();
  };

  const filtered = users
    .filter((u) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        u.id.toLowerCase().includes(searchLower) ||
        (u.name || "").toLowerCase().includes(searchLower) ||
        u.phone.includes(search)
      );
    })
    .filter((u) => {
      if (groupFilter === "all") return true;
      return u.group === groupFilter;
    })
    .filter((u) => {
      // 标签筛选逻辑
      if (tagFilter === "none") {
        return u.user_type === undefined;
      } else if (tagFilter !== "all") {
        return u.user_type !== undefined;
      }
      return true;
    })
    .filter((u) => resellerScopeId ? u.reseller_code === resellerScopeId : resellerFilter === "all" || (resellerFilter === "direct" ? !u.reseller_code : u.reseller_code === resellerFilter));

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { owner: "企业主", org_admin: "组织管理员", member: "成员" };
    return map[role] || role;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        {!resellerScopeId && <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">用户管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">共 {filtered.length} 名用户</p>
          </div>
        </div>}
        <Button
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          添加用户
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-lg border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="支持搜索用户的ID、用户名、显示名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-32 h-9 justify-between bg-white">
              <span className="truncate">{groupFilter === "all" ? "全部用户分组" : groupFilter}</span>
              <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 align-start" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder={groupFilter === "all" ? "全部用户分组" : "搜索分组模板..."}
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !groupSearchQuery.trim()) setGroupFilter("all"); }}
                className="h-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {/* 分组模板 */}
              {TEMPLATE_OPTIONS.filter(t => t.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs text-muted-foreground font-medium sticky top-0 bg-white">分组模板</div>
                  {TEMPLATE_OPTIONS.filter(t => t.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).map((t) => (
                    <div
                      key={t.value}
                      className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 pl-6 ${groupFilter === t.value ? "bg-blue-50 text-blue-600 font-medium" : ""}`}
                      onClick={() => { setGroupFilter(t.value); setGroupSearchQuery(""); }}
                    >
                      <span>{t.name}</span>
                      {t.remark && <span className="text-xs text-muted-foreground ml-2">({t.remark})</span>}
                    </div>
                  ))}
                </>
              )}

              {/* 自定义分组 */}
              <div className="px-3 py-1 text-xs text-muted-foreground font-medium sticky top-0 bg-white mt-1">自定义分组</div>
              <div className="px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 pl-6 text-muted-foreground">
                自定义分组
              </div>

              {/* 历史分组 */}
              {HISTORICAL_GROUP_OPTIONS.filter(h => h.label.toLowerCase().includes(groupSearchQuery.toLowerCase())).length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs text-muted-foreground font-medium sticky top-0 bg-white mt-1">历史分组</div>
                  {HISTORICAL_GROUP_OPTIONS.filter(h => h.label.toLowerCase().includes(groupSearchQuery.toLowerCase())).map((h) => (
                    <div
                      key={h.value}
                      className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 pl-6 ${groupFilter === h.value ? "bg-blue-50 text-blue-600 font-medium" : ""}`}
                      onClick={() => { setGroupFilter(h.value); setGroupSearchQuery(""); }}
                    >
                      <span>{h.label}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-32 h-9 justify-between bg-white">
              <span className="truncate">{tokenGroupFilter === "all" ? "全部令牌分组" : tokenGroupFilter}</span>
              <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 align-start" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder={tokenGroupFilter === "all" ? "全部令牌分组" : "搜索令牌分组..."}
                value={tokenGroupSearchQuery}
                onChange={(e) => setTokenGroupSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !tokenGroupSearchQuery.trim()) setTokenGroupFilter("all"); }}
                className="h-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {ALL_BASE_GROUPS.filter(g =>
                g.name.toLowerCase().includes(tokenGroupSearchQuery.toLowerCase()) ||
                g.desc.toLowerCase().includes(tokenGroupSearchQuery.toLowerCase())
              ).map((g) => (
                <div
                  key={g.name}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${tokenGroupFilter === g.name ? "bg-blue-50 text-blue-600 font-medium" : ""}`}
                  onClick={() => { setTokenGroupFilter(g.name); setTokenGroupSearchQuery(""); }}
                >
                  <span>{g.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({g.desc})</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-white">
            <SelectValue placeholder="标签筛选" />
          </SelectTrigger>
          <SelectContent>
            {TAG_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!resellerScopeId && <Select value={resellerFilter} onValueChange={setResellerFilter}>
          <SelectTrigger className="w-[150px] h-9 bg-white"><SelectValue placeholder="代理商归属" /></SelectTrigger>
          <SelectContent><SelectItem value="all">全部归属</SelectItem><SelectItem value="direct">平台直客</SelectItem>{demoState.resellers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
        </Select>}
        <Button variant="outline" className="h-9" onClick={handleSearch}>
          查询
        </Button>
        <Button variant="ghost" className="h-9" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          重置
        </Button>
        <Button
          variant="outline"
          className="h-9 gap-1.5 bg-white ml-auto"
          onClick={() => {
            if (filtered.length === 0) { toast({ title: "暂无数据可导出", variant: "destructive" }); return; }
            const headers = ["ID","用户名","状态","个人余额(元)","个人总消耗(元)","分组","角色","所属企业","注册时间","邀请人数","邀请收入"];
            const rows = filtered.map(u => [
              u.id.slice(0, 8),
              u.name || u.phone,
              u.status === "active" ? "已启用" : "已禁用",
              formatNumber(u.personal_balance),
              formatNumber(u.personal_total),
              u.group,
              u.role,
              u.enterprises.map(e => e.name).join(";"),
              new Date(u.created_at).toLocaleDateString("zh-CN"),
              String(u.invite_count),
              formatNumber(u.invite_revenue),
            ]);
            const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `用户管理_${new Date().toLocaleDateString("zh-CN")}.csv`;
            a.click(); URL.revokeObjectURL(url);
            toast({ title: "导出成功", description: `已导出 ${filtered.length} 条用户数据` });
          }}
        >
          <Download className="w-4 h-4" />
          导出
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className={`grid ${resellerScopeId ? "grid-cols-[60px_120px_80px_150px_80px_140px_100px_1fr]" : "grid-cols-[60px_100px_80px_110px_150px_70px_70px_120px_90px_1fr]"} text-xs font-medium text-muted-foreground border-b bg-gray-50/50`}>
          <span className="px-3 py-3">ID</span>
          <span className="px-3 py-3">用户名</span>
          <span className="px-3 py-3">状态</span>
          {!resellerScopeId && <span className="px-3 py-3">代理商归属</span>}
          <span className="px-3 py-3">个人空间剩余额度/总额度</span>
          <span className="px-3 py-3">分组</span>
          {!resellerScopeId && <span className="px-3 py-3">角色</span>}
          <span className="px-3 py-3">所属企业空间</span>
          <span className="px-3 py-3">注册时间</span>
          {!resellerScopeId && <span className="px-3 py-3">邀请信息</span>}
          <span className="px-3 py-3 text-center">操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((u, index) => (
            <div
              key={u.id}
              className={`grid ${resellerScopeId ? "grid-cols-[60px_120px_80px_150px_80px_140px_100px_1fr]" : "grid-cols-[60px_100px_80px_110px_150px_70px_70px_120px_90px_1fr]"} border-b last:border-0 text-sm items-center hover:bg-gray-50/50 ${index % 2 === 1 ? "bg-gray-50/30" : ""}`}
            >
              <span className="text-muted-foreground px-3 py-3.5 font-mono text-xs truncate">
                {u.id.slice(0, 6)}
              </span>
              <span className="text-foreground px-3 py-3.5 truncate">
                <span className="font-medium">{u.name || u.phone}</span>
                <GreenTag type={u.user_type} name={u.name || u.phone} />
              </span>
              <span className="px-3 py-3.5">
                {u.status === "active" ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">已启用</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">已禁用</Badge>
                )}
              </span>
              {!resellerScopeId && <span className="px-3 py-3.5 text-xs"><Badge variant="secondary" className="font-normal">{getResellerName(u.reseller_code, demoState)}</Badge></span>}
              <span className="text-muted-foreground tabular-nums px-3 py-3.5 text-xs">
                <span className="text-green-600">¥{formatNumber(u.personal_balance)}</span>
                <span className="text-gray-400"> / </span>
                <span>¥{formatNumber(u.personal_total)}</span>
              </span>
              <span className="px-3 py-3.5">
                <Badge variant="secondary" className="text-xs font-normal">{u.group}</Badge>
              </span>
              {!resellerScopeId && <span className="text-muted-foreground px-3 py-3.5 text-xs">{u.role}</span>}
              <span className="text-muted-foreground px-3 py-3.5 text-xs truncate">
                {u.enterprises.length === 0 ? (
                  "-"
                ) : u.enterprises.length === 1 ? (
                  <span className="inline-flex items-center gap-1">
                    {u.enterprises[0].name}
                    <EnterpriseGreenTag type={u.enterprises[0].enterprise_type} name={u.enterprises[0].name} />
                  </span>
                ) : (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default inline-flex items-center gap-1">
                          {u.enterprises[0].name}
                          <EnterpriseGreenTag type={u.enterprises[0].enterprise_type} name={u.enterprises[0].name} />
                          <span className="text-xs bg-muted rounded px-1 py-0.5">+{u.enterprises.length - 1}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <ul className="space-y-1 text-xs">
                          {u.enterprises.map((e) => (
                            <li key={e.id}>{e.name}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
              <span className="text-muted-foreground px-3 py-3.5 text-xs">
                {new Date(u.created_at).toLocaleDateString("zh-CN")}
              </span>
              {!resellerScopeId && <span className="text-muted-foreground px-3 py-3.5 text-xs truncate">
                {u.invite_count}人/¥{formatNumber(u.invite_revenue)}
              </span>}
              <div className="flex items-center justify-center gap-1 px-3 py-3.5">
                {!resellerScopeId && <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => openRechargeDialog(u)}
                >
                  充值
                </Button>}
                {resellerScopeId && <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => openRechargeDialog(u)}
                >
                  划拨
                </Button>}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs ${u.status === "banned" ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}`}
                  onClick={() => handleToggleStatus(u)}
                >
                  {u.status === "banned" ? "启用" : "禁用"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => openDrawer(u)}
                >
                  编辑
                </Button>
                {!resellerScopeId && <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => handlePromote(u)}
                >
                  提升
                </Button>}
                {!resellerScopeId && <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => handleDemote(u)}
                >
                  降级
                </Button>}
                {!resellerScopeId && <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                  onClick={() => openVoucherConfig(u)}
                >
                  返券配置
                  {voucherConfigMap[u.id] && (
                    <span className={`ml-1 inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-medium ${voucherConfigMap[u.id].enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1 h-1 rounded-full ${voucherConfigMap[u.id].enabled ? "bg-green-500" : "bg-gray-400"}`}></span>
                      {voucherConfigMap[u.id].enabled ? "已启用" : "已配置"}
                    </span>
                  )}
                </Button>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">编辑</span>
                <SheetTitle className="text-base font-semibold">编辑用户</SheetTitle>
              </div>
            </div>
          </SheetHeader>

          {drawerUser && (
            <div className="px-6 py-5 space-y-6">
              {/* Section A: 基本信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">基本信息</p>
                    <p className="text-xs text-muted-foreground">用户的基本账户信息</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-gray-50/30">
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      用户名 <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="h-10 pr-8"
                      />
                      {editForm.username && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, username: "" }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">密码</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入新的密码，最短 8 位"
                        value={editForm.password}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">显示名称</Label>
                    <Input
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">备注</Label>
                    <div className="flex gap-2">
                      <Select
                        value={editForm.remarkType}
                        disabled={!!resellerScopeId}
                        onValueChange={(value) => setEditForm((prev) => ({ ...prev, remarkType: value }))}
                      >
                        <SelectTrigger className="w-[130px] h-10 bg-white">
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {REMARK_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="请输入信息（仅管理员可见）"
                        value={editForm.remarkName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, remarkName: e.target.value }))}
                        className="h-10 flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-400">备注格式：类型_输入信息</p>
                  </div>
                </div>
              </div>

              {/* 代理商归属 */}
              {!resellerScopeId && <div className="space-y-1.5">
                <Label className="text-sm">代理商归属</Label>
                <div className="h-10 px-3 border rounded-md bg-gray-50 flex items-center justify-between"><span className="text-sm">{getResellerName(drawerUser.reseller_code, demoState)}</span><Button type="button" variant="outline" size="sm" onClick={() => { setMigrationTarget(drawerUser); setMigrationResellerId("direct"); setMigrationReason(""); setMigrationChecked(false); }}>迁移归属</Button></div>
                <p className="text-xs text-gray-400">归属不可直接编辑；有企业关系的用户需从企业整体迁移。</p>
              </div>}

              {/* Section B: 权限设置 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">权限设置</p>
                    <p className="text-xs text-muted-foreground">用户分组和额度管理</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-gray-50/30">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        分组 <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">开放客户端配置</span>
                        <Switch
                          checked={editForm.customConfigEnabled}
                          onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, customConfigEnabled: checked }))}
                        />
                      </div>
                    </div>

                    <GroupConfigSelector
                      groupMode={editForm.groupMode}
                      setGroupMode={(mode) => setEditForm((prev) => ({ ...prev, groupMode: mode }))}
                      selectedTemplate={editForm.selectedTemplate}
                      setSelectedTemplate={(value) => setEditForm((prev) => ({ ...prev, selectedTemplate: value }))}
                      selectedHistoricalGroup={editForm.selectedHistoricalGroup || ""}
                      setSelectedHistoricalGroup={(value) => setEditForm((prev) => ({ ...prev, selectedHistoricalGroup: value }))}
                      customGroups={editForm.customGroups}
                      setCustomGroups={(groups) => setEditForm((prev) => ({ ...prev, customGroups: groups }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      模型访问权限 <span className="text-red-500">*</span>
                    </Label>
                    <ModelAccessSelect
                      value={editForm.modelAccess}
                      onChange={(access) => setEditForm((prev) => ({ ...prev, modelAccess: access }))}
                    />
                  </div>
                </div>
              </div>

              {/* Section C: 空间关联管理 */}
              {!resellerScopeId && <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">空间关联管理</h3>

                {drawerLoading ? (
                  <p className="text-sm text-muted-foreground">加载中…</p>
                ) : drawerDetail ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">个人空间</p>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">当前余额</span>
                          <span className="font-semibold tabular-nums">¥{drawerDetail.personal_balance.toFixed(2)}</span>
                        </div>
                        {drawerDetail.personal_enterprise_id ? (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">修改余额</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={editBalance}
                                onChange={(e) => setEditBalance(e.target.value)}
                                placeholder={drawerDetail.personal_balance.toFixed(2)}
                                className="h-8 text-sm"
                              />
                              <Button size="sm" variant="outline" onClick={handleSaveBalance} disabled={savingBalance || !editBalance} className="h-8 shrink-0">
                                {savingBalance ? "保存中…" : "保存"}
                              </Button>
                            </div>
                            <p className="text-xs text-blue-500/70 mt-1">此操作仅影响个人钱包，不影响企业配额</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/60">该用户尚未创建企业空间</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">企业空间</p>
                      {drawerDetail.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground/60 italic">未加入任何企业</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                            <span>企业名称</span>
                            <span>所属组织</span>
                            <span>角色</span>
                            <span></span>
                          </div>
                          {drawerDetail.members.map((m) => (
                            <div key={m.id} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 px-3 py-2.5 border-b last:border-0 text-sm items-center">
                              <span className="truncate font-medium">{m.enterprise_name}</span>
                              <span className="text-muted-foreground truncate">{m.org_name || "—"}</span>
                              <span className="text-muted-foreground text-xs">{roleLabel(m.role)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                                onClick={() => handleRemoveMember(m.id)}
                              >
                                解绑
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>}

              {/* 底部按钮 */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="h-9 px-4"
                  onClick={() => setDrawerOpen(false)}
                >
                  取消
                </Button>
                <Button
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    if (!editForm.username.trim()) {
                      toast({ title: "请输入用户名", variant: "destructive" });
                      return;
                    }
                    if (editForm.groupMode === "template" && !editForm.selectedTemplate.trim()) {
                      toast({ title: "请选择分组模板", variant: "destructive" });
                      return;
                    }
                    if (editForm.groupMode === "custom" && Object.keys(editForm.customGroups).length === 0) {
                      toast({ title: "请至少配置一个令牌分组", variant: "destructive" });
                      return;
                    }
                    if (editForm.groupMode === "all" && !editForm.selectedHistoricalGroup?.trim()) {
                      toast({ title: "请选择历史分组", variant: "destructive" });
                      return;
                    }
                    const resellerChanged = (drawerUser.reseller_code || "") !== editForm.agentId;
                    if (resellerChanged && drawerUser.enterprises.length > 0) {
                      const nextLabel = AGENT_OPTIONS.find((item) => item.value === editForm.agentId)?.label || "直客";
                      const confirmed = window.confirm(
                        `修改后，该用户将退出所有归属不一致的企业，并改为通过${nextLabel}入口登录。个人账号及个人数据不会删除。是否继续？`,
                      );
                      if (!confirmed) return;
                    }
                    setSavingUser(true);
                    setTimeout(() => {
                      const groupLabel = editForm.groupMode === "template"
                        ? `模板「${editForm.selectedTemplate}」`
                        : editForm.groupMode === "all"
                        ? `历史分组「${editForm.selectedHistoricalGroup}」`
                        : `自定义分组(${Object.keys(editForm.customGroups).length}个通道)`;
                      setUsers((current) => current.map((user) => user.id === drawerUser.id ? {
                        ...user,
                        reseller_code: editForm.agentId || null,
                        enterprises: resellerChanged ? [] : user.enterprises,
                        role: resellerChanged ? "普通用户" : user.role,
                      } : user));
                      setSavingUser(false);
                      toast({
                        title: "保存成功",
                        description: resellerChanged
                          ? `用户「${editForm.username}」的代理商标签已更新，归属不一致的企业关系已解除`
                          : `用户「${editForm.username}」的分组已更新为${groupLabel}`,
                      });
                      setDrawerOpen(false);
                    }, 500);
                  }}
                  disabled={savingUser}
                >
                  {savingUser ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">新建</span>
                <DialogTitle className="text-base font-semibold">添加用户</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">用户信息</p>
                <p className="text-xs text-muted-foreground">创建新用户账户</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  用户名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入用户名"
                  value={addForm.username}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">显示名称</Label>
                <Input
                  placeholder="请输入显示名称"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">
                  密码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="请输入密码"
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">备注</Label>
                <div className="flex gap-2">
                  <Select
                    value={addForm.remarkType}
                    disabled={!!resellerScopeId}
                    onValueChange={(value) => setAddForm((prev) => ({ ...prev, remarkType: value }))}
                  >
                    <SelectTrigger className="w-[130px] h-10 bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {REMARK_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="请输入信息（仅管理员可见）"
                    value={addForm.remarkName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, remarkName: e.target.value }))}
                    className="h-10 bg-gray-50/50 border-gray-200 flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">备注格式：类型_输入信息</p>
              </div>

              {!resellerScopeId && <div className="space-y-1.5">
                <Label className="text-sm">所属代理商</Label>
                <Select value={resellerScopeId || addForm.agentId || undefined} disabled={!!resellerScopeId} onValueChange={(v) => setAddForm((prev) => ({ ...prev, agentId: v }))}>
                  <SelectTrigger className="w-full h-10 bg-gray-50/50 border-gray-200 [&>span:not(.sr-only)]:line-clamp-none">
                    <SelectValue placeholder="" style={{ display: 'none' }} />
                    {addForm.agentId ? (
                      <span
                        role="button"
                        className="inline-flex items-center gap-[2px] px-[6px] py-[1px] rounded-[4px] bg-blue-50 text-blue-600 text-xs leading-[18px] whitespace-nowrap"
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.stopPropagation(); setAddForm(prev => ({ ...prev, agentId: "" })); }}
                      >
                        {addForm.agentId === "direct" ? "平台直客" : getResellerName(addForm.agentId, demoState)}
                        <X className="h-3 w-3" />
                      </span>
                    ) : null}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">平台直客</SelectItem>
                    {enabledResellers.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

              <div className="space-y-1.5">
                <Label className="text-sm">
                  模型访问权限 <span className="text-red-500">*</span>
                </Label>
                <ModelAccessSelect
                  value={addForm.modelAccess}
                  onChange={(access) => setAddForm((prev) => ({ ...prev, modelAccess: access }))}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => {
                setAddDialogOpen(false);
                setAddForm({ username: "", displayName: "", password: "", remarkType: "正式用户", remarkName: "", voucherEnabled: false, groupMode: "template" as const, selectedTemplate: TEMPLATE_OPTIONS[0]?.value || "default", selectedHistoricalGroup: "", customGroups: {}, modelAccess: ["国际"], agentId: "" });
              }}
            >
              取消
            </Button>
            <Button
              className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAddUser}
              disabled={addingUser}
            >
              {addingUser ? "创建中…" : "确认"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voucher Config Dialog */}
      <Dialog open={voucherConfigOpen} onOpenChange={setVoucherConfigOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">返券配置</DialogTitle>
            </div>
          </DialogHeader>

          {/* 客户信息 */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-foreground">客户名称：{voucherConfigTarget?.name || voucherConfigTarget?.phone}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">配置对象：个人空间</span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* 返券说明 */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  返券说明：启用后，客户调用模型仍按实际价格扣费；月度账单生成后，系统根据本配置计算应返券金额。每个用户仅允许存在一套账期返券配置，修改账期返券配置后仅对后续生成的账单生效。
                </p>

                {/* 启用状态 */}
                <div className="flex items-center justify-between py-1">
                  <Label className="text-sm font-medium">启用状态</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={voucherConfigForm.enabled}
                    onClick={handleToggleEnabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      voucherConfigForm.enabled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        voucherConfigForm.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed -mt-3">
                  状态切换对已生成的账单无效，若需返券请重新生成账单
                </p>

                {/* 返券折扣配置 */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">返券比例配置</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    请填写需返还给客户的比例，而非客户实际支付折扣。例：客户按 7 折结算，应填写返券比例 30%。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_100px] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                      <span>令牌分组</span>
                      <span className="text-right">返券比例</span>
                    </div>
                    {VOUCHER_GROUP_OPTIONS.map((group) => {
                      const discount = voucherConfigForm.groupDiscounts[group.value] || 0;
                      return (
                        <div key={group.value} className="grid grid-cols-[1fr_100px] gap-2 px-3 py-2.5 border-b last:border-0 items-center">
                          <span className="text-sm">
                            {group.name}
                            <span className="text-xs text-muted-foreground ml-1">({group.models.join(", ")})</span>
                          </span>
                          <div className="flex items-center gap-1 justify-end">
                            {voucherConfigEditing ? (
                              <>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="0"
                                  value={discount || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setVoucherConfigForm((prev) => ({
                                      ...prev,
                                      groupDiscounts: {
                                        ...prev.groupDiscounts,
                                        [group.value]: isNaN(val) ? 0 : val,
                                      },
                                    }));
                                  }}
                                  className="h-7 w-16 text-sm text-right"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground w-16 text-right pr-1">{discount || 0}%</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 备注 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">备注</Label>
                  {voucherConfigEditing ? (
                    <Textarea
                      placeholder="请输入备注"
                      rows={3}
                      value={voucherConfigForm.remark}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setVoucherConfigForm((prev) => ({ ...prev, remark: e.target.value }))
                      }
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground min-h-[1.5rem]">
                      {voucherConfigForm.remark || "无备注"}
                    </p>
                  )}
                </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 flex-col items-stretch gap-3">
            {voucherConfigEditing && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>修改后的折扣不适用于已出账的账单，将从下次账单开始生效。</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              {voucherConfigEditing ? (
                <>
                  <Button
                    variant="outline"
                    className="h-9 px-4"
                    onClick={() => {
                      const saved = voucherConfigTarget ? voucherConfigStore[voucherConfigTarget.id] : null;
                      if (saved) {
                        setVoucherConfigForm({
                          enabled: saved.enabled,
                          groupDiscounts: saved.groupDiscounts,
                          expiryDays: saved.expiryDays,
                          remark: saved.remark,
                        });
                      } else {
                        setVoucherConfigForm({
                          enabled: false,
                          groupDiscounts: {},
                          expiryDays: 60,
                          remark: "",
                        });
                      }
                      setVoucherConfigEditing(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveVoucherConfig}
                    disabled={savingVoucherConfig}
                  >
                    {savingVoucherConfig ? "保存中…" : "保存配置"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="h-9 px-4 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  onClick={() => setVoucherConfigEditing(true)}
                >
                  编辑配置
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recharge / Allocation Dialog */}
      <Dialog open={!!rechargeTarget} onOpenChange={(open) => { if (!open) setRechargeTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{resellerScopeId ? "客户划拨" : "添加金额"}</DialogTitle>
          </DialogHeader>
          {rechargeTarget && (() => {
            const currentBalance = rechargeType === "balance" ? rechargeTarget.personal_balance : (rechargeTarget.personal_credit_balance || 0);
            const amountNum = parseFloat(rechargeAmount);
            // 授信模式：输入值为目标总额度，delta = 目标 - 当前
            const delta = isNaN(amountNum) ? 0 : (rechargeType === "balance" ? amountNum : amountNum - currentBalance);
            const newBalance = currentBalance + delta;
            const userName = rechargeTarget.name || rechargeTarget.phone;
            return (
              <>
                <div className="space-y-1.5 py-1 text-sm">
                  <p className="text-muted-foreground">
                    用户：<span className="text-foreground font-medium">{userName}</span>
                    <span className="text-muted-foreground">（ID: {rechargeTarget.id.slice(0, 8)}）</span>
                  </p>
                  <p className="text-muted-foreground">
                    当前{rechargeType === "balance" ? "余额" : "授信额度"}：
                    <span className="text-foreground font-medium tabular-nums">¥{currentBalance.toFixed(2)}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  {resellerScopeId && (() => { const current = demoState.resellers.find((item) => item.id === resellerScopeId); return <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">本次划拨将从代理商可用额度扣除。当前可用总额度：<span className="font-semibold tabular-nums">¥{((current?.balance || 0) + (current?.creditBalance || 0)).toFixed(2)}</span></div>; })()}
                  {!resellerScopeId && <div className="space-y-2">
                    <Label>充值类型</Label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="userRechargeType"
                          value="balance"
                          checked={rechargeType === "balance"}
                          onChange={() => setRechargeType("balance")}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium">充值余额</p>
                          <p className="text-xs text-muted-foreground">普通现金余额，可直接消费</p>
                        </div>
                      </label>
                      {!resellerScopeId && <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="userRechargeType"
                          value="credit"
                          checked={rechargeType === "credit"}
                          onChange={() => setRechargeType("credit")}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium">授信额度</p>
                          <p className="text-xs text-muted-foreground">先用后付额度，账期后结算</p>
                        </div>
                      </label>}
                    </div>
                  </div>}
                  {rechargeType === "balance" ? (
                    <div className="space-y-1.5">
                      <Label>{resellerScopeId ? "划拨金额" : "充值金额"} <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={resellerScopeId ? "请输入划拨金额" : "请输入充值金额（支持负数）"}
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        新余额：
                        <span className="text-foreground">¥{currentBalance.toFixed(2)}</span>
                        {delta !== 0 ? (
                          <>
                            <span className="mx-1">{delta >= 0 ? "+" : "-"}</span>
                            <span className="text-foreground">¥{Math.abs(delta).toFixed(2)}</span>
                            <span className="mx-1">=</span>
                            <span className={`font-semibold ${newBalance < 0 ? "text-red-600" : "text-foreground"}`}>¥{newBalance.toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <span className="mx-1">+</span>
                            <span className="text-foreground">¥0.00</span>
                            <span className="mx-1">=</span>
                            <span className="text-foreground font-semibold">¥{newBalance.toFixed(2)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>设置剩余授信额度 <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="请输入目标剩余授信额度（整数）"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        当前剩余授信额度：
                        <span className="text-foreground font-medium">¥{currentBalance.toFixed(2)}</span>
                        {delta !== 0 && (
                          <>
                            <span className="mx-1">→</span>
                            <span className={`font-semibold ${newBalance < 0 ? "text-red-600" : "text-foreground"}`}>¥{newBalance.toFixed(2)}</span>
                            <span className="ml-1 text-xs">
                              ({delta >= 0 ? "增加" : "扣减"} ¥{Math.abs(delta).toFixed(2)})
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>附加备注（可选）</Label>
                    <Textarea
                      placeholder="可补充业务原因，例如：客户续费、测试账号充值…"
                      rows={2}
                      value={rechargeRemark}
                      onChange={(e) => setRechargeRemark(e.target.value)}
                    />
                  </div>
                  {delta !== 0 && (() => {
                    const actionLabel = rechargeType === "balance"
                      ? (delta >= 0 ? "充值" : "扣减")
                      : (delta >= 0 ? "调增授信" : "调减授信");
                    const subject = rechargeType === "balance" ? "余额" : "授信额度";
                    const systemRemark = rechargeType === "balance"
                      ? `${actionLabel} ¥${Math.abs(delta).toFixed(2)}，${subject}由 ¥${currentBalance.toFixed(2)} 调整至 ¥${newBalance.toFixed(2)}`
                      : `${actionLabel}至 ¥${newBalance.toFixed(2)}`;
                    const extra = rechargeRemark.trim();
                    const finalRemark = extra ? `${systemRemark} | ${extra}` : systemRemark;
                    return (
                      <div className="rounded-md bg-muted/50 border px-3 py-2 space-y-1">
                        <p className="text-xs text-muted-foreground">客户端备注预览</p>
                        <p className="text-xs text-foreground break-words">{finalRemark}</p>
                      </div>
                    );
                  })()}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRechargeTarget(null)}>取消</Button>
                  <Button onClick={handleRecharge} disabled={rechargeLoading || rechargeAmount === "" || isNaN(amountNum)}>
                    {rechargeLoading ? "处理中…" : resellerScopeId ? "确认划拨" : "确认保存"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      <Dialog open={!!discountTarget} onOpenChange={(open) => !open && setDiscountTarget(null)}>
        <DialogContent className="sm:max-w-[440px]"><DialogHeader><DialogTitle>设置用户折扣</DialogTitle></DialogHeader>{discountTarget && <div className="space-y-4"><div className="rounded-lg border bg-muted/30 p-3 text-sm">用户：<span className="font-medium">{discountTarget.name || discountTarget.phone}</span><span className="text-muted-foreground ml-2">{discountTarget.phone}</span></div><div className="space-y-2"><Label>结算折扣 *</Label><div className="relative"><Input type="number" min="1" max="100" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span></div><p className="text-xs text-muted-foreground">例如 92% 表示该用户按九二折结算。</p></div><div className="rounded-lg border bg-muted/30 p-3 text-sm">演示：原价 ¥100，折后结算价 <span className="font-medium">¥{Number(discountValue || 0).toFixed(2)}</span></div></div>}<DialogFooter><Button variant="outline" onClick={() => setDiscountTarget(null)}>取消</Button><Button disabled={!discountTarget || Number(discountValue) <= 0 || Number(discountValue) > 100} onClick={() => { if (!discountTarget) return; try { setCustomerDiscount("user", discountTarget.phone, Number(discountValue) / 100); setDemoRevision((value) => value + 1); setDiscountTarget(null); toast({ title: "用户折扣已更新" }); } catch (error) { toast({ title: "保存失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" }); } }}>保存折扣</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={!!migrationTarget} onOpenChange={(open) => !open && setMigrationTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>迁移用户归属</DialogTitle></DialogHeader>
          {migrationTarget && <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p>用户：{migrationTarget.name || migrationTarget.phone}（{migrationTarget.phone}）</p><p className="text-muted-foreground mt-1">当前归属：{getResellerName(migrationTarget.reseller_code, demoState)}</p></div>
            <div className="space-y-1.5"><Label>目标归属</Label><Select value={migrationResellerId} onValueChange={(value) => { setMigrationResellerId(value); setMigrationChecked(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">平台直客</SelectItem>{enabledResellers.filter((item) => item.id !== migrationTarget.reseller_code).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>迁移原因 *</Label><Textarea value={migrationReason} onChange={(e) => setMigrationReason(e.target.value)} placeholder="请输入客户迁移原因" /></div>
            {migrationChecked && (() => { const result = preflightUserMigration(migrationTarget.phone, migrationTarget.enterprises); return <div className={`rounded-lg border p-3 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{result.ok ? <><p className="font-medium">预检通过</p><p className="mt-1">将迁移 1 名用户。历史财务数据不受本次迁移影响。</p></> : <><p className="font-medium">预检未通过</p>{result.blockers.map((item) => <p key={item} className="mt-1">• {item}</p>)}</>}</div>; })()}
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setMigrationTarget(null)}>取消</Button>{!migrationChecked ? <Button onClick={() => { if (!migrationReason.trim()) { toast({ title: "请输入迁移原因", variant: "destructive" }); return; } setMigrationChecked(true); }}>执行预检</Button> : <Button disabled={!migrationTarget || !preflightUserMigration(migrationTarget.phone, migrationTarget.enterprises).ok} onClick={() => { if (!migrationTarget) return; migrateUser(migrationTarget.phone, migrationResellerId === "direct" ? null : migrationResellerId, migrationReason.trim()); toast({ title: "迁移成功", description: "旧代理商入口已失效，请通过新入口登录；历史财务数据不受影响。" }); setMigrationTarget(null); setDrawerOpen(false); setDemoRevision((value) => value + 1); fetchAll(); }}>确认迁移</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
