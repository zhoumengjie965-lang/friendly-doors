
## Admin Task Logs — Add Enterprise/Org/Member columns + fix column order

The uploaded image shows the old layout (with 结束时间 and 所属企业 as a separate column, 平台 badge). The user wants the **admin task logs** table updated to match this exact column order and include enterprise/org/member.

### What's currently in the code
- `taskHeaders = ["提交时间", "花费时间", "模型", "渠道", "类型", "任务ID", "执行状态", "进度", "详情"]`
- Mock data has `enterprise`, `org` but no `member` field
- Table body renders 9 cells matching those 9 headers — no enterprise/org/member cells

### Changes to `src/pages/admin/AdminCallLogs.tsx`

**1. Mock data** — add `member` field to each `mockTaskLogs` row (e.g., "张三", "李四", "王五")

**2. TaskLogsTab — accept `globalMember` prop** and use it for filtering (currently the function signature doesn't have `globalMember`)

**3. Headers** — update to:
```
["提交时间", "花费时间", "企业", "组织", "成员", "模型", "渠道", "类型", "任务ID", "执行状态", "进度", "详情"]
```

**4. Table body** — add 3 new cells after 花费时间 for 企业、组织、成员, matching the new header order

**5. Filter logic** — add `globalMember` filtering (by member name, same as CallLogsTab pattern)

**6. The main component** — ensure `globalMember` is passed to `TaskLogsTab` (check the render call at the bottom)

That's the full scope — one file, targeted changes.
