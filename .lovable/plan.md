
## Two focused layout tweaks — `src/pages/admin/AdminUsers.tsx` only

### Change 1: Basic info — 2×2 grid (lines 394–447)

Currently 4 rows stacked vertically with `space-y-4`. Redesign as a **2×2 grid** — left column: 用户名 + 账号状态, right column: 手机号 + 密码重置.

```tsx
<div className="grid grid-cols-2 gap-x-4 gap-y-3">
  {/* 用户名 — top-left */}
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-xs text-muted-foreground">用户名</Label>
      <p className="text-sm mt-0.5">{drawerUser.name || "—"}</p>
    </div>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={...}>
      <Copy className="w-3.5 h-3.5" />
    </Button>
  </div>

  {/* 手机号 — top-right */}
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-xs text-muted-foreground">手机号</Label>
      <p className="text-sm mt-0.5 font-medium tabular-nums">{drawerUser.phone}</p>
    </div>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={...}>
      <Copy className="w-3.5 h-3.5" />
    </Button>
  </div>

  {/* 账号状态 — bottom-left */}
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-xs text-muted-foreground">账号状态</Label>
      <p className="text-sm mt-0.5">...</p>
    </div>
    <Switch ... />
  </div>

  {/* 密码重置 — bottom-right */}
  <div className="flex items-center justify-between">
    <div>
      <Label className="text-xs text-muted-foreground">密码重置</Label>
      <p className="text-xs text-muted-foreground mt-0.5">强制用户下次登录时重置密码</p>
    </div>
    <Button size="sm" variant="outline" ...>重置密码</Button>
  </div>
</div>
```

### Change 2: Personal space — label outside card, tighter padding (lines 459–486)

Move "个人空间" text **above** the card border, reduce internal padding from `p-4 space-y-3` to `p-3 space-y-2`:

```tsx
{/* 个人空间 */}
<div>
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">个人空间</p>
  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">当前余额</span>
      <span className="font-semibold tabular-nums">¥{...}</span>
    </div>
    {/* balance edit input + 保存 button + disclaimer — unchanged */}
  </div>
</div>
```

### Files changed
- `src/pages/admin/AdminUsers.tsx` — lines 394–486 only
