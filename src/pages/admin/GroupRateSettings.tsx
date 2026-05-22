import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────

interface GroupConfig {
  id: string;
  name: string;
  rate: number;
  userSelectable: boolean;
  rebateEnabled: boolean;
  description: string;
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

interface RebateRateRule {
  id: string;
  tokenGroup: string;
  rate: number;
}

interface RebateRateGroup {
  groupName: string;
  rules: RebateRateRule[];
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
  { id: genId(), name: "default", rate: 1, userSelectable: true, rebateEnabled: true, description: "默认分组" },
  { id: genId(), name: "svip", rate: 1, userSelectable: false, rebateEnabled: false, description: "-" },
  { id: genId(), name: "vip", rate: 1, userSelectable: true, rebateEnabled: true, description: "vip分组" },
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

const DEFAULT_REBATE_RATES: RebateRateGroup[] = [
  {
    groupName: "vip",
    rules: [
      { id: genId(), tokenGroup: "openai-fast", rate: 0.8 },
      { id: genId(), tokenGroup: "claude-fast", rate: 0.8 },
      { id: genId(), tokenGroup: "gemini-fast", rate: 0.7 },
      { id: genId(), tokenGroup: "grok-fast", rate: 0.8 },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────

export default function GroupRateSettings() {
  const { toast } = useToast();

  // Top-level edit mode
  const [editMode, setEditMode] = useState<EditMode>("visual");

  // ── Visual state ──
  const [groups, setGroups] = useState<GroupConfig[]>(DEFAULT_GROUPS);
  const [autoGroupEnabled, setAutoGroupEnabled] = useState(false);
  const [autoGroups, setAutoGroups] = useState<string[]>(DEFAULT_AUTO_GROUPS);
  const [specialRates, setSpecialRates] = useState<SpecialRateGroup[]>(DEFAULT_SPECIAL_RATES);
  const [specialAvailable, setSpecialAvailable] = useState<SpecialAvailableGroup[]>(DEFAULT_SPECIAL_AVAILABLE);
  const [rebateRates, setRebateRates] = useState<RebateRateGroup[]>(DEFAULT_REBATE_RATES);

  // Expand states
  const [expandedSpecialRateGroups, setExpandedSpecialRateGroups] = useState<Set<string>>(new Set(["vip"]));
  const [expandedSpecialAvailableGroups, setExpandedSpecialAvailableGroups] = useState<Set<string>>(new Set(["vip"]));
  const [expandedRebateRateGroups, setExpandedRebateRateGroups] = useState<Set<string>>(new Set(["vip"]));

  // ── Manual JSON state ──
  const [jsonValues, setJsonValues] = useState({
    groupRate: "",
    userSelectable: "",
    specialRate: "",
    specialAvailable: "",
    autoGroup: "",
    rebateEnabled: "",
    rebateRate: "",
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
    const rebateRate = stringifyJson(
      rebateRates.reduce((acc, rg) => {
        acc[rg.groupName] = rg.rules.reduce((racc, r) => {
          racc[r.tokenGroup] = r.rate;
          return racc;
        }, {} as Record<string, number>);
        return acc;
      }, {} as Record<string, Record<string, number>>)
    );
    const rebateEnabled = stringifyJson(
      groups
        .filter((g) => g.userSelectable && g.rebateEnabled)
        .reduce((acc, g) => {
          acc[g.name] = true;
          return acc;
        }, {} as Record<string, boolean>)
    );
    setJsonValues({
      groupRate,
      userSelectable,
      specialRate,
      specialAvailable: specialAvail,
      autoGroup: auto,
      rebateEnabled,
      rebateRate,
    });
  }, [groups, specialRates, specialAvailable, autoGroups, rebateRates]);

  // ── Actions: Group Management ──
  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      { id: genId(), name: "", rate: 1, userSelectable: false, rebateEnabled: false, description: "" },
    ]);
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGroup = (id: string, patch: Partial<GroupConfig>) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, ...patch };
        if (patch.userSelectable === false) {
          updated.rebateEnabled = false;
        }
        return updated;
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
          ? {
              ...sg,
              rules: sg.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
            }
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
          ? {
              ...sg,
              rules: [...sg.rules, { id: genId(), action: "remove", key: "", value: "" }],
            }
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
          ? {
              ...sg,
              rules: sg.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
            }
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

  // ── Actions: Rebate Rates ──
  const addRebateRateRule = (groupName: string) => {
    setRebateRates((prev) =>
      prev.map((rg) =>
        rg.groupName === groupName
          ? { ...rg, rules: [...rg.rules, { id: genId(), tokenGroup: "", rate: 0.8 }] }
          : rg
      )
    );
  };

  const removeRebateRateRule = (groupName: string, ruleId: string) => {
    setRebateRates((prev) =>
      prev.map((rg) =>
        rg.groupName === groupName
          ? { ...rg, rules: rg.rules.filter((r) => r.id !== ruleId) }
          : rg
      )
    );
  };

  const updateRebateRateRule = (groupName: string, ruleId: string, patch: Partial<RebateRateRule>) => {
    setRebateRates((prev) =>
      prev.map((rg) =>
        rg.groupName === groupName
          ? {
              ...rg,
              rules: rg.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
            }
          : rg
      )
    );
  };

  const toggleRebateRateGroup = (groupName: string) => {
    setExpandedRebateRateGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  // ── Available groups for selects ──
  const groupNames = useMemo(() => groups.map((g) => g.name).filter((n) => n), [groups]);

  // ── Apply manual JSON ──
  const applyManualJson = () => {
    try {
      // Parse group rates
      const groupRateObj = JSON.parse(jsonValues.groupRate || "{}") as Record<string, number>;
      const userSelectableObj = JSON.parse(jsonValues.userSelectable || "{}") as Record<string, string>;

      const rebateEnabledObj = JSON.parse(jsonValues.rebateEnabled || "{}") as Record<string, boolean>;
      const newGroups: GroupConfig[] = Object.entries(groupRateObj).map(([name, rate]) => ({
        id: genId(),
        name,
        rate: typeof rate === "number" ? rate : 1,
        userSelectable: name in userSelectableObj,
        rebateEnabled: name in rebateEnabledObj,
        description: userSelectableObj[name] || "",
      }));
      setGroups(newGroups);

      // Parse auto groups
      const autoArr = JSON.parse(jsonValues.autoGroup || "[]") as string[];
      setAutoGroups(Array.isArray(autoArr) ? autoArr : []);

      // Parse special rates
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

      // Parse special available
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

      // Parse rebate rates
      const rebateRateObj = JSON.parse(jsonValues.rebateRate || "{}") as Record<string, Record<string, number>>;
      const newRebateRates: RebateRateGroup[] = Object.entries(rebateRateObj).map(([groupName, rules]) => ({
        groupName,
        rules: Object.entries(rules).map(([tokenGroup, rate]) => ({
          id: genId(),
          tokenGroup,
          rate: typeof rate === "number" ? rate : 1,
        })),
      }));
      setRebateRates(newRebateRates);

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
        <div className="space-y-8">
          {/* Group Management */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-1">分组管理</h3>
            <p className="text-xs text-muted-foreground mb-3">
              设置用于计费系数，勾选「用户可选」后用户可在创建令牌时选择该分组
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">分组名称</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground w-24">倍率</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">用户可选</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">返券开关</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">描述</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groups.map((g) => (
                    <tr key={g.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <Input
                          value={g.name}
                          onChange={(e) => updateGroup(g.id, { name: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="分组名称"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={g.rate}
                          onChange={(e) => updateGroup(g.id, { rate: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-sm"
                          step={0.1}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Checkbox
                          checked={g.userSelectable}
                          onCheckedChange={(v) => updateGroup(g.id, { userSelectable: !!v })}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Checkbox
                          checked={g.rebateEnabled}
                          disabled={!g.userSelectable}
                          onCheckedChange={(v) => g.userSelectable && updateGroup(g.id, { rebateEnabled: !!v })}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={g.description}
                          onChange={(e) => updateGroup(g.id, { description: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="描述"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeGroup(g.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">返券开关仅对勾选“用户可选”的用户分组可用，非用户分组无法开启返券。</p>
            <Button variant="ghost" className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={addGroup}>
              <Plus className="w-4 h-4 mr-1" />
              添加分组
            </Button>
          </section>

          {/* Auto Group */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-1">自动分组</h3>
            <p className="text-xs text-muted-foreground mb-3">
              令牌分组设为 auto 时，按以下顺序依次尝试选择可用分组，排在前面的优先级更高
            </p>
            <div className="flex items-center gap-3 mb-3 p-3 bg-muted/30 rounded-lg">
              <Switch
                id="auto-group"
                checked={autoGroupEnabled}
                onCheckedChange={setAutoGroupEnabled}
              />
              <label htmlFor="auto-group" className="text-sm font-medium cursor-pointer">
                默认使用auto分组
              </label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              开启后创建令牌默认选择auto分组，初始令牌也将设为auto
            </p>
            <div className="space-y-2">
              {autoGroups.map((ag, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2">
                  <span className="text-sm text-muted-foreground w-6">{idx + 1}</span>
                  <Select value={ag} onValueChange={(v) => updateAutoGroup(idx, v)}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="选择分组" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupNames.map((gn) => (
                        <SelectItem key={gn} value={gn}>
                          {gn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeAutoGroup(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={addAutoGroup}>
              <Plus className="w-4 h-4 mr-1" />
              添加分组
            </Button>
          </section>

          {/* Special Rate */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-1">分组特殊倍率</h3>
            <p className="text-xs text-muted-foreground mb-3">
              当某个分组的用户使用另一个分组的令牌时，可设置特殊倍率覆盖基础倍率。例如：vip 分组的用户使用 default 分组时倍率为 0.5
            </p>
            <div className="space-y-3">
              {specialRates.map((sg) => (
                <div key={sg.groupName} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleSpecialRateGroup(sg.groupName)}
                  >
                    {expandedSpecialRateGroups.has(sg.groupName) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{sg.groupName}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {sg.rules.length} 条规则
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSpecialRateRule(sg.groupName);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        className="text-destructive hover:text-destructive/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                  {expandedSpecialRateGroups.has(sg.groupName) && (
                    <div className="p-4 space-y-3">
                      {sg.rules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-3">
                          <Select
                            value={rule.targetGroup}
                            onValueChange={(v) => updateSpecialRateRule(sg.groupName, rule.id, { targetGroup: v })}
                          >
                            <SelectTrigger className="w-40 h-8 text-sm">
                              <SelectValue placeholder="选择用户分组" />
                            </SelectTrigger>
                            <SelectContent>
                              {groupNames.map((gn) => (
                                <SelectItem key={gn} value={gn}>
                                  {gn}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={rule.rate}
                            onChange={(e) =>
                              updateSpecialRateRule(sg.groupName, rule.id, { rate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 h-8 text-sm"
                            step={0.1}
                          />
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeSpecialRateRule(sg.groupName, rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {sg.rules.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无规则</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Select
                onValueChange={(v) => {
                  if (!specialRates.find((sg) => sg.groupName === v)) {
                    setSpecialRates((prev) => [...prev, { groupName: v, rules: [] }]);
                    setExpandedSpecialRateGroups((prev) => new Set(prev).add(v));
                  }
                }}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="选择用户分组" />
                </SelectTrigger>
                <SelectContent>
                  {groupNames.map((gn) => (
                    <SelectItem key={gn} value={gn}>
                      {gn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                onClick={addSpecialRateGroup}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加分组规则
              </Button>
            </div>
          </section>

          {/* Rebate Rate */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-1">分组返券倍率</h3>
            <p className="text-xs text-muted-foreground mb-3">
              配置为 true 的用户分组下，不同令牌分组的账后返券倍率。客户调用时仍按实时扣费规则扣费，账后根据该倍率计算应返券金额
            </p>
            <div className="space-y-3">
              {rebateRates.map((rg) => (
                <div key={rg.groupName} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleRebateRateGroup(rg.groupName)}
                  >
                    {expandedRebateRateGroups.has(rg.groupName) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{rg.groupName}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {rg.rules.length} 条规则
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          addRebateRateRule(rg.groupName);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        className="text-destructive hover:text-destructive/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                  {expandedRebateRateGroups.has(rg.groupName) && (
                    <div className="p-4 space-y-3">
                      {rg.rules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-3">
                          <Input
                            value={rule.tokenGroup}
                            onChange={(e) =>
                              updateRebateRateRule(rg.groupName, rule.id, { tokenGroup: e.target.value })
                            }
                            className="w-40 h-8 text-sm"
                            placeholder="令牌分组"
                          />
                          <Input
                            type="number"
                            value={rule.rate}
                            onChange={(e) =>
                              updateRebateRateRule(rg.groupName, rule.id, { rate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 h-8 text-sm"
                            step={0.1}
                          />
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeRebateRateRule(rg.groupName, rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {rg.rules.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无规则</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Select
                onValueChange={(v) => {
                  if (!rebateRates.find((rg) => rg.groupName === v)) {
                    setRebateRates((prev) => [...prev, { groupName: v, rules: [] }]);
                    setExpandedRebateRateGroups((prev) => new Set(prev).add(v));
                  }
                }}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="选择用户分组" />
                </SelectTrigger>
                <SelectContent>
                  {groupNames.map((gn) => (
                    <SelectItem key={gn} value={gn}>
                      {gn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                onClick={() => {
                  toast({ title: "请先选择用户分组", description: "在下方的下拉框中选择分组后添加规则" });
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加分组规则
              </Button>
            </div>
          </section>

          {/* Special Available Groups */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-1">分组特殊可用分组</h3>
            <p className="text-xs text-muted-foreground mb-3">
              为特定用户分组配置可用分组的增减规则。「添加」为该分组新增可用分组，「移除」移除默认可用分组，「追加」直接追加分组
            </p>
            <div className="space-y-3">
              {specialAvailable.map((sg) => (
                <div key={sg.groupName} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => toggleSpecialAvailableGroup(sg.groupName)}
                  >
                    {expandedSpecialAvailableGroups.has(sg.groupName) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{sg.groupName}</span>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {sg.rules.length} 条规则
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSpecialAvailableRule(sg.groupName);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        className="text-destructive hover:text-destructive/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                  {expandedSpecialAvailableGroups.has(sg.groupName) && (
                    <div className="p-4 space-y-3">
                      {sg.rules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-3">
                          <Select
                            value={rule.action}
                            onValueChange={(v) =>
                              updateSpecialAvailableRule(sg.groupName, rule.id, { action: v as any })
                            }
                          >
                            <SelectTrigger className="w-28 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="remove">
                                <span className="text-red-500">移除(-)</span>
                              </SelectItem>
                              <SelectItem value="append">
                                <span className="text-blue-500">追加</span>
                              </SelectItem>
                              <SelectItem value="add">
                                <span className="text-green-500">添加(+)</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={rule.key}
                            onChange={(e) =>
                              updateSpecialAvailableRule(sg.groupName, rule.id, { key: e.target.value })
                            }
                            className="w-32 h-8 text-sm"
                            placeholder="键名"
                          />
                          <span className="text-muted-foreground">→</span>
                          <Input
                            value={rule.value}
                            onChange={(e) =>
                              updateSpecialAvailableRule(sg.groupName, rule.id, { value: e.target.value })
                            }
                            className="w-40 h-8 text-sm"
                            placeholder="分组名称"
                          />
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeSpecialAvailableRule(sg.groupName, rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {sg.rules.length === 0 && (
                        <p className="text-sm text-muted-foreground">暂无规则</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Select
                onValueChange={(v) => {
                  if (!specialAvailable.find((sg) => sg.groupName === v)) {
                    setSpecialAvailable((prev) => [...prev, { groupName: v, rules: [] }]);
                    setExpandedSpecialAvailableGroups((prev) => new Set(prev).add(v));
                  }
                }}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="选择用户分组" />
                </SelectTrigger>
                <SelectContent>
                  {groupNames.map((gn) => (
                    <SelectItem key={gn} value={gn}>
                      {gn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                onClick={() => {
                  toast({ title: "请先选择用户分组", description: "在下方的下拉框中选择分组后添加规则" });
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加分组规则
              </Button>
            </div>
          </section>

          {/* Save Button */}
          <div>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
              保存分组相关设置
            </Button>
          </div>
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
          </div>

          {/* Rebate Enabled */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">分组返券开关</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.rebateEnabled}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, rebateEnabled: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              控制用户分组是否参与账后返券，格式为 JSON 字符串，例如：{"{"}"default": true, "vip": true{"}"}。配置为 true 的用户分组参与账后返券；配置为 false 或未配置的用户分组不参与账后返券；不参与返券的用户分组，月账单中不生成应返券金额
            </p>
          </div>

          {/* Special Rates */}
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
          </div>

          {/* Rebate Rate */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">分组返券倍率</label>
            <textarea
              className="w-full h-32 p-3 border rounded-lg font-mono text-sm bg-gray-50 resize-y"
              value={jsonValues.rebateRate}
              onChange={(e) => setJsonValues((prev) => ({ ...prev, rebateRate: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              配置为 true 的用户分组下，不同令牌分组的账后返券倍率。例如：{"{"}"vip": {"{"}"openai-fast": 0.8, "claude-fast": 0.8, "gemini-fast": 0.7, "grok-fast": 0.8{"}"}{"}"}
            </p>
          </div>

          {/* Default auto group toggle */}
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
            <h4 className="text-base font-semibold text-foreground mb-2">分组返券开关</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`{
  "default": true,
  "svip": true,
  "vip": true
}`}
            </pre>
            <p>
              控制用户分组是否参与账后返券。配置为 true 的用户分组参与账后返券；配置为 false 或未配置的用户分组不参与账后返券；不参与返券的用户分组，月账单中不生成应返券金额
            </p>
          </section>

          <section>
            <h4 className="text-base font-semibold text-foreground mb-2">分组返券倍率</h4>
            <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono mb-2">
{`{
  "vip": {
    "openai-fast": 0.8,
    "claude-fast": 0.8,
    "gemini-fast": 0.7,
    "grok-fast": 0.8
  }
}`}
            </pre>
            <p>
              配置为 true 的用户分组下，不同令牌分组的账后返券倍率。客户调用时仍按实时扣费规则扣费，账后根据该倍率计算应返券金额
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
