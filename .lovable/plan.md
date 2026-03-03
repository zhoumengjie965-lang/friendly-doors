
# 多组织管理切换：功能逻辑增强方案

## 当前状态分析

`src/pages/ApiKeys.tsx` 中，`fetchOrgKeys` 目前直接查询整个企业下的所有 API Key（无组织过滤），`activeTab` 只有 `"my"` 和 `"org"` 两个状态，没有组织维度的切换逻辑。

组织数据可以从 `organizations` 表通过 `enterprise_id` + 成员关系查询获取。

---

## 实现方案

### 仅修改 `src/pages/ApiKeys.tsx`，无需数据库迁移

---

### 1. 新增状态

```ts
// 组织列表（管理员所在企业的所有组织）
const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
// 当前选中的组织 ID（null = 全部组织）
const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
// 组织下拉是否展开
const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
```

---

### 2. 获取组织列表

在 `useEffect` 中额外获取 `organizations` 表数据，筛选条件为 `enterprise_id = enterprise.id`：

```ts
const fetchOrganizations = useCallback(async () => {
  if (!canSeeOrgTab) return;
  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("enterprise_id", enterprise.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (data && data.length > 0) {
    setOrganizations(data);
    setSelectedOrgId(data[0].id); // 默认选中第一个
  }
}, [canSeeOrgTab, enterprise.id]);
```

---

### 3. `fetchOrgKeys` 联动组织筛选

当 `selectedOrgId` 变化时，重新拉取该组织的 API Key：

```ts
const fetchOrgKeys = useCallback(async () => {
  if (!canSeeOrgTab || !selectedOrgId) return;
  const { data } = await supabase
    .from("api_keys")
    .select("*")
    .eq("enterprise_id", enterprise.id)
    .eq("organization_id", selectedOrgId)
    .order("created_at", { ascending: false });
  if (data) setOrgKeys(data);
}, [canSeeOrgTab, enterprise.id, selectedOrgId]);

// 当 selectedOrgId 变化时自动刷新
useEffect(() => {
  if (activeTab === "org") fetchOrgKeys();
}, [selectedOrgId, activeTab]);
```

---

### 4. 胶囊切换器 UI 升级

"组织 API Key" Tab 改为带 **ChevronDown** 箭头的下拉触发器，使用 `DropdownMenu` 包裹：

```tsx
{canSeeOrgTab && (
  <DropdownMenu open={orgDropdownOpen} onOpenChange={setOrgDropdownOpen}>
    <DropdownMenuTrigger asChild>
      <button
        onClick={() => setActiveTab("org")}
        className={`px-3 h-full rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
          activeTab === "org"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {activeTab === "org" && selectedOrgId
          ? `组织：${organizations.find(o => o.id === selectedOrgId)?.name ?? "API Key"}`
          : "组织 API Key"}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-52">
      {organizations.map(org => (
        <DropdownMenuItem
          key={org.id}
          onClick={() => {
            setSelectedOrgId(org.id);
            setActiveTab("org");
            setOrgDropdownOpen(false);
          }}
          className={selectedOrgId === org.id ? "bg-accent" : ""}
        >
          {/* 选中图标 */}
          <Check className={`w-4 h-4 mr-2 ${selectedOrgId === org.id ? "opacity-100" : "opacity-0"}`} />
          {org.name}
        </DropdownMenuItem>
      ))}
      {organizations.length === 0 && (
        <div className="px-3 py-2 text-sm text-muted-foreground">暂无组织</div>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

**选中态文字动态变化**：
- 处于"我的 API Key" Tab 时，"组织 API Key"显示默认文字
- 切换到组织视图后，Tab 文字变为 `"组织：[组织名称]"`（如 `"组织：研发部"`）

---

### 5. 刷新逻辑更新

刷新按钮联动当前 Tab，组织视图刷新时只刷新当前组织的 Key：

```ts
onClick={() => {
  if (activeTab === "my") fetchMyKeys();
  else fetchOrgKeys();
}}
```

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ApiKeys.tsx` | 新增组织列表状态与获取逻辑，`fetchOrgKeys` 联动 `selectedOrgId`，胶囊切换器改为带下拉的 Dropdown 组件 |

## 不涉及内容
- 数据库迁移：无需，直接查 `organizations` 表
- RLS 策略：无需变动
- 其他页面：无影响
