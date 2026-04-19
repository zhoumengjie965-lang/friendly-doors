import { useEffect, useMemo, useState } from "react";
import { getCurrentPhone } from "@/lib/auth";
import {
  getMockData,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addMember,
  createInvitation,
} from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  TrendingUp,
  BarChart3,
  Wallet,
  Key,
  Network,
  Trash2,
  Power,
  Plus,
  MoreHorizontal,
  UserCog,
  Pencil,
  PauseCircle,
  Sliders,
} from "lucide-react";

// Types
interface Member {
  id: string;
  enterprise_id: string;
  organization_id: string;
  user_phone: string;
  role: "admin" | "org_admin" | "member";
  daily_limit: number | null;
  status: "active" | "disabled";
  created_at: string;
  name?: string;
  today_consumed?: number;
  month_consumed?: number;
}

interface Org {
  id: string;
  enterprise_id: string;
  name: string;
  parent_id: string | null;
  level: number;
  path: string;
  status: "active" | "inactive" | "disabled";
  monthly_budget?: number;
  consumed_budget?: number;
  admin_phone?: string;
  created_at: string;
  memberCount?: number;
  childCount?: number;
}

interface Enterprise {
  id: string;
  name: string;
  status: string;
}

// Org Tree Node Component
function OrgTreeNode({
  org,
  level,
  selectedOrg,
  onSelect,
  expandedIds,
  onToggleExpand,
  allOrgs,
  viewMode,
}: {
  org: Org;
  level: number;
  selectedOrg: Org | null;
  onSelect: (org: Org) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  allOrgs: Org[];
  viewMode: "enterprise" | "department";
}) {
  const children = allOrgs.filter((o) => o.parent_id === org.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(org.id);
  // Only highlight when in department mode and this org is selected
  const isSelected = viewMode === "department" && selectedOrg?.id === org.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(org)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(org.id);
            }}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
            ) : (
              <ChevronRight className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {level === 0 ? (
          <Building2 className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-gray-500"}`} />
        ) : (
          <Network className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-gray-400"}`} />
        )}

        <span className={`text-sm truncate ${isSelected ? "font-medium text-blue-600" : "text-gray-700"}`}>
          {org.name}
        </span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <OrgTreeNode
              key={child.id}
              org={child}
              level={level + 1}
              selectedOrg={selectedOrg}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              allOrgs={allOrgs}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeptManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set());
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [viewMode, setViewMode] = useState<"enterprise" | "department">("enterprise");

  // Dialog states
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgBudget, setNewOrgBudget] = useState("");
  const [newOrgAdmins, setNewOrgAdmins] = useState<string[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");

  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editOrgName, setEditOrgName] = useState("");

  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editOrgBudget, setEditOrgBudget] = useState(0);

  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState<Org | null>(null);

  const [setAdminOrg, setSetAdminOrg] = useState<Org | null>(null);
  const [newAdminPhone, setNewAdminPhone] = useState<string | null>(null);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberPhone, setMemberPhone] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    const phone = getCurrentPhone();
    const mockData = getMockData();

    const userMember = mockData.members.find(
      (m) => m.user_phone === phone && m.role === "admin"
    );
    if (!userMember) {
      setLoading(false);
      return;
    }

    const enterpriseData = mockData.enterprises.find(
      (e) => e.id === userMember.enterprise_id
    );
    if (!enterpriseData) {
      setLoading(false);
      return;
    }

    setEnterprise(enterpriseData as unknown as Enterprise);

    // Load all organizations
    const orgsData = mockData.organizations
      .filter((o) => o.enterprise_id === enterpriseData.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Add member count and child count to orgs
    const orgsWithStats = orgsData.map((org) => {
      const orgMembers = mockData.members.filter((m) => m.organization_id === org.id);
      const childCount = orgsData.filter((o) => o.parent_id === org.id).length;
      return {
        ...org,
        memberCount: orgMembers.length,
        childCount,
        consumed_budget: 0, // mock
      };
    });

    setOrgs(orgsWithStats as Org[]);

    // Select first non-root org by default (e.g., "默认组织")
    const nonRootOrg = orgsWithStats.find((o) => o.parent_id);
    if (nonRootOrg) {
      setSelectedOrg(nonRootOrg as Org);
      fetchMembers(nonRootOrg.id);
      // Expand root
      setExpandedOrgIds(new Set([nonRootOrg.parent_id || ""]));
    }

    setLoading(false);
  };

  const fetchMembers = async (orgId: string) => {
    const mockData = getMockData();
    const membersData = mockData.members.filter((m) => m.organization_id === orgId);

    const phones = [...new Set(membersData.map((m) => m.user_phone))];
    const phoneToName: Record<string, string> = {};

    mockData.users
      .filter((u) => phones.includes(u.phone))
      .forEach((u) => {
        phoneToName[u.phone] = u.name || "";
      });

    const membersWithStats = membersData.map((m) => ({
      ...m,
      name: phoneToName[m.user_phone] || m.user_phone,
      today_consumed: 0,
      month_consumed: 0,
    }));

    setMembers(membersWithStats as Member[]);
  };

  const handleSelectOrg = async (org: Org) => {
    setViewMode("department");
    setSelectedOrg(org);
    await fetchMembers(org.id);
  };

  const toggleExpand = (orgId: string) => {
    const newExpanded = new Set(expandedOrgIds);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgIds(newExpanded);
  };

  // Get child orgs for selected org
  const childOrgs = useMemo(() => {
    if (!selectedOrg) return [];
    return orgs.filter((o) => o.parent_id === selectedOrg.id);
  }, [selectedOrg, orgs]);

  // Calculate enterprise total members
  const enterpriseMemberCount = useMemo(() => {
    if (!enterprise) return 0;
    const mockData = getMockData();
    return mockData.members.filter((m) => m.enterprise_id === enterprise.id).length;
  }, [enterprise]);

  // Calculate org stats
  const orgStats = useMemo(() => {
    if (!selectedOrg) return null;

    const budget = selectedOrg.monthly_budget || 0;
    const consumed = 0; // mock
    const memberCount = members.length;
    const childCount = childOrgs.length;
    const apiKeyCount = 0; // mock
    const usageRate = budget > 0 ? ((consumed / budget) * 100).toFixed(2) : "0.00";

    return {
      budget,
      consumed,
      memberCount,
      childCount,
      apiKeyCount,
      usageRate,
      remaining: budget - consumed,
    };
  }, [selectedOrg, members, childOrgs]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const query = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(query) ||
        m.user_phone.toLowerCase().includes(query)
    );
  }, [members, memberSearch]);

  // CRUD operations
  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !selectedOrg || !enterprise) return;
    try {
      const newOrg = await createOrganization(enterprise.id, newOrgName.trim(), selectedOrg.id, {
        monthly_budget: newOrgBudget ? Number(newOrgBudget) : null,
        status: "active",
      });
      // Add admin members if selected
      if (newOrgAdmins.length > 0 && newOrg) {
        for (const adminPhone of newOrgAdmins) {
          await addMember(enterprise.id, newOrg.id, adminPhone, "org_admin", {
            status: "active",
            daily_limit: 1000,
          });
        }
      }
      toast({ title: "创建成功", description: `部门「${newOrgName}」已创建` });
      setNewOrgName("");
      setNewOrgBudget("");
      setNewOrgAdmins([]);
      setAdminSearchQuery("");
      setCreateOrgOpen(false);
      loadInitialData();
    } catch (e: any) {
      toast({ title: "创建失败", description: e?.message, variant: "destructive" });
    }
  };

  const handleEditOrg = async () => {
    if (!editOrg || !editOrgName.trim()) return;
    try {
      await updateOrganization(editOrg.id, { name: editOrgName.trim() });
      toast({ title: "名称已更新" });
      setEditOrg(null);
      setEditOrgOpen(false);
      loadInitialData();
    } catch {
      toast({ title: "更新失败", variant: "destructive" });
    }
  };

  const handleEditBudget = async () => {
    if (!editOrg) return;
    try {
      await updateOrganization(editOrg.id, { monthly_budget: editOrgBudget });
      toast({ title: "预算已更新" });
      setEditOrg(null);
      setEditBudgetOpen(false);
      loadInitialData();
    } catch {
      toast({ title: "更新失败", variant: "destructive" });
    }
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrgConfirm) return;
    try {
      await deleteOrganization(deleteOrgConfirm.id);
      toast({ title: "已删除部门" });
      setDeleteOrgConfirm(null);
      loadInitialData();
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const handleSetAdmin = async () => {
    if (!setAdminOrg || !enterprise) return;
    try {
      await updateOrganization(setAdminOrg.id, { admin_phone: newAdminPhone });
      toast({ title: "部门管理员已更新" });
      setSetAdminOrg(null);
      setNewAdminPhone("");
      loadInitialData();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (org: Org) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    try {
      await updateOrganization(org.id, { status: newStatus as "active" | "inactive" });
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      loadInitialData();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleAddMember = async () => {
    if (!memberPhone.trim() || !selectedOrg || !enterprise) {
      toast({ title: "请填写手机号", variant: "destructive" });
      return;
    }

    const phone = memberPhone.trim();
    const mockData = getMockData();
    const existingUser = mockData.users.find((u) => u.phone === phone);
    const existingMember = mockData.members.find(
      (m) => m.enterprise_id === enterprise.id && m.user_phone === phone
    );

    if (existingMember) {
      toast({ title: "该用户已是企业成员", variant: "destructive" });
      return;
    }

    if (existingUser) {
      await addMember(
        enterprise.id,
        selectedOrg.id,
        phone,
        memberRole as "admin" | "org_admin" | "member",
        { status: "active", daily_limit: 1000 }
      );
      toast({ title: "添加成功" });
    } else {
      await createInvitation(enterprise.id, getCurrentPhone() || "", {
        organization_id: selectedOrg.id,
        invitee_phone: phone,
        role: memberRole as "admin" | "org_admin" | "member",
      });
      toast({ title: "邀请已发送" });
    }

    setMemberPhone("");
    setMemberName("");
    setMemberRole("member");
    setAddMemberOpen(false);
    fetchMembers(selectedOrg.id);
    loadInitialData();
  };

  const handleBatchBudget = async () => {
    if (!budgetValue || !selectedOrg) return;
    const val = Number(budgetValue);
    const mockData = getMockData();
    members.forEach((m) => {
      const idx = mockData.members.findIndex((mem) => mem.id === m.id);
      if (idx !== -1) {
        mockData.members[idx].daily_limit = val;
      }
    });
    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
    toast({ title: "批量设置成功" });
    setBudgetDialogOpen(false);
    setBudgetValue("");
    fetchMembers(selectedOrg.id);
  };



  const handleDeleteMember = async (member: Member) => {
    const mockData = getMockData();
    mockData.members = mockData.members.filter((m) => m.id !== member.id);
    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
    toast({ title: "成员已移除" });
    if (selectedOrg) fetchMembers(selectedOrg.id);
    loadInitialData();
  };

  const handleToggleMemberStatus = async (member: Member) => {
    const newStatus = member.status === "active" ? "disabled" : "active";
    const mockData = getMockData();
    const idx = mockData.members.findIndex((m) => m.id === member.id);
    if (idx !== -1) {
      mockData.members[idx].status = newStatus;
      localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m))
    );
  };

  // Mask phone number
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get root orgs (enterprises)
  const rootOrgs = orgs.filter((o) => !o.parent_id);

  // Check if currently at enterprise level
  const isEnterpriseLevel = viewMode === "enterprise";

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Sidebar - Org Tree */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索部门"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="text-sm font-medium text-gray-700 mb-2">部门架构</div>
          
          {/* Enterprise Name Row */}
          {enterprise && (
            <div
              onClick={() => {
                setViewMode("enterprise");
                // Select the first root org as enterprise representative for data loading
                const firstRoot = rootOrgs[0];
                if (firstRoot) {
                  setSelectedOrg(firstRoot);
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2 ${
                viewMode === "enterprise"
                  ? "bg-blue-50 text-blue-600"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium truncate">{enterprise.name}</span>
            </div>
          )}
          
          <div className="space-y-1">
            {rootOrgs.map((org) => (
              <OrgTreeNode
                key={org.id}
                org={org}
                level={0}
                selectedOrg={selectedOrg}
                onSelect={handleSelectOrg}
                expandedIds={expandedOrgIds}
                onToggleExpand={toggleExpand}
                allOrgs={orgs}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedOrg && orgStats ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">部门管理</h1>
            </div>

            {/* Enterprise Level Stats Cards */}
            {isEnterpriseLevel ? (
              <div className="grid grid-cols-3 gap-6">
                {/* Enterprise Balance Card */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="font-medium text-gray-900">企业余额</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">累计消耗</span>
                        <span className="text-lg font-semibold text-gray-900">¥0.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">剩余可用</span>
                        <span className="text-lg font-semibold text-green-600">¥0.00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Budget Card */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                      </div>
                      <span className="font-medium text-gray-900">本月预算</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">本月已分配</span>
                        <span className="text-lg font-semibold text-gray-900">¥100.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">本月已消耗</span>
                        <span className="text-lg font-semibold text-red-500">¥0.00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enterprise Assets Card */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="font-medium text-gray-900">企业资产</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{rootOrgs.length}个</div>
                        <div className="text-xs text-gray-500 mt-1">部门</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {enterpriseMemberCount}人
                        </div>
                        <div className="text-xs text-gray-500 mt-1">成员</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">0个</div>
                        <div className="text-xs text-gray-500 mt-1">API Key</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Department Level Stats Cards */
              <div className="grid grid-cols-3 gap-6">
                {/* Budget Planning Card */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="font-medium text-gray-900">预算规划</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">本月已分配</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">直属成员</span>
                            <span className="text-gray-900">¥0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">子部门</span>
                            <span className="text-gray-900">¥0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">业务Key</span>
                            <span className="text-gray-900">¥0.00</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">¥0.00</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-sm text-gray-500">本月预算上限</span>
                      <span className="text-lg font-semibold text-gray-900">
                        ¥{orgStats.budget.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Real-time Consumption Card */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                      </div>
                      <span className="font-medium text-gray-900">实时消耗</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">本月已消耗</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">直属成员</span>
                            <span className="text-gray-900">¥0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">子部门</span>
                            <span className="text-gray-900">¥0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">业务Key</span>
                            <span className="text-gray-900">¥0.00</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">¥0.00</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">剩余可用预算</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ¥{orgStats.remaining.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">预算使用率</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {orgStats.usageRate}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Department Assets Card */}
                <Card className="bg-white border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-orange-500" />
                      </div>
                      <span className="font-medium text-gray-900">部门资产</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">下级部门</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {orgStats.childCount} 个
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">直属成员</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {orgStats.memberCount} 人
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">API Key</span>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">
                          {orgStats.apiKeyCount} 个
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Enterprise Level - First-level Department List */}
            {isEnterpriseLevel ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">一级部门列表</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBudgetDialogOpen(true)}
                      className="h-9"
                    >
                      <Sliders className="h-4 w-4 mr-2" />
                      一键配置预算
                    </Button>
                    <Button size="sm" onClick={() => setCreateOrgOpen(true)} className="h-9">
                      <Plus className="h-4 w-4 mr-2" />
                      创建部门
                    </Button>
                  </div>
                </div>
                <Card className="bg-white border-0 shadow-sm">
                  {rootOrgs.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">暂无部门</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-100 hover:bg-transparent">
                          <TableHead className="text-gray-500 font-normal">部门名称</TableHead>
                          <TableHead className="text-gray-500 font-normal">部门管理员</TableHead>
                          <TableHead className="text-gray-500 font-normal">成员数</TableHead>
                          <TableHead className="text-gray-500 font-normal">本月预算上限</TableHead>
                          <TableHead className="text-gray-500 font-normal">本月消耗预算</TableHead>
                          <TableHead className="text-gray-500 font-normal">使用率</TableHead>
                          <TableHead className="text-gray-500 font-normal">状态</TableHead>
                          <TableHead className="text-gray-500 font-normal text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rootOrgs.map((org) => (
                          <TableRow key={org.id} className="border-b border-gray-50">
                            <TableCell>
                              <div className="font-medium text-gray-900">{org.name}</div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {org.admin_phone || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {org.memberCount || 0}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {org.monthly_budget ? `¥${org.monthly_budget.toFixed(2)}` : "¥0.00"}
                            </TableCell>
                            <TableCell className="text-sm text-red-500">
                              ¥{(org.consumed_budget || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={org.monthly_budget ? ((org.consumed_budget || 0) / org.monthly_budget) * 100 : 0}
                                  className="w-16 h-1.5"
                                />
                                <span className="text-xs text-gray-500">
                                  {org.monthly_budget
                                    ? Math.round(((org.consumed_budget || 0) / org.monthly_budget) * 100)
                                    : 0}
                                  %
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {org.status === "active" ? (
                                <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border-0">
                                  启用
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="border-0">
                                  禁用
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setSetAdminOrg(org);
                                    setNewAdminPhone(org.admin_phone || null);
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="设置部门管理员"
                                >
                                  <UserCog className="h-4 w-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditOrg(org);
                                    setEditOrgName(org.name);
                                    setEditOrgOpen(true);
                                  }}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="编辑部门名称"
                                >
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleToggleStatus(org)}>
                                      <Power className="h-4 w-4 mr-2" />
                                      {org.status === "active" ? "禁用" : "启用"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeleteOrgConfirm(org)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </div>
            ) : (
              /* Department Level - Tabs */
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="bg-transparent border-b rounded-none h-auto p-0 w-auto">
                    <TabsTrigger
                      value="members"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-2"
                    >
                      直属成员
                    </TabsTrigger>
                    <TabsTrigger
                      value="children"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-2"
                    >
                      子部门 ({orgStats.childCount})
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === "members" ? (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="搜索成员"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="pl-9 w-48 h-9"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBudgetDialogOpen(true)}
                        className="h-9"
                      >
                        <Sliders className="h-4 w-4 mr-2" />
                        一键配置预算
                      </Button>
                      <Button size="sm" onClick={() => setAddMemberOpen(true)} className="h-9">
                        <Plus className="h-4 w-4 mr-2" />
                        添加成员
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setCreateOrgOpen(true)} className="h-9">
                      <Plus className="h-4 w-4 mr-2" />
                      添加子部门
                    </Button>
                  )}
                </div>

                <TabsContent value="members" className="mt-0">
                  <Card className="bg-white border-0 shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-gray-100 hover:bg-transparent">
                          <TableHead className="text-gray-500 font-normal">成员</TableHead>
                          <TableHead className="text-gray-500 font-normal">角色</TableHead>
                          <TableHead className="text-gray-500 font-normal">今日消耗</TableHead>
                          <TableHead className="text-gray-500 font-normal">本月消耗</TableHead>
                          <TableHead className="text-gray-500 font-normal">单日上限</TableHead>
                          <TableHead className="text-gray-500 font-normal">状态</TableHead>
                          <TableHead className="text-gray-500 font-normal text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-gray-400 py-12"
                            >
                              暂无成员
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredMembers.map((member) => (
                            <TableRow key={member.id} className="border-b border-gray-50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 bg-gray-100">
                                    <AvatarFallback className="text-xs text-gray-600">
                                      {(member.name || member.user_phone).slice(0, 1)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {member.name || "未命名"}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {maskPhone(member.user_phone)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                  <span className="text-sm text-gray-700">
                                    {member.role === "org_admin"
                                      ? "部门管理员"
                                      : member.role === "admin"
                                      ? "企业管理员"
                                      : "普通成员"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                ¥{(member.today_consumed || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                ¥{(member.month_consumed || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    ¥{(member.daily_limit || 0).toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => setBudgetDialogOpen(true)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <Sliders className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      member.status === "active"
                                        ? "bg-green-500"
                                        : "bg-gray-300"
                                    }`}
                                  ></div>
                                  <span className="text-sm text-gray-600">
                                    {member.status === "active" ? "正常" : "已禁用"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditOrg(selectedOrg);
                                      setEditOrgName(selectedOrg?.name || "");
                                      setEditOrgOpen(true);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Pencil className="h-4 w-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMember(member)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleMemberStatus(member)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <PauseCircle className="h-4 w-4 text-gray-500" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="children" className="mt-0">
                  <Card className="bg-white border-0 shadow-sm">
                    {childOrgs.length === 0 ? (
                      <div className="p-12 text-center text-gray-400">暂无子部门</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-gray-100 hover:bg-transparent">
                            <TableHead className="text-gray-500 font-normal">部门名称</TableHead>
                            <TableHead className="text-gray-500 font-normal">部门管理员</TableHead>
                            <TableHead className="text-gray-500 font-normal">成员数</TableHead>
                            <TableHead className="text-gray-500 font-normal">本月预算上限</TableHead>
                            <TableHead className="text-gray-500 font-normal">本月消耗预算</TableHead>
                            <TableHead className="text-gray-500 font-normal">使用率</TableHead>
                            <TableHead className="text-gray-500 font-normal">状态</TableHead>
                            <TableHead className="text-gray-500 font-normal text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {childOrgs.map((org) => (
                            <TableRow key={org.id} className="border-b border-gray-50">
                              <TableCell>
                                <div className="font-medium text-gray-900">{org.name}</div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {org.admin_phone || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {org.memberCount || 0}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {org.monthly_budget ? `¥${org.monthly_budget.toFixed(2)}` : "¥0.00"}
                              </TableCell>
                              <TableCell className="text-sm text-red-500">
                                ¥{(org.consumed_budget || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={org.monthly_budget ? ((org.consumed_budget || 0) / org.monthly_budget) * 100 : 0}
                                    className="w-16 h-1.5"
                                  />
                                  <span className="text-xs text-gray-500">
                                    {org.monthly_budget
                                      ? Math.round(((org.consumed_budget || 0) / org.monthly_budget) * 100)
                                      : 0}
                                    %
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {org.status === "active" ? (
                                  <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border-0">
                                    启用
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="border-0">
                                    禁用
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setSetAdminOrg(org);
                                      setNewAdminPhone(org.admin_phone || null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="设置部门管理员"
                                  >
                                    <UserCog className="h-4 w-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditOrg(org);
                                      setEditOrgBudget(org.monthly_budget || 0);
                                      setEditBudgetOpen(true);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="编辑本月预算上限"
                                  >
                                    <Pencil className="h-4 w-4 text-gray-500" />
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleToggleStatus(org)}>
                                        <Power className="h-4 w-4 mr-2" />
                                        {org.status === "active" ? "禁用" : "启用"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setDeleteOrgConfirm(org)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        删除
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            请从左侧选择一个部门
          </div>
        )}
      </div>

      {/* Create Org Dialog */}
      <Dialog open={createOrgOpen} onOpenChange={(open) => {
        if (!open) {
          setNewOrgName("");
          setNewOrgBudget("");
          setNewOrgAdmins([]);
          setAdminSearchQuery("");
        }
        setCreateOrgOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewMode === "enterprise" ? "创建部门" : "创建子部门"}</DialogTitle>
            <DialogDescription>
              {viewMode === "enterprise" 
                ? "填写以下信息创建新的部门" 
                : `在「${selectedOrg?.name}」下创建新的子部门`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {viewMode === "enterprise" ? "部门名称" : "子部门名称"} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={`请输入${viewMode === "enterprise" ? "部门" : "子部门"}名称`}
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>默认月预算（元/月）</Label>
              <Input
                type="number"
                placeholder="留空表示不限制"
                value={newOrgBudget}
                onChange={(e) => setNewOrgBudget(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>设置{viewMode === "enterprise" ? "部门" : "子部门"}管理员</Label>
              {(() => {
                const mockData = getMockData();
                const enterpriseMembers = mockData.members.filter(
                  (m) => m.enterprise_id === enterprise?.id
                );
                const availableMembers = enterpriseMembers
                  .map((m) => {
                    const user = mockData.users.find((u) => u.phone === m.user_phone);
                    return {
                      phone: m.user_phone,
                      name: user?.name || m.user_phone,
                    };
                  })
                  .filter((m) => 
                    !adminSearchQuery || 
                    m.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                    m.phone.includes(adminSearchQuery)
                  );
                
                return (
                  <div className="relative">
                    <Select
                      value={newOrgAdmins[0] || "__none__"}
                      onValueChange={(value) => {
                        if (value === "__none__") {
                          setNewOrgAdmins([]);
                        } else if (!newOrgAdmins.includes(value)) {
                          if (newOrgAdmins.length < 3) {
                            setNewOrgAdmins([...newOrgAdmins, value]);
                          } else {
                            toast({ title: "最多只能选择3个管理员", variant: "destructive" });
                          }
                        }
                        setAdminSearchQuery("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="不指定">
                          {newOrgAdmins.length > 0 
                            ? `${newOrgAdmins.length}人已选择` 
                            : "不指定"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 pb-2">
                          <Input
                            placeholder="搜索成员"
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            className="h-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <SelectItem value="__none__">不指定</SelectItem>
                        {availableMembers.map((m) => (
                          <SelectItem key={m.phone} value={m.phone}>
                            <div className="flex items-center gap-2">
                              <span>{m.name}</span>
                              <span className="text-gray-400">- {m.phone.slice(0, 3)}****{m.phone.slice(-4)}</span>
                              {newOrgAdmins.includes(m.phone) && (
                                <span className="text-blue-500 ml-2">✓</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Selected admins display */}
                    {newOrgAdmins.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newOrgAdmins.map((phone) => {
                          const user = mockData.users.find((u) => u.phone === phone);
                          return (
                            <div
                              key={phone}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-sm"
                            >
                              <span>{user?.name || phone}</span>
                              <button
                                onClick={() => setNewOrgAdmins(newOrgAdmins.filter((p) => p !== phone))}
                                className="hover:text-blue-800"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNewOrgName("");
              setNewOrgBudget("");
              setNewOrgAdmins([]);
              setAdminSearchQuery("");
              setCreateOrgOpen(false);
            }}>
              取消
            </Button>
            <Button onClick={handleCreateOrg}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Org Dialog */}
      <Dialog open={editOrgOpen} onOpenChange={setEditOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑部门</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>部门名称</Label>
              <Input value={editOrgName} onChange={(e) => setEditOrgName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrgOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditOrg}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={editBudgetOpen} onOpenChange={setEditBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑本月预算上限</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>本月预算上限（元）</Label>
              <Input
                type="number"
                value={editOrgBudget}
                onChange={(e) => setEditOrgBudget(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudgetOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditBudget}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Org Dialog */}
      <Dialog open={!!deleteOrgConfirm} onOpenChange={() => setDeleteOrgConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除部门</DialogTitle>
            <DialogDescription>
              确定要删除部门「{deleteOrgConfirm?.name}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrgConfirm(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrg}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Admin Dialog */}
      <Dialog open={!!setAdminOrg} onOpenChange={() => setSetAdminOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置部门管理员</DialogTitle>
            <DialogDescription>为「{setAdminOrg?.name}」设置管理员</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>管理员手机号</Label>
              <Input
                placeholder="请输入管理员手机号"
                value={newAdminPhone || ""}
                onChange={(e) => setNewAdminPhone(e.target.value || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetAdminOrg(null)}>
              取消
            </Button>
            <Button onClick={handleSetAdmin}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
            <DialogDescription>添加成员到「{selectedOrg?.name}」</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                手机号 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入手机号"
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                placeholder="请输入姓名（可选）"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">普通成员</SelectItem>
                  <SelectItem value="org_admin">部门管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddMember}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>一键配置预算</DialogTitle>
            <DialogDescription>为所有成员设置单日上限</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>单日上限（元）</Label>
              <Input
                type="number"
                placeholder="请输入金额"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchBudget}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
