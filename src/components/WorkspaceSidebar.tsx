import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  LayoutGrid, Key, BarChart3, FileText, Building2, Users,
  ChevronDown, ChevronRight, Wallet, Network, Settings, UserCog, UserCircle,
  Receipt, UserPlus, PieChart, Sparkles, ClipboardList,
  Crown
} from "lucide-react";

interface NavChild { title: string; url: string; icon: React.ElementType; isNew?: boolean }
interface NavItem { title: string; url?: string; icon: React.ElementType; children?: NavChild[]; isNew?: boolean }

// 企业空间菜单
const enterpriseNavItems: NavItem[] = [
  { title: "模型广场", url: "/workspace/models", icon: LayoutGrid },
  { title: "API Key", url: "/workspace/keys", icon: Key },
  { title: "资源统计", url: "/workspace/stats", icon: BarChart3 },
  { title: "调用日志", url: "/workspace/logs", icon: FileText },
  {
    title: "Token Plan", icon: Sparkles, isNew: true, children: [
      { title: "订单管理", url: "/workspace/resource-orders", icon: ClipboardList },
      { title: "企业订阅", url: "/workspace/team-subscription", icon: Crown },
      { title: "我的订阅", url: "/workspace/my-subscription", icon: UserCircle },
    ],
  },
  {
    title: "企业管理", icon: Building2, children: [
      { title: "企业信息", url: "/workspace/enterprise/info", icon: Settings },
      { title: "充值余额", url: "/workspace/enterprise/balance", icon: Wallet },
      { title: "费用总览", url: "/workspace/enterprise/cost-overview", icon: PieChart },
      { title: "费用账单", url: "/workspace/enterprise/bills", icon: Receipt },
    ],
  },
  { title: "部门管理", url: "/workspace/dept", icon: Users },
  { title: "成员管理", url: "/workspace/members", icon: UserPlus },
];

// 个人空间菜单
const personalNavItems: NavItem[] = [
  { title: "模型广场", url: "/workspace/models", icon: LayoutGrid },
  { title: "API Key", url: "/workspace/keys", icon: Key },
  { title: "资源统计", url: "/workspace/stats", icon: BarChart3 },
  { title: "调用日志", url: "/workspace/logs", icon: FileText },
  {
    title: "Token Plan", icon: Sparkles, isNew: true, children: [
      { title: "订单管理", url: "/workspace/resource-orders", icon: ClipboardList },
      { title: "我的订阅", url: "/workspace/my-subscription", icon: UserCircle },
    ],
  },
  { title: "余额充值", url: "/workspace/balance", icon: Wallet },
  { title: "费用总览", url: "/workspace/cost-overview", icon: PieChart },
  { title: "个人中心", url: "/workspace/profile", icon: UserCircle },
];

interface Props {
  enterpriseName: string;
  enterpriseCode: string;
  isPersonalMode?: boolean;
}

export default function WorkspaceSidebar({ enterpriseName, enterpriseCode, isPersonalMode }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = isPersonalMode ? personalNavItems : enterpriseNavItems;

  const isChildActive = (children?: NavChild[]) =>
    children?.some((c) => location.pathname.startsWith(c.url)) ?? false;

  // "Token Plan"采用受控展开：点击一级菜单时展开并导航到 /workspace/token-plan
  const resourceItem = navItems.find((i) => i.title === "Token Plan");
  const [resourceOpen, setResourceOpen] = useState(isChildActive(resourceItem?.children));

  return (
    <Sidebar className="border-r-0 h-screen" style={{ background: "hsl(224,76%,18%)" }}>
      <SidebarHeader className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(224,76%,58%), hsl(262,60%,68%))" }}>
            {isPersonalMode ? (
              <UserCircle className="w-5 h-5 text-white" />
            ) : (
              <Building2 className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{enterpriseName}</p>
            {!isPersonalMode && <p className="text-xs text-white/50 font-mono">{enterpriseCode}</p>}
          </div>
          <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 text-xs px-4 mb-1">主菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isResource = item.title === "Token Plan";
                return item.children ? (
                  <Collapsible
                    key={item.title}
                    {...(isResource
                      ? { open: resourceOpen }
                      : { defaultOpen: isChildActive(item.children) })}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        className="w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm cursor-pointer"
                        onClick={isResource ? () => {
                          setResourceOpen((prev) => !prev);
                          navigate("/workspace/token-plan");
                        } : undefined}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left inline-flex items-center gap-1.5">
                          {item.title}
                          {item.isNew && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded-md bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm">
                              New
                            </span>
                          )}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu className="ml-4 mt-0.5">
                          {item.children.map((child) => (
                            <SidebarMenuItem key={child.title}>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={child.url}
                                  className="flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs"
                                  activeClassName="bg-white/15 text-white font-medium"
                                >
                                  <child.icon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="flex-1 inline-flex items-center gap-1.5">
                                    {child.title}
                                    {child.isNew && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-semibold leading-none rounded-md bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm">
                                        New
                                      </span>
                                    )}
                                  </span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url!}
                        className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
                        activeClassName="bg-white/15 text-white font-medium"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
