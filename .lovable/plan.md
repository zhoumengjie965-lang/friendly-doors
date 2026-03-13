
## 需求分析

用户要求：**普通成员**（`previewRole === "member"`）新建 Key 时，只显示名称输入框，换成小弹窗（Dialog）而非右侧 Sheet。管理员视角仍使用完整的 Sheet 表单。

## 当前实现

- 所有角色（包括普通成员）点击"创建 API Key"都打开同一个 `Sheet`（779-929 行），包含：基本信息（名称、分组、过期时间）+ 预算设置 + 访问限制
- `openCreate()` 在 255-261 行，统一触发 `setSheetOpen(true)`

## 修改方案

### 逻辑拆分：两种弹窗

1. **普通成员**（`previewRole === "member"`）→ 打开小 **Dialog**，仅含名称输入框
2. **管理员**（`org_admin` / `admin`）→ 保持现有 **Sheet** 完整表单

### 具体改动（单文件 `src/pages/ApiKeys.tsx`）

**改动 1：新增 Dialog 状态变量（约第 151 行附近）**
```ts
const [simpleDialogOpen, setSimpleDialogOpen] = useState(false);
```

**改动 2：`openCreate` 函数（255-261 行）**
```ts
const openCreate = () => {
  setEditingKey(null);
  setFormName(""); setFormGroup(""); setFormExpires("");
  setFormQuota(""); setFormUnlimited(true);
  setFormModels([]); setFormIpWhitelist("");
  if (previewRole === "member") {
    setSimpleDialogOpen(true);  // 普通成员 → 小弹窗
  } else {
    setSheetOpen(true);         // 管理员 → 完整 Sheet
  }
};
```

**改动 3：在 Sheet 之后（929 行）新增普通成员专用 Dialog**

使用已有的 `Dialog` 组件，布局为小弹窗（`max-w-sm`），内容只有：
- 标题：「新增 API Key」
- 一行：名称输入框（`placeholder="请输入名称"`）
- 底部：取消 + 确定按钮（复用 `handleSave` 逻辑，onOpenChange 关闭时重置 formName）

```tsx
<Dialog open={simpleDialogOpen} onOpenChange={setSimpleDialogOpen}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>新增 API Key</DialogTitle>
    </DialogHeader>
    <div className="py-2">
      <Label className="text-sm text-muted-foreground mb-1.5 block">
        <span className="text-destructive mr-0.5">*</span>名称
      </Label>
      <Input
        placeholder="请输入名称"
        value={formName}
        onChange={e => setFormName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && formName.trim()) handleSave(); }}
        autoFocus
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSimpleDialogOpen(false)} disabled={saving}>取消</Button>
      <Button onClick={handleSave} disabled={saving || !formName.trim()}>
        {saving ? "保存中..." : "确定"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**改动 4：`handleSave` 完成后关闭正确的弹窗（约 310-330 行）**

`handleSave` 里 `setSheetOpen(false)` 之后加一行 `setSimpleDialogOpen(false)`，确保普通成员保存后也能关闭弹窗。

**改动 5：补充 Dialog 组件导入**

在顶部导入中加上 `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter`（来自 `@/components/ui/dialog`）。

### 修改行数预估
- 第 2-3 行（imports）：新增 Dialog 相关导入
- 第 151 行附近：新增 1 行 state
- 第 255-261 行（`openCreate`）：新增 3 行
- 第 310-320 行（`handleSave` close 逻辑）：新增 1 行
- 第 929 行后（新 Dialog JSX）：新增约 25 行

**总改动**：约 31 行，仅修改 `src/pages/ApiKeys.tsx`
