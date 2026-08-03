import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, HelpCircle, Pencil, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────

type GroupCategory = "base" | "template" | "custom" | "historical";

const CATEGORY_LABELS: Record<string, string> = {
  base: "基础令牌分组",
  template: "分组模板",
  all: "全部分组",
};

interface GroupConfig {
  id: string;
  name: string;
  rate: number;
  userSelectable: boolean;
  configurable: boolean;
  description: string;
  category: GroupCategory;
  status: "active" | "disabled";
  boundChannelCount: number;
  userCount: number;
}

interface SpecialRateRule {
  id: string;
  targetGroup: string;
  rate: number;
}

interface SpecialRateGroup {
  groupName: string;
  rules: SpecialRateRule[];
}

interface SpecialAvailableRule {
  id: string;
  action: "remove" | "append" | "add";
  key: string;
  value: string;
}

interface SpecialAvailableGroup {
  groupName: string;
  rules: SpecialAvailableRule[];
}

interface TemplateRuleConfig {
  availableGroups: string[];
  rateOverrides: Record<string, number>;
}

type EditMode = "visual" | "manual" | "help";

// ─── Helpers ─────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function stringifyJson(obj: unknown) {
  return JSON.stringify(obj, null, 2);
}

// ─── Default Data ────────────────────────────────────────────────────────

const DEFAULT_GROUPS: GroupConfig[] = [
  // ── 基础令牌分组 ──
  { id: genId(), name: "openai-fast", rate: 1, userSelectable: true, configurable: false, description: "OpenAI 高速通道", category: "base", status: "active", boundChannelCount: 3, userCount: 0 },
  { id: genId(), name: "gemini-fast", rate: 1, userSelectable: true, configurable: false, description: "Gemini 高速通道", category: "base", status: "active", boundChannelCount: 2, userCount: 0 },
  { id: genId(), name: "claude-fast", rate: 1, userSelectable: true, configurable: false, description: "Claude 高速通道", category: "base", status: "active", boundChannelCount: 2, userCount: 0 },
  { id: genId(), name: "claude-basic", rate: 1, userSelectable: true, configurable: false, description: "Claude 基础通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },
  { id: genId(), name: "grok-fast", rate: 1, userSelectable: true, configurable: false, description: "Grok 高速通道", category: "base", status: "active", boundChannelCount: 2, userCount: 0 },
  { id: genId(), name: "qwen", rate: 1, userSelectable: true, configurable: false, description: "通义千问通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },
  { id: genId(), name: "glm", rate: 1, userSelectable: true, configurable: false, description: "GLM 通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },
  { id: genId(), name: "glm-zhipu", rate: 1, userSelectable: true, configurable: false, description: "智谱 GLM 通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },
  { id: genId(), name: "deepseek", rate: 1, userSelectable: true, configurable: false, description: "DeepSeek 通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },
  { id: genId(), name: "kimi", rate: 1, userSelectable: true, configurable: false, description: "Kimi 通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },
  { id: genId(), name: "minimax", rate: 1, userSelectable: true, configurable: false, description: "MiniMax 通道", category: "base", status: "active", boundChannelCount: 1, userCount: 0 },

  // ── 分组模板（标准模板 + 历史分组） ──
  { id: genId(), name: "default", rate: 1, userSelectable: true, configurable: true, description: "默认分组", category: "template", status: "active", boundChannelCount: 0, userCount: 12 },
  { id: genId(), name: "vip-cd-20260509", rate: 1, userSelectable: false, configurable: true, description: "VIP-CD 模板", category: "template", status: "active", boundChannelCount: 0, userCount: 3 },
  { id: genId(), name: "vip-md-20260509", rate: 1, userSelectable: false, configurable: true, description: "VIP-MD 模板", category: "template", status: "active", boundChannelCount: 0, userCount: 3 },
  { id: genId(), name: "vip-cr-20260601", rate: 1, userSelectable: false, configurable: true, description: "VIP-CR 模板", category: "template", status: "active", boundChannelCount: 0, userCount: 3 },

  // ── 自定义特殊分组 ──
  { id: genId(), name: "vip", rate: 1, userSelectable: true, configurable: false, description: "vip分组", category: "custom", status: "active", boundChannelCount: 0, userCount: 0 },

  // ── 历史分组（仅在全部分组中展示） ──
  { id: genId(), name: "default-fast", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "gemini-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "claude-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "claude-official-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "guochan-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "glm-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "claude-fast-only", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "claude-fast-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "youai-test", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "vip-vnet", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "basic", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "vip-dp", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "vip-pp", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
  { id: genId(), name: "vip-st", rate: 1, userSelectable: false, configurable: false, description: "", category: "historical", status: "active", boundChannelCount: 0, userCount: 0 },
];

const DEFAULT_AUTO_GROUPS = ["default"];

const DEFAULT_SPECIAL_RATES: SpecialRateGroup[] = [
  {
    groupName: "vip",
    rules: [{ id: genId(), targetGroup: "edit_this", rate: 0.9 }],
  },
];

const DEFAULT_SPECIAL_AVAILABLE: SpecialAvailableGroup[] = [
  {
    groupName: "vip",
    rules: [
      { id: genId(), action: "remove", key: "remove_1", value: "vip_removed_group_1" },
      { id: genId(), action: "append", key: "append_1", value: "vip_special_group_1" },
    ],
  },
];

// Default template rule configs
const ALL_BASE_GROUP_NAMES = DEFAULT_GROUPS.filter(g => g.category === "base" && g.userSelectable).map(g => g.name);

const DEFAULT_TEMPLATE_RULES: Record<string, TemplateRuleConfig> = {
  "default": { availableGroups: [...ALL_BASE_GROUP_NAMES], rateOverrides: {} },
  "vip-cd-20260509": {
    availableGroups: ["openai-fast", "claude-fast", "gemini-fast", "qwen"],
    rateOverrides: { "openai-fast": 0.9, "claude-fast": 0.95, "gemini-fast": 0.85, "qwen": 0.7 },
  },
  "vip-md-20260509": {
    availableGroups: ["openai-fast", "claude-fast", "deepseek", "glm"],
    rateOverrides: { "openai-fast": 0.85, "claude-fast": 0.9 },
  },
  "vip-cr-20260601": {
    availableGroups: [...ALL_BASE_GROUP_NAMES],
    rateOverrides: { "openai-fast": 0.88, "claude-fast": 0.92 },
  },
};

// ─── Component ───────────────────────────────────────────────────────────

export default function GroupRateSettings() {
  const { toast } = useToast();

  // Top-level edit mode
  const [editMode, setEditMode] = useState<EditMode>("visual");

  // ── Visual state ──
  const [groups, setGroups] = useState<GroupConfig[]>(DEFAULT_GROUPS);
  const [activeCategory, setActiveCategory] = useState<"base" | "template" | "all">("base");
  const [autoGroupEnabled, setAutoGroupEnabled] = useState(false);
  const [autoGroups, setAutoGroups] = useState<string[]>(DEFAULT_AUTO_GROUPS);
  const [specialRates, setSpecialRates] = useState<SpecialRateGroup[]>(DEFAULT_SPECIAL_RATES);
  const [specialAvailable, setSpecialAvailable] = useState<SpecialAvailableGroup[]>(DEFAULT_SPECIAL_AVAILABLE);

  // Template rule config
  const [templateRules, setTemplateRules] = useState<Record<string, TemplateRuleConfig>>(DEFAULT_TEMPLATE_RULES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateRuleEditing, setTemplateRuleEditing] = useState(false);
  const [templateBaseSource, setTemplateBaseSource] = useState("__none__");
  const [templateEditSnapshot, setTemplateEditSnapshot] = useState<{
    group: GroupConfig | null;
    rule: TemplateRuleConfig | null;
  }>({ group: null, rule: null });

  // Expand states
  const [expandedSpecialRateGroups, setExpandedSpecialRateGroups] = useState<Set<string>>(new Set(["vip"]));
  const [expandedSpecialAvailableGroups, setExpandedSpecialAvailableGroups] = useState<Set<string>>(new Set(["vip"]));

  // ── Manual JSON state ──
  const [jsonValues, setJsonValues] = useState({
    groupRate: "",
    userSelectable: "",
    specialRate: "",
    specialAvailable: "",
    autoGroup: "",
  });

  // Sync JSON from visual state when switching to manual mode
  const syncJsonFromVisual = useCallback(() => {
    const groupRate = stringifyJson(
      groups.reduce((acc, g) => {
        acc[g.name] = g.rate;
        return acc;
      }, {} as Record<string, number>)
    );
    const userSelectable = stringifyJson(
      groups
        .filter((g) => g.userSelectable)
        .reduce((acc, g) => {
          acc[g.name] = g.description || g.name;
          return acc;
        }, {} as Record<string, string>)
    );
    const specialRate = stringifyJson(
      specialRates.reduce((acc, sg) => {
        acc[sg.groupName] = sg.rules.reduce((racc, r) => {
          racc[r.targetGroup] = r.rate;
          return racc;
        }, {} as Record<string, number>);
        return acc;
      }, {} as Record<string, Record<string, number>>)
    );
    const specialAvail = stringifyJson(
      specialAvailable.reduce((acc, sg) => {
        acc[sg.groupName] = sg.rules.reduce((racc, r) => {
          const prefix = r.action === "remove" ? "-:" : r.action === "add" ? "+:" : "";
          racc[`${prefix}${r.key}`] = r.value;
          return racc;
        }, {} as Record<string, string>);
        return acc;
      }, {} as Record<string, Record<string, string>>)
    );
    const auto = stringifyJson(autoGroups);
    setJsonValues({
      groupRate,
      userSelectable,
      specialRate,
      specialAvailable: specialAvail,
      autoGroup: auto,
    });
  }, [groups, specialRates, specialAvailable, autoGroups]);

  // ── Actions: Group Management ──
  const [isBaseEditing, setIsBaseEditing] = useState(false);
  const [isTemplateEditing, setIsTemplateEditing] = useState(false);
  const [isAutoEditing, setIsAutoEditing] = useState(false);
  const [isSpecialRateEditing, setIsSpecialRateEditing] = useState(false);
  const [isSpecialAvailableEditing, setIsSpecialAvailableEditing] = useState(false);

  // Track new group IDs (unsaved) for each category
  const [newBaseGroupIds, setNewBaseGroupIds] = useState<Set<string>>(new Set());
  const [newTemplateGroupIds, setNewTemplateGroupIds] = useState<Set<string>>(new Set());

  const isEditing = activeCategory === "base" ? isBaseEditing : isTemplateEditing;
  const setIsEditing = (v: boolean) => {
    if (activeCategory === "base") setIsBaseEditing(v);
    else setIsTemplateEditing(v);
  };
  const getNewGroupIds = () => {
    if (activeCategory === "base") return newBaseGroupIds;
    return newTemplateGroupIds;
  };
  const setNewGroupIds = (ids: Set<string>) => {
    if (activeCategory === "base") setNewBaseGroupIds(ids);
    else setNewTemplateGroupIds(ids);
  };

  const cancelEditing = () => {
    const newIds = getNewGroupIds();
    if (newIds.size > 0) {
      const hasUnsaved = Array.from(newIds).some((id) => {
        const g = groups.find((item) => item.id === id);
        return g && (g.name.trim() !== "" || g.description.trim() !== "");
      });
      if (hasUnsaved) {
        const confirmed = window.confirm("有未保存的新增分组，确认放弃编辑？");
        if (!confirmed) return;
      }
      setGroups((prev) => prev.filter((g) => !newIds.has(g.id)));
      setNewGroupIds(new Set());
    }
    setIsEditing(false);
  };

  const addGroup = () => {
    const newGroup: GroupConfig = {
      id: genId(),
      name: "",
      rate: 1,
      userSelectable: activeCategory === "base",
      configurable: activeCategory === "template",
      description: "",
      category: activeCategory === "all" ? "base" : activeCategory,
      status: "active",
      boundChannelCount: 0,
      userCount: 0,
    };
    setGroups((prev) => [...prev, newGroup]);
    setNewGroupIds(new Set([...getNewGroupIds(), newGroup.id]));
    setIsEditing(true);
  };

  const removeGroup = (id: string) => {
    const g = groups.find((item) => item.id === id);
    if (g && g.boundChannelCount > 0) {
      toast({ title: "无法删除", description: `分组「${g.name}」已绑定 ${g.boundChannelCount} 个渠道，不允许直接删除。如需下线，请先停用。`, variant: "destructive" });
      return;
    }
    setGroups((prev) => prev.filter((item) => item.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId(null);
  };

  const updateGroupRate = (id: string, newRate: number) => {
    updateGroup(id, { rate: newRate });
  };

  const updateGroup = (id: string, patch: Partial<GroupConfig>) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        return { ...g, ...patch };
      })
    );
  };

  // ── Actions: Auto Group ──
  const addAutoGroup = () => {
    setAutoGroups((prev) => [...prev, ""]);
  };

  const removeAutoGroup = (idx: number) => {
    setAutoGroups((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAutoGroup = (idx: number, val: string) => {
    setAutoGroups((prev) => prev.map((v, i) => (i === idx ? val : v)));
  };

  // ── Actions: Special Rates ──
  const addSpecialRateGroup = () => {
    toast({ title: "请先选择用户分组", description: "在下方的下拉框中选择分组后添加规则" });
  };

  const addSpecialRateRule = (groupName: string) => {
    setSpecialRates((prev) =>
      prev.map((sg) =>
        sg.groupName === groupName
          ? { ...sg, rules: [...sg.rules, { id: genId(), targetGroup: "", rate: 1 }] }
          : sg
      )
    );
  };

  const removeSpecialRateRule = (groupName: string, ruleId: string) => {
    setSpecialRates((prev) =>
      prev.map((sg) =>
        sg.groupName === groupName
          ? { ...sg, rules: sg.rules.filter((r) => r.id !== ruleId) }
          : sg
      )
    );
  };

  const updateSpecialRateRule = (groupName: string, ruleId: string, patch: Partial<SpecialRateRule>) => {
    setSpecialRates((prev) =>
      prev.map((sg) =>
        sg.groupName === groupName
          ? { ...sg, rules: sg.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)) }
          : sg
      )
    );
  };

  const toggleSpecialRateGroup = (groupName: string) => {
    setExpandedSpecialRateGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  // ── Actions: Special Available ──
  const addSpecialAvailableRule = (groupName: string) => {
    setSpecialAvailable((prev) =>
      prev.map((sg) =>
        sg.groupName === groupName
          ? { ...sg, rules: [...sg.rules, { id: genId(), action: "remove", key: "", value: "" }] }
          : sg
      )
    );
  };

  const removeSpecialAvailableRule = (groupName: string, ruleId: string) => {
    setSpecialAvailable((prev) =>
      prev.map((sg) =>
        sg.groupName === groupName
          ? { ...sg, rules: sg.rules.filter((r) => r.id !== ruleId) }
          : sg
      )
    );
  };

  const updateSpecialAvailableRule = (
    groupName: string,
    ruleId: string,
    patch: Partial<SpecialAvailableRule>
  ) => {
    setSpecialAvailable((prev) =>
      prev.map((sg) =>
        sg.groupName === groupName
          ? { ...sg, rules: sg.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)) }
          : sg
      )
    );
  };

  const toggleSpecialAvailableGroup = (groupName: string) => {
    setExpandedSpecialAvailableGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  // ── Available groups for selects ──
  const groupNames = useMemo(() => groups.map((g) => g.name).filter((n) => n), [groups]);
  const baseGroups = useMemo(() => groups.filter((g) => g.category === "base" && g.status === "active"), [groups]);

  // ── Template rule helpers ──
  const getTemplateRule = (templateName: string): TemplateRuleConfig => {
    return templateRules[templateName] || { availableGroups: [], rateOverrides: {} };
  };

  const updateTemplateRule = (templateName: string, patch: Partial<TemplateRuleConfig>) => {
    setTemplateRules((prev) => ({
      ...prev,
      [templateName]: { ...getTemplateRule(templateName), ...patch },
    }));
  };

  const handleViewTemplateRules = (id: string) => {
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
      setTemplateRuleEditing(false);
      setTemplateEditSnapshot({ group: null, rule: null });
    } else {
      setSelectedTemplateId(id);
      setTemplateRuleEditing(false);
      setTemplateEditSnapshot({ group: null, rule: null });
    }
  };

  const handleStartTemplateRuleEditing = () => {
    const tmpl = groups.find((g) => g.id === selectedTemplateId);
    if (!tmpl) return;
    const currentRule = getTemplateRule(tmpl.name);
    if (currentRule.availableGroups.length === 0) {
      setTemplateBaseSource("__none__");
      updateTemplateRule(tmpl.name, {
        availableGroups: [...ALL_BASE_GROUP_NAMES],
        rateOverrides: {},
      });
    } else {
      setTemplateBaseSource("__none__");
    }
    setTemplateEditSnapshot({
      group: { ...tmpl },
      rule: { ...currentRule },
    });
    setTemplateRuleEditing(true);
  };

  const handleCancelTemplateRuleEditing = () => {
    const tmpl = groups.find((g) => g.id === selectedTemplateId);
    if (!tmpl) { setTemplateRuleEditing(false); return; }
    const currentRule = getTemplateRule(tmpl.name);
    const hasChanges =
      tmpl.name !== templateEditSnapshot.group?.name ||
      tmpl.configurable !== templateEditSnapshot.group?.configurable ||
      tmpl.description !== templateEditSnapshot.group?.description ||
      JSON.stringify(currentRule) !== JSON.stringify(templateEditSnapshot.rule);
    if (hasChanges) {
      const confirmed = window.confirm("当前存在未保存的模板配置修改，退出后将不会保存，是否确认退出？");
      if (!confirmed) return;
    }
    // Restore from snapshot
    if (templateEditSnapshot.group) {
      updateGroup(selectedTemplateId!, {
        name: templateEditSnapshot.group.name,
        configurable: templateEditSnapshot.group.configurable,
        description: templateEditSnapshot.group.description,
      });
    }
    if (templateEditSnapshot.rule) {
      const tmplName = templateEditSnapshot.group?.name || tmpl.name;
      setTemplateRules((prev) => ({
        ...prev,
        [tmplName]: { ...templateEditSnapshot.rule! },
      }));
    }
    setTemplateRuleEditing(false);
    setTemplateEditSnapshot({ group: null, rule: null });
  };

  const handleSaveTemplateRules = () => {
    const tmpl = groups.find((g) => g.id === selectedTemplateId);
    if (!tmpl) return;
    const mockBoundCount = tmpl.name === "default" ? 12 : tmpl.name.startsWith("vip-") ? 3 : 0;
    if (mockBoundCount > 0) {
      const confirmed = window.confirm(`当前模板已被 ${mockBoundCount} 个用户/企业使用，修改后将影响仍使用该模板的用户/企业，请确认后保存。`);
      if (!confirmed) return;
    }
    setTemplateRuleEditing(false);
    setNewTemplateGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(tmpl.id);
      return next;
    });
    setTemplateEditSnapshot({ group: null, rule: null });
    toast({ title: "保存成功", description: `模板「${tmpl.name}」的规则配置已保存` });
  };

  // ── Apply manual JSON ──
  const applyManualJson = () => {
    try {
      const groupRateObj = JSON.parse(jsonValues.groupRate || "{}") as Record<string, number>;
      const userSelectableObj = JSON.parse(jsonValues.userSelectable || "{}") as Record<string, string>;

      const newGroups: GroupConfig[] = Object.entries(groupRateObj).map(([name, rate]) => ({
        id: genId(),
        name,
        rate: typeof rate === "number" ? rate : 1,
        userSelectable: name in userSelectableObj,
        configurable: false,
        description: userSelectableObj[name] || "",
        category: "base" as GroupCategory,
        status: "active" as const,
        boundChannelCount: 0,
        userCount: 0,
      }));
      setGroups(newGroups);

      const autoArr = JSON.parse(jsonValues.autoGroup || "[]") as string[];
      setAutoGroups(Array.isArray(autoArr) ? autoArr : []);

      const specialRateObj = JSON.parse(jsonValues.specialRate || "{}") as Record<string, Record<string, number>>;
      const newSpecialRates: SpecialRateGroup[] = Object.entries(specialRateObj).map(([groupName, rules]) => ({
        groupName,
        rules: Object.entries(rules).map(([targetGroup, rate]) => ({
          id: genId(),
          targetGroup,
          rate: typeof rate === "number" ? rate : 1,
        })),
      }));
      setSpecialRates(newSpecialRates);

      const specialAvailObj = JSON.parse(jsonValues.specialAvailable || "{}") as Record<string, Record<string, string>>;
      const newSpecialAvailable: SpecialAvailableGroup[] = Object.entries(specialAvailObj).map(([groupName, rules]) => ({
        groupName,
        rules: Object.entries(rules).map(([key, value]) => {
          let action: "remove" | "append" | "add" = "append";
          let realKey = key;
          if (key.startsWith("-:")) {
            action = "remove";
            realKey = key.slice(2);
          } else if (key.startsWith("+:")) {
            action = "add";
            realKey = key.slice(2);
          }
          return { id: genId(), action, key: realKey, value };
        }),
      }));
      setSpecialAvailable(newSpecialAvailable);

      toast({ title: "应用成功", description: "JSON 配置已应用到可视化编辑" });
    } catch (e: any) {
      toast({ title: "JSON 格式错误", description: e?.message || "请检查 JSON 格式", variant: "destructive" });
    }
  };

  // ── Save ──
  const handleSave = () => {
    toast({ title: "保存成功", description: "分组相关设置已保存" });
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const selectedTemplate = groups.find((g) => g.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex bg-muted rounded-md p-0.5">
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              editMode === "visual"
                ? "bg-white text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setEditMode("visual")}
          >
            可视化编辑
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              editMode === "manual"
                ? "bg-white text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              syncJsonFromVisual();
              setEditMode("manual");
            }}
          >
            手动编辑
          </button>
        </div>
        <button
          className={`flex items-center gap-1 text-sm ml-2 transition-colors ${
            editMode === "help" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setEditMode("help")}
        >
          <HelpCircle className="w-4 h-4" />
          <span>使用说明</span>
        </button>
      </div>

      {/* ── Visual Edit Mode ── */}
      {editMode === "visual" && (
        <div className="space-y-4">
          {/* Group Management */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-foreground">分组管理</h3>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      取消编辑
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-8" onClick={handleSave}>
                      保存
                    </Button>
                  </>
                )}
              </div>
            </div>
            {/* Category Tabs */}
            <div className="inline-flex bg-muted rounded-md p-0.5 mb-2">
              {(["base", "template", "all"] as const).map((cat) => (
                <button
                  key={cat}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeCategory === cat
                      ? "bg-white text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => { setActiveCategory(cat); setIsBaseEditing(false); setIsTemplateEditing(false); setSelectedTemplateId(null); setTemplateRuleEditing(false); }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            {activeCategory === "template" && (
              <p className="text-xs text-muted-foreground mb-2">
                分组模板用于承载一组基础令牌分组范围及倍率配置。勾选「配置可用」的为标准模板，可用于新建/编辑用户和企业；未勾选的为历史分组，仅保留历史数据和绑定关系。
              </p>
            )}

            {/* ── 基础令牌分组：只读表格 + 编辑模式 ── */}
            {activeCategory === "base" && (
              <>
              <p className="text-xs text-muted-foreground mb-2">
                基础令牌分组为各模型渠道的底层通道分组，用于承载基础倍率和通道绑定关系。
              </p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">分组名称</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-16">倍率</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-20">用户可用</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">描述</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-20">绑定渠道</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-20">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groups
                      .filter((g) => g.category === "base")
                      .map((g) => (
                          <tr key={g.id} className={`hover:bg-muted/30 ${g.status === "disabled" ? "opacity-50" : ""}`}>
                            {isBaseEditing ? (
                              <>
                                <td className="px-3 py-1.5">
                                  <Input value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} className="h-7 text-sm" placeholder="分组名称" />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Input type="number" value={g.rate} onChange={(e) => updateGroupRate(g.id, parseFloat(e.target.value) || 0)} className="h-7 text-sm" step={0.1} />
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <Checkbox checked={g.userSelectable} onCheckedChange={(v) => updateGroup(g.id, { userSelectable: !!v })} />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Input value={g.description} onChange={(e) => updateGroup(g.id, { description: e.target.value })} className="h-7 text-sm" placeholder="描述" />
                                </td>
                                <td className="px-3 py-1.5 text-center text-muted-foreground">{g.boundChannelCount}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeGroup(g.id)} title="删除">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-1.5 font-medium">{g.name}</td>
                                <td className="px-3 py-1.5">{g.rate}</td>
                                <td className="px-3 py-1.5 text-center">
                                  {g.userSelectable ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-muted-foreground">{g.description || "—"}</td>
                                <td className="px-3 py-1.5 text-center text-muted-foreground">{g.boundChannelCount}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeGroup(g.id)} title="删除">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            {/* ── 分组模板（只读列表） ── */}
            {activeCategory === "template" && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-[26%]">分组名称</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-[9%]">倍率</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[10%]">配置可用</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-[22%]">描述</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[10%]">用户数</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-[23%]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {/* 自定义分组行 */}
                    <tr className="hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-medium">
                        自定义分组
                      </td>
                      <td className="px-3 py-1.5">—</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="text-green-600">✓</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">用户自行配置可用分组及倍率</td>
                      <td className="px-3 py-1.5 text-center text-muted-foreground">—</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                    </tr>
                    {groups
                      .filter((g) => g.category === "template")
                      .map((g) => (
                        <tr
                          key={g.id}
                          className={`hover:bg-muted/30 ${g.status === "disabled" ? "opacity-50" : ""}`}
                        >
                          {isTemplateEditing ? (
                            <>
                              <td className="px-3 py-1.5">
                                <Input value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} className="h-7 text-sm" placeholder="分组名称" />
                              </td>
                              <td className="px-3 py-1.5">
                                <Input type="number" value={g.rate} onChange={(e) => updateGroupRate(g.id, parseFloat(e.target.value) || 0)} className="h-7 text-sm w-full" step={0.1} />
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <Checkbox checked={g.configurable} onCheckedChange={(v) => updateGroup(g.id, { configurable: !!v })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <Input value={g.description || ""} onChange={(e) => updateGroup(g.id, { description: e.target.value })} className="h-7 text-sm" placeholder="描述" />
                              </td>
                              <td className="px-3 py-1.5 text-center text-muted-foreground">{g.userCount || "—"}</td>
                              <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    className={`text-xs transition-colors ${
                                      g.configurable
                                        ? `text-blue-600 hover:text-blue-700 ${selectedTemplateId === g.id ? "font-semibold" : ""}`
                                        : "text-gray-400 cursor-not-allowed"
                                    }`}
                                    onClick={() => { if (g.configurable) handleViewTemplateRules(g.id); }}
                                    disabled={!g.configurable}
                                  >
                                    配置规则
                                  </button>
                                  <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeGroup(g.id)} title="删除">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-1.5 font-medium">
                                {g.name}
                              </td>
                              <td className="px-3 py-1.5">{g.rate}</td>
                              <td className="px-3 py-1.5 text-center">
                                {g.configurable ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground">{g.description || "—"}</td>
                              <td className="px-3 py-1.5 text-center text-muted-foreground">{g.userCount || "—"}</td>
                              <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    className={`text-xs transition-colors ${
                                      isTemplateEditing
                                        ? `text-blue-600 hover:text-blue-700 ${selectedTemplateId === g.id ? "font-semibold" : ""}`
                                        : "text-gray-400 cursor-not-allowed"
                                    }`}
                                    onClick={() => { if (isTemplateEditing) handleViewTemplateRules(g.id); }}
                                    disabled={!isTemplateEditing}
                                  >
                                    配置规则
                                  </button>
                                  <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeGroup(g.id)} title="删除">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 全部分组：所有分组总览 ── */}
            {activeCategory === "all" && (
              <>
              <p className="text-xs text-muted-foreground mb-2">
                依据用户/分组配置（勾选「配置可用」后）用户可以在创建/编辑时选择这些分组。
              </p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">分组名称</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-16">倍率</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-20">用户可用</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">描述</th>
                      <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-20">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groups
                      .filter((g) => g.category !== "custom")
                      .map((g) => (
                        <tr key={g.id} className={`hover:bg-muted/30 ${g.status === "disabled" ? "opacity-50" : ""}`}>
                          <td className="px-3 py-1.5 font-medium">{g.name}</td>
                          <td className="px-3 py-1.5">{g.rate}</td>
                          <td className="px-3 py-1.5 text-center">
                            {g.userSelectable ? (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-blue-50 border border-blue-200">
                                <span className="text-[10px] text-blue-600 leading-none">✓</span>
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{g.description || "—"}</td>
                          <td className="px-3 py-1.5 text-center">
                            <button className="text-destructive hover:text-red-700 transition-colors" onClick={() => removeGroup(g.id)} title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
            <Button
              variant="ghost"
              className={`mt-1 h-8 ${isEditing ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" : "text-gray-400 cursor-not-allowed"}`}
              onClick={addGroup}
              disabled={!isEditing}
            >
              <Plus className="w-4 h-4 mr-1" />
              {activeCategory === "base" ? "新增基础分组" : "添加分组模板"}
            </Button>
          </section>

          {/* Auto Group */}
          {activeCategory === "all" && (
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-foreground">自动分组</h3>
              <div className="flex items-center gap-2">
                {!isAutoEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsAutoEditing(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
                {isAutoEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsAutoEditing(false)}>
                      取消编辑
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-8" onClick={() => { setIsAutoEditing(false); handleSave(); }}>
                      保存
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1 p-1.5 bg-muted/30 rounded-md">
              <Switch id="auto-group" checked={autoGroupEnabled} onCheckedChange={setAutoGroupEnabled} disabled={!isAutoEditing} />
              <label htmlFor="auto-group" className={`text-sm font-medium ${isAutoEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                默认使用 auto 分组，初始令牌也将设为 auto
              </label>
            </div>
            <div className="space-y-0.5">
              {autoGroups.map((ag, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-muted/20 rounded-md px-3 py-1">
                  <span className="text-sm text-muted-foreground w-5">{idx + 1}</span>
                  <Select value={ag} onValueChange={(v) => updateAutoGroup(idx, v)} disabled={!isAutoEditing}>
                    <SelectTrigger className="w-40 h-7 text-sm"><SelectValue placeholder="选择分组" /></SelectTrigger>
                    <SelectContent>
                      {groupNames.map((gn) => (<SelectItem key={gn} value={gn}>{gn}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {isAutoEditing && (
                    <div className="ml-auto flex items-center gap-1">
                      <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeAutoGroup(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isAutoEditing && (
              <Button variant="ghost" className="mt-0.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8" onClick={addAutoGroup}>
                <Plus className="w-4 h-4 mr-1" />
                添加分组
              </Button>
            )}
          </section>
          )}

          {/* ── 分组特殊倍率 ── */}
          {activeCategory === "all" && (
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-foreground">分组特殊倍率</h3>
              <div className="flex items-center gap-2">
                {!isSpecialRateEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsSpecialRateEditing(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
                {isSpecialRateEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsSpecialRateEditing(false)}>
                      取消编辑
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-8" onClick={() => { setIsSpecialRateEditing(false); handleSave(); }}>
                      保存
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              为指定分组设置其他分组的特殊倍率。当该分组用户使用对应分组令牌时，将使用此特殊倍率替代默认倍率。
            </p>
            <div className="space-y-2">
              {specialRates.map((sg) => {
                const isExpanded = expandedSpecialRateGroups.has(sg.groupName);
                return (
                  <div key={sg.groupName} className="border rounded-md">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSpecialRateGroup(sg.groupName)}
                    >
                      <span className="font-medium text-sm">{sg.groupName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{sg.rules.length} 条规则</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-2 space-y-1">
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-3 py-1 text-left font-medium text-muted-foreground">目标分组</th>
                                <th className="px-3 py-1 text-right font-medium text-muted-foreground w-24">特殊倍率</th>
                                {isSpecialRateEditing && <th className="px-3 py-1 text-center font-medium text-muted-foreground w-16">操作</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {sg.rules.map((rule) => (
                                <tr key={rule.id} className="hover:bg-muted/30">
                                  <td className="px-3 py-1">
                                    {isSpecialRateEditing ? (
                                      <Select value={rule.targetGroup} onValueChange={(v) => updateSpecialRateRule(sg.groupName, rule.id, { targetGroup: v })}>
                                        <SelectTrigger className="h-7 text-sm w-full"><SelectValue placeholder="选择分组" /></SelectTrigger>
                                        <SelectContent>
                                          {groupNames.map((gn) => (<SelectItem key={gn} value={gn}>{gn}</SelectItem>))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="font-medium">{rule.targetGroup}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1 text-right">
                                    {isSpecialRateEditing ? (
                                      <Input type="number" value={rule.rate} onChange={(e) => updateSpecialRateRule(sg.groupName, rule.id, { rate: parseFloat(e.target.value) || 0 })} className="h-7 text-sm w-20 text-right ml-auto" step={0.05} />
                                    ) : (
                                      <span>{rule.rate}</span>
                                    )}
                                  </td>
                                  {isSpecialRateEditing && (
                                    <td className="px-3 py-1 text-center">
                                      <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeSpecialRateRule(sg.groupName, rule.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {isSpecialRateEditing && (
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7" onClick={() => addSpecialRateRule(sg.groupName)}>
                            <Plus className="w-3 h-3 mr-1" />
                            添加规则
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isSpecialRateEditing && specialRates.length === 0 && (
              <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8" onClick={addSpecialRateGroup}>
                <Plus className="w-4 h-4 mr-1" />
                添加特殊倍率分组
              </Button>
            )}
          </section>
          )}

          {/* ── 用户可用特殊分组 ── */}
          {activeCategory === "all" && (
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-foreground">用户可用特殊分组</h3>
              <div className="flex items-center gap-2">
                {!isSpecialAvailableEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsSpecialAvailableEditing(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
                {isSpecialAvailableEditing && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsSpecialAvailableEditing(false)}>
                      取消编辑
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 h-8" onClick={() => { setIsSpecialAvailableEditing(false); handleSave(); }}>
                      保存
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              为指定分组用户调整可用分组。添加（+）表示额外可用，移除（-）表示从可用列表中移除。
            </p>
            <div className="space-y-2">
              {specialAvailable.map((sg) => {
                const isExpanded = expandedSpecialAvailableGroups.has(sg.groupName);
                return (
                  <div key={sg.groupName} className="border rounded-md">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSpecialAvailableGroup(sg.groupName)}
                    >
                      <span className="font-medium text-sm">{sg.groupName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{sg.rules.length} 条规则</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-2 space-y-1">
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-3 py-1 text-center font-medium text-muted-foreground w-20">操作</th>
                                <th className="px-3 py-1 text-left font-medium text-muted-foreground">键</th>
                                <th className="px-3 py-1 text-left font-medium text-muted-foreground">值（分组名称）</th>
                                {isSpecialAvailableEditing && <th className="px-3 py-1 text-center font-medium text-muted-foreground w-16">删除</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {sg.rules.map((rule) => (
                                <tr key={rule.id} className="hover:bg-muted/30">
                                  <td className="px-3 py-1 text-center">
                                    {isSpecialAvailableEditing ? (
                                      <Select value={rule.action} onValueChange={(v) => updateSpecialAvailableRule(sg.groupName, rule.id, { action: v as "remove" | "append" | "add" })}>
                                        <SelectTrigger className="h-7 text-sm w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="remove">移除 (-)</SelectItem>
                                          <SelectItem value="append">添加 (+)</SelectItem>
                                          <SelectItem value="add">直接添加</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                        rule.action === "remove" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                                      }`}>
                                        {rule.action === "remove" ? "移除" : rule.action === "append" ? "添加" : "直接添加"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1">
                                    {isSpecialAvailableEditing ? (
                                      <Input value={rule.key} onChange={(e) => updateSpecialAvailableRule(sg.groupName, rule.id, { key: e.target.value })} className="h-7 text-sm" placeholder="键" />
                                    ) : (
                                      <span className="font-mono text-xs">{rule.key}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1">
                                    {isSpecialAvailableEditing ? (
                                      <Input value={rule.value} onChange={(e) => updateSpecialAvailableRule(sg.groupName, rule.id, { value: e.target.value })} className="h-7 text-sm" placeholder="分组名称" />
                                    ) : (
                                      <span>{rule.value}</span>
                                    )}
                                  </td>
                                  {isSpecialAvailableEditing && (
                                    <td className="px-3 py-1 text-center">
                                      <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeSpecialAvailableRule(sg.groupName, rule.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {isSpecialAvailableEditing && (
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7" onClick={() => addSpecialAvailableRule(sg.groupName)}>
                            <Plus className="w-3 h-3 mr-1" />
                            添加规则
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {/* ── 模板规则配置弹窗 ── */}
          {activeCategory === "template" && selectedTemplate && (() => {
            const rule = getTemplateRule(selectedTemplate.name);
            const isHistorical = !selectedTemplate.configurable;

            return (
              <Dialog open={!!selectedTemplateId} onOpenChange={(open) => { if (!open) { handleCancelTemplateRuleEditing(); setSelectedTemplateId(null); setTemplateRuleEditing(false); setTemplateBaseSource("__none__"); setTemplateEditSnapshot({ group: null, rule: null }); } }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center justify-between w-full pr-6">
                      <DialogTitle>分组规则配置：{selectedTemplate.name}</DialogTitle>
                      <div className="flex items-center gap-2">
                        {!templateRuleEditing && (
                          <Button variant="outline" size="sm" onClick={handleStartTemplateRuleEditing}>
                            <Pencil className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                        )}
                        {templateRuleEditing && (
                          <>
                            <Button variant="outline" size="sm" onClick={handleCancelTemplateRuleEditing}>
                              取消编辑
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 h-8" onClick={handleSaveTemplateRules}>
                              保存规则
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* 历史分组提示 */}
                    {isHistorical && (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-700">
                          该分组为历史分组，仅用于保留历史配置和绑定关系，不建议继续用于新用户/企业配置。
                        </p>
                      </div>
                    )}

                    {/* 规则配置表 */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">规则配置</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {newTemplateGroupIds.has(selectedTemplate.id)
                          ? "可直接使用默认配置，也可复制已有模板后再调整。"
                          : "修改当前模板下可用的基础令牌分组及其倍率。"}
                      </p>
                      {templateRuleEditing && newTemplateGroupIds.has(selectedTemplate.id) && (
                        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 mb-3">
                          <div className="shrink-0">
                            <p className="text-sm font-medium text-foreground">从模板复制</p>
                          </div>
                          <select
                            className="ml-auto h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm"
                            value={templateBaseSource}
                            onChange={(event) => {
                              setTemplateBaseSource(event.target.value);
                            }}
                          >
                            <option value="__none__">不使用模板</option>
                            {groups
                              .filter((group) =>
                                group.category === "template" &&
                                group.configurable &&
                                group.id !== selectedTemplate.id &&
                                group.name
                              )
                              .map((group) => (
                                <option key={group.id} value={group.name}>
                                  {group.name}{group.description ? `（${group.description}）` : ""}
                                </option>
                              ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            disabled={templateBaseSource === "__none__"}
                            onClick={() => {
                              const sourceRule = getTemplateRule(templateBaseSource);
                              updateTemplateRule(selectedTemplate.name, {
                                availableGroups: [...sourceRule.availableGroups],
                                rateOverrides: { ...sourceRule.rateOverrides },
                              });
                              toast({
                                title: "模板配置已导入",
                                description: `已复制「${templateBaseSource}」的分组和倍率，可继续修改。`,
                              });
                            }}
                          >
                            导入模板
                          </Button>
                        </div>
                      )}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">基础令牌分组</th>
                              <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-20">是否可用</th>
                              <th className="px-3 py-1.5 text-right font-medium text-muted-foreground w-20">倍率</th>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">描述/模型系列</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {baseGroups.map((bg) => {
                              const isAvailable = rule.availableGroups.includes(bg.name);
                              const overrideRate = rule.rateOverrides[bg.name];
                              const displayRate = overrideRate ?? bg.rate;
                              return (
                                <tr key={bg.id} className={isAvailable ? "" : "opacity-40"}>
                                  <td className="px-3 py-1.5 font-medium">{bg.name}</td>
                                  <td className="px-3 py-1.5 text-center">
                                    {templateRuleEditing ? (
                                      <Checkbox
                                        checked={isAvailable}
                                        onCheckedChange={(v) => {
                                          const newGroups = v
                                            ? [...rule.availableGroups, bg.name]
                                            : rule.availableGroups.filter((n) => n !== bg.name);
                                          updateTemplateRule(selectedTemplate.name, { availableGroups: newGroups });
                                        }}
                                      />
                                    ) : (
                                      isAvailable ? <span className="text-green-600">是</span> : <span className="text-muted-foreground">否</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    {templateRuleEditing && isAvailable ? (
                                      <Input
                                        type="number"
                                        value={displayRate}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          const newOverrides = { ...rule.rateOverrides };
                                          if (isNaN(val) || val === bg.rate) {
                                            delete newOverrides[bg.name];
                                          } else {
                                            newOverrides[bg.name] = val;
                                          }
                                          updateTemplateRule(selectedTemplate.name, { rateOverrides: newOverrides });
                                        }}
                                        className="h-7 text-sm w-20 text-right ml-auto"
                                        step={0.05}
                                      />
                                    ) : (
                                      <span>{displayRate}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{bg.description}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}

        </div>
      )}

      {/* ── Manual Edit Mode ── */}
      {editMode === "manual" && (
        <div className="space-y-6 max-w-4xl">
          <h3 className="text-base font-semibold text-foreground">分组JSON设置</h3>

          {/* Group Rates */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">分组倍率</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.groupRate}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, groupRate: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              分组倍率设置，可以在此处新增分组或修改现有分组的倍率，格式为 JSON 字符串，例如：{"{"}"vip": 0.5,
              "test": 1{"}"}，表示 vip 分组的倍率为 0.5，test 分组的倍率为 1
            </p>
          </div>

          {/* User Selectable */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">用户可选分组</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.userSelectable}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, userSelectable: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              用户新建令牌时可选的分组，格式为 JSON 字符串，例如：{"{"}"vip": "VIP 用户", "test": "测试"{"}"}，表示用户可以选择
              vip 分组和 test 分组
            </p>
          </div>{/* Special Rates */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">分组特殊倍率</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.specialRate}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, specialRate: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              键为分组名称，值为另一个 JSON 对象，键为分组名称，值为该分组的用户的特殊分组倍率，例如：{"{"}"vip": {"{"}
              "default": 0.5, "test": 1{"}"}{"}"}，表示 vip 分组的用户在使用default分组的令牌时倍率为0.5，使用test分组时倍率为1
            </p>
          </div>

          {/* Special Available */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">分组特殊可用分组</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.specialAvailable}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, specialAvailable: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              键为用户分组名称，值为操作映射对象。内层键以"+:"开头表示添加指定分组（键值为分组名称，值为描述），以"-:"开头表示移除指定分组（键值为分组名称），不带前缀的键直接添加该分组。例如：{"{"}"vip":
              {"{"}"+:premium": "高级分组", "special": "特殊分组", "-:default": "默认分组"{"}"}{"}"}，表示 vip 分组的用户可以使用
              premium 和 special 分组，同时移除 default 分组的访问权限
            </p>
          </div>

          {/* Auto Group */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">自动分组auto，从第一个开始选择</label>
            <textarea
              className="w-full h-20 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.autoGroup}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, autoGroup: e.target.value }))}
            />
          </div>{/* Default auto group toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="default-auto-group"
              checked={autoGroupEnabled}
              onCheckedChange={setAutoGroupEnabled}
            />
            <label htmlFor="default-auto-group" className="text-sm font-medium text-gray-900 cursor-pointer">
              创建令牌默认选择auto分组，初始令牌也将设为auto（否则留空，为用户默认分组）
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={applyManualJson}>
              应用JSON到可视化
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
              保存分组相关设置
            </Button>
          </div>
        </div>
      )}

      {/* ── Help Mode ── */}
      {editMode === "help" && (
        <div className="space-y-6 max-w-4xl text-sm text-muted-foreground">
          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">分组倍率</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`{
  "default": 1,
  "svip": 1,
  "vip": 1
}`}
            </pre>
            <p>
              分组倍率设置，可以在此处新增分组或修改现有分组的倍率，格式为 JSON 字符串，例如：{"{"}"vip": 0.5, "test": 1{"}"}，表示
              vip 分组的倍率为 0.5，test 分组的倍率为 1
            </p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">用户可选分组</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`{
  "default": "默认分组",
  "vip": "vip分组"
}`}
            </pre>
            <p>
              用户新建令牌时可选的分组，格式为 JSON 字符串，例如：{"{"}"vip": "VIP 用户", "test": "测试"{"}"}，表示用户可以选择
              vip 分组和 test 分组
            </p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">分组特殊倍率</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`{
  "vip": {
    "edit_this": 0.9
  }
}`}
            </pre>
            <p>
              键为分组名称，值为另一个 JSON 对象，键为分组名称，值为该分组的用户的特殊分组倍率，例如：{"{"}"vip": {"{"}"default":
              0.5, "test": 1{"}"}{"}"}，表示 vip 分组的用户在使用default分组的令牌时倍率为0.5，使用test分组时倍率为1
            </p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">分组特殊可用分组</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`{
  "vip": {
    "-:remove_1": "vip_removed_group_1",
    "append_1": "vip_special_group_1"
  }
}`}
            </pre>
            <p>
              键为用户分组名称，值为操作映射对象。内层键以"+:"开头表示添加指定分组（键值为分组名称，值为描述），以"-:"开头表示移除指定分组（键值为分组名称），不带前缀的键直接添加该分组。例如：{"{"}"vip":
              {"{"}"+:premium": "高级分组", "special": "特殊分组", "-:default": "默认分组"{"}"}{"}"}，表示 vip 分组的用户可以使用
              premium 和 special 分组，同时移除 default 分组的访问权限
            </p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">自动分组auto，从第一个开始选择</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`[
  "default"
]`}
            </pre>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">创建令牌默认选择auto分组</h4>
            <p>
              开启后创建令牌默认选择auto分组，初始令牌也将设为auto（否则留空，为用户默认分组）
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
