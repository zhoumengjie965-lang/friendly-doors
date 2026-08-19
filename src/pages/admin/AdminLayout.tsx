import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from "react-router-dom";
import { getAdminSession, adminLogout } from "@/lib/adminAuth";
import {
  Building2,
  Users,
  Ticket,
  BarChart3,
  Cpu,
  LogOut,
  Shield,
  ChevronRight,
  FileText,
  Network,
  Layers,
  Settings,
  Activity,
  LayoutDashboard,
  Key,
  Wallet,
  UserCog,
  Home,
  Globe,
  FileQuestion,
  Info,
  Monitor,
  MessageSquare,
  Calculator,
  TrendingUp,
  Target,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboard from "./AdminDashboard";
import AdminEnterprises from "./AdminEnterprises";
import AdminUsers from "./AdminUsers";
import AdminBilling from "./AdminBilling";
import AdminModels from "./AdminModels";
import AdminCallLogs from "./AdminCallLogs";
import AdminChannels from "./AdminChannels";
import AdminModelDeploy from "./AdminModelDeploy";
import AdminSettings from "./AdminSettings";
import AdminEnterpriseDetail from "./AdminEnterpriseDetail";
import AdminChannelMonitor from "./AdminChannelMonitor";
import AdminSystemDataDashboard from "./AdminSystemDataDashboard";
import AdminReconciliation from "./AdminReconciliation";
import AdminConsumptionTrends from "./AdminConsumptionTrends";
import AdminServiceAvailability from "./AdminServiceAvailability";
import AdminSubscriptionManagement from "./AdminSubscriptionManagement";
import AdminSubscriptionList from "./AdminSubscriptionList";
import AdminSubscriptionDetail from "./AdminSubscriptionDetail";
import AdminDeductionRules from "./AdminDeductionRules";
import AdminVoucherRecords from "./AdminVoucherRecords";
import AdminOrderManagement from "./AdminOrderManagement";
import AdminOrderDetail from "./AdminOrderDetail";
import AdminEntitlementManagement from "./AdminEntitlementManagement";
import AdminEntitlementDetail from "./AdminEntitlementDetail";
import AdminResellers from "./AdminResellers";
import AdminResellerDetail from "./AdminResellerDetail";
import AdminResellerPortal from "./AdminResellerPortal";

// 一级菜单页面（空页面）
function AdminHome() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">首页</h1>
      <p className="text-muted-foreground">首页功能开发中...</p>
    </div>
  );
}

function AdminModelSquare() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">模型广场</h1>
      <p className="text-muted-foreground">模型广场功能开发中...</p>
    </div>
  );
}

function AdminDocs() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">文档</h1>
      <p className="text-muted-foreground">文档功能开发中...</p>
    </div>
  );
}

function AdminAbout() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">关于</h1>
      <p className="text-muted-foreground">关于页面开发中...</p>
    </div>
  );
}

// 聊天模块（空页面）
function AdminDrillGround() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">操练场</h1>
      <p className="text-muted-foreground">操练场功能开发中...</p>
    </div>
  );
}

function AdminChat() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">聊天</h1>
      <p className="text-muted-foreground">聊天功能开发中...</p>
    </div>
  );
}

// 控制台子模块（空页面）
function AdminDataDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">数据看板</h1>
      <p className="text-muted-foreground">数据看板功能开发中...</p>
    </div>
  );
}

function AdminTokenManagement() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">令牌管理</h1>
      <p className="text-muted-foreground">令牌管理功能开发中...</p>
    </div>
  );
}

function AdminWalletManagement() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">钱包管理</h1>
      <p className="text-muted-foreground">钱包管理功能开发中...</p>
    </div>
  );
}

function AdminPersonalSettings() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">个人设置</h1>
      <p className="text-muted-foreground">个人设置功能开发中...</p>
    </div>
  );
}

// 顶部一级菜单
const TOP_NAV_ITEMS = [
  { label: "首页", path: "/admin/home", icon: Home },
  { label: "系统数据看板", path: "/admin/system-dashboard", icon: BarChart3 },
  { label: "控制台", path: "/admin/console", icon: LayoutDashboard },
  { label: "模型广场", path: "/admin/model-square", icon: Globe },
  { label: "文档", path: "/admin/docs", icon: FileQuestion },
  { label: "关于", path: "/admin/about", icon: Info },
];

// 控制台二级菜单（左侧边栏）
const CONSOLE_NAV_GROUPS = [
  {
    label: "聊天",
    items: [
      { label: "操练场", icon: Monitor, path: "drill-ground" },
      { label: "聊天", icon: MessageSquare, path: "chat" },
    ],
  },
  {
    label: "控制台",
    items: [
      { label: "数据看板", icon: LayoutDashboard, path: "data-dashboard" },
      { label: "令牌管理", icon: Key, path: "token-management" },
      { label: "钱包管理", icon: Wallet, path: "wallet-management" },
      { label: "个人设置", icon: UserCog, path: "personal-settings" },
    ],
  },
  {
    label: "代理商",
    items: [
      { label: "代理商视图", icon: Monitor, path: "reseller-view/agent-001/funds" },
    ],
  },
  {
    label: "运营管理",
    items: [
      { label: "企业管理", icon: Building2, path: "enterprises" },
      { label: "用户管理", icon: Users, path: "users" },
      { label: "代理商管理", icon: Network, path: "resellers" },
      { label: "消费趋势", icon: TrendingUp, path: "consumption-trends" },
      { label: "调用日志", icon: FileText, path: "call-logs" },
      { label: "服务可用性监控", icon: Shield, path: "service-availability" },
      { label: "渠道监控", icon: Activity, path: "channel-monitor" },
    ],
  },
  {
    label: "财务与权益",
    items: [
      { label: "账单管理", icon: Calculator, path: "reconciliation" },
      { label: "代金券管理", icon: Ticket, path: "voucher-records" },
      { label: "商品配置", icon: Target, path: "products" },
      { label: "订阅管理", icon: Repeat, path: "subscription-management" },
      { label: "订单管理", icon: FileText, path: "order-management" },
      { label: "权益管理", icon: Key, path: "entitlement-management" },
      { label: "兑换码管理", icon: Ticket, path: "billing" },
    ],
  },
  {
    label: "配置管理",
    items: [
      { label: "渠道管理", icon: Network, path: "channels" },
      { label: "模型管理", icon: Cpu, path: "models" },
      { label: "模型部署", icon: Layers, path: "model-deploy" },
      { label: "系统设置", icon: Settings, path: "settings" },
    ],
  },
];

const RESELLER_NAV_GROUPS = [
  { label: "代理商视图", items: [
    { label: "资金账户", icon: Wallet, path: "funds" },
    { label: "用户管理", icon: Users, path: "users" },
    { label: "企业管理", icon: Building2, path: "enterprises" },
    { label: "账单管理", icon: Calculator, path: "bills" },
    { label: "调用日志", icon: FileText, path: "logs" },
  ] },
];

// 控制台布局（带左侧边栏）
function ConsoleLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getAdminSession();
  const resellerViewMatch = location.pathname.match(/\/admin\/console\/reseller-view\/([^/]+)/);
  const resellerViewId = resellerViewMatch?.[1];
  const navGroups = resellerViewId ? RESELLER_NAV_GROUPS : CONSOLE_NAV_GROUPS;

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex flex-1 min-w-0">
      {/* 控制台左侧边栏 */}
      <aside className="w-56 shrink-0 bg-card border-r flex flex-col">
        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {resellerViewId && <div className="mx-1 mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"><p className="text-xs font-medium text-blue-700">代理商 A 工作台</p><p className="text-[11px] text-blue-600 mt-0.5">当前为代理商登录视角</p></div>}
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const targetPath = resellerViewId ? `/admin/console/reseller-view/${resellerViewId}/${item.path}` : `/admin/console/${item.path}`;
                  const active = location.pathname === targetPath;
                  return (
                    <NavLink
                      key={item.path}
                      to={targetPath}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {session?.name?.[0] || session?.phone.slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{session?.name || session?.phone}</p>
              <p className="text-xs text-muted-foreground">{resellerViewId ? "代理商管理员" : "管理员"}</p>
            </div>
          </div>
          {resellerViewId && <Button variant="outline" size="sm" className="w-full mb-1" onClick={() => navigate("/admin/console/resellers")}>返回平台后台</Button>}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 控制台内容区 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="drill-ground" replace />} />
          <Route path="drill-ground" element={<AdminDrillGround />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="enterprises" element={<AdminEnterprises />} />
          <Route path="enterprises/:id" element={<AdminEnterpriseDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="resellers" element={<AdminResellers />} />
          <Route path="resellers/:id" element={<AdminResellerDetail />} />
          <Route path="reseller-view/:id" element={<Navigate to="funds" replace />} />
          <Route path="reseller-view/:id/users" element={<AdminResellerPortal section="users" />} />
          <Route path="reseller-view/:id/enterprises" element={<AdminResellerPortal section="enterprises" />} />
          <Route path="reseller-view/:id/funds" element={<AdminResellerPortal section="funds" />} />
          <Route path="reseller-view/:id/bills" element={<AdminResellerPortal section="bills" />} />
          <Route path="reseller-view/:id/logs" element={<AdminResellerPortal section="logs" />} />
          <Route path="consumption-trends" element={<AdminConsumptionTrends />} />
          <Route path="products" element={<AdminSubscriptionManagement />} />
          <Route path="subscription-management" element={<AdminSubscriptionList />} />
          <Route path="subscription-management/:id" element={<AdminSubscriptionDetail />} />
          <Route path="order-management" element={<AdminOrderManagement />} />
          <Route path="order-management/:id" element={<AdminOrderDetail />} />
          <Route path="entitlement-management" element={<AdminEntitlementManagement />} />
          <Route path="entitlement-management/:id" element={<AdminEntitlementDetail />} />
          <Route path="deduction-rules" element={<AdminDeductionRules />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="channels" element={<AdminChannels />} />
          <Route path="models" element={<AdminModels />} />
          <Route path="model-deploy" element={<AdminModelDeploy />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="call-logs" element={<AdminCallLogs />} />
          <Route path="channel-monitor" element={<AdminChannelMonitor />} />
          <Route path="service-availability" element={<AdminServiceAvailability />} />
          <Route path="reconciliation" element={<AdminReconciliation />} />
          <Route path="voucher-records" element={<AdminVoucherRecords />} />
          <Route path="data-dashboard" element={<AdminDataDashboard />} />
          <Route path="token-management" element={<AdminTokenManagement />} />
          <Route path="wallet-management" element={<AdminWalletManagement />} />
          <Route path="personal-settings" element={<AdminPersonalSettings />} />
          <Route path="*" element={<Navigate to="data-dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getAdminSession();

  useEffect(() => {
    if (!session) {
      navigate("/admin/login", { replace: true });
    }
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* 顶部一级导航栏 */}
      <header className="h-14 bg-card border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground">Token Switch</span>
          </div>

          {/* 顶部导航菜单 */}
          <nav className="flex items-center gap-1">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive = item.path === "/admin/console" 
                ? location.pathname.startsWith("/admin/console")
                : location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 主体内容区 */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <Routes>
          {/* 控制台页面（带左侧边栏） */}
          <Route path="console/*" element={<ConsoleLayout />} />
          
          {/* 其他一级菜单页面（无左侧边栏） */}
          <Route path="home" element={<div className="flex-1 overflow-y-auto"><AdminHome /></div>} />
          <Route path="system-dashboard" element={<div className="flex-1 overflow-y-auto"><AdminSystemDataDashboard /></div>} />
          <Route path="model-square" element={<div className="flex-1 overflow-y-auto"><AdminModelSquare /></div>} />
          <Route path="docs" element={<div className="flex-1 overflow-y-auto"><AdminDocs /></div>} />
          <Route path="about" element={<div className="flex-1 overflow-y-auto"><AdminAbout /></div>} />
          
          {/* 默认跳转 */}
          <Route index element={<Navigate to="system-dashboard" replace />} />
          <Route path="*" element={<Navigate to="system-dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
