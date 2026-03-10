
## Token Management Page Overhaul — `src/pages/admin/AdminTokens.tsx`

### What changes

**1. Remove "上帝视角" label (line 388)**
Delete the `<span>上帝视角</span>` label from the filter row. Keep the two filter inputs.

**2. Rename buttons (lines 408–415)**
- "复制所选令牌" → "批量复制"
- "删除所选令牌" → "批量删除"

**3. Slim the table to core columns**
Remove from `<thead>` and `<tbody>`: 分组、密钥、可用模型、IP 限制、创建时间、过期时间.

Keep in order: ☑ | 名称 | 所属企业 | 创建人 | 管理状态 | 运行状态 | 今日消耗 Tokens | 已用/总额度 | 操作

**4. Split "状态" into two columns**
- **管理状态**: Keep existing enabled/disabled badge + toggle action (via operation button)
- **运行状态** (new, computed front-end):
  - 正常 → green tag `bg-green-50 text-green-700`
  - 已过期 → gray tag `bg-gray-100 text-gray-500`
  - 额度耗尽 → red tag `bg-red-50 text-red-600`
  - Rule: if `expires_at < now` → 已过期; else if `total_quota !== null && used_quota >= total_quota` → 额度耗尽; else → 正常

**5. Detail Drawer**
Add a new state `drawerKey: ApiKey | null`. Add a "详情" icon button (`FileText` icon) in the operations column. A `Sheet` (right-side drawer) opens with the hidden technical fields: 分组、密钥 (with show/copy)、可用模型、IP 限制、创建时间、过期时间. The drawer also supports future edit.

**6. "所属企业" column → clickable link**
Wrap the enterprise name in a `<button>` that calls `navigate(`/admin/enterprises/${k.enterprise_id}`)`. Blue color, hover underline.

**7. "排除内部测试数据" toggle switch**
New state `excludeInternal: boolean`. Add a Switch + label in the top filter row 1. When on, filter out keys where `isInternalEnterprise(enterpriseName)` is true. When off, show "内部自用" badge on those rows (already done — the `FlaskConical` badge, rename it to "内部自用").

**8. Phone masking** — already done (`maskPhone`). No change needed.

**9. Today's Token consumption warning**
Currently `—` placeholder. Keep `—` but add: if the mock value > 100k (future), display red bold. For now keep as-is with the tooltip.

**10. Internal badge rename**
Change badge text from "内部测试" → "内部自用" (matches the spec).

### Files changed
- `src/pages/admin/AdminTokens.tsx` — full rewrite of the table section + new drawer + filter row tweaks

### New imports needed
- `Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose` from `@/components/ui/sheet`
- `Switch` from `@/components/ui/switch`
- `useNavigate` from `react-router-dom`
- `FileText` from `lucide-react` (already imported via AdminLayout, need here too)
- `Label` from `@/components/ui/label`

### Column structure after change
```text
☑ | 名称 | 所属企业 (link) | 创建人 (masked) | 管理状态 (badge) | 运行状态 (computed badge) | 今日消耗 Tokens | 已用/总额度 | 操作 (禁用/启用 + 详情 + 删除)
```

### Filter bar structure
```text
Row 1: [EnterpriseCombobox] [创建人 input] ——right: [排除内部测试数据 Switch+label]
Row 2: [+添加令牌] [批量复制] [批量删除] ——right: [搜索名称] [搜索密钥] [查询] [重置]
```
