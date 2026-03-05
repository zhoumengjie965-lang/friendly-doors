
## 三个问题的根因与修复

### 问题1：企业管理员只显示手机，没有名字
**根因**：代码逻辑本身是对的（`first.name` 存在才显示），问题在于测试数据中的用户没有在 `users` 表设置 `name`。但从截图看确实只有手机号，显示是正确的（没有名字就只显示手机）。
**实际需改之处**：无代码 bug，但可以把列样式优化得更清晰——参照截图 image-85 的效果，手机号已正确显示，这本身就是正确行为。

### 问题2：禁用按钮无文字 ✅ 明确 bug
`AdminEnterprises.tsx` 第 291-295 行，`<Ban />` 图标后面没有"禁用"文字。需补充。

### 问题3：详情页余额信息
**根因**：summary cards 代码已存在（第 232-290 行），但测试企业的 `enterprise_balances` 表中可能没有对应行（只有充值过才有记录）。另外 `api_keys` 的 count 查询写法有问题：
```tsx
supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("enterprise_id", id)
```
`count` 选项在 `head: true` 时返回在 `.count` 属性上，但代码里用 `(keys as any)?.count` 而不是直接用返回的 `count` 字段。这会导致 API Key 总数始终为 0 或 undefined。

---

## 修改计划

### 修改 `src/pages/admin/AdminEnterprises.tsx`

**仅一处改动**：禁用按钮加上"禁用"文字
```tsx
// 修改前
<Ban className="w-3 h-3" />

// 修改后  
<Ban className="w-3 h-3 mr-1" />
禁用
```

### 修改 `src/pages/admin/AdminEnterpriseDetail.tsx`

**修复 API Key 数量查询**：正确使用 Supabase count 返回值
```tsx
// 修改前
supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("enterprise_id", id)
// 返回中 (keys as any)?.count

// 修改后：直接解构 count
const { count: keyCount } = await supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("enterprise_id", id);
setApiKeyCount(keyCount ?? 0);
```

**余额卡片确保有数据**：`enterprise_balances` 可能没有该企业的行，余额显示 ¥0.00 是正确的，但要确保不因为 null 而报错（当前代码已有 `?? 0` fallback，这个是对的）。

---

### 修改文件汇总
| 文件 | 改动 |
|------|------|
| `src/pages/admin/AdminEnterprises.tsx` | 禁用按钮加"禁用"文字 |
| `src/pages/admin/AdminEnterpriseDetail.tsx` | 修复 API Key count 查询写法 |
