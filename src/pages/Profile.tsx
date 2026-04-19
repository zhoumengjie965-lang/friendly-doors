import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getCurrentPhone } from "@/lib/auth";
import { getMockData } from "@/lib/mockData";

interface OrgMembership {
  org_id: string;
  org_name: string | null;
  role: string;
  alias: string | null;
}

interface EnterpriseCard {
  enterprise_id: string;
  enterprise_name: string;
  alias: string;
  is_enterprise_owner: boolean;
  memberships: OrgMembership[];
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<EnterpriseCard[]>([]);
  const phone = getCurrentPhone();

  useEffect(() => {
    const loadMemberships = async () => {
      if (!phone) {
        setLoading(false);
        return;
      }

      // 从 mock 数据查询用户的所有企业关联
      const mockData = getMockData();
      const membersData = mockData.members
        .filter(m => m.user_phone === phone)
        .map(m => {
          const enterprise = mockData.enterprises.find(e => e.id === m.enterprise_id);
          const organization = mockData.organizations.find(o => o.id === m.organization_id);
          return {
            ...m,
            enterprises: enterprise ? { id: enterprise.id, name: enterprise.name } : null,
            organizations: organization ? { id: organization.id, name: organization.name } : null,
          };
        });

      console.log("[Profile] members data:", membersData);

      // 按企业分组
      const enterpriseMap = new Map<string, EnterpriseCard>();

      (membersData || []).forEach((m: any) => {
        const entId = m.enterprise_id;
        const entName = m.enterprises?.name || "未知企业";
        const orgName = m.organizations?.name || null;
        const orgId = m.organization_id;

        if (!enterpriseMap.has(entId)) {
          enterpriseMap.set(entId, {
            enterprise_id: entId,
            enterprise_name: entName,
            alias: entName.charAt(0),
            is_enterprise_owner: m.role === "admin",
            memberships: [],
          });
        }

        const card = enterpriseMap.get(entId)!;
        card.memberships.push({
          org_id: orgId || entId,
          org_name: orgName || "默认组织",
          role: m.role === "admin" ? "owner" : "member",
          alias: null,
        });

        // 如果有任何一个是 admin，则标记为企业管理员
        if (m.role === "admin") {
          card.is_enterprise_owner = true;
        }
      });

      setMemberships(Array.from(enterpriseMap.values()));
      setLoading(false);
    };

    loadMemberships();
  }, [phone]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const shortId = "5A5344";
  const displayPhone = phone || "-";

  return (
    <div className="max-w-4xl space-y-6">
      {/* 顶部个人信息卡片 */}
      <Card className="border border-slate-200 rounded-lg">
        <CardContent className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 via-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle cx="8" cy="11" r="2" fill="#3b82f6" />
                  <circle cx="16" cy="11" r="2" fill="#3b82f6" />
                  <path d="M12 15c-3 0-5 1.5-5 3v1h10v-1c0-1.5-2-3-5-3z" fill="#93c5fd" opacity="0.4" />
                  <circle cx="18" cy="7" r="1" fill="#fbbf24" />
                  <path d="M19 6l1-1M20 8l1 1" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-[14px] text-gray-700">
                C&nbsp;&nbsp;ID: {shortId}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button size="sm" className="h-8 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-none">修改密码</Button>
              <Button size="sm" className="h-8 px-4 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md shadow-none">删除账户</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户设置 */}
      <div>
        <h2 className="text-[13px] font-medium text-gray-900 mb-3">用户设置</h2>
        <div className="border-t border-b border-slate-200">
            {/* 手机号码 */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-[13px] text-gray-500 whitespace-nowrap">手机号码</span>
                <span className="text-[14px] font-medium text-gray-900">{displayPhone}</span>
                <a href="#" className="text-[13px] text-blue-600 hover:text-blue-700 flex-shrink-0">解绑</a>
              </div>
              <div className="flex items-center gap-1.5 text-green-600 flex-shrink-0 ml-6">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[13px]">已绑定</span>
              </div>
            </div>

            {/* 联系邮箱 */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-[13px] text-gray-500 whitespace-nowrap">联系邮箱</span>
                <span className="text-[14px] font-medium text-gray-900">-</span>
                <a href="#" className="text-[13px] text-blue-600 hover:text-blue-700 flex-shrink-0">绑定</a>
              </div>
              <div className="flex items-center gap-1.5 text-orange-500 flex-shrink-0 ml-6">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[13px]">未绑定</span>
              </div>
            </div>
          </div>
        </div>

      {/* 我的名片 */}
      {memberships.length > 0 && (
        <div>
          <h2 className="text-[13px] font-medium text-gray-900 mb-3">我的名片</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map((card) => (
              <Card key={card.enterprise_id} className="border border-slate-200 rounded-lg">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="6" width="16" height="14" rx="2" />
                        <path d="M9 10h6M9 13h4" strokeLinecap="round" />
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      <span className="text-[14px] font-semibold text-gray-900 truncate">{card.enterprise_name}</span>
                    </div>
                    {card.is_enterprise_owner && (
                      <span className="text-[11px] text-purple-700 bg-purple-50 rounded px-1.5 py-0.5 flex-shrink-0 ml-3">企业管理员</span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {/* 按部门行展示：部门名(锚点) + 备注名标签 | 角色(右对齐) */}
                    {card.memberships.map((m) => (
                      <div key={m.org_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[14px] text-gray-900 truncate">{m.org_name || "默认组织"}</span>
                          <span className="text-[12px] text-blue-700 bg-sky-50 rounded px-1.5 py-0.5 flex-shrink-0">{m.alias || "—"}</span>
                        </div>
                        <span className={`text-[11px] text-purple-700 bg-purple-50 rounded px-1.5 py-0.5 flex-shrink-0 ml-3`}>
                          {m.role === "owner" ? "部门管理员" : "成员"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
