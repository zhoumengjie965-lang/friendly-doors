
## 「一键配置预算」功能实现计划

### 文件：仅修改 `src/pages/OrgGovernance.tsx`

---

### 新增 State

```ts
const [showBudgetDialog, setShowBudgetDialog] = useState(false);
const [totalPackage, setTotalPackage] = useState("");
const [distributing, setDistributing] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<SubOrg | null>(null);
// 数值跳动动画 key（变化时 re-render 触发 CSS animation）
const [statsFlashKey, setStatsFlashKey] = useState(0);
```

---

### 功能 1 — 「一键配置预算」按钮

在 Header 右侧，「创建部门」下拉按钮**旁边**（Header 区域 line 319-341）增加按钮：

```tsx
<Button variant="outline" onClick={() => setShowBudgetDialog(true)}>
  <Sliders className="w-4 h-4 mr-1.5" />一键配置预算
</Button>
```

---

### 功能 2 — 均分预算弹窗

新增 `Dialog` 组件，逻辑：

- 显示「企业剩余可分配额」= `budget - totalAllocated`（复用 overview 计算）
- 输入框 `totalPackage`（管理员要分出的总钱数）
- 实时文案：`共 {N} 个部门，每个部门将分得 ¥{(total / N).toFixed(2)}/月`
- N = `subOrgs.length`，totalPackage 为空或 N=0 时文案隐藏
- 确认时调用 `batchUpdateSubOrgBudget`（mock 实现：`setSubOrgs` 将所有子部门的 `monthlyBudget` 更新为均分值）
- 同时 `setStatsFlashKey(k => k+1)` 触发看板动画

```ts
function batchUpdateSubOrgBudget(perBudget: number) {
  setSubOrgs(prev => prev.map(s => ({
    ...s,
    monthlyBudget: perBudget,
    warningThreshold: 80,
  })));
  setStatsFlashKey(k => k+1);
  toast({ title: `已成功为 ${subOrgs.length} 个部门分配预算` });
  setShowBudgetDialog(false);
  setTotalPackage("");
}
```

---

### 功能 3 — 删除子部门时显示「即将回收预算」

将原来行内 `onClick(() => setSubOrgs.filter(...))` 改为先 `setDeleteTarget(s)` 打开确认弹窗。

新增 `DeleteOrgModal` 弹窗：

```tsx
<Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
  <DialogContent>
    <DialogTitle>删除子部门</DialogTitle>
    <p>确认删除「{deleteTarget?.name}」？</p>
    {deleteTarget?.monthlyBudget && (
      <div className="rounded-lg bg-muted/60 p-3 text-sm">
        即将回收至企业的预算金额：
        <span className="font-bold text-primary ml-1">¥{deleteTarget.monthlyBudget.toLocaleString()}/月</span>
      </div>
    )}
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
      <Button variant="destructive" onClick={() => {
        setSubOrgs(prev => prev.filter(x => x.id !== deleteTarget!.id));
        setStatsFlashKey(k => k+1);
        toast({ title: "子部门已删除", description: `¥${deleteTarget!.monthlyBudget ?? 0} 预算已回收` });
        setDeleteTarget(null);
      }}>确认删除</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 功能 4 — 新建子部门预算为 0 时显示 Alert

在 `activeTab === "sub-orgs"` 内容区顶部，检测最近一次创建的子部门是否有预算：

```ts
const hasUnbudgetedSubOrg = subOrgs.some(s => !s.monthlyBudget || s.monthlyBudget === 0);
```

若 `hasUnbudgetedSubOrg` 为真，在 `<Table>` 之前渲染 Alert：

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

{hasUnbudgetedSubOrg && (
  <div className="px-4 pt-3">
    <Alert>
      <AlertTriangle className="w-4 h-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>存在未分配预算的子部门，新部门需要分配预算后方可使用。</span>
        <button
          className="text-primary text-xs underline ml-2 shrink-0"
          onClick={() => setShowBudgetDialog(true)}
        >
          立即均分
        </button>
      </AlertDescription>
    </Alert>
  </div>
)}
```

---

### 功能 5 — 看板数值跳动动画

在 `index.css`（或 tailwind config）中已有 `tailwindcss-animate`，直接用内联 className 实现跳动：

在三个 Overview 卡片的主指标 `<p>` 上加 `key={statsFlashKey}` + `animate-in zoom-in-95 duration-300`：

```tsx
<p key={statsFlashKey} className="text-3xl font-bold text-foreground mt-0.5 tabular-nums animate-in zoom-in-95 duration-300">
  {budget > 0 ? `¥${budget.toLocaleString()}` : ...}
</p>
```

每次调用 `setStatsFlashKey(k => k+1)` 时，key 变化 → React 重新挂载元素 → 触发 `animate-in` 动画。这样预算规划、实时消耗指标都会在数值变化时有微弱的放大-缩小跳动效果。

---

### 新增 import

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Sliders } from "lucide-react";
```

---

### 修改范围总结

| 位置 | 改动 |
|------|------|
| State 区（~line 83-115）| 增加 5 个新 state |
| Header 区（~line 319）| 增加「一键配置预算」按钮 |
| Overview 卡片主指标（~line 386-422）| 加 `key={statsFlashKey}` + animate class |
| 子部门 Tab 内容顶部（~line 634）| 加 Alert 组件 |
| 子部门行删除按钮（~line 703-711）| 改为打开 DeleteTarget 弹窗 |
| 文件底部 dialogs 区（~line 891+）| 增加均分预算弹窗 + 删除确认弹窗 |
