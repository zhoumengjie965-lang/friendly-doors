
## 目标

在 `src/components/OrgBudgetSheet.tsx` 的「当前月预算覆盖」输入框下方，新增「预警与通知」区块。

---

## 涉及文件

只修改一个文件：**`src/components/OrgBudgetSheet.tsx`**

---

## 修改内容

### 新增 State

```ts
const [warningThreshold, setWarningThreshold] = useState(80);
const [alertEnabled, setAlertEnabled] = useState(false);
```

初始化时（`handleOpen`）设为默认值：`warningThreshold = 80`，`alertEnabled = false`。

---

### 新增 UI 区块（插入在「当前月预算覆盖」`div` 之后，「本月实际预算」预览框之前）

```tsx
{/* 分割线 */}
<Separator />

{/* 预警与通知 */}
<div className="space-y-4">
  <p className="text-sm font-semibold text-foreground">预警与通知</p>

  {/* 预警阈值 */}
  <div className="space-y-2">
    <Label className="text-sm font-medium">预警阈值</Label>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="1"
        max="100"
        className="w-28"
        value={warningThreshold}
        onChange={(e) => setWarningThreshold(Number(e.target.value))}
      />
      <span className="text-sm text-muted-foreground">%</span>
    </div>
    <p className="text-xs text-muted-foreground">当月消耗达到预算的该比例时触发预警</p>
  </div>

  {/* 开启紧急预警通知 */}
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-0.5">
      <Label className="text-sm font-medium cursor-pointer">开启紧急预警通知</Label>
      <p className="text-xs text-muted-foreground">当消耗达到阈值时，将通过短信通知管理员</p>
    </div>
    <Switch
      checked={alertEnabled}
      onCheckedChange={setAlertEnabled}
    />
  </div>
</div>
```

---

### 新增 import

```tsx
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
```

---

### 保存逻辑

`handleSave` 中将 `warningThreshold` 和 `alertEnabled` 打印到 console 或传入 `onSaved` 回调中（字段在数据库未建列，暂为 UI-only，但保存时可安全忽略这两个字段，等后续 DB 迁移后再持久化）。

---

## 最终区块顺序（Sheet 内从上到下）

```text
默认月预算（元/月）
当前月预算覆盖（元）
─────────────────────
预警与通知
  └── 预警阈值  [数字框] %
  └── 开启紧急预警通知  [Switch]
       微文本：当消耗达到阈值时，将通过短信通知管理员
─────────────────────
本月实际预算（预览卡片）
[取消]  [保存设置]
```
