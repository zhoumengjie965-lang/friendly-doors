
## 计划：企业管理页面全面升级

### 目标
参照客户端截图（组织管理 + 组织治理页面）以及用户需求，升级管理端企业管理为：
1. **列表页增强**：新增字段列，操作按钮增强
2. **新建企业详情全屏页**：含3个Tab（基本信息、财务对账、组织架构），顶部4张汇总卡片

---

### 文件修改

#### 1. `src/pages/admin/AdminEnterprises.tsx`（列表页）

**表格列调整**（对照客户端组织管理表格字段）：

| 列 | 内容 |
|---|---|
| 企业名称 | 企业名 + 企业码（sub-text） |
| 负责人 | owner_phone |
| 认证状态 | badge |
| 余额/总消耗 | `¥{balance} / ¥{total_consumed}` |
| 组织数/成员数 | `{org_count} 组织 / {member_count} 人` |
| 操作 | 详情（跳转）+ 快速充值（小Dialog）+ 禁用 |

**数据增强**：额外 fetch `enterprise_balances` 取 `balance + total_consumed`，`organizations` 取 `org_count`。

**操作栏**：
- 「详情」→ `useNavigate` 跳转 `/admin/enterprises/:id`
- 「快速充值」→ 内联小 Dialog（金额 + 备注）
- 「禁用」→ UI only（enterprises 表无 status 字段，按钮展示但 toast 提示"功能开发中"）

#### 2. 新建 `src/pages/admin/AdminEnterpriseDetail.tsx`（详情页）

**顶部4卡片**（对齐客户端组织治理"组织数据总览"风格）：
- 企业当前余额
- 总消耗额度  
- API Key 总数
- 成员总数

**Tab 1 - 基本信息**：企业名称、唯一ID、企业码、负责人手机、注册时间、认证状态 + 认证详情

**Tab 2 - 财务对账**：
- 充值历史列表（`balance_records` 表）：时间、类型（badge）、金额、操作人、备注
- 手动充值按钮（调用 `admin_recharge_enterprise` RPC）

**Tab 3 - 组织架构**（参照客户端 OrgManagement 字段）：
- 左侧：组织列表（名称 + 状态 badge）
- 右侧：选中组织的成员列表，字段对照客户端 OrgGovernance：成员（姓名+脱敏手机）、角色、单日上限、状态

#### 3. `src/pages/admin/AdminLayout.tsx`

新增路由：
```tsx
<Route path="enterprises/:id" element={<AdminEnterpriseDetail />} />
```

---

### 数据来源
- `enterprise_balances`：`balance`, `total_consumed`
- `organizations`：count 得 org_count，列表字段：name, status, monthly_budget, current_month_budget, admin_phone
- `members`：count 得 member_count，字段：user_phone, role, daily_limit, status
- `users`：phone → name 映射（用于成员姓名显示）
- `api_keys`：count 得 API Key 总数
- `balance_records`：充值历史

### 无需数据库变更
