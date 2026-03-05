
## Plan: Refactor AdminUsers with Edit Drawer + Disable Button

### Current state
- List has 6 columns, no actions column
- No edit/disable interactions
- No drawer component

### Changes needed — only `src/pages/admin/AdminUsers.tsx`

#### 1. Grid update
Add 7th column "操作" (actions): `grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr_1fr_80px]`

Each row gets two icon buttons:
- **编辑** (`Pencil` icon) — opens edit drawer
- **禁用/启用** (`Ban` / `CheckCircle` icon) — toggles `users.status` between `'active'` and `'banned'`, updates in-memory state

#### 2. Edit Drawer (Sheet component)
State: `drawerOpen: boolean`, `drawerUser: UserRow | null`

When opened, fetch enriched data for this specific user:
- `members` with `organization_id` for that phone → join orgs to get org name
- `enterprise_balances` for owned enterprise (personal balance)

**Drawer layout (two sections)**:

**Section A — 基本信息**
- 用户名 (editable input, save button)
- 手机号 (editable input, save button)  
- 账号状态 (Switch: 启用/禁用, updates immediately)
- 密码重置 (button stub — shows toast "功能开发中")

**Section B — 空间关联管理**

Sub-section 1: 个人空间
- 显示个人余额 (¥X.XX)
- 手动修改余额 input + 保存按钮 → `UPDATE enterprise_balances SET balance = X WHERE enterprise_id = owned_enterprise_id`

Sub-section 2: 企业空间列表
Table with columns: 企业名 | 所属组织 | 角色 | 操作
- For each member record of this user, show: enterprise name, org name (from `organization_id`), role
- 操作: "强制解除" button (`UserMinus` icon, red) → `DELETE FROM members WHERE id = member_record_id`, then refresh drawer data

#### 3. Disable toggle in list row
`handleToggleStatus(user)`: 
```ts
await supabase.from("users").update({ status: newStatus }).eq("id", user.id)
```
Update local state optimistically.

#### 4. New state variables
```ts
const [drawerOpen, setDrawerOpen] = useState(false);
const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
const [drawerDetail, setDrawerDetail] = useState<DrawerDetail | null>(null);
const [drawerLoading, setDrawerLoading] = useState(false);
const [editName, setEditName] = useState("");
const [editPhone, setEditPhone] = useState("");
const [editBalance, setEditBalance] = useState("");
const [savingName, setSavingName] = useState(false);
const [savingBalance, setSavingBalance] = useState(false);
```

#### 5. DrawerDetail interface
```ts
interface MemberDetail {
  id: string; // member record id
  enterprise_id: string;
  enterprise_name: string;
  org_name: string | null;
  role: string;
}
interface DrawerDetail {
  personal_enterprise_id: string | null; // enterprise where owner_phone = this user's phone
  personal_balance: number;
  members: MemberDetail[];
}
```

#### 6. fetchDrawerDetail function
When drawer opens:
1. Fetch `enterprises` where `owner_phone = phone` → get personal enterprise_id
2. Fetch `enterprise_balances` for that enterprise_id
3. Fetch `members` where `user_phone = phone` with `enterprise_id, organization_id, role, id`
4. Fetch enterprise names for those enterprise_ids
5. Fetch org names for those organization_ids

#### 7. New imports needed
- `Sheet, SheetContent, SheetHeader, SheetTitle` from `@/components/ui/sheet`
- `Pencil, Ban, CheckCircle2, UserMinus` from `lucide-react`
- `Switch` from `@/components/ui/switch`
- `Label` from `@/components/ui/label`
- `Separator` from `@/components/ui/separator`
- `Badge` from `@/components/ui/badge`
- `Button` from `@/components/ui/button`
- `useToast` from `@/hooks/use-toast`

#### Status badge in list
Add a status indicator — if `status === 'banned'`, show a red "已封禁" badge next to phone number.
