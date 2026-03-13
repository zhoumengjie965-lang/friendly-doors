import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from "react-router-dom";
import { getAdminSession, adminLogout } from "@/lib/adminAuth";
import {
  LayoutDashboard,
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
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboard from "./AdminDashboard";
import AdminEnterprises from "./AdminEnterprises";
import AdminUsers from "./AdminUsers";
import AdminBilling from "./AdminBilling";
import AdminModels from "./AdminModels";
import AdminStats from "./AdminStats";
import AdminCallLogs from "./AdminCallLogs";
import AdminChannels from "./AdminChannels";
import AdminModelDeploy from "./AdminModelDeploy";
import AdminSettings from "./AdminSettings";
import AdminEnterpriseDetail from "./AdminEnterpriseDetail";
import AdminResourceStats from "./AdminResourceStats";
import AdminTokens from "./AdminTokens";

const NAV_GROUPS = [
  {
    label: "控制台",
    items: [
      { label: "资源统计", icon: BarChart3, path: "resource-stats" },
      { label: "调用日志", icon: FileText, path: "call-logs" },
      { label: "令牌管理", icon: KeyRound, path: "tokens" },
    ],
  },
  {
    label: "运营管理",
    items: [
      { label: "企业管理", icon: Building2, path: "enterprises" },
      { label: "用户管理", icon: Users, path: "users" },
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
  {
    label: "系统",
    items: [
      { label: "全局统计", icon: BarChart3, path: "stats" },
    ],
  },
];

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

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-card border-r flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">运营管理后台</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = location.pathname === `/admin/${item.path}`;
                  return (
                    <NavLink
                      key={item.path}
                      to={`/admin/${item.path}`}
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
              {session.name?.[0] || session.phone.slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{session.name || session.phone}</p>
              <p className="text-xs text-muted-foreground">管理员</p>
            </div>
          </div>
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

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="enterprises" element={<AdminEnterprises />} />
          <Route path="enterprises/:id" element={<AdminEnterpriseDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="channels" element={<AdminChannels />} />
          <Route path="models" element={<AdminModels />} />
          <Route path="model-deploy" element={<AdminModelDeploy />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="call-logs" element={<AdminCallLogs />} />
          <Route path="resource-stats" element={<AdminResourceStats />} />
          <Route path="tokens" element={<AdminTokens />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
