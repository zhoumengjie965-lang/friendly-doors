import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Cpu, Pencil, Info, Plus, Trash2, ExternalLink, Save, X, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EndpointMapping {
  key: string;
  value: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  inputPrice: number;
  outputPrice: number;
  enabled: boolean;
  matchType?: string;
  visibilityTags?: string[];
  icon?: string;
  description?: string;
  tags?: string;
  endpointMappings?: EndpointMapping[];
  syncWithOfficial?: boolean;
}

const INITIAL_MODELS: Model[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", type: "对话", inputPrice: 0.015, outputPrice: 0.06, enabled: true, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "openai" }], syncWithOfficial: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", type: "对话", inputPrice: 0.002, outputPrice: 0.008, enabled: true, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "openai" }], syncWithOfficial: true },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", type: "对话", inputPrice: 0.001, outputPrice: 0.002, enabled: false, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "openai" }], syncWithOfficial: true },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", type: "对话", inputPrice: 0.018, outputPrice: 0.054, enabled: true, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "anthropic" }], syncWithOfficial: true },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", type: "对话", inputPrice: 0.003, outputPrice: 0.012, enabled: true, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "anthropic" }], syncWithOfficial: true },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", type: "对话", inputPrice: 0.01, outputPrice: 0.03, enabled: true, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "google" }], syncWithOfficial: true },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", type: "对话", inputPrice: 0.002, outputPrice: 0.006, enabled: false, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "google" }], syncWithOfficial: true },
  { id: "text-embedding-3-small", name: "text-embedding-3-small", provider: "OpenAI", type: "向量", inputPrice: 0.0001, outputPrice: 0, enabled: true, matchType: "exact", visibilityTags: ["国际"], icon: "", description: "", tags: "", endpointMappings: [{ key: "0", value: "openai" }], syncWithOfficial: true },
];

const VISIBILITY_TAG_OPTIONS = [
  { value: "国内", label: "国内" },
  { value: "国际", label: "国际" },
];

// Multi-select dropdown component for visibility tags
function VisibilityTagsSelect({
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
            <span className="text-muted-foreground text-sm">请选择标签</span>
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
            {VISIBILITY_TAG_OPTIONS.map((option) => (
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

const MATCH_TYPES = [
  { value: "exact", label: "精确名称匹配" },
  { value: "prefix", label: "前缀匹配" },
  { value: "suffix", label: "后缀匹配" },
  { value: "contains", label: "包含匹配" },
];

const PROVIDERS = [
  { value: "OpenAI", label: "OpenAI" },
  { value: "Anthropic", label: "Anthropic" },
  { value: "Google", label: "Google" },
  { value: "阿里巴巴", label: "阿里巴巴" },
  { value: "百度", label: "百度" },
  { value: "腾讯", label: "腾讯" },
];

export default function AdminModels() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>(INITIAL_MODELS);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [endpointMode, setEndpointMode] = useState<"visual" | "manual">("visual");

  const toggle = (id: string) => {
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const handleEdit = (model: Model) => {
    setEditingModel({ ...model });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!editingModel) return;
    setModels((prev) => prev.map((m) => m.id === editingModel.id ? editingModel : m));
    setSheetOpen(false);
    toast({ title: "保存成功", description: `模型「${editingModel.name}」已更新` });
  };

  const addEndpointMapping = () => {
    if (!editingModel) return;
    setEditingModel({
      ...editingModel,
      endpointMappings: [...(editingModel.endpointMappings || []), { key: "", value: "" }],
    });
  };

  const removeEndpointMapping = (index: number) => {
    if (!editingModel) return;
    const newMappings = [...(editingModel.endpointMappings || [])];
    newMappings.splice(index, 1);
    setEditingModel({ ...editingModel, endpointMappings: newMappings });
  };

  const updateEndpointMapping = (index: number, field: "key" | "value", value: string) => {
    if (!editingModel) return;
    const newMappings = [...(editingModel.endpointMappings || [])];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setEditingModel({ ...editingModel, endpointMappings: newMappings });
  };

  const providers = [...new Set(models.map((m) => m.provider))];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">模型配置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理平台可用模型及计费规则（Demo 静态数据）</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px_80px] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>模型名称</span>
          <span>供应商</span>
          <span>类型</span>
          <span>输入价格 (¥/1K)</span>
          <span>输出价格 (¥/1K)</span>
          <span>状态</span>
          <span>操作</span>
        </div>

        {providers.map((provider) => (
          <div key={provider}>
            <div className="px-5 py-2 bg-muted/20 border-b border-t">
              <p className="text-xs font-semibold text-muted-foreground">{provider}</p>
            </div>
            {models.filter((m) => m.provider === provider).map((model) => (
              <div key={model.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px_80px] gap-4 px-5 py-3.5 border-b last:border-0 text-sm items-center">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                    <Cpu className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{model.name}</span>
                </div>
                <span className="text-muted-foreground">{model.provider}</span>
                <span>
                  <Badge variant="secondary" className="text-xs">{model.type}</Badge>
                </span>
                <span className="text-muted-foreground">¥ {model.inputPrice}</span>
                <span className="text-muted-foreground">{model.outputPrice > 0 ? `¥ ${model.outputPrice}` : "—"}</span>
                <Switch checked={model.enabled} onCheckedChange={() => toggle(model.id)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(model)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">* 模型配置功能当前为演示静态数据，后续可对接数据库持久化</p>

      {/* Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader className="mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">更新</span>
              <SheetTitle>更新模型信息</SheetTitle>
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
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                    className="h-10"
                  />
                </div>

                {/* 名称匹配类型 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    名称匹配类型 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editingModel.matchType || "exact"}
                    onValueChange={(v) => setEditingModel({ ...editingModel, matchType: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    根据模型名称和匹配规则查找模型元数据，优先级：精确 &gt; 前缀 &gt; 后缀 &gt; 包含
                  </p>
                </div>

                {/* 模型可见性标签 */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    模型可见性标签 <span className="text-red-500">*</span>
                  </Label>
                  <VisibilityTagsSelect
                    value={editingModel.visibilityTags || []}
                    onChange={(tags) => setEditingModel({ ...editingModel, visibilityTags: tags })}
                  />
                </div>

                {/* 模型图标 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">模型图标</Label>
                  <Input
                    placeholder="请输入图标名称"
                    value={editingModel.icon || ""}
                    onChange={(e) => setEditingModel({ ...editingModel, icon: e.target.value })}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    图标使用@lobehub/icons库，如：OpenAI、Claude.Color，支持链式参数：OpenAI.Avatar.type=&#123;platform&#125;、OpenRouter.Avatar.shape=&#123;square&#125;，查询所有可用图标请
                    <a href="#" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                      点击我 <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>

                {/* 描述 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">描述</Label>
                  <Textarea
                    placeholder="请输入模型描述"
                    value={editingModel.description || ""}
                    onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>

                {/* 标签 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">标签</Label>
                  <Input
                    placeholder="输入标签或使用;分隔多个标签"
                    value={editingModel.tags || ""}
                    onChange={(e) => setEditingModel({ ...editingModel, tags: e.target.value })}
                    className="h-10"
                  />
                </div>

                {/* 供应商 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">供应商</Label>
                  <Select
                    value={editingModel.provider}
                    onValueChange={(v) => setEditingModel({ ...editingModel, provider: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
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
                        className={`px-3 py-1 rounded ${endpointMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        onClick={() => setEndpointMode("visual")}
                      >
                        可视化
                      </button>
                      <span className="text-muted-foreground">/</span>
                      <button
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
                      onClick={() => toast({ title: "功能开发中", description: "模板填充功能即将上线" })}
                    >
                      填入模板
                    </Button>
                  </div>

                  {/* 键值对列表 */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={addEndpointMapping}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      添加键值对
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    留空则使用默认端点；支持 &#123;path, method&#125;
                  </p>
                </div>

                {/* 参与官方同步 */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">参与官方同步</Label>
                    <Switch
                      checked={editingModel.syncWithOfficial ?? true}
                      onCheckedChange={(v) => setEditingModel({ ...editingModel, syncWithOfficial: v })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    关闭后，此模型将不会被"同步官方"自动覆盖或创建
                  </p>
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
