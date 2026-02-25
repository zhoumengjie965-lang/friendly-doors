import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentPhone, getUserEnterprises } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import EnterpriseInfo from "@/pages/EnterpriseInfo";
import { Building2, Users, Key, Link, TrendingUp } from "lucide-react";

interface Enterprise {
  id: string;
  name: string;
  enterprise_code: string;
}

interface Member {
  enterprises: Enterprise | null;
  role: string;
}

export default function Workspace() {
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const phone = getCurrentPhone();
  const location = useLocation();

  useEffect(() => {
    if (!phone) { navigate("/login"); return; }
    (async () => {
      const members = await getUserEnterprises(phone);
      if (members.length === 0) { navigate("/no-enterprise"); return; }
      const m = members[0] as Member;
      setEnterprise(m.enterprises);
      setRole(m.role);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!enterprise) return null;

  const stats = [
    { label: "成员数量", value: "—", icon: Users, color: "hsl(224,76%,48%)" },
    { label: "API 密钥", value: "—", icon: Key, color: "hsl(262,60%,58%)" },
    { label: "邀请链接", value: "—", icon: Link, color: "hsl(142,70%,45%)" },
    { label: "本月调用", value: "—", icon: TrendingUp, color: "hsl(32,90%,55%)" },
  ];

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
          </header>

          {/* Content */}
          <div className="flex-1 p-6 bg-background overflow-auto">
            {location.pathname === "/workspace/enterprise/info" ? (
              <EnterpriseInfo enterprise={enterprise} role={role} />
            ) : (
              <>
                {/* Welcome */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-foreground">企业概览</h1>
                  <p className="text-muted-foreground mt-1">
                    欢迎回来，当前角色：
                    <span className="font-medium text-primary ml-1">
                      {role === "admin" ? "管理员" : "成员"}
                    </span>
                  </p>
                </div>

                {/* Enterprise info card */}
                <div className="bg-card border border-border rounded-xl p-6 mb-6"
                  style={{ background: "linear-gradient(135deg, hsl(224,76%,48%), hsl(262,60%,58%))" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">企业名称</p>
                      <h2 className="text-2xl font-bold text-white">{enterprise.name}</h2>
                      <p className="text-white/60 text-sm font-mono mt-0.5">
                        企业码：{enterprise.enterprise_code}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
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

                {/* Getting started */}
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
    </SidebarProvider>
  );
}
