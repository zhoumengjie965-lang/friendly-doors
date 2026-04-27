import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

// 模型价格数据接口
interface ModelPrice {
  id: string;
  modelName: string;
  fixedPrice: number | null;
  modelRate: number | null;
  completionRate: number | null;
  isConflict: boolean;
}

// 模拟数据
const INITIAL_MODEL_PRICES: ModelPrice[] = [
  { id: "1", modelName: "black-forest-labs/flux-1.1-pro", fixedPrice: 0.04, modelRate: null, completionRate: null, isConflict: false },
  { id: "2", modelName: "dall-e-3", fixedPrice: 0.04, modelRate: null, completionRate: null, isConflict: false },
  { id: "3", modelName: "gpt-4-gizmo-*", fixedPrice: 0.1, modelRate: null, completionRate: null, isConflict: false },
  { id: "4", modelName: "gpt-4o-mini-tts", fixedPrice: 0.3, modelRate: null, completionRate: null, isConflict: false },
  { id: "5", modelName: "imagen-3.0-generate-002", fixedPrice: 0.03, modelRate: null, completionRate: null, isConflict: false },
  { id: "6", modelName: "mj_blend", fixedPrice: 0.1, modelRate: null, completionRate: null, isConflict: false },
  { id: "7", modelName: "mj_custom_zoom", fixedPrice: 0, modelRate: null, completionRate: null, isConflict: false },
  { id: "8", modelName: "mj_describe", fixedPrice: 0.05, modelRate: null, completionRate: null, isConflict: false },
  { id: "9", modelName: "mj_edits", fixedPrice: 0.1, modelRate: null, completionRate: null, isConflict: false },
  { id: "10", modelName: "mj_high_variation", fixedPrice: 0.1, modelRate: null, completionRate: null, isConflict: false },
  { id: "11", modelName: "gpt-4o", fixedPrice: null, modelRate: 1.0, completionRate: 1.0, isConflict: false },
  { id: "12", modelName: "claude-3-5-sonnet", fixedPrice: null, modelRate: 0.85, completionRate: 0.9, isConflict: true },
  { id: "13", modelName: "gpt-4-turbo", fixedPrice: null, modelRate: 1.2, completionRate: 1.2, isConflict: false },
  { id: "14", modelName: "gemini-1.5-pro", fixedPrice: null, modelRate: 0.8, completionRate: 0.85, isConflict: true },
  { id: "15", modelName: "llama-3-70b", fixedPrice: null, modelRate: 0.5, completionRate: 0.5, isConflict: false },
];

// 生成更多模拟数据
const generateMoreData = (): ModelPrice[] => {
  const moreData: ModelPrice[] = [];
  const modelPrefixes = ["gpt-4", "claude-3", "gemini", "llama", "qwen", "baichuan"];
  const modelSuffixes = ["-mini", "-pro", "-ultra", "-turbo", "-latest", "-preview"];
  
  for (let i = 16; i <= 334; i++) {
    const prefix = modelPrefixes[Math.floor(Math.random() * modelPrefixes.length)];
    const suffix = modelSuffixes[Math.floor(Math.random() * modelSuffixes.length)];
    const hasFixedPrice = Math.random() > 0.5;
    moreData.push({
      id: i.toString(),
      modelName: `${prefix}${suffix}-${i}`,
      fixedPrice: hasFixedPrice ? Number((Math.random() * 0.5).toFixed(3)) : null,
      modelRate: hasFixedPrice ? null : Number((Math.random() * 1.5 + 0.5).toFixed(2)),
      completionRate: hasFixedPrice ? null : Number((Math.random() * 1.5 + 0.5).toFixed(2)),
      isConflict: Math.random() > 0.9,
    });
  }
  return moreData;
};

const ALL_MODEL_PRICES = [...INITIAL_MODEL_PRICES, ...generateMoreData()];

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
    modelRate: 1.0,
    completionRate: 1.0,
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
      isConflict: false,
    };
    setModelPrices((prev) => [model, ...prev]);
    setIsAddDialogOpen(false);
    setNewModel({
      modelName: "",
      fixedPrice: null,
      modelRate: 1.0,
      completionRate: 1.0,
    });
    toast({
      title: "添加成功",
      description: "新模型价格已添加",
    });
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

      {/* 模型倍率设置内容 */}
      {currentTab === "model-rate" && (
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
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          setModelPrices((prev) =>
                            prev.map((m) => (m.id === item.id ? { ...m, fixedPrice: value } : m))
                          );
                        }}
                        className="w-24 h-8 text-sm"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.modelRate ?? ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          setModelPrices((prev) =>
                            prev.map((m) => (m.id === item.id ? { ...m, modelRate: value } : m))
                          );
                        }}
                        className="w-24 h-8 text-sm"
                        placeholder="-"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.completionRate ?? ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null;
                          setModelPrices((prev) =>
                            prev.map((m) => (m.id === item.id ? { ...m, completionRate: value } : m))
                          );
                        }}
                        className="w-24 h-8 text-sm"
                        placeholder="-"
                      />
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

      {/* 其他标签页内容（占位） */}
      {currentTab === "group-rate" && (
        <div className="p-8 text-center text-muted-foreground">
          <p>分组倍率设置功能开发中...</p>
        </div>
      )}
      {currentTab === "visual-rate" && (
        <div className="p-8 text-center text-muted-foreground">
          <p>可视化倍率设置功能开发中...</p>
        </div>
      )}
      {currentTab === "unset-rate" && (
        <div className="p-8 text-center text-muted-foreground">
          <p>未设置倍率模型功能开发中...</p>
        </div>
      )}
      {currentTab === "upstream-sync" && (
        <div className="p-8 text-center text-muted-foreground">
          <p>上游倍率同步功能开发中...</p>
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑模型价格</DialogTitle>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">模型名称</label>
                <Input
                  value={editingModel.modelName}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, modelName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">模型固定价格</label>
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
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">模型倍率</label>
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
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">补全倍率</label>
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
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加模型</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">模型名称</label>
              <Input
                value={newModel.modelName}
                onChange={(e) => setNewModel({ ...newModel, modelName: e.target.value })}
                placeholder="请输入模型名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">模型固定价格</label>
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
                placeholder="请输入固定价格（可选）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">模型倍率</label>
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
                placeholder="请输入模型倍率（可选）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">补全倍率</label>
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
                placeholder="请输入补全倍率（可选）"
              />
            </div>
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
