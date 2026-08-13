# Token Plan 个人版快速开始

完成订阅并获取接入信息后，即可发起首次模型调用。

## 步骤一：订阅 Token Plan 个人版

1. 进入 [Token Plan 个人版购买页面](#)。
2. 选择订阅周期和套餐档位，确认订单后完成支付。
3. 支付成功后订阅立即生效。

## 步骤二：获取 API Key 和 Base URL

1. 购买者进入【Token Plan > 我的订阅】。
2. 在【配置】区域生成并复制专属 API Key。完整 Key 请妥善保存，不要公开或与他人共享。
3. 复制页面展示的 Base URL，用于后续接口或客户端配置。

```text
https://api.ai-gateway.com/v1
```

<!-- 截图占位：我的订阅—配置。展示专属 API Key 的生成或复制入口，以及 Base URL 所在位置。截图时请隐藏完整 API Key。 -->

> 订阅专用 API Key 仅用于 Token Plan 专属地址。重置 Key 后，旧 Key 会立即失效，请同步更新所有调用配置。

## 步骤三：发起首次调用

将以下示例中的 API Key 和模型名称替换为您自己的配置后发起请求。请求中的 `model` 必须是当前套餐支持的模型。

```bash
curl https://api.ai-gateway.com/v1/chat/completions \
  -H "Authorization: Bearer <YOUR_TOKEN_PLAN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4-pro",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

调用成功后，可在【我的订阅】查看额度变化和使用明细。更多参数和客户端配置方式可查看[模型接口文档](#)和[客户端工具接入指南](#)。

