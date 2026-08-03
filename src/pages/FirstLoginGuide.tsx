import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
} from "lucide-react";

export type GuideScenario = "admin" | "member";

/* ============================================================
 *  主弹窗 — 根据场景渲染不同内容
 * ============================================================ */
export function FirstLoginGuideDialog({
  scenario,
  open,
  onClose,
  onSuccess,
}: {
  scenario: GuideScenario;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  if (scenario === "admin") {
    return <AdminGuideDialog open={open} onClose={onClose} onSuccess={onSuccess} />;
  }
  return <MemberGuideDialog open={open} onClose={onClose} onSuccess={onSuccess} />;
}

/* ============================================================
 *  场景一：企业管理员首次登录 — 完善联系方式
 * ============================================================ */
function AdminGuideDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<"bind" | "success">("bind");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const phoneValid = /^1[3-9]\d{9}$/.test(phone);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // 手机号填了则验证码必填，邮箱填了则验证码必填，至少绑定一种
  const canSubmit =
    (phoneValid || emailValid) &&
    (!phone || phoneValid) &&
    (!email || emailValid) &&
    (!phone || phoneCode) &&
    (!email || emailCode);

  const sendPhoneCode = () => {
    if (!phoneValid) {
      setErrors(prev => ({ ...prev, phone: "请输入正确的手机号" }));
      return;
    }
    setErrors(prev => ({ ...prev, phone: "" }));
    setPhoneCodeSent(true);
    setPhoneCountdown(60);
    const timer = setInterval(() => {
      setPhoneCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendEmailCode = () => {
    if (!emailValid) {
      setErrors(prev => ({ ...prev, email: "请输入正确的邮箱" }));
      return;
    }
    setErrors(prev => ({ ...prev, email: "" }));
    setEmailCodeSent(true);
    setEmailCountdown(60);
    const timer = setInterval(() => {
      setEmailCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBind = () => {
    const newErrors: Record<string, string> = {};
    if (phone && !phoneValid) newErrors.phone = "手机号格式不正确";
    if (email && !emailValid) newErrors.email = "邮箱格式不正确";
    if (!phone && !email) {
      newErrors.phone = "请至少绑定一种联系方式";
      newErrors.email = "请至少绑定一种联系方式";
    }
    if (phone && phoneValid && !phoneCode) newErrors.phoneCode = "请输入验证码";
    if (email && emailValid && !emailCode) newErrors.emailCode = "请输入验证码";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setStep("success");
  };

  const handleClose = () => {
    // 重置状态
    setStep("bind");
    setPhone("");
    setEmail("");
    setPhoneCode("");
    setEmailCode("");
    setPhoneCodeSent(false);
    setEmailCodeSent(false);
    setPhoneCountdown(0);
    setEmailCountdown(0);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md max-h-[85vh] overflow-y-auto"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {step === "bind" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-center">完善联系方式</DialogTitle>
              <DialogDescription className="text-center leading-relaxed pt-1">
                为保障企业账户安全，请及时绑定手机号或邮箱。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* 手机号 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  手机号
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: "", phoneCode: "" })); }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={phoneCountdown > 0}
                    onClick={sendPhoneCode}
                    className="shrink-0 w-[100px]"
                  >
                    {phoneCountdown > 0 ? `${phoneCountdown}s` : "获取验证码"}
                  </Button>
                </div>
                {phoneCodeSent && phoneCountdown > 0 && (
                  <Input
                    placeholder="请输入验证码"
                    value={phoneCode}
                    onChange={e => { setPhoneCode(e.target.value); setErrors(prev => ({ ...prev, phoneCode: "" })); }}
                    maxLength={6}
                  />
                )}
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                {errors.phoneCode && <p className="text-xs text-destructive">{errors.phoneCode}</p>}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">或</span>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* 邮箱 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  邮箱
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="请输入邮箱"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "", emailCode: "" })); }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!emailValid || emailCountdown > 0}
                    onClick={sendEmailCode}
                    className="shrink-0 w-[100px]"
                  >
                    {emailCountdown > 0 ? `${emailCountdown}s` : "获取验证码"}
                  </Button>
                </div>
                {emailCodeSent && emailCountdown > 0 && (
                  <Input
                    placeholder="请输入验证码"
                    value={emailCode}
                    onChange={e => { setEmailCode(e.target.value); setErrors(prev => ({ ...prev, emailCode: "" })); }}
                    maxLength={6}
                  />
                )}
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                {errors.emailCode && <p className="text-xs text-destructive">{errors.emailCode}</p>}
              </div>

              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  手机号和邮箱至少绑定一种，绑定后可用于接收企业账户重要通知。
                </p>
              </div>

              <Button className="w-full" disabled={!canSubmit} onClick={handleBind}>
                确认绑定
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <DialogTitle className="text-center">绑定成功</DialogTitle>
              <DialogDescription className="text-center leading-relaxed pt-1">
                联系方式绑定成功，已默认开启余额不足通知
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  onSuccess?.();
                  handleClose();
                }}
                className="w-full"
              >
                前往余额通知设置
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 *  场景三：企业成员首次登录 — 密码设置引导
 * ============================================================ */
function MemberGuideDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<"set" | "success">("set");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const strength = (() => {
    if (!newPwd) return 0;
    let s = 0;
    if (newPwd.length >= 8) s++;
    if (/[A-Z]/.test(newPwd)) s++;
    if (/[0-9]/.test(newPwd)) s++;
    if (/[^A-Za-z0-9]/.test(newPwd)) s++;
    return s;
  })();
  const strengthLabel = ["", "弱", "一般", "较强", "强"][strength] || "";
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"][strength] || "";
  const canSubmit = newPwd.length >= 8 && newPwd === confirmPwd;

  const handleSubmit = () => {
    if (newPwd.length < 8) { setError("密码长度至少 8 位"); return; }
    if (newPwd !== confirmPwd) { setError("两次输入的密码不一致"); return; }
    setError("");
    onSuccess?.();
    handleClose();
  };

  const handleClose = () => {
    setStep("set");
    setNewPwd("");
    setConfirmPwd("");
    setError("");
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {step === "set" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-center">设置登录密码</DialogTitle>
              <DialogDescription className="text-center leading-relaxed pt-1">
                当前账号尚未设置密码，设置后可使用用户名+密码登录。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* 新密码 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">新密码</Label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    placeholder="请输入新密码（至少 8 位）"
                    value={newPwd}
                    onChange={e => { setNewPwd(e.target.value); setError(""); }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPwd && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength ? strengthColor : "bg-muted"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{strengthLabel}</span>
                  </div>
                )}
              </div>

              {/* 确认密码 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">确认密码</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="请再次输入密码"
                    value={confirmPwd}
                    onChange={e => { setConfirmPwd(e.target.value); setError(""); }}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex flex-col gap-2">
                <Button disabled={!canSubmit} onClick={handleSubmit}>立即设置</Button>
                <Button variant="ghost" onClick={handleClose}>稍后设置</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
