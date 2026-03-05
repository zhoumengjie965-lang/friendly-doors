
## 分析用户的 4 个问题

### 问题1：列宽不均，操作按钮显示不全
当前 grid 模板：`grid-cols-[2fr_1fr_1fr_1.4fr_1.2fr_140px]`
- `2fr` 给企业名称太宽，其他列挤压
- 操作栏 `140px` 不够放3个按钮（详情+充值+禁用图标）

**修复方案**：改为 `grid-cols-[1.5fr_1.2fr_100px_1.2fr_1fr_160px]`，企业名称缩小，操作栏扩宽到160px。

### 问题2："负责人"改为"企业管理员"，显示姓名+手机号
- 当前只显示 `owner_phone`（负责人手机），但客户端"企业管理员"是通过 `members` 表中 `role='admin'` 的成员存储的
- 需要额外 fetch `members` 表（`role='admin'`）+ `users` 表获取姓名
- 最多3个管理员，列表里显示方式：若只有1个管理员，显示"姓名\n手机"；若有多个，折叠显示第一个+其余数量角标

### 问题3：多个管理员（最多3个）如何展示
- 显示第一个管理员的姓名/手机，若有更多则显示 `+N` 徽标（如 `+2`）
- hover 或 tooltip 展示全部管理员列表

### 问题4：余额预警信息是否需要在列表页显示
从 `enterprise_balances` 中已有 `alert_threshold`、`alert_email`、`alert_method` 字段。
- **建议**：列表页不展示（信息密度已高，且预警是企业自己的配置）。企业详情页的财务Tab已有这些数据。
- 用一个问题确认用户意图。

实际上用户只是"问是否需要"，不是"要求加"，所以回答：列表页不加，详情页财务Tab里会看到。

---

## 计划

### 修改 `src/pages/admin/AdminEnterprises.tsx`

**1. 数据层：新增管理员数据 fetch**
```
// 新增：fetch 所有企业的 admin 成员
{ data: adminMembers } = await supabase
  .from("members")
  .select("enterprise_id, user_phone, role")
  .in("enterprise_id", ids)
  .eq("role", "admin")

// 同时 fetch users 表获取姓名
{ data: userNames } = await supabase
  .from("users")
  .select("phone, name")
  .in("phone", adminPhones)
```

**2. Enterprise 接口新增字段**
```ts
admins: { phone: string; name: string | null }[]
```

**3. 列宽修正**
```
grid-cols-[1.4fr_1.4fr_90px_1.2fr_1fr_160px]
```
列顺序：企业名称 | 企业管理员 | 认证状态 | 余额/总消耗 | 组织/成员 | 操作

**4. "企业管理员"列渲染**
- 最多展示1个管理员，格式：上行姓名（若有）、下行脱敏手机
- 若有多个管理员，右侧显示 `+N` 小徽标
- 脱敏规则：`138****8888`（参照客户端 OrgGovernance 样式）

**操作栏**：160px，三个按钮：详情（图标+文字）、充值（Zap图标+文字）、禁用（Ban图标，无文字），排列紧凑

---

### 关于余额预警
不在列表页展示。理由：
1. 预警设置是企业内部配置，不是管理员日常监控维度
2. 列表已有余额数字，异常余额一目了然
3. 企业详情页→财务对账 Tab 中可以查看/设置预警

---

### 修改文件
只修改 `src/pages/admin/AdminEnterprises.tsx`，不涉及其他文件。
