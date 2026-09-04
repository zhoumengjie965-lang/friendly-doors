import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export type SubjectChannelConfigValue = Record<string, { group: string; channels: Record<string, { enabled: boolean; priority: number; weight: number }> }>;

const CHANNELS = [
  { id: 58, name: "Anthropic Official", models: ["claude-3-5-sonnet", "claude-3-opus"], groups: ["claude-basic", "claude-fast"], type: "Anthropic Claude", status: "enabled", priority: 110, weight: 20 },
  { id: 40, name: "oracle-xai", models: ["claude-3-5-sonnet", "gemini-1.5-pro", "gpt-4o"], groups: ["basic", "claude-fast", "gemini-fast", "gpt4-fast", "openai-fast", "vip-dp"], type: "Anthropic Claude", status: "testing", priority: 0, weight: 0 },
  { id: 45, name: "polo-nano", models: ["gemini-1.5-flash", "gemini-1.5-pro"], groups: ["default", "basic", "gemini-slow"], type: "Google Gemini", status: "enabled", priority: 0, weight: 0 },
  { id: 53, name: "aliyun-glm", models: ["glm-4-plus", "glm-4-air"], groups: ["default"], type: "智谱 GLM-4V", status: "enabled", priority: 0, weight: 0 },
  { id: 54, name: "aliyun-deepseek", models: ["deepseek-chat", "deepseek-reasoner"], groups: ["default"], type: "DeepSeek", status: "enabled", priority: 0, weight: 0 },
  { id: 52, name: "aliyun-qwen", models: ["qwen-max", "qwen-plus"], groups: ["default"], type: "阿里通义千问", status: "enabled", priority: 0, weight: 0 },
  { id: 31, name: "测试Suno", models: ["suno-v3.5"], groups: ["default", "suno"], type: "Suno", status: "enabled", priority: 0, weight: 0 },
  { id: 28, name: "kingai", models: ["gpt-4o", "gpt-4o-mini"], groups: ["default"], type: "OpenAI", status: "enabled", priority: 0, weight: 0 },
  { id: 32, name: "mock-error", models: ["gpt-4o", "claude-3-5-sonnet"], groups: ["default", "claude-basic", "claude-fast", "openai-basic", "openai-fast"], type: "OpenAI", status: "disabled", priority: 0, weight: 0 },
  { id: 33, name: "polo-gpt4", models: ["gpt-4-turbo", "gpt-4o"], groups: ["default"], type: "OpenAI", status: "disabled", priority: 0, weight: 0 },
  { id: 27, name: "siliconflow", models: ["deepseek-v3", "qwen2.5-72b"], groups: ["default"], type: "SiliconCloud", status: "enabled", priority: 0, weight: 0 },
] as const;


export const createDefaultSubjectChannels = (): SubjectChannelConfigValue => ({});

export function SubjectChannelConfig({ value, onChange, subjectLabel, activeGroups }: { value: SubjectChannelConfigValue; onChange: (value: SubjectChannelConfigValue) => void; subjectLabel: string; activeGroups?: string[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<SubjectChannelConfigValue>(value);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [policyGroup, setPolicyGroup] = useState("");
  const [policyChannels, setPolicyChannels] = useState<Record<string, { enabled: boolean; priority: number; weight: number }>>({});
  const allChannelGroups = [...new Set(CHANNELS.flatMap((channel) => [...channel.groups]))].sort();
  const groups = (activeGroups || allChannelGroups).filter((group) => allChannelGroups.includes(group)).sort();
  const customEnabled = Object.keys(value).length > 0;
  const isActive = (group: string) => !activeGroups || activeGroups.includes(group);
  const allPolicies = Object.entries(draft).filter(([key, policy]) => key !== "__enabled" && Boolean(policy.group));
  const policies = allPolicies;
  const channelsForGroup = CHANNELS.filter((channel) => (channel.groups as readonly string[]).includes(policyGroup));
  const setGroup = (group: string) => {
    setPolicyGroup(group);
    setPolicyChannels(Object.fromEntries(CHANNELS.filter((channel) => (channel.groups as readonly string[]).includes(group)).map((channel) => [channel.name, { enabled: channel.status !== "disabled", priority: channel.priority, weight: channel.weight }])));
  };
  const editPolicy = (key?: string) => {
    if (key) { const policy = draft[key]; setEditingKey(key); setPolicyGroup(policy.group); setPolicyChannels(structuredClone(policy.channels)); }
    else { setEditingKey(null); setPolicyGroup(""); setPolicyChannels({}); }
    setEditorOpen(true);
  };
  const savePolicy = () => {
    if (!policyGroup) return toast({ title: "请选择分组", variant: "destructive" });
    if (!Object.values(policyChannels).some((channel) => channel.enabled)) return toast({ title: "请至少保留一个渠道", variant: "destructive" });
    if (Object.values(policyChannels).some((channel) => channel.priority < 0 || channel.weight < 0)) return toast({ title: "优先级和权重不能小于 0", variant: "destructive" });
    const key = editingKey || policyGroup;
    setDraft((current) => { const next = { ...current }; if (editingKey && editingKey !== key) delete next[editingKey]; next[key] = { group: policyGroup, channels: policyChannels }; return next; });
    setEditorOpen(false);
  };
  return <div className="space-y-2">
    <div className="flex items-center gap-2"><Label>渠道配置</Label><button type="button" onClick={() => { setDraft(structuredClone(value)); setOpen(true); }} className="text-xs font-medium text-blue-600 hover:underline">去配置</button></div>
    <div className="rounded-md border bg-background p-2 text-xs text-muted-foreground">{Object.keys(value).filter((key) => key !== "__enabled").length ? `已配置 ${Object.keys(value).filter((key) => key !== "__enabled").length} 条分组渠道策略` : "暂无特殊策略，跟随平台全局渠道配置"}</div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>渠道配置</DialogTitle></DialogHeader>
      <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">仅为有特殊路由要求的分组新增策略；未配置策略的分组继续跟随全局。</p><Button type="button" onClick={() => editPolicy()}>新增策略</Button></div>
      {!policies.length ? <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">暂无特殊渠道策略</div> : <div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-[minmax(130px,0.7fr)_minmax(260px,1.3fr)_110px] bg-muted/50 px-4 py-2 text-xs text-muted-foreground"><span>分组</span><span>启用渠道</span><span>操作</span></div>{policies.map(([key, policy]) => { const active = isActive(policy.group); return <div key={key} className={`grid grid-cols-[minmax(130px,0.7fr)_minmax(260px,1.3fr)_110px] items-center border-t px-4 py-3 text-sm ${active ? "" : "bg-muted/40 text-muted-foreground"}`}><div><span className="font-medium">{policy.group}</span>{!active && <Badge variant="secondary" className="ml-2">分组已取消</Badge>}</div><div className="flex min-w-0 flex-wrap gap-1.5">{Object.entries(policy.channels).filter(([, channel]) => channel.enabled).map(([name]) => <Badge key={name} variant="secondary" className="font-normal">{name}</Badge>)}{!Object.values(policy.channels).some((channel) => channel.enabled) && <span className="text-xs text-muted-foreground">无</span>}</div><div className="flex gap-2"><button type="button" disabled={!active} className={active ? "text-blue-600 hover:underline" : "cursor-not-allowed text-muted-foreground opacity-50"} onClick={() => active && editPolicy(key)}>修改</button><button type="button" className="text-red-600 hover:underline" onClick={() => setDraft((current) => { const next = { ...current }; delete next[key]; return next; })}>删除</button></div></div>; })}</div>}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>取消</Button><Button onClick={() => { onChange(draft); setOpen(false); }}>确认配置</Button></DialogFooter>
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{editingKey ? "修改渠道策略" : "新增渠道策略"}</DialogTitle></DialogHeader>
        <div className="space-y-2"><Label>分组 *</Label><Select value={policyGroup} onValueChange={setGroup} disabled={Boolean(editingKey)}><SelectTrigger><SelectValue placeholder="请选择分组" /></SelectTrigger><SelectContent>{groups.filter((group) => !draft[group] || group === editingKey).map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
        {policyGroup && <div className="max-h-[48vh] overflow-auto rounded-lg border"><div className="sticky top-0 grid grid-cols-[70px_1fr_100px_100px] bg-muted px-4 py-2 text-xs text-muted-foreground"><span>渠道 ID</span><span>渠道</span><span>优先级</span><span>权重</span></div>{channelsForGroup.map((channel) => { const config = policyChannels[channel.name] || { enabled: false, priority: channel.priority, weight: channel.weight }; return <div key={channel.name} className="grid grid-cols-[70px_1fr_100px_100px] items-center border-t px-4 py-3"><span className="text-sm text-muted-foreground">{channel.id}</span><label className="flex items-center gap-2"><Checkbox checked={config.enabled} disabled={channel.status === "disabled"} onCheckedChange={(checked) => setPolicyChannels((current) => ({ ...current, [channel.name]: { ...config, enabled: checked === true } }))} /><span>{channel.name}</span>{channel.status === "disabled" && <Badge variant="destructive">已禁用</Badge>}</label><Input type="number" min="0" disabled={!config.enabled || channel.status === "disabled"} value={config.priority} onChange={(event) => setPolicyChannels((current) => ({ ...current, [channel.name]: { ...config, priority: Number(event.target.value) } }))} /><Input type="number" min="0" disabled={!config.enabled || channel.status === "disabled"} value={config.weight} onChange={(event) => setPolicyChannels((current) => ({ ...current, [channel.name]: { ...config, weight: Number(event.target.value) } }))} /></div>; })}</div>}
        <DialogFooter><Button variant="outline" onClick={() => setEditorOpen(false)}>取消</Button><Button onClick={savePolicy}>保存策略</Button></DialogFooter>
      </DialogContent></Dialog>
    </DialogContent></Dialog>
  </div>;
}
