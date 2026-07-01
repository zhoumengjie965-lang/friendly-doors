import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getMockData } from "@/lib/mockData";
import { getCurrentPhone } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, RotateCcw, Copy, Check, Pencil, Trash2, Eye, EyeOff, Settings,
  ChevronDown, GripVertical, X, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// API Key 数据类型
interface ApiKeyItem {
  id: string;
  name: string;
  key_value: string;
  status: "active" | "disabled";
  total_quota: number | null;
  used_quota: number;
  group_name: string;
  groups: string[]; // 多分组，按优先级排序
  allowed_models: string[];
  expires_at: string | null;
  created_at: string;
}

// 模拟数据
const MOCK_API_KEYS: ApiKeyItem[] = [
  {
    id: "1",
    name: "aliyun",
    key_value: "Dicr2***********PM6p",
    status: "active",
    total_quota: null,
    used_quota: 0,
    group_name: "aliyun-test",
    groups: ["aliyun-test", "default"],
    allowed_models: ["无限制"],
    expires_at: null,
    created_at: "2026-04-27T16:56:08",
  },
  {
    id: "2",
    name: "1",
    key_value: "grkN***********jf3",
    status: "active",
    total_quota: 60.60,
    used_quota: 8.00,
    group_name: "default",
    groups: ["default"],
    allowed_models: ["无限制"],
    expires_at: "2026-03-25T13:47:04",
    created_at: "2026-03-25T13:47:04",
  },
  {
    id: "3",
    name: "通用分组key",
    key_value: "ENPf***********zGTK",
    status: "active",
    total_quota: null,
    used_quota: 0,
    group_name: "default",
    groups: ["default", "general"],
    allowed_models: ["无限制"],
    expires_at: null,
    created_at: "2026-03-18T10:08:53",
  },
  {
    id: "4",
    name: "测试suno",
    key_value: "QPVx***********nqDy",
    status: "active",
    total_quota: null,
    used_quota: 0,
    group_name: "suno",
    groups: ["suno"],
    allowed_models: ["无限制"],
    expires_at: null,
    created_at: "2026-03-17T17:32:38",
  },
];

const AVAILABLE_MODELS = [
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo",
  "claude-3-5-sonnet", "claude-3-haiku", "gemini-1.5-pro", "gemini-1.5-flash",
  "suno", "dall-e-3"
];

// 分组多选组件（支持搜索、多选、拖拽排序）
interface GroupMultiSelectProps {
  groups: typeof GROUP_OPTIONS;
  selected: string[];
  onChange: (groups: string[]) => void;
  placeholder?: string;
}

function GroupMultiSelect({ groups, selected, onChange, placeholder = "选择分组" }: GroupMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  // 过滤分组列表
  const filteredGroups = groups.filter(g =>
    g.label.toLowerCase().includes(search.toLowerCase()) ||
    g.value.toLowerCase().includes(search.toLowerCase())
  );

  // 是否全选
  const isAllSelected = selected.length === groups.length;

  // 处理全选/取消全选
  const toggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(groups.map(g => g.value));
    }
  };

  // 处理选择/取消选择
  const toggleGroup = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(g => g !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // 移除已选分组
  const removeGroup = (value: string) => {
    onChange(selected.filter(g => g !== value));
  };

  // 拖拽排序处理
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;

    const newSelected = [...selected];
    const draggedItem = newSelected[dragIndexRef.current];
    newSelected.splice(dragIndexRef.current, 1);
    newSelected.splice(index, 0, draggedItem);

    dragIndexRef.current = index;
    onChange(newSelected);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 获取分组显示信息
  const getGroupInfo = (value: string) => groups.find(g => g.value === value);

  return (
    <div ref={containerRef} className="relative">
      {/* 触发按钮（标签内嵌显示） */}
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <div className="flex flex-wrap gap-1.5 flex-1 items-center overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : isAllSelected ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground text-xs">
              全部分组（{groups.length}）
            </span>
          ) : selected.length <= 2 ? (
            selected.map((value) => {
              const group = getGroupInfo(value);
              if (!group) return null;
              return (
                <span
                  key={value}
                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground text-xs whitespace-nowrap"
                >
                  {group.label}
                </span>
              );
            })
          ) : (
            <>
              {selected.slice(0, 2).map((value) => {
                const group = getGroupInfo(value);
                if (!group) return null;
                return (
                  <span
                    key={value}
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground text-xs whitespace-nowrap"
                  >
                    {group.label}
                  </span>
                );
              })}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 text-xs cursor-pointer hover:bg-gray-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      +{selected.length - 2}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} avoidCollisions={false} className="max-w-md p-3 z-[100]">
                    <div className="flex flex-wrap gap-2 max-w-[320px]">
                      {selected.map((value) => {
                        const group = getGroupInfo(value);
                        if (!group) return null;
                        return (
                          <span
                            key={value}
                            className="inline-flex items-center px-2 py-1 rounded bg-muted border border-border text-muted-foreground text-xs whitespace-nowrap"
                          >
                            {group.label}
                          </span>
                        );
                      })}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 opacity-50 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* 下拉选择面板 */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md">
          {/* 搜索框 */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索分组..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                autoFocus
              />
            </div>
          </div>

          {/* 全选选项 */}
          <div className="px-2 py-1.5 border-b bg-muted/20">
            <label className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted cursor-pointer rounded">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleAll}
                className="rounded border-gray-300"
              />
              <span className="font-medium">全部分组</span>
            </label>
          </div>

          {/* 选项列表 */}
          <div className="max-h-60 overflow-auto p-1">
            {filteredGroups.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">未找到分组</div>
            ) : (
              filteredGroups.map(group => (
                <label
                  key={group.value}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(group.value)}
                    onChange={() => toggleGroup(group.value)}
                    className="rounded border-gray-300"
                  />
                  <span className="flex-1">{group.label}</span>
                  <span className="text-xs text-muted-foreground">{group.multiplier}</span>
                </label>
              ))
            )}
          </div>

          {/* 底部操作 */}
          <div className="p-2 border-t flex justify-between items-center text-xs text-muted-foreground">
            <span>已选择 {selected.length} 个</span>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-red-500 hover:text-red-600"
              >
                清空
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const GROUP_OPTIONS = [
  { value: "default", label: "官方价格", multiplier: "×1.0" },
  { value: "production", label: "生产通道", multiplier: "×0.95" },
  { value: "testing", label: "测试环境", multiplier: "×0.85" },
  { value: "development", label: "开发环境", multiplier: "×0.8" },
  { value: "internal", label: "内部工具", multiplier: "×0.7" },
  { value: "experiment", label: "实验分组", multiplier: "×0.6" },
  { value: "staging", label: "预发环境", multiplier: "×0.9" },
  { value: "partner", label: "合作伙伴", multiplier: "×0.88" },
  { value: "vip", label: "VIP通道", multiplier: "×0.92" },
  { value: "backup", label: "备用通道", multiplier: "×0.75" },
];

export default function PersonalApiKeys() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(MOCK_API_KEYS);
  const [loading, setLoading] = useState(false);

  // 搜索条件
  const [nameSearch, setNameSearch] = useState("");
  const [keySearch, setKeySearch] = useState("");

  // 显示/隐藏 Key
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // 复制状态
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 分页
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 创建/编辑弹窗
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);

  // 删除确认
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  // 一键配置额度弹窗
  const [isBatchQuotaOpen, setIsBatchQuotaOpen] = useState(false);
  const [batchQuotaAmount, setBatchQuotaAmount] = useState<string>("");
  const [batchUnlimitedQuota, setBatchUnlimitedQuota] = useState(true);

  // 表单状态
  const [formData, setFormData] = useState<Partial<ApiKeyItem>>({
    name: "",
    status: "active",
    total_quota: null,
    groups: GROUP_OPTIONS.map(g => g.value), // 默认全选所有分组
    allowed_models: ["无限制"],
    expires_at: null,
  });
  const [unlimitedQuota, setUnlimitedQuota] = useState(true);
  const [neverExpire, setNeverExpire] = useState(true);

  // 过滤数据
  const filteredKeys = useMemo(() => {
    return apiKeys.filter((key) => {
      const matchName = !nameSearch || key.name.toLowerCase().includes(nameSearch.toLowerCase());
      const matchKey = !keySearch || key.key_value.toLowerCase().includes(keySearch.toLowerCase());
      return matchName && matchKey;
    });
  }, [apiKeys, nameSearch, keySearch]);

  // 分页数据
  const paginatedKeys = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredKeys.slice(start, start + pageSize);
  }, [filteredKeys, page]);

  const totalPages = Math.ceil(filteredKeys.length / pageSize);

  // 切换 Key 显示/隐藏
  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 复制 Key
  const copyKey = async (keyValue: string, id: string) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      setCopiedId(id);
      toast({ title: "复制成功" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "复制失败", variant: "destructive" });
    }
  };

  // 重置搜索
  const handleReset = () => {
    setNameSearch("");
    setKeySearch("");
    setPage(1);
  };

  // 打开创建弹窗
  const openCreate = () => {
    setFormData({
      name: "",
      status: "active",
      total_quota: null,
      groups: GROUP_OPTIONS.map(g => g.value), // 默认全选所有分组
      allowed_models: ["无限制"],
      expires_at: null,
    });
    setUnlimitedQuota(true);
    setNeverExpire(true);
    setIsCreateOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (key: ApiKeyItem) => {
    setEditingKey(key);
    setFormData({ 
      ...key,
      groups: key.groups || [key.group_name] || ["default"], // 兼容旧数据
    });
    setUnlimitedQuota(key.total_quota === null);
    setNeverExpire(key.expires_at === null);
    setIsEditOpen(true);
  };

  // 生成随机 Key
  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 创建 Key
  const handleCreate = () => {
    if (!formData.name?.trim()) {
      toast({ title: "请输入名称", variant: "destructive" });
      return;
    }

    const groups = formData.groups || ["default"];
    const newKey: ApiKeyItem = {
      id: Date.now().toString(),
      name: formData.name,
      key_value: generateKey(),
      status: formData.status as "active" | "disabled",
      total_quota: unlimitedQuota ? null : (formData.total_quota || 0),
      used_quota: 0,
      group_name: groups[0] || "default",
      groups: groups,
      allowed_models: formData.allowed_models || ["无限制"],
      expires_at: neverExpire ? null : (formData.expires_at || null),
      created_at: new Date().toISOString(),
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setIsCreateOpen(false);
    toast({ title: "API Key 创建成功" });
  };

  // 编辑 Key
  const handleEdit = () => {
    if (!editingKey || !formData.name?.trim()) {
      toast({ title: "请输入名称", variant: "destructive" });
      return;
    }

    const groups = formData.groups || ["default"];
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === editingKey.id
          ? {
              ...k,
              name: formData.name!,
              status: formData.status as "active" | "disabled",
              total_quota: unlimitedQuota ? null : (formData.total_quota || 0),
              group_name: groups[0] || "default",
              groups: groups,
              allowed_models: formData.allowed_models || ["无限制"],
              expires_at: neverExpire ? null : (formData.expires_at || null),
            }
          : k
      )
    );

    setIsEditOpen(false);
    setEditingKey(null);
    toast({ title: "API Key 更新成功" });
  };

  // 删除 Key
  const handleDelete = () => {
    if (!deleteKeyId) return;

    setApiKeys((prev) => prev.filter((k) => k.id !== deleteKeyId));
    setDeleteKeyId(null);
    toast({ title: "API Key 删除成功" });
  };

  // 打开一键配置额度弹窗
  const openBatchQuota = () => {
    setBatchQuotaAmount("");
    setBatchUnlimitedQuota(true);
    setIsBatchQuotaOpen(true);
  };

  // 一键配置额度
  const handleBatchQuota = () => {
    // 获取当前过滤后的key ids（只更新当前列表下的）
    const targetKeyIds = new Set(filteredKeys.map((k) => k.id));

    if (targetKeyIds.size === 0) {
      toast({ title: "当前列表为空，无可更新的 API Key", variant: "destructive" });
      return;
    }

    setApiKeys((prev) =>
      prev.map((k) => {
        if (targetKeyIds.has(k.id)) {
          return {
            ...k,
            total_quota: batchUnlimitedQuota ? null : parseFloat(batchQuotaAmount) || 0,
            used_quota: 0, // 重置已使用额度
          };
        }
        return k;
      })
    );

    setIsBatchQuotaOpen(false);
    toast({ title: `已成功更新 ${targetKeyIds.size} 个 API Key 的额度` });
  };

  // 格式化额度显示
  const formatQuota = (total: number | null, used: number) => {
    if (total === null) return "无限额度";
    const remaining = total - used;
    return `¥${remaining.toFixed(2)}/¥${total.toFixed(2)}`;
  };

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "永不过期";
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm:ss");
  };

  return (
    <div className="p-6 space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">API Key</h1>
        <Button variant="outline" className="gap-2 text-sm" onClick={() => navigate("/workspace/manage-api-credentials")}>
          管理 API 凭证
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 搜索和操作栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            创建 API Key
          </Button>
          <Button variant="outline" onClick={openBatchQuota} className="gap-2">
            <Settings className="w-4 h-4" />
            重置额度
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">名称</span>
            <Input
              placeholder="请输入名称"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="w-40 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">API Key</span>
            <Input
              placeholder="请输入 API Key"
              value={keySearch}
              onChange={(e) => setKeySearch(e.target.value)}
              className="w-40 h-9"
            />
          </div>
          <Button variant="default" size="sm" className="h-9 gap-1">
            <Search className="w-4 h-4" />
            搜索
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">名称</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-40">剩余额度/总额度</TableHead>
              <TableHead className="w-32">分组</TableHead>
              <TableHead className="w-48">API Key</TableHead>
              <TableHead className="w-32">可用模型</TableHead>
              <TableHead className="w-40">过期时间</TableHead>
              <TableHead className="w-40">创建时间</TableHead>
              <TableHead className="w-24 text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              paginatedKeys.map((key) => (
                <TableRow key={key.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={key.status === "active" ? "default" : "secondary"}
                      className={key.status === "active" ? "bg-green-500 hover:bg-green-600" : ""}
                    >
                      {key.status === "active" ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatQuota(key.total_quota, key.used_quota)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.groups && key.groups.length > 0 ? (
                        key.groups.slice(0, 2).map((g) => {
                          const groupInfo = GROUP_OPTIONS.find(opt => opt.value === g);
                          return (
                            <span key={g} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                              {groupInfo?.label || g}
                            </span>
                          );
                        })
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                          {key.group_name}
                        </span>
                      )}
                      {key.groups && key.groups.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{key.groups.length - 2}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {visibleKeys.has(key.id) ? key.key_value : maskKey(key.key_value)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title={visibleKeys.has(key.id) ? "隐藏" : "显示"}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyKey(key.key_value, key.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="复制"
                      >
                        {copiedId === key.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {key.allowed_models.includes("无限制") ? (
                      <span className="text-xs text-muted-foreground">无限制</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {key.allowed_models.slice(0, 2).map((m) => (
                          <span key={m} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                            {m}
                          </span>
                        ))}
                        {key.allowed_models.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{key.allowed_models.length - 2}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.expires_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(key.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(key)}
                        className="text-blue-500 hover:text-blue-600 p-1"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteKeyId(key.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {filteredKeys.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            共 {filteredKeys.length} 条记录
            {filteredKeys.length > 0 && (
              <>
                {" "}
                第 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredKeys.length)} 条
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <span className="px-2 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-sm text-muted-foreground">跳至</span>
              <Input
                className="w-12 h-8 text-center text-sm"
                defaultValue={page}
                onBlur={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 1 && v <= totalPages) setPage(v);
                }}
              />
              <span className="text-sm text-muted-foreground">页</span>
            </div>
          </div>
        </div>
      )}

      {/* 创建弹窗 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建 API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="请输入名称"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>分组 <span className="text-red-500">*</span></Label>
              <GroupMultiSelect
                groups={GROUP_OPTIONS}
                selected={formData.groups || []}
                onChange={(groups) => setFormData({ ...formData, groups })}
                placeholder="选择分组"
              />
            </div>
            <div className="space-y-2">
              <Label>额度设置</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={unlimitedQuota}
                    onChange={(e) => setUnlimitedQuota(e.target.checked)}
                  />
                  <span className="text-sm">无限额度</span>
                </label>
                {!unlimitedQuota && (
                  <Input
                    type="number"
                    placeholder="额度"
                    className="w-32"
                    value={formData.total_quota || ""}
                    onChange={(e) => setFormData({ ...formData, total_quota: parseFloat(e.target.value) || 0 })}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>过期时间</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={neverExpire}
                    onChange={(e) => setNeverExpire(e.target.checked)}
                  />
                  <span className="text-sm">永不过期</span>
                </label>
                {!neverExpire && (
                  <Input
                    type="datetime-local"
                    value={formData.expires_at?.slice(0, 16) || ""}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>可用模型</Label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowed_models?.includes("无限制")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, allowed_models: ["无限制"] });
                      } else {
                        setFormData({ ...formData, allowed_models: [] });
                      }
                    }}
                  />
                  <span className="text-sm">无限制</span>
                </label>
              </div>
              {!formData.allowed_models?.includes("无限制") && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_MODELS.map((model) => (
                    <label key={model} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.allowed_models?.includes(model)}
                        onChange={(e) => {
                          const current = formData.allowed_models || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, allowed_models: [...current, model] });
                          } else {
                            setFormData({ ...formData, allowed_models: current.filter((m) => m !== model) });
                          }
                        }}
                      />
                      {model}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? "active" : "disabled" })
                  }
                />
                <span className="text-sm">{formData.status === "active" ? "启用" : "禁用"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑 API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="请输入名称"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>分组 <span className="text-red-500">*</span></Label>
              <GroupMultiSelect
                groups={GROUP_OPTIONS}
                selected={formData.groups || []}
                onChange={(groups) => setFormData({ ...formData, groups })}
                placeholder="选择分组"
              />
            </div>
            <div className="space-y-2">
              <Label>额度设置</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={unlimitedQuota}
                    onChange={(e) => setUnlimitedQuota(e.target.checked)}
                  />
                  <span className="text-sm">无限额度</span>
                </label>
                {!unlimitedQuota && (
                  <Input
                    type="number"
                    placeholder="额度"
                    className="w-32"
                    value={formData.total_quota || ""}
                    onChange={(e) => setFormData({ ...formData, total_quota: parseFloat(e.target.value) || 0 })}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>过期时间</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={neverExpire}
                    onChange={(e) => setNeverExpire(e.target.checked)}
                  />
                  <span className="text-sm">永不过期</span>
                </label>
                {!neverExpire && (
                  <Input
                    type="datetime-local"
                    value={formData.expires_at?.slice(0, 16) || ""}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>可用模型</Label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowed_models?.includes("无限制")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, allowed_models: ["无限制"] });
                      } else {
                        setFormData({ ...formData, allowed_models: [] });
                      }
                    }}
                  />
                  <span className="text-sm">无限制</span>
                </label>
              </div>
              {!formData.allowed_models?.includes("无限制") && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_MODELS.map((model) => (
                    <label key={model} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.allowed_models?.includes(model)}
                        onChange={(e) => {
                          const current = formData.allowed_models || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, allowed_models: [...current, model] });
                          } else {
                            setFormData({ ...formData, allowed_models: current.filter((m) => m !== model) });
                          }
                        }}
                      />
                      {model}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? "active" : "disabled" })
                  }
                />
                <span className="text-sm">{formData.status === "active" ? "启用" : "禁用"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一键配置额度弹窗 */}
      <Dialog open={isBatchQuotaOpen} onOpenChange={setIsBatchQuotaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重置额度</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 金额输入 */}
            <div className="flex items-center gap-4">
              <Label className="w-16 text-sm">金额：</Label>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                <Input
                  placeholder="请输入金额"
                  value={batchQuotaAmount}
                  onChange={(e) => setBatchQuotaAmount(e.target.value)}
                  disabled={batchUnlimitedQuota}
                  className="pl-7"
                />
              </div>
            </div>

            {/* 无限额度开关 */}
            <div className="flex items-center gap-4">
              <Label className="w-16 text-sm">无限额度：</Label>
              <Switch
                checked={batchUnlimitedQuota}
                onCheckedChange={setBatchUnlimitedQuota}
              />
            </div>

            {/* 提示文字 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700">
                注意：此操作将重置当前列表下所有限额模式的APIKey（已开启"无限额度"的APIKey不受影响），提交后将立即覆盖剩余额度。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchQuotaOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchQuota} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!batchUnlimitedQuota && !batchQuotaAmount}
            >
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，是否确认删除此 API Key？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// 脱敏显示 Key
function maskKey(key: string): string {
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "***********" + key.slice(-4);
}
