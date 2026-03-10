
## 管理端「调用日志」字段扩展与交互增强 — `src/pages/admin/AdminCallLogs.tsx`

### 现状分析
- 当前「使用日志」tab 已有列：时间、企业、APIKey、组织、分组、类型、模型、用时/首字、输入、输出、花费、IP、详情
- 企业列已存在于 mock 数据（`enterprise` 字段）
- 顶部筛选已有「企业」下拉 +「APIKey」文本输入
- APIKey chip 仅为静态样式，无跳转逻辑
- 组织列为纯文本，无跳转逻辑

### 三项改动

**1. 新增两列：所属企业 + 上游渠道**

「所属企业」列：企业列已存在，但用户要求明确保留并命名为「所属企业」——确认现有企业列即是此列，名称对齐即可。

「上游渠道」列（新增）：mock 数据中新增 `channel` 字段，值如 `OpenAI`、`Anthropic`、`Azure`，用带颜色的 badge 展示（类似模型列风格）。放在「模型」列之后。

列顺序调整为：时间 | 所属企业 | APIKey | 组织 | 分组 | 类型 | 模型 | 上游渠道 | 用时/首字 | 输入 | 输出 | 花费 | IP | 详情

**2. 搜索增强：企业搜索**

顶部已有「企业」下拉（Select），改为带搜索功能的 combobox 样式：换用 `Input` + 下拉联想（简单文本 filter），或保留 Select 风格但追加文字搜索框配合过滤。

实现方案：在现有「企业」Select 之前，新增一个独立的「企业名称」`Input` 文本搜索框（与下拉联动），支持模糊匹配。同时将原有「企业」Select 保留用于精确筛选。实际上更简洁的做法：**将原「企业」Select 改为带 Input 搜索的模糊过滤**：输入关键词实时过滤 `enterprise` 字段（不依赖 Radix cmdk，直接 `useState` + `filter`）。

**3. 交互跳转**

- **APIKey chip 点击** → `navigate('/admin/tokens')` 并带上 `?key=${row.apiKey}` 参数（管理记忆中令牌管理页顶部有 APIKey 搜索输入框，虽然当前不解析参数，但跳转本身有意义；加上 `useNavigate`）
- **组织 chip/文本点击** → `navigate('/admin/enterprises')` 并带 `?org=${row.org}`（跳转至企业管理列表，后续可扩展）。改为蓝色可点击文字样式。

### 文件修改
- **`src/pages/admin/AdminCallLogs.tsx`**：
  - mock 数据增加 `channel` 字段
  - `UsageLogsTab` 内：企业搜索改为 Input 模糊过滤 `filterEnterpriseText`，替换原 Select
  - headers 增加「上游渠道」列（模型后）
  - 表格 tbody 增加上游渠道 td（带颜色 badge）
  - APIKey chip 加 `onClick` → navigate to `/admin/tokens`
  - 组织列改为蓝色可点击 button → navigate to `/admin/enterprises`
  - 引入 `useNavigate`

### 渠道颜色映射
```text
OpenAI   → bg-emerald-50 text-emerald-700 border-emerald-200
Anthropic → bg-amber-50 text-amber-700 border-amber-200
Azure    → bg-sky-50 text-sky-700 border-sky-200
其他      → bg-gray-50 text-gray-600 border-gray-200
```
