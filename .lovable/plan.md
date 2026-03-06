
## Plan: Show highest role (+n) for multi-enterprise users

### Current state
`roleCell` at line 292–296:
```ts
const roleCell = (ents: EnterpriseRef[]) => {
  if (ents.length === 0) return <span>个人用户</span>;
  if (ents.length === 1) return <span>{roleLabel(ents[0].role)}</span>;
  return <span>多企业</span>;  // ← replace this
};
```

### Change needed — one function, ~5 lines

**Role priority order**: `owner` (企业主) > `org_admin` (组织管理员) > `member` (成员)

Pick the highest-priority role from `ents`, display it + a `+N` badge where N = `ents.length - 1`:

```tsx
const ROLE_PRIORITY = ["owner", "org_admin", "member"];

const roleCell = (ents: EnterpriseRef[]) => {
  if (ents.length === 0) return <span className="text-muted-foreground/70">个人用户</span>;
  if (ents.length === 1) return <span className="text-muted-foreground">{roleLabel(ents[0].role)}</span>;
  const top = ents.slice().sort((a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role))[0];
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {roleLabel(top.role)}
      <span className="text-xs bg-muted rounded px-1 text-muted-foreground">+{ents.length - 1}</span>
    </span>
  );
};
```

Result: e.g. `企业主 +1` or `组织管理员 +2` — matching the style of the `+N` badge in image 2.

### Files changed
- `src/pages/admin/AdminUsers.tsx` — only `roleCell` function (lines 292–296) + add `ROLE_PRIORITY` constant above it
