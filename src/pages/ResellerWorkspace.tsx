import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { Building2, Calculator, ChevronRight, FileText, LogOut, Users, Wallet } from "lucide-react";
import AdminResellerPortal from "./admin/AdminResellerPortal";
import { Button } from "@/components/ui/button";

const resellerId = "agent-001";

const navItems = [
  { label: "账户余额", icon: Wallet, path: "funds" },
  { label: "企业管理", icon: Building2, path: "enterprises" },
  { label: "用户管理", icon: Users, path: "users" },
  { label: "账单管理", icon: Calculator, path: "bills" },
  { label: "调用日志", icon: FileText, path: "logs" },
];

export default function ResellerWorkspace() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b bg-card flex items-center px-5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center" aria-label="企业 Logo">
          <Building2 className="w-5 h-5" />
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <p className="font-medium">代理商A</p>
            <p className="text-xs text-muted-foreground mt-1">代理商管理员</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.path} to={`/reseller/${item.path}`} className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                <ChevronRight className="w-3 h-3 ml-auto opacity-70" />
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t">
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => navigate("/login", { replace: true })}>
              <LogOut className="w-4 h-4 mr-2" />退出登录
            </Button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Routes>
            <Route index element={<Navigate to="enterprises" replace />} />
            <Route path="funds" element={<AdminResellerPortal section="funds" />} />
            <Route path="users" element={<AdminResellerPortal section="users" />} />
            <Route path="enterprises" element={<AdminResellerPortal section="enterprises" />} />
            <Route path="bills" element={<AdminResellerPortal section="bills" />} />
            <Route path="logs" element={<AdminResellerPortal section="logs" />} />
            <Route path="*" element={<Navigate to="funds" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
