import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calculator, Save, Search, Pencil, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingItemConfig {
  key: string;
  label: string;
  listPrice: number;
  unit: string;
  condition?: string;
}

interface ModelPriceConfig {
  id: string;
  name: string;
  type: string;
  region: string;
  source: string;
  enabled: boolean;
  billingItems: BillingItemConfig[];
}

interface DeductionRow {
  key: string;
  modelId: string;
  modelName: string;
  modelType: string;
  region: string;
  source: string;
  billingItemKey: string;
  billingItemLabel: string;
  unit: string;
  condition?: string;
  listPrice: number;
  defaultCoefficient: number;
  extraCoefficient: number;
  finalCoefficient: number;
  defaultDeduction: number;
  finalDeduction: number;
  modelEnabled: boolean;
}

// ─── Mock model price config (source of 刊例价) ──────────────────────────────

const TOKEN_MODELS: ModelPriceConfig[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    type: "多模态模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [
      { key: "input", label: "输入", listPrice: 15, unit: "M tokens" },
      { key: "output", label: "输出", listPrice: 60, unit: "M tokens" },
      { key: "cache-creation", label: "缓存创建", listPrice: 7.5, unit: "M tokens" },
      { key: "cache-hit", label: "缓存命中", listPrice: 1.5, unit: "M tokens" },
    ],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    type: "文本模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [
      { key: "input", label: "输入", listPrice: 3, unit: "M tokens" },
      { key: "output", label: "输出", listPrice: 12, unit: "M tokens" },
    ],
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    type: "文本模型",
    region: "国际",
    source: "官方",
    enabled: false,
    billingItems: [
      { key: "input-short", label: "输入", listPrice: 45, unit: "M tokens", condition: "上下文长度 ≤200k" },
      { key: "output-short", label: "输出", listPrice: 225, unit: "M tokens", condition: "上下文长度 ≤200k" },
      { key: "input-long", label: "输入", listPrice: 90, unit: "M tokens", condition: "上下文长度 >200k" },
      { key: "output-long", label: "输出", listPrice: 450, unit: "M tokens", condition: "上下文长度 >200k" },
    ],
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3.5 Sonnet",
    type: "文本模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [
      { key: "input", label: "输入", listPrice: 18, unit: "M tokens" },
      { key: "output", label: "输出", listPrice: 90, unit: "M tokens" },
    ],
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    type: "多模态模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [
      { key: "input-text", label: "输入", listPrice: 10, unit: "M tokens", condition: "输入模态：文本" },
      { key: "input-image", label: "输入", listPrice: 20, unit: "M tokens", condition: "输入模态：图片" },
      { key: "output-text", label: "输出", listPrice: 30, unit: "M tokens", condition: "输出模态：文本" },
      { key: "output-image", label: "输出", listPrice: 60, unit: "M tokens", condition: "输出模态：图片" },
    ],
  },
  {
    id: "code-llama",
    name: "CodeLlama 70B",
    type: "文本模型",
    region: "国际",
    source: "三方",
    enabled: true,
    billingItems: [
      { key: "input", label: "输入", listPrice: 8, unit: "M tokens" },
      { key: "output", label: "输出", listPrice: 24, unit: "M tokens" },
    ],
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    type: "文本模型",
    region: "国内",
    source: "三方",
    enabled: true,
    billingItems: [
      { key: "input", label: "输入", listPrice: 2, unit: "M tokens" },
      { key: "output", label: "输出", listPrice: 8, unit: "M tokens" },
    ],
  },
  {
    id: "qwen-max",
    name: "通义千问 Max",
    type: "文本模型",
    region: "国内",
    source: "三方",
    enabled: true,
    billingItems: [
      { key: "input-short", label: "输入", listPrice: 20, unit: "M tokens", condition: "上下文长度 ≤8k" },
      { key: "output-short", label: "输出", listPrice: 60, unit: "M tokens", condition: "上下文长度 ≤8k" },
      { key: "input-long", label: "输入", listPrice: 40, unit: "M tokens", condition: "上下文长度 >8k" },
      { key: "output-long", label: "输出", listPrice: 120, unit: "M tokens", condition: "上下文长度 >8k" },
    ],
  },
  {
    id: "glm-4",
    name: "GLM-4",
    type: "文本模型",
    region: "国内",
    source: "三方",
    enabled: true,
    billingItems: [
      { key: "input", label: "输入", listPrice: 15, unit: "M tokens" },
      { key: "output", label: "输出", listPrice: 50, unit: "M tokens" },
    ],
  },
  {
    id: "seedance-video",
    name: "Seedance 视频生成",
    type: "视频模型",
    region: "国内",
    source: "三方",
    enabled: true,
    billingItems: [
      {
        key: "input-720p-no-video",
        label: "输入",
        listPrice: 46,
        unit: "M tokens",
        condition: "输出分辨率 480p/720p，输入不含视频",
      },
      {
        key: "input-720p-with-video",
        label: "输入",
        listPrice: 28,
        unit: "M tokens",
        condition: "输出分辨率 480p/720p，输入包含视频",
      },
      {
        key: "input-1080p-no-video",
        label: "输入",
        listPrice: 51,
        unit: "M tokens",
        condition: "输出分辨率 1080p，输入不含视频",
      },
      {
        key: "input-1080p-with-video",
        label: "输入",
        listPrice: 31,
        unit: "M tokens",
        condition: "输出分辨率 1080p，输入包含视频",
      },
    ],
  },
  {
    id: "text-embedding-3-small",
    name: "text-embedding-3-small",
    type: "向量模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [{ key: "input", label: "输入", listPrice: 0.1, unit: "M tokens" }],
  },
];

const NON_TOKEN_MODELS: ModelPriceConfig[] = [
  {
    id: "dalle-3",
    name: "DALL-E 3",
    type: "图像模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [
      { key: "standard", label: "生成", listPrice: 0.12, unit: "张", condition: "1024×1024" },
    ],
  },
  {
    id: "stable-diffusion-xl",
    name: "Stable Diffusion XL",
    type: "图像模型",
    region: "国际",
    source: "三方",
    enabled: true,
    billingItems: [
      { key: "standard", label: "生成", listPrice: 0.08, unit: "张", condition: "1024×1024" },
    ],
  },
  {
    id: "seedance-2",
    name: "Seedance 2.0",
    type: "视频模型",
    region: "国内",
    source: "三方",
    enabled: true,
    billingItems: [
      { key: "720p-silent", label: "生成", listPrice: 0.25, unit: "秒", condition: "720p，无声" },
      { key: "720p-sound", label: "生成", listPrice: 0.5, unit: "秒", condition: "720p，有声" },
      { key: "1080p-silent", label: "生成", listPrice: 0.4, unit: "秒", condition: "1080p，无声" },
      { key: "1080p-sound", label: "生成", listPrice: 0.8, unit: "秒", condition: "1080p，有声" },
    ],
  },
  {
    id: "whisper-1",
    name: "Whisper",
    type: "音频模型",
    region: "国际",
    source: "官方",
    enabled: true,
    billingItems: [
      { key: "standard", label: "识别", listPrice: 1.8, unit: "小时", condition: "标准模式" },
    ],
  },
];

const MODEL_PRICE_CONFIG: ModelPriceConfig[] = [...TOKEN_MODELS, ...NON_TOKEN_MODELS];


// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPrice = (val: number) =>
  `¥${val.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const formatCoeff = (val: number) => val.toFixed(4);
const formatCredit = (val: number) =>
  val.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
const formatRatio = (val: number) =>
  val.toLocaleString("zh-CN", { maximumFractionDigits: 6 });

const unique = (arr: string[]) => Array.from(new Set(arr));

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDeductionRules() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [basePrice, setBasePrice] = useState<number>(4);
  const [creditTokenRatio, setCreditTokenRatio] = useState<number>(1);
  const [isEditingBasePrice, setIsEditingBasePrice] = useState(false);
  const [draftBasePrice, setDraftBasePrice] = useState<number>(basePrice);
  const [draftCreditTokenRatio, setDraftCreditTokenRatio] = useState<number>(creditTokenRatio);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const creditValue = useMemo(() => {
    if (basePrice <= 0 || creditTokenRatio <= 0) return 0;
    return (basePrice * creditTokenRatio) / 1_000_000;
  }, [basePrice, creditTokenRatio]);

  const displayCreditValue = useMemo(() => {
    const price = isEditingBasePrice ? draftBasePrice : basePrice;
    const ratio = isEditingBasePrice ? draftCreditTokenRatio : creditTokenRatio;
    if (price <= 0 || ratio <= 0) return 0;
    return (price * ratio) / 1_000_000;
  }, [isEditingBasePrice, draftBasePrice, basePrice, draftCreditTokenRatio, creditTokenRatio]);

  const [extraMap, setExtraMap] = useState<Record<string, number>>({});
  const [isEditingRows, setIsEditingRows] = useState(false);
  const [draftExtraMap, setDraftExtraMap] = useState<Record<string, number>>({});

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [nonTokenSearch, setNonTokenSearch] = useState("");
  const [nonTokenFilterType, setNonTokenFilterType] = useState<string>("all");

  const currentExtraMap = useMemo<Record<string, number>>(() => {
    return isEditingRows ? draftExtraMap : extraMap;
  }, [isEditingRows, draftExtraMap, extraMap]);

  const rowsByModel = useMemo<Record<string, DeductionRow[]>>(() => {
    const map: Record<string, DeductionRow[]> = {};
    for (const m of MODEL_PRICE_CONFIG) {
      const modelExtra = currentExtraMap[m.id] ?? 1;
      map[m.id] = m.billingItems.map((item) => {
        const key = `${m.id}#${item.key}`;
        const defaultCoefficient = basePrice > 0 ? item.listPrice / basePrice : 0;
        const defaultDeduction = creditValue > 0 ? item.listPrice / creditValue : 0;
        return {
          key,
          modelId: m.id,
          modelName: m.name,
          modelType: m.type,
          region: m.region,
          source: m.source,
          billingItemKey: item.key,
          billingItemLabel: item.label,
          unit: item.unit,
          condition: item.condition,
          listPrice: item.listPrice,
          defaultCoefficient,
          extraCoefficient: modelExtra,
          finalCoefficient: defaultCoefficient * modelExtra,
          defaultDeduction,
          finalDeduction: defaultDeduction * modelExtra,
          modelEnabled: m.enabled,
        };
      });
    }
    return map;
  }, [basePrice, creditValue, currentExtraMap]);

  const filteredModels = useMemo(() => {
    return TOKEN_MODELS.filter((m) => {
      const matchesSearch =
        !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || m.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [search, filterType]);

  const filteredNonTokenModels = useMemo(() => {
    return NON_TOKEN_MODELS.filter((m) => {
      const matchesSearch =
        !nonTokenSearch || m.name.toLowerCase().includes(nonTokenSearch.toLowerCase()) || m.id.toLowerCase().includes(nonTokenSearch.toLowerCase());
      const matchesType = nonTokenFilterType === "all" || m.type === nonTokenFilterType;
      return matchesSearch && matchesType;
    });
  }, [nonTokenSearch, nonTokenFilterType]);

  const types = useMemo(() => unique(TOKEN_MODELS.map((m) => m.type)), []);

  const nonTokenTypes = useMemo(() => unique(NON_TOKEN_MODELS.map((m) => m.type)), []);

  const startEditBasePrice = () => {
    setDraftBasePrice(basePrice);
    setDraftCreditTokenRatio(creditTokenRatio);
    setIsEditingBasePrice(true);
  };

  const cancelEditBasePrice = () => {
    setIsEditingBasePrice(false);
  };

  const requestSaveBasePrice = () => {
    if (draftBasePrice <= 0) {
      toast({ title: "基准价格必须大于 0", variant: "destructive" });
      return;
    }
    if (draftCreditTokenRatio <= 0) {
      toast({ title: "Credit:token 换算比例必须大于 0", variant: "destructive" });
      return;
    }
    if (draftBasePrice === basePrice && draftCreditTokenRatio === creditTokenRatio) {
      setIsEditingBasePrice(false);
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSaveBasePrice = () => {
    setBasePrice(draftBasePrice);
    setCreditTokenRatio(draftCreditTokenRatio);
    setIsEditingBasePrice(false);
    setConfirmOpen(false);
    toast({ title: "保存成功", description: "基准价格与 Credit:token 换算已更新，模型默认抵扣系数/抵扣量已重新计算" });
  };

  const startEditRows = () => {
    const initial: Record<string, number> = {};
    for (const m of MODEL_PRICE_CONFIG) {
      initial[m.id] = extraMap[m.id] ?? 1;
    }
    setDraftExtraMap(initial);
    setIsEditingRows(true);
  };

  const cancelEditRows = () => {
    setIsEditingRows(false);
  };

  const saveEditRows = () => {
    setExtraMap(draftExtraMap);
    setIsEditingRows(false);
    toast({ title: "保存成功", description: "模型额外抵扣系数已更新" });
  };

  const updateDraftExtra = (modelId: string, value: number) => {
    setDraftExtraMap((prev) => ({ ...prev, [modelId]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => navigate("/admin/console/subscription-management")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">设置抵扣规则</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            统一配置权益商品的基准价格、模型默认抵扣系数与特殊模型额外抵扣系数
          </p>
        </div>
      </div>

      {/* Section 1: Base price config */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              基准价格配置
            </CardTitle>
            <CardDescription>统一基准价格与 Credit:token 换算共同决定 Credit 基准价值，用于换算默认抵扣系数/抵扣量</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingBasePrice ? (
              <Button variant="outline" size="sm" onClick={startEditBasePrice}>
                <Pencil className="w-4 h-4 mr-1.5" />
                编辑
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditBasePrice}>
                  取消
                </Button>
                <Button size="sm" onClick={requestSaveBasePrice}>
                  <Save className="w-4 h-4 mr-1.5" />
                  保存
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="basePrice" className="text-sm">
                统一基准价格
              </Label>
              <div className="relative">
                <Input
                  id="basePrice"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={isEditingBasePrice ? draftBasePrice : basePrice}
                  onChange={(e) => setDraftBasePrice(parseFloat(e.target.value) || 0)}
                  readOnly={!isEditingBasePrice}
                  className={`pr-24 ${isEditingBasePrice ? "" : "bg-muted"}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  元 / M tokens
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditTokenRatio" className="text-sm">
                Credit:token 换算
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  1 Credit =
                </span>
                <Input
                  id="creditTokenRatio"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={isEditingBasePrice ? draftCreditTokenRatio : creditTokenRatio}
                  onChange={(e) => setDraftCreditTokenRatio(parseFloat(e.target.value) || 0)}
                  readOnly={!isEditingBasePrice}
                  className={`pl-20 pr-14 ${isEditingBasePrice ? "" : "bg-muted"}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  token
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Credit 基准价值</Label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-muted/40 text-sm">
                <span className="text-muted-foreground">
                  1 Credit = {formatRatio(displayCreditValue)} 元
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Token model deduction coefficient table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">token类模型抵扣系数表</CardTitle>
            <CardDescription className="mt-1">
              默认抵扣系数由模型刊例价与统一基准价格自动计算，最终抵扣系数 = 默认抵扣系数 × 额外抵扣系数；额外抵扣系数按模型统一配置。
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingRows ? (
              <Button variant="outline" size="sm" onClick={startEditRows}>
                <Pencil className="w-4 h-4 mr-1.5" />
                编辑
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditRows}>
                  <X className="w-4 h-4 mr-1.5" />
                  取消
                </Button>
                <Button size="sm" onClick={saveEditRows}>
                  <Save className="w-4 h-4 mr-1.5" />
                  保存
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索模型名称或 ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="模型类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-40">模型名称</TableHead>
                  <TableHead className="w-28">模型类型</TableHead>
                  <TableHead className="w-24">计费项</TableHead>
                  <TableHead className="w-56">适用条件</TableHead>
                  <TableHead className="w-32">刊例价</TableHead>
                  <TableHead className="w-32">默认抵扣系数</TableHead>
                  <TableHead className="w-28">额外抵扣系数</TableHead>
                  <TableHead className="w-32">最终抵扣系数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      未找到匹配的模型
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredModels.map((model) => {
                    const rows = rowsByModel[model.id];
                    const disabled = !model.enabled;
                    return rows.map((row, idx) => (
                      <TableRow
                        key={row.key}
                        className={disabled ? "bg-muted/50 text-muted-foreground" : ""}
                        title={disabled ? "模型已禁用" : undefined}
                      >
                        {idx === 0 && (
                          <TableCell rowSpan={rows.length} className="font-medium align-middle">
                            {row.modelName}
                          </TableCell>
                        )}
                        {idx === 0 && (
                          <TableCell rowSpan={rows.length} className="align-middle">
                            <Badge variant="outline" className="text-xs">
                              {row.modelType}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>{row.billingItemLabel}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-xs text-muted-foreground"
                          title={row.condition || "—"}
                        >
                          {row.condition || "—"}
                        </TableCell>
                        <TableCell>{formatPrice(row.listPrice)}/{row.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{formatCoeff(row.defaultCoefficient)}</TableCell>
                        {idx === 0 && (
                          <TableCell rowSpan={rows.length} className="align-middle">
                            {isEditingRows && row.modelEnabled ? (
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={row.extraCoefficient}
                                onChange={(e) => updateDraftExtra(row.modelId, parseFloat(e.target.value) || 0)}
                                className="h-8 w-28 text-sm"
                              />
                            ) : (
                              formatCoeff(row.extraCoefficient)
                            )}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{formatCoeff(row.finalCoefficient)}</TableCell>
                      </TableRow>
                    ));
                  })
                )}
              </TableBody>
            </Table>
          </div>

        </CardContent>
      </Card>

      {/* Section 3: Non-token model deduction coefficient table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">非token类模型抵扣系数表</CardTitle>
            <CardDescription className="mt-1">
              非token类模型按次/张/秒等计费，默认抵扣量由刊例价与 Credit 基准价值自动计算，最终抵扣量 = 默认抵扣量 × 额外抵扣系数；额外抵扣系数按模型统一配置。
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingRows ? (
              <Button variant="outline" size="sm" onClick={startEditRows}>
                <Pencil className="w-4 h-4 mr-1.5" />
                编辑
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={cancelEditRows}>
                  <X className="w-4 h-4 mr-1.5" />
                  取消
                </Button>
                <Button size="sm" onClick={saveEditRows}>
                  <Save className="w-4 h-4 mr-1.5" />
                  保存
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索模型名称或 ID"
                value={nonTokenSearch}
                onChange={(e) => setNonTokenSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={nonTokenFilterType} onValueChange={setNonTokenFilterType}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="模型类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {nonTokenTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-40">模型名称</TableHead>
                  <TableHead className="w-28">模型类型</TableHead>
                  <TableHead className="w-24">计费项</TableHead>
                  <TableHead className="w-56">适用条件</TableHead>
                  <TableHead className="w-32">刊例价</TableHead>
                  <TableHead className="w-32">默认抵扣量</TableHead>
                  <TableHead className="w-28">额外抵扣系数</TableHead>
                  <TableHead className="w-32">最终抵扣量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNonTokenModels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      未找到匹配的模型
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNonTokenModels.map((model) => {
                    const rows = rowsByModel[model.id];
                    const disabled = !model.enabled;
                    return rows.map((row, idx) => (
                      <TableRow
                        key={row.key}
                        className={disabled ? "bg-muted/50 text-muted-foreground" : ""}
                        title={disabled ? "模型已禁用" : undefined}
                      >
                        {idx === 0 && (
                          <TableCell rowSpan={rows.length} className="font-medium align-middle">
                            {row.modelName}
                          </TableCell>
                        )}
                        {idx === 0 && (
                          <TableCell rowSpan={rows.length} className="align-middle">
                            <Badge variant="outline" className="text-xs">
                              {row.modelType}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>{row.billingItemLabel}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-xs text-muted-foreground"
                          title={row.condition || "—"}
                        >
                          {row.condition || "—"}
                        </TableCell>
                        <TableCell>{formatPrice(row.listPrice)}/{row.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{formatCredit(row.defaultDeduction)} Credit / {row.unit}</TableCell>
                        {idx === 0 && (
                          <TableCell rowSpan={rows.length} className="align-middle">
                            {isEditingRows && row.modelEnabled ? (
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={row.extraCoefficient}
                                onChange={(e) => updateDraftExtra(row.modelId, parseFloat(e.target.value) || 0)}
                                className="h-8 w-28 text-sm"
                              />
                            ) : (
                              formatCoeff(row.extraCoefficient)
                            )}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{formatCredit(row.finalDeduction)} Credit / {row.unit}</TableCell>
                      </TableRow>
                    ));
                  })
                )}
              </TableBody>
            </Table>
          </div>

        </CardContent>
      </Card>

      {/* Base price change confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认修改基准价格？</AlertDialogTitle>
            <AlertDialogDescription>
              修改基准价格或 Credit:token 换算将重新计算所有模型的默认抵扣系数/抵扣量，可能影响后续 Credit 消耗。已产生的历史调用记录不受影响，是否确认保存？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveBasePrice}>确认保存</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
