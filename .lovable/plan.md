
## Changes to `src/pages/admin/AdminCallLogs.tsx`

### 1. Global filter bar (tabs row, right side)
- Rename `"创建人 / 手机号"` Input → replace with a **FilterCombobox** dropdown labeled `"所属成员"` (fed from a `members` list loaded from Supabase, showing `user_phone` as the display name)
- State rename: `globalCreator` → `globalMember`
- Pass `globalMember` down to `CallLogsTab` and `AuditLogsTab`

### 2. CallLogsTab — filter bar (lines 259–278)
- **模型**: change from `<Select>` dropdown → `<Input>` text search (same pattern as APIKey field)
- **搜索 button**: add a `<Button>` with a search icon before 重置
- **重置 button**: remove any remaining X icon, text-only

### 3. CallLogsTab — mock data
- Add `retryChannel` field to each mock row (e.g., `"Azure"`, `"-"`, `"OpenAI"`)
- Add `member` field (e.g., `"张三"`, `"李四"`)

### 4. CallLogsTab — table headers & column order
New ordered headers array:
```
["时间", "APIKey", "企业", "组织", "成员", "分组", "类型", "模型", "上游渠道", "重试渠道", "用时/首字", "输入", "输出", "花费", "详情"]
```
- Remove old `"所属企业"` label → rename to `"企业"`
- Add `"成员"` between 组织 and 分组
- Add `"重试渠道"` between 上游渠道 and 用时/首字
- Ensure table has `overflow-x-auto` (already does) so wide table scrolls

### 5. CallLogsTab — inline header dropdowns (4 columns)
The `headers.map` logic needs cases for 4 inline-filter headers:
- `"分组"` — already done ✓
- `"类型"` — already done ✓
- `"上游渠道"` — new: `filterChannel` state, options derived from mock data
- `"重试渠道"` — new: `filterRetryChannel` state, options derived from mock data

### 6. CallLogsTab — table body row cells (reordered)
New cell order to match headers:
`时间 → APIKey → 企业 → 组织 → 成员 → 分组 → 类型 → 模型 → 上游渠道 → 重试渠道 → 用时/首字 → 输入 → 输出 → 花费 → 详情`

### 7. CallLogsTab — filter logic
Update `filtered` to also filter by `globalMember`, `filterChannel`, `filterRetryChannel`, and model as text input (instead of exact match).

### 8. handleReset
Add `setFilterChannel("all")`, `setFilterRetryChannel("all")`, `setFilterModel("")` (now a string, not "all").

### Files changed
- `src/pages/admin/AdminCallLogs.tsx`
