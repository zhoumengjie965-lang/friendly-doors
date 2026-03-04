
用户想做一个**完全独立**的管理端（平台运营管理、计费、模型配置、数据监控），管理员账户与客户端用户完全隔离。

## 建议方案：在当前项目中新增 `/admin` 路由

**理由：**
- 共用同一套数据库，无需重复配置后端
- 演示时切换方便（同一域名，不同路径）
- 代码复用（组件、Supabase client、工具函数）
- 无需维护两个项目的依赖和部署

**访问隔离方式：**
- 管理端入口：`/admin/login`，独立登录页
- 后台管理员账号存储在新表 `admin_users`（手机号+密码或固定账号）
- 路由保护：`/admin/*` 检查 `localStorage` 中的 admin session，未登录跳转 `/admin/login`
- 客户端 `/workspace/*` 和管理端 `/admin/*` 完全隔离，互不影响

## 管理端页面规划（初版 demo）

```text
/admin/login              管理员登录页（账号密码）
/admin                    重定向到 /admin/dashboard
/admin/dashboard          数据总览（企业数、用户数、调用量、余额概览）
/admin/enterprises        企业列表（搜索、查看详情、认证审核）
/admin/users              用户列表（搜索手机号、查看所属企业）
/admin/billing            计费管理（充值、兑换码生成与管理）
/admin/models             模型配置（上下架、计费规则）
/admin/stats              全局统计（调用量、收入趋势图）
```

## 技术方案

**新增文件：**
- `src/pages/admin/AdminLogin.tsx` — 登录页
- `src/pages/admin/AdminDashboard.tsx` — 数据总览
- `src/pages/admin/AdminEnterprises.tsx` — 企业管理
- `src/pages/admin/AdminUsers.tsx` — 用户管理
- `src/pages/admin/AdminBilling.tsx` — 计费管理
- `src/pages/admin/AdminLayout.tsx` — 管理端布局（侧边栏+顶栏）
- `src/lib/adminAuth.ts` — 管理端鉴权逻辑

**数据库：**
- 新增 `admin_users` 表（手机号、密码哈希、权限级别）
- 新增 RLS：仅 admin session 可读写敏感操作
- `redeem_codes` 表新增 INSERT 权限（管理员生成兑换码）

**`src/App.tsx` 新增路由：**
```tsx
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/admin/*" element={<AdminLayout />} />
```

## 开发顺序（可分步实现）

1. 管理端登录 + 路由保护
2. Dashboard 总览页
3. 企业列表 + 认证审核
4. 计费管理（充值 + 兑换码）
5. 用户列表
6. 全局统计图表

---

**先从第 1、2、3 步开始（登录 + 布局 + Dashboard + 企业管理），建立完整骨架，后续功能逐步填充。确认后即可开始实现。**
