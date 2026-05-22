import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Check, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GroupRateSettings from "./GroupRateSettings";

// 模型价格数据接口
type PricingMode = "by_volume" | "by_count";
type PriceSettingMode = "by_rate" | "by_price";
type ComparisonOperator = "<" | "<=" | ">" | ">=";
type DimensionType = "input_length" | "output_length";

interface TierCondition {
  id: string;
  dimension: DimensionType;
  operator: ComparisonOperator;
  value: number;
}

interface TierConfig {
  id: string;
  conditions: TierCondition[];  // 条件组合（与关系）
  defaultThreshold?: {          // 默认区间的阈值（仅isDefault=true时有）
    operator: ComparisonOperator;
    value: number;
  };
  inputRate: number | null;     // 输入倍率
  outputRate: number | null;    // 输出倍率
  inputPrice: number | null;    // 输入价格
  outputPrice: number | null;   // 输出价格
  cacheHitPrice: number | null;    // 缓存命中价格
  cacheCreatePrice: number | null; // 缓存创建价格
  cacheHitRate: number | null;     // 缓存命中倍率
  cacheCreateRate: number | null;  // 缓存创建倍率
  isDefault: boolean;
}

interface ModelPrice {
  id: string;
  modelName: string;
  fixedPrice: number | null;      // 固定价格(按次计费)
  modelRate: number | null;       // 模型倍率
  completionRate: number | null;  // 补全倍率
  inputPrice: number | null;      // 输入价格
  outputPrice: number | null;     // 输出价格
  cacheHitPrice: number | null;   // 缓存命中价格
  cacheCreatePrice: number | null;// 缓存创建价格
  cacheHitRate: number | null;    // 缓存命中倍率
  cacheCreateRate: number | null; // 缓存创建倍率
  pricingMode: PricingMode;       // 定价模式
  priceSettingMode: PriceSettingMode; // 价格设置方式
  enableContextTier: boolean;     // 启用上下文阶梯
  tiers: TierConfig[];            // 阶梯配置
  isConflict: boolean;
  showCacheHitPrice?: boolean;    // 展示缓存命中价格
  showCacheCreatePrice?: boolean; // 展示缓存创建价格
}

// 默认阶梯配置（新结构）- 默认128k分界
const createDefaultTiers = (): TierConfig[] => [
  {
    id: "tier-1",
    conditions: [],
    defaultThreshold: { operator: "<=", value: 128 },
    inputRate: null,
    outputRate: null,
    inputPrice: null,
    outputPrice: null,
    cacheHitPrice: null,
    cacheCreatePrice: null,
    cacheHitRate: null,
    cacheCreateRate: null,
    isDefault: true
  },
  {
    id: "tier-2",
    conditions: [
      { id: "cond-1", dimension: "input_length", operator: ">", value: 128 }
    ],
    inputRate: null,
    outputRate: null,
    inputPrice: null,
    outputPrice: null,
    cacheHitPrice: null,
    cacheCreatePrice: null,
    cacheHitRate: null,
    cacheCreateRate: null,
    isDefault: false
  },
];

// 模拟数据
const INITIAL_MODEL_PRICES: ModelPrice[] = [
  // 示例1：完整配置（缓存倍率 + 2阶梯）
  { 
    id: "1", 
    modelName: "gpt-4o", 
    fixedPrice: null, 
    modelRate: 1.0, 
    completionRate: 1.2, 
    inputPrice: null, 
    outputPrice: null, 
    cacheHitPrice: null, 
    cacheCreatePrice: null, 
    cacheHitRate: 0.5, 
    cacheCreateRate: 1.0, 
    pricingMode: "by_volume", 
    priceSettingMode: "by_rate", 
    enableContextTier: true, 
    tiers: [
      { id: "t1-1", conditions: [], defaultThreshold: { operator: "<=", value: 128 }, inputRate: 1.0, outputRate: 1.2, inputPrice: null, outputPrice: null, cacheHitRate: 0.5, cacheCreateRate: 1.0, cacheHitPrice: null, cacheCreatePrice: null, isDefault: true },
      { id: "t1-2", conditions: [{ id: "c1", dimension: "input_length", operator: ">", value: 128 }], defaultThreshold: undefined, inputRate: 2.0, outputRate: 2.4, inputPrice: null, outputPrice: null, cacheHitRate: 1.0, cacheCreateRate: 2.0, cacheHitPrice: null, cacheCreatePrice: null, isDefault: false },
    ], 
    isConflict: false 
  },
  // 示例2：3阶梯配置
  { 
    id: "2", 
    modelName: "claude-3-5-sonnet", 
    fixedPrice: null, 
    modelRate: 0.85, 
    completionRate: 0.9, 
    inputPrice: null, 
    outputPrice: null, 
    cacheHitPrice: null, 
    cacheCreatePrice: null, 
    cacheHitRate: 0.3, 
    cacheCreateRate: 0.8, 
    pricingMode: "by_volume", 
    priceSettingMode: "by_rate", 
    enableContextTier: true, 
    tiers: [
      { id: "t2-1", conditions: [], defaultThreshold: { operator: "<=", value: 128 }, inputRate: 0.85, outputRate: 0.9, inputPrice: null, outputPrice: null, cacheHitRate: 0.3, cacheCreateRate: 0.8, cacheHitPrice: null, cacheCreatePrice: null, isDefault: true },
      { id: "t2-2", conditions: [{ id: "c2", dimension: "input_length", operator: ">=", value: 128 }, { id: "c3", dimension: "input_length", operator: "<", value: 256 }], defaultThreshold: undefined, inputRate: 1.5, outputRate: 1.8, inputPrice: null, outputPrice: null, cacheHitRate: 0.6, cacheCreateRate: 1.5, cacheHitPrice: null, cacheCreatePrice: null, isDefault: false },
      { id: "t2-3", conditions: [{ id: "c4", dimension: "input_length", operator: ">=", value: 256 }], defaultThreshold: undefined, inputRate: 3.0, outputRate: 3.5, inputPrice: null, outputPrice: null, cacheHitRate: 1.2, cacheCreateRate: 3.0, cacheHitPrice: null, cacheCreatePrice: null, isDefault: false },
    ], 
    isConflict: false 
  },
  // 示例3：仅缓存倍率
  { 
    id: "3", 
    modelName: "gpt-4-turbo", 
    fixedPrice: null, 
    modelRate: 1.2, 
    completionRate: 1.5, 
    inputPrice: null, 
    outputPrice: null, 
    cacheHitPrice: null, 
    cacheCreatePrice: null, 
    cacheHitRate: 0.4, 
    cacheCreateRate: 0.9, 
    pricingMode: "by_volume", 
    priceSettingMode: "by_rate", 
    enableContextTier: false, 
    tiers: [], 
    isConflict: false 
  },
  // 示例4：按价格设置的阶梯
  { 
    id: "4", 
    modelName: "gemini-1.5-pro", 
    fixedPrice: null, 
    modelRate: null, 
    completionRate: null, 
    inputPrice: 0.008, 
    outputPrice: 0.016, 
    cacheHitPrice: 0.002, 
    cacheCreatePrice: 0.005, 
    cacheHitRate: null, 
    cacheCreateRate: null, 
    pricingMode: "by_volume", 
    priceSettingMode: "by_price", 
    enableContextTier: true, 
    tiers: [
      { id: "t4-1", conditions: [], defaultThreshold: { operator: "<=", value: 128 }, inputRate: null, outputRate: null, inputPrice: 0.008, outputPrice: 0.016, cacheHitRate: null, cacheCreateRate: null, cacheHitPrice: 0.002, cacheCreatePrice: 0.005, isDefault: true },
      { id: "t4-2", conditions: [{ id: "c5", dimension: "input_length", operator: ">", value: 128 }], defaultThreshold: undefined, inputRate: null, outputRate: null, inputPrice: 0.016, outputPrice: 0.032, cacheHitRate: null, cacheCreateRate: null, cacheHitPrice: 0.004, cacheCreatePrice: 0.01, isDefault: false },
    ], 
    isConflict: false 
  },
  // 示例5：按次计费
  { id: "5", modelName: "dall-e-3", fixedPrice: 0.04, modelRate: null, completionRate: null, inputPrice: null, outputPrice: null, cacheHitPrice: null, cacheCreatePrice: null, cacheHitRate: null, cacheCreateRate: null, pricingMode: "by_count", priceSettingMode: "by_rate", enableContextTier: false, tiers: [], isConflict: false },
  // 示例6：无任何特殊配置
  { id: "6", modelName: "llama-3-70b", fixedPrice: null, modelRate: 0.5, completionRate: 0.5, inputPrice: null, outputPrice: null, cacheHitPrice: null, cacheCreatePrice: null, cacheHitRate: null, cacheCreateRate: null, pricingMode: "by_volume", priceSettingMode: "by_rate", enableContextTier: false, tiers: [], isConflict: false },
  { id: "7", modelName: "black-forest-labs/flux-1.1-pro", fixedPrice: 0.04, modelRate: null, completionRate: null, inputPrice: null, outputPrice: null, cacheHitPrice: null, cacheCreatePrice: null, cacheHitRate: null, cacheCreateRate: null, pricingMode: "by_count", priceSettingMode: "by_rate", enableContextTier: false, tiers: [], isConflict: false },
  { id: "8", modelName: "gpt-4-gizmo-*", fixedPrice: 0.1, modelRate: null, completionRate: null, inputPrice: null, outputPrice: null, cacheHitPrice: null, cacheCreatePrice: null, cacheHitRate: null, cacheCreateRate: null, pricingMode: "by_count", priceSettingMode: "by_rate", enableContextTier: false, tiers: [], isConflict: false },
  { id: "9", modelName: "gpt-4o-mini-tts", fixedPrice: 0.3, modelRate: null, completionRate: null, inputPrice: null, outputPrice: null, cacheHitPrice: null, cacheCreatePrice: null, cacheHitRate: null, cacheCreateRate: null, pricingMode: "by_count", priceSettingMode: "by_rate", enableContextTier: false, tiers: [], isConflict: false },
  { id: "10", modelName: "imagen-3.0-generate-002", fixedPrice: 0.03, modelRate: null, completionRate: null, inputPrice: null, outputPrice: null, cacheHitPrice: null, cacheCreatePrice: null, cacheHitRate: null, cacheCreateRate: null, pricingMode: "by_count", priceSettingMode: "by_rate", enableContextTier: false, tiers: [], isConflict: false },
];

// 生成更多模拟数据
const generateMoreData = (): ModelPrice[] => {
  const moreData: ModelPrice[] = [];
  const modelPrefixes = ["gpt-4", "claude-3", "gemini", "llama", "qwen", "baichuan"];
  const modelSuffixes = ["-mini", "-pro", "-ultra", "-turbo", "-latest", "-preview"];

  for (let i = 11; i <= 334; i++) {
    const prefix = modelPrefixes[Math.floor(Math.random() * modelPrefixes.length)];
    const suffix = modelSuffixes[Math.floor(Math.random() * modelSuffixes.length)];
    const pricingMode: PricingMode = Math.random() > 0.3 ? "by_volume" : "by_count";
    const priceSettingMode: PriceSettingMode = Math.random() > 0.5 ? "by_rate" : "by_price";
    const enableContextTier = pricingMode === "by_volume" && Math.random() > 0.7;

    moreData.push({
      id: i.toString(),
      modelName: `${prefix}${suffix}-${i}`,
      fixedPrice: pricingMode === "by_count" ? Number((Math.random() * 0.5).toFixed(3)) : null,
      modelRate: pricingMode === "by_volume" && priceSettingMode === "by_rate" ? Number((Math.random() * 1.5 + 0.5).toFixed(2)) : null,
      completionRate: pricingMode === "by_volume" && priceSettingMode === "by_rate" ? Number((Math.random() * 1.5 + 0.5).toFixed(2)) : null,
      inputPrice: pricingMode === "by_volume" && priceSettingMode === "by_price" ? Number((Math.random() * 0.05).toFixed(3)) : null,
      outputPrice: pricingMode === "by_volume" && priceSettingMode === "by_price" ? Number((Math.random() * 0.15).toFixed(3)) : null,
      cacheHitPrice: pricingMode === "by_volume" && priceSettingMode === "by_price" ? Number((Math.random() * 0.01).toFixed(3)) : null,
      cacheCreatePrice: pricingMode === "by_volume" && priceSettingMode === "by_price" ? Number((Math.random() * 0.02).toFixed(3)) : null,
      cacheHitRate: pricingMode === "by_volume" && priceSettingMode === "by_rate" ? Number((Math.random() * 1.5 + 0.5).toFixed(2)) : null,
      cacheCreateRate: pricingMode === "by_volume" && priceSettingMode === "by_rate" ? Number((Math.random() * 1.5 + 0.5).toFixed(2)) : null,
      pricingMode,
      priceSettingMode,
      enableContextTier,
      tiers: enableContextTier ? createDefaultTiers() : [],
      isConflict: Math.random() > 0.9,
    });
  }
  return moreData;
};

const ALL_MODEL_PRICES = [...INITIAL_MODEL_PRICES, ...generateMoreData()];

// 展示价格选择器组件
interface PriceColumnSelectorProps {
  model: Partial<ModelPrice>;
  onChange: (model: Partial<ModelPrice> | ((prev: Partial<ModelPrice>) => Partial<ModelPrice>)) => void;
}

function PriceColumnSelector({ model, onChange }: PriceColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 点击外部关闭
  useState(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.price-column-selector')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  });

  return (
    <div className="relative price-column-selector">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => setIsOpen(!isOpen)}
      >
        展示价格
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-50 p-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={true}
                disabled
              />
              <span className="text-gray-500">输入价格</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={true}
                disabled
              />
              <span className="text-gray-500">输出价格</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={model.showCacheHitPrice || false}
                onCheckedChange={(checked) => {
                  onChange({
                    ...model,
                    showCacheHitPrice: checked as boolean,
                  });
                }}
              />
              <span>缓存命中价格</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={model.showCacheCreatePrice || false}
                onCheckedChange={(checked) => {
                  onChange({
                    ...model,
                    showCacheCreatePrice: checked as boolean,
                  });
                }}
              />
              <span>缓存创建价格</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [modelPrices, setModelPrices] = useState<ModelPrice[]>(ALL_MODEL_PRICES);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConflictOnly, setShowConflictOnly] = useState(false);
  const [currentTab, setCurrentTab] = useState("model-rate");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingModel, setEditingModel] = useState<ModelPrice | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState<Partial<ModelPrice>>({
    modelName: "",
    fixedPrice: null,
    modelRate: null,
    completionRate: null,
    inputPrice: null,
    outputPrice: null,
    cacheHitPrice: null,
    cacheCreatePrice: null,
    cacheHitRate: null,
    cacheCreateRate: null,
    pricingMode: "by_volume",
    priceSettingMode: "by_rate",
    enableContextTier: false,
    tiers: [],
    showCacheHitPrice: false,
    showCacheCreatePrice: false,
  });

  const pageSize = 10;

  // 过滤数据
  const filteredData = useMemo(() => {
    return modelPrices.filter((item) => {
      const matchesSearch = item.modelName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConflict = showConflictOnly ? item.isConflict : true;
      return matchesSearch && matchesConflict;
    });
  }, [modelPrices, searchQuery, showConflictOnly]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 处理编辑
  const handleEdit = (model: ModelPrice) => {
    setEditingModel({ ...model });
    setIsEditDialogOpen(true);
  };

  // 处理删除
  const handleDelete = (id: string) => {
    setModelPrices((prev) => prev.filter((item) => item.id !== id));
    toast({
      title: "删除成功",
      description: "模型价格已删除",
    });
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingModel) return;
    setModelPrices((prev) =>
      prev.map((item) => (item.id === editingModel.id ? editingModel : item))
    );
    setIsEditDialogOpen(false);
    setEditingModel(null);
    toast({
      title: "保存成功",
      description: "模型价格已更新",
    });
  };

  // 添加新模型
  const handleAddModel = () => {
    if (!newModel.modelName) {
      toast({
        title: "请输入模型名称",
        variant: "destructive",
      });
      return;
    }
    const model: ModelPrice = {
      id: Date.now().toString(),
      modelName: newModel.modelName,
      fixedPrice: newModel.fixedPrice || null,
      modelRate: newModel.modelRate || null,
      completionRate: newModel.completionRate || null,
      inputPrice: newModel.inputPrice || null,
      outputPrice: newModel.outputPrice || null,
      cacheHitPrice: newModel.cacheHitPrice || null,
      cacheCreatePrice: newModel.cacheCreatePrice || null,
      cacheHitRate: newModel.cacheHitRate || null,
      cacheCreateRate: newModel.cacheCreateRate || null,
      pricingMode: newModel.pricingMode || "by_volume",
      priceSettingMode: newModel.priceSettingMode || "by_rate",
      enableContextTier: newModel.enableContextTier || false,
      tiers: newModel.tiers || [],
      isConflict: false,
      showCacheHitPrice: newModel.showCacheHitPrice || false,
      showCacheCreatePrice: newModel.showCacheCreatePrice || false,
    };
    setModelPrices((prev) => [model, ...prev]);
    setIsAddDialogOpen(false);
    setNewModel({
      modelName: "",
      fixedPrice: null,
      modelRate: null,
      completionRate: null,
      inputPrice: null,
      outputPrice: null,
      cacheHitPrice: null,
      cacheCreatePrice: null,
      cacheHitRate: null,
      cacheCreateRate: null,
      pricingMode: "by_volume",
      priceSettingMode: "by_rate",
      enableContextTier: false,
      tiers: [],
      showCacheHitPrice: false,
      showCacheCreatePrice: false,
    });
    toast({
      title: "添加成功",
      description: "新模型价格已添加",
    });
  };

  // 添加阶梯条件
  const addTierCondition = (tierIndex: number, isEditing: boolean) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newCondition: TierCondition = {
      id: `cond-${Date.now()}`,
      dimension: "input_length",
      operator: "<",
      value: 32000,
    };

    const newTiers = [...target.tiers];
    newTiers[tierIndex] = {
      ...newTiers[tierIndex],
      conditions: [...newTiers[tierIndex].conditions, newCondition],
    };

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 删除阶梯条件
  const removeTierCondition = (tierIndex: number, conditionId: string, isEditing: boolean) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newTiers = [...target.tiers];
    newTiers[tierIndex] = {
      ...newTiers[tierIndex],
      conditions: newTiers[tierIndex].conditions.filter(c => c.id !== conditionId),
    };

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 更新阶梯条件
  const updateTierCondition = (
    tierIndex: number,
    conditionId: string,
    field: keyof TierCondition,
    value: string | number,
    isEditing: boolean
  ) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newTiers = [...target.tiers];
    newTiers[tierIndex] = {
      ...newTiers[tierIndex],
      conditions: newTiers[tierIndex].conditions.map(c =>
        c.id === conditionId ? { ...c, [field]: value } : c
      ),
    };

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 添加新阶梯
  const addNewTier = (isEditing: boolean) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newTier: TierConfig = {
      id: `tier-${Date.now()}`,
      conditions: [{ id: `cond-${Date.now()}`, dimension: "input_length", operator: ">", value: 272000 }],
      inputRate: 1.0,
      outputRate: 1.0,
      inputPrice: 0.001,
      outputPrice: 0.003,
      cacheHitPrice: null,
      cacheCreatePrice: null,
      cacheHitRate: null,
      cacheCreateRate: null,
      isDefault: false,
    };

    const newTiers = [...target.tiers, newTier];

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 删除阶梯
  const removeTier = (tierIndex: number, isEditing: boolean) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newTiers = target.tiers.filter((_, idx) => idx !== tierIndex);

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 更新默认阶梯阈值
  const updateDefaultThreshold = (
    field: "operator" | "value",
    value: string | number,
    isEditing: boolean
  ) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newTiers = [...target.tiers];
    const defaultTierIndex = newTiers.findIndex(t => t.isDefault);
    if (defaultTierIndex === -1) return;

    newTiers[defaultTierIndex] = {
      ...newTiers[defaultTierIndex],
      defaultThreshold: {
        ...newTiers[defaultTierIndex].defaultThreshold,
        [field]: value,
      },
    };

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 更新阶梯值
  const updateTierValue = (
    tierIndex: number,
    field: "inputRate" | "outputRate" | "inputPrice" | "outputPrice",
    value: number | null,
    isEditing: boolean
  ) => {
    const target = isEditing ? editingModel : newModel;
    if (!target || !target.tiers) return;

    const newTiers = [...target.tiers];
    newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: value };

    if (isEditing) {
      setEditingModel({ ...target, tiers: newTiers } as ModelPrice);
    } else {
      setNewModel({ ...target, tiers: newTiers });
    }
  };

  // 应用更改
  const handleApplyChanges = () => {
    toast({
      title: "应用成功",
      description: "所有更改已应用到系统",
    });
  };

  // 渲染分页
  const renderPagination = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((page, idx) => (
            <PaginationItem key={idx}>
              {page === "..." ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => setCurrentPage(page as number)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <h1 className="text-xl font-semibold text-foreground mb-6">系统设置</h1>

      {/* 标签页导航 */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="mb-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="model-rate">模型倍率设置</TabsTrigger>
          <TabsTrigger value="group-rate">分组倍率设置</TabsTrigger>
          <TabsTrigger value="visual-rate">可视化倍率设置</TabsTrigger>
          <TabsTrigger value="unset-rate">未设置倍率模型</TabsTrigger>
          <TabsTrigger value="upstream-sync">上游倍率同步</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 模型倍率设置内容 - JSON配置编辑器 */}
      {currentTab === "model-rate" && (
        <div className="space-y-6 max-w-4xl">
          {/* 模型固定价格 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">模型固定价格</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "black-forest-labs/flux-1.1-pro": 0.04,\n  "dall-e-3": 0.04,\n  "gpt-4-gizmo-*": 0.1,\n  "gpt-4o-mini-tts": 0.3,\n  "imagen-3.0-generate-002": 0.03,\n  "mj_blend": 0.1,\n  "mj_custom_zoom": 0,\n  "mj_describe": 0.05,\n  "mj_edits": 0.1,\n  "mj_high_variation": 0.1,\n  "mj_imagine": 0.1\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">一次调用消耗多少刀，优先级大于模型倍率</p>
          </div>

          {/* 模型倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">模型倍率</label>
            <textarea
              className="w-full h-48 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "360GPT_S2_V9": 0.8572,\n  "360gpt-pro": 0.8572,\n  "360gpt-turbo": 0.0858,\n  "360gpt-turbo-responsibility-8k": 0.8572,\n  "360gpt2-pro": 0.8572,\n  "BLOOMZ-7B": 0.273972602739726,\n  "ERNIE-3.5-4K-0205": 0.821917808219178,\n  "ERNIE-3.5-8K": 0.821917808219178,\n  "ERNIE-3.5-8K-0205": 1.643835616438356,\n  "ERNIE-3.5-8K-1222": 0.821917808219178,\n  "ERNIE-4.0-8K": 8.219178082191782\n}`}
            />
          </div>

          {/* 提示缓存倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">提示缓存倍率</label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "claude-3-5-haiku-20241022": 0.1,\n  "claude-3-5-sonnet-20240620": 0.1,\n  "claude-3-5-sonnet-20241022": 0.1,\n  "claude-3-7-sonnet-20250219": 0.1,\n  "claude-3-7-sonnet-20250219-thinking": 0.1,\n  "claude-3-haiku-20240307": 0.1,\n  "claude-3-opus-20240229": 0.1,\n  "claude-3-sonnet-20240229": 0.1\n}`}
            />
          </div>

          {/* 缓存创建倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">缓存创建倍率</label>
            <textarea
              className="w-full h-40 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "claude-3-5-haiku-20241022": 0.1,\n  "claude-3-5-sonnet-20240620": 0.1,\n  "claude-3-5-sonnet-20241022": 0.1,\n  "claude-3-7-sonnet-20250219": 0.1,\n  "claude-3-7-sonnet-20250219-thinking": 0.1\n}`}
            />
          </div>

          {/* 模型补全倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">模型补全倍率（仅对自定义模型有效）</label>
            <textarea
              className="w-full h-48 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "chatgpt-4o-latest": 3,\n  "claude-3-5-haiku-20241022": 5,\n  "claude-3-7-sonnet-20250219": 5,\n  "claude-3-haiku-20240307": 5,\n  "gemini-2.5-flash": 8.3\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">仅对自定义模型有效</p>
          </div>

          {/* 图片输入倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">图片输入倍率（仅部分模型支持该计费）</label>
            <textarea
              className="w-full h-20 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "gpt-image-1": 2,\n  "gpt-image-2": 1.6\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">图片输入相关的倍率设置，键为模型名称，值为倍率，仅部分模型支持该计费</p>
          </div>

          {/* 音频倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">音频倍率（仅部分模型支持该计费）</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "gpt-4o-audio-preview": 16,\n  "gpt-4o-mini-audio-preview": 66.67,\n  "gpt-4o-mini-realtime-preview": 16.67,\n  "gpt-4o-mini-tts": 25,\n  "gpt-4o-realtime-preview": 8\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">音频输入相关的倍率设置，键为模型名称，值为倍率</p>
          </div>

          {/* 音频补全倍率 */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">音频补全倍率（仅部分模型支持该计费）</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              defaultValue={`{\n  "gpt-4o-mini-realtime": 2,\n  "gpt-4o-mini-tts": 1,\n  "gpt-4o-realtime": 2,\n  "tts-1": 0,\n  "tts-1-1106": 0,\n  "tts-1-hd": 0,\n  "tts-1-hd-1106": 0\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">音频输出补全相关的倍率设置，键为模型名称，值为倍率</p>
          </div>

          {/* 暴露倍率接口 */}
          <div className="flex items-center gap-2">
            <Switch id="expose-rate-api" />
            <label htmlFor="expose-rate-api" className="text-sm font-medium text-gray-900 cursor-pointer">
              暴露倍率接口
            </label>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700">
              保存模型倍率设置
            </Button>
            <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
              重置模型倍率
            </Button>
          </div>
        </div>
      )}

      {/* 分组倍率设置 */}
      {currentTab === "group-rate" && <GroupRateSettings />}

      {/* 可视化倍率设置 - 包含原模型倍率设置的完整功能 */}
      {currentTab === "visual-rate" && (
        <div className="space-y-4">
          {/* 操作栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加模型
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={handleApplyChanges}
              >
                <Check className="w-4 h-4 mr-1" />
                应用更改
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索模型名称"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="conflict"
                  checked={showConflictOnly}
                  onCheckedChange={(checked) => setShowConflictOnly(checked as boolean)}
                />
                <label htmlFor="conflict" className="text-sm text-muted-foreground cursor-pointer">
                  仅显示矛盾倍率
                </label>
              </div>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-muted-foreground font-medium">模型名称</TableHead>
                  <TableHead className="text-muted-foreground font-medium">模型固定价格</TableHead>
                  <TableHead className="text-muted-foreground font-medium">模型倍率</TableHead>
                  <TableHead className="text-muted-foreground font-medium">补全倍率</TableHead>
                  <TableHead className="text-muted-foreground font-medium">缓存倍率</TableHead>
                  <TableHead className="text-muted-foreground font-medium">上下文阶梯</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{item.modelName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.fixedPrice ?? ""}
                        readOnly
                        className="w-24 h-8 text-sm bg-muted/30 cursor-not-allowed"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.modelRate ?? ""}
                        readOnly
                        className="w-24 h-8 text-sm bg-muted/30 cursor-not-allowed"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.completionRate ?? ""}
                        readOnly
                        className="w-24 h-8 text-sm bg-muted/30 cursor-not-allowed"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {item.cacheHitRate !== null || item.cacheCreateRate !== null ? (
                          <div className="space-y-1">
                            {item.cacheHitRate !== null && (
                              <div>命中: {item.cacheHitRate}x</div>
                            )}
                            {item.cacheCreateRate !== null && (
                              <div>创建: {item.cacheCreateRate}x</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {item.enableContextTier && item.tiers && item.tiers.length > 0 ? (
                          <div className="space-y-1">
                            {item.tiers.map((tier, idx) => {
                              const threshold = tier.isDefault
                                ? tier.defaultThreshold
                                : tier.conditions?.[0];
                              const label = tier.isDefault
                                ? `≤${tier.defaultThreshold?.value || 128}k`
                                : tier.conditions?.[0]?.value
                                ? `>${tier.conditions[0].value}k`
                                : `阶梯${idx + 1}`;
                              const rate = item.priceSettingMode === "by_price"
                                ? tier.inputPrice
                                : tier.inputRate;
                              return (
                                <div key={tier.id} className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">{label}:</span>
                                  <span>{rate !== null && rate !== undefined ? `${rate}x` : '-'}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
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

          {/* 分页 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              显示第 {(currentPage - 1) * pageSize + 1} 条，第{" "}
              {Math.min(currentPage * pageSize, filteredData.length)} 条，共{" "}
              {filteredData.length} 条
            </span>
            {renderPagination()}
          </div>
        </div>
      )}

      {/* 未设置倍率模型 */}
      {currentTab === "unset-rate" && (
        <div className="p-8 text-center text-muted-foreground">
          <p>未设置倍率模型功能开发中...</p>
        </div>
      )}

      {/* 上游倍率同步 */}
      {currentTab === "upstream-sync" && (
        <div className="p-8 text-center text-muted-foreground">
          <p>上游倍率同步功能开发中...</p>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑模型</DialogTitle>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-5 py-4">
              {/* 模型名称 - 只读 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">模型名称</label>
                <Input
                  value={editingModel.modelName}
                  readOnly
                  className="bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* 定价模式 */}
              <div>
                <label className="text-sm font-bold text-gray-900 mb-3 block">定价模式</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editingModel.pricingMode === "by_volume" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditingModel({ ...editingModel, pricingMode: "by_volume" })}
                    className={editingModel.pricingMode === "by_volume" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    按量计费
                  </Button>
                  <Button
                    type="button"
                    variant={editingModel.pricingMode === "by_count" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditingModel({ ...editingModel, pricingMode: "by_count" })}
                    className={editingModel.pricingMode === "by_count" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    按次计费
                  </Button>
                </div>
              </div>

              {/* 按次计费 - 固定价格 */}
              {editingModel.pricingMode === "by_count" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">固定价格(每次)</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editingModel.fixedPrice ?? ""}
                    onChange={(e) =>
                      setEditingModel({
                        ...editingModel,
                        fixedPrice: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="请输入固定价格"
                  />
                </div>
              )}

              {/* 按量计费 - 价格设置方式 */}
              {editingModel.pricingMode === "by_volume" && (
                <>
                  {/* 第一行：价格设置方式 + 上下文阶梯开关 + 展示价格选择 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="text-sm font-bold text-gray-900 mb-2 block">价格设置方式</label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={editingModel.priceSettingMode === "by_rate" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setEditingModel({ ...editingModel, priceSettingMode: "by_rate" })}
                            className={editingModel.priceSettingMode === "by_rate" ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            按倍率设置
                          </Button>
                          <Button
                            type="button"
                            variant={editingModel.priceSettingMode === "by_price" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setEditingModel({ ...editingModel, priceSettingMode: "by_price" })}
                            className={editingModel.priceSettingMode === "by_price" ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            按价格设置
                          </Button>
                        </div>
                      </div>
                      {/* 启用上下文阶梯开关 */}
                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          id="enable-tier"
                          checked={editingModel.enableContextTier}
                          onCheckedChange={(checked) => {
                            const newTiers = checked && editingModel.tiers.length === 0
                              ? createDefaultTiers()
                              : editingModel.tiers;
                            setEditingModel({
                              ...editingModel,
                              enableContextTier: checked,
                              tiers: newTiers,
                            });
                          }}
                        />
                        <label htmlFor="enable-tier" className="text-sm text-gray-700 cursor-pointer">
                          启用上下文阶梯
                        </label>
                      </div>
                    </div>
                    {/* 展示价格选择 */}
                    <div className="pt-6">
                      <PriceColumnSelector
                        model={editingModel}
                        onChange={setEditingModel}
                      />
                    </div>
                  </div>

                  {/* 按倍率设置 - 倍率输入区域（纵向排列，一行一个） */}
                  {editingModel.priceSettingMode === "by_rate" && (
                    <>
                      {/* 未启用上下文阶梯 - 普通倍率设置 */}
                      {!editingModel.enableContextTier && (
                        <div className="space-y-4">
                          {/* 模型倍率 - 始终显示 */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">模型倍率</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingModel.modelRate ?? ""}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  modelRate: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              placeholder="输入模型倍率"
                            />
                          </div>
                          {/* 补全倍率 - 始终显示 */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">补全倍率</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingModel.completionRate ?? ""}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  completionRate: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              placeholder="输入补全倍率"
                            />
                          </div>
                          {/* 缓存命中倍率 - 根据展示价格选择显示 */}
                          {editingModel.showCacheHitPrice && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">缓存命中倍率</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingModel.cacheHitRate ?? ""}
                                onChange={(e) =>
                                  setEditingModel({
                                    ...editingModel,
                                    cacheHitRate: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                placeholder="输入缓存命中倍率"
                              />
                            </div>
                          )}
                          {/* 缓存创建倍率 - 根据展示价格选择显示 */}
                          {editingModel.showCacheCreatePrice && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">缓存创建倍率</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingModel.cacheCreateRate ?? ""}
                                onChange={(e) =>
                                  setEditingModel({
                                    ...editingModel,
                                    cacheCreateRate: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                placeholder="输入缓存创建倍率"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 启用上下文阶梯 - 阶梯倍率设置 */}
                      {editingModel.enableContextTier && editingModel.tiers && (
                        <div className="space-y-6">
                          {/* 阶梯倍率组 - 根据数量动态调整列数 */}
                          <div className={`grid gap-6 ${editingModel.tiers.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            {editingModel.tiers.map((tier, index) => (
                              <div key={tier.id} className="border rounded-lg p-4 bg-gray-50">
                                {/* 区间设置 */}
                                <div className="flex items-center gap-1 mb-4 pb-3 border-b h-10">
                                  {tier.isDefault ? (
                                    <>
                                      <select
                                        className="h-8 px-1 border rounded text-sm bg-white w-12"
                                        value={tier.defaultThreshold?.operator || "<="}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            defaultThreshold: {
                                              operator: e.target.value as "<" | "<=",
                                              value: tier.defaultThreshold?.value || 128,
                                            },
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              operator: e.target.value === "<" ? ">=" : ">",
                                              value: tier.defaultThreshold?.value || 128,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      >
                                        <option value="<">&lt;</option>
                                        <option value="<=">≤</option>
                                      </select>
                                      <Input
                                        type="number"
                                        className="w-16 h-8 text-sm px-1"
                                        value={tier.defaultThreshold?.value || 128}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 128;
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            defaultThreshold: {
                                              operator: tier.defaultThreshold?.operator || "<=",
                                              value,
                                            },
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              value,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      />
                                      <span className="text-sm text-gray-600">k</span>
                                    </>
                                  ) : index === 1 && editingModel.tiers.length >= 3 ? (
                                    // 第二个阶梯且有3个阶梯时，显示为范围区间（最小值来自第一档，最大值可编辑并联动第三档）
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                        {editingModel.tiers[0].defaultThreshold?.value || 128}k≤~
                                      </span>
                                      <select
                                        className="h-8 px-0.5 border rounded text-sm bg-white w-10"
                                        value={tier.conditions[0]?.operator === ">" ? "<=" : "<"}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          const currentValue = tier.conditions[0]?.value || 128;
                                          newTiers[index] = {
                                            ...tier,
                                            conditions: [{
                                              ...tier.conditions[0],
                                              operator: e.target.value === "<" ? ">=" : ">",
                                              value: currentValue,
                                            }],
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              operator: e.target.value === "<" ? ">=" : ">",
                                              value: currentValue,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      >
                                        <option value="<">&lt;</option>
                                        <option value="<=">≤</option>
                                      </select>
                                      <Input
                                        type="number"
                                        className="w-14 h-8 text-sm px-0.5"
                                        value={tier.conditions[0]?.value || 128}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 128;
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            conditions: [{
                                              ...tier.conditions[0],
                                              value,
                                            }],
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              value,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      />
                                      <span className="text-xs text-gray-600">k</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm font-medium text-gray-700">
                                      {tier.conditions[0]?.operator === ">" ? ">" : "≥"}
                                      {tier.conditions[0]?.value || 128}k
                                    </span>
                                  )}
                                </div>

                                {/* 倍率输入组 */}
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">模型倍率</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8 text-sm"
                                      value={tier.inputRate ?? ""}
                                      onChange={(e) => {
                                        const newTiers = [...editingModel.tiers];
                                        newTiers[index] = {
                                          ...tier,
                                          inputRate: e.target.value ? parseFloat(e.target.value) : null,
                                        };
                                        setEditingModel({ ...editingModel, tiers: newTiers });
                                      }}
                                      placeholder="请输入"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">补全倍率</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8 text-sm"
                                      value={tier.outputRate ?? ""}
                                      onChange={(e) => {
                                        const newTiers = [...editingModel.tiers];
                                        newTiers[index] = {
                                          ...tier,
                                          outputRate: e.target.value ? parseFloat(e.target.value) : null,
                                        };
                                        setEditingModel({ ...editingModel, tiers: newTiers });
                                      }}
                                      placeholder="请输入"
                                    />
                                  </div>
                                  {editingModel.showCacheHitPrice && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 mb-1 block">缓存命中倍率</label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 text-sm"
                                        value={tier.cacheHitRate ?? ""}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            cacheHitRate: e.target.value ? parseFloat(e.target.value) : null,
                                          };
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                        placeholder="请输入"
                                      />
                                    </div>
                                  )}
                                  {editingModel.showCacheCreatePrice && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 mb-1 block">缓存创建倍率</label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        className="h-8 text-sm"
                                        value={tier.cacheCreateRate ?? ""}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            cacheCreateRate: e.target.value ? parseFloat(e.target.value) : null,
                                          };
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                        placeholder="请输入"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 添加/删除阶梯按钮 */}
                          <div className="flex justify-end gap-2">
                            {editingModel.tiers.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // 删除最后一个阶梯，并同步更新第二阶梯的条件为与第一组临界值一致
                                  const firstTierThreshold = editingModel.tiers[0].defaultThreshold;
                                  const newTiers = editingModel.tiers.slice(0, -1);
                                  // 更新剩余的最后一个阶梯的条件，使其与第一组临界值联动
                                  if (newTiers.length === 2 && firstTierThreshold) {
                                    newTiers[1].conditions = [{
                                      ...newTiers[1].conditions[0],
                                      operator: firstTierThreshold.operator === "<" ? ">=" : ">",
                                      value: firstTierThreshold.value,
                                    }];
                                  }
                                  setEditingModel({
                                    ...editingModel,
                                    tiers: newTiers,
                                  });
                                }}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                删除阶梯
                              </Button>
                            )}
                            {editingModel.tiers.length < 3 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // 默认第三阶梯起点为256，确保比第一阶梯大
                                  const firstTierValue = editingModel.tiers[0].defaultThreshold?.value || 128;
                                  const newThreshold = Math.max(256, firstTierValue + 1);
                                  
                                  // 先更新第二阶梯的最大值为newThreshold
                                  const newTiers = [...editingModel.tiers];
                                  if (newTiers[1]) {
                                    newTiers[1].conditions = [{
                                      ...newTiers[1].conditions[0],
                                      value: newThreshold,
                                    }];
                                  }
                                  
                                  // 添加第三阶梯
                                  const newTier: TierConfig = {
                                    id: `tier-${Date.now()}`,
                                    conditions: [{ id: `cond-${Date.now()}`, dimension: "input_length", operator: ">", value: newThreshold }],
                                    inputRate: null,
                                    outputRate: null,
                                    inputPrice: null,
                                    outputPrice: null,
                                    cacheHitPrice: null,
                                    cacheCreatePrice: null,
                                    cacheHitRate: null,
                                    cacheCreateRate: null,
                                    isDefault: false,
                                  };
                                  
                                  setEditingModel({
                                    ...editingModel,
                                    tiers: [...newTiers, newTier],
                                  });
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                添加阶梯
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 按价格设置 - 价格输入区域 */}
                  {editingModel.priceSettingMode === "by_price" && (
                    <>
                      {/* 未启用上下文阶梯 - 普通价格设置 */}
                      {!editingModel.enableContextTier && (
                        <div className="space-y-4">
                          {/* 输入价格 - 始终显示 */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">输入价格</label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                value={editingModel.inputPrice ?? ""}
                                onChange={(e) =>
                                  setEditingModel({
                                    ...editingModel,
                                    inputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                placeholder="请输入输入价格"
                                className="pr-24"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                            </div>
                          </div>
                          {/* 输出价格 - 始终显示 */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">输出价格</label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                value={editingModel.outputPrice ?? ""}
                                onChange={(e) =>
                                  setEditingModel({
                                    ...editingModel,
                                    outputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                placeholder="请输入输出价格"
                                className="pr-24"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                            </div>
                          </div>
                          {/* 缓存命中价格 - 根据展示价格选择显示 */}
                          {editingModel.showCacheHitPrice && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">缓存命中价格</label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={editingModel.cacheHitPrice ?? ""}
                                  onChange={(e) =>
                                    setEditingModel({
                                      ...editingModel,
                                      cacheHitPrice: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="请输入缓存命中价格"
                                  className="pr-24"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                              </div>
                            </div>
                          )}
                          {/* 缓存创建价格 - 根据展示价格选择显示 */}
                          {editingModel.showCacheCreatePrice && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">缓存创建价格</label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={editingModel.cacheCreatePrice ?? ""}
                                  onChange={(e) =>
                                    setEditingModel({
                                      ...editingModel,
                                      cacheCreatePrice: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  placeholder="请输入缓存创建价格"
                                  className="pr-24"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 启用上下文阶梯 - 阶梯价格设置 */}
                      {editingModel.enableContextTier && editingModel.tiers && (
                        <div className="space-y-6">
                          {/* 阶梯价格组 - 根据数量动态调整列数 */}
                          <div className={`grid gap-6 ${editingModel.tiers.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            {editingModel.tiers.map((tier, index) => (
                              <div key={tier.id} className="border rounded-lg p-4 bg-gray-50">
                                {/* 区间设置 */}
                                <div className="flex items-center gap-1 mb-4 pb-3 border-b h-10">
                                  {tier.isDefault ? (
                                    <>
                                      <select
                                        className="h-8 px-1 border rounded text-sm bg-white w-12"
                                        value={tier.defaultThreshold?.operator || "<="}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            defaultThreshold: {
                                              operator: e.target.value as "<" | "<=",
                                              value: tier.defaultThreshold?.value || 128,
                                            },
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              operator: e.target.value === "<" ? ">=" : ">",
                                              value: tier.defaultThreshold?.value || 128,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      >
                                        <option value="<">&lt;</option>
                                        <option value="<=">≤</option>
                                      </select>
                                      <Input
                                        type="number"
                                        className="w-16 h-8 text-sm px-1"
                                        value={tier.defaultThreshold?.value || 128}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 128;
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            defaultThreshold: {
                                              operator: tier.defaultThreshold?.operator || "<=",
                                              value,
                                            },
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              value,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      />
                                      <span className="text-sm text-gray-600">k</span>
                                    </>
                                  ) : index === 1 && editingModel.tiers.length >= 3 ? (
                                    // 第二个阶梯且有3个阶梯时，显示为范围区间（最小值来自第一档，最大值可编辑并联动第三档）
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                        {editingModel.tiers[0].defaultThreshold?.value || 128}k≤~
                                      </span>
                                      <select
                                        className="h-8 px-0.5 border rounded text-sm bg-white w-10"
                                        value={tier.conditions[0]?.operator === ">" ? "<=" : "<"}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          const currentValue = tier.conditions[0]?.value || 128;
                                          newTiers[index] = {
                                            ...tier,
                                            conditions: [{
                                              ...tier.conditions[0],
                                              operator: e.target.value === "<" ? ">=" : ">",
                                              value: currentValue,
                                            }],
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              operator: e.target.value === "<" ? ">=" : ">",
                                              value: currentValue,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      >
                                        <option value="<">&lt;</option>
                                        <option value="<=">≤</option>
                                      </select>
                                      <Input
                                        type="number"
                                        className="w-14 h-8 text-sm px-0.5"
                                        value={tier.conditions[0]?.value || 128}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 128;
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            conditions: [{
                                              ...tier.conditions[0],
                                              value,
                                            }],
                                          };
                                          // 同步更新下一个阶梯的条件
                                          if (newTiers[index + 1]) {
                                            newTiers[index + 1].conditions = [{
                                              ...newTiers[index + 1].conditions[0],
                                              value,
                                            }];
                                          }
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                      />
                                      <span className="text-xs text-gray-600">k</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm font-medium text-gray-700">
                                      {tier.conditions[0]?.operator === ">" ? ">" : "≥"}
                                      {tier.conditions[0]?.value || 128}k
                                    </span>
                                  )}
                                </div>

                                {/* 价格输入组 */}
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">输入价格</label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.001"
                                        className="h-8 text-sm pr-20"
                                        value={tier.inputPrice ?? ""}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            inputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                          };
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                        placeholder="请输入"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">输出价格</label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.001"
                                        className="h-8 text-sm pr-20"
                                        value={tier.outputPrice ?? ""}
                                        onChange={(e) => {
                                          const newTiers = [...editingModel.tiers];
                                          newTiers[index] = {
                                            ...tier,
                                            outputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                          };
                                          setEditingModel({ ...editingModel, tiers: newTiers });
                                        }}
                                        placeholder="请输入"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                    </div>
                                  </div>
                                  {editingModel.showCacheHitPrice && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 mb-1 block">缓存命中价格</label>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          step="0.001"
                                          className="h-8 text-sm pr-20"
                                          value={tier.cacheHitPrice ?? ""}
                                          onChange={(e) => {
                                            const newTiers = [...editingModel.tiers];
                                            newTiers[index] = {
                                              ...tier,
                                              cacheHitPrice: e.target.value ? parseFloat(e.target.value) : null,
                                            };
                                            setEditingModel({ ...editingModel, tiers: newTiers });
                                          }}
                                          placeholder="请输入"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                      </div>
                                    </div>
                                  )}
                                  {editingModel.showCacheCreatePrice && (
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 mb-1 block">缓存创建价格</label>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          step="0.001"
                                          className="h-8 text-sm pr-20"
                                          value={tier.cacheCreatePrice ?? ""}
                                          onChange={(e) => {
                                            const newTiers = [...editingModel.tiers];
                                            newTiers[index] = {
                                              ...tier,
                                              cacheCreatePrice: e.target.value ? parseFloat(e.target.value) : null,
                                            };
                                            setEditingModel({ ...editingModel, tiers: newTiers });
                                          }}
                                          placeholder="请输入"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* 添加/删除阶梯按钮 */}
                          <div className="flex justify-end gap-2">
                            {editingModel.tiers.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // 删除最后一个阶梯，并同步更新第二阶梯的条件为与第一组临界值一致
                                  const firstTierThreshold = editingModel.tiers[0].defaultThreshold;
                                  const newTiers = editingModel.tiers.slice(0, -1);
                                  // 更新剩余的最后一个阶梯的条件，使其与第一组临界值联动
                                  if (newTiers.length === 2 && firstTierThreshold) {
                                    newTiers[1].conditions = [{
                                      ...newTiers[1].conditions[0],
                                      operator: firstTierThreshold.operator === "<" ? ">=" : ">",
                                      value: firstTierThreshold.value,
                                    }];
                                  }
                                  setEditingModel({
                                    ...editingModel,
                                    tiers: newTiers,
                                  });
                                }}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                删除阶梯
                              </Button>
                            )}
                            {editingModel.tiers.length < 3 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // 默认第三阶梯起点为256，确保比第一阶梯大
                                  const firstTierValue = editingModel.tiers[0].defaultThreshold?.value || 128;
                                  const newThreshold = Math.max(256, firstTierValue + 1);
                                  
                                  // 先更新第二阶梯的最大值为newThreshold
                                  const newTiers = [...editingModel.tiers];
                                  if (newTiers[1]) {
                                    newTiers[1].conditions = [{
                                      ...newTiers[1].conditions[0],
                                      value: newThreshold,
                                    }];
                                  }
                                  
                                  // 添加第三阶梯
                                  const newTier: TierConfig = {
                                    id: `tier-${Date.now()}`,
                                    conditions: [{ id: `cond-${Date.now()}`, dimension: "input_length", operator: ">", value: newThreshold }],
                                    inputRate: null,
                                    outputRate: null,
                                    inputPrice: null,
                                    outputPrice: null,
                                    cacheHitPrice: null,
                                    cacheCreatePrice: null,
                                    cacheHitRate: null,
                                    cacheCreateRate: null,
                                    isDefault: false,
                                  };
                                  
                                  setEditingModel({
                                    ...editingModel,
                                    tiers: [...newTiers, newTier],
                                  });
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                添加阶梯
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加模型</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">模型名称</label>
              <Input
                value={newModel.modelName}
                onChange={(e) => setNewModel({ ...newModel, modelName: e.target.value })}
                placeholder="请输入模型名称"
              />
            </div>

            {/* 定价模式 */}
            <div>
              <label className="text-sm font-bold text-gray-900 mb-3 block">定价模式</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newModel.pricingMode === "by_volume" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewModel({ ...newModel, pricingMode: "by_volume" })}
                  className={newModel.pricingMode === "by_volume" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  按量计费
                </Button>
                <Button
                  type="button"
                  variant={newModel.pricingMode === "by_count" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewModel({ ...newModel, pricingMode: "by_count" })}
                  className={newModel.pricingMode === "by_count" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  按次计费
                </Button>
              </div>
            </div>

            {/* 按次计费 - 固定价格 */}
            {newModel.pricingMode === "by_count" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">固定价格(每次)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={newModel.fixedPrice ?? ""}
                  onChange={(e) =>
                    setNewModel({
                      ...newModel,
                      fixedPrice: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="请输入固定价格"
                />
              </div>
            )}

            {/* 按量计费 - 价格设置方式 */}
            {newModel.pricingMode === "by_volume" && (
              <>
                {/* 第一行：价格设置方式 + 上下文阶梯开关 + 展示价格选择 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-sm font-bold text-gray-900 mb-2 block">价格设置方式</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={newModel.priceSettingMode === "by_rate" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNewModel({ ...newModel, priceSettingMode: "by_rate" })}
                          className={newModel.priceSettingMode === "by_rate" ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          按倍率设置
                        </Button>
                        <Button
                          type="button"
                          variant={newModel.priceSettingMode === "by_price" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNewModel({ ...newModel, priceSettingMode: "by_price" })}
                          className={newModel.priceSettingMode === "by_price" ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          按价格设置
                        </Button>
                      </div>
                    </div>
                    {/* 启用上下文阶梯开关 */}
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        id="enable-tier-new"
                        checked={newModel.enableContextTier}
                        onCheckedChange={(checked) => {
                          const newTiers = checked && (!newModel.tiers || newModel.tiers.length === 0)
                            ? createDefaultTiers()
                            : (newModel.tiers || []);
                          setNewModel({
                            ...newModel,
                            enableContextTier: checked,
                            tiers: newTiers,
                          });
                        }}
                      />
                      <label htmlFor="enable-tier-new" className="text-sm text-gray-700 cursor-pointer">
                        启用上下文阶梯
                      </label>
                    </div>
                  </div>
                  {/* 展示价格选择 */}
                  <div className="pt-6">
                    <PriceColumnSelector
                      model={newModel}
                      onChange={setNewModel}
                    />
                  </div>
                </div>

                {/* 按倍率设置 - 倍率输入区域（纵向排列，一行一个） */}
                {newModel.priceSettingMode === "by_rate" && (
                  <>
                    {/* 未启用上下文阶梯 - 普通倍率设置 */}
                    {!newModel.enableContextTier && (
                      <div className="space-y-4">
                        {/* 模型倍率 - 始终显示 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">模型倍率</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newModel.modelRate ?? ""}
                            onChange={(e) =>
                              setNewModel({
                                ...newModel,
                                modelRate: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="输入模型倍率"
                          />
                        </div>
                        {/* 补全倍率 - 始终显示 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">补全倍率</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newModel.completionRate ?? ""}
                            onChange={(e) =>
                              setNewModel({
                                ...newModel,
                                completionRate: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            placeholder="输入补全倍率"
                          />
                        </div>
                        {/* 缓存命中倍率 - 根据展示价格选择显示 */}
                        {newModel.showCacheHitPrice && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">缓存命中倍率</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newModel.cacheHitRate ?? ""}
                              onChange={(e) =>
                                setNewModel({
                                  ...newModel,
                                  cacheHitRate: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              placeholder="输入缓存命中倍率"
                            />
                          </div>
                        )}
                        {/* 缓存创建倍率 - 根据展示价格选择显示 */}
                        {newModel.showCacheCreatePrice && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">缓存创建倍率</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newModel.cacheCreateRate ?? ""}
                              onChange={(e) =>
                                setNewModel({
                                  ...newModel,
                                  cacheCreateRate: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              placeholder="输入缓存创建倍率"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 启用上下文阶梯 - 阶梯倍率设置 */}
                    {newModel.enableContextTier && newModel.tiers && (
                      <div className="space-y-6">
                        {/* 阶梯倍率组 - 根据数量动态调整列数 */}
                        <div className={`grid gap-6 ${newModel.tiers!.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {newModel.tiers!.map((tier, index) => (
                            <div key={tier.id} className="border rounded-lg p-4 bg-gray-50">
                              {/* 区间设置 */}
                              <div className="flex items-center gap-1 mb-4 pb-3 border-b h-10">
                                {tier.isDefault ? (
                                  <>
                                    <select
                                      className="h-8 px-1 border rounded text-sm bg-white w-12"
                                      value={tier.defaultThreshold?.operator || "<="}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          defaultThreshold: {
                                            operator: e.target.value as "<" | "<=",
                                            value: tier.defaultThreshold?.value || 128,
                                          },
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            operator: e.target.value === "<" ? ">=" : ">",
                                            value: tier.defaultThreshold?.value || 128,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    >
                                      <option value="<">&lt;</option>
                                      <option value="<=">≤</option>
                                    </select>
                                    <Input
                                      type="number"
                                      className="w-16 h-8 text-sm px-1"
                                      value={tier.defaultThreshold?.value || 128}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 128;
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          defaultThreshold: {
                                            operator: tier.defaultThreshold?.operator || "<=",
                                            value,
                                          },
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            value,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    />
                                    <span className="text-sm text-gray-600">k</span>
                                  </>
                                ) : index === 1 && newModel.tiers!.length >= 3 ? (
                                  // 第二个阶梯且有3个阶梯时，显示为范围区间（最小值来自第一档，最大值可编辑并联动第三档）
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                      {newModel.tiers![0].defaultThreshold?.value || 128}k≤~
                                    </span>
                                    <select
                                      className="h-8 px-0.5 border rounded text-sm bg-white w-10"
                                      value={tier.conditions[0]?.operator === ">" ? "<=" : "<"}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        const currentValue = tier.conditions[0]?.value || 128;
                                        newTiers[index] = {
                                          ...tier,
                                          conditions: [{
                                            ...tier.conditions[0],
                                            operator: e.target.value === "<" ? ">=" : ">",
                                            value: currentValue,
                                          }],
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            operator: e.target.value === "<" ? ">=" : ">",
                                            value: currentValue,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    >
                                      <option value="<">&lt;</option>
                                      <option value="<=">≤</option>
                                    </select>
                                    <Input
                                      type="number"
                                      className="w-14 h-8 text-sm px-0.5"
                                      value={tier.conditions[0]?.value || 128}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 128;
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          conditions: [{
                                            ...tier.conditions[0],
                                            value,
                                          }],
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            value,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    />
                                    <span className="text-xs text-gray-600">k</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-gray-700">
                                    {tier.conditions[0]?.operator === ">" ? ">" : "≥"}
                                    {tier.conditions[0]?.value || 128}k
                                  </span>
                                )}
                              </div>

                              {/* 倍率输入组 */}
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">模型倍率</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-sm"
                                    value={tier.inputRate ?? ""}
                                    onChange={(e) => {
                                      const newTiers = [...newModel.tiers!];
                                      newTiers[index] = {
                                        ...tier,
                                        inputRate: e.target.value ? parseFloat(e.target.value) : null,
                                      };
                                      setNewModel({ ...newModel, tiers: newTiers });
                                    }}
                                    placeholder="请输入"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">补全倍率</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-sm"
                                    value={tier.outputRate ?? ""}
                                    onChange={(e) => {
                                      const newTiers = [...newModel.tiers!];
                                      newTiers[index] = {
                                        ...tier,
                                        outputRate: e.target.value ? parseFloat(e.target.value) : null,
                                      };
                                      setNewModel({ ...newModel, tiers: newTiers });
                                    }}
                                    placeholder="请输入"
                                  />
                                </div>
                                {newModel.showCacheHitPrice && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">缓存命中倍率</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8 text-sm"
                                      value={tier.cacheHitRate ?? ""}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          cacheHitRate: e.target.value ? parseFloat(e.target.value) : null,
                                        };
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                      placeholder="请输入"
                                    />
                                  </div>
                                )}
                                {newModel.showCacheCreatePrice && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">缓存创建倍率</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8 text-sm"
                                      value={tier.cacheCreateRate ?? ""}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          cacheCreateRate: e.target.value ? parseFloat(e.target.value) : null,
                                        };
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                      placeholder="请输入"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 添加/删除阶梯按钮 */}
                        <div className="flex justify-end gap-2">
                          {newModel.tiers && newModel.tiers.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 删除最后一个阶梯，并同步更新第二阶梯的条件为与第一组临界值一致
                                const firstTierThreshold = newModel.tiers![0].defaultThreshold;
                                const newTiers = newModel.tiers!.slice(0, -1);
                                // 更新剩余的最后一个阶梯的条件，使其与第一组临界值联动
                                if (newTiers.length === 2 && firstTierThreshold) {
                                  newTiers[1].conditions = [{
                                    ...newTiers[1].conditions[0],
                                    operator: firstTierThreshold.operator === "<" ? ">=" : ">",
                                    value: firstTierThreshold.value,
                                  }];
                                }
                                setNewModel({
                                  ...newModel,
                                  tiers: newTiers,
                                });
                              }}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除阶梯
                            </Button>
                          )}
                          {newModel.tiers && newModel.tiers.length < 3 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 默认第三阶梯起点为256，确保比第一阶梯大
                                const firstTierValue = newModel.tiers![0].defaultThreshold?.value || 128;
                                const newThreshold = Math.max(256, firstTierValue + 1);
                                
                                // 先更新第二阶梯的最大值为newThreshold
                                const newTiers = [...newModel.tiers!];
                                if (newTiers[1]) {
                                  newTiers[1].conditions = [{
                                    ...newTiers[1].conditions[0],
                                    value: newThreshold,
                                  }];
                                }
                                
                                // 添加第三阶梯
                                const newTier: TierConfig = {
                                  id: `tier-${Date.now()}`,
                                  conditions: [{ id: `cond-${Date.now()}`, dimension: "input_length", operator: ">", value: newThreshold }],
                                  inputRate: null,
                                  outputRate: null,
                                  inputPrice: null,
                                  outputPrice: null,
                                  cacheHitPrice: null,
                                  cacheCreatePrice: null,
                                  cacheHitRate: null,
                                  cacheCreateRate: null,
                                  isDefault: false,
                                };
                                
                                setNewModel({
                                  ...newModel,
                                  tiers: [...newTiers, newTier],
                                });
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              添加阶梯
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 按价格设置 - 价格输入区域 */}
                {newModel.priceSettingMode === "by_price" && (
                  <>
                    {/* 未启用上下文阶梯 - 普通价格设置 */}
                    {!newModel.enableContextTier && (
                      <div className="space-y-4">
                        {/* 输入价格 - 始终显示 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">输入价格</label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.001"
                              value={newModel.inputPrice ?? ""}
                              onChange={(e) =>
                                setNewModel({
                                  ...newModel,
                                  inputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              placeholder="请输入输入价格"
                              className="pr-24"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                          </div>
                        </div>
                        {/* 输出价格 - 始终显示 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">输出价格</label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.001"
                              value={newModel.outputPrice ?? ""}
                              onChange={(e) =>
                                setNewModel({
                                  ...newModel,
                                  outputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                })
                              }
                              placeholder="请输入输出价格"
                              className="pr-24"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                          </div>
                        </div>
                        {/* 缓存命中价格 - 根据展示价格选择显示 */}
                        {newModel.showCacheHitPrice && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">缓存命中价格</label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                value={newModel.cacheHitPrice ?? ""}
                                onChange={(e) =>
                                  setNewModel({
                                    ...newModel,
                                    cacheHitPrice: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                placeholder="请输入缓存命中价格"
                                className="pr-24"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                            </div>
                          </div>
                        )}
                        {/* 缓存创建价格 - 根据展示价格选择显示 */}
                        {newModel.showCacheCreatePrice && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">缓存创建价格</label>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                value={newModel.cacheCreatePrice ?? ""}
                                onChange={(e) =>
                                  setNewModel({
                                    ...newModel,
                                    cacheCreatePrice: e.target.value ? parseFloat(e.target.value) : null,
                                  })
                                }
                                placeholder="请输入缓存创建价格"
                                className="pr-24"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$/1M tokens</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 启用上下文阶梯 - 阶梯价格设置 */}
                    {newModel.enableContextTier && newModel.tiers && (
                      <div className="space-y-6">
                        {/* 阶梯价格组 - 根据数量动态调整列数 */}
                        <div className={`grid gap-6 ${newModel.tiers!.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {newModel.tiers!.map((tier, index) => (
                            <div key={tier.id} className="border rounded-lg p-4 bg-gray-50">
                              {/* 区间设置 */}
                              <div className="flex items-center gap-1 mb-4 pb-3 border-b h-10">
                                {tier.isDefault ? (
                                  <>
                                    <select
                                      className="h-8 px-1 border rounded text-sm bg-white w-12"
                                      value={tier.defaultThreshold?.operator || "<="}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          defaultThreshold: {
                                            operator: e.target.value as "<" | "<=",
                                            value: tier.defaultThreshold?.value || 128,
                                          },
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            operator: e.target.value === "<" ? ">=" : ">",
                                            value: tier.defaultThreshold?.value || 128,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    >
                                      <option value="<">&lt;</option>
                                      <option value="<=">≤</option>
                                    </select>
                                    <Input
                                      type="number"
                                      className="w-16 h-8 text-sm px-1"
                                      value={tier.defaultThreshold?.value || 128}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 128;
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          defaultThreshold: {
                                            operator: tier.defaultThreshold?.operator || "<=",
                                            value,
                                          },
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            value,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    />
                                    <span className="text-sm text-gray-600">k</span>
                                  </>
                                ) : index === 1 && newModel.tiers!.length >= 3 ? (
                                  // 第二个阶梯且有3个阶梯时，显示为范围区间（最小值来自第一档，最大值可编辑并联动第三档）
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                      {newModel.tiers![0].defaultThreshold?.value || 128}k≤~
                                    </span>
                                    <select
                                      className="h-8 px-0.5 border rounded text-sm bg-white w-10"
                                      value={tier.conditions[0]?.operator === ">" ? "<=" : "<"}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        const currentValue = tier.conditions[0]?.value || 128;
                                        newTiers[index] = {
                                          ...tier,
                                          conditions: [{
                                            ...tier.conditions[0],
                                            operator: e.target.value === "<" ? ">=" : ">",
                                            value: currentValue,
                                          }],
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            operator: e.target.value === "<" ? ">=" : ">",
                                            value: currentValue,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    >
                                      <option value="<">&lt;</option>
                                      <option value="<=">≤</option>
                                    </select>
                                    <Input
                                      type="number"
                                      className="w-14 h-8 text-sm px-0.5"
                                      value={tier.conditions[0]?.value || 128}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 128;
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          conditions: [{
                                            ...tier.conditions[0],
                                            value,
                                          }],
                                        };
                                        // 同步更新下一个阶梯的条件
                                        if (newTiers[index + 1]) {
                                          newTiers[index + 1].conditions = [{
                                            ...newTiers[index + 1].conditions[0],
                                            value,
                                          }];
                                        }
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                    />
                                    <span className="text-xs text-gray-600">k</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-medium text-gray-700">
                                    {tier.conditions[0]?.operator === ">" ? ">" : "≥"}
                                    {tier.conditions[0]?.value || 128}k
                                  </span>
                                )}
                              </div>

                              {/* 价格输入组 */}
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">输入价格</label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.001"
                                      className="h-8 text-sm pr-20"
                                      value={tier.inputPrice ?? ""}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          inputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                        };
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                      placeholder="请输入"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1 block">输出价格</label>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="0.001"
                                      className="h-8 text-sm pr-20"
                                      value={tier.outputPrice ?? ""}
                                      onChange={(e) => {
                                        const newTiers = [...newModel.tiers!];
                                        newTiers[index] = {
                                          ...tier,
                                          outputPrice: e.target.value ? parseFloat(e.target.value) : null,
                                        };
                                        setNewModel({ ...newModel, tiers: newTiers });
                                      }}
                                      placeholder="请输入"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                  </div>
                                </div>
                                {newModel.showCacheHitPrice && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">缓存命中价格</label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.001"
                                        className="h-8 text-sm pr-20"
                                        value={tier.cacheHitPrice ?? ""}
                                        onChange={(e) => {
                                          const newTiers = [...newModel.tiers!];
                                          newTiers[index] = {
                                            ...tier,
                                            cacheHitPrice: e.target.value ? parseFloat(e.target.value) : null,
                                          };
                                          setNewModel({ ...newModel, tiers: newTiers });
                                        }}
                                        placeholder="请输入"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                    </div>
                                  </div>
                                )}
                                {newModel.showCacheCreatePrice && (
                                  <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">缓存创建价格</label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.001"
                                        className="h-8 text-sm pr-20"
                                        value={tier.cacheCreatePrice ?? ""}
                                        onChange={(e) => {
                                          const newTiers = [...newModel.tiers!];
                                          newTiers[index] = {
                                            ...tier,
                                            cacheCreatePrice: e.target.value ? parseFloat(e.target.value) : null,
                                          };
                                          setNewModel({ ...newModel, tiers: newTiers });
                                        }}
                                        placeholder="请输入"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$/1M</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 添加/删除阶梯按钮 */}
                        <div className="flex justify-end gap-2">
                          {newModel.tiers && newModel.tiers.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 删除最后一个阶梯，并同步更新第二阶梯的条件为与第一组临界值一致
                                const firstTierThreshold = newModel.tiers![0].defaultThreshold;
                                const newTiers = newModel.tiers!.slice(0, -1);
                                // 更新剩余的最后一个阶梯的条件，使其与第一组临界值联动
                                if (newTiers.length === 2 && firstTierThreshold) {
                                  newTiers[1].conditions = [{
                                    ...newTiers[1].conditions[0],
                                    operator: firstTierThreshold.operator === "<" ? ">=" : ">",
                                    value: firstTierThreshold.value,
                                  }];
                                }
                                setNewModel({
                                  ...newModel,
                                  tiers: newTiers,
                                });
                              }}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除阶梯
                            </Button>
                          )}
                          {newModel.tiers && newModel.tiers.length < 3 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // 默认第三阶梯起点为256，确保比第一阶梯大
                                const firstTierValue = newModel.tiers![0].defaultThreshold?.value || 128;
                                const newThreshold = Math.max(256, firstTierValue + 1);
                                
                                // 先更新第二阶梯的最大值为newThreshold
                                const newTiers = [...newModel.tiers!];
                                if (newTiers[1]) {
                                  newTiers[1].conditions = [{
                                    ...newTiers[1].conditions[0],
                                    value: newThreshold,
                                  }];
                                }
                                
                                // 添加第三阶梯
                                const newTier: TierConfig = {
                                  id: `tier-${Date.now()}`,
                                  conditions: [{ id: `cond-${Date.now()}`, dimension: "input_length", operator: ">", value: newThreshold }],
                                  inputRate: null,
                                  outputRate: null,
                                  inputPrice: null,
                                  outputPrice: null,
                                  cacheHitPrice: null,
                                  cacheCreatePrice: null,
                                  cacheHitRate: null,
                                  cacheCreateRate: null,
                                  isDefault: false,
                                };
                                
                                setNewModel({
                                  ...newModel,
                                  tiers: [...newTiers, newTier],
                                });
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              添加阶梯
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddModel} className="bg-blue-600 hover:bg-blue-700">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
