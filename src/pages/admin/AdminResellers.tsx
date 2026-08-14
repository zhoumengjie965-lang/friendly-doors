import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ImagePlus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DemoReseller, getResellerDemoState, setResellerStatus, upsertReseller } from "@/lib/resellerDemo";

const blankForm = { name: "", code: "", domain: "", remark: "", logoDataUrl: "", status: "enabled" as const };

export default function AdminResellers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState("");
  const state = (() => { void revision; return getResellerDemoState(); })();
  const filteredResellers = state.resellers.filter((item) => {
    const keyword = search.trim().toLowerCase();
    const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword) || item.domain.toLowerCase().includes(keyword) || item.remark.toLowerCase().includes(keyword);
    return matchesKeyword;
  });

  const refresh = () => setRevision((value) => value + 1);
  const openCreate = () => { setEditingId(undefined); setForm(blankForm); setDialogOpen(true); };
  const openEdit = (item: DemoReseller) => {
    setEditingId(item.id);
    setForm({ name: item.name, code: item.code, domain: item.domain, remark: item.remark, logoDataUrl: item.logoDataUrl || "", status: item.status });
    setDialogOpen(true);
  };
  const save = () => {
    if (!form.name.trim() || !form.domain.trim()) {
      toast({ title: "请填写名称和域名", variant: "destructive" });
      return;
    }
    try {
      upsertReseller({ ...form, id: editingId, name: form.name.trim(), code: editingId ? form.code : `AGENT-${Date.now().toString(36).toUpperCase()}`, domain: form.domain.trim(), remark: form.remark.trim() });
      setDialogOpen(false); refresh();
      toast({ title: editingId ? "代理商已更新" : "代理商已创建" });
    } catch (error: unknown) {
      toast({ title: "保存失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div><h1 className="text-xl font-semibold">代理商管理</h1><p className="text-sm text-muted-foreground mt-1">维护代理商资料、专属域名和客户归属</p></div>
        <div className="flex gap-2">
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />新增代理商</Button>
        </div>
      </div>
      <div className="flex items-center gap-3 border rounded-lg bg-muted/20 p-3">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9 bg-background" placeholder="搜索代理商名称、域名或备注" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <span className="text-sm text-muted-foreground ml-auto">共 {filteredResellers.length} 家代理商</span>
      </div>
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="grid grid-cols-[50px_1.7fr_1.35fr_60px_60px_160px_75px_210px] gap-3 px-4 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground"><span>ID</span><span>代理商</span><span>专属域名</span><span>用户数</span><span>企业数</span><span>创建时间</span><span>状态</span><span className="text-right">操作</span></div>
        {filteredResellers.map((item, index) => {
          const userCount = state.users.filter((user) => user.resellerId === item.id).length;
          const enterpriseCount = state.enterprises.filter((enterprise) => enterprise.resellerId === item.id).length;
          return (
            <div key={item.id} className="grid grid-cols-[50px_1.7fr_1.35fr_60px_60px_160px_75px_210px] gap-3 px-4 py-3 border-b last:border-0 items-center text-sm hover:bg-muted/20">
              <span className="text-muted-foreground tabular-nums">{index + 1}</span>
              <div className="flex items-center gap-2 min-w-0"><span className="font-medium truncate">{item.name}</span>{item.remark && <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded whitespace-nowrap"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{item.remark}</span>}</div>
              <span className="text-muted-foreground truncate">{item.domain}</span>
              <span className="tabular-nums">{userCount}</span><span className="tabular-nums">{enterpriseCount}</span><span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
              <Badge variant={item.status === "enabled" ? "outline" : "secondary"} className="w-fit">{item.status === "enabled" ? "已启用" : "已停用"}</Badge>
              <div className="flex justify-end gap-1"><Button size="sm" onClick={() => navigate(`/admin/console/resellers/${item.id}`)}>管理</Button><Button variant="outline" size="sm" onClick={() => openEdit(item)}>编辑</Button><Button variant="ghost" size="sm" onClick={() => { setResellerStatus(item.id, item.status === "enabled" ? "disabled" : "enabled"); refresh(); }}>{item.status === "enabled" ? "停用" : "启用"}</Button></div>
            </div>
          );
        })}
        {filteredResellers.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">没有找到符合条件的代理商</div>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingId ? "编辑代理商" : "新增代理商"}</DialogTitle></DialogHeader>
        <div className="space-y-4"><div><Label>代理商名称 *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><Label>专属域名 *</Label><Input placeholder="agent.example.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div><div className="space-y-1.5"><Label>品牌 Logo（选填）</Label><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-lg border bg-blue-50 text-blue-600 flex items-center justify-center overflow-hidden shrink-0">{form.logoDataUrl ? <img src={form.logoDataUrl} alt="Logo 预览" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}</div><label className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm cursor-pointer hover:bg-accent"><ImagePlus className="w-4 h-4 mr-2" />上传图片<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { toast({ title: "图片不能超过 2MB", variant: "destructive" }); return; } const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, logoDataUrl: String(reader.result || "") })); reader.readAsDataURL(file); event.target.value = ""; }} /></label>{form.logoDataUrl && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm((current) => ({ ...current, logoDataUrl: "" }))}><Trash2 className="w-4 h-4 mr-1" />移除</Button>}</div><p className="text-xs text-muted-foreground">支持 PNG、JPG、WebP、SVG，最大 2MB；未上传时使用默认图标。</p></div><div><Label>备注</Label><Input placeholder="例如：重点合作伙伴、华东区域" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={save}>保存</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
