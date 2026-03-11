
## Root cause

The previous implementation wrapped the 所属组织/所属成员 filter selects in `{activeTab === "org" && (` (lines 676–707). On page load the default tab is "我的 API Key", so the filters are invisible — the page looks identical to before. The user never saw the change because they'd have to click "组织 API Key" first.

## What to fix in `src/pages/ApiKeys.tsx`

### Change 1 — Always show filter selects on row 2 (lines 675–707)

Remove the `{activeTab === "org" && (` wrapper and its closing `)}`. The selects will always be visible in row 2 when `canSeeOrgTab` is true. They'll work correctly on the org tab (filtered via `filterKeys`) and simply have no visual effect on the my-tab (which ignores `isOrgTab` filters).

Before:
```
{activeTab === "org" && (
  <>
    {previewRole === "admin" && <所属组织 Select />}
    <所属成员 Select />
  </>
)}
```

After:
```
{previewRole === "admin" && <所属组织 Select />}
<所属成员 Select />
```

This makes the filter selects immediately visible on the same row as the tab switcher without needing to click the org tab first — exactly "位置在我的key/组织keytab同一行".

### That's the only change needed

Everything else is already implemented and working:
- 普通成员 view hides row 2 entirely (canSeeOrgTab = false) ✓
- 成员 column shows in org table for org_admin ✓  
- 组织 + 成员 columns show in org table for admin ✓
- Hint text already removed from row 3 ✓

**File changed**: `src/pages/ApiKeys.tsx` — lines 675–707 only (remove 2 wrapper lines)
