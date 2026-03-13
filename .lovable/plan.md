
## 部门数据总览面板重构计划

### 目标
将现有紧凑的 `部门数据总览` Card（`OrgGovernance.tsx` 行 352–403）拆分为三个并排的功能区块卡片，并实现点击指标跳转 Tab 的交互。

---

### 布局结构（三栏等宽）

```
[ A. 预算规划 ]     [ B. 实时消耗 ]     [ C. 组织资产 ]
  本月总预算上限        本月累计总消耗        下级部门  3个  ──→ sub-orgs tab
  ¥100,000            ¥42,300             直属成员 15人  ──→ members tab
  ─────────           ─────────           API Key  42个 ──→ (暂不跳转，toast)
  已分配总额           组织可用余额
  ¥85,000 (占85%)     ¥57,700
  剩余可分配额         预算使用率
  ¥15,000             进度条 42%
```

---

### Mock 数据（全部内嵌，不需要新 API）
所有数字用 mock 常量计算，不改数据库：
- `本月总预算上限`：来自 `selectedOrg.monthly_budget`（真实），若未设置显示 `未设置`
- `已分配总额`：`subOrgs` 的 `monthlyBudget` 之和 + `members` 的 `daily_limit` 之和（mock 近似）
- `剩余可分配额`：总预算 - 已分配
- `本月累计总消耗`：`selectedOrg.current_month_budget`（真实）+ `subOrgs` 的 `consumed` 之和（mock）
- `组织可用余额`：总预算上限 - 累计消耗
- `预算使用率`：累计消耗 / 总预算
- `下级部门数`：`subOrgs.length`
- `直属成员数`：`members.length`
- `API Key 总数`：mock 固定值 `42`（前端演示）

---

### 改动明细（只改 `src/pages/OrgGovernance.tsx`）

#### 1. 替换 Overview Card（行 352–403）
删除原有 2×3 grid 布局，改为三个并排 `<div>` 子卡片，样式：`grid grid-cols-3 gap-4`。

每个子卡片内部结构：
```tsx
<div className="rounded-xl border bg-card p-5 space-y-3">
  {/* 标题行 */}
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">A. 预算规划</p>
  {/* 主指标 */}
  <div>
    <p className="text-xs text-muted-foreground">本月总预算上限</p>
    <p className="text-3xl font-bold text-foreground mt-0.5">¥100,000</p>
  </div>
  {/* 分隔 */}
  <div className="border-t pt-2 space-y-1.5">
    {/* 次级指标行 */}
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">已分配总额</span>
      <span className="font-medium">¥85,000 <span className="text-xs text-muted-foreground">(占85%)</span></span>
    </div>
    ...
  </div>
</div>
```

**模块 A（预算规划）**：
- 主指标：本月总预算上限（大号加粗）
- 次级：已分配总额（含占比 %）/ 剩余可分配额（含说明）

**模块 B（实时消耗）**：
- 主指标：本月累计总消耗（大号加粗）
- 次级：组织可用余额（= 上限 - 消耗）/ 预算使用率进度条

**模块 C（组织资产）**：
- 三行可点击指标，每行：图标 + label + 数值 + 右箭头
- 点击"下级部门"→ `setActiveTab("sub-orgs")`，并平滑 scroll 到 Tab 区域
- 点击"直属成员"→ `setActiveTab("members")`，并平滑 scroll
- 点击"API Key"→ toast 提示"请前往 API Key 页面查看"（暂无跳转）

#### 2. 新增 scroll ref
```tsx
const tabCardRef = useRef<HTMLDivElement>(null);
// 点击跳转时：
tabCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
```
在成员+子部门 Card 的 `<Card>` 上挂 `ref={tabCardRef}`。

#### 3. 新增导入
```tsx
import { useRef } from "react";
import { ArrowRight, Building2 } from "lucide-react";
```

---

### 视觉风格
- 三个子卡片等宽，`border rounded-xl`，内部 `p-5`
- 模块 A/B 保持白底，C 模块每行悬停加 `hover:bg-muted/50 cursor-pointer rounded-lg` 效果
- 主指标字号 `text-3xl font-bold`，次级 `text-sm`，label `text-xs text-muted-foreground`
- 使用率进度条 `h-2`，超 90% 变红

---

### 不改动
- 全部数据库查询逻辑
- 成员/子部门 Tab 内容
- 所有 Dialog/Sheet

