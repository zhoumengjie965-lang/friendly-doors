import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Zap, Brain, Image, Music, Code, MessageSquare } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  capabilities: string[];
  price: string;
  icon: React.ElementType;
  color: string;
  isHot?: boolean;
}

const models: Model[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "最强大的多模态大模型，支持文本、图像输入",
    capabilities: ["文本生成", "图像理解", "代码编写"],
    price: "¥0.03/1K tokens",
    icon: Brain,
    color: "from-green-400 to-blue-500",
    isHot: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "高性价比的快速响应模型",
    capabilities: ["文本生成", "对话", "问答"],
    price: "¥0.003/1K tokens",
    icon: Zap,
    color: "from-blue-400 to-cyan-500",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "优秀的推理能力和长文本处理",
    capabilities: ["长文本", "代码分析", "逻辑推理"],
    price: "¥0.022/1K tokens",
    icon: MessageSquare,
    color: "from-orange-400 to-red-500",
    isHot: true,
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "极速响应的轻量级模型",
    capabilities: ["快速响应", "简单问答", "文本处理"],
    price: "¥0.001/1K tokens",
    icon: Zap,
    color: "from-yellow-400 to-orange-500",
  },
  {
    id: "gemini-1-5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    description: "Google 最新多模态大模型",
    capabilities: ["多语言", "代码", "推理"],
    price: "¥0.008/1K tokens",
    icon: Sparkles,
    color: "from-purple-400 to-pink-500",
  },
  {
    id: "gemini-1-5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    description: "快速高效的轻量模型",
    capabilities: ["快速响应", "摘要", "分类"],
    price: "¥0.001/1K tokens",
    icon: Zap,
    color: "from-indigo-400 to-purple-500",
  },
  {
    id: "dall-e-3",
    name: "DALL·E 3",
    provider: "OpenAI",
    description: "高质量的 AI 图像生成模型",
    capabilities: ["图像生成", "艺术创作", "设计"],
    price: "¥0.12/张",
    icon: Image,
    color: "from-pink-400 to-rose-500",
    isHot: true,
  },
  {
    id: "stable-diffusion-xl",
    name: "Stable Diffusion XL",
    provider: "Stability AI",
    description: "开源图像生成模型",
    capabilities: ["图像生成", "风格迁移", "编辑"],
    price: "¥0.08/张",
    icon: Image,
    color: "from-violet-400 to-purple-500",
  },
  {
    id: "suno-v3",
    name: "Suno v3",
    provider: "Suno",
    description: "AI 音乐生成模型",
    capabilities: ["音乐生成", "歌词创作", "编曲"],
    price: "¥0.5/首",
    icon: Music,
    color: "from-amber-400 to-yellow-500",
  },
  {
    id: "code-copilot",
    name: "Code Copilot",
    provider: "GitHub",
    description: "专业代码辅助模型",
    capabilities: ["代码补全", "代码审查", "重构建议"],
    price: "¥0.015/1K tokens",
    icon: Code,
    color: "from-cyan-400 to-blue-500",
  },
];

export default function ModelMarket() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredModels = models.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          模型广场
        </h1>
        <p className="text-muted-foreground mt-1">浏览和选择适合您的 AI 模型</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索模型名称、提供商或功能..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${model.color}`}
              >
                <model.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{model.name}</h3>
                  {model.isHot && (
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0">
                      热门
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{model.provider}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {model.description}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {model.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {cap}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-medium text-foreground">{model.price}</span>
              <Button size="sm" variant="outline">
                立即使用
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">未找到匹配的模型</p>
        </div>
      )}
    </div>
  );
}
