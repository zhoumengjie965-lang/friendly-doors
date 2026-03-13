## Current State Analysis

The current `DeptManagement.tsx` (1420 lines) has:

- **Left tree**: Flat list (no hierarchy/nesting), all DB orgs shown as siblings
- **OrgView (right)**: Has a Tab switcher — "直属成员" + "下属子部门" tabs
- **TransferMemberDialog**: Flat list of orgs (not tree-structured)
- **RootView**: Shows org governance table — currently lists all orgs, but has "创建部门" button at top

---

## What needs to change

### 1. Remove "下属子部门" Tab from OrgView

- Delete the tab switcher entirely from the `Card` header
- Remove `activeTab` state, `setActiveTab`, the sub-orgs Tab JSX, the sub-orgs table, mock data, budget dialog for sub-orgs, createSubOrg state/dialog, `deleteTarget` state
- Remove `showCreateSubOrg`, `subOrgName`, `subOrgBudget`, `subOrgAdminName`, `subOrgAdminPhone`, `subOrgs`, `setSubOrgs` state
- Remove `budgetDialogMode === "sub-orgs"` branch from the budget dialog
- Right panel card: show only the member table directly, no tabs
- The 3 stat cards at top of OrgView stay (budget/consumption/assets)

### 2. Upgrade the Org Tree — recursive support + "创建子部门" button

**Data model**: Add a `parent_id` field concept. The `organizations` table likely already has or can be assumed to have a `parent_id`. Need to check. From the DB schema knowledge file, the orgs come from `organizations` table. We'll query with `parent_id` if it exists.

Actually — looking at the `Org` interface, there's no `parent_id`. We'll add it to the type (it may exist in DB or can be null for root-level orgs).

**Tree building**: Build a recursive tree from flat org list using `parent_id`:

```
root (enterprise)
├─ org1 (parent_id = null)
│   ├─ org3 (parent_id = org1.id)
│   └─ org4 (parent_id = org1.id)  
└─ org2 (parent_id = null)
```

**Visual indentation**: Use `depth * 16px` padding for each level

**Expand/Collapse**: Nodes with children get a chevron toggle

### 3. "创建子部门" button in top action bar of OrgView

When a dept node is selected:

- Right side top bar has two buttons: **"+ 添加成员"** and **"+ 创建子部门"**
- "创建子部门" opens a dialog (reuse/adapt `CreateOrgDialog` or inline) that creates a new org with `parent_id = selectedNode`
- After creation, call `loadOrgs()` — the new org appears in the tree under the selected parent

### 4. Breadcrumb navigation

Show breadcrumb path in the right panel header following the selected node:

- Root selected → "企业总部"
- Dept selected → "企业总部 > 算法部门"
- Sub-dept selected → "企业总部 > 算法部门 > 机器学习组"

### 5. TransferMemberDialog — tree-structured

Replace the flat list with a recursive tree matching the left sidebar, using radio selection. Filter out the current org. Nodes with children show indented.

---

## Implementation Plan

### File: `src/pages/DeptManagement.tsx` — targeted edits

**Step 1**: Update `Org` interface to include `parent_id?: string | null`

**Step 2**: Update `loadOrgs` query to fetch `parent_id` field

**Step 3**: Add tree-building utilities:

```ts
type OrgTreeNode = Org & { children: OrgTreeNode[] }
function buildTree(orgs: Org[], parentId: string | null = null): OrgTreeNode[]
function flattenTree(nodes: OrgTreeNode[], depth = 0): { node: OrgTreeNode, depth: number }[]
function getAncestors(orgs: Org[], nodeId: string): Org[]
```

**Step 4**: Update `DeptManagement` main component:

- Add `expandedNodes: Set<string>` state
- Replace flat `treeNodes` with recursive tree rendering using `buildTree`
- Render tree recursively with chevron expand/collapse buttons
- Compute `breadcrumb` from `selectedNode` using `getAncestors`

**Step 5**: Update `OrgView` component:

- Remove all `activeTab`, `subOrgs`, `showCreateSubOrg` related state (~20 state vars gone)
- Remove the tab switcher JSX from `CardHeader`
- Remove the "下属子部门" Tab content
- Remove `budgetDialogMode === "sub-orgs"` branch
- Update the 3 stat cards: "组织资产" card → change "下级部门" count from `subOrgs.length` to `orgs.filter(o => o.parent_id === orgId).length`
- Add `onCreateSubOrg` prop + "创建子部门" button at top (alongside "添加成员")
- Keep all member table/sheet/dialog logic intact

**Step 6**: Add `CreateSubOrgDialog` inline — a simple dialog with `name` input + optional `monthly_budget`, creates org with `parent_id = orgId`

**Step 7**: Update `TransferMemberDialog`:

- Accept tree structure instead of flat orgs
- Render recursive tree with indentation
- Radio select by clicking any non-locked node

**Step 8**: In the right panel wrapper, add breadcrumb bar above the content:

```tsx
<div className="flex items-center gap-1.5 text-sm text-muted-foreground pb-4 border-b mb-6">
  <span>企业总部</span> / <span className="text-foreground">算法部门</span>
</div>
```

---

## Files to edit

1. `src/pages/DeptManagement.tsx` — single file, multiple targeted edits

No other files need changes.

---

## What's preserved

- All 3 stat cards in OrgView (budget/consumption/assets) — untouched
- All member table columns, status badges, action menus
- All existing dialogs (edit member, add member single/bulk, budget config)
- Transfer member feature — upgraded to tree-structured
- Permission logic (admin vs org_admin)
- RootView entirely untouched

&nbsp;

## Goal

Reorganize button layout in `OrgView` (the department detail view):

- **Page-level**: "创建子部门" + "部门批量分配" → move to the right side of the **page header** (top of OrgView), only shown when selected node is not a leaf (has children)
- **Table-level**: "添加成员" + "成员批量分配" → move to a toolbar row just above/alongside the member table (inside the Card header), always visible in the member section
- Remove the tab-based button switching (currently buttons swap based on `activeTab`)

## Current State

The existing button layout (lines 833–847) is:

- Inside `CardHeader`, conditionally showing either member-buttons or sub-org-buttons depending on `activeTab`
- The header section (lines 734–740) has no action buttons at all

## Changes — `src/pages/DeptManagement.tsx` only

### Change 1: Page header — add page-level action buttons (lines 734–740)

The `OrgView` header needs two new props passed down:

- `hasChildren: boolean` — whether selectedOrg has sub-orgs in the tree
- The two buttons "部门批量分配" and "+ 创建子部门" appear in the header `flex justify-between` row, only if `hasChildren === true`

Since `subOrgs` state (MOCK_SUB_ORGS) represents children, we use `subOrgs.length > 0` as the "has children" check (or also check DB orgs with `parent_id`). For now: show these buttons when `subOrgs.length > 0` OR always show them when in OrgView (simpler — the user said "非末梢节点", meaning orgs that have sub-orgs). 

**Decision**: Show "部门批量分配" + "创建子部门" buttons in the page header always when an org node is selected (they pertain to children management). This is consistent and avoids needing a `parent_id` lookup for "has children" since the tree isn't recursive yet.

Actually re-reading: "仅在左侧组织树选中'非末梢节点'时显示" — only show when the node has children. We can check if any org in the tree has a `parent_id === orgId`. Since `parent_id` isn't in the current Org type, we'll use `subOrgs.length > 0` as the proxy (mock data), which is the existing sub-orgs list.

```tsx
// Header changes (lines 734–740):
<div className="flex items-center justify-between">
  <div>
    <h1>...</h1>
    <p>...</p>
  </div>
  {subOrgs.length > 0 && (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => { setBudgetDialogMode("sub-orgs"); setTotalPackage(""); setShowBudgetDialog(true); }}>
        <Sliders className="w-4 h-4 mr-1" />部门批量分配
      </Button>
      <Button size="sm" onClick={() => setShowCreateSubOrg(true)}>
        <Plus className="w-4 h-4 mr-1" />创建子部门
      </Button>
    </div>
  )}
</div>
```

### Change 2: Card header — remove tab-based button switching, always show member buttons (lines 822–848)

The `CardHeader` currently has tabs + conditional buttons. Since we're removing the "下属子部门" tab (per previous task), the tab switcher is still present in the current code (lines 826–831 still render tabs). The previous refactor task was approved but the tabs are still there — so we need to handle this.

New CardHeader: No tab switcher needed (only members tab). Just a fixed toolbar row:

```tsx
<CardHeader className="pb-0">
  <div className="flex items-center justify-between pb-3 border-b">
    <h3 className="font-semibold text-sm">直属成员</h3>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => { setBudgetDialogMode("members"); setMemberDailyLimit(""); setShowBudgetDialog(true); }}>
        <Sliders className="w-4 h-4 mr-1" />成员批量分配
      </Button>
      <Button size="sm" onClick={() => setShowAdd(true)}>
        <Plus className="w-4 h-4 mr-1" />添加成员
      </Button>
    </div>
  </div>
</CardHeader>
```

And always render the members `CardContent` (remove the `activeTab === "members"` conditional).

### Change 3: Keep sub-orgs tab content for now

Since the sub-orgs section should still be accessible somewhere (the task says to move navigation to tree), we keep `activeTab` state but make "直属成员" the only visible tab in the header. The sub-orgs tab content remains but is just never shown via UI (effectively hidden). Actually, the cleaner approach: fully remove `activeTab`-based rendering and only show the members table. The sub-orgs display is handled by the org tree navigation.

## Summary of line-level edits

1. **Lines 734–740** — Add action buttons to page header (部门批量分配 + 创建子部门), conditional on `subOrgs.length > 0`
2. **Lines 822–848** — Replace tab+conditional-buttons CardHeader with a fixed "直属成员" label + member action buttons
3. **Lines 851–852** — Remove `{activeTab === "members" && (` guard (always show member table)
4. **Line 947** — Remove closing `)}` of the activeTab guard
5. **Lines 950–1028** — Remove the entire "下属子部门" tab content block

**File**: `src/pages/DeptManagement.tsx` only