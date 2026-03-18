import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentPhone, getUserEnterprises, clearCurrentPhone, createEnterprise, joinByCode } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import EnterpriseInfo from "@/pages/EnterpriseInfo";
import AccountBalance from "@/pages/AccountBalance";
import DeptManagement from "@/pages/DeptManagement";
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

interface OrgInfo {
  id: string;
  name: string;
}

interface EnterpriseItem {
  enterprises: Enterprise | null;
  organizations: OrgInfo | null;
  role: string;
}

interface EnterpriseEntry {
  enterprise: Enterprise;
  role: string;
  org: OrgInfo | null;
}

export default function Workspace() {
  const [enterprises, setEnterprises] = useState<EnterpriseEntry[]>([]);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [currentOrg, setCurrentOrg] = useState<OrgInfo | null>(null);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // user menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [switchMenuOpen, setSwitchMenuOpen] = useState(false);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const spaceMenuRef = useRef<HTMLDivElement>(null);
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

  const selectEnterprise = (ent: Enterprise, r: string, org: OrgInfo | null = null) => {
    setEnterprise(ent);
    setRole(r);
    setCurrentOrg(org);
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
      if (spaceMenuRef.current && !spaceMenuRef.current.contains(e.target as Node)) {
        setSpaceMenuOpen(false);
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
      .map(m => ({ enterprise: m.enterprises!, role: m.role, org: m.organizations || null }));
    setEnterprises(list);

    // Also load user name
    const { data: userData } = await (await import("@/integrations/supabase/client")).supabase
      .from("users").select("name").eq("phone", phone).maybeSingle();
    if (userData?.name) setUserName(userData.name);

    if (list.length === 0) {
      setEnterprise(null);
      setLoading(false);
      return;
    }
    if (list.length === 1) {
      setEnterprise(list[0].enterprise);
      setRole(list[0].role);
      setCurrentOrg(list[0].org);
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
      setCurrentOrg(found.org);
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
            {enterprises.map(({ enterprise: ent, role: r, org }) => (
              <button
                key={ent.id}
                onClick={() => selectEnterprise(ent, r, org)}
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
                  {r === "admin" ? "管理员" : r === "org_admin" ? "部门管理员" : "成员"}
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

  // ── Role label helper ──
  const roleLabel = (r: string) => r === "admin" ? "管理员" : r === "org_admin" ? "部门管理员" : "普通成员";

  // ── Identity description ──
  const identityDesc = enterprise
    ? [enterprise.name, currentOrg?.name, roleLabel(role)].filter(Boolean).join(" · ")
    : null;

  // ── Avatar initials ──
  const avatarText = userName ? userName.slice(0, 1) : phone?.slice(-2) ?? "?";






  const UserMenu = () => (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => { setUserMenuOpen(v => !v); setSwitchMenuOpen(false); }}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
          {avatarText}
        </div>
        <span className="text-sm text-foreground hidden sm:block">{userName || phone}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {userMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-visible">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              {avatarText}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{userName || `用户${phone?.slice(-4)}`}</p>
              <p className="text-xs text-muted-foreground truncate">{phone}</p>
              {identityDesc && (
                <p className="text-[11px] text-primary bg-primary/8 rounded px-1.5 py-0.5 mt-1 truncate">{identityDesc}</p>
              )}
            </div>
          </div>

          {/* Switch space — flyout to the left */}
          <div className="relative">
            <button
              onClick={() => setSwitchMenuOpen(v => !v)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${switchMenuOpen ? "bg-muted text-foreground" : "text-foreground hover:bg-muted"}`}
            >
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-left">切换空间</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {switchMenuOpen && (
              <div className="absolute right-full top-0 mr-2 w-52 bg-popover border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                {/* Personal space */}
                <button
                  onClick={() => { setEnterprise(null); setCurrentOrg(null); setRole("member"); localStorage.removeItem(LAST_ENTERPRISE_KEY); setUserMenuOpen(false); setSwitchMenuOpen(false); navigate("/workspace"); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                    !enterprise ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <UserCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">个人空间</span>
                  {!enterprise && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
                {/* Enterprise list */}
                {enterprises.length > 0 && (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">我的企业</p>
                    </div>
                    {enterprises.map(({ enterprise: ent, role: r, org }) => (
                      <button
                        key={ent.id}
                        onClick={() => { selectEnterprise(ent, r, org); setSwitchMenuOpen(false); navigate("/workspace"); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                          enterprise?.id === ent.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
                          <Building2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="truncate font-medium text-[13px]">{ent.name}</div>
                          <div className="text-[11px] text-muted-foreground">{roleLabel(r)}</div>
                        </div>
                        {enterprise?.id === ent.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </>
                )}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => { setShowCreateEnterprise(true); setUserMenuOpen(false); setSwitchMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg border border-dashed border-border flex items-center justify-center shrink-0">
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span>创建企业</span>
                  </button>
                </div>
              </div>
            )}
          </div>

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

  // ── Onboarding (no enterprise) ──
  if (!enterprise) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Icon + Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">欢迎来到 AI 网关平台</h1>
            <p className="text-sm text-muted-foreground mt-2">开启您的 AI 之旅，选择适合您的使用方式</p>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {/* Create Enterprise */}
            <button
              onClick={() => setShowCreateEnterprise(true)}
              className="w-full flex items-center gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/60 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">创建企业</p>
                <p className="text-xs text-muted-foreground mt-0.5">适合团队协作，可邀请成员、分配权限</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">或</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Personal Mode */}
            <button
              disabled
              className="w-full flex items-center gap-4 p-5 bg-card border border-dashed border-border rounded-xl text-left opacity-60 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">个人模式</p>
                <p className="text-xs text-muted-foreground mt-0.5">适合独立开发者，快速开始使用</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            后续可以在设置中随时切换或创建新的空间
          </p>
        </div>

        {/* Create Enterprise Dialog */}
        {showCreateEnterprise && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                  </svg>
                  <h2 className="text-base font-semibold text-foreground">创建企业</h2>
                </div>
                <button onClick={() => { setShowCreateEnterprise(false); setNewEnterpriseName(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  企业名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="请输入企业名称"
                  value={newEnterpriseName}
                  onChange={e => setNewEnterpriseName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateEnterprise()}
                  className="focus-visible:ring-primary"
                  autoFocus
                />
                <p className="text-xs text-primary">创建后您将成为企业管理员，可以邀请团队成员加入</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowCreateEnterprise(false); setNewEnterpriseName(""); }} disabled={actionLoading}>
                  取消
                </Button>
                <Button
                  className="flex-1 text-white"
                  style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                  onClick={handleCreateEnterprise}
                  disabled={actionLoading || !newEnterpriseName.trim()}
                >
                  {actionLoading ? "创建中..." : "创建并进入"}
                </Button>
              </div>
            </div>
          </div>
        )}
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
            ) : location.pathname === "/workspace/enterprise/balance" ? (
              <AccountBalance enterprise={enterprise} role={role} />
            ) : location.pathname.startsWith("/workspace/dept") ? (
              <DeptManagement enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/keys" ? (
              <ApiKeys enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/stats" ? (
              <ResourceStats enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/logs" ? (
              <CallLogs
                enterprise={enterprise}
                role={role}
                currentOrg={currentOrg}
                orgList={enterprises
                  .filter(e => e.enterprise.id === enterprise.id && e.role === "org_admin" && e.org)
                  .map(e => e.org!)}
              />
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
