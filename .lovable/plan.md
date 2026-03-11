
## Client Task Logs — Role-based org/member columns

### Current state
- `TaskLogsTab` receives `globalOrg` and `globalMember` props but does NOT receive `role`
- `taskHeaders` is a fixed array: `["提交时间", "花费时间", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]`
- Table body renders 8 fixed cells — no org/member cells
- The component has no concept of the current role

### Required changes (lines 361–545 in `CallLogs.tsx`)

**1. `TaskLogsTab` signature** — add `role` prop (line 361–364)
```
function TaskLogsTab({ role, globalOrg, globalMember }: {
  role: string;
  globalOrg: string;
  globalMember: string;
})
```

**2. Dynamic `taskHeaders` based on role** (line 395)
- enterprise_admin: `["提交时间", "花费时间", "组织", "成员", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]`
- org_admin: `["提交时间", "花费时间", "成员", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]`
- member: `["提交时间", "花费时间", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]` (unchanged)

**3. Table body rows** — add conditional cells after `花费时间` cell, before `模型` cell (lines 465–494):
```tsx
{/* after cost cell */}
{isEnterpriseAdmin && <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.org}</td>}
{(isEnterpriseAdmin || isOrgAdmin) && <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{row.member}</td>}
{/* then model cell */}
```

**4. Pass `role` from parent** — update `<TaskLogsTab>` call at line 796:
```tsx
<TaskLogsTab
  role={viewRole}
  globalOrg={activeOrgName}
  globalMember={globalMember}
/>
```

### Files changed
- `src/pages/CallLogs.tsx` — lines 361–364 (signature), line 395 (headers), lines 465–494 (body cells), line 796 (call site)
