
## What needs to change

The "添加成员" dialog in `OrgGovernance.tsx` (lines 488–542) is currently single-mode only: phone + name + role + daily limit in a plain form. The user wants it to match the enterprise admin pattern from `CreateOrgDialog.tsx` — a toggle between **单个添加** and **批量导入** modes.

### Reference pattern (CreateOrgDialog)
- A segmented toggle (`单个添加 | 批量导入`) in the dialog header area
- **Single mode**: phone input + name input + role select (inline 3-col grid)
- **Bulk mode**: Textarea (one per line: `姓名 手机号`) + unified role select + live parse preview
- `parseBulkText()` utility for validation

### Key difference for OrgGovernance
- CreateOrgDialog shows role options including "企业管理员" — OrgGovernance's add dialog should only show "普通成员" and "组织管理员" (no enterprise admin option)
- OrgGovernance single mode also has a `单日上限` field — keep it in single mode, add a unified `单日上限` field for bulk mode too
- The `addMember()` function needs to handle both modes

### Changes to `src/pages/OrgGovernance.tsx`

**1. New state variables** (around line 52–57):
- `addMode: "single" | "bulk"` defaulting to `"single"`
- `bulkText: string` for the textarea
- `bulkRole: "member" | "org_admin"` defaulting to `"member"`
- `bulkLimit: string` defaulting to `"2000"`

**2. `parseBulkText` utility** — copy/paste from CreateOrgDialog (same logic), strip the "admin" role option

**3. `addBulkMembers()` function** — loops through parsed entries, calls the same `supabase` logic as single `addMember()` per row, then closes dialog and refreshes

**4. Reset logic** — when dialog closes, reset `addMode`, `bulkText`, `bulkRole`, `bulkLimit` alongside existing resets

**5. Dialog JSX** (lines 488–542) — replace the static form with:
```
Dialog header: 添加成员
  ├── Mode toggle: [单个添加] [批量导入]
  ├── Single mode (addMode === "single"):
  │   phone / name / role / daily limit (same fields as before)
  └── Bulk mode (addMode === "bulk"):
      textarea + parse preview + unified role select + unified daily limit input
Footer: 取消 | 添加
```

**One file changed**: `src/pages/OrgGovernance.tsx`
