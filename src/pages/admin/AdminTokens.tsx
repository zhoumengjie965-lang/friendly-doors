import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Copy, Trash2, Search, Eye, EyeOff, Check, Pencil, Ban, RefreshCw,
  MessageSquare,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_value: string;
  status: string;
  total_quota: number | null;
  used_quota: number;
  group_name: string | null;
  expires_at: string | null;
  allowed_models: string[] | null;
  ip_whitelist: string[] | null;
  enterprise_id: string;
  organization_id: string | null;
  creator_phone: string;
  created_at: string;
}

function maskKey(key: string, show: boolean) {
  if (show) return key;
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "**********" + key.slice(-4);
}

function PaginationFooter({
  total, page, pageSize, onPageChange, onPageSizeChange,
}: {
  total: number; page: number; pageSize: number;
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const [jumpVal, setJumpVal] = useState("");

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    p => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground flex-wrap gap-2">
      <span>共 {total} 条记录{total > 0 && <>&nbsp;&nbsp;第 {start}-{end} 条</>}</span>
      <div className="flex items-center gap-3">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={e => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }} className={page <= 1 ? "pointer-events-none opacity-40" : ""} />
            </PaginationItem>
            {pages.map((p, i) => (
              <PaginationItem key={p}>
                {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
                <PaginationLink href="#" isActive={p === page} onClick={e => { e.preventDefault(); onPageChange(p); }}>{p}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href="#" onClick={e => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }} className={page >= totalPages ? "pointer-events-none opacity-40" : ""} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n} 条/页</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span>跳至</span>
          <Input className="h-8 w-14 text-xs text-center" value={jumpVal} onChange={e => setJumpVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { const n = parseInt(jumpVal); if (!isNaN(n) && n >= 1 && n <= totalPages) onPageChange(n); setJumpVal(""); } }}
            placeholder="页" />
          <span>页</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminTokens() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search
  const [searchName, setSearchName] = useState("");
  const [searchKey, setSearchKey] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Visibility
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);

  // Enterprise name cache
  const [enterpriseNames, setEnterpriseNames] = useState<Record<string, string>>({});

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setKeys(data as unknown as ApiKey[]);
      // Fetch enterprise names
      const ids = [...new Set((data as unknown as ApiKey[]).map(k => k.enterprise_id))];
      if (ids.length > 0) {
        const { data: enterprises } = await supabase
          .from("enterprises")
          .select("id, name")
          .in("id", ids);
        if (enterprises) {
          const map: Record<string, string> = {};
          enterprises.forEach((e: any) => { map[e.id] = e.name; });
          setEnterpriseNames(map);
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const filtered = keys.filter(k => {
    if (searchName && !k.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchKey && !k.key_value.toLowerCase().includes(searchKey.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleVisible = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyKeyValue = async (k: ApiKey) => {
    await navigator.clipboard.writeText(k.key_value);
    setCopiedKey(k.id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleStatus = async (k: ApiKey) => {
    const newStatus = k.status === "active" ? "disabled" : "active";
    const { error } = await supabase.rpc("toggle_api_key_status" as any, {
      p_phone: k.creator_phone,
      p_id: k.id,
      p_status: newStatus,
    });
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      fetchKeys();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.rpc("delete_api_key" as any, {
      p_phone: deleteTarget.creator_phone,
      p_id: deleteTarget.id,
    });
    if (error) {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "已删除" });
      setDeleteTarget(null);
      setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
      fetchKeys();
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    let failed = 0;
    for (const id of selected) {
      const k = keys.find(key => key.id === id);
      if (!k) continue;
      const { error } = await supabase.rpc("delete_api_key" as any, { p_phone: k.creator_phone, p_id: k.id });
      if (error) failed++;
    }
    toast({ title: failed > 0 ? `部分删除失败（${failed}条）` : "批量删除成功" });
    setSelected(new Set());
    fetchKeys();
  };

  const handleCopySelected = async () => {
    const selectedKeys = keys.filter(k => selected.has(k.id)).map(k => k.key_value);
    if (selectedKeys.length === 0) return;
    await navigator.clipboard.writeText(selectedKeys.join("\n"));
    toast({ title: `已复制 ${selectedKeys.length} 个密钥` });
  };

  const toggleSelectAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map(k => k.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReset = () => {
    setSearchName("");
    setSearchKey("");
    setPage(1);
  };

  return (
    <div className="p-6 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">令牌管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={fetchKeys}>
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </Button>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" className="h-9 gap-1.5" disabled>
            <Plus className="w-3.5 h-3.5" />
            添加令牌
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleCopySelected} disabled={selected.size === 0}>
            <Copy className="w-3.5 h-3.5" />
            复制所选令牌
          </Button>
          <Button size="sm" variant="destructive" className="h-9 gap-1.5" onClick={handleBulkDelete} disabled={selected.size === 0}>
            <Trash2 className="w-3.5 h-3.5" />
            删除所选令牌
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Input
              className="h-9 w-44 text-sm"
              placeholder="搜索令牌名称"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
            <Input
              className="h-9 w-44 text-sm"
              placeholder="搜索密钥"
              value={searchKey}
              onChange={e => setSearchKey(e.target.value)}
            />
            <Button size="sm" className="h-9 gap-1" onClick={() => setPage(1)}>
              <Search className="w-3.5 h-3.5" />
              查询
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">加载中…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 w-10">
                      <Checkbox
                        checked={paged.length > 0 && selected.size === paged.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">名称</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">状态</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">已用/总额度</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">所属企业</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">分组</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">密钥</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">可用模型</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">IP 限制</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">创建时间</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">过期时间</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center text-muted-foreground py-16">暂无令牌数据</td>
                    </tr>
                  ) : paged.map(k => {
                    const isActive = k.status === "active";
                    const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
                    const usedPct = k.total_quota ? Math.min(100, (k.used_quota / k.total_quota) * 100) : 0;

                    return (
                      <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <Checkbox checked={selected.has(k.id)} onCheckedChange={() => toggleSelect(k.id)} />
                        </td>
                        <td className="px-3 py-2.5 text-foreground font-medium whitespace-nowrap">{k.name}</td>
                        <td className="px-3 py-2.5">
                          {isActive
                            ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">已启用</Badge>
                            : <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-xs">已禁用</Badge>
                          }
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="min-w-[110px]">
                            <span className="text-xs font-mono text-foreground">
                              ¥{k.used_quota.toFixed(2)} <span className="text-muted-foreground">/ {k.total_quota !== null ? `¥${k.total_quota.toFixed(2)}` : "无限制"}</span>
                            </span>
                            {k.total_quota !== null && (
                              <Progress value={usedPct} className="h-1 mt-1 bg-muted" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">
                          {enterpriseNames[k.enterprise_id] || k.enterprise_id.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-foreground">{k.group_name || "-"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded max-w-[160px] truncate">
                              {maskKey(k.key_value, visibleKeys.has(k.id))}
                            </code>
                            <button onClick={() => toggleVisible(k.id)} className="p-0.5 hover:bg-muted rounded text-muted-foreground">
                              {visibleKeys.has(k.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => copyKeyValue(k)} className="p-0.5 hover:bg-muted rounded text-muted-foreground">
                              {copiedKey === k.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {k.allowed_models && k.allowed_models.length > 0 ? (
                            <div className="flex flex-wrap gap-0.5 max-w-[140px]">
                              {k.allowed_models.slice(0, 2).map(m => (
                                <span key={m} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-1 py-px">{m}</span>
                              ))}
                              {k.allowed_models.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{k.allowed_models.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">全部</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {k.ip_whitelist && k.ip_whitelist.length > 0
                            ? <span className="text-orange-600">{k.ip_whitelist.length} 条</span>
                            : "-"
                          }
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {format(new Date(k.created_at), "yyyy-MM-dd HH:mm")}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap font-mono">
                          {k.expires_at ? (
                            <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                              {format(new Date(k.expires_at), "yyyy-MM-dd HH:mm")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">永不过期</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleToggleStatus(k)}
                              className={`p-1 rounded hover:bg-muted transition-colors ${isActive ? "text-orange-500" : "text-green-600"}`}
                              title={isActive ? "禁用" : "启用"}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(k)}
                              className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除令牌</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除令牌「{deleteTarget?.name}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
