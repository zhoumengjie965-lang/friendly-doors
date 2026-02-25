import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Settings, Users, Building2, Key, Link, LogOut, ChevronDown
} from "lucide-react";
import { clearCurrentPhone, getCurrentPhone } from "@/lib/auth";

const navItems = [
  { title: "概览", url: "/workspace", icon: LayoutDashboard },
  { title: "成员管理", url: "/workspace/members", icon: Users },
  { title: "API 密钥", url: "/workspace/keys", icon: Key },
  { title: "邀请管理", url: "/workspace/invitations", icon: Link },
  { title: "企业设置", url: "/workspace/settings", icon: Settings },
];

interface Props {
  enterpriseName: string;
  enterpriseCode: string;
}

export default function WorkspaceSidebar({ enterpriseName, enterpriseCode }: Props) {
  const navigate = useNavigate();
  const phone = getCurrentPhone();

  const handleLogout = () => {
    clearCurrentPhone();
    navigate("/login");
  };

  return (
    <Sidebar className="border-r-0" style={{ background: "hsl(224,76%,18%)" }}>
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,58%), hsl(262,60%,68%))" }}>
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{enterpriseName}</p>
            <p className="text-xs text-white/50 font-mono">{enterpriseCode}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 text-xs px-4 mb-1">主菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/workspace"}
                      className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
                      activeClassName="bg-white/15 text-white font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-xs font-medium">{phone?.slice(-4)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{phone}</p>
            <p className="text-white/40 text-xs">管理员</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
