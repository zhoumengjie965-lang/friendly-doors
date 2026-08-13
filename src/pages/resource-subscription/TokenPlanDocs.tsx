import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTokenPlanFaqs, TOKEN_PLAN_FAQ_GROUPS } from "./token-plan-faq";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Copy,
  KeyRound,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MOCK_PLANS, type SubscriptionPlan } from "./shared";
import { SUBSCRIPTION_BASE_URL } from "./subscriptions-data";

type DocKey =
  | "personal-overview"
  | "personal-quick-start"
  | "personal-faq"
  | "enterprise-overview"
  | "enterprise-quick-start"
  | "enterprise-management"
  | "enterprise-faq";

const DOC_GROUPS: Array<{
  title?: string;
  items: Array<{ key: DocKey; title: string; description?: string; icon: typeof BookOpen }>;
}> = [
  {
    title: "Token Plan 企业版",
    items: [
      { key: "enterprise-overview", title: "套餐概览", icon: Users },
      { key: "enterprise-quick-start", title: "快速开始", icon: Zap },
      { key: "enterprise-management", title: "团队管理", icon: Users },
      { key: "enterprise-faq", title: "常见问题", icon: BookOpen },
    ],
  },
  {
    title: "Token Plan 个人版",
    items: [
      { key: "personal-overview", title: "套餐概览", icon: KeyRound },
      { key: "personal-quick-start", title: "快速开始", icon: Zap },
      { key: "personal-faq", title: "常见问题", icon: BookOpen },
    ],
  },
];

const DOCS = DOC_GROUPS.flatMap((group) => group.items);

const DOC_BASE = "/workspace/docs/token-plan";

const TOKEN_PLAN_DOC_PRICING = [
  { name: "Lite 轻量版", originalPrice: 198, price: 149, monthlyCredits: 40_000, positioning: "适合日常轻量使用与个人效率辅助" },
  { name: "Standard 标准版", originalPrice: 598, price: 419, monthlyCredits: 120_000, positioning: "适合日常开发、办公与稳定使用" },
  { name: "Pro 尊享版", originalPrice: 1_398, price: 909, monthlyCredits: 280_000, positioning: "适合高频调用与核心生产任务" },
] as const;

const TOKEN_PLAN_SUPPORTED_MODEL_GROUPS = [
  {
    brand: "DeepSeek",
    models: [
      { id: "deepseek-v4-pro", capability: "推理模型、文本生成" },
      { id: "deepseek-v4-flash", capability: "推理模型、文本生成" },
    ],
  },
  {
    brand: "Kimi",
    models: [
      { id: "kimi-k2.7-code", capability: "推理模型、视觉理解、文本生成" },
      { id: "kimi-k2.6", capability: "推理模型、视觉理解、文本生成" },
      { id: "kimi-k2.5", capability: "推理模型、视觉理解、文本生成" },
    ],
  },
  {
    brand: "智谱",
    models: [
      { id: "glm-5.2", capability: "推理模型、文本生成" },
      { id: "glm-5.1", capability: "推理模型、文本生成" },
      { id: "glm-5", capability: "推理模型、文本生成" },
    ],
  },
  {
    brand: "阿里",
    models: [
      { id: "qwen3.8-max-preview", capability: "推理模型、视觉理解、文本生成" },
      { id: "qwen3.7-max", capability: "推理模型、文本生成" },
      { id: "qwen3.7-plus", capability: "推理模型、视觉理解、文本生成" },
      { id: "qwen3.6-plus", capability: "推理模型、视觉理解、文本生成" },
      { id: "qwen3.6-flash", capability: "推理模型、视觉理解、文本生成" },
      { id: "qwen-image-2.0", capability: "图片生成" },
      { id: "qwen-image-2.0-pro", capability: "图片生成" },
      { id: "wan2.7-image", capability: "图片生成" },
      { id: "wan2.7-image-pro", capability: "图片生成" },
      { id: "happyhorse-1.1-i2v", capability: "视频生成" },
      { id: "happyhorse-1.1-t2v", capability: "视频生成" },
      { id: "happyhorse-1.1-r2v", capability: "视频生成" },
    ],
  },
  {
    brand: "MiniMax",
    models: [{ id: "MiniMax-M2.5", capability: "推理模型、文本生成" }],
  },
] as const;

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function Note({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" }) {
  const classes = tone === "amber" ? "border-amber-500" : "border-blue-500";
  return <blockquote className={`border-l-4 bg-muted/30 px-4 py-2 text-sm leading-7 text-muted-foreground ${classes}`}>{children}</blockquote>;
}

function CodeBlock({ value }: { value: string }) {
  const { toast } = useToast();
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-slate-100">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-7 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
        onClick={() => navigator.clipboard.writeText(value).then(() => toast({ title: "已复制代码" }))}
      >
        <Copy className="mr-1 h-3.5 w-3.5" />复制
      </Button>
      <pre className="overflow-x-auto p-4 pr-20 text-xs leading-6"><code>{value}</code></pre>
    </div>
  );
}

function ScreenshotPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
      <p className="text-sm font-medium text-foreground">截图占位：{title}</p>
      <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function EditionPage({ edition }: { edition: "personal" | "team" }) {
  const personal = edition === "personal";
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Token Plan {personal ? "个人版" : "企业版"}套餐概览</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {personal
            ? "Token Plan 个人版面向个人开发者，提供 Lite 轻量版、Standard 标准版和 Pro 尊享版三个档位，匹配不同使用强度。"
            : "Token Plan 企业版面向企业和团队，提供 Lite 轻量版、Standard 标准版和 Pro 尊享版三个档位，匹配不同使用强度。"}
        </p>
      </div>

      <Section title="产品特点">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">主流模型一站使用：</strong>一个订阅即可使用套餐范围内的多种主流模型，按需切换，无需分别采购和配置。</li>
          <li><strong className="text-foreground">兼容主流 AI 工具：</strong>使用 Token Plan 专属 API Key，可接入支持自定义模型服务的 AI 编程与智能体工具。</li>
          <li><strong className="text-foreground">多档套餐灵活选择：</strong>提供 Lite 轻量版、Standard 标准版和 Pro 尊享版三个档位，覆盖从日常辅助到高频使用的不同需求。</li>
          <li><strong className="text-foreground">订阅用量清晰可控：</strong>支持按月或按年订阅，以 Credit 统一计量，可在控制台查看额度和使用明细。</li>
          {!personal && <>
            <li><strong className="text-foreground">按需组合团队席位：</strong>不同档位席位可按成员使用强度灵活搭配，兼顾使用需求与团队预算。</li>
            <li><strong className="text-foreground">团队订阅统一管理：</strong>管理员可统一分配、回收和升级席位，并查看成员用量；每个席位独享额度并对应一个专属 API Key。</li>
          </>}
        </ul>
      </Section>

      <Section title="产品定价">
        <p>选择套餐类型、数量和订阅周期后完成购买。支持按月、按年购买，也可开启连续包月或连续包年。</p>
        {!personal && <>
          <h3 className="pt-2 text-base font-semibold text-foreground">席位说明</h3>
          <p>席位是 Token Plan 企业版的基础订阅单位，代表一名团队成员的使用名额。管理员将席位分配给成员后，成员可使用一个专属 API Key 调用服务。每个席位仅可绑定一名成员，不支持多人共用。</p>
        </>}
        <h3 className="pt-2 text-base font-semibold text-foreground">{personal ? "套餐定价" : "席位定价"}</h3>
        <p>提供 Lite 轻量版、Standard 标准版和 Pro 尊享版三个档位，匹配不同使用强度。</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse border border-border text-left text-sm">
            <thead className="bg-muted/50 text-foreground">
              <tr>{[personal ? "套餐类型" : "席位类型", "月付价格", "每月额度", "适用场景"].map((head) => <th key={head} className="border border-border px-3 py-2 font-medium">{head}</th>)}</tr>
            </thead>
            <tbody>
              {TOKEN_PLAN_DOC_PRICING.map((plan) => <tr key={plan.name}>
                <td className="border border-border px-3 py-3 font-medium text-foreground">{plan.name}</td>
                <td className="border border-border px-3 py-3 whitespace-nowrap">
                  <span className="text-muted-foreground line-through">原价 ¥{plan.originalPrice.toLocaleString("zh-CN")}/{personal ? "月" : "席/月"}</span><br />
                  <strong className="text-foreground">活动价 ¥{plan.price.toLocaleString("zh-CN")}/{personal ? "月" : "席/月"}</strong>
                </td>
                <td className="border border-border px-3 py-3 whitespace-nowrap">{plan.monthlyCredits.toLocaleString("zh-CN")} Credits/{personal ? "月" : "席/月"}</td>
                <td className="border border-border px-3 py-3">{plan.positioning}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Note tone="amber">
          <strong className="text-foreground">重要：</strong>{personal ? "升级" : "加购或升级席位"}时，费用按当前订阅的剩余周期折算，实际支付金额以订单页面展示为准。
        </Note>
      </Section>

      <Section title="Credit 抵扣说明">
        <p>模型调用统一折算为 Credit，并从当前订阅或席位的周期额度中扣减。单次消耗由模型类型、Token 用量、思考模式及工具调用等因素决定，实际消耗以控制台用量明细为准。</p>
        <p>以 glm-5.2 为例，单次请求的 Credit 消耗示例如下（不同模型的单价不同，实际以账单为准）：</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse border border-border text-left text-sm">
            <thead className="bg-muted/50 text-foreground">
              <tr>{["Token 类型", "数量", "消耗 Credits"].map((head) => <th key={head} className="border border-border px-3 py-2 font-medium">{head}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td className="border border-border px-3 py-2">输入 Tokens</td><td className="border border-border px-3 py-2">5,000</td><td className="border border-border px-3 py-2">8.00</td></tr>
              <tr><td className="border border-border px-3 py-2">缓存 Tokens</td><td className="border border-border px-3 py-2">20,000</td><td className="border border-border px-3 py-2">8.00</td></tr>
              <tr><td className="border border-border px-3 py-2">输出 Tokens</td><td className="border border-border px-3 py-2">1,000</td><td className="border border-border px-3 py-2">5.60</td></tr>
              <tr className="font-semibold text-foreground"><td className="border border-border px-3 py-2" colSpan={2}>合计</td><td className="border border-border px-3 py-2">约 21.60 Credits</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="支持的模型">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse border border-border text-left text-sm">
            <thead className="bg-muted/50 text-foreground">
              <tr>
                <th className="w-[22%] border border-border px-3 py-2 font-medium">品牌</th>
                <th className="w-[38%] border border-border px-3 py-2 font-medium">模型 ID（Model ID）</th>
                <th className="border border-border px-3 py-2 font-medium">模型能力</th>
              </tr>
            </thead>
            <tbody>
              {TOKEN_PLAN_SUPPORTED_MODEL_GROUPS.flatMap((group) =>
                group.models.map((model, index) => (
                  <tr key={model.id}>
                    {index === 0 && (
                      <td rowSpan={group.models.length} className="border border-border px-3 py-2 align-middle font-medium text-foreground">
                        {group.brand}
                      </td>
                    )}
                    <td className="border border-border px-3 py-2 font-mono text-xs text-foreground">{model.id}</td>
                    <td className="border border-border px-3 py-2">{model.capability}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="订阅规则">
        <h3 className="text-base font-semibold text-foreground">购买规则</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>支持按月或按年购买，订阅在支付成功后立即生效。</li>
          <li>Token Plan 暂不支持使用代金券购买。</li>
          <li>套餐 Credit 按订阅周期发放；周期结束后，未使用的 Credit 自动清零，不结转至下一周期。</li>
        </ul>

        <h3 className="pt-2 text-base font-semibold text-foreground">有效期</h3>
        <p>套餐有效期以自然月为单位，自购买成功当日开始计算。示例：1 月 31 日购买 1 个月套餐，于 3 月 1 日 00:00 到期（非闰年）。</p>

        <h3 className="pt-2 text-base font-semibold text-foreground">续费规则</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>支持手动续费和自动续费。月付订阅可续费 1 个月、3 个月或 6 个月，年付订阅每次可续费 1 年；支持多次续费，每次均从原到期日顺延，续费后的最终到期日不得超过当前日期之后 24 个月。</li>
          <li>开启自动续费后，系统将在到期前 7 天尝试扣款；关闭自动续费不影响当前周期使用，到期未续费后订阅失效。</li>
        </ul>

        <h3 className="pt-2 text-base font-semibold text-foreground">{personal ? "升级规则" : "席位变更规则"}</h3>
        <ul className="list-disc space-y-1 pl-5">
          {!personal && <li>加购席位后立即生效，到期时间与当前企业订阅一致；费用和本周期 Credit 按剩余时间折算。</li>}
          <li>升级按当前订阅剩余周期补缴档位差价，支付成功后立即生效且到期时间不变；额度更新为目标档位对应额度，已使用额度保留，当前周期内不支持降级。</li>
        </ul>

        <h3 className="pt-2 text-base font-semibold text-foreground">退款规则</h3>
        <p>新购、续费、{personal ? "升级" : "加购及升级"}订单支付成功后不支持退款；关闭自动续费不影响当前周期使用。购买前请确认套餐档位、订阅周期和{personal ? "购买信息" : "席位数量"}。</p>
      </Section>

      <Section title="使用须知">
        <ul className="list-disc space-y-1 pl-5">
          <li>套餐专属 API Key 仅限本人使用，不得共享或公开泄露。</li>
          <li>套餐额度用尽后，订阅专用 API Key 将停止服务；如需继续调用，可切换至按量付费 API Key。</li>
          <li>套餐支持的模型可能随产品升级调整，实际范围以控制台展示为准。</li>
        </ul>
      </Section>

      {personal && <Note>个人版购买后由本人使用。如需为多名成员统一购买和分配席位，请使用 Token Plan 企业版。</Note>}
    </div>
  );
}

function QuickStart({ edition }: { edition: "personal" | "enterprise" }) {
  const personal = edition === "personal";
  const navigate = useNavigate();
  const curl = `curl ${SUBSCRIPTION_BASE_URL}/chat/completions \\\n  -H "Authorization: Bearer <YOUR_TOKEN_PLAN_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "deepseek-v4-pro",\n    "messages": [{"role": "user", "content": "你好"}]\n  }'`;

  return (
    <div className="space-y-8">
      <div><Badge variant="outline" className="mb-3 border-blue-200 bg-blue-50 text-blue-700">{personal ? "个人版" : "企业版"}</Badge><h1 className="text-3xl font-bold tracking-tight">快速开始</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{personal ? "完成订阅并获取接入信息后，即可发起首次模型调用。" : "企业管理员完成购买、添加成员和分配席位后，成员即可获取接入信息并调用模型。"}</p></div>

      <Section title={`步骤一：订阅 Token Plan ${personal ? "个人版" : "企业版"}`}>
        <ol className="list-decimal space-y-1 pl-5">
          <li>进入 <button type="button" onClick={() => navigate("/workspace/token-plan")} className="text-primary underline underline-offset-4">Token Plan {personal ? "个人版" : "企业版"}购买页面</button>。</li>
          <li>选择订阅周期和套餐档位{personal ? "" : "，填写各档位席位数量"}，确认订单后完成支付。</li>
          <li>支付成功后订阅立即生效。</li>
        </ol>
      </Section>

      {!personal && <Section title="步骤二：添加成员并分配席位">
        <ol className="list-decimal space-y-1 pl-5">
          <li>进入左侧导航的“成员管理”，添加需要使用 Token Plan 的企业成员；已有成员可跳过此操作。</li>
          <li>进入“Token Plan &gt; 企业订阅”，在席位管理中选择未分配席位，并将席位分配给对应成员。</li>
          <li>每个席位同一时间只能分配给一名成员。分配完成后，该成员可使用席位对应的套餐额度。</li>
        </ol>
        <ScreenshotPlaceholder title="成员管理—添加成员" description="展示成员管理页面的添加成员入口，以及成员添加完成后的列表位置。" />
        <ScreenshotPlaceholder title="企业订阅—分配席位" description="展示未分配席位、分配成员入口和确认分配操作。" />
      </Section>}

      <Section title={`步骤${personal ? "二" : "三"}：获取 API Key 和 Base URL`}>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{personal ? "购买者" : "已获配席位的成员"}进入“Token Plan &gt; 我的订阅”。</li>
          <li>在“配置”区域生成并复制专属 API Key。完整 Key 请妥善保存，不要公开或与他人共享。</li>
          <li>复制页面展示的 Base URL，用于后续接口或客户端配置。</li>
        </ol>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3"><KeyRound className="h-4 w-4 text-muted-foreground" /><code className="text-xs text-foreground">{SUBSCRIPTION_BASE_URL}</code></div>
        <ScreenshotPlaceholder title="我的订阅—配置" description="展示专属 API Key 的生成或复制入口，以及 Base URL 所在位置。截图时请隐藏完整 API Key。" />
        <div className="mt-4"><Note>订阅专用 API Key 仅用于 Token Plan 专属地址。重置 Key 后，旧 Key 会立即失效，请同步更新所有调用配置。</Note></div>
      </Section>
      <Section title={`步骤${personal ? "三" : "四"}：发起首次调用`}>
        <p>将以下示例中的 API Key 和模型名称替换为您自己的配置后发起请求。请求中的 model 必须是当前套餐支持的模型。</p>
        <div className="mt-3"><CodeBlock value={curl} /></div>
        <p className="mt-2">调用成功后，可在“我的订阅”查看额度变化和使用明细。</p>
        <p className="mt-2">相关文档：<span className="cursor-pointer text-primary underline underline-offset-4">模型接口文档</span>、<span className="cursor-pointer text-primary underline underline-offset-4">客户端工具接入指南</span></p>
      </Section>
    </div>
  );
}

function SubscriptionRules() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8">
      <div><Badge variant="outline" className="mb-3 border-orange-200 bg-orange-50 text-orange-700">企业版</Badge><h1 className="text-3xl font-bold tracking-tight">团队管理</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">企业管理员可添加成员、分配和回收席位，并查看团队席位的使用情况。</p></div>

      <Section title="成员管理">
        <h3 className="text-base font-semibold text-foreground">添加成员</h3>
        <ol className="list-decimal space-y-1 pl-5"><li>进入左侧导航的“<button type="button" onClick={() => navigate("/workspace/members")} className="text-primary underline underline-offset-4">成员管理</button>”。</li><li>添加需要使用 Token Plan 的企业成员；成员已存在时无需重复添加。</li><li>添加完成后，进入“Token Plan &gt; 企业订阅”为其分配席位。</li></ol>
        <ScreenshotPlaceholder title="成员管理—添加成员" description="展示添加成员入口、成员信息填写区域和成员列表。" />
        <h3 className="pt-3 text-base font-semibold text-foreground">移除或禁用成员</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-foreground">禁用成员：</strong>API Key 停止调用，但已分配的 Token Plan 席位仍保持占用；重新启用后可恢复使用。</li>
          <li><strong className="text-foreground">移除成员：</strong>成员将离开企业，其已分配的 Token Plan 席位自动回收并恢复为未分配状态，可重新分配给其他成员。</li>
        </ul>
      </Section>

      <Section title="席位管理">
        <p>进入“Token Plan &gt; 企业订阅”查看全部席位。企业管理员可按席位状态筛选，并进行分配、回收、升级和查看详情等操作。</p>
        <ScreenshotPlaceholder title="企业订阅—席位列表" description="展示席位档位、分配成员、使用状态、剩余额度和操作入口。" />

        <h3 className="pt-3 text-base font-semibold text-foreground">分配席位</h3>
        <ol className="list-decimal space-y-1 pl-5"><li>找到状态为“未分配”的席位，点击“分配”。</li><li>选择一名企业成员并确认。</li><li>分配完成后，成员可进入“我的订阅”生成专属 API Key。</li></ol>
        <Note>每个成员同一时间只能持有一个席位，每个席位同一时间只能分配给一名成员。</Note>
        <ScreenshotPlaceholder title="分配席位" description="展示成员选择、席位信息和确认分配操作。" />

        <h3 className="pt-3 text-base font-semibold text-foreground">回收和重新分配席位</h3>
        <p>在席位列表中找到已分配席位，点击“回收”。回收后席位变为未分配状态，原成员不能再使用该席位，管理员可以将其重新分配给其他成员。</p>

        <h3 className="pt-3 text-base font-semibold text-foreground">升级席位</h3>
        <p>选择目标席位并点击“升级”，选择更高档位后提交订单。具体升级规则和费用以套餐概览及订单页面为准。</p>
      </Section>

      <Section title="查看使用情况">
        <ul className="list-disc space-y-1 pl-5"><li>在席位列表中查看每个席位的档位、分配成员、额度使用进度和到期时间。</li><li>点击“查看用量明细”，查看该席位的用量记录。</li><li>企业管理员可在“资源统计”中按成员、模型和时间范围分析团队用量。</li></ul>
        <ScreenshotPlaceholder title="席位使用情况" description="展示额度使用进度、剩余额度和“查看用量明细”按钮。" />
      </Section>

    </div>
  );
}

function Faq({ edition }: { edition: "personal" | "enterprise" }) {
  const enterprise = edition === "enterprise";
  const groupedFaqs = getTokenPlanFaqs(edition);
  return (
    <div className="space-y-8">
      <div><Badge variant="outline" className="mb-3">{enterprise ? "企业版" : "个人版"}</Badge><h1 className="text-3xl font-bold tracking-tight">常见问题</h1></div>
      {TOKEN_PLAN_FAQ_GROUPS.map((group) => {
        const items = groupedFaqs.filter((faq) => faq.group === group.key);
        if (items.length === 0) return null;
        return <section key={group.key} className="space-y-3"><h2 className="text-lg font-semibold text-foreground">{group.title}</h2><div className="divide-y divide-border rounded-xl border border-border">{items.map((faq) => <div key={faq.id} className="p-5"><h3 className="text-sm font-semibold text-foreground">{faq.question}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p></div>)}</div></section>;
      })}
    </div>
  );
}

export default function TokenPlanDocs() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeKey = location.pathname.split("/").pop() || "overview";
  const key = routeKey === "overview" ? "enterprise-overview" : routeKey;
  const activeKey: DocKey = DOCS.some((doc) => doc.key === key) ? key as DocKey : "enterprise-overview";
  const plans = useMemo(() => MOCK_PLANS.filter((plan) => plan.productType === "subscription"), []);

  return (
    <div className="mx-auto w-full max-w-[1240px] p-6">
      <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => navigate("/workspace/my-subscription")}><ArrowLeft className="h-4 w-4" />我的订阅</button>
        <ChevronRight className="h-4 w-4" /><span className="text-foreground">Token Plan 使用指南</span>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-4 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 px-3 py-2"><BookOpen className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Token Plan 文档</span></div>
          <nav className="mt-2 space-y-4">
            {DOC_GROUPS.map((group, index) => <div key={group.title ?? index}>
              {group.title && <p className="mb-1 px-3 text-xs font-semibold text-foreground">{group.title}</p>}
              <div className={`space-y-1 ${group.title ? "ml-3 border-l border-border pl-2" : ""}`}>
                {group.items.map((doc) => {
                  const Icon = doc.icon;
                  const active = doc.key === activeKey;
                  return <button key={doc.key} onClick={() => navigate(`${DOC_BASE}/${doc.key}`)} className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}><span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4" />{doc.title}</span>{doc.description && <span className="mt-0.5 block pl-6 text-xs text-muted-foreground">{doc.description}</span>}</button>;
                })}
              </div>
            </div>)}
          </nav>
        </aside>
        <article className="min-w-0 rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          {activeKey === "personal-overview" && <EditionPage edition="personal" />}
          {activeKey === "personal-quick-start" && <QuickStart edition="personal" />}
          {activeKey === "personal-faq" && <Faq edition="personal" />}
          {activeKey === "enterprise-overview" && <EditionPage edition="team" />}
          {activeKey === "enterprise-quick-start" && <QuickStart edition="enterprise" />}
          {activeKey === "enterprise-management" && <SubscriptionRules />}
          {activeKey === "enterprise-faq" && <Faq edition="enterprise" />}
        </article>
      </div>
    </div>
  );
}
