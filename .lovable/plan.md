
## Audit Logs — Remove IP, Add 组织 column

### Current state
**Client (`CallLogs.tsx`):**
- `mockAuditLogs` already has `org` field on each row ✓
- Headers: `["时间", "操作人", "操作类型", "操作内容", "操作结果", "IP 地址"]`
- Table body renders 6 cells — no `org` cell, but has `ip` cell
- The images show a blank red-boxed column (left) = missing org, and IP column (right) = to be removed

**Admin (`AdminCallLogs.tsx`):**
- `mockAuditLogs` has `enterprise` but NO `org` field
- Headers: `["时间", "所属企业", "操作人", "操作类型", "操作内容", "操作结果", "IP 地址"]`
- Table body renders 7 cells — no `org` cell, but has `ip` cell

### Changes

#### 1. `CallLogs.tsx` — Client AuditLogsTab (lines 556–654)

**Headers** — swap IP for 组织, inserted after 操作人:
```
["时间", "操作人", "组织", "操作类型", "操作内容", "操作结果"]
```

**Table body** — add `{row.org}` cell after operator cell; remove IP cell.

#### 2. `AdminCallLogs.tsx` — Admin mock data + AuditLogsTab (lines 103–112, 620–713)

**Mock data** — add `org` field to each `mockAuditLogs` row:
- 极光科技 rows → org: "技术部" / "研发部"
- 蓝海智能 rows → org: "产品部"
- 云启数字 rows → org: "市场部"
- "-" enterprise rows → org: "-"

**Headers** — swap IP for 组织, inserted after 操作人:
```
["时间", "所属企业", "操作人", "组织", "操作类型", "操作内容", "操作结果"]
```

**Table body** — add `{row.org}` cell after operator cell; remove IP cell.

### Files changed
- `src/pages/CallLogs.tsx` — mock data unchanged (already has org), AuditLogsTab headers + body
- `src/pages/admin/AdminCallLogs.tsx` — add `org` to mockAuditLogs, AuditLogsTab headers + body
