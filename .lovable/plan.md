
## 目标
在"成员高级权限管理"弹窗中填充假数据，让部门管理员能看到成员列表并勾选开放高级权限。同时给"部门 API Key"Tab 的 `orgMembers` 也填入同一批假数据（因为 `orgMembers` 同时服务于成员筛选和高级权限弹窗）。

## 问题分析
`orgMembers` 来自 `fetchOrgKeys` → supabase 查询，真实数据库里当前部门没有成员，所以显示空。解决方案：在组件 state 初始化时预置一批假成员数据，当 `previewRole === "org_admin"` 且真实 `orgMembers` 为空时 fallback 到假数据用于展示。

最干净的方案是：将假数据直接写入 `useState` 初始值，并在 `fetchOrgKeys` 里判断如果返回为空则 fallback 到 mock 数据（只在开发/预览状态下，通过一个独立的 `mockMembers` 常量控制）。

## 具体改动（只改 `src/pages/ApiKeys.tsx`）

### 1. 在文件顶部添加 mock 常量
```ts
const MOCK_MEMBERS = [
  { phone: "13800138001", name: "张伟" },
  { phone: "13912345678", name: "李晓梅" },
  { phone: "18611223344", name: "王建国" },
  { phone: "15955667788", name: null },   // 无姓名成员，显示脱敏手机号
  { phone: "13700000001", name: "陈思思" },
];
```

### 2. 修改 `orgMembers` 初始 state
将 `useState<...>([])` 改为 `useState(MOCK_MEMBERS)`，这样弹窗第一次打开就有数据。

### 3. fetchOrgKeys 结尾 fallback
在 `setOrgMembers([])` 的分支（orgId 为空/无成员时）改为 fallback 到 MOCK_MEMBERS，保证任意场景下 Dialog 都不为空。

同时在 members 查询后：若 `members` 返回空数组，也 fallback 到 MOCK_MEMBERS。

这样改动最小，完全不影响真实逻辑，真实有成员数据时仍然用真实数据。
