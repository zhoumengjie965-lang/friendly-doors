
# 修复两个问题

## 问题一：创建组织时默认月预算字段丢失

`CreateOrgDialog.tsx` 在上一次批量添加功能改造中，遗漏了"默认月预算（元）（可选）"输入字段。需要恢复该字段，并在创建组织时将其写入 `monthly_budget` 列。

### 改动位置
`src/components/CreateOrgDialog.tsx`：
- 新增 `monthlyBudget` state（`string`，默认 `""`）
- 在"组织名称"和"邀请初始成员"之间，插入月预算输入框（类型 number，placeholder "留空表示不限制"）
- `handleCreate` 中写入 `monthly_budget: monthlyBudget === "" ? null : Number(monthlyBudget)`
- 重置时清空 `monthlyBudget`

---

## 问题二：设置组织管理员改为从成员中选择

`OrgManagement.tsx` 中"设置管理员"弹窗目前是手动输入手机号的 `Input`，需要改为下拉选择，从企业成员中挑选，并支持"不指定（默认企业管理员）"选项。

### 改动位置
`src/pages/OrgManagement.tsx`：

1. **数据增强**：`load()` 时同步查询 `users` 表，获取企业成员的姓名，用于在下拉选项中展示"姓名 + 脱敏手机号"

2. **UI 改造**：将"设置管理员"弹窗中的 `Input` 替换为 `Select`：
   ```
   [不指定（默认企业管理员）]
   [张三 - 138****0001]
   [李四 - 139****0002]
   ...（仅列出该企业所有 active 成员）
   ```

3. **逻辑调整**：
   - 选择"不指定"时，`admin_phone` 更新为 `null`
   - 选择某成员时，将该成员的 `role` 更新为 `org_admin`，`organization_id` 更新为该组织
   - `setNewAdminPhone` 保持现有逻辑不变，只替换 UI 输入方式

4. **显示优化**：组织列表"组织管理员"列，若 `admin_phone` 有值，尝试匹配 `users` 表中的姓名来显示姓名而非手机号（格式：姓名 / 若无姓名则显示脱敏手机号）

---

## 文件变更清单

| 文件 | 改动 |
|------|------|
| `src/components/CreateOrgDialog.tsx` | 恢复默认月预算输入字段 |
| `src/pages/OrgManagement.tsx` | 设置管理员改为成员下拉选择，列表显示姓名 |

## 无数据库变更

不需要新增迁移，所有字段已存在。
