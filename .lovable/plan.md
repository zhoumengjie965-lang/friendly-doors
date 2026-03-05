
## Current State Analysis

`AdminUsers.tsx` currently:
- Only stores ONE enterprise per user (last member record wins via `Object.fromEntries`)
- No enterprise filter dropdown
- No personal balance column
- Grid: `grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr]` (5 cols)

## Changes needed — only `src/pages/admin/AdminUsers.tsx`

### 1. Data model changes

**`UserRow` interface**:
```ts
interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  status: string;
  enterprises: { id: string; name: string; role: string }[];  // all enterprises
  personal_balance: number;  // from enterprise_balances where enterprise_id = personal space... 
}
```

Wait — "个人空间余额" needs clarification. Looking at the DB, `enterprise_balances` is keyed by `enterprise_id`. There's no separate "personal balance" table. The personal space likely IS an enterprise record (when a user has no org, they operate in a personal space). But the current users table has no direct balance. 

Actually re-reading: the user wants "个人余额" shown. This likely means: the balance of the user's "personal enterprise" (if they have one) OR it could just be a placeholder column showing ¥0.00 for now if there's no direct personal balance concept.

Looking at DB tables: there's no "personal_balance" concept directly on users. `enterprise_balances` is per enterprise. Users may own an enterprise themselves. 

I'll show the balance of the enterprise where the user is `owner` (i.e., where `enterprises.owner_phone = user.phone`). That's the closest to "personal space balance". If they don't own an enterprise, show ¥0.00.

Actually let me reconsider — a user could be owner of an enterprise. I'll query `enterprises` where `owner_phone IN (phones)` to get their owned enterprises, then query `enterprise_balances` for those. Show balance of the enterprise they OWN as "个人余额". If they own multiple, sum them or show first.

Wait, this is getting complex. The simplest interpretation: query `enterprise_balances` for enterprises they OWN. Show that as personal balance.

### 2. Multi-enterprise display

Change from `Object.fromEntries` (last-wins) to grouping all member records per phone:
```ts
const membersByPhone: Record<string, {enterprise_id: string, role: string}[]> = {};
membersData.forEach(m => {
  if (!membersByPhone[m.user_phone]) membersByPhone[m.user_phone] = [];
  membersByPhone[m.user_phone].push({ enterprise_id: m.enterprise_id, role: m.role });
});
```

Display: if 1 enterprise → show name. If >1 → show "企业A (+N)".

### 3. Filter dropdown

Add `filter: "all" | "no_enterprise" | "has_enterprise"` state.

Filter options:
- 全部
- 仅散客 (no enterprise membership)
- 仅企业成员 (has at least one enterprise membership)

### 4. Personal balance column

Query enterprises owned by these users → query enterprise_balances for those enterprise IDs → map owner_phone → balance.

### 5. Grid update

6 columns: `grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr_1fr]`
Headers: 手机号 | 姓名 | 所属企业 | 角色 | 个人余额 | 注册时间

For role: if multi-enterprise, show first role or "多企业".

### Implementation plan

**State**: add `filter: "all" | "no_enterprise" | "has_enterprise"`

**fetchAll**:
1. Fetch all users
2. Fetch all members for those phones (keep ALL records per phone)
3. Fetch all enterprises for those enterprise_ids
4. Fetch enterprises owned by user phones (for personal balance)
5. Fetch enterprise_balances for owned enterprise_ids

**Filtering**:
```ts
const filtered = users
  .filter(u => search condition)
  .filter(u => {
    if (filter === "no_enterprise") return u.enterprises.length === 0;
    if (filter === "has_enterprise") return u.enterprises.length > 0;
    return true;
  });
```

**Enterprise display cell**:
```ts
if (enterprises.length === 0) return "散客"
if (enterprises.length === 1) return enterprises[0].name
return `${enterprises[0].name} (+${enterprises.length - 1})`
```

**Role display**:
- If no enterprises: "—"
- If 1 enterprise: roleLabel(enterprises[0].role)
- If >1: "多企业"

**Header layout**: add filter dropdown to the right of search, replacing just-search area with a flex row.
