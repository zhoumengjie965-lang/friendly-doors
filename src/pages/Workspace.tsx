import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentPhone, getUserEnterprises, clearCurrentPhone, createEnterprise, joinByCode } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import EnterpriseInfo from "@/pages/EnterpriseInfo";
import OrgManagement from "@/pages/OrgManagement";
import AccountBalance from "@/pages/AccountBalance";
import OrgGovernance from "@/pages/OrgGovernance";
import Profile from "@/pages/Profile";
import ApiKeys from "@/pages/ApiKeys";
import ResourceStats from "@/pages/ResourceStats";
import CallLogs from "@/pages/CallLogs";
import {
  Building2, Users, Key, Link, TrendingUp, LogOut, ChevronDown,
  ChevronRight, Copy, Check, Plus, UserPlus, UserCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LAST_ENTERPRISE_KEY = "ai_gateway_last_enterprise";

interface Enterprise {
  id: string;
  name: string;
  enterprise_code: string;
}

interface EnterpriseItem {
  enterprises: Enterprise | null;
  role: string;
}

export default function Workspace() {
  const [enterprises, setEnterprises] = useState<{ enterprise: Enterprise; role: string }[]>([]);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  // user menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [switchMenuOpen, setSwitchMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // modals
  const [showCreateEnterprise, setShowCreateEnterprise] = useState(false);
  const [showJoinEnterprise, setShowJoinEnterprise] = useState(false);
  const [newEnterpriseName, setNewEnterpriseName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const phone = getCurrentPhone();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    clearCurrentPhone();
    localStorage.removeItem(LAST_ENTERPRISE_KEY);
    navigate("/login");
  };

  const selectEnterprise = (ent: Enterprise, r: string) => {
    setEnterprise(ent);
    setRole(r);
    setShowSelector(false);
    localStorage.setItem(LAST_ENTERPRISE_KEY, ent.id);
    setUserMenuOpen(false);
    setSwitchMenuOpen(false);
  };

  const handleCopyCode = async () => {
    if (!enterprise) return;
    await navigator.clipboard.writeText(enterprise.enterprise_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
        setSwitchMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadEnterprises = async () => {
    if (!phone) { navigate("/login"); return; }
    const members = await getUserEnterprises(phone);
    const list = (members as EnterpriseItem[])
      .filter(m => m.enterprises)
      .map(m => ({ enterprise: m.enterprises!, role: m.role }));
    setEnterprises(list);

    if (list.length === 0) {
      setEnterprise(null);
      setLoading(false);
      return;
    }
    if (list.length === 1) {
      setEnterprise(list[0].enterprise);
      setRole(list[0].role);
      localStorage.setItem(LAST_ENTERPRISE_KEY, list[0].enterprise.id);
      setLoading(false);
      return;
    }
    // multiple: try localStorage
    const lastId = localStorage.getItem(LAST_ENTERPRISE_KEY);
    const found = list.find(e => e.enterprise.id === lastId);
    if (found) {
      setEnterprise(found.enterprise);
      setRole(found.role);
      setLoading(false);
    } else {
      setShowSelector(true);
      setLoading(false);
    }
  };

  useEffect(() => { loadEnterprises(); }, []);

  const handleCreateEnterprise = async () => {
    if (!newEnterpriseName.trim() || !phone) return;
    setActionLoading(true);
    try {
      const ent = await createEnterprise(newEnterpriseName.trim(), phone);
      toast({ title: "企业创建成功" });
      setNewEnterpriseName("");
      setShowCreateEnterprise(false);
      await loadEnterprises();
      selectEnterprise(ent as Enterprise, "admin");
    } catch (e: any) {
      toast({ title: "创建失败", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinEnterprise = async () => {
    if (!joinCode.trim() || !phone) return;
    setActionLoading(true);
    try {
      await joinByCode(joinCode.trim(), phone);
      toast({ title: "加入成功" });
      setJoinCode("");
      setShowJoinEnterprise(false);
      await loadEnterprises();
    } catch (e: any) {
      toast({ title: "加入失败", description: e?.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Enterprise selector overlay ──
  if (showSelector) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">选择要进入的企业</h1>
            <p className="text-muted-foreground text-sm mt-1">你拥有多个企业，请选择一个进入</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enterprises.map(({ enterprise: ent, role: r }) => (
              <button
                key={ent.id}
                onClick={() => selectEnterprise(ent, r)}
                className="bg-card border border-border rounded-xl p-6 text-left hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{ent.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{ent.enterprise_code}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {r === "admin" ? "管理员" : r === "org_admin" ? "组织管理员" : "成员"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "成员数量", value: "—", icon: Users, color: "hsl(224,76%,48%)" },
    { label: "API 密钥", value: "—", icon: Key, color: "hsl(262,60%,58%)" },
    { label: "邀请链接", value: "—", icon: Link, color: "hsl(142,70%,45%)" },
    { label: "本月调用", value: "—", icon: TrendingUp, color: "hsl(32,90%,55%)" },
  ];

  // ── User menu dropdown ──
  const UserMenu = () => (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => { setUserMenuOpen(v => !v); setSwitchMenuOpen(false); }}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
          {phone?.slice(-4)}
        </div>
        <span className="text-sm text-foreground hidden sm:block">{phone}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {userMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground">当前账号</p>
            <p className="text-sm font-semibold text-foreground truncate">{phone}</p>
            {enterprise && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground font-mono">{enterprise.enterprise_code}</span>
                <button onClick={handleCopyCode} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copiedCode ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Switch enterprise or create/join */}
          {enterprises.length > 0 ? (
            <div className="relative">
              <button
                onMouseEnter={() => setSwitchMenuOpen(true)}
                onMouseLeave={() => setSwitchMenuOpen(false)}
                onClick={() => setSwitchMenuOpen(v => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left">切换企业</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              {switchMenuOpen && (
                <div
                  className="absolute right-full top-0 mr-1 w-48 bg-popover border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
                  onMouseEnter={() => setSwitchMenuOpen(true)}
                  onMouseLeave={() => setSwitchMenuOpen(false)}
                >
                  {enterprises.map(({ enterprise: ent, role: r }) => (
                    <button
                      key={ent.id}
                      onClick={() => selectEnterprise(ent, r)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        enterprise?.id === ent.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 text-left truncate">{ent.name}</span>
                      {enterprise?.id === ent.id && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { setShowCreateEnterprise(true); setUserMenuOpen(false); setSwitchMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />创建企业
                    </button>
                    <button
                      onClick={() => { setShowJoinEnterprise(true); setUserMenuOpen(false); setSwitchMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />加入企业
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => { setShowCreateEnterprise(true); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />创建企业
              </button>
              <button
                onClick={() => { setShowJoinEnterprise(true); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <UserPlus className="w-4 h-4 text-muted-foreground" />加入企业
              </button>
            </>
          )}

          <div className="border-t border-border">
            <button
              onClick={() => { navigate("/workspace/profile"); setUserMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <UserCircle className="w-4 h-4 text-muted-foreground" />个人信息
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Personal space (no enterprise) ──
  if (!enterprise) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">AI 网关平台</span>
          <div className="flex-1" />
          <UserMenu />
        </header>
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-56px)] p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">欢迎来到 AI 网关平台</h2>
            <p className="text-muted-foreground mb-8">你还没有加入任何企业，创建或加入一个企业开始使用</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCreateEnterprise(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
              >
                <Plus className="w-4 h-4" />创建企业
              </button>
              <button
                onClick={() => setShowJoinEnterprise(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                <UserPlus className="w-4 h-4" />加入企业
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showCreateEnterprise && <EnterpriseModal title="创建企业" placeholder="请输入企业名称" value={newEnterpriseName} onChange={setNewEnterpriseName} onConfirm={handleCreateEnterprise} onClose={() => { setShowCreateEnterprise(false); setNewEnterpriseName(""); }} loading={actionLoading} confirmText="创建" />}
        {showJoinEnterprise && <EnterpriseModal title="加入企业" placeholder="请输入邀请码" value={joinCode} onChange={setJoinCode} onConfirm={handleJoinEnterprise} onClose={() => { setShowJoinEnterprise(false); setJoinCode(""); }} loading={actionLoading} confirmText="加入" />}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <WorkspaceSidebar
          enterpriseName={enterprise.name}
          enterpriseCode={enterprise.enterprise_code}
        />
        <main className="flex-1 flex flex-col">
          {/* Top bar */}
          <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <span className="text-sm text-muted-foreground">AI 网关平台</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium text-foreground">{enterprise.name}</span>
            <div className="flex-1" />
            <UserMenu />
          </header>

          {/* Content */}
          <div className="flex-1 p-6 bg-background overflow-auto">
            {location.pathname === "/workspace/enterprise/info" ? (
              <EnterpriseInfo enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/enterprise/orgs" ? (
              <OrgManagement enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/enterprise/balance" ? (
              <AccountBalance enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/org/governance" ? (
              <OrgGovernance enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/keys" ? (
              <ApiKeys enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/stats" ? (
              <ResourceStats enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/logs" ? (
              <CallLogs enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/profile" ? (
              <Profile />
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-foreground">企业概览</h1>
                  <p className="text-muted-foreground mt-1">
                    欢迎回来，当前角色：
                    <span className="font-medium text-primary ml-1">
                      {role === "admin" ? "管理员" : role === "org_admin" ? "组织管理员" : "成员"}
                    </span>
                  </p>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 mb-6"
                  style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">企业名称</p>
                      <h2 className="text-2xl font-bold text-white">{enterprise.name}</h2>
                      <p className="text-white/60 text-sm font-mono mt-0.5">企业码：{enterprise.enterprise_code}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${stat.color}20` }}>
                          <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-3">快速开始</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { title: "邀请成员", desc: "通过邀请码添加团队成员", icon: Users },
                      { title: "创建 API 密钥", desc: "生成访问凭证接入 AI 服务", icon: Key },
                      { title: "查看文档", desc: "了解如何使用 AI 网关", icon: Link },
                    ].map((item) => (
                      <div key={item.title}
                        className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showCreateEnterprise && <EnterpriseModal title="创建企业" placeholder="请输入企业名称" value={newEnterpriseName} onChange={setNewEnterpriseName} onConfirm={handleCreateEnterprise} onClose={() => { setShowCreateEnterprise(false); setNewEnterpriseName(""); }} loading={actionLoading} confirmText="创建" />}
      {showJoinEnterprise && <EnterpriseModal title="加入企业" placeholder="请输入邀请码" value={joinCode} onChange={setJoinCode} onConfirm={handleJoinEnterprise} onClose={() => { setShowJoinEnterprise(false); setJoinCode(""); }} loading={actionLoading} confirmText="加入" />}
    </SidebarProvider>
  );
}

// ── Simple modal helper ──
function EnterpriseModal({ title, placeholder, value, onChange, onConfirm, onClose, loading, confirmText }: {
  title: string; placeholder: string; value: string; onChange: (v: string) => void;
  onConfirm: () => void; onClose: () => void; loading: boolean; confirmText: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onConfirm()} autoFocus />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>取消</Button>
          <Button className="flex-1" onClick={onConfirm} disabled={loading || !value.trim()}>
            {loading ? "处理中..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
