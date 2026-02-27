
# 账户余额页面实现方案

## 页面结构（基于图1 PRD 和图3 UI 参考）

### 一、顶部余额总览卡片（蓝色渐变背景，参考图3）
蓝绿渐变大横幅卡片，与图3保持一致风格：
- **当前可用余额**（主视觉，大号字体，¥0.00）
- **历史消耗**（¥0.00）
- **请求次数**（0，占位，待接入）
- **右侧按钮：兑换码充值**（白色按钮）

### 二、余额预警设置区域（图2 + 图4）
仅企业管理员（role=admin）可见：
- **通知方式**：单选，邮件通知 / 短信通知
- **额度预警阈值**：数字输入，旁边显示等价金额（按固定比率换算，1额度=¥0.01）
- **通知邮箱**：文本输入，留空则使用账号绑定邮箱（placeholder提示）
- **保存**按钮

### 三、充值记录列表（图1 + 图3 的充值账单）
- 搜索框（按订单号搜索）
- 表格列：**时间 / 类型（兑换码充值/后台充值）/ 金额 / 操作人 / 备注**
- 无数据时展示空状态插图 + "暂无数据"
- 分页支持

---

## 数据库变更（需要新建两张表）

### 1. `enterprise_balances` 表（企业账户余额）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| enterprise_id | uuid | 关联企业（唯一） |
| balance | numeric | 当前可用余额（元），默认 0 |
| total_consumed | numeric | 累计消耗，默认 0 |
| request_count | integer | 请求次数（占位），默认 0 |
| alert_threshold | numeric | 预警阈值，默认 null |
| alert_email | text | 预警邮箱，默认 null |
| alert_method | text | 通知方式 'email'/'sms'，默认 'email' |
| updated_at | timestamptz | 更新时间 |
| created_at | timestamptz | 创建时间 |

### 2. `balance_records` 表（充值记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| enterprise_id | uuid | 关联企业 |
| type | text | 'redeem_code' / 'manual' |
| amount | numeric | 充值金额 |
| operator | text | 操作人（手机号或名称） |
| remark | text | 备注 |
| created_at | timestamptz | 充值时间 |

### 3. `redeem_codes` 表（兑换码）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| code | text | 兑换码（唯一索引） |
| amount | numeric | 面值金额 |
| status | text | 'unused'/'used' |
| used_by | text | 使用者手机号 |
| used_at | timestamptz | 使用时间 |
| created_at | timestamptz | 创建时间 |

RLS 策略：三张表均沿用项目现有"Anyone can ..."模式。

---

## 兑换码充值弹窗
点击"兑换码充值"按钮：
- 弹出 Dialog
- 输入兑换码
- 提交后查询 `redeem_codes`：验证存在且未使用
- 成功则：更新 redeem_codes.status='used'，在 balance_records 插入一条记录，更新 enterprise_balances.balance += amount
- 失败则提示"兑换码无效或已使用"

---

## 路由集成
在 `Workspace.tsx` 中新增：
```
/workspace/enterprise/balance → <AccountBalance enterprise={enterprise} role={role} />
```

---

## 新建文件
| 文件 | 说明 |
|------|------|
| `src/pages/AccountBalance.tsx` | 账户余额主页面 |
| `supabase/migrations/...` | 三张新表的建表 SQL |

---

## 关键细节
- 顶部卡片蓝绿渐变样式与图3完全一致（复用 Workspace 首页的渐变风格）
- 预警阈值输入框旁实时显示"等价金额：¥X.XX"（1额度=¥0.01）
- 充值记录按时间倒序，分页每页10条
- 请求次数字段当前显示0（待后续 API 日志功能接入后更新）
- 余额首次访问时自动初始化 enterprise_balances 记录（upsert on enterprise_id）
