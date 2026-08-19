import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { getCurrentPhone } from "@/lib/auth";
import {
  createDeptModelPolicy,
  deleteDeptModelPolicy,
  getMockData,
  getPolicyImpact,
  listDeptModelPolicies,
  updateDeptModelPolicy,
  type MockDeptModelPolicy,
} from "@/lib/mockData";
import { ALL_MODELS } from "@/lib/groupModels";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface DeptOption {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
}

interface DeptModelPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId: string;
  onSaved?: () => void;
  orgs?: Array<{ id: string; name: string }>;
  org?: { id: string; name: string } | null;
}

export default function DeptModelPolicyDialog({
  open,
  onOpenChange,
  enterpriseId,
  onSaved,
  orgs,
}: DeptModelPolicyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policies, setPolicies] = useState<MockDeptModelPolicy[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<MockDeptModelPolicy | null>(null);
  const [applyOrgIds, setApplyOrgIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBoundOrgs, setFormBoundOrgs] = useState<string[]>([]);
  const [formAllowedModels, setFormAllowedModels] = useState<string[] | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [impact, setImpact] = useState({ deptCount: 0, keyCount: 0 });
  const [deleteTarget, setDeleteTarget] = useState<MockDeptModelPolicy | null>(null);

  const deptOptions = useMemo<DeptOption[]>(() => {
    try {
      const allowedIds = orgs?.length ? new Set(orgs.map((item) => item.id)) : null;
      return getMockData().organizations
        .filter(
          (item) =>
            item.enterprise_id === enterpriseId &&
            item.status === "active" &&
            (!allowedIds || allowedIds.has(item.id)),
        )
        .map(({ id, name, parent_id, level }) => ({
          id,
          name,
          parentId: parent_id,
          level,
        }));
    } catch {
      return (orgs ?? []).map(({ id, name }) => ({ id, name, parentId: null, level: 1 }));
    }
  }, [enterpriseId, open, orgs]);

  const deptTree = useMemo(() => {
    const result: Array<DeptOption & { depth: number }> = [];
    const optionIds = new Set(deptOptions.map((item) => item.id));
    const appendChildren = (parentId: string | null, depth: number) => {
      deptOptions
        .filter((item) => {
          const normalizedParent = item.parentId && optionIds.has(item.parentId) ? item.parentId : null;
          return normalizedParent === parentId;
        })
        .forEach((item) => {
          result.push({ ...item, depth });
          appendChildren(item.id, depth + 1);
        });
    };
    appendChildren(null, 0);
    return result;
  }, [deptOptions]);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      setPolicies(await listDeptModelPolicies(enterpriseId));
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [enterpriseId]);

  useEffect(() => {
    if (!open) return;
    void fetchPolicies();
    setEditingId(null);
    setViewingId(null);
    setApplyTarget(null);
    setCreating(false);
  }, [fetchPolicies, open]);

  const resetForm = () => {
    setFormName("");
    setFormBoundOrgs([]);
    setFormAllowedModels([]);
    setModelSearch("");
    setModelPickerOpen(false);
  };

  const handleNew = () => {
    resetForm();
    setFormBoundOrgs([]);
    setCreating(true);
    setEditingId(null);
    setViewingId(null);
  };

  const loadPolicyForm = (policy: MockDeptModelPolicy) => {
    setFormName(policy.name);
    setFormBoundOrgs([...policy.bound_org_ids]);
    setFormAllowedModels(policy.allowed_models ? [...policy.allowed_models] : [...ALL_MODELS]);
    setModelSearch("");
    setModelPickerOpen(false);
  };

  const handleView = (policy: MockDeptModelPolicy) => {
    loadPolicyForm(policy);
    setViewingId(policy.id);
    setEditingId(null);
    setCreating(false);
  };

  const handleEdit = (policy: MockDeptModelPolicy) => {
    loadPolicyForm(policy);
    setEditingId(policy.id);
    setViewingId(null);
    setCreating(false);
  };

  const handleApply = (policy: MockDeptModelPolicy) => {
    setApplyTarget(policy);
    setApplyOrgIds(new Set(policy.bound_org_ids));
  };

  const handleCancelEdit = () => {
    resetForm();
    setEditingId(null);
    setViewingId(null);
    setCreating(false);
  };

  const handlePreSave = () => {
    if (!formName.trim()) {
      toast({ title: "请输入策略名称", variant: "destructive" });
      return;
    }
    if (formAllowedModels !== null && formAllowedModels.length === 0) {
      toast({ title: "请至少选择一个允许访问的模型", variant: "destructive" });
      return;
    }
    if (!editingId) {
      void handleSave();
      return;
    }
    setImpact(getPolicyImpact(enterpriseId, formBoundOrgs));
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const operator = getCurrentPhone();
      let createdPolicy: MockDeptModelPolicy | null = null;
      if (editingId) {
        await updateDeptModelPolicy(
          enterpriseId,
          editingId,
          formName.trim(),
          formBoundOrgs,
          formAllowedModels,
          operator,
        );
      } else {
        createdPolicy = await createDeptModelPolicy(
          enterpriseId,
          formName.trim(),
          formBoundOrgs,
          formAllowedModels,
          operator,
        );
      }
      toast({ title: editingId ? "策略已更新" : "策略已创建", description: `「${formName.trim()}」已生效` });
      setConfirmOpen(false);
      handleCancelEdit();
      await fetchPolicies();
      if (createdPolicy) {
        setApplyTarget(createdPolicy);
        setApplyOrgIds(new Set());
      }
      onSaved?.();
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteDeptModelPolicy(enterpriseId, deleteTarget.id, getCurrentPhone());
      toast({ title: "策略已删除", description: `「${deleteTarget.name}」已删除` });
      setDeleteTarget(null);
      await fetchPolicies();
      onSaved?.();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplySave = async () => {
    if (!applyTarget) return;
    setSaving(true);
    try {
      const operator = getCurrentPhone();
      const selectedIds = [...applyOrgIds];
      await Promise.all(
        policies
          .filter(
            (policy) =>
              policy.id !== applyTarget.id &&
              policy.bound_org_ids.some((id) => applyOrgIds.has(id)),
          )
          .map((policy) =>
            updateDeptModelPolicy(
              enterpriseId,
              policy.id,
              policy.name,
              policy.bound_org_ids.filter((id) => !applyOrgIds.has(id)),
              policy.allowed_models,
              operator,
            ),
          ),
      );
      await updateDeptModelPolicy(
        enterpriseId,
        applyTarget.id,
        applyTarget.name,
        selectedIds,
        applyTarget.allowed_models,
        operator,
      );
      toast({ title: "部门配置已更新", description: `「${applyTarget.name}」已应用到所选部门` });
      setApplyTarget(null);
      await fetchPolicies();
      onSaved?.();
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isEditing = creating || editingId !== null;
  const isViewing = viewingId !== null;
  const filteredModels = ALL_MODELS.filter(
    (model) => model.toLowerCase().includes(modelSearch.trim().toLowerCase()),
  );
  const getOrgNames = (ids: string[]) =>
    deptOptions.filter((item) => ids.includes(item.id)).map((item) => item.name);
  const deleteDeptCount = deleteTarget?.bound_org_ids.length ?? 0;
  const overwriteDeptCount = applyTarget
    ? deptTree.filter(
        (department) =>
          applyOrgIds.has(department.id) &&
          policies.some(
            (policy) =>
              policy.id !== applyTarget.id &&
              policy.bound_org_ids.includes(department.id),
          ),
      ).length
    : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex !w-[720px] !max-w-[720px] flex-col overflow-hidden p-0">
          <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              模型权限配置
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-primary/80">
                创建策略并绑定部门后，绑定部门下已有和新建的 API Key 均只能调用策略允许范围内的模型，策略保存后立即生效。
                <span className="font-medium text-red-600"> 未绑定策略的部门不受模型限制。</span>
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">策略列表</h3>
                {!isEditing && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleNew}>
                    <Plus className="h-3.5 w-3.5" />
                    新建策略
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {loading && <p className="py-2 text-xs text-muted-foreground">加载中...</p>}
                {!loading && policies.length === 0 && !isEditing && (
                  <p className="py-2 text-xs text-muted-foreground">暂无策略，点击“新建策略”开始配置。</p>
                )}
                {policies.map((policy) => {
                  return (
                    <div
                      key={policy.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
                        editingId === policy.id || viewingId === policy.id
                          ? "border-primary bg-primary/5"
                          : "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/40",
                      )}
                      onClick={() => !isEditing && handleView(policy)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-sm font-medium">{policy.name}</span>
                        {policy.bound_org_ids.length > 0 ? (
                          <Badge className="h-5 shrink-0 border-green-200 bg-green-50 px-1.5 text-[10px] font-normal text-green-700 hover:bg-green-50">
                            已应用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] font-normal text-muted-foreground">
                            未应用
                          </Badge>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleApply(policy);
                          }}
                        >
                          应用到部门
                        </button>
                        <button
                          type="button"
                          title="编辑"
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(policy);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="删除"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(policy);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!isEditing && isViewing && (() => {
              const policy = policies.find((item) => item.id === viewingId);
              if (!policy) return null;
              const orgNames = getOrgNames(policy.bound_org_ids);
              return (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
                  <h3 className="text-sm font-semibold text-foreground">{policy.name}</h3>
                  <div>
                    <span className="text-xs text-muted-foreground">应用部门</span>
                    <p className="mt-0.5 text-sm text-foreground">
                      {orgNames.length > 0 ? orgNames.join("、") : "暂未应用到部门"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">模型限制</span>
                    <p className="mt-0.5 text-sm text-foreground">
                      {policy.allowed_models === null ? "所有模型" : policy.allowed_models.join("、")}
                    </p>
                  </div>
                </div>
              );
            })()}

            {isEditing && (
              <div className="space-y-5 rounded-lg border border-border bg-muted/30 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {editingId ? "编辑策略" : "新建策略"}
                  </h3>
                </div>

                <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                  <Label className="pt-2.5 text-right text-sm text-muted-foreground">
                    <span className="mr-0.5 text-destructive">*</span>策略名称
                  </Label>
                  <Input
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    placeholder="例如：普通部门模型策略"
                    maxLength={40}
                  />
                </div>

                <div>
                  <h3 className="mb-4 border-b border-border pb-2 text-sm font-semibold">模型权限</h3>
                  <div className="space-y-2">
                    {formAllowedModels !== null && (
                      <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                        <Label className="pt-2.5 text-right text-sm text-muted-foreground">
                          <span className="mr-0.5 text-destructive">*</span>模型限制列表
                        </Label>
                        <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
                          <PopoverTrigger asChild>
                            <div
                              role="button"
                              tabIndex={0}
                              className="flex min-h-10 cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 text-sm focus-within:ring-1 focus-within:ring-ring"
                            >
                              {formAllowedModels.length === 0 ? (
                                <span className="text-muted-foreground">请选择策略允许访问的模型</span>
                              ) : (
                                <>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    已选 {formAllowedModels.length} 个
                                  </span>
                                  {formAllowedModels.map((model) => (
                                    <span
                                      key={model}
                                      className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                                    >
                                      {model}
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setFormAllowedModels(formAllowedModels.filter((item) => item !== model));
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </>
                              )}
                              <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                            <div className="border-b p-2">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  value={modelSearch}
                                  onChange={(event) => setModelSearch(event.target.value)}
                                  placeholder="搜索模型"
                                  className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1">
                              {filteredModels.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">未找到模型</div>
                              ) : (
                                filteredModels.map((model) => {
                                  const checked = formAllowedModels.includes(model);
                                  return (
                                    <button
                                      key={model}
                                      type="button"
                                      className={cn(
                                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50",
                                        checked && "bg-blue-50 text-blue-700",
                                      )}
                                      onClick={() =>
                                        setFormAllowedModels(
                                          checked
                                            ? formAllowedModels.filter((item) => item !== model)
                                            : [...formAllowedModels, model],
                                        )
                                      }
                                    >
                                      <span className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded border",
                                        checked ? "border-blue-500 bg-blue-500 text-white" : "border-input",
                                      )}>
                                        {checked && <Check className="h-3 w-3" />}
                                      </span>
                                      <span className="flex-1 truncate">{model}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" onClick={handleCancelEdit}>取消</Button>
                  <Button onClick={handlePreSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? "保存中..." : editingId ? "保存策略" : "保存并应用到部门"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(applyTarget)} onOpenChange={(value) => !value && setApplyTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>应用策略到部门</DialogTitle>
          </DialogHeader>
          <p className="-mt-1 text-sm text-muted-foreground">
            将策略「<span className="font-medium text-foreground">{applyTarget?.name}</span>」应用到以下部门。
            一个部门只能使用一个模型策略，勾选后会自动覆盖该部门原有的策略绑定。
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {deptTree.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">暂无部门</p>
            ) : (
              deptTree.map((department) => {
                const checked = applyOrgIds.has(department.id);
                const boundElsewhere = policies.some(
                  (policy) =>
                    policy.id !== applyTarget?.id &&
                    policy.bound_org_ids.includes(department.id),
                );
                return (
                  <label
                    key={department.id}
                    className="relative flex cursor-pointer items-center gap-2 rounded-md py-2 pr-3 hover:bg-muted/50"
                    style={{ paddingLeft: `${12 + department.depth * 24}px` }}
                  >
                    {department.depth > 0 && (
                      <span
                        className="absolute top-1/2 h-4 w-3 -translate-y-1/2 rounded-bl border-b border-l border-border"
                        style={{ left: `${8 + (department.depth - 1) * 24}px` }}
                      />
                    )}
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setApplyOrgIds((current) => {
                          const next = new Set(current);
                          if (value) next.add(department.id);
                          else next.delete(department.id);
                          return next;
                        });
                      }}
                    />
                    <span className="flex-1 text-sm text-foreground">{department.name}</span>
                    {boundElsewhere && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <ShieldCheck className="h-3 w-3" />
                        已绑定其他策略
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
          {overwriteDeptCount > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              已选择 {overwriteDeptCount} 个绑定其他策略的部门，确定后将覆盖原策略。
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyTarget(null)} disabled={saving}>取消</Button>
            <Button onClick={handleApplySave} disabled={saving}>
              {saving ? "保存中..." : "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              确认保存策略？
            </DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              保存后将立即更新已绑定的
              <span className="font-medium text-foreground"> {impact.deptCount} </span>
              个部门，现有及后续新建的 Key 均按新策略限制。确认保存？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "保存中..." : "确认保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              确认删除策略？
            </DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              删除策略“{deleteTarget?.name}”后，
              <span className="font-medium text-foreground"> {deleteDeptCount} </span>
              个部门的现有及后续新建 Key 均不再受限，原受限模型可能恢复调用。确认删除？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
