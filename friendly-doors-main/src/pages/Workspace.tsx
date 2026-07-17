import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentPhone, getUserEnterprises, clearCurrentPhone, createEnterprise, joinByCode, getPersonalWorkspace } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import PersonalSidebar from "@/components/PersonalSidebar";
import EnterpriseInfo from "@/pages/EnterpriseInfo";
import OrgManagement from "@/pages/OrgManagement";
import AccountBalance from "@/pages/AccountBalance";
import OrgGovernance from "@/pages/OrgGovernance";
import Profile from "@/pages/Profile";
import ApiKeys from "@/pages/ApiKeys";
import ResourceStats from "@/pages/ResourceStats";
import CallLogs from "@/pages/CallLogs";
import ModelMarket from "@/pages/ModelMarket";
import {
  Building2, Users, Key, Link, TrendingUp, LogOut, ChevronDown,
  ChevronRight, Copy, Check, Plus, UserPlus, UserCircle, X, Bell,
  Wallet, BarChart3, LayoutGrid
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LAST_ENTERPRISE_KEY = "ai_gateway_last_enterprise";
const WS_TYPE_KEY = "ACT_WS_TYPE";
const SHOW_SWITCH_MODAL_KEY = "SHOW_SPACE_SWITCH_MODAL";
const NEW_ENT_KEY = "NEW_ENTERPRISE_IDS";
const SHOW_INVITATION_MODAL_KEY = "SHOW_INVITATION_MODAL";
const PENDING_INVITATIONS_KEY = "PENDING_INVITATIONS";
const INVITATION_DISMISSED_KEY = "INVITATION_DISMISSED";

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
  created_at?: string;
}

interface EnterpriseEntry {
  enterprise: Enterprise;
  role: string;
  org: OrgInfo | null;
}

interface NewEnterprise {
  id: string;
  name: string;
  role: string;
}

export default function Workspace() {
  const [enterprises, setEnterprises] = useState<EnterpriseEntry[]>([]);
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [currentOrg, setCurrentOrg] = useState<OrgInfo | null>(null);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isPersonal, setIsPersonal] = useState(false);
  const [personalWorkspace, setPersonalWorkspace] = useState<any>(null);

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

  // 激活提醒弹窗
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [newEnterprises, setNewEnterprises] = useState<NewEnterprise[]>([]);

  // 邀请激活弹窗
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showInvitationAlert, setShowInvitationAlert] = useState(false);
  const [activatingInvitation, setActivatingInvitation] = useState<string | null>(null);

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
    localStorage.setItem(WS_TYPE_KEY, "enterprise");
    localStorage.setItem("ACT_WS_ID", ent.id);
    localStorage.setItem("ai_gateway_last_workspace_type", "enterprise");
    setUserMenuOpen(false);
    setSwitchMenuOpen(false);
  };

  // 切换到新企业
  const handleSwitchToEnterprise = (ent: NewEnterprise) => {
    const found = enterprises.find(e => e.enterprise.id === ent.id);
    if (found) {
      selectEnterprise(found.enterprise, found.role, found.org);
      setShowActivationModal(false);
      toast({ title: `已切换到 ${ent.name}` });
    }
  };

  // 激活邀请
  const handleActivateInvitation = async (invitation: any) => {
    if (!phone) return;
    setActivatingInvitation(invitation.id);
    
    try {
      const { acceptInvitation } = await import("@/lib/auth");
      await acceptInvitation(invitation.id, phone);
      
      toast({ title: "激活成功", description: `您已加入 ${invitation.enterprises?.name || "企业"}` });
      
      // 清除邀请数据
      localStorage.removeItem(PENDING_INVITATIONS_KEY);
      sessionStorage.removeItem(INVITATION_DISMISSED_KEY);
      setShowInvitationModal(false);
      setShowInvitationAlert(false);
      
      // 刷新企业列表并切换到新企业
      await loadEnterprises();
      
      // 如果有新加入的企业，切换到该企业
      const { data: members } = await (await import("@/integrations/supabase/client")).supabase
        .from("members")
        .select("*, enterprises(id, name, enterprise_code), organizations(id, name)")
        .eq("user_phone", phone)
        .eq("enterprise_id", invitation.enterprise_id)
        .maybeSingle();
      
      if (members?.enterprises) {
        selectEnterprise(
          members.enterprises as Enterprise,
          members.role,
          members.organizations || null
        );
      }
    } catch (err: any) {
      toast({ title: "激活失败", description: err.message, variant: "destructive" });
    } finally {
      setActivatingInvitation(null);
    }
  };

  // 稍后处理邀请
  const handleDismissInvitation = () => {
    setShowInvitationModal(false);
    sessionStorage.setItem(INVITATION_DISMISSED_KEY, "true");
    setShowInvitationAlert(true);
  };

  // 重新打开邀请弹窗
  const handleReopenInvitationModal = () => {
    setShowInvitationAlert(false);
    setShowInvitationModal(true);
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
    
    // 获取个人空间
    const pws = getPersonalWorkspace(phone);
    setPersonalWorkspace(pws);

    const members = await getUserEnterprises(phone);
    const list = (members as EnterpriseItem[])
      .filter(m => m.enterprises)
      .map(m => ({ enterprise: m.enterprises!, role: m.role, org: m.organizations || null }));
    setEnterprises(list);

    // Also load user name
    const { data: userData } = await (await import("@/integrations/supabase/client")).supabase
      .from("users").select("name").eq("phone", phone).maybeSingle();
    if (userData?.name) setUserName(userData.name);

    // 读取 ACT_WS_TYPE 标记
    const wsType = localStorage.getItem(WS_TYPE_KEY);
    
    if (wsType === "personal") {
      // 显示个人空间
      setIsPersonal(true);
      setEnterprise(null);
      setCurrentOrg(null);
      setRole("member");
      
      // 检查是否需要显示邀请激活弹窗
      const showInvitationModalFlag = localStorage.getItem(SHOW_INVITATION_MODAL_KEY);
      const dismissed = sessionStorage.getItem(INVITATION_DISMISSED_KEY);
      
      if (showInvitationModalFlag === "true" && !dismissed) {
        const invData = localStorage.getItem(PENDING_INVITATIONS_KEY);
        if (invData) {
          try {
            const parsed = JSON.parse(invData);
            setPendingInvitations(parsed);
            setShowInvitationModal(true);
          } catch (e) {
            console.error("Failed to parse invitations", e);
          }
        }
        // 清除弹窗标记，但保留数据
        localStorage.removeItem(SHOW_INVITATION_MODAL_KEY);
      } else if (showInvitationModalFlag === "true" && dismissed) {
        // 用户已选择"稍后"，显示顶部通知条
        const invData = localStorage.getItem(PENDING_INVITATIONS_KEY);
        if (invData) {
          try {
            const parsed = JSON.parse(invData);
            setPendingInvitations(parsed);
            setShowInvitationAlert(true);
          } catch (e) {
            console.error("Failed to parse invitations", e);
          }
        }
        localStorage.removeItem(SHOW_INVITATION_MODAL_KEY);
      }
      
      // 检查是否需要显示切换弹窗
      const showModal = localStorage.getItem(SHOW_SWITCH_MODAL_KEY);
      if (showModal === "true") {
        const newEntData = localStorage.getItem(NEW_ENT_KEY);
        if (newEntData) {
          try {
            const parsed = JSON.parse(newEntData) as NewEnterprise[];
            setNewEnterprises(parsed);
            setShowActivationModal(true);
          } catch (e) {
            console.error("Failed to parse new enterprises", e);
          }
        }
        // 清除标记，避免重复显示
        localStorage.removeItem(SHOW_SWITCH_MODAL_KEY);
        localStorage.removeItem(NEW_ENT_KEY);
      }
      
      setLoading(false);
      return;
    }

    // 企业空间模式
    setIsPersonal(false);
    const wsId = localStorage.getItem("ACT_WS_ID");

    if (list.length === 0) {
      setEnterprise(null);
      setLoading(false);
      return;
    }
    
    // 如果有指定的企业ID，优先使用
    if (wsId) {
      const found = list.find(e => e.enterprise.id === wsId);
      if (found) {
        setEnterprise(found.enterprise);
        setRole(found.role);
        setCurrentOrg(found.org);
        localStorage.setItem(LAST_ENTERPRISE_KEY, found.enterprise.id);
        setLoading(false);
        return;
      }
    }
    
    if (list.length === 1) {
      setEnterprise(list[0].enterprise);
      setRole(list[0].role);
      setCurrentOrg(list[0].org);
      localStorage.setItem(LAST_ENTERPRISE_KEY, list[0].enterprise.id);
      localStorage.setItem(WS_TYPE_KEY, "enterprise");
      localStorage.setItem("ACT_WS_ID", list[0].enterprise.id);
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

  // ── Role label helper ──
  const roleLabel = (r: string) => r === "admin" ? "管理员" : r === "org_admin" ? "组织管理员" : "普通成员";

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
                  onClick={() => { 
                    setEnterprise(null); 
                    setCurrentOrg(null); 
                    setRole("member"); 
                    setIsPersonal(true);
                    localStorage.removeItem(LAST_ENTERPRISE_KEY); 
                    localStorage.setItem(WS_TYPE_KEY, "personal");
                    localStorage.setItem("ai_gateway_last_workspace_type", "personal");
                    setUserMenuOpen(false); 
                    setSwitchMenuOpen(false); 
                    navigate("/workspace"); 
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                    isPersonal ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <UserCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">个人空间</span>
                  {isPersonal && <Check className="w-3.5 h-3.5 shrink-0" />}
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
                        onClick={() => { 
                          setIsPersonal(false);
                          selectEnterprise(ent, r, org); 
                          localStorage.setItem(WS_TYPE_KEY, "enterprise");
                          localStorage.setItem("ACT_WS_ID", ent.id);
                          localStorage.setItem("ai_gateway_last_workspace_type", "enterprise");
                          setSwitchMenuOpen(false); 
                          navigate("/workspace"); 
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                          enterprise?.id === ent.id && !isPersonal ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
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
                        {enterprise?.id === ent.id && !isPersonal && <Check className="w-3.5 h-3.5 shrink-0" />}
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

  // ── Personal space (no enterprise) ──
  if (!enterprise) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <PersonalSidebar userName={userName} phone={phone} />
          <main className="flex-1 flex flex-col bg-background">
            {/* 顶部邀请通知条 */}
            {showInvitationAlert && pendingInvitations.length > 0 && (
              <div className="bg-blue-500 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5" />
                  <span className="text-sm">
                    您有 {pendingInvitations.length} 个待激活的企业邀请
                  </span>
                </div>
                <button
                  onClick={handleReopenInvitationModal}
                  className="text-sm font-medium underline hover:no-underline"
                >
                  查看详情
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
            <div className="flex-1 p-6 bg-background overflow-auto">
              {location.pathname === "/workspace/models" ? (
                <ModelMarket />
              ) : location.pathname === "/workspace/keys" ? (
                <ApiKeys enterprise={null} role="personal" />
              ) : location.pathname === "/workspace/stats" ? (
                <ResourceStats enterprise={null} role="personal" />
              ) : location.pathname === "/workspace/logs" ? (
                <CallLogs enterprise={null} role="personal" currentOrg={null} orgList={[]} />
              ) : location.pathname === "/workspace/balance" ? (
                <PersonalBalance />
              ) : location.pathname === "/workspace/profile" ? (
                <Profile enterprise={null} currentOrg={null} role="personal" />
              ) : (
                <PersonalHome userName={userName} phone={phone} />
              )}
            </div>
          </main>
        </div>

        {/* Modals */}
        {showCreateEnterprise && <EnterpriseModal title="创建企业" placeholder="请输入企业名称" value={newEnterpriseName} onChange={setNewEnterpriseName} onConfirm={handleCreateEnterprise} onClose={() => { setShowCreateEnterprise(false); setNewEnterpriseName(""); }} loading={actionLoading} confirmText="创建" />}
        {showJoinEnterprise && <EnterpriseModal title="加入企业" placeholder="请输入邀请码" value={joinCode} onChange={setJoinCode} onConfirm={handleJoinEnterprise} onClose={() => { setShowJoinEnterprise(false); setJoinCode(""); }} loading={actionLoading} confirmText="加入" />}
        
        {/* 激活提醒弹窗 - 非阻断式 */}
        {showActivationModal && newEnterprises.length > 0 && (
          <ActivationReminderModal 
            enterprises={newEnterprises}
            onSwitch={handleSwitchToEnterprise}
            onLater={() => setShowActivationModal(false)}
          />
        )}
        
        {/* 邀请激活弹窗 - 居中 */}
        {showInvitationModal && pendingInvitations.length > 0 && (
          <InvitationActivationModal
            invitations={pendingInvitations}
            onActivate={handleActivateInvitation}
            onLater={handleDismissInvitation}
            activatingId={activatingInvitation}
          />
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
            {location.pathname === "/workspace/models" ? (
              <ModelMarket />
            ) : location.pathname === "/workspace/enterprise/info" ? (
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
              <CallLogs
                enterprise={enterprise}
                role={role}
                currentOrg={currentOrg}
                orgList={enterprises
                  .filter(e => e.enterprise.id === enterprise.id && e.role === "org_admin" && e.org)
                  .map(e => e.org!)}
              />
            ) : location.pathname === "/workspace/profile" ? (
              <Profile enterprise={enterprise} currentOrg={currentOrg} role={role} />
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
      
      {/* 激活提醒弹窗 - 非阻断式 */}
      {showActivationModal && newEnterprises.length > 0 && (
        <ActivationReminderModal 
          enterprises={newEnterprises}
          onSwitch={handleSwitchToEnterprise}
          onLater={() => setShowActivationModal(false)}
        />
      )}
    </SidebarProvider>
  );
}

// ── Activation Reminder Modal (非阻断式) ──
function ActivationReminderModal({ 
  enterprises, 
  onSwitch, 
  onLater 
}: { 
  enterprises: NewEnterprise[]; 
  onSwitch: (ent: NewEnterprise) => void;
  onLater: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-[360px] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">企业邀请提醒</span>
          </div>
          <button 
            onClick={onLater}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-3">
            您已被邀请加入以下企业，是否立即切换？
          </p>
          
          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {enterprises.map((ent) => (
              <div 
                key={ent.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    角色：{ent.role === "admin" ? "管理员" : ent.role === "org_admin" ? "组织管理员" : "成员"}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => onSwitch(ent)}
                  className="shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-xs px-3"
                >
                  切换
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            共 {enterprises.length} 个新企业
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLater}
            className="text-xs h-8"
          >
            稍后处理
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Invitation Activation Modal (居中弹窗) ──
function InvitationActivationModal({ 
  invitations, 
  onActivate, 
  onLater,
  activatingId
}: { 
  invitations: any[]; 
  onActivate: (inv: any) => void;
  onLater: () => void;
  activatingId: string | null;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            发现待激活的企业邀请
          </h2>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            激活后即可使用企业提供的模型资源与配额
          </p>
          
          <div className="space-y-3 max-h-[240px] overflow-y-auto">
            {invitations.map((inv) => (
              <div 
                key={inv.id}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}
                >
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {inv.enterprises?.name || "企业邀请"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    管理员 {inv.inviter_phone || "未知"} 邀请您加入
                  </p>
                  {inv.expires_at && (
                    <p className="text-xs text-orange-500 mt-1">
                      过期时间：{new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex flex-col gap-3">
          <Button 
            onClick={() => onActivate(invitations[0])}
            disabled={activatingId !== null}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            {activatingId === invitations[0]?.id ? "激活中..." : "现在激活并进入"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onLater}
            disabled={activatingId !== null}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            稍后激活，先去个人空间
          </Button>
        </div>
      </div>
    </div>
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

// ── Personal Home Page ──
function PersonalHome({ userName, phone }: { userName?: string | null; phone?: string | null }) {
  const navigate = useNavigate();
  const stats = [
    { label: "今日调用", value: "—", icon: TrendingUp, color: "hsl(224,76%,48%)" },
    { label: "API 密钥", value: "—", icon: Key, color: "hsl(262,60%,58%)" },
    { label: "充值余额", value: "¥0.00", icon: Wallet, color: "hsl(142,70%,45%)" },
    { label: "本月用量", value: "—", icon: BarChart3, color: "hsl(32,90%,55%)" },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">个人空间</h1>
        <p className="text-muted-foreground mt-1">
          欢迎回来，<span className="font-medium text-foreground">{userName || phone}</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6 bg-gradient-to-br from-blue-500 to-purple-500">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">当前模式</p>
            <h2 className="text-2xl font-bold text-white">个人版</h2>
            <p className="text-white/60 text-sm mt-0.5">适用于个人开发者和小型项目</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-3">快速开始</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: "创建 API 密钥", desc: "生成访问凭证接入 AI 服务", icon: Key, onClick: () => navigate("/workspace/keys") },
            { title: "查看模型广场", desc: "浏览可用的 AI 模型", icon: LayoutGrid, onClick: () => navigate("/workspace/models") },
            { title: "余额充值", desc: "为账户充值以使用服务", icon: Wallet, onClick: () => navigate("/workspace/balance") },
          ].map((item) => (
            <div key={item.title}
              onClick={item.onClick}
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
  );
}

// ── Personal Balance Page ──
function PersonalBalance() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">余额充值</h1>
        <p className="text-muted-foreground mt-1">管理您的充值余额</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <p className="text-sm text-muted-foreground mb-2">当前余额</p>
        <p className="text-4xl font-bold text-foreground">¥0.00</p>
        <div className="mt-4 flex gap-3">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
            <Wallet className="w-4 h-4 mr-2" />立即充值
          </Button>
          <Button variant="outline">查看账单</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">充值说明</h3>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>充值金额将立即到账</li>
          <li>支持支付宝、微信支付</li>
          <li>充值后可用于所有 API 调用</li>
          <li>余额不足时请及时充值</li>
        </ul>
      </div>
    </div>
  );
}
