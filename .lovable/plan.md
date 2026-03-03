
# 组织管理员视图：成员搜索交互升级

## 问题分析

当前实现中，`memberFilter` 输入框实时过滤排行榜数据，但缺乏明确的"查询/重置"操作边界，且没有"穿透到成员视图"的逻辑。

用户期望的完整交互流程：

```text
[org_admin 全组织聚合视图]
  ↓ 在搜索框输入成员姓名
  ↓ 出现 [查询] [重置] 按钮
  ↓ 点击 [查询]
[切换为：org_admin 成员穿透视图]
  - 页面展示该成员的个人数据（类似 member 视图）
  - 隐藏"成员消耗排行榜"卡片
  - APIkey 分析显示该成员数据
  ↓ 点击 [重置]
[回到 org_admin 全组织聚合视图]
```

---

## 状态设计

新增两个状态，与现有状态分离：

```ts
// 输入框中的实时文字（打字时变化）
const [memberFilter, setMemberFilter] = useState("");

// 已提交的查询（点击"查询"后才赋值）
const [committedMember, setCommittedMember] = useState("");
```

- `committedMember === ""` → 全组织聚合状态
- `committedMember !== ""` → 成员穿透状态（不显示排行榜，显示成员个人数据）

---

## 一、搜索框交互升级

### 变更前
输入框实时触发 `filteredMemberRank` 过滤，有"清除"按钮。

### 变更后
输入框仅更新 `memberFilter`（不触发任何联动）。当 `memberFilter.trim() !== ""` 时，在搜索框右侧动态显示两个按钮：

```tsx
{memberFilter.trim() && (
  <>
    <Button size="sm" className="h-8 text-xs px-3" onClick={handleSearch}>
      查询
    </Button>
    <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={handleReset}>
      重置
    </Button>
  </>
)}
{/* 若已提交但输入框为空，仍显示重置 */}
{!memberFilter.trim() && committedMember && (
  <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={handleReset}>
    重置
  </Button>
)}
```

按钮逻辑：
```ts
const handleSearch = () => {
  setCommittedMember(memberFilter.trim());
};

const handleReset = () => {
  setMemberFilter("");
  setCommittedMember("");
};
```

支持按 Enter 键直接触发查询（`onKeyDown` 监听 `Enter`）。

### 视觉效果（对应截图红框区域）

```text
[🏢 当前组织  研发一组 ▼]  |  [🔍 搜索成员姓名（留空显示全组织）...]  [查询]  [重置]
```

---

## 二、成员穿透状态下的视图变化

当 `committedMember !== ""` 时（已提交查询），页面进入**成员穿透视图**：

### 2.1 顶部搜索栏状态指示

在搜索框上方或旁边添加一个蓝色标记，提示当前正在查看某成员数据：

```tsx
{committedMember && (
  <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 shrink-0">
    <Users className="w-3.5 h-3.5" />
    <span>当前查看：{committedMember}</span>
  </div>
)}
```

### 2.2 配额横幅切换

- 全组织聚合时：显示"组织本月配额监控"横幅（蓝色，¥3,200 / ¥5,000）
- 穿透到成员后：改为显示"成员个人日预算监控"横幅（同 member 视图的横幅样式，但加注"成员：{committedMember}"前缀）

```tsx
{viewRole === "org_admin" && committedMember === "" && (
  // 组织配额横幅（现有）
)}
{viewRole === "org_admin" && committedMember !== "" && (
  // 个人配额横幅（带成员名）
  <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-4 flex-wrap">
    <Wallet 图标 />
    <span>成员 <strong>{committedMember}</strong> 今日预算剩余：¥ 37.50 / ¥ 50.00</span>
    <进度条 />
  </div>
)}
```

### 2.3 隐藏成员消耗排行榜

排行榜仅在"全组织聚合"状态下显示：

```tsx
{viewRole === "org_admin" && committedMember === "" && (
  <div className="mt-4 ...">
    {/* 成员消耗排行榜 */}
  </div>
)}
```

### 2.4 APIkey 分析数据切换

- 全组织时：使用 `mockOrgKeyConsumptionData` / `mockOrgInterceptData`
- 穿透成员时：使用 `mockKeyConsumptionData` / `mockInterceptData`（成员维度的 mock）

---

## 三、整体逻辑流程图

```text
org_admin 视图进入
        │
        ▼
[committedMember === ""]  ────── 全组织聚合状态 ──────
        │                                              │
        │  用户输入成员名 → 输入框显示 [查询][重置]      │ 展示：
        │                                              │  - 组织配额横幅
        │  点击 [查询]                                  │  - 全组织指标卡
        │                                              │  - 模型柱状图
        ▼                                              │  - 成员排行榜 ✅
[committedMember = "张三"] ─── 成员穿透状态 ──────     │  - APIkey 分析（org数据）
        │                                              │
        │  展示：                                       │
        │   - 个人配额横幅（含成员名）                  │
        │   - 成员指标卡（member mock数据）             │
        │   - 模型柱状图                               │
        │   - 成员排行榜 ❌（隐藏）                    │
        │   - APIkey 分析（member数据）                 │
        │                                              │
        ▼                                              │
  点击 [重置] ──────────────────────────────────────── ┘
  (清空 memberFilter + committedMember)
```

---

## 四、涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ResourceStats.tsx` | 新增 `committedMember` 状态；将 `isMemberEmpty` 逻辑改为基于 `committedMember`；搜索框新增查询/重置按钮；配额横幅区分聚合/穿透状态；排行榜仅在 `committedMember === ""` 时渲染；APIkey 数据源根据 `committedMember` 切换 |

## 不涉及内容
- 数据库：无需变动
- 其他页面：无影响
- 路由跳转：不跳转到真实路由，在 org_admin 视图内切换展示模式
