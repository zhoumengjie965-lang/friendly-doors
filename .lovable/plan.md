

## Plan: Update Admin Nav + Create Admin Token Management Page

### 1. Update Admin Sidebar Navigation

**File: `src/pages/admin/AdminLayout.tsx`**

Change the "控制台" group from 2 items to 4:
```
控制台:
  - 数据总览 (dashboard) — LayoutDashboard
  - 资源统计 (resource-stats) — BarChart2
  - 调用日志 (call-logs) — FileText  (rename from 使用日志)
  - 令牌管理 (tokens) — Key
```

Add corresponding routes for `resource-stats` and `tokens`.

### 2. Create Admin Resource Stats Page

**New file: `src/pages/admin/AdminResourceStats.tsx`**

A simplified admin-level resource statistics page (similar to the client-side `ResourceStats.tsx` but with an enterprise filter dropdown). Mock data for now.

### 3. Create Admin Token Management Page

**New file: `src/pages/admin/AdminTokens.tsx`**

Based on the reference screenshot (image-107), this is a full token/API key management page at the platform admin level. Key features:

- **Header**: "令牌管理" title with "聚类列表" toggle in top-right
- **Action bar**: "添加令牌", "复制所选令牌", "删除所选令牌" buttons + search by keyword + search by key value + "查询"/"重置" buttons
- **Table columns**: Checkbox, 名称, 状态 (已启用), 剩余额度/总额度, 分组, 密钥 (masked with show/copy), 可用模型 (icons), IP限制, 创建时间, 过期时间, 操作 (聊天/禁用/编辑/删除)
- **Data**: Query all `api_keys` across all enterprises (admin view)
- **Operations**: Enable/disable, edit, delete tokens via existing RPC patterns
- Pagination footer reusing the same pattern from `AdminCallLogs`

### 4. Rename "使用日志" to "调用日志"

In `AdminLayout.tsx`, update the label from "使用日志" to "调用日志".

### Files to modify
- `src/pages/admin/AdminLayout.tsx` — nav items + routes
- `src/pages/admin/AdminResourceStats.tsx` — new file
- `src/pages/admin/AdminTokens.tsx` — new file

