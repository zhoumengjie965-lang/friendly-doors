
## Plan: Add org filter for org_admin in CallLogs

### Problem
When a user is `org_admin` in multiple organizations (within the same enterprise), the CallLogs page has no way to filter by which org they're viewing. The `enterprises` array in Workspace already holds all memberships, and a user can appear multiple times for the same enterprise with different `organization_id`s (each with `org_admin` role).

### Data flow change

**Workspace.tsx** — `CallLogs` call at line 455:
Currently: `<CallLogs enterprise={enterprise} role={role} />`

The `enterprises` state contains `{ enterprise, role, org }[]`. For the current enterprise, there may be multiple entries if the user is org_admin in several orgs. We need to pass:
1. The list of orgs the user is an `org_admin` in (for the current enterprise)
2. The currently active org

Updated call:
```tsx
<CallLogs
  enterprise={enterprise}
  role={role}
  currentOrg={currentOrg}
  orgList={enterprises
    .filter(e => e.enterprise.id === enterprise.id && e.role === "org_admin" && e.org)
    .map(e => e.org!)}
/>
```

**CallLogs.tsx** — props update:
```ts
interface OrgInfo { id: string; name: string; }

interface Props {
  enterprise: Enterprise;
  role: string;
  currentOrg?: OrgInfo | null;
  orgList?: OrgInfo[];
}
```

**UsageLogsTab** — receives `currentOrg` and `orgList`, adds an org filter:

1. Add `filterOrg` state initialized to `currentOrg?.name || "all"` (so it defaults to current org)
2. In the filter bar, when `isOrgAdmin && orgList.length > 1`, render an "组织" Select dropdown — same style as the existing 成员/组织 dropdowns
3. In the table header array, the `成员` column stays (org_admin sees members); but we also add `组织` column header when multiple orgs exist so the user can see which org each call belongs to
4. Filter logic: `if (isOrgAdmin && filterOrg !== "all" && r.org !== filterOrg) return false`

### Visual result
- Single org → no change (filter hidden, same as before)
- Multiple orgs → "组织" dropdown appears in filter bar between APIKey and 成员, defaults to current org, can select "全部" or individual org

### Files changed
- `src/pages/Workspace.tsx` — line 455: pass `currentOrg` + `orgList` props
- `src/pages/CallLogs.tsx` — Props type + `UsageLogsTab` receives + renders org filter + filters data
