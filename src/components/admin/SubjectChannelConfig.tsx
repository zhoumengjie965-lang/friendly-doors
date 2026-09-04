import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight } from "lucide-react";

type ChannelMode = "global" | "custom";
type ChannelConfig = { enabled: boolean; mode: ChannelMode; priority: number; weight: number };

export type SubjectChannelConfigValue = Record<string, {
  group: string;
  channels: Record<string, ChannelConfig>;
}>;

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

export function SubjectChannelConfig({
  value,
  onChange,
  subjectLabel,
  activeGroups,
}: {
  value: SubjectChannelConfigValue;
  onChange: (value: SubjectChannelConfigValue) => void;
  subjectLabel: string;
  activeGroups?: string[];
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SubjectChannelConfigValue>(value);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupKeyword, setGroupKeyword] = useState("");

  const allGroups = [...new Set(CHANNELS.flatMap((channel) => [...channel.groups]))].sort();
  const groups = (activeGroups || allGroups).filter((group) => allGroups.includes(group)).sort();
  const filteredGroups = groups.filter((group) => group.toLowerCase().includes(groupKeyword.trim().toLowerCase()));

  const channelsForGroup = (group: string) =>
    CHANNELS.filter((channel) => (channel.groups as readonly string[]).includes(group));

  const createDraft = (): SubjectChannelConfigValue => Object.fromEntries(
    groups.map((group) => [
      group,
      {
        group,
        channels: Object.fromEntries(channelsForGroup(group).map((channel) => {
          const saved = value[group]?.channels[channel.name];
          return [channel.name, {
            enabled: saved?.enabled ?? channel.status !== "disabled",
            mode: saved?.mode ?? "global",
            priority: saved?.priority ?? channel.priority,
            weight: saved?.weight ?? channel.weight,
          }];
        })),
      },
    ]),
  );

  const openDialog = () => {
    setDraft(createDraft());
    setExpandedGroups(new Set());
    setGroupKeyword("");
    setOpen(true);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const updateChannel = (group: string, channelName: string, patch: Partial<ChannelConfig>) => {
    setDraft((current) => ({
      ...current,
      [group]: {
        ...current[group],
        channels: {
          ...current[group].channels,
          [channelName]: { ...current[group].channels[channelName], ...patch },
        },
      },
    }));
  };

  const save = () => {
    const configs = Object.values(draft).flatMap((group) => Object.values(group.channels));
    if (configs.some((config) => config.mode === "custom" && (config.priority < 0 || config.weight < 0))) {
      toast({ title: "优先级和权重不能小于 0", variant: "destructive" });
      return;
    }
    onChange(draft);
    setOpen(false);
  };

  const configuredGroupCount = Object.keys(value).filter((key) => key !== "__enabled").length;
  const enabledChannelCount = Object.values(value).reduce(
    (total, group) => total + Object.values(group.channels).filter((channel) => channel.enabled).length,
    0,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>渠道配置</Label>
        <button type="button" onClick={openDialog} className="text-xs font-medium text-blue-600 hover:underline">去配置</button>
      </div>
      <div className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
        {configuredGroupCount > 0
          ? `已配置 ${configuredGroupCount} 个分组、启用 ${enabledChannelCount} 个渠道`
          : `暂未配置${subjectLabel}渠道，默认跟随全局配置`}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>渠道配置</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            按分组配置可用渠道。启用渠道后可跟随全局参数，或自定义优先级和权重。
          </p>
          <Input
            className="w-64"
            value={groupKeyword}
            onChange={(event) => setGroupKeyword(event.target.value)}
            placeholder="搜索分组名称"
          />

          <div className="max-h-[62vh] overflow-auto rounded-lg border">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(150px,0.55fr)_minmax(480px,1.8fr)] gap-4 border-b bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>分组</span>
              <span>启用渠道</span>
            </div>

            {filteredGroups.map((group) => {
              const expanded = expandedGroups.has(group);
              const channels = channelsForGroup(group);
              const groupConfig = draft[group];
              const enabledChannels = channels.filter((channel) =>
                groupConfig?.channels[channel.name]?.enabled,
              );

              return (
                <div key={group} className="border-b last:border-b-0">
                  <button
                    type="button"
                    className="grid w-full grid-cols-[minmax(150px,0.55fr)_minmax(480px,1.8fr)] items-center gap-4 px-4 py-3 text-left hover:bg-muted/30"
                    onClick={() => toggleGroup(group)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      {group}
                    </span>
                    <span className="flex min-w-0 flex-wrap gap-1.5">
                      {enabledChannels.map((channel) => {
                        const config = groupConfig.channels[channel.name];
                        const custom = config.mode === "custom";
                        const globallyDisabled = channel.status === "disabled";
                        return (
                          <Badge
                            key={channel.name}
                            variant="outline"
                            className={globallyDisabled
                              ? "border-red-200 bg-red-50 font-normal text-red-600"
                              : custom
                                ? "border-purple-200 bg-purple-50 font-normal text-purple-600"
                                : "border-gray-200 bg-gray-50 font-normal text-gray-600"}
                          >
                            {channel.name}
                            {globallyDisabled
                              ? <span className="ml-1 opacity-70">· 禁用</span>
                              : custom && <span className="ml-1 opacity-70">· 自定义</span>}
                          </Badge>
                        );
                      })}
                      {enabledChannels.length === 0 && <span className="text-xs text-muted-foreground">暂无启用渠道</span>}
                    </span>
                  </button>
                  {expanded && (
                    <div className="border-t bg-muted/10 px-4 pb-3">
                      <div className="grid grid-cols-[70px_minmax(180px,1fr)_80px_120px_100px_100px] gap-3 px-3 py-2 text-xs text-muted-foreground">
                        <span>ID</span><span>渠道</span><span>启用</span><span>配置方式</span><span>优先级</span><span>权重</span>
                      </div>
                      {channels.map((channel) => {
                        const config = groupConfig?.channels[channel.name] || {
                          enabled: channel.status !== "disabled",
                          mode: "global" as const,
                          priority: channel.priority,
                          weight: channel.weight,
                        };
                        const disabled = channel.status === "disabled";
                        const custom = config.mode === "custom";

                        return (
                          <div key={channel.name} className="grid grid-cols-[70px_minmax(180px,1fr)_80px_120px_100px_100px] items-center gap-3 border-t px-3 py-2.5">
                            <span className="text-sm text-muted-foreground">{channel.id}</span>
                            <div className="flex min-w-0 items-center gap-2 text-sm">
                              <span className="truncate">{channel.name}</span>
                              {disabled && <Badge variant="destructive" className="font-normal">全局禁用</Badge>}
                            </div>
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(enabled) => updateChannel(group, channel.name, { enabled })}
                            />
                            <Select
                              value={config.mode}
                              disabled={!config.enabled}
                              onValueChange={(mode: ChannelMode) => updateChannel(group, channel.name, {
                                mode,
                                priority: mode === "global" ? channel.priority : config.priority,
                                weight: mode === "global" ? channel.weight : config.weight,
                              })}
                            >
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="global">全局</SelectItem>
                                <SelectItem value="custom">自定义</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              className="h-8"
                              type="number"
                              min={0}
                              value={custom ? config.priority : channel.priority}
                              disabled={!config.enabled || !custom}
                              onChange={(event) => updateChannel(group, channel.name, { priority: Number(event.target.value) })}
                            />
                            <Input
                              className="h-8"
                              type="number"
                              min={0}
                              value={custom ? config.weight : channel.weight}
                              disabled={!config.enabled || !custom}
                              onChange={(event) => updateChannel(group, channel.name, { weight: Number(event.target.value) })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无匹配分组</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={save}>保存配置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}