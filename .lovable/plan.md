
## Summary of Changes

### What the user wants (5 items, both client + admin):
1. **Delete IP column** from the call logs table (header + cell)
2. **类型 column** in the table header becomes an inline dropdown filter (just "错误" / "消费" — no parenthetical)
3. **分组 column** in the table header becomes an inline dropdown filter (already exists in admin, needs to be verified/ensured for client too)
4. **Search bar** on 调用日志 tab: keep only 时间 + Key名称 + 模型; remove 类型 and IP fields
5. All above changes apply to **both** `CallLogs.tsx` and `AdminCallLogs.tsx`

---

### `src/pages/CallLogs.tsx` — CallLogsTab

**Filter bar** (lines ~242–293):
- Remove the `类型` Select block (~lines 257–268)
- In the expanded section, keep only `模型` input; remove the `IP` input block (~lines 287–290)
- Result: filter bar has: 时间 | APIKey | 搜索 | 重置 | 展开 → expanded shows: 模型

**Table headers** (line 226–231):
- Remove `"IP"` from all three header arrays (baseHeaders, enterprise headers, org admin headers)

**类型 column header** — add inline Select in `<th>` (like 分组 already does):
- Currently 类型 is a plain `<th>`. Make it an inline dropdown with options: 全部 / 错误 / 消费
- Wire it to `filterType` state (already exists)

**分组 column** — already has inline dropdown in client (lines 319–331 of CallLogs.tsx ✓)

**Table body** — remove `row.ip` cell (~line 370–371)

---

### `src/pages/admin/AdminCallLogs.tsx` — CallLogsTab

**Filter bar** (lines ~260–306):
- Currently has: 时间 | 模型 Select | 类型 Select | 重置 | 展开 → expanded: APIKey Input | 分组 Select | IP Input
- Change to: 时间 | APIKey Input | 模型 Select | 重置 (no 类型, no IP anywhere)
- Move APIKey input to the primary row (not just expanded)
- Remove the expanded section entirely (or keep just model if it was there)

Actually looking more carefully at admin filter bar (lines 260–306):
- Primary row: time | model Select | type Select | reset | expand button
- Expanded: APIKey Input | group Select | IP Input

New primary row: time | APIKey Input | model Select | reset
Remove expanded section (or leave empty/remove expand button too)

**Table headers** (line 258): `["时间", "所属企业", "APIKey", "组织", "分组", "类型", "模型", "上游渠道", "用时/首字", "输入", "输出", "花费", "IP", "详情"]`
- Remove `"IP"` → `["时间", "所属企业", "APIKey", "组织", "分组", "类型", "模型", "上游渠道", "用时/首字", "输入", "输出", "花费", "详情"]`

**类型 column header** — change from plain `<th>` to inline dropdown (全部/错误/消费)
**分组 column header** — already inline dropdown in admin ✓

**Table body** — remove `row.ip` cell (line 377–379)

**类型 badge labels in body**: currently "错误（失败）" / "消费（成功）" → change to just "错误" / "消费" (both files)

---

### Exact file locations

**CallLogs.tsx:**
- Lines 226–231: header arrays — remove "IP"
- Lines 257–268: remove 类型 Select from filter bar
- Lines 281–292: expanded section — remove IP input, keep only 模型
- Lines 318–334: in headers.map — add 类型 inline dropdown case (alongside existing 分组 case)
- Lines 352–355: type badge text — change "错误（失败）" → "错误", "消费（成功）" → "消费"
- Lines 369–371: remove IP table cell

**AdminCallLogs.tsx:**
- Line 258: headers array — remove "IP"
- Lines 260–306: filter bar — restructure to: time | APIKey | model | reset; remove type Select and expanded IP
- Lines 325–341: headers.map — add 类型 inline dropdown case
- Lines 357–360: type badge text — "错误（失败）" → "错误", "消费（成功）" → "消费"
- Lines 377–379: remove IP table cell

### Files changed
- `src/pages/CallLogs.tsx`
- `src/pages/admin/AdminCallLogs.tsx`
