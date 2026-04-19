import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithPhone } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [phone, setPhone] = useState("18217795009");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState<{ phone?: string; code?: string; agree?: string }>({});
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const inviteParam = new URLSearchParams(window.location.search).get("invite");

  const startCountdown = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErrors((e) => ({ ...e, phone: "请输入正确的手机号" }));
      return;
    }
    setErrors((e) => ({ ...e, phone: undefined }));
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
    const errs: typeof errors = {};
    if (!/^1[3-9]\d{9}$/.test(phone)) errs.phone = "请输入正确的手机号";
    if (code !== "123456") errs.code = "验证码错误";
    if (!agreed) errs.agree = "请阅读并同意服务协议";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await loginWithPhone(phone);
      navigate(inviteParam ? `/invite/${inviteParam}` : "/workspace");
    } catch {
      toast({ title: "登录失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">欢迎登录AI网关平台</h1>
          <p className="text-muted-foreground text-sm mt-1">请使用手机号登录</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 space-y-5">
          {/* Phone */}
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
                onChange={(e) => { setPhone(e.target.value); setErrors((err) => ({ ...err, phone: undefined })); }}
                maxLength={11}
              />
            </div>
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* Code */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">验证码</label>
            <div className="flex gap-2">
              <Input
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => { setCode(e.target.value); setErrors((err) => ({ ...err, code: undefined })); }}
                maxLength={6}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 w-32 text-sm"
                disabled={countdown > 0}
                onClick={startCountdown}
              >
                {countdown > 0 ? `${countdown}s 后重发` : "获取短信验证码"}
              </Button>
            </div>
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          {/* Agreement */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(v) => { setAgreed(!!v); setErrors((err) => ({ ...err, agree: undefined })); }}
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
            {loading ? "登录中..." : "登录 / 注册"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            测试提示：验证码固定为 <span className="font-mono font-bold">123456</span>
          </p>
        </div>
      </div>
    </div>
  );
}
