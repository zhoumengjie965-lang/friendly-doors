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
  RotateCcw,
  Cpu,
  ExternalLink,
  Save,
  X,
  Info,
  Pencil,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────

interface EndpointMapping {
  key: string;
  value: string;
}

interface ModelSpecs {
  maxContextWindow: string; // 如 "128K", "200K", "1M"
  maxOutputTokens: number; // 如 4096, 8192
  supportedFeatures: string[]; // 如 ["支持流式", "图片输入"]
  releaseDate: string; // 如 "2024-05-13"
}

interface Model {
  id: string;
  name: string;
  provider: string;
  providerKey: string;
  type: string;
  matchType: string;
  syncWithOfficial: boolean;
  description: string;
  tags: string;
  endpoints: string[];
  boundChannels: number;
  availableGroups: string[];
  billingType: "按量计费" | "按次计费";
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  icon?: string;
  modelCode?: string; // 模型代号（非必填）
  endpointMappings?: EndpointMapping[];
  region?: string; // 可用地域
  sourceTag?: "官方" | "三方"; // 模型来源标签（为空表示不展示）
  docMode?: "recommended" | "custom";
  docPath?: string;
  specs?: ModelSpecs; // 模型规格
}

// ─── Provider Tabs Configuration ─────────────────────────────────────────

const PROVIDER_TABS = [
  { key: "all", label: "全部", count: 163 },
  { key: "google", label: "Google", count: 15 },
  { key: "anthropic", label: "Anthropic", count: 13 },
  { key: "openai", label: "OpenAI", count: 70 },
  { key: "deepseek", label: "DeepSeek", count: 3 },
  { key: "bytedance", label: "字节跳动", count: 1 },
  { key: "moonshot", label: "Moonshot", count: 2 },
  { key: "xai", label: "xAI", count: 13 },
  { key: "zhipu", label: "智谱", count: 4 },
  { key: "aliyun", label: "阿里云", count: 21 },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  bytedance: "字节跳动",
  moonshot: "Moonshot",
  xai: "xAI",
  zhipu: "智谱",
  aliyun: "阿里云",
  doubao: "豆包",
};

// ─── Mock Data ───────────────────────────────────────────────────────────

const INITIAL_MODELS: Model[] = [
  {
    id: "gpt-4o",
    name: "gpt-4o",
    provider: "OpenAI",
    providerKey: "openai",
    type: "对话",
    matchType: "包含",
    syncWithOfficial: true,
    description: "OpenAI 最新多模态大模型",
    tags: "国际",
    endpoints: ["openai-response", "anthropic"],
    boundChannels: 1,
    availableGroups: ["default"],
    billingType: "按量计费",
    createdAt: "2026-04-29 10:21:14",
    updatedAt: "2026-04-29 13:26:15",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "128K",
      maxOutputTokens: 4096,
      supportedFeatures: ["支持流式", "图片输入", "工具调用", "前缀续写"],
      releaseDate: "2024-05-13",
    },
  },
  {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    provider: "OpenAI",
    providerKey: "openai",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: true,
    description: "轻量级高效模型",
    tags: "国际",
    endpoints: ["openai-chat"],
    boundChannels: 2,
    availableGroups: ["default", "VIP"],
    billingType: "按量计费",
    createdAt: "2026-04-28 09:15:30",
    updatedAt: "2026-04-29 12:00:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "128K",
      maxOutputTokens: 16384,
      supportedFeatures: ["支持流式", "图片输入", "工具调用"],
      releaseDate: "2024-07-18",
    },
  },
  {
    id: "claude-3-5-sonnet",
    name: "claude-3-5-sonnet-20241022",
    provider: "Anthropic",
    providerKey: "anthropic",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: true,
    description: "Claude 3.5 Sonnet 最新版本",
    tags: "国际",
    endpoints: ["anthropic-messages"],
    boundChannels: 3,
    availableGroups: ["default"],
    billingType: "按量计费",
    createdAt: "2026-04-25 14:20:00",
    updatedAt: "2026-04-29 10:00:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "200K",
      maxOutputTokens: 8192,
      supportedFeatures: ["支持流式", "图片输入", "工具调用"],
      releaseDate: "2024-06-20",
    },
  },
  {
    id: "claude-3-opus",
    name: "claude-3-opus-20240229",
    provider: "Anthropic",
    providerKey: "anthropic",
    type: "对话",
    matchType: "包含",
    syncWithOfficial: true,
    description: "Claude 最强推理模型",
    tags: "国际",
    endpoints: ["anthropic-messages"],
    boundChannels: 1,
    availableGroups: ["default"],
    billingType: "按量计费",
    createdAt: "2026-04-20 08:00:00",
    updatedAt: "2026-04-28 16:30:00",
    enabled: false,
    region: "国内",
    specs: {
      maxContextWindow: "200K",
      maxOutputTokens: 4096,
      supportedFeatures: ["支持流式", "图片输入", "工具调用", "前缀续写"],
      releaseDate: "2024-02-01",
    },
  },
  {
    id: "gemini-1.5-pro",
    name: "gemini-1.5-pro-latest",
    provider: "Google",
    providerKey: "google",
    type: "对话",
    matchType: "前缀",
    syncWithOfficial: true,
    description: "Google 最新 Gemini 模型",
    tags: "国际",
    endpoints: ["google-generate"],
    boundChannels: 2,
    availableGroups: ["default", "VIP"],
    billingType: "按量计费",
    createdAt: "2026-04-22 11:00:00",
    updatedAt: "2026-04-29 09:15:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "1M",
      maxOutputTokens: 8192,
      supportedFeatures: ["支持流式", "图片输入", "工具调用"],
      releaseDate: "2024-02-15",
    },
  },
  {
    id: "deepseek-chat",
    name: "deepseek-chat",
    provider: "DeepSeek",
    providerKey: "deepseek",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: true,
    description: "DeepSeek 对话模型",
    tags: "国产",
    endpoints: ["deepseek-chat"],
    boundChannels: 1,
    availableGroups: ["default"],
    billingType: "按量计费",
    createdAt: "2026-04-15 10:00:00",
    updatedAt: "2026-04-27 14:20:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "128K",
      maxOutputTokens: 8192,
      supportedFeatures: ["支持流式", "工具调用", "前缀续写"],
      releaseDate: "2024-01-15",
    },
  },
  {
    id: "qwen-max",
    name: "qwen-max",
    provider: "阿里云",
    providerKey: "aliyun",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: false,
    description: "通义千问最强模型",
    tags: "国产;中文",
    endpoints: ["aliyun-chat"],
    boundChannels: 0,
    availableGroups: [],
    billingType: "按量计费",
    createdAt: "2026-04-10 09:00:00",
    updatedAt: "2026-04-26 11:30:00",
    enabled: false,
    region: "国内",
    specs: {
      maxContextWindow: "32K",
      maxOutputTokens: 8192,
      supportedFeatures: ["支持流式", "图片输入", "工具调用"],
      releaseDate: "2024-03-01",
    },
  },
  {
    id: "glm-4",
    name: "glm-4",
    provider: "智谱",
    providerKey: "zhipu",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: true,
    description: "智谱 GLM-4 大模型",
    tags: "国产;中文",
    endpoints: ["zhipu-chat"],
    boundChannels: 1,
    availableGroups: ["default"],
    billingType: "按量计费",
    createdAt: "2026-04-18 13:00:00",
    updatedAt: "2026-04-25 10:00:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "128K",
      maxOutputTokens: 4096,
      supportedFeatures: ["支持流式", "图片输入", "工具调用"],
      releaseDate: "2024-01-25",
    },
  },
  {
    id: "moonshot-v1-8k",
    name: "moonshot-v1-8k",
    provider: "Moonshot",
    providerKey: "moonshot",
    type: "对话",
    matchType: "前缀",
    syncWithOfficial: true,
    description: "月之暗面 8K 上下文模型",
    tags: "国产;中文",
    endpoints: ["moonshot-chat"],
    boundChannels: 2,
    availableGroups: ["default", "VIP"],
    billingType: "按量计费",
    createdAt: "2026-04-12 15:30:00",
    updatedAt: "2026-04-24 09:45:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "8K",
      maxOutputTokens: 4096,
      supportedFeatures: ["支持流式", "工具调用"],
      releaseDate: "2024-02-20",
    },
  },
  {
    id: "grok-2",
    name: "grok-2",
    provider: "xAI",
    providerKey: "xai",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: true,
    description: "xAI Grok 2 模型",
    tags: "国际",
    endpoints: ["xai-chat"],
    boundChannels: 1,
    availableGroups: ["default"],
    billingType: "按量计费",
    createdAt: "2026-04-08 10:00:00",
    updatedAt: "2026-04-23 16:00:00",
    enabled: true,
    region: "国内",
    specs: {
      maxContextWindow: "128K",
      maxOutputTokens: 4096,
      supportedFeatures: ["支持流式", "图片输入", "工具调用"],
      releaseDate: "2024-08-13",
    },
  },
  {
    id: "doubao-pro",
    name: "doubao-pro",
    provider: "字节跳动",
    providerKey: "bytedance",
    type: "对话",
    matchType: "精确",
    syncWithOfficial: false,
    description: "字节跳动豆包专业版",
    tags: "国产;中文",
    endpoints: ["doubao-chat"],
    boundChannels: 0,
    availableGroups: [],
    billingType: "按量计费",
    createdAt: "2026-04-05 11:00:00",
    updatedAt: "2026-04-22 14:00:00",
    enabled: false,
    region: "国内",
    specs: {
      maxContextWindow: "128K",
      maxOutputTokens: 4096,
      supportedFeatures: ["支持流式", "图片输入", "工具调用", "前缀续写"],
      releaseDate: "2024-05-15",
    },
  },
];

const MATCH_TYPES = [
  { value: "exact", label: "精确名称匹配" },
  { value: "prefix", label: "前缀匹配" },
  { value: "suffix", label: "后缀匹配" },
  { value: "contains", label: "包含匹配" },
];

const MODEL_TYPES = [
  "文本模型",
  "多模态模型",
  "图像模型",
  "视频模型",
  "音频模型",
  "向量模型",
  "重排序模型",
];

const DOCUMENT_OPTIONS = [
  { label: "文本生成 / OpenAI兼容接口", path: "/docs/text/openai" },
  { label: "文本生成 / OpenAI Responses接口", path: "/docs/text/openai-responses" },
  { label: "文本生成 / Anthropic兼容接口", path: "/docs/text/anthropic" },
  { label: "文本生成 / Gemini兼容接口", path: "/docs/text/gemini" },
  { label: "文本生成 / Qwen兼容接口", path: "/docs/text/qwen" },
  { label: "视频生成 / OpenAI兼容接口", path: "/docs/video/openai" },
  { label: "音频生成 / OpenAI TTS兼容接口", path: "/docs/audio/openai-tts" },
  { label: "检索与向量 / 文本向量化", path: "/docs/retrieval/embeddings" },
  { label: "检索与向量 / 文本排序", path: "/docs/retrieval/rerank" },
  { label: "图像生成 / OpenAI兼容接口", path: "/docs/image/openai" },
];

function getRecommendedDocument(model: Model) {
  const endpointKeys = [
    ...model.endpoints,
    ...(model.endpointMappings || []).map((mapping) => mapping.key),
  ]
    .join(" ")
    .toLowerCase();

  if (model.type === "向量模型") return DOCUMENT_OPTIONS[7];
  if (model.type === "重排序模型") return DOCUMENT_OPTIONS[8];
  if (model.type === "视频模型") return DOCUMENT_OPTIONS[5];
  if (model.type === "音频模型") return DOCUMENT_OPTIONS[6];
  if (model.type === "图像模型") return DOCUMENT_OPTIONS[9];
  if (endpointKeys.includes("anthropic")) return DOCUMENT_OPTIONS[2];
  if (endpointKeys.includes("gemini") || endpointKeys.includes("google")) return DOCUMENT_OPTIONS[3];
  if (endpointKeys.includes("qwen") || endpointKeys.includes("aliyun")) return DOCUMENT_OPTIONS[4];
  if (endpointKeys.includes("response")) return DOCUMENT_OPTIONS[1];
  return DOCUMENT_OPTIONS[0];
}

const PROVIDERS = [
  { value: "OpenAI", label: "OpenAI" },
  { value: "Anthropic", label: "Anthropic" },
  { value: "Google", label: "Google" },
  { value: "DeepSeek", label: "DeepSeek" },
  { value: "阿里云", label: "阿里云" },
  { value: "智谱", label: "智谱" },
  { value: "Moonshot", label: "Moonshot" },
  { value: "xAI", label: "xAI" },
  { value: "字节跳动", label: "字节跳动" },
];

const REGIONS = [
  { value: "国内", label: "国内" },
  { value: "国际", label: "国际" },
];

const SOURCE_TAG_OPTIONS = [
  { value: "官方", label: "官方" },
  { value: "三方", label: "三方" },
];

const FEATURE_OPTIONS = [
  "支持流式",
  "图片输入",
  "工具调用",
  "前缀续写",
  "函数调用",
  "JSON模式",
];

export default function AdminModels() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>(INITIAL_MODELS);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchName, setSearchName] = useState("");
  const [searchProvider, setSearchProvider] = useState("");
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [endpointMode, setEndpointMode] = useState<"visual" | "manual">("visual");

  // Filter models based on active tab and search
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesTab = activeTab === "all" || model.providerKey === activeTab;
      const matchesName = !searchName || model.name.toLowerCase().includes(searchName.toLowerCase());
      const matchesProvider = !searchProvider || model.provider.toLowerCase().includes(searchProvider.toLowerCase());
      return matchesTab && matchesName && matchesProvider;
    });
  }, [models, activeTab, searchName, searchProvider]);

  // Toggle row selection
  const toggleRowSelection = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  // Toggle all rows
  const toggleAllRows = () => {
    if (selectedRows.size === filteredModels.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredModels.map((m) => m.id)));
    }
  };

  // Toggle model enabled status
  const toggleEnabled = (id: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  // Handle delete
  const handleDelete = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "删除成功", description: "模型已删除" });
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    setModels((prev) => prev.filter((m) => !selectedRows.has(m.id)));
    setSelectedRows(new Set());
    toast({ title: "批量删除成功", description: `已删除 ${selectedRows.size} 个模型` });
  };

  // Handle edit
  const handleEdit = (model: Model) => {
    setEditingModel({
      ...model,
      type: model.type === "对话" ? "文本模型" : model.type,
      docMode: model.docMode || "recommended",
    });
    setSheetOpen(true);
  };

  // Handle add new
  const handleAdd = () => {
    const newModel: Model = {
      id: `new-${Date.now()}`,
      name: "",
      provider: "OpenAI",
      providerKey: "openai",
      type: "文本模型",
      matchType: "精确",
      syncWithOfficial: true,
      description: "",
      tags: "",
      endpoints: [],
      boundChannels: 0,
      availableGroups: [],
      billingType: "按量计费",
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      enabled: true,
      region: "国内",
      docMode: "recommended",
      specs: {
        maxContextWindow: "128K",
        maxOutputTokens: 4096,
        supportedFeatures: ["支持流式"],
        releaseDate: new Date().toISOString().slice(0, 10),
      },
    };
    setEditingModel(newModel);
    setSheetOpen(true);
  };

  // Handle save
  const handleSave = () => {
    if (!editingModel) return;
    const recommendedDocument = getRecommendedDocument(editingModel);
    const effectiveDocPath =
      editingModel.docMode === "custom"
        ? editingModel.docPath?.trim()
        : editingModel.docPath || recommendedDocument.path;

    if (!effectiveDocPath) {
      toast({
        title: "请配置接口文档",
        description: "自定义文档模式下需要填写文档地址",
        variant: "destructive",
      });
      return;
    }

    const modelToSave = { ...editingModel, docPath: effectiveDocPath };
    setModels((prev) => {
      const exists = prev.some((model) => model.id === editingModel.id);
      return exists
        ? prev.map((model) =>
            model.id === editingModel.id ? modelToSave : model
          )
        : [modelToSave, ...prev];
    });
    setSheetOpen(false);
    toast({ title: "保存成功", description: `模型「${editingModel.name}」已更新` });
  };

  // Add endpoint mapping
  const addEndpointMapping = () => {
    if (!editingModel) return;
    setEditingModel({
      ...editingModel,
      endpointMappings: [
        ...(editingModel.endpointMappings || []),
        { key: "", value: "" },
      ],
    });
  };

  // Remove endpoint mapping
  const removeEndpointMapping = (index: number) => {
    if (!editingModel) return;
    const newMappings = [...(editingModel.endpointMappings || [])];
    newMappings.splice(index, 1);
    setEditingModel({ ...editingModel, endpointMappings: newMappings });
  };

  // Update endpoint mapping
  const updateEndpointMapping = (index: number, field: "key" | "value", value: string) => {
    if (!editingModel) return;
    const newMappings = [...(editingModel.endpointMappings || [])];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setEditingModel({ ...editingModel, endpointMappings: newMappings });
  };

  // Reset search
  const handleReset = () => {
    setSearchName("");
    setSearchProvider("");
    setActiveTab("all");
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">模型管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理平台模型配置及供应商信息
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          新增模型
        </Button>
      </div>

      {/* Provider Tabs */}
      <div className="flex flex-wrap gap-2">
        {PROVIDER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-80">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-xs h-8">
          原始模型
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8">
          未匹配模型
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8">
          <RefreshCw className="w-3 h-3 mr-1" />
          同步
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8">
          预填进模型
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-8">
          自适应列表
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索模型名称"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索供应商"
            value={searchProvider}
            onChange={(e) => setSearchProvider(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button onClick={() => {}} className="h-9">
          查询
        </Button>
        <Button variant="outline" onClick={handleReset} className="h-9">
          <RotateCcw className="w-4 h-4 mr-1" />
          重置
        </Button>
      </div>

      {/* Batch Actions */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <span className="text-sm text-muted-foreground">
            已选择 {selectedRows.size} 项
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-7"
            onClick={handleBatchDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            批量删除
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredModels.length > 0 &&
                    selectedRows.size === filteredModels.length
                  }
                  onCheckedChange={toggleAllRows}
                />
              </TableHead>
              <TableHead className="w-10">图标</TableHead>
              <TableHead>模型名称</TableHead>
              <TableHead>模型代号</TableHead>
              <TableHead>匹配模型类型</TableHead>
              <TableHead>参与官方同步</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>供应商</TableHead>
              <TableHead>端点</TableHead>
              <TableHead>已绑定渠道</TableHead>
              <TableHead>可用分组</TableHead>
              <TableHead>计费类型</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModels.map((model) => (
              <TableRow key={model.id} className="hover:bg-muted/30">
                <TableCell>
                  <Checkbox
                    checked={selectedRows.has(model.id)}
                    onCheckedChange={() => toggleRowSelection(model.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-primary" />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{model.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{model.id}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {model.matchType}
                  </Badge>
                </TableCell>
                <TableCell>
                  {model.syncWithOfficial ? (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-50 text-green-600 border-green-200"
                    >
                      是
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-gray-50 text-gray-600 border-gray-200"
                    >
                      否
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-muted-foreground">
                  {model.description || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {model.provider}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {model.endpoints.map((endpoint, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {endpoint}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {model.boundChannels > 0 ? (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-blue-50 text-blue-600"
                    >
                      {model.boundChannels}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {model.availableGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {model.availableGroups.map((group, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {group}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {model.billingType}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {model.createdAt.split(" ")[0]}
                  <br />
                  {model.createdAt.split(" ")[1]}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {model.updatedAt.split(" ")[0]}
                  <br />
                  {model.updatedAt.split(" ")[1]}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 text-xs ${
                        model.enabled
                          ? "text-orange-600 hover:text-orange-700"
                          : "text-green-600 hover:text-green-700"
                      }`}
                      onClick={() => toggleEnabled(model.id)}
                    >
                      {model.enabled ? "禁用" : "启用"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(model)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(model.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {filteredModels.length} 条记录
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" disabled>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 bg-primary text-primary-foreground">
            1
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                新增
              </span>
              <SheetTitle>创建新的模型</SheetTitle>
            </div>
          </SheetHeader>

          {editingModel && (
            <div className="space-y-6">
              {/* 基本信息区域 */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">基本信息</p>
                  <p className="text-xs text-muted-foreground">设置模型的基本信息</p>
                </div>
              </div>

              {/* 表单字段 */}
              <div className="space-y-4">
                {/* 模型名称 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    模型名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="请输入模型名称，如：gpt-4"
                    value={editingModel.name}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, name: e.target.value })
                    }
                    className="h-10"
                  />
                </div>

                {/* 名称匹配类型 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    名称匹配类型 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editingModel.matchType}
                    onValueChange={(v) =>
                      setEditingModel({ ...editingModel, matchType: v })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="请选择名称匹配类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.label}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    根据模型名称和匹配规则查找模型元数据，优先级：精确 &gt; 前缀 &gt; 后缀 &gt; 包含
                  </p>
                </div>

                {/* 模型类型 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    模型类型 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editingModel.type}
                    onValueChange={(v) =>
                      setEditingModel({
                        ...editingModel,
                        type: v,
                        docPath:
                          editingModel.docMode === "recommended"
                            ? undefined
                            : editingModel.docPath,
                      })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="请选择模型类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    用于模型广场筛选，并结合端点映射推荐接口文档
                  </p>
                </div>

                {/* 模型图标 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">模型图标</Label>
                  <Input
                    placeholder="请输入图标名称"
                    value={editingModel.icon || ""}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, icon: e.target.value })
                    }
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    图标使用@lobehub/icons库，如：OpenAI、Claude.Color，支持链式参数：OpenAI.Avatar.type=&#123;platform&#125;、OpenRouter.Avatar.shape=&#123;square&#125;，查询所有可用图标请{" "}
                    <a href="#" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                      请点击我 <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                {/* 模型代号 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">模型代号</Label>
                  <Input
                    placeholder="请输入模型代号"
                    value={editingModel.modelCode || ""}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, modelCode: e.target.value })
                    }
                    className="h-10"
                  />
                </div>

                {/* 描述 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">描述</Label>
                  <Textarea
                    placeholder="请输入模型描述"
                    value={editingModel.description}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, description: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                </div>

                {/* 标签 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">标签</Label>
                  <Input
                    placeholder="输入标签或使用;分隔多个标签"
                    value={editingModel.tags}
                    onChange={(e) =>
                      setEditingModel({ ...editingModel, tags: e.target.value })
                    }
                    className="h-10"
                  />
                </div>

                {/* 供应商 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">供应商</Label>
                  <Select
                    value={editingModel.provider}
                    onValueChange={(v) =>
                      setEditingModel({ ...editingModel, provider: v })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="选择模型供应商" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 可用地域 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">可用地域</Label>
                  <Select
                    value={editingModel.region || "国内"}
                    onValueChange={(v) =>
                      setEditingModel({ ...editingModel, region: v })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 模型来源标签 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">模型来源标签</Label>
                  <Select
                    value={editingModel.sourceTag || ""}
                    onValueChange={(v) =>
                      setEditingModel({ ...editingModel, sourceTag: v as "官方" | "三方" })
                    }
                  >
                    <SelectTrigger className="h-10 pr-8 relative">
                      <SelectValue placeholder="" />
                      {editingModel.sourceTag && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingModel({ ...editingModel, sourceTag: undefined });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TAG_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 端点映射 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">端点映射</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">配置模型的端点映射规则</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* 切换模式 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded ${endpointMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setEndpointMode("visual")}
                      >
                        可视化
                      </button>
                      <span className="text-muted-foreground">/</span>
                      <button
                        type="button"
                        className={`px-3 py-1 rounded ${endpointMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setEndpointMode("manual")}
                      >
                        手动编辑
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toast({ title: "功能开发中", description: "填入模板功能即将上线" })}
                    >
                      填入模板
                    </Button>
                  </div>

                  {/* 键值对列表 */}
                  <div className="border rounded-md p-3 bg-muted/20 min-h-[100px]">
                    {(editingModel.endpointMappings || []).length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        暂无数据，点击下方按钮添加键值对
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(editingModel.endpointMappings || []).map((mapping, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              placeholder="键"
                              value={mapping.key}
                              onChange={(e) => updateEndpointMapping(index, "key", e.target.value)}
                              className="h-9 flex-1"
                            />
                            <Input
                              placeholder="值"
                              value={mapping.value}
                              onChange={(e) => updateEndpointMapping(index, "value", e.target.value)}
                              className="h-9 flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive"
                              onClick={() => removeEndpointMapping(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs mt-3 w-full"
                      onClick={addEndpointMapping}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      添加键值对
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    留空则使用默认端点，支持 &#123;path, method&#125;
                  </p>
                </div>

                {/* 接口文档 */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">接口文档</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            模型广场的“API文档”将跳转至此处配置的文档
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <RadioGroup
                    value={editingModel.docMode || "recommended"}
                    onValueChange={(value: "recommended" | "custom") =>
                      setEditingModel({
                        ...editingModel,
                        docMode: value,
                        docPath:
                          value === "recommended"
                            ? undefined
                            : editingModel.docPath,
                      })
                    }
                    className="space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="recommended" id="doc-recommended" />
                        <Label htmlFor="doc-recommended" className="text-sm cursor-pointer">
                          使用系统推荐
                        </Label>
                        <Badge variant="secondary" className="text-[10px]">
                          根据模型类型与端点匹配
                        </Badge>
                      </div>

                      {(editingModel.docMode || "recommended") === "recommended" && (
                        <div className="ml-6 space-y-2">
                          <div className="flex gap-2">
                            <Select
                              value={
                                editingModel.docPath ||
                                getRecommendedDocument(editingModel).path
                              }
                              onValueChange={(path) =>
                                setEditingModel({ ...editingModel, docPath: path })
                              }
                            >
                              <SelectTrigger className="h-10 flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_OPTIONS.map((document) => (
                                  <SelectItem key={document.path} value={document.path}>
                                    {document.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 px-3"
                              onClick={() =>
                                window.open(
                                  editingModel.docPath ||
                                    getRecommendedDocument(editingModel).path,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              <ExternalLink className="w-4 h-4 mr-1.5" />
                              预览
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            已推荐：{getRecommendedDocument(editingModel).label}，可手动调整
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="custom" id="doc-custom" />
                        <Label htmlFor="doc-custom" className="text-sm cursor-pointer">
                          使用模型专属文档
                        </Label>
                      </div>

                      {editingModel.docMode === "custom" && (
                        <div className="ml-6 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="请输入站内文档路径或完整地址"
                              value={editingModel.docPath || ""}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  docPath: e.target.value,
                                })
                              }
                              className="h-10 flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 px-3"
                              disabled={!editingModel.docPath?.trim()}
                              onClick={() =>
                                window.open(
                                  editingModel.docPath,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              <ExternalLink className="w-4 h-4 mr-1.5" />
                              预览
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            参数差异较大的模型可使用专属文档覆盖推荐结果
                          </p>
                        </div>
                      )}
                    </div>
                  </RadioGroup>
                </div>

                {/* 参与官方同步 */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">参与官方同步</Label>
                    <Switch
                      checked={editingModel.syncWithOfficial}
                      onCheckedChange={(v) =>
                        setEditingModel({ ...editingModel, syncWithOfficial: v })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    关闭后，此模型将不会被"同步官方"自动覆盖或创建
                  </p>
                </div>

                {/* 状态 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">状态</Label>
                    <Switch
                      checked={editingModel.enabled}
                      onCheckedChange={(v) =>
                        setEditingModel({ ...editingModel, enabled: v })
                      }
                    />
                  </div>
                </div>

                {/* 模型规格区域 */}
                <div className="flex items-center gap-3 pt-6 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">模型规格</p>
                    <p className="text-xs text-muted-foreground">配置模型的技术规格参数</p>
                  </div>
                </div>

                {/* 模型规格字段 */}
                <div className="space-y-4">
                  {/* 最大上下文窗口 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">最大上下文窗口</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="如：128, 1, 2"
                        value={(editingModel.specs?.maxContextWindow || "").replace(/[KM]/gi, "")}
                        onChange={(e) => {
                          const num = e.target.value.replace(/\D/g, "");
                          const unit = (editingModel.specs?.maxContextWindow || "").match(/[KM]/i)?.[0] || "K";
                          setEditingModel({
                            ...editingModel,
                            specs: {
                              ...(editingModel.specs || {}),
                              maxContextWindow: num ? `${num}${unit}` : "",
                            } as ModelSpecs,
                          });
                        }}
                        className="h-10 pr-16"
                      />
                      <Select
                        value={(editingModel.specs?.maxContextWindow || "").match(/[KM]/i)?.[0] || "K"}
                        onValueChange={(unit) => {
                          const num = (editingModel.specs?.maxContextWindow || "").replace(/[KM]/gi, "");
                          setEditingModel({
                            ...editingModel,
                            specs: {
                              ...(editingModel.specs || {}),
                              maxContextWindow: num ? `${num}${unit}` : unit,
                            } as ModelSpecs,
                          });
                        }}
                      >
                        <SelectTrigger className="absolute right-0 top-0 h-10 w-16 border-0 border-l rounded-l-none bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="K">K</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 单次最大输出 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">单次最大输出</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="如：4, 8, 16"
                        value={editingModel.specs?.maxOutputTokens 
                          ? Math.round(editingModel.specs.maxOutputTokens / 1000).toString()
                          : ""}
                        onChange={(e) => {
                          const num = parseInt(e.target.value.replace(/\D/g, "")) || 0;
                          setEditingModel({
                            ...editingModel,
                            specs: {
                              ...(editingModel.specs || {}),
                              maxOutputTokens: num * 1000,
                            } as ModelSpecs,
                          });
                        }}
                        className="h-10 pr-16"
                      />
                      <div className="absolute right-0 top-0 h-10 w-16 flex items-center justify-center text-sm text-muted-foreground border-l">
                        K
                      </div>
                    </div>
                  </div>

                  {/* 支持功能 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">支持功能</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20">
                      {FEATURE_OPTIONS.map((feature) => (
                        <button
                          key={feature}
                          type="button"
                          onClick={() => {
                            const currentFeatures = editingModel.specs?.supportedFeatures || [];
                            const newFeatures = currentFeatures.includes(feature)
                              ? currentFeatures.filter((f) => f !== feature)
                              : [...currentFeatures, feature];
                            setEditingModel({
                              ...editingModel,
                              specs: {
                                ...(editingModel.specs || {}),
                                supportedFeatures: newFeatures,
                              } as ModelSpecs,
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            (editingModel.specs?.supportedFeatures || []).includes(feature)
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-white text-muted-foreground border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {feature}
                        </button>
                      ))}
                      {/* 自定义功能标签 */}
                      {(editingModel.specs?.supportedFeatures || [])
                        .filter((f) => !FEATURE_OPTIONS.includes(f))
                        .map((feature) => (
                          <button
                            key={feature}
                            type="button"
                            onClick={() => {
                              const currentFeatures = editingModel.specs?.supportedFeatures || [];
                              setEditingModel({
                                ...editingModel,
                                specs: {
                                  ...(editingModel.specs || {}),
                                  supportedFeatures: currentFeatures.filter((f) => f !== feature),
                                } as ModelSpecs,
                              });
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-green-100 text-green-700 border border-green-300"
                          >
                            {feature} ×
                          </button>
                        ))}
                      {/* 添加自定义功能按钮 */}
                      <button
                        type="button"
                        onClick={() => {
                          const customFeature = prompt("请输入自定义功能名称：");
                          if (customFeature && customFeature.trim()) {
                            const currentFeatures = editingModel.specs?.supportedFeatures || [];
                            if (!currentFeatures.includes(customFeature.trim())) {
                              setEditingModel({
                                ...editingModel,
                                specs: {
                                  ...(editingModel.specs || {}),
                                  supportedFeatures: [...currentFeatures, customFeature.trim()],
                                } as ModelSpecs,
                              });
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-full text-xs font-medium transition-colors bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 发布日期 */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">发布日期</Label>
                    <Input
                      type="date"
                      value={editingModel.specs?.releaseDate || ""}
                      onChange={(e) =>
                        setEditingModel({
                          ...editingModel,
                          specs: {
                            ...(editingModel.specs || {}),
                            releaseDate: e.target.value,
                          } as ModelSpecs,
                        })
                      }
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="h-9 px-4"
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  取消
                </Button>
                <Button
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  提交
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
