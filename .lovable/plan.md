
## 修改范围：`src/pages/ApiKeys.tsx`，4 处精准改动

### 改动 1：删除企业管理员「我的 key」Tab 的成员筛选框（第 758 行）

**当前条件**：`(previewRole === "admin" || activeTab === "org")` — 导致 admin 在「我的」Tab 也显示成员筛选
**改为**：`activeTab === "org"` — 仅在组织 Tab 显示，与 org_admin 行为保持一致

---

### 改动 2：企业管理员组织 Tab 加载全企业成员数据（第 232-247 行）

当前当 `targetOrgId = null`（admin 默认情况）时，`orgMembers` 被置空 `[]`，导致组织 Tab 的成员筛选下拉无数据。

**修改**：在 `else { setOrgMembers([]) }` 分支中，增加判断：当 `role === "admin"` 且无 targetOrgId 时，改为按 `enterprise_id` 查全企业成员：

```
} else if (role === "admin") {
  // 查全企业所有活跃成员
  const { data: members } = await supabase
    .from("members")
    .select("user_phone, users(name)")
    .eq("enterprise_id", enterprise.id)
    .eq("status", "active");
  setOrgMembers(members?.map(...) ?? []);
} else {
  setOrgMembers([]);
}
```

数据获取侧（无 org 过滤的全企业 Key）已经是正确的，只需补充成员列表数据即可。

---

### 改动 3：企业管理员对他人 Key 隐藏编辑按钮（第 607-613 行）

在编辑按钮外层加条件：当 `previewRole === "admin"` 且 `k.creator_phone !== phone` 时，不渲染编辑按钮（删除和启停按钮保留）。

```tsx
{!(previewRole === "admin" && k.creator_phone !== phone) && (
  <button onClick={() => openEdit(k)} ...>
    <Pencil />
  </button>
)}
```

---

### 改动 4：企业管理员视角移除「创建 API Key」按钮（第 780-812 行）

当前三元判断：`org_admin && org tab ? 配置按钮 : 创建按钮`
改为三路判断：`org_admin && org tab ? 配置按钮 : admin ? null : 创建按钮`

```tsx
{previewRole === "org_admin" && activeTab === "org" ? (
  /* 配置 & 高级权限按钮 */
) : previewRole !== "admin" ? (
  <Button onClick={openCreate}>创建 API Key</Button>
) : null}
```

---

### 改动汇总
| # | 位置 | 类型 |
|---|------|------|
| 1 | 行 758 | 条件表达式 1 行修改 |
| 2 | 行 232-247 | else 分支新增 ~8 行 |
| 3 | 行 607-613 | 按钮外层加条件包裹 |
| 4 | 行 780-812 | 三元改三路 ~3 行 |
