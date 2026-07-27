// 全部模型列表（50 个，mock 数据用于效果验证）
export const ALL_MODELS: string[] = [
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4",
  "gpt-3.5", "gpt-4-vision", "gpt-4-32k",
  "claude-3-5-sonnet", "claude-3-haiku", "claude-3-opus", "claude-3-sonnet",
  "claude-3.5-haiku", "claude-2.1", "claude-2",
  "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro", "gemini-ultra", "gemini-1.0-pro",
  "suno", "dall-e-3", "dall-e-2", "midjourney",
  "stable-diffusion-xl", "stable-diffusion-3",
  "llama-3-70b", "llama-3-8b", "llama-2-70b", "llama-2-13b",
  "mistral-large", "mistral-7b", "mixtral-8x7b",
  "qwen-max", "qwen-plus", "qwen-turbo", "qwen-72b", "qwen-7b",
  "yi-large", "yi-34b", "glm-4", "glm-4-flash",
  "ernie-4.0", "ernie-3.5", "deepseek-chat", "deepseek-coder",
  "moonshot-v1", "spark-v3", "baichuan-2", "chatglm-turbo",
];

// 分组 → 可用模型映射表
// 数据来源：模型管理中每个模型的 availableGroups 字段反查
export const GROUP_MODEL_MAP: Record<string, string[]> = {
  default: ALL_MODELS,
  production: [
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4",
    "claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet",
    "gemini-1.5-pro", "gemini-ultra", "gemini-pro",
    "llama-3-70b", "mistral-large", "qwen-max", "yi-large", "glm-4",
    "ernie-4.0", "deepseek-chat", "moonshot-v1", "qwen-plus", "llama-2-70b",
  ],
  testing: [
    "gpt-4o-mini", "gpt-3.5-turbo", "gpt-3.5",
    "claude-3-haiku", "claude-2.1",
    "gemini-1.5-flash", "gemini-1.0-pro",
    "llama-3-8b", "llama-2-13b",
    "mistral-7b", "qwen-turbo", "qwen-7b",
    "glm-4-flash", "ernie-3.5", "deepseek-coder",
  ],
  development: [
    "gpt-4o-mini", "gpt-3.5-turbo",
    "claude-3-haiku",
    "gemini-1.5-flash",
    "llama-3-8b", "mistral-7b",
    "qwen-turbo", "glm-4-flash", "deepseek-coder", "qwen-7b",
  ],
  internal: [
    "gpt-4o-mini", "gpt-3.5-turbo",
    "claude-3-haiku",
    "gemini-1.5-flash",
    "mistral-7b", "qwen-turbo", "glm-4-flash", "deepseek-coder",
  ],
  experiment: [
    "gpt-4o-mini", "claude-3-haiku", "mistral-7b", "qwen-turbo", "glm-4-flash",
  ],
  staging: [
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
    "claude-3-5-sonnet", "claude-3-sonnet",
    "gemini-1.5-pro", "gemini-pro",
    "llama-3-70b", "qwen-max", "glm-4", "deepseek-chat", "qwen-plus",
  ],
  partner: [
    "gpt-4o-mini", "gpt-3.5-turbo",
    "claude-3-haiku", "claude-2.1",
    "gemini-1.5-pro", "gemini-1.5-flash",
    "llama-3-8b", "llama-2-13b",
    "mistral-7b", "qwen-plus", "qwen-turbo", "qwen-7b",
    "glm-4-flash", "ernie-3.5", "deepseek-coder",
  ],
  vip: ALL_MODELS,
  backup: [
    "gpt-4o-mini", "gpt-3.5-turbo",
    "claude-3-haiku",
    "gemini-1.5-flash",
    "mistral-7b", "qwen-turbo", "glm-4-flash", "deepseek-coder",
  ],
};

// ApiKeys.tsx 分组显示名 → value 映射
const GROUP_LABEL_PATTERN: Record<string, string> = {
  "官方价格": "default",
  "生产通道": "production",
  "测试环境": "testing",
  "开发环境": "development",
  "内部工具": "internal",
  "实验分组": "experiment",
  "预发环境": "staging",
  "合作伙伴": "partner",
  "VIP通道": "vip",
  "备用通道": "backup",
};

// 从分组显示名提取 value（兼容 "default" 和 "官方价格（×1.0）" 两种格式）
export function groupLabelToValue(label: string): string {
  for (const [key, value] of Object.entries(GROUP_LABEL_PATTERN)) {
    if (label.includes(key)) return value;
  }
  return label;
}

// 获取分组对应的可用模型（并集）
export function getModelsForGroups(groups: string[]): string[] {
  const modelSet = new Set<string>();
  for (const g of groups) {
    const value = groupLabelToValue(g);
    const models = GROUP_MODEL_MAP[value];
    if (models) {
      models.forEach(m => modelSet.add(m));
    }
  }
  return Array.from(modelSet);
}

// 获取分组对应的模型数量
export function getGroupModelCount(groupValue: string): number {
  const value = groupLabelToValue(groupValue);
  return GROUP_MODEL_MAP[value]?.length ?? 0;
}

// 获取"幽灵模型"：已选模型中不在任何已选分组支持范围内的模型
export function getGhostModels(selectedGroups: string[], selectedModels: string[]): string[] {
  if (selectedModels.length === 0 || selectedGroups.length === 0) return [];
  const available = new Set(getModelsForGroups(selectedGroups));
  return selectedModels.filter(m => !available.has(m));
}

// 检查模型是否在分组范围内（无分组选择时返回 true，不标记）
export function isModelInGroups(model: string, groups: string[]): boolean {
  if (groups.length === 0) return true;
  const available = new Set(getModelsForGroups(groups));
  return available.has(model);
}
