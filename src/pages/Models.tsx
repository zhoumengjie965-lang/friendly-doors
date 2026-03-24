import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Zap, MessageSquare, Image, Code, FileText, ArrowRight, Plus } from "lucide-react";

// 假数据 - AI 模型列表
const mockModels = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "最先进的 GPT-4 模型，支持文本和图像输入",
    category: "对话",
    pricing: "¥0.015/1K tokens",
    icon: MessageSquare,
    color: "hsl(142, 70%, 45%)",
    tags: ["多模态", "推荐"],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "高性价比的轻量级模型，适合日常使用",
    category: "对话",
    pricing: "¥0.003/1K tokens",
    icon: MessageSquare,
    color: "hsl(142, 70%, 45%)",
    tags: ["性价比"],
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "强大的推理能力，适合复杂任务",
    category: "对话",
    pricing: "¥0.045/1K tokens",
    icon: Sparkles,
    color: "hsl(32, 90%, 55%)",
    tags: ["推理强"],
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "平衡性能和成本，响应速度快",
    category: "对话",
    pricing: "¥0.018/1K tokens",
    icon: Zap,
    color: "hsl(32, 90%, 55%)",
    tags: ["速度快"],
  },
  {
    id: "dalle-3",
    name: "DALL-E 3",
    provider: "OpenAI",
    description: "高质量图像生成模型",
    category: "图像",
    pricing: "¥0.12/张",
    icon: Image,
    color: "hsl(280, 70%, 55%)",
    tags: ["图像生成"],
  },
  {
    id: "stable-diffusion",
    name: "Stable Diffusion XL",
    provider: "Stability AI",
    description: "开源图像生成模型，可本地部署",
    category: "图像",
    pricing: "¥0.08/张",
    icon: Image,
    color: "hsl(280, 70%, 55%)",
    tags: ["开源"],
  },
  {
    id: "code-llama",
    name: "CodeLlama 70B",
    provider: "Meta",
    description: "专为代码生成和补全优化的模型",
    category: "代码",
    pricing: "¥0.008/1K tokens",
    icon: Code,
    color: "hsl(220, 70%, 55%)",
    tags: ["代码"],
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    description: "强大的代码理解和生成能力",
    category: "代码",
    pricing: "¥0.002/1K tokens",
    icon: Code,
    color: "hsl(220, 70%, 55%)",
    tags: ["代码", "国产"],
  },
  {
    id: "qwen-max",
    name: "通义千问 Max",
    provider: "阿里云",
    description: "阿里云最强中文大模型",
    category: "对话",
    pricing: "¥0.02/1K tokens",
    icon: MessageSquare,
    color: "hsl(0, 70%, 55%)",
    tags: ["中文", "国产"],
  },
  {
    id: "glm-4",
    name: "GLM-4",
    provider: "智谱 AI",
    description: "新一代认知智能大模型",
    category: "对话",
    pricing: "¥0.015/1K tokens",
    icon: MessageSquare,
    color: "hsl(180, 70%, 45%)",
    tags: ["中文", "国产"],
  },
];

const categories = ["全部", "对话", "图像", "代码"];

export default function Models() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const navigate = useNavigate();

  const filteredModels = mockModels.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "全部" || model.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
                  onClick={() => navigate("/workspace/keys")}
                >
                  使用模型
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
