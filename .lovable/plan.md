
## 问题分析

从截图和代码对比，有两个明确问题：

### 问题 1：企业管理员视角显示了多余的「算法部门」选择器
- 第 653-673 行：`{organizations.length > 0 && (<Building2 + Select>)}` 对所有 `canSeeOrgTab` 角色都显示
- **企业管理员**已经有「所属组织：全部」筛选下拉，这个 Building2 选择器是多余的，只有**组织管理员**需要它（用来切换自己所在的组织）
- 修复：将该块改为 `{previewRole === "org_admin" && organizations.length > 0 && ...}`

### 问题 2：表格表头的「组织」「成员」列
从代码可见，这些列**已经写在代码里**（第 434-435 行 header，第 497-509 行 body），并且第 760-769 行对 org tab 的 KeyTable 也正确传入了 `showCreator` 和 `showOrg={previewRole === "admin"}`。

但用户截图中显示的是「**我的 API Key**」tab（没有 org/member 列是正确的），切换到「组织 API Key」tab 才会出现这些列。**用户可能没注意到需要切换 tab**，或者由于 `orgKeys` 为空只看到「暂无数据」行而没注意到表头。

**确保可见的方案**：在「我的 API Key」tab 下，也强制显示「组织 API Key」tab 的表格（但这不合理）。

更合理的方案：**无论当前 tab 是「我的」还是「组织」，只要是管理员视角，组织 API Key 的表格就一直渲染（但隐藏或展开）**。但这会改变布局。

最直接的方案：**调整 orgKeys 为空时 KeyTable 仍显示完整表头行（当前代码已经这样做了！）**，然后确认 `activeTab === "org"` 时能看到带列的表头。

实际上代码已经正确，只要用户点击「组织 API Key」tab 就能看到这些列。

**所以此次只需要修 1 个问题（Building2 selector）+ 确保用户能看到 org tab 的列（代码已正确，无需改动）**。

---

## 修改方案（`src/pages/ApiKeys.tsx` 单文件）

### 唯一修改：第 653-674 行，限制 Building2 org selector 只在 org_admin 时显示

```
当前（653-673行）：
{organizations.length > 0 && (
  <div className="flex items-center gap-1.5">
    <Building2 .../>
    <Select .../>
  </div>
)}

改为：
{previewRole === "org_admin" && organizations.length > 0 && (
  <div className="flex items-center gap-1.5">
    <Building2 .../>
    <Select .../>
  </div>
)}
```

**注意**：企业管理员去掉 Building2 selector 后，`selectedOrgId` 就没有初始值的概念了——对企业管理员来说，org tab 应该展示该企业**所有组织**的 key（即不按 org 过滤），而是通过「所属组织」筛选框来过滤。这已经通过 `orgNameFilter` 实现了（`filterKeys` 中 `matchOrgName` 逻辑）。`fetchOrgKeys` 不传 `targetOrgId` 时会获取该企业全部 keys，适合企业管理员。

**副作用处理**：`fetchOrganizations` 会自动 `setSelectedOrgId(data[0].id)` 并加载第一个组织的 keys。对企业管理员来说，初始化时应该加载所有 keys。需要在 `fetchOrganizations` 内根据 `previewRole` 区分：企业管理员不设置 `selectedOrgId`，直接 `fetchOrgKeys(null)` 加载全部。

但 `previewRole` 在 `fetchOrganizations` 的 `useCallback` 依赖里没有，改动 `fetchOrganizations` 会引入复杂度。

**简化方案**：保持 `fetchOrganizations` 不变（初始化时还是设置 selectedOrgId），但 Building2 选择器对企业管理员不显示。`fetchOrgKeys` 对企业管理员还是会按 `selectedOrgId` 拉数据，但企业管理员有「所属组织」筛选可以覆盖这个行为——不太完美但可接受。

**更好方案**：在 `fetchOrganizations` 里，如果是企业管理员（role === "admin"），不设置 `selectedOrgId`，直接 `fetchOrgKeys(null)` 拉全部数据。

为了避免 `previewRole` 是预览状态（可能和 `role` 不同）影响真实数据逻辑，改用 `role` prop（真实角色）来决定初始化行为：

```ts
const fetchOrganizations = useCallback(async () => {
  ...
  if (data && data.length > 0) {
    setOrganizations(data);
    if (role === "admin") {
      // 企业管理员：不锁定组织，拉全部
      fetchOrgKeys(null);
    } else {
      setSelectedOrgId(data[0].id);
      fetchOrgKeys(data[0].id);
    }
  }
}, [canSeeOrgTab, enterprise.id, role]);
```

### 总结修改点

1. **行 653**：`{organizations.length > 0 &&` → `{previewRole === "org_admin" && organizations.length > 0 &&`
2. **行 239-243**（`fetchOrganizations`）：添加 `role === "admin"` 分支，企业管理员初始化时用 `fetchOrgKeys(null)` 拉全部 keys 而不设置 selectedOrgId

**文件**：`src/pages/ApiKeys.tsx`，改动约 5 行
