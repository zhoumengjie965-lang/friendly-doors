import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPhone, createEnterprise, createPersonalWorkspace } from "@/lib/auth";
import { Building2, User, ArrowRight, Plus } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState("");
  const [loading, setLoading] = useState(false);

  // 进入个人空间
  const handlePersonalSpace = async () => {
    setLoading(true);
    const phone = getCurrentPhone();
    if (!phone) {
      toast({ title: "请先登录", variant: "destructive" });
      navigate("/login");
      return;
    }

    try {
      const workspace = await createPersonalWorkspace(phone);
      localStorage.setItem("ACT_WS_ID", workspace.id);
      localStorage.setItem("ACT_WS_TYPE", "personal");
      localStorage.setItem("ai_gateway_last_workspace_type", "personal");
      toast({ title: "已进入个人空间" });
      navigate("/workspace");
    } catch (err: any) {
      toast({ title: "进入个人空间失败", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 创建企业
  const handleCreateEnterprise = async () => {
    if (!enterpriseName.trim()) {
      toast({ title: "请输入企业名称", variant: "destructive" });
      return;
    }

    setLoading(true);
    const phone = getCurrentPhone();
    if (!phone) {
      toast({ title: "请先登录", variant: "destructive" });
      navigate("/login");
      return;
    }

    try {
      const enterprise = await createEnterprise(enterpriseName.trim(), phone);
      localStorage.setItem("ACT_WS_ID", enterprise.id);
      localStorage.setItem("ACT_WS_TYPE", "enterprise");
      localStorage.setItem("ai_gateway_last_workspace_type", "enterprise");
      localStorage.setItem("ai_gateway_last_enterprise", enterprise.id);
      toast({ title: "企业创建成功" });
      setShowCreateDialog(false);
      navigate("/workspace");
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* Logo & Title - 居中 */}
        <div className="text-center mb-10">
          <div 
            className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">欢迎来到 AI 网关平台</h1>
          <p className="text-muted-foreground text-sm">开启您的 AI 之旅，选择适合您的使用方式</p>
        </div>

        {/* 主要行动点 - 垂直排列 */}
        <div className="space-y-4">
          {/* 创建企业 */}
          <button
            onClick={() => setShowCreateDialog(true)}
            disabled={loading}
            className="w-full group relative bg-white rounded-xl p-5 text-left border-2 border-border hover:border-primary hover:shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
              >
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground mb-0.5">创建企业</h2>
                <p className="text-muted-foreground text-xs">
                  适合团队协作，可邀请成员、分配权限
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* 分割线 */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gradient-to-br from-slate-50 to-slate-100 px-3 text-xs text-muted-foreground">或</span>
            </div>
          </div>

          {/* 个人模式 */}
          <button
            onClick={handlePersonalSpace}
            disabled={loading}
            className="w-full group relative bg-white rounded-xl p-5 text-left border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all duration-300 disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <User className="w-6 h-6 text-slate-600 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground mb-0.5">个人模式</h2>
                <p className="text-muted-foreground text-xs">
                  适合独立开发者，快速开始使用
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-center text-muted-foreground text-xs mt-6">
          后续可以在设置中随时切换或创建新的空间
        </p>
      </div>

      {/* 创建企业对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              创建企业
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="enterprise-name">
                企业名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="enterprise-name"
                placeholder="请输入企业名称"
                value={enterpriseName}
                onChange={(e) => setEnterpriseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateEnterprise()}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              创建后您将成为企业管理员，可以邀请团队成员加入
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={loading}>
              取消
            </Button>
            <Button 
              onClick={handleCreateEnterprise} 
              disabled={loading || !enterpriseName.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? "创建中..." : "创建并进入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
