
## 计划：管理端新增「使用日志」页（含三个子标签）

### 现状
- 管理端 `AdminLayout.tsx` 目前有 6 个导航项，没有日志相关页面
- 客户端 `CallLogs.tsx` 已实现完整的三标签日志页：使用日志、绘图日志、任务日志，含分页、筛选、mock 数据

### 方案

**新建 `src/pages/admin/AdminCallLogs.tsx`**

从客户端 `CallLogs.tsx` 移植三个标签页的完整逻辑（含 mock 数据、筛选栏、分页组件），适配管理端场景：
- 移除客户端特有的 `role`/`enterprise` props 限制，改为固定展示企业列（因管理端视角是全平台，默认显示"企业"列）
- 保留三标签结构：使用日志 / 绘图日志 / 任务日志
- 使用日志表格：增加「企业」列（跨企业视角）
- 绘图日志、任务日志：结构保持一致

**更新 `src/pages/admin/AdminLayout.tsx`**

在「控制台」分组中新增「使用日志」导航项，路由 `call-logs`：
```text
── 控制台 ──
  数据总览     (dashboard)
  使用日志     (call-logs)  ← 新增
── 运营管理 ──
  企业管理 / 用户管理 / 计费管理
── 配置管理 ──
  模型配置
── 系统 ──
  全局统计
```

同时将侧边栏导航改为带分组标题的结构（替换当前的平铺列表），宽度加到 `w-60`。

**更新 `src/App.tsx`**

`/admin/*` 路由组内已通过 `AdminLayout` 承接所有子路由，无需单独在 App.tsx 新增，只需在 AdminLayout 的 `<Routes>` 里加一条：
```tsx
<Route path="call-logs" element={<AdminCallLogs />} />
```

### 修改文件汇总

| 文件 | 操作 |
|------|------|
| `src/pages/admin/AdminCallLogs.tsx` | 新建，移植三标签日志页 |
| `src/pages/admin/AdminLayout.tsx` | 新增导航项 + 分组结构 + 新路由 |

### 无需数据库变更
全部使用 mock 数据，与客户端 CallLogs 保持一致，后续可统一对接。
