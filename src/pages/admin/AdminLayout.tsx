import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from "react-router-dom";
import { getAdminSession, adminLogout } from "@/lib/adminAuth";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Cpu,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboard from "./AdminDashboard";
import AdminEnterprises from "./AdminEnterprises";
import AdminUsers from "./AdminUsers";
import AdminBilling from "./AdminBilling";
import AdminModels from "./AdminModels";
import AdminStats from "./AdminStats";

const NAV_ITEMS = [
  { label: "数据总览", icon: LayoutDashboard, path: "dashboard" },
  { label: "企业管理", icon: Building2, path: "enterprises" },
  { label: "用户管理", icon: Users, path: "users" },
  { label: "计费管理", icon: CreditCard, path: "billing" },
  { label: "模型配置", icon: Cpu, path: "models" },
  { label: "全局统计", icon: BarChart3, path: "stats" },
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
      <aside className="w-56 shrink-0 bg-card border-r flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">运营管理后台</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
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
          <Route path="users" element={<AdminUsers />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="models" element={<AdminModels />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
