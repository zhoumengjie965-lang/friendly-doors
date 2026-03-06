
## Plan: Refactor Edit Drawer — Read-only fields + improved space asset layout

### Current state
- 用户名 and 手机号 are editable inputs with Save buttons
- Personal space card has plain muted bg, no disclaimer text
- Enterprise list uses tooltip-triggered `UserMinus` icon button (not obvious)

### Changes — `src/pages/admin/AdminUsers.tsx` only

#### 1. Make 用户名 and 手机号 read-only (lines 423–452)

Remove editable inputs + save buttons. Replace each with a read-only display row:
- Show the value as plain text
- Add a `Copy` icon button (from lucide-react) that copies to clipboard via `navigator.clipboard.writeText()`
- Add `Copy` to imports

```tsx
{/* 用户名 */}
<div className="flex items-center justify-between">
  <div>
    <Label className="text-xs text-muted-foreground">用户名</Label>
    <p className="text-sm mt-0.5">{drawerUser.name || "—"}</p>
  </div>
  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
    onClick={() => { navigator.clipboard.writeText(drawerUser.name || ""); toast({ title: "已复制" }) }}>
    <Copy className="w-3.5 h-3.5" />
  </Button>
</div>

{/* 手机号 */}
<div className="flex items-center justify-between">
  <div>
    <Label className="text-xs text-muted-foreground">手机号</Label>
    <p className="text-sm mt-0.5 font-medium tabular-nums">{drawerUser.phone}</p>
  </div>
  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
    onClick={() => { navigator.clipboard.writeText(drawerUser.phone); toast({ title: "已复制" }) }}>
    <Copy className="w-3.5 h-3.5" />
  </Button>
</div>
```

Also remove now-unused state: `editName`, `editPhone`, `savingName`, `savingPhone` and their handlers `handleSaveName`, `handleSavePhone`.

#### 2. Personal space card — add disclaimer (lines 492–518)

Keep the existing `bg-muted/40` card, but:
- Change card bg to `bg-blue-50/50 border border-blue-100`
- After the balance edit section, add a disclaimer line:
  ```tsx
  <p className="text-xs text-blue-500/70 mt-1">此操作仅影响个人钱包，不影响企业配额</p>
  ```

#### 3. Enterprise member list — replace tooltip icon with explicit red button (lines 520–557)

Change the grid from `grid-cols-[1fr_1fr_80px_60px]` to `grid-cols-[1fr_1fr_80px_auto]`.

Replace `TooltipProvider` + `UserMinus` icon with a plain small red destructive-variant button:
```tsx
<Button
  variant="outline"
  size="sm"
  className="h-6 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
  onClick={() => handleRemoveMember(m.id)}
>
  解绑
</Button>
```

This matches the user's request for "a red 解绑企业 button" that's visually obvious.

#### 4. Import update
Add `Copy` to lucide-react imports (line 12).

#### 5. Cleanup
Remove state vars and handlers no longer needed:
- `editName`, `setEditName`
- `editPhone`, `setEditPhone`  
- `savingName`, `setSavingName`
- `savingPhone`, `setSavingPhone`
- `handleSaveName`
- `handleSavePhone`

### Files changed
- `src/pages/admin/AdminUsers.tsx` — drawer section only (~lines 55–60, 203–221, 423–555)
