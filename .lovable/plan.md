
## 计划：「计费管理」→「兑换码管理」

用户上传截图是 newAPI 的兑换码管理页面参考，要求：
1. 侧边栏「计费管理」改名为「兑换码管理」，路由 `billing` → `redeem`（或保持 billing 路由不变，只改 label）
2. 页面重构为类似截图的表格样式：顶部工具栏（添加兑换码、复制所选到剪贴板、清除失效兑换码）+ 右侧搜索框 + 表格（复选框、ID、名称、状态、额度、创建时间、过期时间、兑换人ID）

### 修改文件

**`src/pages/admin/AdminBilling.tsx`**（重命名为 AdminRedeem 逻辑，保持文件名不动）
- 页面标题改为"兑换码管理"
- 移除企业充值 card，移除生成兑换码 card 的旧布局
- 重构为新布局：
  - 顶部工具栏：「添加兑换码」按钮（蓝色）、「复制所选兑换码到剪贴板」按钮、「清除失效兑换码」按钮（红色文字）、右侧关键字搜索框 + 查询/重置按钮
  - 表格列：复选框 | ID | 名称（兑换码 code）| 状态（未使用/已使用 badge）| 额度 | 创建时间 | 过期时间 | 兑换人ID
  - 空状态：显示"暂无兑换码"文字（截图中的空结果插图用文字代替）
  - 「添加兑换码」点击弹出 Dialog，填写：名称/备注、面值、数量（1-100）、有效期（可选）
- 保留真实 supabase 数据：`redeem_codes` 表，`admin_create_redeem_code` RPC

**`src/pages/admin/AdminLayout.tsx`**
- NAV_GROUPS 中「计费管理」label 改为「兑换码管理」，图标改为 `Ticket`（lucide）

### 数据库
`redeem_codes` 表现有字段：id, code, amount, status, created_at, used_by。
- `name`/`expired_at` 字段可能不存在，显示时 fallback 到 code 字段和"—"
- 不需要迁移，用现有字段

### 无需数据库变更
