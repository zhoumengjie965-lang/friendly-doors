
# 组织管理页面实现方案

## 背景与确认信息
根据用户回答：
- **顶部统计**：组织数和成员数读真实值，API Key 显示 `—`
- **组织管理员角色**：三级角色体系（企业管理员 / 组织管理员 / 普通成员），创建邀请时可指定目标角色为组织管理员
- **预算存储**：直接加在 `organizations` 表（简洁方案）
- **危险操作权限**：仅企业管理员
- **status 字段**：确认添加启用/禁用状态

---

## 1. 数据库变更（迁移脚本）

### organizations 表新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| status | text | 'active' / 'disabled'，默认 'active' |
| monthly_budget | numeric | 默认月预算（元），可为 null 表示不限 |
| current_month_budget | numeric | 当前月预算覆盖，可为 null 表示使用默认值 |
| admin_phone | text | 组织管理员手机号，可为 null |

### organizations 表新增 RLS 策略

- **UPDATE**：任何人都可以（与现有其他表保持一致，auth 由 app.current_phone 控制）
- **DELETE**：任何人都可以

### members 表：角色值扩展
`role` 字段支持 'admin'（企业管理员）、'org_admin'（组织管理员）、'member'（普通成员）。现有字段无需变更，只是增加新的 role 值。

---

## 2. 页面结构（图1 - 主页面）

### 顶部统计栏（3个卡片）
- **组织总数**：从 organizations 表 count
- **企业成员数**：从 members 表 count（当前企业）
- **API Key 数**：显示 `—`（待实现）

### 组织列表表格
每行显示：

| 列名 | 内容 |
|------|------|
| 组织名称 | 文字 |
| 组织管理员 | 手机号 / 未设置 |
| 成员数 | 该组织下 members 数量 |
| 月预算 | 数字 + 设置图标按钮（点击弹出抽屉） |
| 状态 | 启用/禁用 Badge |
| 操作 | 管理按钮（下拉菜单） |

### 右上角：创建组织按钮（仅企业管理员可见）

---

## 3. 创建组织弹窗（图2）

表单字段：
- **组织名称**（必填）
- **组织管理员**（可选，手机号输入，支持从现有企业成员中选择，或填写新成员手机号——新成员会收到邀请）
- **默认月预算**（可选，数字输入，为空表示不限制）

提交逻辑：
1. 创建 organizations 记录（含 admin_phone、monthly_budget）
2. 若 admin_phone 是现有成员：更新其 `role` 为 `org_admin`，`organization_id` 指向新组织
3. 若 admin_phone 是新人：创建 invitations 记录，role 字段标记为 `org_admin`，等待对方接受时自动赋予组织管理员角色

---

## 4. 管理按钮下拉菜单（图3）

点击每行最右侧"管理"按钮，显示操作列表：
- **编辑组织名称**：弹出简单输入框修改名称
- **设置组织管理员**：弹出对话框，从现有成员选择或邀请新成员
- **启用 / 禁用**：切换 status 字段（仅企业管理员，禁用后成员仍存在但标记禁用）
- **删除组织**：二次确认 AlertDialog，确认后删除（仅企业管理员，若为默认组织则提示不可删除）

---

## 5. 预算设置抽屉（图4）

从右侧滑入（Sheet 组件），包含：
- **默认月预算**：数字输入框（元/月，空=不限）
- **当前月预算覆盖**：可临时覆盖本月预算（空=使用默认值）
- **保存**按钮：更新 organizations 表

---

## 6. 路由集成

在 `src/pages/Workspace.tsx` 中新增路由匹配：
```
/workspace/enterprise/orgs → <OrgManagement enterprise={enterprise} role={role} />
```

---

## 7. 新建文件

| 文件 | 说明 |
|------|------|
| `src/pages/OrgManagement.tsx` | 主页面：统计卡片 + 组织列表表格 |
| `src/components/CreateOrgDialog.tsx` | 创建组织弹窗 |
| `src/components/OrgBudgetSheet.tsx` | 预算设置抽屉 |

---

## 8. 关键边界处理

- 默认组织（名为"默认组织"或第一个创建的）不允许删除
- 禁用组织后，列表中该行 status badge 变为灰色"已禁用"
- 若邀请的组织管理员尚未注册，invitations 记录保存后会在对方首次登录并接受邀请时赋予 org_admin 角色（需修改 `acceptInvitation` 逻辑以读取 invitations 表中携带的 role 字段）
- 仅企业管理员（role=admin）可见创建/编辑/删除/启用禁用按钮；组织管理员仅可查看自己管辖的组织信息
