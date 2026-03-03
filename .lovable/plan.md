
# 企业管理员视图看板开发方案

## 改动范围

仅修改 `src/pages/ResourceStats.tsx`，添加 `enterprise_admin` 视图的专属逻辑，无数据库变更。

---

## 一、新增状态与 Mock 数据

### 新增状态
```ts
const [selectedEnterpriseOrg, setSelectedEnterpriseOrg] = useState("all");  // "all" = 全企业
const [enterpriseMemberFilter, setEnterpriseMemberFilter] = useState("");
const [committedEnterpriseMember, setCommittedEnterpriseMember] = useState("");
```

### 新增 Mock 数据

**组织排行榜 Top N：**
```ts
const mockOrgRankData = [
  { name: "研发一组",   value: 188.50 },
  { name: "产品设计组", value: 142.30 },
  { name: "运营支持组", value: 98.60 },
  { name: "市场推广组", value: 76.40 },
  { name: "客户成功组", value: 54.20 },
  { name: "数据平台组", value: 38.10 },
];
```

**企业维度 API Key 消耗占比（按组织分）：**
```ts
const mockEnterpriseKeyData = [
  { name: "研发一组",   value: 188.50, color: "#60a5fa" },
  { name: "产品设计组", value: 142.30, color: "#4ade80" },
  { name: "运营支持组", value: 98.60,  color: "#a78bfa" },
  { name: "市场推广组", value: 76.40,  color: "#fb923c" },
  { name: "其他组织",   value: 92.30,  color: "#94a3b8" },
];
```

**企业维度请求拦截原因：**
```ts
const mockEnterpriseInterceptData = [
  { name: "Key 预算不足",   value: 124, color: "#f87171" },
  { name: "个人日限额触达", value: 89,  color: "#fb923c" },
  { name: "组织总限额不足", value: 56,  color: "#facc15" },
  { name: "企业余额欠费",   value: 38,  color: "#a78bfa" },   // 特别强调
  { name: "其他系统错误",   value: 15,  color: "#94a3b8" },
];
```

**企业财务信息：**
```ts
const enterpriseBalance = 12580.00;  // 当前余额
const enterpriseTotalConsumed = 5598.10;
```

---

## 二、顶部控制条（enterprise_admin）

在角色 Tab 切换栏下方，`viewRole === "enterprise_admin"` 时，插入一行双重筛选控制条：

```text
[🏢 全部组织 ▼]  |  [🔍 搜索成员姓名（留空显示全企业）...]  [查询]  [重置]  [当前查看：张三 ✕]
```

- **组织选择器**：第一个选项为"全部组织（默认）"，其余为具体组织名称
- 切换组织时，同步清空成员筛选（`committedEnterpriseMember`）
- **成员搜索框 + 查询/重置按钮**：逻辑与 `org_admin` 完全一致

---

## 三、企业财务看板横幅

替换成员视图的"个人日预算横幅"，显示企业级财务信息：

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  💰 企业财务看板   |   当前余额：¥ 12,580.00   [充值]   |  本期已消耗：¥ 5,598.10  │
└──────────────────────────────────────────────────────────────────────────┘
```

- 背景色：`bg-emerald-50 border-emerald-200`（绿色系，区分于蓝色的组织横幅）
- 图标：`Wallet`，绿色
- **充值按钮**：`variant="outline"` 小按钮，点击暂无操作（预留接口）
- 当 `committedEnterpriseMember !== ""`（查看具体成员）时，横幅切换为成员个人日预算样式（与 org_admin 穿透逻辑一致）

---

## 四、指标卡片数据

企业管理员的指标卡片标签复用现有的 `enterprise_admin` 分支（`统计额度 / 统计次数 / 统计Tokens`），并新增 `enterprise_admin` 专属 mock 数值：

```ts
const enterpriseCardValues = committedEnterpriseMember
  ? { big: "¥ 37.50",   mid1: "312",   mid2: "248K",  rpm: "0.008", tpm: "0.62K" }  // 成员穿透
  : { big: "¥ 598.10",  mid1: "5,234", mid2: "3.82M", rpm: "0.128", tpm: "3.15K" }; // 全企业聚合
```

---

## 五、新增卡片：组织消耗排行榜（enterprise_admin 专属）

在"模型数据分析"图表卡片下方、"APIkey 调用分析"卡片上方，插入组织排行榜：

- **触发条件**：`viewRole === "enterprise_admin" && committedEnterpriseMember === ""`
- **形式**：横向 `BarChart`（`layout="vertical"`），与成员排行榜同款样式
- Y 轴为组织名，X 轴为消耗金额，颜色为 `#60a5fa`

```text
┌─────────────────────────────────────────────────────┐
│  [🏢] 组织消耗排行榜                                  │
│                                                     │
│  研发一组   [================================] ¥188.50 │
│  产品设计组 [=========================] ¥142.30     │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

---

## 六、APIkey 调用分析（enterprise_admin）

将现有的 `{(viewRole === "member" || viewRole === "org_admin")}` 条件扩展为同时包含 `enterprise_admin`：

```tsx
{(viewRole === "member" || viewRole === "org_admin" || viewRole === "enterprise_admin") && (
```

数据源切换逻辑：
- `enterprise_admin` 全企业聚合：使用 `mockEnterpriseKeyData` / `mockEnterpriseInterceptData`
- `enterprise_admin` 成员穿透：使用 `mockKeyConsumptionData` / `mockInterceptData`

左侧图标题改为"**组织 Key 消耗占比**"，右侧图标题改为"**请求拦截原因分布**"（与其他视图一致，数据更大）。

---

## 七、空状态处理

当 `committedEnterpriseMember` 有值但无匹配时，沿用现有 `<EmptyState />` 组件。

---

## 整体渲染逻辑（enterprise_admin 视图）

```text
1. [顶部控制栏：组织选择器 + 成员搜索框 + 查询/重置按钮]   ← enterprise_admin 专属
2. [企业财务看板横幅（绿色）]                              ← enterprise_admin 专属
3. [指标卡片区：全企业聚合数值]                            ← 沿用标准命名
4. [模型数据分析柱状图]                                    ← 共用
5. [组织消耗排行榜（横向条形图）]                           ← enterprise_admin 专属（仅全企业状态显示）
6. [APIkey 调用分析（两个环形图）]                          ← 扩展至 enterprise_admin
```

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/ResourceStats.tsx` | 新增 `selectedEnterpriseOrg`、`enterpriseMemberFilter`、`committedEnterpriseMember` 状态；新增企业维度 mock 数据（排行榜、Key 占比、拦截原因、财务数据）；新增 enterprise_admin 顶部控制条；新增企业财务看板横幅；新增组织消耗排行榜卡片；扩展 APIkey 分析卡片至 enterprise_admin；引入 `TrendingUp` 图标 |

## 不涉及内容
- 数据库：无需变动
- 其他页面：无影响
