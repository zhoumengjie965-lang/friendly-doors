import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Eye, EyeOff, GripVertical, ImagePlus, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DemoReseller, addDemoUser, fundReseller, getResellerDemoState, setResellerCredit, setResellerStatus, upsertReseller } from "@/lib/resellerDemo";
import { generateRandomPassword } from "@/lib/credentialUtils";
import { SubjectChannelConfig, createDefaultSubjectChannels, type SubjectChannelConfigValue } from "@/components/admin/SubjectChannelConfig";

const GROUP_TEMPLATES = {
  default: { label: "default（默认分组）", groups: ["claude-fast", "deepseek", "gemini-fast", "glm", "grok-fast", "openai-fast", "qwen", "minimax"] },
  "vip-cd": { label: "vip-cd（VIP 优选）", groups: ["claude-fast", "gemini-fast", "openai-fast", "qwen"] },
  "vip-md": { label: "vip-md（VIP 中度折扣）", groups: ["claude-fast", "deepseek", "glm", "openai-fast"] },
} as const;
const GROUP_LABELS: Record<string, string> = { "claude-fast": "Claude 高速通道", deepseek: "DeepSeek 通道", "gemini-fast": "Gemini 高速通道", glm: "GLM 通道", "grok-fast": "Grok 高速通道", "openai-fast": "OpenAI 高速通道", qwen: "通义千问通道", minimax: "MiniMax 通道" };
const GROUP_CHANNELS: Record<string, string[]> = {
  "claude-fast": ["Anthropic Official", "AWS Bedrock", "Google Vertex"],
  deepseek: ["DeepSeek 官方", "火山引擎", "DeepSeek 高速线路"],
  "gemini-fast": ["Google AI Studio", "Google Vertex"],
  glm: ["智谱官方", "GLM 高速线路"],
  "grok-fast": ["xAI Official", "Grok 高速线路"],
  "openai-fast": ["OpenAI Official", "Azure OpenAI"],
  qwen: ["阿里云百炼", "通义千问高速线路"],
  minimax: ["MiniMax 官方", "MiniMax 高速线路"],
};
const GROUPS = [...new Set(Object.values(GROUP_TEMPLATES).flatMap((template) => [...template.groups]))];
const defaultRateFor = (group: string) => group.startsWith("claude") ? 0.6 : group.startsWith("openai") ? 0.65 : group.startsWith("gemini") ? 0.68 : 0.75;
const DEFAULT_SETTLEMENT_RATES = Object.fromEntries(GROUPS.map((group) => [group, defaultRateFor(group)]));
type GroupChannelStrategy = { mode: "global" | "custom"; selectedChannels: string[] };
const DEFAULT_CHANNEL_STRATEGIES = Object.fromEntries(GROUPS.map((group) => [group, { mode: "global" as const, selectedChannels: [...(GROUP_CHANNELS[group] || [])] }]));
const blankForm = { name: "", code: "", domain: "", remark: "", logoDataUrl: "", modelAccess: ["国际"], status: "enabled" as DemoReseller["status"], groupMode: "template" as "template" | "custom" | "all", groupTemplate: "default", enabledGroups: [...GROUP_TEMPLATES.default.groups], settlementRates: { ...DEFAULT_SETTLEMENT_RATES }, groupChannelStrategies: { ...DEFAULT_CHANNEL_STRATEGIES }, channelConfigs: {} };

const MODEL_ACCESS_OPTIONS = ["国内", "国际"];

function ModelAccessSelect({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (access: string) => onChange(value.includes(access) ? value.filter((item) => item !== access) : [...value, access]);

  return <div className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className="w-full min-h-10 px-3 py-2 border rounded-md bg-background flex items-center justify-between gap-2 hover:border-gray-400 transition-colors">
      <div className="flex flex-wrap gap-1.5 flex-1">
        {value.length === 0 ? <span className="text-sm text-muted-foreground">请选择模型访问权限</span> : value.map((access) => <Badge key={access} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 text-xs flex items-center gap-1">{access}<X className="w-3 h-3" onClick={(event) => { event.stopPropagation(); toggle(access); }} /></Badge>)}
      </div>
      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <><div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /><div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg py-1">{MODEL_ACCESS_OPTIONS.map((access) => <div key={access} className={`px-3 py-2 cursor-pointer hover:bg-muted flex items-center justify-between ${value.includes(access) ? "bg-blue-50/50" : ""}`} onClick={() => toggle(access)}><span className="text-sm">{access}</span>{value.includes(access) && <span className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs">✓</span>}</div>)}</div></>}
  </div>;
}

export default function AdminResellers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupConfigOpen, setGroupConfigOpen] = useState(false);
  const [copyGroupTemplate, setCopyGroupTemplate] = useState("__none__");
  const [customGroupDraft, setCustomGroupDraft] = useState({ enabledGroups: [] as string[], settlementRates: {} as Record<string, number>, groupChannelStrategies: {} as Record<string, GroupChannelStrategy> });
  const [editingId, setEditingId] = useState<string>();
  const [domainBeingReplaced, setDomainBeingReplaced] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [quickAccount, setQuickAccount] = useState({ enabled: false, username: "", password: "" });
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [resellerChannelStore, setResellerChannelStore] = useState<Record<string, SubjectChannelConfigValue>>({});
  const [search, setSearch] = useState("");
  const [fundingTarget, setFundingTarget] = useState<DemoReseller>();
  const [fundingType, setFundingType] = useState<"balance" | "credit">("balance");
  const [fundingAmount, setFundingAmount] = useState("");
  const state = (() => { void revision; return getResellerDemoState(); })();
  const editingReseller = editingId ? state.resellers.find((item) => item.id === editingId) : undefined;
  const filteredResellers = state.resellers.filter((item) => {
    const keyword = search.trim().toLowerCase();
    const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword) || item.domain.toLowerCase().includes(keyword) || item.remark.toLowerCase().includes(keyword);
    return matchesKeyword;
  });
  const configuredGroups = form.groupMode === "all"
    ? GROUPS
    : form.groupMode === "template"
      ? [...GROUP_TEMPLATES[form.groupTemplate as keyof typeof GROUP_TEMPLATES].groups]
      : form.enabledGroups;

  const refresh = () => setRevision((value) => value + 1);
  const openCustomGroupConfig = () => {
    setCustomGroupDraft({ enabledGroups: [...form.enabledGroups], settlementRates: { ...form.settlementRates }, groupChannelStrategies: { ...form.groupChannelStrategies } });
    setCopyGroupTemplate("__none__");
    setGroupConfigOpen(true);
  };
  const openCreate = () => { setEditingId(undefined); setDomainBeingReplaced(false); setForm({ ...blankForm, channelConfigs: {} }); setQuickAccount({ enabled: false, username: "", password: "" }); setShowQuickPassword(false); setDialogOpen(true); };
  const openEdit = (item: DemoReseller) => {
    setEditingId(item.id);
    setDomainBeingReplaced(false);
    setQuickAccount({ enabled: false, username: "", password: "" });
    setShowQuickPassword(false);
    const legacyRates = item.settlementRates || {};
    const settlementRates = Object.fromEntries(GROUPS.map((group) => [group, legacyRates[group] ?? legacyRates[group.startsWith("claude") ? "Claude" : group.startsWith("openai") ? "OpenAI" : group.startsWith("gemini") ? "Gemini" : "国内模型"] ?? defaultRateFor(group)]));
    const groupTemplate = item.groupTemplate && item.groupTemplate in GROUP_TEMPLATES ? item.groupTemplate : "default";
    setForm({ name: item.name, code: item.code, domain: item.domain, remark: item.remark, logoDataUrl: item.logoDataUrl || "", modelAccess: item.modelAccess || ["国际"], status: item.status, groupMode: item.groupMode || "template", groupTemplate, enabledGroups: item.enabledGroups?.filter((group) => GROUPS.includes(group)) || [...GROUP_TEMPLATES.default.groups], settlementRates, groupChannelStrategies: { ...DEFAULT_CHANNEL_STRATEGIES, ...(item.groupChannelStrategies || {}) }, channelConfigs: resellerChannelStore[item.id] || {} });
    setDialogOpen(true);
  };
  const save = () => {
    if (!form.name.trim() || !form.domain.trim()) {
      toast({ title: "请填写名称和域名", variant: "destructive" });
      return;
    }
    if (quickAccount.enabled && (!quickAccount.username.trim() || !quickAccount.password.trim())) { toast({ title: "请填写代理商账号用户名和密码", variant: "destructive" }); return; }
    if (form.modelAccess.length === 0) {
      toast({ title: "请至少选择一项模型访问权限", variant: "destructive" });
      return;
    }
    if (configuredGroups.length === 0) {
      toast({ title: "请至少配置一个令牌分组", variant: "destructive" });
      return;
    }
    if (configuredGroups.some((group) => !Number.isFinite(form.settlementRates[group]) || form.settlementRates[group] <= 0 || form.settlementRates[group] > 1)) {
      toast({ title: "代理商结算折扣必须大于 0% 且不超过 100%", variant: "destructive" });
      return;
    }
    try {
      if (editingId) setResellerChannelStore((current) => { const next = { ...current }; if (Object.keys(form.channelConfigs).length) next[editingId] = form.channelConfigs; else delete next[editingId]; return next; });
      upsertReseller({ ...form, id: editingId, name: form.name.trim(), code: editingId ? form.code : `AGENT-${Date.now().toString(36).toUpperCase()}`, domain: editingReseller && !domainBeingReplaced ? editingReseller.domain : form.domain.trim(), remark: form.remark.trim() });
      if (quickAccount.enabled) { const created = getResellerDemoState().resellers.find((item) => item.domain === form.domain.trim()); const linked = created && getResellerDemoState().users.find((item) => item.resellerId === created.id); if (created && !linked) addDemoUser({ phone: quickAccount.username.trim(), name: form.name.trim() + "管理员", resellerId: created.id, modelAccess: form.modelAccess, group: form.groupTemplate }); }
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
      <div className="border rounded-xl bg-card overflow-x-auto">
        <div className="min-w-[1460px]">
        <div className="grid grid-cols-[80px_1.2fr_1.1fr_130px_130px_120px_60px_145px_70px_250px] gap-3 px-4 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground"><span>ID</span><span>代理商名称</span><span>专属域名</span><span>充值余额 / 累计充值</span><span>授信余额 / 累计授信</span><span>历史消费金额</span><span>企业</span><span>创建时间</span><span>状态</span><span className="text-right">操作</span></div>
        {filteredResellers.map((item) => {
          const enterpriseCount = state.enterprises.filter((enterprise) => enterprise.resellerId === item.id).length;
          const bills = state.bills.filter((bill) => bill.resellerId === item.id && bill.customerType === "enterprise");
          const resellerConsumed = bills.reduce((sum, bill) => sum + bill.actualConsumed, 0);
          return (
            <div key={item.id} className="grid grid-cols-[80px_1.2fr_1.1fr_130px_130px_120px_60px_145px_70px_250px] gap-3 px-4 py-3 border-b last:border-0 items-center text-sm hover:bg-muted/20">
              <span className="text-muted-foreground font-mono text-xs">{item.id}</span>
              <div className="flex items-center gap-2 min-w-0"><span className="font-medium truncate">{item.name}</span>{item.remark && <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded whitespace-nowrap"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />{item.remark}</span>}</div>
              <span className="text-muted-foreground truncate">{item.domain}</span><span className="font-medium tabular-nums">¥{(item.balance || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}<span className="text-muted-foreground font-normal"> / ¥{(item.totalFunded || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span></span><span className="tabular-nums">¥{(item.creditBalance || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}<span className="text-muted-foreground"> / ¥{(item.creditLimit || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span></span><span className="tabular-nums">¥{resellerConsumed.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
              <span className="tabular-nums">{enterpriseCount}</span><span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
              <Badge variant={item.status === "enabled" ? "outline" : "secondary"} className="w-fit">{item.status === "enabled" ? "已启用" : "已停用"}</Badge>
              <div className="flex justify-end gap-1"><Button size="sm" onClick={() => navigate(`/admin/console/resellers/${item.id}`)}>管理</Button><Button variant="outline" size="sm" onClick={() => { setFundingTarget(item); setFundingType("balance"); setFundingAmount(""); }}>充值</Button><Button variant="outline" size="sm" onClick={() => openEdit(item)}>编辑</Button><Button variant="ghost" size="sm" onClick={() => { setResellerStatus(item.id, item.status === "enabled" ? "disabled" : "enabled"); refresh(); }}>{item.status === "enabled" ? "停用" : "启用"}</Button></div>
            </div>
          );
        })}
        {filteredResellers.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">没有找到符合条件的代理商</div>}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? "编辑代理商" : "新增代理商"}</DialogTitle></DialogHeader>
        <div className="space-y-4"><div><Label>代理商名称 *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="space-y-1.5"><Label>专属域名 *</Label><div className="flex gap-2"><Input required disabled={Boolean(editingId) && !domainBeingReplaced} aria-readonly={Boolean(editingId) && !domainBeingReplaced} placeholder="agent.example.com" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />{editingId && !domainBeingReplaced && <Button type="button" variant="outline" className="shrink-0 text-destructive hover:text-destructive" onClick={() => { setDomainBeingReplaced(true); setForm((current) => ({ ...current, domain: "" })); }}>删除</Button>}</div>{editingId && <p className={`text-xs ${domainBeingReplaced ? "text-blue-600" : "text-muted-foreground"}`}>{domainBeingReplaced ? "原域名已删除，请添加新的专属域名后保存。" : "专属域名创建后不可修改；如需变更，请先删除域名后重新添加。"}</p>}</div><div className="space-y-1.5"><Label>品牌 Logo（选填）</Label><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-lg border bg-blue-50 text-blue-600 flex items-center justify-center overflow-hidden shrink-0">{form.logoDataUrl ? <img src={form.logoDataUrl} alt="Logo 预览" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}</div><label className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm cursor-pointer hover:bg-accent"><ImagePlus className="w-4 h-4 mr-2" />上传图片<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { toast({ title: "图片不能超过 2MB", variant: "destructive" }); return; } const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, logoDataUrl: String(reader.result || "") })); reader.readAsDataURL(file); event.target.value = ""; }} /></label>{form.logoDataUrl && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm((current) => ({ ...current, logoDataUrl: "" }))}><Trash2 className="w-4 h-4 mr-1" />移除</Button>}</div><p className="text-xs text-muted-foreground">支持 PNG、JPG、WebP、SVG，最大 2MB；未上传时使用默认图标。</p></div><div><Label>备注</Label><Input placeholder="例如：重点合作伙伴、华东区域" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></div></div>
        {<div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">代理商账号</p><p className="text-xs text-muted-foreground">创建后自动归属当前代理商</p></div><Button type="button" variant={quickAccount.enabled ? "outline" : "default"} size="sm" onClick={() => setQuickAccount((current) => ({ ...current, enabled: !current.enabled }))}>{quickAccount.enabled ? "取消快捷创建" : "快捷创建代理商账号"}</Button></div>{quickAccount.enabled && <div className="space-y-3"><div className="space-y-1.5"><Label>用户名 *</Label><Input value={quickAccount.username} onChange={(e) => setQuickAccount((current) => ({ ...current, username: e.target.value }))} placeholder="请输入代理商登录用户名" /></div><div className="space-y-1.5"><Label>初始密码 *</Label><div className="flex gap-2"><div className="relative flex-1"><Input type={showQuickPassword ? "text" : "password"} value={quickAccount.password} onChange={(e) => setQuickAccount((current) => ({ ...current, password: e.target.value }))} placeholder="请输入或随机生成密码" className="pr-10" /><button type="button" onClick={() => setShowQuickPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showQuickPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><Button type="button" variant="outline" onClick={() => { setQuickAccount((current) => ({ ...current, password: generateRandomPassword() })); setShowQuickPassword(true); }}><RefreshCw className="mr-1.5 h-4 w-4" />随机生成</Button></div><p className="text-xs text-muted-foreground">随机密码为 14 位，包含大小写字母、数字和符号。</p></div></div>}</div>}
        <div className="space-y-1.5">
          <Label>模型访问权限 *</Label>
          <ModelAccessSelect value={form.modelAccess} onChange={(modelAccess) => setForm((current) => ({ ...current, modelAccess }))} />
          <p className="text-xs text-muted-foreground">代理商只能向企业开放平台已授权的模型范围。</p>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <Label>分组 <span className="text-red-500">*</span></Label>
          <div className="flex flex-wrap gap-6">{([['template','分组模板'],['custom','自定义分组'],['all','全部分组']] as const).map(([value,label]) => <div key={value} className="flex items-center gap-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="resellerGroupMode" checked={form.groupMode === value} onChange={() => setForm((current) => ({ ...current, groupMode: value, enabledGroups: value === "all" ? [...GROUPS] : value === "template" ? [...GROUP_TEMPLATES[current.groupTemplate as keyof typeof GROUP_TEMPLATES].groups] : current.enabledGroups }))} className="h-4 w-4 accent-blue-600" />{label}</label>{value === "custom" && form.groupMode === "custom" && <button type="button" className="text-xs text-blue-600 hover:underline" onClick={openCustomGroupConfig}>去配置</button>}</div>)}</div>
          {form.groupMode === "template" && <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.groupTemplate} onChange={(event) => { const value = event.target.value as keyof typeof GROUP_TEMPLATES; setForm((current) => ({ ...current, groupTemplate: value, enabledGroups: [...GROUP_TEMPLATES[value].groups] })); }}>{Object.entries(GROUP_TEMPLATES).map(([value, template]) => <option key={value} value={value}>{template.label}</option>)}</select>}
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">{form.groupMode === "custom" ? `已自定义配置 ${configuredGroups.length} 个令牌分组：` : form.groupMode === "all" ? `已选择全部令牌分组（${configuredGroups.length}）：` : `对应令牌分组（${configuredGroups.length}）：`}</p>
            {configuredGroups.length ? <div className="mt-2 flex flex-wrap gap-1.5">{configuredGroups.map((group) => <Badge key={group} variant="secondary" className="font-normal">{group}{form.groupMode === "custom" ? `（${Math.round((form.settlementRates[group] || defaultRateFor(group)) * 100)}%）` : ""}</Badge>)}</div> : <p className="mt-2 text-xs text-muted-foreground">暂未配置，请点击“去配置”</p>}
          </div>
        </div>
        <SubjectChannelConfig subjectLabel="代理商" activeGroups={configuredGroups} value={form.channelConfigs} onChange={(channelConfigs) => setForm((current) => ({ ...current, channelConfigs }))} />
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button><Button onClick={save}>保存</Button></DialogFooter>
      </DialogContent></Dialog>
      <Dialog open={groupConfigOpen} onOpenChange={setGroupConfigOpen}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>配置自定义分组</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">配置代理商可用的基础令牌分组及对应结算折扣。</p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
            <Label className="shrink-0">从模板复制</Label>
            <select value={copyGroupTemplate} onChange={(event) => setCopyGroupTemplate(event.target.value)} className="h-9 w-52 rounded-md border bg-background px-3 text-sm">
              <option value="__none__">不使用模板</option>
              {Object.entries(GROUP_TEMPLATES).map(([value, template]) => <option key={value} value={value}>{template.label}</option>)}
            </select>
            <Button type="button" size="sm" disabled={copyGroupTemplate === "__none__"} onClick={() => { const template = GROUP_TEMPLATES[copyGroupTemplate as keyof typeof GROUP_TEMPLATES]; if (!template) return; setCustomGroupDraft((current) => ({ ...current, enabledGroups: [...template.groups], settlementRates: { ...current.settlementRates, ...Object.fromEntries(template.groups.map((group) => [group, defaultRateFor(group)])) }, groupChannelStrategies: { ...current.groupChannelStrategies, ...Object.fromEntries(template.groups.map((group) => [group, DEFAULT_CHANNEL_STRATEGIES[group]])) } })); }}>导入模板</Button>
          </div>
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[32px_150px_90px_120px_90px_1fr] gap-3 border-b bg-muted/30 px-3 py-3 text-xs text-muted-foreground"><span /><span>基础令牌分组</span><span className="text-center">是否可用</span><span>当前折扣</span><span className="text-center">模板配置</span><span>描述/模型系列</span></div>
            <div className="max-h-[500px] overflow-y-auto">{GROUPS.map((group) => { const enabled = customGroupDraft.enabledGroups.includes(group); const template = copyGroupTemplate === "__none__" ? undefined : GROUP_TEMPLATES[copyGroupTemplate as keyof typeof GROUP_TEMPLATES]; const inTemplate = Boolean(template?.groups.includes(group as never)); return <div key={group} className="border-b last:border-0"><div className={`grid grid-cols-[32px_150px_90px_120px_150px_90px_1fr] items-center gap-3 px-3 py-3 ${enabled ? "" : "bg-muted/10 text-muted-foreground opacity-55"}`}><GripVertical className="h-4 w-4 text-muted-foreground/50" /><span className="font-medium">{group}</span><label className="flex justify-center"><input type="checkbox" checked={enabled} onChange={() => setCustomGroupDraft((current) => ({ ...current, enabledGroups: enabled ? current.enabledGroups.filter((item) => item !== group) : [...current.enabledGroups, group] }))} className="h-4 w-4 accent-blue-600" /></label><div className="relative"><Input type="number" min="1" max="100" disabled={!enabled} value={Math.round((customGroupDraft.settlementRates[group] || defaultRateFor(group)) * 100)} onChange={(event) => setCustomGroupDraft((current) => ({ ...current, settlementRates: { ...current.settlementRates, [group]: Number(event.target.value) / 100 } }))} className="h-8 pr-7 text-right" /><span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground">%</span></div><span className="text-center text-xs text-muted-foreground">{copyGroupTemplate === "__none__" ? "—" : inTemplate ? `×${defaultRateFor(group)}` : "未启用"}</span><span className="text-xs text-muted-foreground">{GROUP_LABELS[group]}</span></div></div>; })}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGroupConfigOpen(false)}>取消</Button><Button onClick={() => { if (!customGroupDraft.enabledGroups.length) { toast({ title: "请至少配置一个令牌分组", variant: "destructive" }); return; } if (customGroupDraft.enabledGroups.some((group) => !Number.isFinite(customGroupDraft.settlementRates[group]) || customGroupDraft.settlementRates[group] <= 0 || customGroupDraft.settlementRates[group] > 1)) { toast({ title: "代理商结算折扣必须大于 0% 且不超过 100%", variant: "destructive" }); return; } setForm((current) => ({ ...current, enabledGroups: [...customGroupDraft.enabledGroups], settlementRates: { ...customGroupDraft.settlementRates }, groupChannelStrategies: { ...customGroupDraft.groupChannelStrategies } })); setGroupConfigOpen(false); }}>保存配置</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!fundingTarget} onOpenChange={(open) => !open && setFundingTarget(undefined)}>
        <DialogContent>
          <DialogHeader><DialogTitle>代理商账户充值</DialogTitle></DialogHeader>
          {fundingTarget && (() => {
            const currentBalance = fundingType === "balance" ? (fundingTarget.balance || 0) : (fundingTarget.creditBalance || 0);
            const amount = Number(fundingAmount || 0);
            const newBalance = fundingType === "balance" ? currentBalance + amount : amount;
            return <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1"><p>代理商：<span className="font-medium">{fundingTarget.name}</span></p><p className="text-muted-foreground">当前{fundingType === "balance" ? "账户余额" : "剩余授信额度"}：<span className="text-foreground font-medium tabular-nums">¥{currentBalance.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span></p></div>
              <div className="space-y-2"><Label>操作类型</Label><div className="grid grid-cols-2 gap-3"><label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"><input type="radio" name="resellerFundingType" checked={fundingType === "balance"} onChange={() => { setFundingType("balance"); setFundingAmount(""); }} /><div><p className="text-sm font-medium">充值余额</p><p className="text-xs text-muted-foreground">增加或扣减账户现金余额</p></div></label><label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"><input type="radio" name="resellerFundingType" checked={fundingType === "credit"} onChange={() => { setFundingType("credit"); setFundingAmount(""); }} /><div><p className="text-sm font-medium">授信额度</p><p className="text-xs text-muted-foreground">设置代理商剩余授信额度</p></div></label></div></div>
              <div className="space-y-2"><Label>{fundingType === "balance" ? "充值金额" : "设置剩余授信额度"} *</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span><Input className="pl-7" type="number" min={fundingType === "credit" ? 0 : undefined} step="0.01" placeholder={fundingType === "balance" ? "请输入充值金额，负数表示扣减" : "请输入目标剩余授信额度"} value={fundingAmount} onChange={(e) => setFundingAmount(e.target.value)} /></div></div>
              <p className="text-sm text-muted-foreground tabular-nums">{fundingType === "balance" ? <>充值后余额：<span className="text-foreground">¥{currentBalance.toFixed(2)}</span><span className="mx-1">{amount >= 0 ? "+" : "-"}</span><span className="text-foreground">¥{Math.abs(amount).toFixed(2)}</span><span className="mx-1">=</span></> : <>剩余授信额度：<span className="text-foreground">¥{currentBalance.toFixed(2)}</span><span className="mx-1">→</span></>}<span className={`font-semibold ${newBalance < 0 ? "text-red-600" : "text-foreground"}`}>¥{newBalance.toFixed(2)}</span></p>
              <div className="rounded-md bg-muted/50 border px-3 py-2 space-y-1"><p className="text-xs text-muted-foreground">备注预览</p><p className="text-xs">{fundingType === "balance" ? `${amount >= 0 ? "充值金额" : "扣减金额"} ¥${Math.abs(amount).toFixed(2)}，余额由 ¥${currentBalance.toFixed(2)} 调整至 ¥${newBalance.toFixed(2)}` : `剩余授信额度由 ¥${currentBalance.toFixed(2)} 调整至 ¥${newBalance.toFixed(2)}`}</p></div>
            </div>;
          })()}
          <DialogFooter><Button variant="outline" onClick={() => setFundingTarget(undefined)}>取消</Button><Button disabled={!fundingTarget || fundingAmount === "" || !Number.isFinite(Number(fundingAmount)) || (fundingType === "balance" && (Number(fundingAmount) === 0 || (fundingTarget.balance || 0) + Number(fundingAmount) < 0)) || (fundingType === "credit" && Number(fundingAmount) < 0)} onClick={() => { if (!fundingTarget) return; try { const amount = Number(fundingAmount); const currentBalance = fundingType === "balance" ? (fundingTarget.balance || 0) : (fundingTarget.creditBalance || 0); const nextBalance = fundingType === "balance" ? currentBalance + amount : amount; const autoRemark = fundingType === "balance" ? `${amount >= 0 ? "充值金额" : "扣减金额"} ¥${Math.abs(amount).toFixed(2)}，余额由 ¥${currentBalance.toFixed(2)} 调整至 ¥${nextBalance.toFixed(2)}` : `剩余授信额度由 ¥${currentBalance.toFixed(2)} 调整至 ¥${nextBalance.toFixed(2)}`; if (fundingType === "balance") fundReseller(fundingTarget.id, amount, autoRemark); else setResellerCredit(fundingTarget.id, amount, autoRemark); setFundingTarget(undefined); refresh(); toast({ title: fundingType === "balance" ? (amount > 0 ? "代理商充值成功" : "代理商余额扣减成功") : "代理商授信额度已更新" }); } catch (error) { toast({ title: fundingType === "balance" ? "充值失败" : "授信调整失败", description: error instanceof Error ? error.message : "未知错误", variant: "destructive" }); } }}>{fundingType === "balance" ? "确认充值" : "确认授信"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
