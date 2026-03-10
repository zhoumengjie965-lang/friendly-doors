

## Task Logs Table Restructure — Client + Admin

### Changes

#### 1. Mock data updates
- **Client (`CallLogs.tsx`)**: Add `channel` field to mockTaskLogs (for admin's "渠道" — not needed for client, but keep data consistent). Rename `platform` → `model` conceptually (or just use `platform` field as "模型" display).
- **Admin (`AdminCallLogs.tsx`)**: Add `channel` (渠道) and `member` (成员) fields to mockTaskLogs. Remove `endTime` from display (not in requested columns).

#### 2. Client table (`CallLogs.tsx` TaskLogsTab)

**Headers** (currently: 提交时间, 结束时间, 花费时间, 平台, 类型, 任务ID, 执行状态, 进度, 详情):
→ New order: `["提交时间", "花费时间", "模型", "类型", "任务ID", "执行状态", "进度", "详情"]`
- Remove "结束时间"
- Rename "平台" → "模型"
- "类型" and "执行状态" become inline header dropdowns

**Table body**: reorder cells to match; remove `endTime` cell; "详情" cell becomes a clickable button that opens the detail dialog.

**Filter bar**: keep 时间 + 任务ID input + 模型名称 input (new). Remove 执行状态 dropdown (moved to header). Add 搜索 button before 重置.

**Filter state**: add `filterModel` (text input), add `filterType` state for inline header dropdown. Remove `filterExecStatus` from filter bar (keep as header filter).

#### 3. Admin table (`AdminCallLogs.tsx` TaskLogsTab)

**Headers** → New order: `["提交时间", "花费时间", "模型", "渠道", "类型", "任务ID", "执行状态", "进度", "详情"]`
- Remove "结束时间", "所属企业"
- Rename "平台" → "模型"
- Add "渠道" column
- "类型", "执行状态", "渠道" become inline header dropdowns

**Mock data**: add `channel` field (e.g., "官方API", "Azure", "代理")

**Filter bar**: 时间 + 任务ID input + 模型名称 input + 搜索 + 重置. Remove 执行状态 dropdown.

**Filter state**: add `filterModel`, `filterType`, `filterChannel`. Move `filterExecStatus` to header dropdown.

#### 4. Inline header dropdowns (same pattern as CallLogs 分组/类型)
- **Client**: 类型 (全部/生成歌词/生成音乐/文生图/...), 执行状态 (全部/进行中/已完成/失败)
- **Admin**: same + 渠道 (全部/官方API/Azure/代理)

#### 5. Detail column — clickable preview
- Change detail cell from truncated text to a "查看" button
- Clicking opens `selectedTask` dialog (already exists), showing full result/preview

### Files changed
- `src/pages/CallLogs.tsx` — TaskLogsTab (mock data, filter bar, headers, body, filter logic)
- `src/pages/admin/AdminCallLogs.tsx` — TaskLogsTab (mock data + channel field, filter bar, headers, body, filter logic)

