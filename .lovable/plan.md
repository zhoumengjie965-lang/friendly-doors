
Now I have a full picture of the current org tab. Here's the plan:

## Changes needed — only `src/pages/admin/AdminEnterpriseDetail.tsx`

### New state variables
- `editOrgOpen: boolean` + `editOrgTarget: Org | null` — controls "edit org budget/daily-limit" dialog
- `editOrgBudget: string`, `editOrgDailyLimit: string`, `editOrgLoading: boolean`
- `editMemberOpen: boolean` + `editMemberTarget: Member | null` + `editMemberAction: "role" | "limit" | "ban" | null`
- `editMemberRole: string`, `editMemberLimit: string`, `editMemberLoading: boolean`

### Left org list — add edit icon
- Inside each org card button row (org name + status row), add a pencil icon button on the right (after the status badge)
- `stopPropagation` so it doesn't trigger org selection
- Click opens `editOrgOpen` dialog pre-filled with org's `current_month_budget`

### Edit Org Dialog
Fields:
- 本月预算额度（元）: number input, current value pre-filled
- 单日消耗上限（元）: number input (this will update all members' `daily_limit` in the org, or store on org level)

Action: `UPDATE organizations SET current_month_budget = X WHERE id = org.id` via supabase direct (RLS allows anyone to update).

### Right member list — add "操作" column
Change grid from `grid-cols-[2fr_1fr_1fr_1fr]` to `grid-cols-[2fr_1fr_1fr_1fr_100px]`, add "操作" header.

Each member row gets three icon buttons:
1. **修改角色** (`UserCheck` icon) — opens dialog with radio: 普通成员 / 组织管理员. Updates `members.role`.
2. **修改限额** (`DollarSign` icon) — opens dialog with number input for `daily_limit`. Updates `members.daily_limit`.
3. **移除并封禁** (`UserX` icon, destructive red) — confirmation AlertDialog. On confirm:
   - DELETE from `members` WHERE id = member.id
   - UPDATE `users` SET status = 'banned' WHERE phone = member.user_phone — BUT `users` table has no `status` column. Need to add it OR we can do a soft ban by setting member.status = 'banned' AND also block the user at members level. Actually the user asked to "禁用该用户账号全平台" — need to add `status` column to `users` table via migration. Alternative: update ALL members of this user across the enterprise to `status = 'banned'`. But the request says "全平台禁用" = global ban. So we need a `users.status` column.

Wait — let me re-check: `users` table currently has: phone, created_at, name, id. No `status` column.

**Migration needed**: `ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'active';`

Then ban action:
1. Delete or set `members.status = 'banned'` for this member record
2. `UPDATE users SET status = 'banned' WHERE phone = member.user_phone`

### Summary of changes

**Migration**: Add `status` column to `users` table.

**`AdminEnterpriseDetail.tsx`**:
1. Add new state vars (editOrg dialog, editMember dialog)
2. Add `Pencil`, `UserCheck`, `DollarSign`, `UserX` to lucide imports
3. Add `AlertDialog` imports
4. Left org list: add pencil icon button in org card header row
5. Right member table: add "操作" column with 3 icon buttons
6. Add 3 new dialogs: Edit Org, Edit Member (role/limit combined with action type), Ban Confirm (AlertDialog)
7. Add handler functions: `handleEditOrg`, `handleEditMember`, `handleBanMember`

Handler implementations (all direct supabase calls, RLS allows updates):
- `handleEditOrg`: `supabase.from("organizations").update({ current_month_budget: val }).eq("id", orgId)`
- `handleEditMemberRole`: `supabase.from("members").update({ role: val }).eq("id", memberId)`
- `handleEditMemberLimit`: `supabase.from("members").update({ daily_limit: val }).eq("id", memberId)`
- `handleBanMember`: delete member + update users.status = 'banned'
