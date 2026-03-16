import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Copy, Trash2, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "@/lib/adminAuth";

interface RedeemCode {
  id: string;
  code: string;
  amount: number;
  status: string;
  created_at: string;
  used_by: string | null;
  used_at: string | null;
}

export default function AdminBilling() {
  const { toast } = useToast();
  const session = getAdminSession();
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Add dialog
  const [open, setOpen] = useState(false);
  const [codeName, setCodeName] = useState("");
  const [codeAmount, setCodeAmount] = useState("");
  const [codeCount, setCodeCount] = useState("1");
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("redeem_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setCodes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = codes.filter((c) =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const s = new Set(prev); filtered.forEach((c) => s.delete(c.id)); return s; });
    } else {
      setSelected((prev) => { const s = new Set(prev); filtered.forEach((c) => s.add(c.id)); return s; });
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const handleCopySelected = () => {
    const selectedCodes = codes.filter((c) => selected.has(c.id)).map((c) => c.code).join("\n");
    if (!selectedCodes) { toast({ title: "请先选择兑换码" }); return; }
    navigator.clipboard.writeText(selectedCodes);
    toast({ title: `已复制 ${selected.size} 条兑换码到剪贴板` });
  };

  const handleClearExpired = async () => {
    const used = codes.filter((c) => c.status === "used");
    if (used.length === 0) { toast({ title: "没有失效的兑换码" }); return; }
    // Mark as deleted by updating status (no delete RLS), or just filter locally
    toast({ title: `已清除 ${used.length} 条已使用兑换码（仅本地视图）`, description: "数据库记录保留" });
    setCodes((prev) => prev.filter((c) => c.status !== "used"));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(codeAmount);
    const cnt = parseInt(codeCount);
    if (isNaN(amt) || amt <= 0 || isNaN(cnt) || cnt < 1 || cnt > 100) return;
    setGenerating(true);
    const errors: string[] = [];
    for (let i = 0; i < cnt; i++) {
      const prefix = codeName ? codeName.replace(/\s+/g, "").toUpperCase().slice(0, 6) : "";
      const suffix = Math.random().toString(36).substring(2, 10).toUpperCase();
      const code = prefix ? `${prefix}-${suffix}` : suffix;
      const { error } = await supabase.rpc("admin_create_redeem_code", { p_code: code, p_amount: amt });
      if (error) errors.push(error.message);
    }
    setGenerating(false);
    if (errors.length > 0) {
      toast({ title: "部分生成失败", description: errors[0], variant: "destructive" });
    } else {
      toast({ title: `已生成 ${cnt} 张兑换码，面值 ¥${amt}` });
      setOpen(false);
      setCodeName(""); setCodeAmount(""); setCodeCount("1");
      fetchData();
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">兑换码管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">生成与管理兑换码</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          添加兑换码
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopySelected}>
          <Copy className="w-4 h-4 mr-1.5" />
          复制所选兑换码到剪贴板
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleClearExpired}>
          <Trash2 className="w-4 h-4 mr-1.5" />
          清除失效兑换码
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 w-48 text-sm"
              placeholder="关键字"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            />
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setSearch(searchInput)}>查询</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setSearch(""); setSearchInput(""); }}>重置</Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Head */}
        <div className="grid grid-cols-[2.5rem_1fr_2.5fr_1fr_1fr_1.5fr_1.5fr_1.5fr] gap-3 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b items-center">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <span>ID</span>
          <span>名称</span>
          <span>状态</span>
          <span>额度</span>
          <span>创建时间</span>
          <span>过期时间</span>
          <span>兑换人ID</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">暂无兑换码</div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[2.5rem_1fr_2.5fr_1fr_1fr_1.5fr_1.5fr_1.5fr] gap-3 px-4 py-3 border-b last:border-0 text-sm items-center hover:bg-muted/30 transition-colors"
            >
              <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} />
              <span className="font-mono text-xs text-muted-foreground truncate" title={c.id}>{c.id.slice(0, 8)}…</span>
              <span className="font-mono text-foreground truncate" title={c.code}>{c.code}</span>
              <span>
                <Badge
                  variant={c.status === "used" ? "secondary" : "outline"}
                  className={`text-xs ${c.status !== "used" ? "border-green-500/50 text-green-600 dark:text-green-400" : ""}`}
                >
                  {c.status === "used" ? "已使用" : "未使用"}
                </Badge>
              </span>
              <span className="text-foreground">¥{Number(c.amount).toFixed(2)}</span>
              <span className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString("zh-CN")}</span>
              <span className="text-muted-foreground text-xs">—</span>
              <span className="text-muted-foreground text-xs truncate">{c.used_by || "—"}</span>
            </div>
          ))
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加兑换码</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名称 / 备注（选填）</Label>
              <Input placeholder="如：活动码、测试码" value={codeName} onChange={(e) => setCodeName(e.target.value)} />
              <p className="text-xs text-muted-foreground">将作为兑换码前缀使用</p>
            </div>
            <div className="space-y-1.5">
              <Label>面值 (¥)</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="如：50.00" value={codeAmount} onChange={(e) => setCodeAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>生成数量（1–100）</Label>
              <Input type="number" min="1" max="100" value={codeCount} onChange={(e) => setCodeCount(e.target.value)} required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button type="submit" disabled={generating}>
                {generating ? "生成中…" : "确认生成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
