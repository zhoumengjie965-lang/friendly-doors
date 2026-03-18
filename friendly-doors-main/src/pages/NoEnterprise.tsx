import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentPhone, joinByCode, createEnterprise } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, UserPlus, User, LogOut } from "lucide-react";
import { clearCurrentPhone } from "@/lib/auth";

export default function NoEnterprise() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const phone = getCurrentPhone()!;

  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [enterpriseName, setEnterpriseName] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [createError, setCreateError] = useState("");

  const handleJoin = async () => {
    if (!inviteCode.trim()) { setJoinError("请输入邀请码"); return; }
    setLoading(true);
    setJoinError("");
    try {
      await joinByCode(inviteCode.trim(), phone);
      toast({ title: "成功加入企业" });
      setJoinOpen(false);
      navigate("/workspace");
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!enterpriseName.trim()) { setCreateError("请输入企业名称"); return; }
    setLoading(true);
    setCreateError("");
    try {
      await createEnterprise(enterpriseName.trim(), phone);
      toast({ title: "企业创建成功" });
      setCreateOpen(false);
      navigate("/workspace");
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearCurrentPhone();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">您尚未加入任何企业</h1>
          <p className="text-muted-foreground text-sm mt-2">
            通过以下方式开始使用 AI 网关平台
          </p>
        </div>

        <div className="space-y-3">
          {/* Join */}
          <button
            onClick={() => setJoinOpen(true)}
            className="w-full flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">加入企业</p>
              <p className="text-xs text-muted-foreground mt-0.5">使用邀请码或邀请链接加入已有企业</p>
            </div>
          </button>

          {/* Create */}
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">创建企业</p>
              <p className="text-xs text-muted-foreground mt-0.5">创建新企业并担任管理员（最多3个）</p>
            </div>
          </button>

          {/* Personal workspace - disabled */}
          <button
            disabled
            className="w-full flex items-center gap-4 p-5 bg-muted/50 border border-border rounded-xl opacity-50 cursor-not-allowed text-left"
          >
            <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">个人工作区</p>
              <p className="text-xs text-muted-foreground mt-0.5">即将开放，敬请期待</p>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录（{phone}）
          </button>
        </div>
      </div>

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>加入企业</DialogTitle>
            <DialogDescription>输入企业管理员提供的邀请码</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="请输入邀请码（如：ABC123XY）"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value); setJoinError(""); }}
              className="uppercase"
            />
            {joinError && <p className="text-xs text-destructive">{joinError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>取消</Button>
            <Button onClick={handleJoin} disabled={loading}
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              {loading ? "验证中..." : "确认加入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建企业</DialogTitle>
            <DialogDescription>创建后您将自动成为企业管理员</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="请输入企业名称"
              value={enterpriseName}
              onChange={(e) => { setEnterpriseName(e.target.value); setCreateError(""); }}
            />
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={loading}
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              {loading ? "创建中..." : "创建企业"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
