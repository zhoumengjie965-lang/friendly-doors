
# UI & 逻辑重构：全局组织上下文与创建归属明确化

## 问题诊断

1. **RLS 报错根因**：`handleSave` 中创建时硬编码 `p_organization_id: null`，即使用户选中了某个组织也不传入正确的 `organization_id`。
2. **组织选择器耦合在 Tab 内**：组织下拉嵌在胶囊切换器里，交互逻辑混乱，"组织 API Key" 看的是该组织所有 Key，但创建时归属不明。
3. **视图语义不清**：`activeTab === "my"` 时创建的 Key 到底归属哪个组织？目前没有提示。

---

## 重构方案

### 视觉结构（三行式）

```text
行1: [API Key 管理]  [组织选择器: 下拉 Select ▼]         (全局上下文，带 Building2 图标)
行2: [我的 API Key] [组织 API Key]                       (纯粹的角色视图切换，胶囊样式)
行3: [+ 创建 API Key]  提示文字    名称[___] API Key[___] [搜索][重置][↺]
```

---

## 具体改动（仅 `src/pages/ApiKeys.tsx`）

### 1. 新增全局组织选择器（第一行）

将组织选择抽离为独立的 `Select` 组件，放在标题右侧，带 `Building2` 图标增强视觉存在感：

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

// 第一行：标题 + 全局组织选择器
<div className="flex items-center gap-3 mb-3">
  <h1 className="text-xl font-bold text-foreground">API Key 管理</h1>
  {canSeeOrgTab && organizations.length > 0 && (
    <div className="flex items-center gap-2 ml-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedOrgId ?? ""} onValueChange={(val) => {
        setSelectedOrgId(val);
        fetchOrgKeys(val);     // 联动刷新组织 Key
        fetchMyKeys();         // 同步刷新我的 Key（按需）
      }}>
        <SelectTrigger className="h-9 w-48 border-border shadow-sm font-medium">
          <SelectValue placeholder="选择组织..." />
        </SelectTrigger>
        <SelectContent>
          {organizations.map(org => (
            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}
</div>
```

### 2. 简化第二行胶囊 Tab（纯视图切换，无下拉）

去掉 `DropdownMenu` 包裹，"组织 API Key" 变回简单按钮，不再有 `ChevronDown`：

```tsx
// 第二行：纯胶囊切换
<div className="flex items-center gap-4 mb-4">
  <div className="flex items-center bg-muted rounded-lg p-1 h-9">
    <button onClick={() => setActiveTab("my")} className={...}>我的 API Key</button>
    {canSeeOrgTab && (
      <button onClick={() => setActiveTab("org")} className={...}>组织 API Key</button>
    )}
  </div>
</div>
```

### 3. 第三行：创建按钮 + 归属提示 + 搜索栏

在"创建 API Key"按钮右侧添加灰色小提示文字，动态显示归属上下文：

```tsx
<div className="flex items-center justify-between mb-5">
  <div className="flex items-center gap-3">
    <Button onClick={openCreate} className="gap-2 h-9">
      <Plus className="w-4 h-4" />创建 API Key
    </Button>
    {/* 归属提示文字 */}
    <span className="text-xs text-muted-foreground">
      提示：Key 将归属于{" "}
      <span className="font-medium text-foreground">
        {selectedOrgId
          ? organizations.find(o => o.id === selectedOrgId)?.name ?? "当前组织"
          : "个人空间"}
      </span>
    </span>
  </div>
  {/* 右侧搜索栏不变 */}
  ...
</div>
```

### 4. 修复创建时传入正确的 `organization_id`（核心 RLS 修复）

修改 `handleSave` 中的 `p_organization_id`，从全局状态读取：

```ts
// 修改前（硬编码 null，导致创建失败）
p_organization_id: null,

// 修改后（从全局上下文读取）
p_organization_id: selectedOrgId,
```

### 5. 删除 `orgDropdownOpen` 状态（不再需要）

`orgDropdownOpen` 状态及相关逻辑全部移除，代码更简洁。

---

## 联动逻辑总结

| 用户操作 | 联动效果 |
|---|---|
| 切换全局组织选择器 | `selectedOrgId` 更新 → `fetchOrgKeys(newOrgId)` 触发 → 组织 Tab 数据刷新 |
| 点击"我的 API Key" Tab | `activeTab = "my"` → 显示个人 Key 列表 |
| 点击"组织 API Key" Tab | `activeTab = "org"` → 显示当前 `selectedOrgId` 对应的 Key |
| 点击"创建 API Key" | 打开 Sheet，提交时传入 `p_organization_id: selectedOrgId` |
| 点击刷新 | 根据 `activeTab` 刷新对应列表 |

---

## 涉及文件

| 文件 | 改动范围 |
|---|---|
| `src/pages/ApiKeys.tsx` | 重构头部三行布局，修复 `handleSave` 中 `p_organization_id` 传参，移除 `orgDropdownOpen` 状态 |

## 不涉及内容
- 数据库迁移：无需
- 表格、抽屉 Sheet：内容不变
- 其他页面：无影响
