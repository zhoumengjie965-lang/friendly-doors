import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentPhone, getUserEnterprises, clearCurrentPhone, createEnterprise, joinByCode, createPersonalWorkspace, getPersonalWorkspace } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import EnterpriseInfo from "@/pages/EnterpriseInfo";
import AccountBalance from "@/pages/AccountBalance";
import ExpenseBills from "@/pages/ExpenseBills";
import DeptManagement from "@/pages/DeptManagement";
import MemberManagement from "@/pages/MemberManagement";
import Profile from "@/pages/Profile";
import ApiKeys from "@/pages/ApiKeys";
import ResourceStats from "@/pages/ResourceStats";
import CallLogs from "@/pages/CallLogs";
import Models from "@/pages/Models";
import {
  Building2, LogOut, ChevronDown,
  ChevronRight, Check, Plus, UserCircle
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
  const [showPersonalWelcomeToast, setShowPersonalWelcomeToast] = useState(false);

  // user menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [switchMenuOpen, setSwitchMenuOpen] = useState(false);
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
    console.log("[Debug] members raw data:", members);
    console.log("[Debug] phone:", phone);
    const list = (members as EnterpriseItem[])
      .filter(m => m.enterprises)
      .map(m => ({ enterprise: m.enterprises!, role: m.role, org: m.organizations || null }));
    console.log("[Debug] enterprises list:", list);
    setEnterprises(list);

    // Also load user name from mock data
    const { getMockData } = await import("@/lib/mockData");
    const mockData = getMockData();
    const user = mockData.users.find(u => u.phone === phone);
    if (user?.name) setUserName(user.name);

    if (list.length === 0) {
      // 无企业，检查是否有个人空间
      let personalWorkspace = getPersonalWorkspace(phone);
      if (!personalWorkspace) {
        // 全新用户：自动创建个人空间
        personalWorkspace = await createPersonalWorkspace(phone);
        setShowPersonalWelcomeToast(true);
      }
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
      console.log("[CreateEnterprise] Starting...", { name: newEnterpriseName.trim(), phone });
      const ent = await createEnterprise(newEnterpriseName.trim(), phone);
      console.log("[CreateEnterprise] Success:", ent);
      toast({ title: "企业创建成功" });
      setNewEnterpriseName("");
      setShowCreateEnterprise(false);
      await loadEnterprises();
      selectEnterprise(ent as Enterprise, "admin");
    } catch (e: any) {
      console.error("[CreateEnterprise] Error:", e);
      toast({ title: "创建失败", description: e?.message || "请检查网络连接", variant: "destructive" });
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
            <button
              onClick={loadEnterprises}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              刷新数据
            </button>
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
                <span className={`text-xs px-2 py-1 rounded-full ${
                  r === "admin" 
                    ? "bg-purple-100 text-purple-700" 
                    : r === "org_admin" 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-gray-100 text-gray-600"
                }`}>
                  {r === "admin" ? "企业管理员" : r === "org_admin" ? "部门管理员" : "成员"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Role label helper ──
  const roleLabel = (r: string) => r === "admin" ? "管理员" : r === "org_admin" ? "部门管理员" : "普通成员";

  // ── Identity description ──
  const identityDesc = enterprise
    ? `当前企业：${enterprise.name}`
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
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm text-foreground leading-tight">用户展示名</span>
          <span className="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0 mt-0.5">
            {enterprise ? "企业模式" : "个人模式"}
          </span>
        </div>
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
              <p className="text-sm font-semibold text-foreground truncate">用户展示名</p>
              <p className="text-xs text-muted-foreground truncate">用户ID：18217795009</p>
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
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <WorkspaceSidebar
            enterpriseName="个人空间"
            enterpriseCode=""
            isPersonalMode={true}
          />
          <main className="flex-1 flex flex-col">
            {/* 持久 toast 提示 */}
            {showPersonalWelcomeToast && (
              <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-500/90 to-purple-500/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <UserCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm">
                    欢迎进入个人空间！如需团队协作，请点击右上角<span className="font-semibold">切换为企业模式</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowPersonalWelcomeToast(false)}
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {/* Top bar */}
            <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="h-5 w-px bg-border" />
              <span className="text-sm text-muted-foreground">AI 网关平台</span>
              <span className="text-sm text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">个人空间</span>
              <div className="flex-1" />
              <UserMenu />
            </header>

            {/* Content */}
            <div className="flex-1 bg-background overflow-auto">
              {location.pathname === "/workspace/models" || location.pathname === "/workspace" ? (
                <Models />
              ) : location.pathname === "/workspace/keys" ? (
                <ApiKeys enterprise={null} role="member" />
              ) : location.pathname === "/workspace/stats" ? (
                <ResourceStats enterprise={null} role="member" />
              ) : location.pathname === "/workspace/logs" ? (
                <CallLogs enterprise={null} role="member" currentOrg={null} orgList={[]} />
              ) : location.pathname === "/workspace/balance" ? (
                <AccountBalance enterprise={null} role="member" />
              ) : location.pathname === "/workspace/profile" ? (
                <Profile />
              ) : (
                <Models />
              )}
            </div>
          </main>
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
      </SidebarProvider>
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
            ) : location.pathname === "/workspace/enterprise/bills" ? (
              <ExpenseBills enterprise={enterprise} role={role} />
            ) : location.pathname.startsWith("/workspace/dept") ? (
              <DeptManagement enterprise={enterprise} role={role} />
            ) : location.pathname === "/workspace/members" ? (
              <MemberManagement />
            ) : location.pathname === "/workspace/models" || location.pathname === "/workspace" ? (
              <Models />
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
              <Models />
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
