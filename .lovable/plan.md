
## Goal
In the `OrgView` right-side header:
1. Always show `创建子部门` and `子部门批量分配` buttons (not conditional on `hasChildren`)
2. Wire `子部门批量分配` to a proper sub-dept budget distribution dialog (total budget ÷ N child depts), matching `RootView`'s "一键配置预算" pattern
3. After creating a sub-dept, the left tree already refreshes via `onOrgUpdated()` — this is already working

---

## Current State

```
Lines 746–755 (OrgView header):
  {hasChildren && (
    <div className="flex items-center gap-2">
      <Button ... onClick={() => { setMemberDailyLimit(""); setShowBudgetDialog(true); }}>部门批量分配</Button>
      <Button ... onClick={() => setShowCreateSubOrg(true)}>创建子部门</Button>
    </div>
  )}
```

Problems:
- Buttons hidden when `hasChildren === false` (new depts with no sub-depts yet don't see "创建子部门")
- `部门批量分配` incorrectly opens the **member** batch dialog (`showBudgetDialog`) instead of a sub-dept budget dialog

---

## Changes — `src/pages/DeptManagement.tsx` only

### 1. Add new state for sub-dept batch dialog (in `OrgView`)
Add two new state vars after existing state block (around line 605):
```ts
const [showSubOrgBudgetDialog, setShowSubOrgBudgetDialog] = useState(false);
const [subOrgTotalPackage, setSubOrgTotalPackage] = useState("");
const [subOrgDistributing, setSubOrgDistributing] = useState(false);
```

### 2. Remove `{hasChildren && ...}` guard on header buttons (lines 746–755)
Replace with always-visible buttons. Fix the `部门批量分配` onClick to open the new `showSubOrgBudgetDialog` instead of the member dialog:
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm"
    onClick={() => { setSubOrgTotalPackage(""); setShowSubOrgBudgetDialog(true); }}
    className="gap-1.5">
    <Sliders className="w-3.5 h-3.5" />子部门批量分配
  </Button>
  <Button size="sm" onClick={() => setShowCreateSubOrg(true)} className="gap-1.5">
    <Plus className="w-3.5 h-3.5" />创建子部门
  </Button>
</div>
```

### 3. Add sub-dept batch budget dialog (after the existing member batch dialog, around line 1124)
Mirrors `RootView`'s 一键配置预算 dialog but scoped to `childOrgs` (orgs where `parent_id === orgId`):
```tsx
{/* 子部门批量分配 Dialog */}
{(() => {
  const childOrgs = orgs.filter(o => o.parent_id === orgId);
  const n = childOrgs.length;
  const pkg = Number(subOrgTotalPackage);
  const perBudget = n > 0 && pkg > 0 ? pkg / n : 0;
  return (
    <Dialog open={showSubOrgBudgetDialog} onOpenChange={...}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>子部门批量分配</DialogTitle>
          <DialogDescription>将总预算均分给当前部门下的所有子部门。</DialogDescription>
        </DialogHeader>
        <Input ... value={subOrgTotalPackage} />
        {n > 0 && pkg > 0 && <preview line: n depts, perBudget each>}
        {n === 0 && <p>当前部门暂无子部门</p>}
        <DialogFooter>
          <Button variant="outline">取消</Button>
          <Button disabled={subOrgDistributing || n === 0 || pkg <= 0}
            onClick={async () => {
              // update monthly_budget for each child org
              await Promise.all(childOrgs.map(o => supabase.from("organizations").update({ monthly_budget: perBudget }).eq("id", o.id)));
              toast({ title: `已为 ${n} 个子部门分配预算` });
              setShowSubOrgBudgetDialog(false);
              onOrgUpdated();
            }}>确认均分</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
})()}
```

---

## Files to edit
- `src/pages/DeptManagement.tsx` — targeted edits at 3 locations:
  1. State declarations (add 3 vars after line 605)
  2. Header buttons block (lines ~746–755: remove `hasChildren &&` guard + fix onClick)
  3. After the member batch dialog (after line 1124: add sub-dept batch dialog)
