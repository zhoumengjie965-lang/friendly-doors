import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Sparkles,
  Zap,
  MessageSquare,
  Image,
  Code,
  FileText,
  ArrowRight,
  Plus,
  X,
  BookOpen,
  CircleDot,
} from "lucide-react";

// 上下文阶梯类型
interface ContextTier {
  label: string;
  maxTokens?: number;
  minTokens?: number;
  inputPrice: number;
  outputPrice: number;
}

// 分组价格类型
interface GroupPrice {
  group: string;
  billingType: "按量计费" | "按次计费";
  discount: number;
  inputTiers: { price: number; label: string }[];
  outputTiers: { price: number; label: string }[];
}

// 假数据 - AI 模型列表
interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  fullDescription: string;
  category: "对话" | "图像" | "代码";
  pricing: string;
  icon: typeof MessageSquare;
  color: string;
  tags: string[];
  apiEndpoint: string;
  contextTiers: ContextTier[];
  groupPrices: GroupPrice[];
}

const mockModels: Model[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "最先进的 GPT-4 模型，支持文本和图像输入",
    fullDescription:
      "GPT-4o 是 OpenAI 最新发布的多模态大模型，能够同时处理文本、图像和音频输入。它在理解和生成自然语言方面表现出色，支持复杂推理、创意写作、代码生成等多种任务。",
    category: "对话",
    pricing: "¥0.015/1K tokens",
    icon: MessageSquare,
    color: "hsl(142, 70%, 45%)",
    tags: ["多模态", "推荐"],
    apiEndpoint: "openai-response:/v1/responses",
    contextTiers: [
      { label: "≤128k", maxTokens: 128000, inputPrice: 15, outputPrice: 60 },
      { label: ">128k", minTokens: 128001, inputPrice: 30, outputPrice: 120 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [
          { price: 15, label: "≤128k" },
          { price: 30, label: ">128k" },
        ],
        outputTiers: [
          { price: 60, label: "≤128k" },
          { price: 120, label: ">128k" },
        ],
      },
      {
        group: "VIP",
        billingType: "按量计费",
        discount: 0.85,
        inputTiers: [
          { price: 12.75, label: "≤128k" },
          { price: 25.5, label: ">128k" },
        ],
        outputTiers: [
          { price: 51, label: "≤128k" },
          { price: 102, label: ">128k" },
        ],
      },
    ],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "高性价比的轻量级模型，适合日常使用",
    fullDescription:
      "GPT-4o Mini 是 OpenAI 推出的小型化模型，在保持较高性能的同时大幅降低了使用成本。适合对成本敏感但需要稳定输出的应用场景。",
    category: "对话",
    pricing: "¥0.003/1K tokens",
    icon: MessageSquare,
    color: "hsl(142, 70%, 45%)",
    tags: ["性价比"],
    apiEndpoint: "openai-response:/v1/responses",
    contextTiers: [
      { label: "标准", inputPrice: 3, outputPrice: 12 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [{ price: 3, label: "标准" }],
        outputTiers: [{ price: 12, label: "标准" }],
      },
      {
        group: "VIP",
        billingType: "按量计费",
        discount: 0.85,
        inputTiers: [{ price: 2.55, label: "标准" }],
        outputTiers: [{ price: 10.2, label: "标准" }],
      },
    ],
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "强大的推理能力，适合复杂任务",
    fullDescription:
      "Claude 3 Opus 是 Anthropic 最强大模型，在推理、数学、编程和长文本理解方面表现卓越。支持超长上下文窗口，适合深度分析和复杂任务处理。",
    category: "对话",
    pricing: "¥0.045/1K tokens",
    icon: Sparkles,
    color: "hsl(32, 90%, 55%)",
    tags: ["推理强"],
    apiEndpoint: "anthropic:/v1/messages",
    contextTiers: [
      { label: "≤200k", maxTokens: 200000, inputPrice: 45, outputPrice: 225 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [{ price: 45, label: "≤200k" }],
        outputTiers: [{ price: 225, label: "≤200k" }],
      },
      {
        group: "VIP",
        billingType: "按量计费",
        discount: 0.9,
        inputTiers: [{ price: 40.5, label: "≤200k" }],
        outputTiers: [{ price: 202.5, label: "≤200k" }],
      },
    ],
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "平衡性能和成本，响应速度快",
    fullDescription:
      "Claude 3.5 Sonnet 在性能和成本之间取得了良好平衡，响应速度快，适合大多数企业应用场景。在代码生成和创意写作方面表现优异。",
    category: "对话",
    pricing: "¥0.018/1K tokens",
    icon: Zap,
    color: "hsl(32, 90%, 55%)",
    tags: ["速度快"],
    apiEndpoint: "anthropic:/v1/messages",
    contextTiers: [
      { label: "标准", inputPrice: 18, outputPrice: 90 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [{ price: 18, label: "标准" }],
        outputTiers: [{ price: 90, label: "标准" }],
      },
      {
        group: "VIP",
        billingType: "按量计费",
        discount: 0.9,
        inputTiers: [{ price: 16.2, label: "标准" }],
        outputTiers: [{ price: 81, label: "标准" }],
      },
    ],
  },
  {
    id: "dalle-3",
    name: "DALL-E 3",
    provider: "OpenAI",
    description: "高质量图像生成模型",
    fullDescription:
      "DALL-E 3 是 OpenAI 最先进的图像生成模型，能够根据文本描述生成高质量、细节丰富的图像。支持多种风格和尺寸的图像创作。",
    category: "图像",
    pricing: "¥0.12/张",
    icon: Image,
    color: "hsl(280, 70%, 55%)",
    tags: ["图像生成"],
    apiEndpoint: "openai:/v1/images/generations",
    contextTiers: [],
    groupPrices: [
      {
        group: "default",
        billingType: "按次计费",
        discount: 1.0,
        inputTiers: [{ price: 0.12, label: "每张" }],
        outputTiers: [],
      },
      {
        group: "VIP",
        billingType: "按次计费",
        discount: 0.9,
        inputTiers: [{ price: 0.108, label: "每张" }],
        outputTiers: [],
      },
    ],
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion XL",
    provider: "Stability AI",
    description: "开源图像生成模型，可本地部署",
    fullDescription:
      "Stable Diffusion XL 是 Stability AI 推出的高质量开源图像生成模型，支持灵活定制和本地部署，适合需要数据隐私保护的场景。",
    category: "图像",
    pricing: "¥0.08/张",
    icon: Image,
    color: "hsl(280, 70%, 55%)",
    tags: ["开源"],
    apiEndpoint: "stability:/v1/generation",
    contextTiers: [],
    groupPrices: [
      {
        group: "default",
        billingType: "按次计费",
        discount: 1.0,
        inputTiers: [{ price: 0.08, label: "每张" }],
        outputTiers: [],
      },
    ],
  },
  {
    id: "code-llama",
    name: "CodeLlama 70B",
    provider: "Meta",
    description: "专为代码生成和补全优化的模型",
    fullDescription:
      "CodeLlama 70B 是 Meta 专门训练的大代码模型，支持多种编程语言，在代码补全、生成和解释方面表现出色。",
    category: "代码",
    pricing: "¥0.008/1K tokens",
    icon: Code,
    color: "hsl(220, 70%, 55%)",
    tags: ["代码"],
    apiEndpoint: "meta:/v1/chat/completions",
    contextTiers: [
      { label: "标准", inputPrice: 8, outputPrice: 24 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [{ price: 8, label: "标准" }],
        outputTiers: [{ price: 24, label: "标准" }],
      },
    ],
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    description: "强大的代码理解和生成能力",
    fullDescription:
      "DeepSeek Coder 是 DeepSeek 推出的专业代码模型，在中文编程场景和代码理解方面表现优异，性价比高。",
    category: "代码",
    pricing: "¥0.002/1K tokens",
    icon: Code,
    color: "hsl(220, 70%, 55%)",
    tags: ["代码", "国产"],
    apiEndpoint: "deepseek:/v1/chat/completions",
    contextTiers: [
      { label: "标准", inputPrice: 2, outputPrice: 8 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [{ price: 2, label: "标准" }],
        outputTiers: [{ price: 8, label: "标准" }],
      },
      {
        group: "VIP",
        billingType: "按量计费",
        discount: 0.85,
        inputTiers: [{ price: 1.7, label: "标准" }],
        outputTiers: [{ price: 6.8, label: "标准" }],
      },
    ],
  },
  {
    id: "qwen-max",
    name: "通义千问 Max",
    provider: "阿里云",
    description: "阿里云最强中文大模型",
    fullDescription:
      "通义千问 Max 是阿里云最强的中文大语言模型，在中文理解、生成和推理方面表现出色，特别适合中文业务场景。",
    category: "对话",
    pricing: "¥0.02/1K tokens",
    icon: MessageSquare,
    color: "hsl(0, 70%, 55%)",
    tags: ["中文", "国产"],
    apiEndpoint: "aliyun:/v1/chat/completions",
    contextTiers: [
      { label: "≤8k", maxTokens: 8192, inputPrice: 20, outputPrice: 60 },
      { label: ">8k", minTokens: 8193, inputPrice: 40, outputPrice: 120 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [
          { price: 20, label: "≤8k" },
          { price: 40, label: ">8k" },
        ],
        outputTiers: [
          { price: 60, label: "≤8k" },
          { price: 120, label: ">8k" },
        ],
      },
    ],
  },
  {
    id: "glm-4",
    name: "GLM-4",
    provider: "智谱 AI",
    description: "新一代认知智能大模型",
    fullDescription:
      "GLM-4 是智谱 AI 推出的新一代认知智能大模型，支持长文本理解、多轮对话和复杂推理任务。",
    category: "对话",
    pricing: "¥0.015/1K tokens",
    icon: MessageSquare,
    color: "hsl(180, 70%, 45%)",
    tags: ["中文", "国产"],
    apiEndpoint: "zhipu:/v1/chat/completions",
    contextTiers: [
      { label: "标准", inputPrice: 15, outputPrice: 50 },
    ],
    groupPrices: [
      {
        group: "default",
        billingType: "按量计费",
        discount: 1.0,
        inputTiers: [{ price: 15, label: "标准" }],
        outputTiers: [{ price: 50, label: "标准" }],
      },
    ],
  },
];

const categories = ["全部", "对话", "图像", "代码"];

// 格式化价格显示
function formatPrice(price: number): string {
  return `¥${price.toFixed(4)}/M Tokens`;
}

// 渲染阶梯价格（紧凑版）
function renderTierPrices(tiers: { price: number; label: string }[]): string {
  if (tiers.length === 0) return "-";
  if (tiers.length === 1) return formatPrice(tiers[0].price);
  return tiers.map((t) => formatPrice(t.price)).join(" / ");
}

// 渲染阶梯标签
function renderTierLabels(tiers: { price: number; label: string }[]): string {
  if (tiers.length <= 1) return "";
  return tiers.map((t) => t.label).join(" / ");
}

export default function Models() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const filteredModels = mockModels.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "全部" || model.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleModelClick = (model: Model) => {
    setSelectedModel(model);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedModel(null), 300);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">模型广场</h1>
        <p className="text-muted-foreground">浏览和选择适合您业务需求的 AI 模型</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索模型名称或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className={
                activeCategory === cat
                  ? "bg-gradient-to-r from-blue-600 to-purple-600"
                  : ""
              }
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card
            key={model.id}
            className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/50 cursor-pointer"
            onClick={() => handleModelClick(model)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${model.color}20` }}
                  >
                    <model.icon
                      className="w-5 h-5"
                      style={{ color: model.color }}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {model.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {model.provider}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {model.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {model.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">
                  {model.pricing}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/workspace/keys");
                  }}
                >
                  使用模型
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Model Detail Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={handleCloseDrawer}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {selectedModel && (
            <div className="h-full flex flex-col">
              {/* Header */}
              <SheetHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${selectedModel.color}20` }}
                  >
                    <selectedModel.icon
                      className="w-6 h-6"
                      style={{ color: selectedModel.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetTitle className="text-lg">{selectedModel.name}</SheetTitle>
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                        style={{
                          background: `${selectedModel.color}20`,
                          color: selectedModel.color,
                          borderColor: selectedModel.color,
                        }}
                      >
                        {selectedModel.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedModel.provider}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* Description */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedModel.fullDescription}
                </p>

                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => navigate("/workspace/docs")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  API文档
                </Button>

                <Separator />

                {/* API Endpoint */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">API端点</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <CircleDot className="w-3 h-3 text-blue-500" />
                    <code className="text-muted-foreground flex-1 break-all">
                      {selectedModel.apiEndpoint}
                    </code>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      POST
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Group Pricing */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">分组价格</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs py-2">分组</TableHead>
                          <TableHead className="text-xs py-2">计费类型</TableHead>
                          <TableHead className="text-xs py-2">
                            <div className="flex flex-col">
                              <span>输入</span>
                              {selectedModel.groupPrices[0]?.inputTiers.length > 1 && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {renderTierLabels(selectedModel.groupPrices[0].inputTiers)}
                                </span>
                              )}
                            </div>
                          </TableHead>
                          <TableHead className="text-xs py-2">
                            <div className="flex flex-col">
                              <span>输出</span>
                              {selectedModel.groupPrices[0]?.outputTiers.length > 1 && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {renderTierLabels(selectedModel.groupPrices[0].outputTiers)}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedModel.groupPrices.map((group) => (
                          <TableRow key={group.group}>
                            <TableCell className="text-xs py-2.5 font-medium">
                              {group.group}
                              {group.discount !== 1.0 && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  (×{group.discount})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs py-2.5">
                              {group.billingType}
                            </TableCell>
                            <TableCell className="text-xs py-2.5">
                              {renderTierPrices(group.inputTiers)}
                            </TableCell>
                            <TableCell className="text-xs py-2.5">
                              {group.outputTiers.length > 0
                                ? renderTierPrices(group.outputTiers)
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 阶梯说明 */}
                  {selectedModel.groupPrices[0]?.inputTiers.length > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      价格按上下文长度阶梯递增，具体区间见表头标注
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Empty State */}
      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            未找到匹配的模型
          </h3>
          <p className="text-sm text-muted-foreground">
            尝试使用其他关键词或选择不同的分类
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              快速开始
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              创建 API Key 即可开始调用模型
            </p>
          </div>
          <Button
            onClick={() => navigate("/workspace/keys")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建 API Key
          </Button>
        </div>
      </div>
    </div>
  );
}
