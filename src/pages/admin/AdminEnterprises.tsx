import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, ChevronDown, Plus, X, Pencil, Trash2, Power, Download, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "@/lib/adminAuth";
import { getResellerDemoState, getResellerName, migrateEnterprise, setEnterpriseAssignment } from "@/lib/resellerDemo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MODEL_ACCESS_OPTIONS = [
  { value: "国内", label: "国内" },
  { value: "国际", label: "国际" },
];



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
  };

  // 保存二级弹窗中的自定义分组
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
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">基础令牌分组</th>
                  <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[90px]">是否可用</th>
                  <th className="px-3 py-1.5 text-right font-medium text-muted-foreground w-[90px]">当前倍率</th>
                  <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[90px]">模板配置</th>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">描述/模型系列</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ALL_BASE_GROUPS.map((bg) => {
                  const entry = editingCustomGroups[bg.name] ?? { available: false, rate: bg.defaultRate };
                  const baseline = customBaselineGroups[bg.name] ?? entry;
                  return (
                    <tr key={bg.name} className={`${entry.available ? "" : "opacity-45"} hover:bg-muted/30`}>
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

interface AdminInfo {
  phone: string;
  name: string | null;
  user_type?: "formal" | "test";
}

interface Enterprise {
  id: string;
  name: string;
  owner_phone: string;
  enterprise_code: string;
  created_at: string;
  cert_status: string;
  status: "enabled" | "disabled";
  balance: number;
  credit_balance: number;
  credit_limit: number;
  total_consumed: number;
  org_count: number;
  member_count: number;
  api_key_count: number;
  admins: AdminInfo[];
  enterprise_type?: "formal" | "test";
  group?: string;
  has_business_data?: boolean;
  reseller_code?: string | null;
  reseller_conflict_user_count?: number;
}

const CERT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uncertified: { label: "未认证", variant: "secondary" },
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "outline" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

// Mock 企业数据（开发测试用）
const MOCK_ENTERPRISES: Enterprise[] = [
  {
    id: "mock-001",
    name: "腾讯科技",
    owner_phone: "13800138001",
    enterprise_code: "TX2024001",
    created_at: "2024-01-15T08:30:00Z",
    cert_status: "approved",
    status: "enabled",
    balance: 158000.50,
    credit_balance: 0,
    credit_limit: 0,
    total_consumed: 45200.00,
    org_count: 5,
    member_count: 128,
    api_key_count: 12,
    admins: [{ phone: "13800138001", name: "张三", user_type: "formal" }],
    enterprise_type: "formal",
    has_business_data: true,
    reseller_code: "agent-001",
    reseller_conflict_user_count: 3,
  },
  {
    id: "mock-002",
    name: "阿里巴巴",
    owner_phone: "13800138002",
    enterprise_code: "AL2024002",
    created_at: "2024-02-20T10:15:00Z",
    cert_status: "approved",
    status: "enabled",
    balance: 256000.00,
    credit_balance: 60000.00,
    credit_limit: 100000.00,
    total_consumed: 89000.00,
    org_count: 8,
    member_count: 256,
    api_key_count: 20,
    admins: [{ phone: "13800138002", name: "李四", user_type: "formal" }],
    enterprise_type: "formal",
    has_business_data: true,
    reseller_code: "agent-002",
    reseller_conflict_user_count: 1,
  },
  {
    id: "mock-003",
    name: "字节跳动",
    owner_phone: "13800138003",
    enterprise_code: "BD2024003",
    created_at: "2024-03-10T14:20:00Z",
    cert_status: "pending",
    status: "enabled",
    balance: 0,
    credit_balance: 20000.00,
    credit_limit: 20000.00,
    total_consumed: 32000.00,
    org_count: 3,
    member_count: 89,
    api_key_count: 8,
    admins: [{ phone: "13800138003", name: "王五", user_type: "formal" }],
    enterprise_type: undefined,
    has_business_data: true,
  },
  {
    id: "mock-004",
    name: "美团",
    owner_phone: "13800138004",
    enterprise_code: "MT2024004",
    created_at: "2024-04-05T09:45:00Z",
    cert_status: "uncertified",
    status: "enabled",
    balance: 0,
    credit_balance: 0,
    credit_limit: 0,
    total_consumed: 15000.00,
    org_count: 2,
    member_count: 45,
    api_key_count: 5,
    admins: [{ phone: "13800138004", name: "赵六", user_type: "test" }],
    enterprise_type: undefined,
    has_business_data: true,
  },
  {
    id: "mock-005",
    name: "京东",
    owner_phone: "13800138005",
    enterprise_code: "JD2024005",
    created_at: "2024-05-12T11:30:00Z",
    cert_status: "approved",
    status: "disabled",
    balance: 320000.00,
    credit_balance: 40000.00,
    credit_limit: 80000.00,
    total_consumed: 120000.00,
    org_count: 10,
    member_count: 512,
    api_key_count: 25,
    admins: [{ phone: "13800138005", name: "孙七", user_type: "formal" }],
    enterprise_type: undefined,
    has_business_data: true,
  },
  {
    id: "mock-006",
    name: "拼多多",
    owner_phone: "13800138006",
    enterprise_code: "PDD2024006",
    created_at: "2024-06-08T16:00:00Z",
    cert_status: "rejected",
    status: "enabled",
    balance: 0,
    credit_balance: 0,
    credit_limit: 0,
    total_consumed: 0,
    org_count: 1,
    member_count: 23,
    api_key_count: 3,
    admins: [{ phone: "13800138006", name: "周八", user_type: "test" }],
    enterprise_type: "test",
    has_business_data: false,
  },
  {
    id: "mock-007",
    name: "小米科技",
    owner_phone: "13800138007",
    enterprise_code: "XM2024007",
    created_at: "2024-07-20T08:00:00Z",
    cert_status: "approved",
    status: "enabled",
    balance: 0,
    credit_balance: 30000.00,
    credit_limit: 30000.00,
    total_consumed: 65000.00,
    org_count: 6,
    member_count: 168,
    api_key_count: 15,
    admins: [{ phone: "13800138007", name: "吴九", user_type: "formal" }],
    enterprise_type: "formal",
    has_business_data: true,
  },
  {
    id: "mock-008",
    name: "华为云",
    owner_phone: "13800138008",
    enterprise_code: "HWY2024008",
    created_at: "2024-08-15T13:45:00Z",
    cert_status: "pending",
    status: "enabled",
    balance: 500000.00,
    credit_balance: 200000.00,
    credit_limit: 200000.00,
    total_consumed: 200000.00,
    org_count: 12,
    member_count: 800,
    api_key_count: 35,
    admins: [{ phone: "13800138008", name: "郑十", user_type: "formal" }],
    enterprise_type: undefined,
    has_business_data: true,
  },
  {
    id: "mock-009",
    name: "网易",
    owner_phone: "13800138009",
    enterprise_code: "WY2024009",
    created_at: "2024-09-01T10:20:00Z",
    cert_status: "uncertified",
    status: "enabled",
    balance: 0,
    credit_balance: 0,
    credit_limit: 0,
    total_consumed: 12000.00,
    org_count: 2,
    member_count: 38,
    api_key_count: 4,
    admins: [{ phone: "13800138009", name: "钱十一", user_type: "test" }],
    enterprise_type: undefined,
    has_business_data: false,
  },
  {
    id: "mock-010",
    name: "百度",
    owner_phone: "13800138010",
    enterprise_code: "BD2024010",
    created_at: "2024-10-10T15:30:00Z",
    cert_status: "approved",
    status: "enabled",
    balance: 375000.00,
    credit_balance: 150000.00,
    credit_limit: 150000.00,
    total_consumed: 150000.00,
    org_count: 9,
    member_count: 350,
    api_key_count: 22,
    admins: [{ phone: "13800138010", name: "陈十二", user_type: "formal" }],
    enterprise_type: "formal",
    has_business_data: true,
  },
];

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

// 绿色标签组件 - 企业标签
function GreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}
    </span>
  );
}

// 绿色标签组件 - 用户标签
function UserGreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}管理员
    </span>
  );
}

// 带标签的管理员单元格
function AdminCellWithTag({ admins }: { admins: AdminInfo[] }) {
  if (admins.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const first = admins[0];
  const extra = admins.length - 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">{first.name || "用户"}</span>
        <UserGreenTag type={first.user_type} name={first.name || "用户"} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{maskPhone(first.phone)}</span>
        {extra > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium cursor-default">
                  +{extra}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-48">
                <div className="space-y-1.5">
                  {admins.map((a) => (
                    <div key={a.phone}>
                      <p className="text-xs font-medium">{a.name || "用户"}</p>
                      <p className="text-xs text-muted-foreground">{maskPhone(a.phone)}</p>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

export default function AdminEnterprises({ resellerScopeId }: { resellerScopeId?: string } = {}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const session = getAdminSession();

  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [tokenGroupFilter, setTokenGroupFilter] = useState<string>("all");
  const [tokenGroupSearchQuery, setTokenGroupSearchQuery] = useState("");

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

  // Quick recharge dialog
  const [rechargeTarget, setRechargeTarget] = useState<Enterprise | null>(null);
  const [rechargeType, setRechargeType] = useState<"balance" | "credit">("balance");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  // Credit-specific states
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState("");
  const [creditBalanceDraft, setCreditBalanceDraft] = useState("");

  const openRechargeDialog = (enterprise: Enterprise, type: "balance" | "credit" = "balance") => {
    setRechargeTarget(enterprise);
    setRechargeType(type);
    setRechargeAmount("");
    setRechargeRemark("");
    if (type === "credit") {
      const isFirstTime = (enterprise.credit_limit ?? 0) === 0;
      setEditingLimit(isFirstTime);
      setLimitDraft("");
      setCreditBalanceDraft("");
    } else {
      setEditingLimit(false);
      setLimitDraft("");
      setCreditBalanceDraft("");
    }
  };

  // Add enterprise dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    enterpriseName: "",
    adminPhone: "",
    modelAccess: ["国际"] as string[],
    remarkType: "正式用户",
    remarkName: "",
    voucherEnabled: false,
    groupMode: "template" as "template" | "custom" | "all",
    selectedTemplate: TEMPLATE_OPTIONS[0]?.value || "default",
    selectedHistoricalGroup: "",
    customGroups: {} as Record<string, CustomGroupEntry>,
    agentId: "",
  });

  // ...

  // 备注类型选项
  const REMARK_TYPE_OPTIONS = ["正式用户", "内结用户", "测试用户", "测试用户（付费）", "研发", "演示", "其他"];
  const [addingEnterprise, setAddingEnterprise] = useState(false);

  // Edit enterprise sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Enterprise | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    voucherEnabled: false,
    groupMode: "template" as "template" | "custom" | "all",
    selectedTemplate: "default",
    selectedHistoricalGroup: "",
    customGroups: {} as Record<string, CustomGroupEntry>,
    modelAccess: ["国际"] as string[],
    remarkType: "正式用户",
    remarkName: "",
    agentId: "",
  });

  // ...
  const [savingEnterprise, setSavingEnterprise] = useState(false);
  const [migrationTarget, setMigrationTarget] = useState<Enterprise | null>(null);
  const [migrationResellerId, setMigrationResellerId] = useState("direct");
  const [migrationReason, setMigrationReason] = useState("");
  const [migrationChecked, setMigrationChecked] = useState(false);

  // Voucher config dialog state
  const [voucherConfigOpen, setVoucherConfigOpen] = useState(false);
  const [voucherConfigTarget, setVoucherConfigTarget] = useState<Enterprise | null>(null);
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

  const openVoucherConfig = (enterprise: Enterprise) => {
    setVoucherConfigTarget(enterprise);
    setVoucherTypeTab("billing");
    setSavingVoucherConfig(false);
    // 从 mock 存储加载已有配置
    const saved = voucherConfigStore[enterprise.id];
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
      toast({ title: "保存成功", description: `企业「${voucherConfigTarget.name}」的返券配置已更新` });
      setVoucherConfigEditing(false);
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setSavingVoucherConfig(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);

    // 使用 mock 数据（开发测试用）
    const useMockData = true;
    if (useMockData) {
      setTimeout(() => {
        setEnterprises(MOCK_ENTERPRISES);
        setLoading(false);
      }, 500);
      return;
    }

    const { data: ents, error } = await supabase
      .from("enterprises")
        .select("id,name,owner_phone,enterprise_code,created_at,status,remark,reseller_code")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("获取企业数据失败:", error);
      setLoading(false);
      return;
    }

    if (!ents) { setLoading(false); return; }

    const ids = ents.map((e) => e.id);
    const [
      { data: certs },
      { data: balances },
      { data: orgs },
      { data: members },
      { data: adminMembers },
      { data: apiKeys },
    ] = await Promise.all([
      supabase.from("enterprise_certifications").select("enterprise_id,status").in("enterprise_id", ids),
      supabase.from("enterprise_balances").select("enterprise_id,balance,total_consumed").in("enterprise_id", ids),
      supabase.from("organizations").select("enterprise_id").in("enterprise_id", ids),
      supabase.from("members").select("enterprise_id").in("enterprise_id", ids),
      supabase.from("members").select("enterprise_id,user_phone").in("enterprise_id", ids).eq("role", "admin"),
      supabase.from("api_keys").select("enterprise_id").in("enterprise_id", ids),
    ]);

    // Fetch user names for admin members + enterprise owners
    const ownerPhones = ents.map((e) => e.owner_phone);
    const adminPhones = [...new Set([
      ...ownerPhones,
      ...(adminMembers || []).map((m) => m.user_phone),
    ])];
    const { data: userRecords } = adminPhones.length > 0
      ? await supabase.from("users").select("phone,name").in("phone", adminPhones)
      : { data: [] };

    const nameMap = Object.fromEntries((userRecords || []).map((u) => [u.phone, u.name]));

    // Group admins by enterprise: owner first, then org admins
    const adminsMap: Record<string, AdminInfo[]> = {};
    for (const e of ents) {
      adminsMap[e.id] = [{ phone: e.owner_phone, name: nameMap[e.owner_phone] ?? null, user_type: "test" }];
    }
    for (const m of adminMembers || []) {
      // avoid duplicating if owner is also an org admin
      if (!adminsMap[m.enterprise_id]) adminsMap[m.enterprise_id] = [];
      if (!adminsMap[m.enterprise_id].find((a) => a.phone === m.user_phone)) {
        adminsMap[m.enterprise_id].push({ phone: m.user_phone, name: nameMap[m.user_phone] ?? null, user_type: "test" });
      }
    }

    const certMap = Object.fromEntries((certs || []).map((c) => [c.enterprise_id, c.status]));
    const balMap = Object.fromEntries((balances || []).map((b) => [b.enterprise_id, b]));
    const orgCount = (orgs || []).reduce((acc, o) => { acc[o.enterprise_id] = (acc[o.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);
    const memberCount = (members || []).reduce((acc, m) => { acc[m.enterprise_id] = (acc[m.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);
    const apiKeyCount = (apiKeys || []).reduce((acc, k) => { acc[k.enterprise_id] = (acc[k.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);

    setEnterprises(ents.map((e) => {
      // Parse remark field (format: "类型_名称" e.g. "正式用户_腾讯")
      const remarkParts = (e.remark || "").split("_");
      const remarkType = remarkParts[0] || undefined;
      // Derive enterprise_type from remark
      const enterpriseType: "formal" | "test" | undefined =
        remarkType === "正式用户" ? "formal" :
        remarkType === "测试用户" || remarkType === "测试用户（付费）" ? "test" :
        undefined;
      return {
        ...e,
        cert_status: certMap[e.id] || "uncertified",
        status: (e.status as "enabled" | "disabled") || "enabled",
        balance: balMap[e.id]?.balance ?? 0,
        total_consumed: balMap[e.id]?.total_consumed ?? 0,
        org_count: orgCount[e.id] ?? 0,
        member_count: memberCount[e.id] ?? 0,
        api_key_count: apiKeyCount[e.id] ?? 0,
        admins: adminsMap[e.id] ?? [],
        enterprise_type: enterpriseType,
        has_business_data: (balMap[e.id]?.total_consumed ?? 0) > 0 || (apiKeyCount[e.id] ?? 0) > 0,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecharge = async () => {
    if (!rechargeTarget) return;
    const operator = session?.phone || "admin";
    const extraRemark = "";
    const currentLimit = rechargeTarget.credit_limit ?? 0;
    const currentCreditBalance = rechargeTarget.credit_balance ?? 0;
    const currentBalance = rechargeTarget.balance;
    const isFirstTime = rechargeType === "credit" && currentLimit === 0;

    setRechargeLoading(true);
    try {
      // Mock 模式直接更新本地数据
      const useMockData = true;

      if (rechargeType === "balance") {
        const inputVal = parseFloat(rechargeAmount);
        if (isNaN(inputVal) || inputVal === 0) {
          toast({ title: "请输入有效金额", variant: "destructive" });
          setRechargeLoading(false);
          return;
        }
        const delta = inputVal;
        if (useMockData) {
          await new Promise(resolve => setTimeout(resolve, 400));
          setEnterprises(prev => prev.map(e =>
            e.id === rechargeTarget.id ? { ...e, balance: e.balance + delta } : e
          ));
        } else {
          const { error } = await supabase.rpc("admin_recharge_enterprise", {
            p_enterprise_id: rechargeTarget.id,
            p_amount: delta,
            p_operator: operator,
            p_type: "balance",
            p_extra_remark: extraRemark || null,
          });
          if (error) throw error;
        }
        toast({ title: `已为「${rechargeTarget.name}」充值余额 ¥${delta.toFixed(2)}` });
      } else {
        const newLimitVal = parseFloat(limitDraft);
        const newBalanceVal = parseFloat(creditBalanceDraft);

        if (isFirstTime) {
          // A: 首次开授信
          if (limitDraft === "" || isNaN(newLimitVal) || newLimitVal < 0) {
            toast({ title: "请输入有效的初始授信额度", variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          if (useMockData) {
            await new Promise(resolve => setTimeout(resolve, 400));
            setEnterprises(prev => prev.map(e =>
              e.id === rechargeTarget.id ? { ...e, credit_limit: newLimitVal, credit_balance: newLimitVal } : e
            ));
          } else {
            const { error: err1 } = await supabase.rpc("admin_set_credit_limit", {
              p_enterprise_id: rechargeTarget.id,
              p_new_limit: newLimitVal,
              p_operator: operator,
              p_extra_remark: null,
            });
            if (err1) throw err1;
            const { error: err2 } = await supabase.rpc("admin_set_credit_balance", {
              p_enterprise_id: rechargeTarget.id,
              p_new_balance: newLimitVal,
              p_operator: operator,
              p_extra_remark: extraRemark || null,
            });
            if (err2) throw err2;
          }
          toast({ title: `「${rechargeTarget.name}」初始授信已设置至 ¥${newLimitVal.toFixed(2)}` });
        } else {
          // B: 非首次 — 可同时修改初始额度和剩余授信额度
          const limitChanged = limitDraft !== "" && !isNaN(newLimitVal) && Math.abs(newLimitVal - currentLimit) >= 0.01;
          const balanceChanged = creditBalanceDraft !== "" && !isNaN(newBalanceVal) && Math.abs(newBalanceVal - currentCreditBalance) >= 0.01;

          if (!limitChanged && !balanceChanged) {
            setRechargeLoading(false);
            return;
          }

          // 校验初始额度
          if (limitChanged && newLimitVal < 0) {
            toast({ title: "请输入有效的初始授信额度", variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          const effectiveBalance = balanceChanged ? newBalanceVal : currentCreditBalance;
          if (limitChanged && newLimitVal < effectiveBalance - 0.01) {
            toast({ title: `初始授信额度不能小于剩余授信额度 ¥${effectiveBalance.toFixed(2)}`, variant: "destructive" });
            setRechargeLoading(false);
            return;
          }

          // 校验剩余额度
          if (balanceChanged && newBalanceVal < 0) {
            toast({ title: "请输入有效的剩余授信额度", variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          const effectiveLimit = limitChanged ? newLimitVal : currentLimit;
          if (balanceChanged && newBalanceVal > effectiveLimit + 0.01) {
            toast({ title: `剩余授信额度不能超过初始授信额度 ¥${effectiveLimit.toFixed(2)}`, variant: "destructive" });
            setRechargeLoading(false);
            return;
          }

          if (useMockData) {
            await new Promise(resolve => setTimeout(resolve, 400));
            setEnterprises(prev => prev.map(e => {
              if (e.id !== rechargeTarget.id) return e;
              const updated = { ...e };
              if (limitChanged) updated.credit_limit = newLimitVal;
              if (balanceChanged) updated.credit_balance = newBalanceVal;
              return updated;
            }));
          } else {
            if (limitChanged) {
              const { error } = await supabase.rpc("admin_set_credit_limit", {
                p_enterprise_id: rechargeTarget.id,
                p_new_limit: newLimitVal,
                p_operator: operator,
                p_extra_remark: extraRemark || null,
              });
              if (error) throw error;
            }
            if (balanceChanged) {
              const { error } = await supabase.rpc("admin_set_credit_balance", {
                p_enterprise_id: rechargeTarget.id,
                p_new_balance: newBalanceVal,
                p_operator: operator,
                p_extra_remark: extraRemark || null,
              });
              if (error) throw error;
            }
          }

          const parts: string[] = [];
          if (limitChanged) parts.push(`初始授信调整至 ¥${newLimitVal.toFixed(2)}`);
          if (balanceChanged) parts.push(`剩余授信调整至 ¥${newBalanceVal.toFixed(2)}`);
          toast({ title: `「${rechargeTarget.name}」${parts.join("，")}` });
        }
      }
      setRechargeTarget(null);
      setRechargeAmount("");
      setRechargeRemark("");
      setEditingLimit(false);
      setLimitDraft("");
      setCreditBalanceDraft("");
      if (!useMockData) fetchData();
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setRechargeLoading(false);
    }
  };

  const filtered = enterprises.filter((enterprise) => !resellerScopeId || enterprise.reseller_code === resellerScopeId).filter(
    (e) => {
      const matchSearch = e.name.includes(search) ||
        e.owner_phone.includes(search) ||
        e.enterprise_code.includes(search);
      const matchCert = certFilter ? e.cert_status === certFilter : true;
      // 分组筛选
      const matchGroup = groupFilter === "all" ? true : e.group === groupFilter;
      // 标签筛选逻辑：映射中文标签到 enterprise_type
      let matchTag = true;
      if (tagFilter === "none") {
        matchTag = e.enterprise_type === undefined;
      } else if (tagFilter !== "all") {
        const typeMap: Record<string, "formal" | "test"> = {
          "正式用户": "formal",
          "测试用户": "test",
          "测试用户（付费）": "test",
        };
        const mappedType = typeMap[tagFilter];
        matchTag = mappedType ? e.enterprise_type === mappedType : e.enterprise_type !== undefined;
      }
      return matchSearch && matchCert && matchGroup && matchTag;
    }
  );

  const handleAddEnterprise = async () => {
    if (!addForm.enterpriseName.trim()) {
      toast({ title: "请输入企业名称", variant: "destructive" });
      return;
    }
    if (!addForm.adminPhone.trim()) {
      toast({ title: "请输入企业管理员手机号/用户ID", variant: "destructive" });
      return;
    }

    // 组合备注：类型_输入信息
    const remark = `${addForm.remarkType}_${addForm.remarkName}`;

    setAddingEnterprise(true);
    try {
      // 验证管理员是否存在
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("phone")
        .or(`phone.eq.${addForm.adminPhone.trim()},id.eq.${addForm.adminPhone.trim()}`)
        .maybeSingle();

      const demoOwner = getResellerDemoState().users.find((item) => item.phone === addForm.adminPhone.trim());
      if ((userError || !userData) && !demoOwner) {
        toast({ title: "管理员不存在", description: "请检查手机号或用户ID是否正确", variant: "destructive" });
        setAddingEnterprise(false);
        return;
      }

      const ownerPhone = userData?.phone || demoOwner!.phone;
      const ownerAssignment = getResellerDemoState().users.find((item) => item.phone === ownerPhone);
      const ownerResellerId = ownerAssignment?.resellerId ?? null;

      // 创建企业
      const { data: enterpriseData, error: enterpriseError } = await supabase
        .from("enterprises")
        .insert({
          name: addForm.enterpriseName.trim(),
          owner_phone: ownerPhone,
          remark: remark,
          status: "enabled",
          reseller_code: ownerResellerId,
        })
        .select()
        .single();

      if (enterpriseError) {
        toast({ title: "创建失败", description: enterpriseError.message, variant: "destructive" });
        setAddingEnterprise(false);
        return;
      }

      // 创建企业余额记录
      await supabase.from("enterprise_balances").insert({
        enterprise_id: enterpriseData.id,
        balance: 0,
        total_consumed: 0,
      });

      // 将管理员添加为成员
      await supabase.from("members").insert({
        enterprise_id: enterpriseData.id,
        user_phone: ownerPhone,
        role: "owner",
      });
      setEnterpriseAssignment(enterpriseData.id, ownerResellerId);

      toast({ title: "企业创建成功", description: `企业「${addForm.enterpriseName}」已添加` });
      setAddDialogOpen(false);
      setAddForm({ enterpriseName: "", adminPhone: "", modelAccess: ["国际"], remarkType: "正式用户", remarkName: "", voucherEnabled: false, groupMode: "template" as const, selectedTemplate: TEMPLATE_OPTIONS[0]?.value || "default", selectedHistoricalGroup: "", customGroups: {}, agentId: "" });
      fetchData(); // 刷新企业列表
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setAddingEnterprise(false);
    }
  };

  // Delete enterprise dialog state
  const [deleteTarget, setDeleteTarget] = useState<Enterprise | null>(null);

  // Toggle enterprise status (enable/disable) dialog state
  const [toggleStatusTarget, setToggleStatusTarget] = useState<Enterprise | null>(null);

  const COLS = "grid-cols-[2fr_1.5fr_80px_1fr_1.2fr_1fr_80px_100px_88px]";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">企业管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">共 {filtered.length} 家企业</p>
          </div>
          <Button
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            添加企业
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索企业名称 / 手机号…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-32 h-9 justify-between bg-white">
                <span className="truncate">{groupFilter === "all" ? "全部用户分组" : groupFilter}</span>
                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 align-start">
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
            <PopoverContent className="w-[200px] p-0 align-start">
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
          <Button
            variant="outline"
            className="h-9 gap-1.5 bg-white"
            onClick={() => {
              if (filtered.length === 0) { toast({ title: "暂无数据可导出", variant: "destructive" }); return; }
              const headers = ["企业名称","企业管理员","状态","认证状态","余额(元)","历史消耗(元)","部门数","成员数","API Key 数","注册时间"];
              const rows = filtered.map(e => [
                e.name,
                e.admins.map(a => a.name || a.phone).join(";"),
                e.status === "enabled" ? "已启用" : "已禁用",
                { uncertified:"未认证", pending:"待审核", approved:"已通过", rejected:"已拒绝" }[e.cert_status] || e.cert_status,
                e.balance.toFixed(2),
                e.total_consumed.toFixed(2),
                String(e.org_count),
                String(e.member_count),
                String(e.api_key_count),
                new Date(e.created_at).toLocaleDateString("zh-CN"),
              ]);
              const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const BOM = "\uFEFF";
              const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `企业管理_${new Date().toLocaleDateString("zh-CN")}.csv`;
              a.click(); URL.revokeObjectURL(url);
              toast({ title: "导出成功", description: `已导出 ${filtered.length} 条企业数据` });
            }}
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className={`grid ${COLS} gap-3 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b`}>
          <span>企业名称</span>
          <span>企业管理员</span>
          <span>状态</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground focus:outline-none">
              认证状态
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setCertFilter(null)}>
                {certFilter === null ? "✓ " : "  "}全部
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("uncertified")}>
                {certFilter === "uncertified" ? "✓ " : "  "}未认证
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("approved")}>
                {certFilter === "approved" ? "✓ " : "  "}已认证
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("pending")}>
                {certFilter === "pending" ? "✓ " : "  "}待审核
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("rejected")}>
                {certFilter === "rejected" ? "✓ " : "  "}未通过
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span>余额 / 历史消耗</span>
          <span>部门 / 成员</span>
          <span>API Key</span>
          <span>注册时间</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((e) => {
            const certBadge = CERT_STATUS[e.cert_status] || CERT_STATUS.uncertified;
            return (
              <div key={e.id} className={`grid ${COLS} gap-3 px-5 py-3.5 items-center text-sm border-b last:border-0 hover:bg-muted/20 transition-colors`}>
                {/* 企业名称 */}
                <div
                  className="cursor-pointer group min-w-0"
                  onClick={() => navigate(`/admin/enterprises/${e.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{e.name}</p>
                    <GreenTag type={e.enterprise_type} name={e.name} />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{e.enterprise_code}</p>
                </div>

                {/* 企业管理员 */}
                <div className="min-w-0">
                  <AdminCellWithTag admins={e.admins} />
                </div>

                {/* 状态 */}
                <span>
                  <Badge
                    variant={e.status === "disabled" ? "destructive" : "outline"}
                    className={`text-xs ${e.status === "enabled" ? "border-green-200 text-green-600 bg-green-50" : ""}`}
                  >
                    {e.status === "disabled" ? "已禁用" : "已启用"}
                  </Badge>
                </span>

                {/* 认证状态 */}
                <span>
                  <Badge variant={certBadge.variant} className="text-xs">{certBadge.label}</Badge>
                </span>

                {/* 余额 / 总消耗 */}
                <div className="text-xs leading-5">
                  <span className="text-foreground font-medium">¥{e.balance.toFixed(2)}</span>
                  <span className="text-muted-foreground"> / ¥{e.total_consumed.toFixed(2)}</span>
                </div>

                {/* 部门 / 成员 */}
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{e.org_count}</span> 部门 ·{" "}
                  <span className="text-foreground font-medium">{e.member_count}</span> 人
                </div>

                {/* API Key 数量 */}
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{e.api_key_count}</span> 个
                </div>

                {/* 注册时间 */}
                <div className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => openRechargeDialog(e)}
                  >
                    充值
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="查看详情"
                    onClick={() => navigate(`/admin/enterprises/${e.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                    title="编辑企业"
                    onClick={() => {
                      setEditTarget(e);
                      // 解析备注格式 "类型_输入信息"
                      const mockRemark = "正式用户_测试备注"; // 实际应从企业数据中获取
                      const parts = mockRemark.split("_");
                      const type = parts[0] && REMARK_TYPE_OPTIONS.includes(parts[0]) ? parts[0] : "正式用户";
                      const name = parts.slice(1).join("_") || "";
                      setEditForm((prev) => ({
                        ...prev,
                        name: e.name,
                        voucherEnabled: false,
                        groupMode: "template" as const,
                        selectedTemplate: e.group && TEMPLATE_OPTIONS.some(t => t.value === e.group) ? (e.group as string) : "default",
                        customGroups: {},
                        modelAccess: ["国际"],
                        remarkType: type,
                        remarkName: name,
                        agentId: e.reseller_code || "",
                      }));
                      setEditSheetOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                    title={e.status === "enabled" ? "禁用企业" : "启用企业"}
                    onClick={() => setToggleStatusTarget(e)}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="删除企业"
                    onClick={() => setDeleteTarget(e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs font-medium text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                    onClick={() => openVoucherConfig(e)}
                  >
                    返券配置
                    {voucherConfigMap[e.id] && (
                      <span className={`ml-1 inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-medium ${voucherConfigMap[e.id].enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        <span className={`w-1 h-1 rounded-full ${voucherConfigMap[e.id].enabled ? "bg-green-500" : "bg-gray-400"}`}></span>
                        {voucherConfigMap[e.id].enabled ? "已启用" : "已配置"}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Recharge Dialog */}
      <Dialog open={!!rechargeTarget} onOpenChange={(open) => { if (!open) setRechargeTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>手动充值</DialogTitle>
          </DialogHeader>
          {rechargeTarget && (() => {
            const currentBalance = rechargeType === "balance" ? rechargeTarget.balance : rechargeTarget.credit_balance;
            const creditLimit = rechargeTarget.credit_limit ?? 0;
            const isFirstTime = rechargeType === "credit" && creditLimit === 0;
            const amountNum = parseFloat(rechargeAmount);
            // balance 模式：输入值为增量
            const delta = isNaN(amountNum) ? 0 : amountNum;
            const newBalance = currentBalance + delta;

            // credit 模式下的派生值
            const newLimitDraft = parseFloat(limitDraft);
            const limitChanged = limitDraft !== "" && !isNaN(newLimitDraft) && Math.abs(newLimitDraft - creditLimit) >= 0.01;
            const newBalanceDraft = parseFloat(creditBalanceDraft);
            const balanceChanged = creditBalanceDraft !== "" && !isNaN(newBalanceDraft) && Math.abs(newBalanceDraft - currentBalance) >= 0.01;

            // 提交按钮禁用条件
            let submitDisabled = rechargeLoading;
            let previewRemark: string | null = null;
            if (rechargeType === "balance") {
              submitDisabled = submitDisabled || rechargeAmount === "" || isNaN(amountNum) || amountNum === 0;
              if (!submitDisabled) {
                const actionLabel = delta >= 0 ? "充值" : "扣减";
                previewRemark = `${actionLabel}余额 ¥${Math.abs(delta).toFixed(2)}，余额由 ¥${currentBalance.toFixed(2)} 调整至 ¥${newBalance.toFixed(2)}`;
              }
            } else {
              if (isFirstTime) {
                submitDisabled = submitDisabled || limitDraft === "" || isNaN(newLimitDraft) || newLimitDraft < 0;
                if (!submitDisabled) {
                  previewRemark = `初始授信设置至 ¥${newLimitDraft.toFixed(2)}`;
                }
              } else {
                submitDisabled = submitDisabled || (!limitChanged && !balanceChanged);
                if (!submitDisabled) {
                  const parts: string[] = [];
                  if (limitChanged) parts.push(`初始授信调整至 ¥${newLimitDraft.toFixed(2)}`);
                  if (balanceChanged) parts.push(`剩余授信调整至 ¥${newBalanceDraft.toFixed(2)}`);
                  previewRemark = parts.join("，");
                }
              }
            }
            const finalRemark = previewRemark;

            return (
              <>
                <div className="space-y-1.5 py-1 text-sm">
                  <p className="text-muted-foreground">
                    企业：<span className="text-foreground font-medium">{rechargeTarget.name}</span>
                    <span className="text-muted-foreground">（ID: {rechargeTarget.id.slice(0, 8)}）</span>
                  </p>
                  {rechargeType === "balance" ? (
                    <p className="text-muted-foreground">
                      当前余额：
                      <span className="text-foreground font-medium tabular-nums">¥{currentBalance.toFixed(2)}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      当前剩余授信：
                      <span className="text-foreground font-medium tabular-nums">¥{currentBalance.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>充值类型</Label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="rechargeType"
                          value="balance"
                          checked={rechargeType === "balance"}
                          onChange={() => {
                            setRechargeType("balance");
                            setRechargeAmount("");
                            setEditingLimit(false);
                            setLimitDraft("");
                            setCreditBalanceDraft("");
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium">充值余额</p>
                          <p className="text-xs text-muted-foreground">普通现金余额，可直接消费</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="rechargeType"
                          value="credit"
                          checked={rechargeType === "credit"}
                          onChange={() => {
                            const firstTime = (rechargeTarget.credit_limit ?? 0) === 0;
                            setRechargeType("credit");
                            setRechargeAmount("");
                            setEditingLimit(firstTime);
                            setLimitDraft("");
                            setCreditBalanceDraft("");
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium">授信额度</p>
                          <p className="text-xs text-muted-foreground">先用后付额度，账期后结算</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  {rechargeType === "balance" ? (
                    <div className="space-y-1.5">
                      <Label>充值金额 <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="请输入充值金额（支持负数）"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        新余额：
                        <span className="text-foreground">¥{currentBalance.toFixed(2)}</span>
                        {delta !== 0 && (
                          <>
                            <span className="mx-1">{delta >= 0 ? "+" : "-"}</span>
                            <span className="text-foreground">¥{Math.abs(delta).toFixed(2)}</span>
                            <span className="mx-1">=</span>
                            <span className={`font-semibold ${newBalance < 0 ? "text-red-600" : "text-foreground"}`}>¥{newBalance.toFixed(2)}</span>
                          </>
                        )}
                        {delta === 0 && rechargeAmount !== "" && (
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
                    <div className="space-y-3">
                      {/* 上方：初始授信额度（左）+ 当前剩余授信额度（右） */}
                      <div className="grid grid-cols-2 gap-3">
                      {/* 初始授信额度（就地编辑） */}
                      <div className="space-y-1.5">
                        <Label>初始授信额度 {isFirstTime && <span className="text-red-500">*</span>}</Label>
                        {editingLimit ? (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                placeholder={isFirstTime ? "请输入初始授信额度" : "请输入新的初始授信额度"}
                                value={limitDraft}
                                onChange={(e) => setLimitDraft(e.target.value)}
                                className="pl-7"
                                autoFocus
                              />
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                              onClick={() => setEditingLimit(false)}
                              disabled={rechargeLoading || limitDraft === "" || isNaN(newLimitDraft) || newLimitDraft < 0 || (!isFirstTime && (!limitChanged || newLimitDraft < (rechargeTarget.credit_balance ?? 0) - 0.01))}
                              title="确认"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            {!isFirstTime && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                onClick={() => {
                                  setEditingLimit(false);
                                  setLimitDraft("");
                                }}
                                disabled={rechargeLoading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium tabular-nums">¥{(limitDraft !== "" && !isNaN(newLimitDraft) ? newLimitDraft : creditLimit).toFixed(2)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setLimitDraft(String(limitDraft !== "" && !isNaN(newLimitDraft) ? newLimitDraft : creditLimit));
                                setEditingLimit(true);
                              }}
                              disabled={rechargeLoading}
                              title="编辑初始授信额度"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        {editingLimit && !isFirstTime && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">修改初始额度不影响当前剩余额度</p>
                            {(() => {
                              const v = parseFloat(limitDraft);
                              const cb = rechargeTarget.credit_balance ?? 0;
                              if (!isNaN(v) && v < cb - 0.01) {
                                return <p className="text-xs text-red-500">新值不能小于剩余授信额度</p>;
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* 当前剩余授信额度（只读展示，右侧） */}
                      <div className="space-y-1.5">
                        <Label>当前剩余授信额度</Label>
                        <div className="rounded-md bg-muted/40 px-3 py-2 h-[38px] flex items-center">
                          <p className="text-base font-semibold tabular-nums text-foreground">¥{currentBalance.toFixed(2)}</p>
                        </div>
                      </div>
                      </div>

                      {/* 下方：设置剩余授信额度输入框（仅非首次） */}
                      {!isFirstTime && (
                        <div className="space-y-1.5">
                          <Label>设置剩余授信额度</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="请输入目标剩余授信额度"
                              value={creditBalanceDraft}
                              onChange={(e) => setCreditBalanceDraft(e.target.value)}
                              className="pl-7"
                              disabled={rechargeLoading}
                            />
                          </div>
                          {creditBalanceDraft !== "" && !isNaN(newBalanceDraft) && (
                            <p className="text-sm text-muted-foreground tabular-nums">
                              <span className="text-foreground font-medium">¥{currentBalance.toFixed(2)}</span>
                              <span className="mx-1">→</span>
                              <span className={`font-semibold ${newBalanceDraft < 0 ? "text-red-600" : "text-foreground"}`}>¥{newBalanceDraft.toFixed(2)}</span>
                              <span className="ml-1 text-xs">
                                ({newBalanceDraft >= currentBalance ? "增加" : "扣减"} ¥{Math.abs(newBalanceDraft - currentBalance).toFixed(2)})
                              </span>
                            </p>
                          )}
                          {creditBalanceDraft !== "" && !isNaN(newBalanceDraft) && newBalanceDraft < 0 && (
                            <p className="text-xs text-red-500">剩余授信额度不能为负数</p>
                          )}
                          {creditBalanceDraft !== "" && !isNaN(newBalanceDraft) && newBalanceDraft >= 0 && newBalanceDraft > (limitChanged ? newLimitDraft : creditLimit) + 0.01 && (
                            <p className="text-xs text-red-500">剩余授信额度不能超过初始授信额度</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="rounded-md bg-muted/50 border px-3 py-2 space-y-1">
                    <p className="text-xs text-muted-foreground">备注预览</p>
                    <p className="text-xs text-foreground break-words">{finalRemark}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRechargeTarget(null)} disabled={rechargeLoading}>取消</Button>
                  <Button onClick={handleRecharge} disabled={submitDisabled}>
                    {rechargeLoading ? "处理中…" : "确认保存"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Enterprise Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">新建</span>
                <DialogTitle className="text-base font-semibold">添加企业</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {/* 表单字段 */}
            <div className="space-y-4">
              {/* 企业名称 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  企业名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入企业名称"
                  value={addForm.enterpriseName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, enterpriseName: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              {/* 企业管理员 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  企业管理员 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入手机号或用户ID"
                  value={addForm.adminPhone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, adminPhone: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              {/* 模型访问权限 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  模型访问权限 <span className="text-red-500">*</span>
                </Label>
                <ModelAccessSelect
                  value={addForm.modelAccess}
                  onChange={(access) => setAddForm((prev) => ({ ...prev, modelAccess: access }))}
                />
              </div>

              {/* 备注 */}
              <div className="space-y-1.5">
                <Label className="text-sm">备注</Label>
                <div className="flex gap-2">
                  <Select
                    value={addForm.remarkType}
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

              {/* 代理商归属 */}
              <div className="space-y-1.5">
                <Label className="text-sm">代理商归属</Label>
                <div className="h-10 px-3 rounded-md border bg-gray-50 flex items-center text-sm">根据企业 Owner 自动继承</div>
                <p className="text-xs text-gray-400">创建时将读取 Owner 的归属，归属不允许在此单独选择。</p>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => {
                setAddDialogOpen(false);
                setAddForm({ enterpriseName: "", adminPhone: "", modelAccess: ["国际"], remarkType: "正式用户", remarkName: "", voucherEnabled: false, groupMode: "template" as const, selectedTemplate: TEMPLATE_OPTIONS[0]?.value || "default", selectedHistoricalGroup: "", customGroups: {}, agentId: "" });
              }}
            >
              取消
            </Button>
            <Button
              className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAddEnterprise}
              disabled={addingEnterprise}
            >
              {addingEnterprise ? "创建中…" : "确认"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Enterprise Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="sm:max-w-md p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">编辑</span>
              <SheetTitle className="text-base font-semibold">编辑企业</SheetTitle>
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-5">
            {/* 企业名称 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                企业名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入企业名称"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-10 bg-gray-50/50 border-gray-200"
              />
            </div>

            {/* 分组 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                分组 <span className="text-red-500">*</span>
              </Label>
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

            {/* 模型访问权限 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                模型访问权限 <span className="text-red-500">*</span>
              </Label>
              <ModelAccessSelect
                value={editForm.modelAccess}
                onChange={(access) => setEditForm((prev) => ({ ...prev, modelAccess: access }))}
              />
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
              <Label className="text-sm">备注</Label>
              <div className="flex gap-2">
                <Select
                  value={editForm.remarkType}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, remarkType: value }))}
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
                  value={editForm.remarkName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, remarkName: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200 flex-1"
                />
              </div>
              <p className="text-xs text-gray-400">备注格式：类型_输入信息</p>
            </div>

            {/* 代理商归属 */}
            <div className="space-y-1.5">
              <Label className="text-sm">代理商归属</Label>
              <div className="h-10 px-3 rounded-md border bg-gray-50 flex items-center justify-between text-sm"><span>{getResellerName(editTarget?.reseller_code, getResellerDemoState())}</span><Button type="button" variant="outline" size="sm" onClick={() => { if (!editTarget) return; setMigrationTarget(editTarget); setMigrationResellerId("direct"); setMigrationReason(""); setMigrationChecked(false); }}>整体迁移</Button></div>
              <p className="text-xs text-gray-400">企业归属不可直接编辑，需通过独立的企业整体迁移流程处理。</p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => setEditSheetOpen(false)}
            >
              取消
            </Button>
            <Button
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!editTarget || !editForm.name.trim()) {
                  toast({ title: "请输入企业名称", variant: "destructive" });
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
                const resellerChanged = (editTarget.reseller_code || "") !== editForm.agentId;
                if (resellerChanged) {
                  const nextLabel = AGENT_OPTIONS.find((item) => item.value === editForm.agentId)?.label || "直客";
                  const confirmed = window.confirm(
                    `确认将企业切换为「${nextLabel}」吗？\n企业拥有者及全部成员的代理商标签将同步修改，后续需通过新入口登录。`,
                  );
                  if (!confirmed) return;
                }
                // 组合备注：类型_输入信息
                const remark = `${editForm.remarkType}_${editForm.remarkName}`;
                setSavingEnterprise(true);
                try {
                  const { error } = await supabase
                    .from("enterprises")
                    .update({
                      name: editForm.name.trim(),
                      remark,
                      reseller_code: editForm.agentId || null,
                    })
                    .eq("id", editTarget.id);

                  if (error) {
                    toast({ title: "保存失败", description: error.message, variant: "destructive" });
                  } else {
                    toast({
                      title: "保存成功",
                      description: resellerChanged
                        ? `企业「${editForm.name}」及其成员的代理商标签已同步更新`
                        : `企业「${editForm.name}」已更新`,
                    });
                    setEditSheetOpen(false);
                    setEditTarget(null);
                    fetchData();
                  }
                } catch (err: any) {
                  toast({ title: "保存失败", description: err.message || "未知错误", variant: "destructive" });
                } finally {
                  setSavingEnterprise(false);
                }
              }}
              disabled={savingEnterprise}
            >
              {savingEnterprise ? "保存中…" : "保存"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
              <span className="font-medium text-foreground">客户名称：{voucherConfigTarget?.name}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">配置对象：企业空间</span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* 返券说明 */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  返券说明：启用后，客户调用模型仍按实际价格扣费；月度账单生成后，系统根据本配置计算应返券金额。每个企业仅允许存在一套账期返券配置，修改账期返券配置后仅对后续生成的账单生效。
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

      {/* Delete Enterprise Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            {(deleteTarget?.balance ?? 0) !== 0 ? (
              /* 样式1：余额不为零，无法操作 */
              <DialogTitle className="text-base font-semibold">
                当前企业仍有可用余额，请先处理余额后再删除。
              </DialogTitle>
            ) : deleteTarget?.has_business_data ? (
              /* 样式2：注销企业（有业务数据） */
              <>
                <DialogTitle className="text-base font-semibold">
                  确认注销企业「{deleteTarget?.name}」？
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  该企业存在业务数据。注销后，该企业下的部门、成员关系、预算配置和 API Key 将失效；账单、调用日志、充值记录和审计日志将保留。该操作不可恢复。
                </p>
              </>
            ) : (
              /* 样式3：物理删除（无业务数据） */
              <>
                <DialogTitle className="text-base font-semibold">
                  确认删除企业「{deleteTarget?.name}」？
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  该企业暂无业务数据，删除后企业、默认部门及成员关系将被永久删除，不可恢复。
                </p>
              </>
            )}
          </DialogHeader>

          <DialogFooter className="px-6 py-5 border-t bg-gray-50/50">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            {(deleteTarget?.balance ?? 0) === 0 && (
              <Button
                variant={deleteTarget?.has_business_data ? "destructive" : "default"}
                className="h-9 px-4"
                onClick={() => {
                  toast({
                    title: deleteTarget?.has_business_data ? "企业已注销" : "企业已删除",
                    description: `企业「${deleteTarget?.name}」已${deleteTarget?.has_business_data ? "注销" : "删除"}`,
                  });
                  setDeleteTarget(null);
                }}
              >
                {deleteTarget?.has_business_data ? "确认" : "确认删除企业"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Toggle Enable/Disable Enterprise Dialog */}
      <Dialog open={!!toggleStatusTarget} onOpenChange={(open) => { if (!open) setToggleStatusTarget(null); }}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-base font-semibold">
              {toggleStatusTarget?.status === "enabled"
                ? `确认禁用企业「${toggleStatusTarget?.name}」？`
                : `确认启用企业「${toggleStatusTarget?.name}」？`}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              {toggleStatusTarget?.status === "enabled"
                ? "禁用后，该企业成员将无法进入企业空间，企业下所有 API Key 将无法继续调用服务。企业数据、账单、调用日志和充值记录将保留，后续可重新启用。"
                : "启用后，该企业成员可重新进入企业空间，原本可用的 API Key 将恢复调用能力。"}
            </p>
          </DialogHeader>

          <DialogFooter className="px-6 py-5 border-t bg-gray-50/50">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => setToggleStatusTarget(null)}
            >
              取消
            </Button>
            <Button
              variant={toggleStatusTarget?.status === "enabled" ? "destructive" : "default"}
              className="h-9 px-4"
              onClick={() => {
                const newStatus = toggleStatusTarget!.status === "enabled" ? "disabled" as const : "enabled" as const;
                // 更新本地状态（mock 模式）
                setEnterprises((prev) =>
                  prev.map((ent) =>
                    ent.id === toggleStatusTarget!.id ? { ...ent, status: newStatus } : ent
                  )
                );
                toast({
                  title: newStatus === "disabled" ? "企业已禁用" : "企业已启用",
                  description: `企业「${toggleStatusTarget!.name}」已${newStatus === "disabled" ? "禁用" : "启用"}`,
                });
                setToggleStatusTarget(null);
              }}
            >
              {toggleStatusTarget?.status === "enabled" ? "确认禁用" : "确认启用"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!migrationTarget} onOpenChange={(open) => !open && setMigrationTarget(null)}>
        <DialogContent className="sm:max-w-[540px]"><DialogHeader><DialogTitle>迁移企业及全部成员</DialogTitle></DialogHeader>
          {migrationTarget && <div className="space-y-4"><div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="font-medium">{migrationTarget.name}</p><p className="text-muted-foreground mt-1">当前归属：{getResellerName(migrationTarget.reseller_code, getResellerDemoState())} · 预计影响 {Math.max(migrationTarget.member_count, migrationTarget.admins.length)} 名成员</p></div>
            <div className="space-y-1.5"><Label>目标归属</Label><Select value={migrationResellerId} onValueChange={(value) => { setMigrationResellerId(value); setMigrationChecked(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">平台直客</SelectItem>{getResellerDemoState().resellers.filter((item) => item.status === "enabled" && item.id !== migrationTarget.reseller_code).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>迁移原因 *</Label><Textarea value={migrationReason} onChange={(e) => setMigrationReason(e.target.value)} placeholder="请输入企业迁移原因" /></div>
            {migrationChecked && <div className={`rounded-lg border p-3 text-sm ${migrationTarget.reseller_conflict_user_count ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>{migrationTarget.reseller_conflict_user_count ? <><p className="font-medium">预检未通过</p><p className="mt-1">发现 {migrationTarget.reseller_conflict_user_count} 名成员仍关联其他企业，请先解除冲突关系。</p></> : <><p className="font-medium">预检通过</p><p className="mt-1">企业、Owner 及全部成员将整体迁移；历史财务数据不受影响。</p></>}</div>}
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setMigrationTarget(null)}>取消</Button>{!migrationChecked ? <Button onClick={() => { if (!migrationReason.trim()) { toast({ title: "请输入迁移原因", variant: "destructive" }); return; } setMigrationChecked(true); }}>执行预检</Button> : <Button disabled={!!migrationTarget?.reseller_conflict_user_count} onClick={() => { if (!migrationTarget) return; const to = migrationResellerId === "direct" ? null : migrationResellerId; const phones = [...new Set([migrationTarget.owner_phone, ...migrationTarget.admins.map((item) => item.phone)])]; migrateEnterprise({ enterpriseId: migrationTarget.id, memberPhones: phones, toResellerId: to, reason: migrationReason.trim() }); setEnterprises((items) => items.map((item) => item.id === migrationTarget.id ? { ...item, reseller_code: to } : item)); toast({ title: "企业整体迁移成功", description: "Owner 与成员归属已同步，历史财务数据不受影响。" }); setMigrationTarget(null); setEditSheetOpen(false); }}>确认迁移</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
