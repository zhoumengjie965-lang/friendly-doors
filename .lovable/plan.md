
# API Key 管理页头部重构方案

## 目标效果（参考图1）

```text
┌─────────────────────────────────────────────────────────────────────┐
│  API Key 管理   [我的 API Key | 组织 API Key]（胶囊切换）             │
│                                                                     │
│  [+ 创建 API Key]      名称 [__________] API Key [__________] [搜索] [重置] [↺] │
└─────────────────────────────────────────────────────────────────────┘
```

## 具体改动

### 仅修改 `src/pages/ApiKeys.tsx` 中的头部区域（第 540–626 行）

---

### 第一行：标题 + 胶囊切换器（无刷新按钮）

**胶囊样式**：
- 外层容器：`bg-muted rounded-lg p-1` — 灰色底色胶囊
- 选中项：`bg-white shadow-sm text-foreground font-medium` — 白色背景 + 阴影
- 未选中项：`text-muted-foreground hover:text-foreground` — 透明底色
- 高度：`h-9`，与第二行保持一致

```tsx
<div className="flex items-center gap-4 mb-4">
  <h1 className="text-xl font-bold text-foreground">API Key 管理</h1>
  <div className="flex items-center bg-muted rounded-lg p-1 h-9">
    <button className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
      activeTab === "my" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
    }`} onClick={() => setActiveTab("my")}>我的 API Key</button>
    {canSeeOrgTab && (
      <button className={`px-3 h-full rounded-md text-sm font-medium transition-all ${
        activeTab === "org" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
      }`} onClick={() => setActiveTab("org")}>组织 API Key</button>
    )}
  </div>
</div>
```

---

### 第二行：创建按钮（左） + 搜索栏+刷新（右）

**关键变化**：
1. 搜索框的"名称"和"API Key" label 移到输入框**外面**（作为独立文字紧贴输入框左侧）
2. 刷新按钮 `↺` 移到重置按钮**右侧**，与搜索组整体同行、等高（h-9）
3. 搜索组整体用 `border border-border rounded-md overflow-hidden h-9` 包裹

```tsx
<div className="flex items-center justify-between mb-5">
  {/* 左：创建按钮 */}
  <Button onClick={openCreate} className="gap-2 h-9">
    <Plus className="w-4 h-4" /> 创建 API Key
  </Button>

  {/* 右：搜索栏 + 刷新 */}
  <div className="flex items-center gap-2">
    {/* 名称 label + 输入框 */}
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground whitespace-nowrap">名称</span>
      <Input className="h-9 w-36" placeholder="请输入名称" value={nameSearch} onChange={...} />
    </div>
    {/* API Key label + 输入框 */}
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground whitespace-nowrap">API Key</span>
      <Input className="h-9 w-40" placeholder="请输入 API Key" value={apiKeySearch} onChange={...} />
    </div>
    {/* 搜索按钮（蓝色） */}
    <Button className="h-9 px-4">搜索</Button>
    {/* 重置按钮（灰色文字） */}
    <Button variant="outline" className="h-9 px-3" onClick={handleReset}>重置</Button>
    {/* 刷新图标（与重置同行） */}
    <button className="h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors">
      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
    </button>
  </div>
</div>
```

---

## 涉及文件

| 文件 | 改动范围 |
|------|----------|
| `src/pages/ApiKeys.tsx` | 仅修改第 540–626 行的头部布局，其余（表格、Sheet、逻辑）完全不变 |

## 不涉及的内容
- 数据库迁移：无需变动
- RLS 逻辑：上次已修复，本次不改
- 表格、筛选、Sheet 抽屉：完全保持不变
