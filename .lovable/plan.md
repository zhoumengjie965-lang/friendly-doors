
## 目标

对 `src/pages/OrgGovernance.tsx` 进行以下三处改造：

---

## 改动 1 — 上下文感知按钮

**当前**：「一键配置预算」只在 `sub-orgs` Tab 显示。

**改后**：
- `members` Tab → 右上角增加「成员批量分配」按钮（outline）+ 原「添加成员」按钮
- `sub-orgs` Tab → 原「一键配置预算」改为「部门批量分配」按钮 + 原「创建子部门」

点击时分别设置 `budgetDialogMode: "members" | "sub-orgs"` 并打开同一个 `showBudgetDialog`。

---

## 改动 2 — 弹窗按模式切换内容

新增 state：`budgetDialogMode`、`memberDailyLimit`（成员单日上限输入）。

**部门分配模式**（已有，微调标题）：总包金额 → 均分 N 个部门 → 预览文案。

**成员分配模式**（新增）：
```
输入：统一单日上限（元）
预览卡片：
  单人月预算       ¥{limit × 30} / 月
  成员人数         {members.length} 人
  ─────────────────────────────
  预计总月成本     ¥{limit × 30 × members.length}
```
确认后 `setMembers` 将所有成员的 `daily_limit` 更新为该值，并调用 Supabase batch update。

---

## 改动 3 — 增删引导 Tip（两个 Tab 各一条）

**成员 Tab** — 在 `<Table>` 前插入（仅当有 `daily_limit === 0 || daily_limit === null` 的成员）：
```
检测到 X 个成员未配置预算，[点击一键配置]
```

**子部门 Tab** — 将现有橙色 Tip 文案改为统一格式（带计数）：
```
检测到 X 个子部门未配置预算，[点击一键配置]
```

两条 Tip 点击「一键配置」均打开对应模式的弹窗。

---

## 修改范围

| 位置 | 改动 |
|------|------|
| State 区（~line 114）| 增加 `budgetDialogMode`、`memberDailyLimit` |
| Header 按钮区（~line 515-528）| members Tab 加按钮，sub-orgs Tab 改文字 |
| 成员 Tab 内容顶部（~line 534）| 新增成员未配预算橙色 Tip |
| 子部门 Tab Tip（~line 650-666）| 改为带计数的格式 |
| 预算弹窗（~line 994-1060）| 双模式：部门均分 / 成员单日上限 |
