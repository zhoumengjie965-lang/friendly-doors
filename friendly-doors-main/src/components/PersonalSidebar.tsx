import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutGrid, Key, BarChart3, FileText, Wallet, UserCircle,
  Sparkles
} from "lucide-react";

interface NavItem { title: string; url: string; icon: React.ElementType; badge?: string }

const navItems: NavItem[] = [
  { title: "模型广场", url: "/workspace/models", icon: LayoutGrid, badge: "热门" },
  { title: "API Key", url: "/workspace/keys", icon: Key },
  { title: "资源统计", url: "/workspace/stats", icon: BarChart3 },
  { title: "调用日志", url: "/workspace/logs", icon: FileText },
  { title: "余额充值", url: "/workspace/balance", icon: Wallet },
  { title: "个人中心", url: "/workspace/profile", icon: UserCircle },
];

interface Props {
  userName?: string | null;
  phone?: string | null;
}

export default function PersonalSidebar({ userName, phone }: Props) {
  const location = useLocation();
  const avatarText = userName ? userName.slice(0, 1) : phone?.slice(-2) ?? "?";
  const displayName = userName || `用户${phone?.slice(-4)}`;

  return (
    <Sidebar className="border-r border-border h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Logo Area */}
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500 to-purple-500">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">AI 网关平台</span>
        </div>
      </SidebarHeader>

      {/* Main Menu */}
      <SidebarContent className="py-2 flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60 text-xs px-4 mb-1">主菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
                      activeClassName="bg-blue-500/20 text-blue-300 font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500 text-white rounded">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Area */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br from-blue-500 to-purple-500">
            {avatarText}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-white/60 truncate">{phone}</p>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
