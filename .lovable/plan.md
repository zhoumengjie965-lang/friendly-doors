

## 5 items to fix, both client and admin in sync

### Issues identified from the images:

1. **Search bar wraps to 2 rows** — "模型" goes to a second line in the expanded section. Fix: merge everything into one row, remove the expand/collapse mechanism entirely, put Time + APIKey + Model + 搜索 + 重置 all inline.

2. **重置 button has × icon** — remove the `<X />` icon, keep only the text "重置".

3. **分组 and 类型 table headers need visible dropdown triangle** — they already use `ChevronDown` but the `[&>svg]:hidden` class on `SelectTrigger` hides Radix's built-in arrow. The custom `ChevronDown` is manually added inline. The issue is that the `SelectTrigger` wrapper class `[&>svg]:hidden` may be hiding the icon. Need to verify the icons actually render. Looking at the code more carefully:
   - `SelectTrigger` has `[&>svg]:hidden` which would hide the `ChevronDown` added inside the trigger span wrapper. 
   - But the `ChevronDown` is placed *outside* the SelectTrigger's children... wait, it IS inside. So `[&>svg]:hidden` would hide Radix's own icon but the manually-added `ChevronDown` is also an svg. This means the triangle IS hidden.
   - Fix: wrap the trigger content in a `flex items-center gap-0.5` span and put the ChevronDown *as a sibling to the span* but still inside SelectTrigger — or more precisely, remove `[&>svg]:hidden` and replace Radix icon with the manual one by using the existing pattern more carefully. Actually the current pattern in both files does: `<SelectTrigger className="... [&>svg]:hidden">` then inside has `<span>分组</span><ChevronDown />` — the `[&>svg]:hidden` hides ALL svgs including the manual ChevronDown. That's the bug. Fix: remove `[&>svg]:hidden` but also suppress Radix's default icon via wrapping differently, OR keep `[&>svg]:hidden` and use a different approach — put a non-svg indicator like a CSS triangle, or better: use a `<span>▾</span>` text character, or remove `[&>svg]:hidden` and rely on Radix's own ChevronDown (it already adds one).
   - Simplest fix: remove `[&>svg]:hidden` so the Radix-provided ChevronDown shows, and remove the manually added one to avoid duplication. This will show the dropdown triangle.

4. **输入/输出 should show token count (numbers), 花费 show ¥amount, 详情 show text** — Looking at the data: `input: 156, output: 312, cost: 0.003, detail: "Request completed..."`. Currently in CallLogs.tsx lines 356-358 there's a `...` gap suggesting model column is there. The columns currently render: `row.cost` as a number without ¥, and `row.detail` as text. 
   - Fix: input/output show as token numbers (already numeric), cost should be formatted as `¥0.003`, detail column should have a "查看" button or show the text truncated (it already does truncate). 
   - Actually looking at image 1: "详情" column shows "..." (three dots) suggesting a button to expand. Currently in the code `row.detail` is shown as truncated text. Per the user: "详情才是文字" — so the text content goes into 详情. This seems already correct but let's also format cost as ¥.
   - For the 模型 column rendering in CallLogs.tsx — line 356 shows `...` which means the model cell exists between type and duration but I can't see it due to truncation. Let me check: the table row has time, apiKey, org/member (conditional), group, type, then `...`, then cost and detail. The hidden part includes model and duration cells.
   - Key fix needed: cost column should show `¥{row.cost}` formatted, and input/output are already numbers. Also the "详情" column shows detail text truncated — user says this is correct (详情才是文字). So the main fix here is just **format cost with ¥ sign**.

5. **Sync to both files** — all above changes apply to `CallLogs.tsx` AND `AdminCallLogs.tsx`.

### Exact changes:

**Both files — Filter bar:**
- Remove the expand/collapse section (remove `expanded` state, remove expand button, remove second row)
- Put all 3 fields (Time + APIKey + Model) + 搜索 + 重置 on ONE row
- Remove `<X className="w-3.5 h-3.5" />` from the 重置 button (text only)
- In `AdminCallLogs.tsx` the filter bar is already one row (time + APIKey input + model select + reset) — just remove the X icon from reset

**Both files — Table headers 分组 + 类型:**
- Remove `[&>svg]:hidden` from `SelectTrigger` className
- Remove the manually-added `<ChevronDown className="w-3 h-3" />` (since Radix will now show its own)
- This makes the dropdown triangle visible natively

**Both files — Table body cost column:**
- Change `{row.cost}` to `{row.cost > 0 ? `¥${row.cost}` : '¥0.000'}`  or `¥{row.cost.toFixed(3)}`

**CallLogs.tsx specifically:**
- Client's filter bar currently has: Time | APIKey | 搜索 | 重置 | [展开→Model]
- Merge into one line: Time | APIKey | Model input | 搜索 | 重置 (no expand/collapse)
- Remove `expanded` state and `setExpanded`

**AdminCallLogs.tsx filter bar:**
- Already one row (time + APIKey input + model select + reset button) — just remove X icon from reset

### Files to change:
- `src/pages/CallLogs.tsx`
- `src/pages/admin/AdminCallLogs.tsx`

