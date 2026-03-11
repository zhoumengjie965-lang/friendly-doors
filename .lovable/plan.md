
## Three changes to `src/pages/ApiKeys.tsx`

### What the user wants
1. **Remove the "提示: Key 将归属于 XXX" hint in member view** — it should only show for admin views, or ideally only when on the org tab (makes no sense for a plain member)
2. **Move org/member filter selects to row 2** (same line as the "我的 key / 组织 key" tab switcher), not row 3
3. **Add "成员" column to org table for org_admin view; add "组织" + "成员" columns for admin view**

### Current state
- Row 3 left side: `创建按钮` + `提示: Key 将归属于...` + `[组织筛选][成员筛选]` (conditional on org tab)
- `KeyTable` has `showCreator` prop controlling one extra column; org/member columns don't exist yet
- `KeyTable` is a closure inside the component — it reads `previewRole` from outer scope but doesn't receive it as a prop

### Change 1 — Remove hint for member view (lines 675–682)
Wrap the hint span in `{canSeeOrgTab && ...}` — members never see it.

### Change 2 — Move org/member filter selects to row 2 (lines 619–716)
Currently the selects are inside row 3 `<div className="flex items-center justify-between mb-5">` after the create button. Move them to row 2 (the `canSeeOrgTab` block, lines 620–667), appended **after** the org selector, but only when `activeTab === "org"`:

```
Row 2: [我的 API Key] [组织 API Key]  |  [Building2 组织选择]  |  [所属组织 ▼] [所属成员 ▼]
                                          (always shown)          (only when tab=org)
```

The Select labels from image-133 are "所属组织" and "所属成员".

Remove the conditional block from row 3 entirely.

### Change 3 — Add 成员/组织 columns to KeyTable (lines 384–582)
`KeyTable` needs to know `previewRole` to decide which extra columns to show. Since it's a closure, it already has access to outer `previewRole`. 

Current `showCreator` prop already adds a "创建者" column. We need to extend this:
- **org_admin view + org tab**: show "成员" column (creator's name/phone) — effectively the same data as `showCreator` but labeled "成员"
- **admin view + org tab**: show "组织" column (org name lookup) + "成员" column

Plan:
- Keep `showCreator` prop but rename the column header dynamically based on `previewRole`
- Add `showOrg` prop to `KeyTable` — when true, add an "组织" column before "成员"
- Need `organizations` array (already in scope as closure) to do org name lookup: `organizations.find(o => o.id === k.organization_id)?.name ?? "—"`

**KeyTable signature change:**
```ts
const KeyTable = ({ keys, showCreator, showOrg, page, setPage, filterFn }: {
  ...showOrg?: boolean;
})
```

**Usage:**
```tsx
{canSeeOrgTab && activeTab === "org" && (
  <KeyTable
    keys={orgKeys}
    filterFn={...}
    showCreator   // always show member col in org tab
    showOrg={previewRole === "admin"}  // only for enterprise admin
    page={orgPage}
    setPage={setOrgPage}
  />
)}
```

**colSpan update**: currently `showCreator ? 11 : 10` → becomes `10 + (showCreator ? 1 : 0) + (showOrg ? 1 : 0)`

**Column header**: rename `showCreator` column from "创建者" to "成员" (line 434)

**Column body** (org column before member column):
```tsx
{showOrg && (
  <TableCell>
    <span className="text-sm text-muted-foreground">
      {organizations.find(o => o.id === k.organization_id)?.name ?? "—"}
    </span>
  </TableCell>
)}
{showCreator && (
  <TableCell>
    <span className="text-sm text-muted-foreground">
      {userNames[k.creator_phone] || k.creator_phone}
    </span>
  </TableCell>
)}
```

### Files changed
- `src/pages/ApiKeys.tsx` only — lines ~434, ~496–500, ~620–716, ~675–682, ~763–770
