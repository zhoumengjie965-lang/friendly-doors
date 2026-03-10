
## Tab Restructure: Call Logs (Both Client & Admin)

### Current State
Both `src/pages/CallLogs.tsx` (client) and `src/pages/admin/AdminCallLogs.tsx` (admin) have 3 tabs:
- 使用日志 | 绘图日志 | 任务日志

### Target State
Rename and restructure to 3 new tabs:
- **调用日志** (Call Logs) — existing 使用日志, API-key calls only, type filter: 消费(成功) / 错误(失败)
- **任务日志** (Task Logs) — merge 绘图日志 + 任务日志 data, add 任务ID + 执行状态 columns, task ID click opens detail
- **审计日志** (Audit Logs) — new tab, 系统行为: login, token changes, settings. Columns: 操作人/操作内容/操作结果/IP

---

### Changes to `src/pages/CallLogs.tsx` (Client side)

**Tab rename + icon swap:**
```
调用日志 → Activity icon
任务日志 → ClipboardList icon  
审计日志 → Shield icon
```

**调用日志 tab** (rename from 使用日志):
- Filter "类型" options: change to `消费` (成功) / `错误` (失败)
- Stats cards (消耗额度/RPM/TPM) stay here only
- Everything else unchanged

**任务日志 tab** (merge 绘图日志 + old 任务日志):
- Mock data: combine `mockTaskLogs` (already has taskId/status) + add a few drawing-type entries (`platform: "Midjourney"`, type `"文生图"`)
- Add status column: 进行中 (yellow dot) / 已完成 (green dot) / 失败 (red dot) — map existing `成功→已完成`, new `进行中` mock entries
- Task ID column: render as a blue monospaced button, clicking shows a simple inline `<details>` expansion or a `Dialog` with task result details (title + content)
- Filter: time range + 任务ID input + 执行状态 Select (全部/进行中/已完成/失败)

**审计日志 tab** (brand new):
- Mock data: 5-8 entries covering login events, token creation, settings change, password reset
- Fields: 时间 | 操作人 | 操作类型 badge | 操作内容 | 操作结果 badge | IP地址
- Filter: time range + 操作类型 Select (全部/登录/令牌操作/设置变更) + 重置
- Operation type badges: login→blue, token→purple, settings→gray, password→amber

---

### Changes to `src/pages/admin/AdminCallLogs.tsx` (Admin side)

Same 3-tab structure. Admin-specific additions:

**调用日志 tab:**
- Keep existing "所属企业" combobox + cascading org + unified filter bar (already done)
- Type filter renamed to: `消费 (成功)` / `错误 (失败)` matching client side
- 消耗额度/RPM/TPM stats only on this tab

**任务日志 tab:**
- Add "所属企业" enterprise column to the merged task log table
- Filter: time + 所属企业 combobox + 任务ID + 执行状态 Select

**审计日志 tab:**
- Add "所属企业" column to audit logs
- Operations: admin-level actions (enterprise approval, recharge, user ban, token bulk delete)
- Filter: time + 所属企业 + 操作人 + 操作类型

---

### Mock data additions

**Merged task log entries** (drawing + async tasks):
```ts
{ platform: "Midjourney", type: "文生图", status: "已完成", ... }
{ platform: "Stable Diffusion", type: "图生图", status: "进行中", ... }
// + existing Suno entries mapped: 成功→已完成
```

**Audit log mock:**
```ts
{ time, operator: "张三 · 138****8888", opType: "登录", content: "用户登录成功", result: "成功", ip }
{ time, operator: "李四 · 139****9999", opType: "令牌操作", content: "创建 API Key「生产环境」", result: "成功", ip }
{ time, operator: "王五 · 135****5555", opType: "设置变更", content: "修改预警阈值为 ¥500", result: "成功", ip }
{ time, operator: "张三 · 138****8888", opType: "登录", content: "登录失败：密码错误", result: "失败", ip }
```

---

### Implementation approach
- Edit `CallLogs.tsx`: rename tabs, update icons, update type filter labels, replace DrawingLogsTab with merged TaskLogsTab, add AuditLogsTab
- Edit `AdminCallLogs.tsx`: same tab rename + icons, update type filter labels, replace DrawingLogsTab with merged TaskLogsTab (+ enterprise column), add AuditLogsTab (+ enterprise column)
- Task ID click: use a `Dialog` from shadcn/ui showing task details (no new dependencies)
- Keep all existing filter bar work intact on admin调用日志 tab

### Files changed
- `src/pages/CallLogs.tsx`
- `src/pages/admin/AdminCallLogs.tsx`
