import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cpu } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  inputPrice: number;
  outputPrice: number;
  enabled: boolean;
}

const INITIAL_MODELS: Model[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", type: "对话", inputPrice: 0.015, outputPrice: 0.06, enabled: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", type: "对话", inputPrice: 0.002, outputPrice: 0.008, enabled: true },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", type: "对话", inputPrice: 0.001, outputPrice: 0.002, enabled: false },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", type: "对话", inputPrice: 0.018, outputPrice: 0.054, enabled: true },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", type: "对话", inputPrice: 0.003, outputPrice: 0.012, enabled: true },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", type: "对话", inputPrice: 0.01, outputPrice: 0.03, enabled: true },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", type: "对话", inputPrice: 0.002, outputPrice: 0.006, enabled: false },
  { id: "text-embedding-3-small", name: "text-embedding-3-small", provider: "OpenAI", type: "向量", inputPrice: 0.0001, outputPrice: 0, enabled: true },
];

export default function AdminModels() {
  const [models, setModels] = useState<Model[]>(INITIAL_MODELS);

  const toggle = (id: string) => {
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const providers = [...new Set(models.map((m) => m.provider))];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">模型配置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理平台可用模型及计费规则（Demo 静态数据）</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>模型名称</span>
          <span>供应商</span>
          <span>类型</span>
          <span>输入价格 (¥/1K)</span>
          <span>输出价格 (¥/1K)</span>
          <span>状态</span>
        </div>

        {providers.map((provider) => (
          <div key={provider}>
            <div className="px-5 py-2 bg-muted/20 border-b border-t">
              <p className="text-xs font-semibold text-muted-foreground">{provider}</p>
            </div>
            {models.filter((m) => m.provider === provider).map((model) => (
              <div key={model.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3.5 border-b last:border-0 text-sm items-center">
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
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">* 模型配置功能当前为演示静态数据，后续可对接数据库持久化</p>
    </div>
  );
}
