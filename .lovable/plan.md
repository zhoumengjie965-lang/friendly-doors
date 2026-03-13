
## Goal
Merge "部门治理" (OrgManagement) and "部门管理" (OrgGovernance) into a single **"部门管理"** page with a left org-tree sidebar + dynamic right content area. Remove the old two separate nav entries and replace with one.

---

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Workspace Left Nav (dark sidebar)                                │
│  ...                                                             │
│  部门管理 (single nav item, /workspace/dept)                     │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘

Within /workspace/dept:
┌─────────────────┬───────────────────────────────────────────────┐
│  组织架构树       │  右侧动态内容                                   │
│  (w-60, border-r) │                                              │
│                  │  当选中"企业总部"(root) → OrgManagement UI     │
│  🔍 搜索框        │    - 3 stat cards (部门总数/企业成员/API Key)   │
│                  │    - 部门列表表格                               │
│  🏢 [企业名称]    │                                              │
│   └─ 📁 算法部门  │  当选中具体"部门"节点 → OrgGovernance UI       │
│   └─ 📁 产品部门  │    - 3 detail cards (预算/消耗/资产)           │
│       └─ 🔒 子部门│    - 直属成员 / 下属子部门 Tab                  │
│                  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

---

## Implementation Plan

### 1. New file: `src/pages/DeptManagement.tsx`
New unified page that:
- Has its own **left tree panel** (w-56, scrollable)
  - Search input at top
  - Tree nodes: root = enterprise name, children = orgs from DB
  - `selectedNode: "root" | orgId` state
  - Locked nodes (🔒) shown for orgs where user lacks permission (non-admin seeing orgs they don't manage)
  - Permission: `role === "admin"` can click all nodes; `role === "org_admin"` can only click their own org
- Right panel renders conditionally:
  - `selectedNode === "root"` → inline `<RootView>` (pulls OrgManagement logic in)
  - `selectedNode === orgId` → inline `<OrgView orgId={...}>` (pulls OrgGovernance logic in)

### 2. Extract logic into sub-components (within the same file for simplicity)
- `RootView` component — exact copy of OrgManagement render logic (stat cards + dept table)
- `OrgView` component — exact copy of OrgGovernance render logic (budget/consumption cards + member/sub-dept tabs)
- Both receive `enterprise` and `role` as props
- Add **"转移成员"** to the member `...` dropdown in `OrgView`:
  - Opens `TransferMemberDialog` showing a mini org tree (radio-selectable nodes)
  - On confirm: (frontend-only mock: just toast success)

### 3. Update `WorkspaceSidebar.tsx`
- Remove both `"部门治理"` child entry (from 企业管理 group) and `"部门管理"` top-level item
- Add single `"部门管理"` top-level item → `/workspace/dept`

### 4. Update `Workspace.tsx`
- Add import for `DeptManagement`  
- Add route condition: `location.pathname.startsWith("/workspace/dept")`
- Remove the old `OrgManagement` and `OrgGovernance` route conditions (keep imports for now — actually remove them too to keep clean)
- Also import and remove the stale sidebar entries

### 5. TransferMemberDialog
Mini org-tree within a Dialog:
- List all orgs in the enterprise as radio buttons (tree-indented style)
- Confirm button calls mock success toast
- State: `transferTarget: string | null`

---

## Key Technical Details

**Tree node data structure:**
```ts
type TreeNode = { id: "root" | string; label: string; depth: number; locked: boolean }
```

**Permission logic:**
```ts
const canAccess = (nodeId: string) => 
  role === "admin" ||
  (role === "org_admin" && nodeId === currentOrgId) ||
  nodeId === "root"; // root always shown, but clicking root requires admin
```

Actually: root node clickable by admin only. Org nodes: admin can click all, org_admin can only click their assigned org.

**Search filtering:** filter tree nodes by `label.includes(searchTerm)`

**Layout within the page:** The combined page uses `flex h-full` layout (left panel + right panel), not a new sidebar — this is an inner panel WITHIN the existing workspace layout, not replacing it.

**Files to create/edit:**
1. **CREATE** `src/pages/DeptManagement.tsx` — full new page (~500 lines)
2. **EDIT** `src/components/WorkspaceSidebar.tsx` — nav structure update
3. **EDIT** `src/pages/Workspace.tsx` — routing + imports

The old `OrgManagement.tsx` and `OrgGovernance.tsx` files are kept as-is (not deleted) since they may still be referenced, but their nav entries are removed.
