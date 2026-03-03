
# 资源统计：三角色视图 Tab 设计方案

## 需求分析

用户要求在"资源统计"页面通过顶部 Tab 区分三种角色视图，每种视图内容略有不同：

| 角色 | 特殊内容 |
|------|----------|
| 普通成员 | 指标卡上方增加"实时配额监控"横幅（每日预算剩余进度条）；3个指标重命名 |
| 组织管理员 | 暂无特殊内容，使用与企业管理员类似的布局（无预算横幅） |
| 企业管理员 | 无预算横幅，指标名称保持原始命名 |

**指标名称变更（普通成员视图）：**
- 统计额度 → 已消耗预算
- 统计次数 → 统计调用次数
- 统计Tokens → 消耗Tokens

---

## 视觉结构

### 第一行：角色视图切换 Tab
```text
[页面标题 + 图标]      [普通成员] [组织管理员] [企业管理员]        [日期选择器] [↺]
```
Tab 使用胶囊样式，置于标题与日期选择器之间（居中或标题右侧），高度与日期选择器一致（h-9）。

### 普通成员视图独有：实时配额监控横幅
参考图1样式，在指标卡片网格上方添加一个**终端风格的深色横幅条**：

```text
┌──────────────────────────────────────────────────────┐
│  [实时配额监控]  您当前的个人日预算剩余：¥12.50 / ¥50.00（今日）  [=========----]  │
└──────────────────────────────────────────────────────┘
```

- 背景色：深色（`bg-zinc-900` 或 `bg-slate-900`）
- 字体：等宽字体（`font-mono`），文字颜色：亮绿色（`text-green-400`）
- 进度条：用 `=` 填充已消耗部分，`-` 填充剩余部分，外加方括号 `[...]`
- 圆角：`rounded-lg`，内边距：`px-4 py-2`

---

## 三种视图差异对照表

| 元素 | 普通成员 | 组织管理员 | 企业管理员 |
|------|----------|------------|------------|
| 实时配额横幅 | ✅ 显示 | ❌ 不显示 | ❌ 不显示 |
| 左大卡标题 | 已消耗预算 | 统计额度 | 统计额度 |
| 中上卡标题 | 统计调用次数 | 统计次数 | 统计次数 |
| 右上卡标题 | 平均RPM | 平均RPM | 平均RPM |
| 中下卡标题 | 消耗Tokens | 统计Tokens | 统计Tokens |
| 右下卡标题 | 平均TPM | 平均TPM | 平均TPM |
| 图表区域 | 相同 | 相同 | 相同 |

---

## 技术实现（仅修改 `src/pages/ResourceStats.tsx`）

### 1. 新增角色视图 Tab 状态
```ts
const [viewRole, setViewRole] = useState<"member" | "org_admin" | "enterprise_admin">("member");
```

### 2. 顶部 Tab 胶囊（置于标题行右侧，日期选择器左边）
```tsx
<div className="flex items-center bg-muted rounded-lg p-1 h-9">
  <button onClick={() => setViewRole("member")} className={cn(...)}>普通成员</button>
  <button onClick={() => setViewRole("org_admin")} className={cn(...)}>组织管理员</button>
  <button onClick={() => setViewRole("enterprise_admin")} className={cn(...)}>企业管理员</button>
</div>
```

### 3. 实时配额横幅（仅 member 视图）
```tsx
{viewRole === "member" && (
  <div className="mb-4 rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 font-mono text-sm text-green-400 flex items-center gap-3">
    <span className="text-green-300 font-semibold">[实时配额监控]</span>
    <span>您当前的个人日预算剩余：¥ 12.50 / ¥ 50.00（今日）</span>
    <span className="text-green-500 tracking-tight">[=========-----]</span>
  </div>
)}
```

### 4. 动态指标标题
通过变量控制左大卡和两个小卡的标题：
```ts
const cardLabels = viewRole === "member"
  ? { big: "已消耗预算", mid1: "统计调用次数", mid2: "消耗Tokens" }
  : { big: "统计额度", mid1: "统计次数", mid2: "统计Tokens" };
```

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ResourceStats.tsx` | 新增 `viewRole` 状态、顶部角色 Tab、实时配额横幅（仅 member）、动态指标标题 |

## 不涉及内容
- 数据库：无需变动
- 其他页面：无影响
- 实际权限控制：Tab 仅作 UI 预览，真实权限由 `role` prop 控制（后续可联动）
