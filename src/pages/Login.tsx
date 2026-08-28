import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithPhone } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

type LoginMode = "username" | "phone" | "email";
type MockScenario = "none" | "admin" | "member" | "reseller";

export default function Login() {
  const [loginMode, setLoginMode] = useState<LoginMode>("username");
  const [mockScenario, setMockScenario] = useState<MockScenario>("none");

  // username mode
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // phone mode
  const [phone, setPhone] = useState("18217795009");

  // email mode
  const [email, setEmail] = useState("");

  // shared
  const [code, setCode] = useState("123456");
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const inviteParam = new URLSearchParams(window.location.search).get("invite");

  const clearErrors = () => setErrors({});

  const startCountdown = () => {
    if (loginMode === "phone") {
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        setErrors({ phone: "请输入正确的手机号" });
        return;
      }
    } else if (loginMode === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrors({ email: "请输入正确的邮箱地址" });
        return;
      }
    }
    clearErrors();
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    toast({ title: "验证码已发送", description: "测试验证码为 123456" });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (loginMode === "username") {
      if (!username.trim()) errs.username = "请输入用户名";
      if (!password.trim()) errs.password = "请输入密码";
    } else if (loginMode === "phone") {
      if (!/^1[3-9]\d{9}$/.test(phone)) errs.phone = "请输入正确的手机号";
      if (code !== "123456") errs.code = "验证码错误";
    } else if (loginMode === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "请输入正确的邮箱地址";
      if (code !== "123456") errs.code = "验证码错误";
    }
    if (!agreed) errs.agree = "请阅读并同意服务协议";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await loginWithPhone("18217795009");
      if (mockScenario !== "none") {
        sessionStorage.setItem("first_login_guide_scenario", mockScenario);
      }
      navigate(mockScenario === "reseller" ? "/reseller/enterprises" : inviteParam ? `/invite/${inviteParam}` : "/workspace");
    } catch {
      toast({ title: "登录失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: LoginMode; label: string }[] = [
    { key: "username", label: "账号登录" },
    { key: "phone", label: "手机号登录" },
    { key: "email", label: "邮箱登录" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">欢迎登录AI网关平台</h1>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 space-y-5">
          {/* Tab switch */}
          <div className="flex items-center justify-center gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                  loginMode === tab.key
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
                onClick={() => { setLoginMode(tab.key); clearErrors(); }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Username mode */}
          {loginMode === "username" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">用户名</label>
                <Input
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearErrors(); }}
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">密码</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            </>
          )}

          {/* Phone mode */}
          {loginMode === "phone" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">手机号</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                    +86
                  </span>
                  <Input
                    className="rounded-l-none"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearErrors(); }}
                    maxLength={11}
                  />
                </div>
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">验证码</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="请输入验证码"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); clearErrors(); }}
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 w-32 text-sm"
                    disabled={countdown > 0}
                    onClick={startCountdown}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                  </Button>
                </div>
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                测试提示：验证码固定为 <span className="font-mono font-bold">123456</span>
              </p>
            </>
          )}

          {/* Email mode */}
          {loginMode === "email" && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">邮箱</label>
                <Input
                  placeholder="请输入邮箱"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">验证码</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="请输入验证码"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); clearErrors(); }}
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 w-32 text-sm"
                    disabled={countdown > 0}
                    onClick={startCountdown}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                  </Button>
                </div>
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                测试提示：验证码固定为 <span className="font-mono font-bold">123456</span>
              </p>
            </>
          )}

          {/* Agreement */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => { setAgreed(!!v); clearErrors(); }}
              />
              <label htmlFor="agree" className="text-sm text-muted-foreground cursor-pointer select-none">
                我已阅读并同意
                <span className="text-primary cursor-pointer hover:underline mx-0.5">《服务协议》</span>
                和
                <span className="text-primary cursor-pointer hover:underline mx-0.5">《隐私政策》</span>
              </label>
            </div>
            {errors.agree && <p className="text-xs text-destructive">{errors.agree}</p>}
          </div>

          {/* Login Button */}
          <Button
            className="w-full h-11 text-base font-medium"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </Button>

          {/* Mock 场景选择 */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <p className="text-xs text-muted-foreground text-center">模拟首次登录场景（登录后弹窗）</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMockScenario("admin")}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mockScenario === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                管理员首次登录
              </button>
              <button
                type="button"
                onClick={() => setMockScenario("member")}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mockScenario === "member"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                成员首次登录
              </button>
              <button
                type="button"
                onClick={() => setMockScenario("none")}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mockScenario === "none"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                不模拟
              </button>
              <button
                type="button"
                onClick={() => setMockScenario("reseller")}
                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mockScenario === "reseller"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                代理商身份登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
