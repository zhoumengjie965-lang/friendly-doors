
## Analysis

Current column order (line 329-337): 手机号 | 姓名 | 所属企业 | 角色 | 个人余额 | 注册时间 | 操作

Requested new order: 手机号 | 姓名 | **个人余额** | **所属企业** | **角色** | 注册时间 | 操作

Plus visual grouping:
- 个人余额 → light background / left border marking "个人空间" zone
- 所属企业 + 角色 → visually grouped as "企业身份" zone
- Empty state: enterprises → `-`, role → `个人用户` (not italic "个人用户" text)

## Changes — `src/pages/admin/AdminUsers.tsx` only

### 1. Header row (line 329-337)
Reorder columns: `手机号 | 姓名 | 个人余额 | 所属企业空间 | 角色 | 注册时间 | 操作`

Add visual treatment to header cells:
- `个人余额` header: `bg-blue-50/60` left border `border-l-2 border-l-blue-200` + slightly different bg
- `所属企业空间` and `角色` headers: `bg-amber-50/40` subtle warm tint to group them

### 2. Data rows (line 344-398)
Reorder the cells to match: phone → name → personal_balance → enterprise → role → date → actions

Apply same cell-level background highlights:
- Personal balance cell: `bg-blue-50/40 border-l-2 border-l-blue-200` 
- Enterprise cell + role cell: `bg-amber-50/30`

### 3. `enterpriseCell` update (line 265-290)
- When `ents.length === 0`: return `<span className="text-muted-foreground/50">-</span>` (just a dash, clean)

### 4. `roleCell` update (line 292-296)  
- When `ents.length === 0`: return `<span className="text-muted-foreground/70">个人用户</span>` (replace `—`)

### Grid template stays the same: `grid-cols-[1.5fr_1fr_1fr_1.5fr_1fr_1fr_80px]`
Slight tweak: personal balance doesn't need 1.5fr, can be `1fr`. Enterprise gets `1.5fr`. So: `[1.5fr_1fr_1fr_1.5fr_1fr_1fr_80px]` — same total proportions, just reordered logically.

## Summary of changes
1. Swap `个人余额` to be 3rd column (after 姓名), before 所属企业
2. Apply `bg-blue-50/40 border-l-2 border-l-blue-200` to personal balance header + cell
3. Apply `bg-amber-50/30` to enterprise + role header + cells  
4. `enterpriseCell`: empty state → `-`
5. `roleCell`: empty state → `个人用户`
6. Header labels: "所属企业" → "所属企业空间", keep "角色"
