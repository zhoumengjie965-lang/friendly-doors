
# CreateOrgDialog 两处优化

## 需要做的改动

### 1. 单个添加模式 — 三个字段改为一行
目前手机号、姓名、角色选择是三行竖排。改为一行横排：

```
[手机号输入框] [姓名输入框] [角色下拉]
```

- 使用 `grid grid-cols-3 gap-2` 布局
- 三个字段等宽排列
- 姓名 placeholder 改为简短的"姓名（必填）"
- 角色下拉宽度自适应
- 状态提示文字保留在三列下方

### 2. 新增"设置组织管理员"字段（放在月预算下方，邀请成员上方）

在"默认月预算"和"邀请初始成员"之间新增一个区块：

```
设置组织管理员（可选）
[下拉选择：不指定（默认企业管理员）/ 企业成员列表]
提示文字：不指定时该组织默认由企业管理员管理
```

**数据来源**：`existingMembers` 已通过 Props 传入（包含 `user_phone` 和 `role`），但缺少姓名。需要新增一个 `memberNames` prop，或直接在 `CreateOrgDialog` 内部查询 `users` 表获取姓名映射。

**方案选择**：在 `CreateOrgDialog` 打开时（`open` 变为 true），查询一次 `users` 表获取姓名映射 `userMap`，避免改动 Props 接口。

**逻辑**：
- 新增 `orgAdminPhone` state（默认 `"__none__"`）
- 提交时：若 `orgAdminPhone !== "__none__"`，则 `admin_phone: orgAdminPhone`，否则 `admin_phone: null`
- 重置时清空 `orgAdminPhone` 为 `"__none__"`

---

## 文件变更

| 文件 | 改动 |
|------|------|
| `src/components/CreateOrgDialog.tsx` | ① 单个添加三字段改一行；② 新增设置组织管理员下拉 |

## 无数据库变更

`admin_phone` 列已存在于 `organizations` 表，直接写入即可。
