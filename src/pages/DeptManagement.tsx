import { useEffect, useMemo, useState } from "react";
import { getCurrentPhone } from "@/lib/auth";
import {
  getMockData,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addMember,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [cannotDeleteOrg, setCannotDeleteOrg] = useState<Org | null>(null);

  const [setAdminOrg, setSetAdminOrg] = useState<Org | null>(null);
  const [newAdminPhones, setNewAdminPhones] = useState<string[]>([]);
  const [adminSelectSearch, setAdminSelectSearch] = useState("");
  const [demoteConfirmMember, setDemoteConfirmMember] = useState<{phone: string; name: string} | null>(null);

  // Edit member dialog states
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<"org_admin" | "member">("member");

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [importMemberSearch, setImportMemberSearch] = useState("");
  const [selectedMembersForImport, setSelectedMembersForImport] = useState<string[]>([]);
  const [importMemberRole, setImportMemberRole] = useState("member");
  const [importDailyLimit, setImportDailyLimit] = useState("2000");

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");

  // 二次确认弹窗状态
  const [memberRemoveConfirm, setMemberRemoveConfirm] = useState<Member | null>(null);
  const [memberDisableConfirm, setMemberDisableConfirm] = useState<Member | null>(null);
  const [memberEnableConfirm, setMemberEnableConfirm] = useState<Member | null>(null);
  const [orgDisableConfirm, setOrgDisableConfirm] = useState<Org | null>(null);
  const [orgEnableConfirm, setOrgEnableConfirm] = useState<Org | null>(null);

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
    if (!newOrgName.trim() || !enterprise) return;
    
    // 确定 parent_id：部门视图用 selectedOrg，企业视图用根部门
    let parentId: string | null = null;
    if (viewMode === "department" && selectedOrg) {
      parentId = selectedOrg.id;
    } else {
      // 企业视图下，找第一个根部门作为 parent
      const rootOrg = orgs.find((o) => !o.parent_id);
      if (!rootOrg) {
        toast({ title: "创建失败", description: "未找到根部门", variant: "destructive" });
        return;
      }
      parentId = rootOrg.id;
    }
    
    if (!parentId) return;
    
    try {
      const newOrg = await createOrganization(enterprise.id, newOrgName.trim(), parentId, {
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
      // 更新所有选中的管理员角色为 org_admin
      for (const phone of newAdminPhones) {
        const mockData = getMockData();
        const memberIndex = mockData.members.findIndex(
          (m) => m.user_phone === phone && m.enterprise_id === enterprise.id
        );
        if (memberIndex !== -1) {
          mockData.members[memberIndex].role = "org_admin";
          mockData.members[memberIndex].organization_id = setAdminOrg.id;
          localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
        }
      }
      
      toast({ title: "部门管理员已更新", description: `已设置 ${newAdminPhones.length} 位管理员` });
      setSetAdminOrg(null);
      setNewAdminPhones([]);
      setAdminSelectSearch("");
      loadInitialData();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleDemoteAdmin = async (phone: string) => {
    if (!setAdminOrg || !enterprise) return;
    try {
      const mockData = getMockData();
      const memberIndex = mockData.members.findIndex(
        (m) => m.user_phone === phone && m.enterprise_id === enterprise.id
      );
      if (memberIndex !== -1) {
        mockData.members[memberIndex].role = "member";
        localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
      }
      
      toast({ title: "已降级", description: "该成员已降为普通成员" });
      setDemoteConfirmMember(null);
      loadInitialData();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };



  const handleImportMembers = async () => {
    if (!selectedOrg || !enterprise || selectedMembersForImport.length === 0) {
      toast({ title: "请至少选择一个成员", variant: "destructive" });
      return;
    }

    try {
      for (const phone of selectedMembersForImport) {
        // 更新现有成员的 organization_id 和 role
        const mockData = getMockData();
        const memberIndex = mockData.members.findIndex(
          (m) => m.user_phone === phone && m.enterprise_id === enterprise.id
        );
        if (memberIndex !== -1) {
          mockData.members[memberIndex].organization_id = selectedOrg.id;
          mockData.members[memberIndex].role = importMemberRole as "admin" | "org_admin" | "member";
          mockData.members[memberIndex].daily_limit = Number(importDailyLimit) || null;
          localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
        }
      }

      toast({ title: "导入成功", description: `已成功导入 ${selectedMembersForImport.length} 位成员` });
      setImportMemberSearch("");
      setSelectedMembersForImport([]);
      setImportMemberRole("member");
      setImportDailyLimit("2000");
      setAddMemberOpen(false);
      fetchMembers(selectedOrg.id);
      loadInitialData();
    } catch (e: any) {
      toast({ title: "导入失败", description: e?.message, variant: "destructive" });
    }
  };

  const handleEditMemberRole = async () => {
    if (!editMember) return;
    try {
      const mockData = getMockData();
      const idx = mockData.members.findIndex((m) => m.id === editMember.id);
      if (idx !== -1) {
        mockData.members[idx].role = editMemberRole;
        localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
      }
      toast({ title: "角色已更新" });
      setEditMemberOpen(false);
      setEditMember(null);
      if (selectedOrg) fetchMembers(selectedOrg.id);
      loadInitialData();
    } catch {
      toast({ title: "更新失败", variant: "destructive" });
    }
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
    setMemberRemoveConfirm(null);
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
    toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
    setMemberDisableConfirm(null);
    setMemberEnableConfirm(null);
  };

  const handleToggleStatus = async (org: Org) => {
    const newStatus = org.status === "active" ? "disabled" : "active";
    try {
      await updateOrganization(org.id, { status: newStatus as "active" | "inactive" });
      toast({ title: newStatus === "active" ? "已启用" : "已禁用" });
      setOrgDisableConfirm(null);
      setOrgEnableConfirm(null);
      loadInitialData();
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
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
                                    // 获取当前部门的 org_admin 作为已选
                                    const mockData = getMockData();
                                    const currentAdmins = mockData.members
                                      .filter(m => m.organization_id === org.id && m.role === "org_admin")
                                      .map(m => m.user_phone);
                                    setNewAdminPhones(currentAdmins);
                                    setAdminSelectSearch("");
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
                                    <DropdownMenuItem onClick={() => org.status === "active" ? setOrgDisableConfirm(org) : setOrgEnableConfirm(org)}>
                                      <Power className="h-4 w-4 mr-2" />
                                      {org.status === "active" ? "禁用" : "启用"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        if ((org.memberCount || 0) > 0 || (org.childCount || 0) > 0) {
                                          setCannotDeleteOrg(org);
                                        } else {
                                          setDeleteOrgConfirm(org);
                                        }
                                      }}
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
                        导入成员
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
                                      setEditMember(member);
                                      setEditMemberRole(member.role === "org_admin" ? "org_admin" : "member");
                                      setEditMemberOpen(true);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Pencil className="h-4 w-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => setMemberRemoveConfirm(member)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => member.status === "active" ? setMemberDisableConfirm(member) : setMemberEnableConfirm(member)}
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
                                      // 获取当前部门的 org_admin 作为已选
                                      const mockData = getMockData();
                                      const currentAdmins = mockData.members
                                        .filter(m => m.organization_id === org.id && m.role === "org_admin")
                                        .map(m => m.user_phone);
                                      setNewAdminPhones(currentAdmins);
                                      setAdminSelectSearch("");
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
                                      <DropdownMenuItem onClick={() => org.status === "active" ? setOrgDisableConfirm(org) : setOrgEnableConfirm(org)}>
                                        <Power className="h-4 w-4 mr-2" />
                                        {org.status === "active" ? "禁用" : "启用"}
                                      </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        if ((org.memberCount || 0) > 0 || (org.childCount || 0) > 0) {
                                          setCannotDeleteOrg(org);
                                        } else {
                                          setDeleteOrgConfirm(org);
                                        }
                                      }}
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

      {/* 成员移除确认弹窗 */}
      <Dialog open={!!memberRemoveConfirm} onOpenChange={() => setMemberRemoveConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              确认将成员「{memberRemoveConfirm?.name}」从本部门移除？
            </DialogTitle>
          </DialogHeader>
          
          {memberRemoveConfirm && (() => {
            const mockData = getMockData();
            const user = mockData.users.find(u => u.phone === memberRemoveConfirm.user_phone);
            const uid = user?.uid || "-";
            // 获取该成员加入的所有部门
            const memberOrgs = mockData.members
              .filter(m => m.user_phone === memberRemoveConfirm.user_phone && m.organization_id)
              .map(m => {
                const org = mockData.organizations.find(o => o.id === m.organization_id);
                return org?.name;
              })
              .filter(Boolean);
            // 获取API Key数量
            const apiKeyCount = mockData.apiKeys?.filter(k => k.user_phone === memberRemoveConfirm.user_phone).length || 0;
            
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-foreground">
                  移除后，该成员将不再属于本部门，但其在企业内的账号和其他部门权限不受影响。
                </p>

                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">成员：</span>
                    <span className="font-medium text-foreground">{memberRemoveConfirm.name} ({uid})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">涉及部门：</span>
                    <span className="font-medium text-foreground">{memberOrgs.length > 0 ? memberOrgs.join("、") : "未分配"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">涉及 Key：</span>
                    <span className="font-medium text-foreground">{apiKeyCount} 个</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  注：如需彻底删除该成员，请前往「成员管理」页面操作。
                </p>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMemberRemoveConfirm(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => memberRemoveConfirm && handleDeleteMember(memberRemoveConfirm)}>
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成员禁用确认弹窗 */}
      <Dialog open={!!memberDisableConfirm} onOpenChange={() => setMemberDisableConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              确认禁用成员「{memberDisableConfirm?.name}」？
            </DialogTitle>
          </DialogHeader>
          
          {memberDisableConfirm && (() => {
            const mockData = getMockData();
            const user = mockData.users.find(u => u.phone === memberDisableConfirm.user_phone);
            const uid = user?.uid || "-";
            // 获取该成员加入的所有部门
            const memberOrgs = mockData.members
              .filter(m => m.user_phone === memberDisableConfirm.user_phone && m.organization_id)
              .map(m => {
                const org = mockData.organizations.find(o => o.id === m.organization_id);
                return org?.name;
              })
              .filter(Boolean);
            // 获取API Key数量
            const apiKeyCount = mockData.apiKeys?.filter(k => k.user_phone === memberDisableConfirm.user_phone).length || 0;
            
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-foreground">
                  禁用后，该成员在本部门的所有 API Key 将立即停止调用，且无法访问本部门资源，重新启用后可恢复。
                </p>

                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">成员：</span>
                    <span className="font-medium text-foreground">{memberDisableConfirm.name} ({uid})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">涉及部门：</span>
                    <span className="font-medium text-foreground">{memberOrgs.length > 0 ? memberOrgs.join("、") : "未分配"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">涉及 Key：</span>
                    <span className="font-medium text-foreground">{apiKeyCount} 个</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  注：此操作仅影响该成员在本部门的权限，不影响其在其他部门或企业全局的状态。
                </p>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMemberDisableConfirm(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => memberDisableConfirm && handleToggleMemberStatus(memberDisableConfirm)}>
              确认禁用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成员启用确认弹窗 */}
      <Dialog open={!!memberEnableConfirm} onOpenChange={() => setMemberEnableConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">ℹ️</span>
              确认启用成员「{memberEnableConfirm?.name}」？
            </DialogTitle>
          </DialogHeader>
          
          {memberEnableConfirm && (() => {
            const mockData = getMockData();
            const user = mockData.users.find(u => u.phone === memberEnableConfirm.user_phone);
            const uid = user?.uid || "-";
            // 获取该成员加入的所有部门
            const memberOrgs = mockData.members
              .filter(m => m.user_phone === memberEnableConfirm.user_phone && m.organization_id)
              .map(m => {
                const org = mockData.organizations.find(o => o.id === m.organization_id);
                return org?.name;
              })
              .filter(Boolean);
            // 获取API Key数量
            const apiKeyCount = mockData.apiKeys?.filter(k => k.user_phone === memberEnableConfirm.user_phone).length || 0;
            
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-foreground">
                  启用后，该成员将恢复对本部门资源的访问权限，名下的 API Key 将同步恢复可用。
                </p>
                
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">成员：</span>
                    <span className="font-medium text-foreground">{memberEnableConfirm.name} ({uid})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">涉及部门：</span>
                    <span className="font-medium text-foreground">{memberOrgs.length > 0 ? memberOrgs.join("、") : "未分配"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">涉及 Key：</span>
                    <span className="font-medium text-foreground">{apiKeyCount} 个</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  注：启用后，该成员将恢复原有的部门内权限配置。
                </p>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMemberEnableConfirm(null)}>
              取消
            </Button>
            <Button onClick={() => memberEnableConfirm && handleToggleMemberStatus(memberEnableConfirm)}>
              确认启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 部门禁用确认弹窗 */}
      <Dialog open={!!orgDisableConfirm} onOpenChange={() => setOrgDisableConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              确认禁用部门「{orgDisableConfirm?.name}」？
            </DialogTitle>
          </DialogHeader>

          {orgDisableConfirm && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                禁用后，该部门及其<span className="font-medium text-destructive">所有子部门</span>的成员将无法访问部门资源，<span className="font-medium text-destructive">所有 API Key 将立即停止调用</span>。
              </p>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">部门：</span>
                  <span className="font-medium text-foreground">{orgDisableConfirm.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">成员数：</span>
                  <span className="font-medium text-foreground">{orgDisableConfirm.memberCount || 0} 人</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                注：部门禁用不会影响成员在企业其他部门的权限。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOrgDisableConfirm(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => orgDisableConfirm && handleToggleStatus(orgDisableConfirm)}>
              确认禁用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 部门启用确认弹窗 */}
      <Dialog open={!!orgEnableConfirm} onOpenChange={() => setOrgEnableConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">ℹ️</span>
              确认启用部门「{orgEnableConfirm?.name}」？
            </DialogTitle>
          </DialogHeader>

          {orgEnableConfirm && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                启用后，该部门及其<span className="font-medium text-primary">所有子部门</span>的成员将恢复访问权限，<span className="font-medium text-primary">所有 API Key 将同步恢复调用</span>。
              </p>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">部门：</span>
                  <span className="font-medium text-foreground">{orgEnableConfirm.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">成员数：</span>
                  <span className="font-medium text-foreground">{orgEnableConfirm.memberCount || 0} 人</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                注：启用后，部门成员将恢复原有的权限配置。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOrgEnableConfirm(null)}>
              取消
            </Button>
            <Button onClick={() => orgEnableConfirm && handleToggleStatus(orgEnableConfirm)}>
              确认启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                
                const selectedNames = newOrgAdmins.map(phone => {
                  const user = mockData.users.find((u) => u.phone === phone);
                  return user?.name || phone;
                });
                
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        <span className={newOrgAdmins.length > 0 ? "text-gray-900" : "text-gray-400"}>
                          {newOrgAdmins.length > 0 
                            ? selectedNames.join("、") 
                            : "不指定时默认该部门由上级管理员管理"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="搜索成员"
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1">
                        {availableMembers.length === 0 ? (
                          <div className="py-4 text-center text-sm text-gray-400">
                            未找到成员
                          </div>
                        ) : (
                          availableMembers.map((m) => {
                            const isSelected = newOrgAdmins.includes(m.phone);
                            return (
                              <div
                                key={m.phone}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  if (isSelected) {
                                    setNewOrgAdmins(newOrgAdmins.filter(p => p !== m.phone));
                                  } else {
                                    if (newOrgAdmins.length < 3) {
                                      setNewOrgAdmins([...newOrgAdmins, m.phone]);
                                    } else {
                                      toast({ title: "最多只能选择3个管理员", variant: "destructive" });
                                    }
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {}}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-sm">{m.name}</span>
                                  <span className="text-xs text-gray-400">
                                    {m.phone.slice(0, 3)}****{m.phone.slice(-4)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              确认删除部门「{deleteOrgConfirm?.name}」？
            </DialogTitle>
          </DialogHeader>

          {deleteOrgConfirm && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                删除后，该部门将被<span className="font-medium text-destructive">永久删除</span>，<span className="font-medium text-destructive">不可恢复</span>。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOrgConfirm(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrg}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cannot Delete Org Dialog */}
      <Dialog open={!!cannotDeleteOrg} onOpenChange={() => setCannotDeleteOrg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              无法删除部门「{cannotDeleteOrg?.name}」
            </DialogTitle>
          </DialogHeader>

          {cannotDeleteOrg && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                该部门还有 <span className="font-medium text-destructive">{cannotDeleteOrg.memberCount || 0} 位成员</span>、<span className="font-medium text-destructive">{cannotDeleteOrg.childCount || 0} 个子部门</span>，请先清理后再删除。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button onClick={() => setCannotDeleteOrg(null)}>
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Admin Dialog */}
      <Dialog 
        open={!!setAdminOrg} 
        onOpenChange={(open) => {
          if (!open) {
            setNewAdminPhones([]);
            setAdminSelectSearch("");
          }
          setSetAdminOrg(open ? setAdminOrg : null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>设置部门管理员</DialogTitle>
          </DialogHeader>
          {(() => {
            const mockData = getMockData();
            // 获取企业所有成员（排除企业管理员）
            const enterpriseMembers = mockData.members.filter(
              (m) => m.enterprise_id === enterprise?.id && m.role !== "admin"
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
                !adminSelectSearch || 
                m.name.toLowerCase().includes(adminSelectSearch.toLowerCase()) ||
                m.phone.includes(adminSelectSearch)
              );
            
            const selectedAdminDetails = newAdminPhones.map(phone => {
              const user = mockData.users.find(u => u.phone === phone);
              return { phone, name: user?.name || phone };
            });

            // 获取当前已设定的管理员名单（部门内的 org_admin）
            const currentAdmins = enterpriseMembers.filter(
              m => m.organization_id === setAdminOrg?.id && m.role === "org_admin"
            ).map(m => {
              const user = mockData.users.find(u => u.phone === m.user_phone);
              return { phone: m.user_phone, name: user?.name || m.user_phone };
            });
            
            return (
              <div className="space-y-4 py-2">
                {/* 双栏选择区域 */}
                <div className="grid grid-cols-2 gap-4 h-64">
                  {/* 左侧：可选成员 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b text-sm text-gray-600">
                      从用户池选择管理员（最多3人）
                    </div>
                    <div className="p-2 border-b">
                      <Input
                        placeholder="搜索姓名或手机号"
                        value={adminSelectSearch}
                        onChange={(e) => setAdminSelectSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-80px)]">
                      {availableMembers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">
                          暂无可用成员
                        </div>
                      ) : (
                        availableMembers.map(m => {
                          const isSelected = newAdminPhones.includes(m.phone);
                          const isDisabled = !isSelected && newAdminPhones.length >= 3;
                          return (
                            <div
                              key={m.phone}
                              className={`flex items-center gap-2 px-3 py-2 ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"}`}
                              onClick={() => {
                                if (isDisabled) return;
                                if (isSelected) {
                                  setNewAdminPhones(prev => prev.filter(p => p !== m.phone));
                                } else {
                                  setNewAdminPhones(prev => [...prev, m.phone]);
                                }
                              }}
                            >
                              <Checkbox checked={isSelected} />
                              <span className="text-sm flex-1">{m.name}</span>
                              <span className="text-xs text-gray-400">
                                {m.phone.slice(0, 3)}****{m.phone.slice(-4)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* 右侧：已选管理员（标签形式） */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-sm text-gray-600">已选择：{newAdminPhones.length}/3</span>
                      {newAdminPhones.length > 0 && (
                        <button 
                          className="text-xs text-blue-500 hover:text-blue-600"
                          onClick={() => setNewAdminPhones([])}
                        >
                          清空已选
                        </button>
                      )}
                    </div>
                    <div className="p-3 overflow-y-auto h-[calc(100%-40px)]">
                      {selectedAdminDetails.length === 0 ? (
                        <div className="text-center text-sm text-gray-400 py-8">
                          请选择管理员
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedAdminDetails.map(m => (
                            <div key={m.phone} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                              <span>{m.name}</span>
                              <button
                                className="ml-1 text-blue-500 hover:text-blue-700"
                                onClick={() => setNewAdminPhones(prev => prev.filter(p => p !== m.phone))}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 当前已设定的管理员列表 */}
                {currentAdmins.length > 0 && (
                  <div className="border rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-2">当前部门管理员</div>
                    <div className="space-y-2">
                      {currentAdmins.map(admin => (
                        <div key={admin.phone} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{admin.name}</span>
                            <span className="text-xs text-gray-400">
                              {admin.phone.slice(0, 3)}****{admin.phone.slice(-4)}
                            </span>
                          </div>
                          <button
                            onClick={() => setDemoteConfirmMember(admin)}
                            className="text-xs text-orange-500 hover:text-orange-600 border border-orange-200 hover:border-orange-300 px-2 py-1 rounded transition-colors"
                            title="降级为普通成员"
                          >
                            降级
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setNewAdminPhones([]);
                setAdminSelectSearch("");
                setSetAdminOrg(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleSetAdmin}>
              保存 ({newAdminPhones.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demote Confirm Dialog */}
      <Dialog open={!!demoteConfirmMember} onOpenChange={() => setDemoteConfirmMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认降级</DialogTitle>
            <DialogDescription>
              确定要将「{demoteConfirmMember?.name}」降级为普通成员吗？
              <br />
              该成员将仍然留在本部门，但不再拥有部门管理员权限。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemoteConfirmMember(null)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => demoteConfirmMember && handleDemoteAdmin(demoteConfirmMember.phone)}
            >
              确认降级
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Members Dialog */}
      <Dialog 
        open={addMemberOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setImportMemberSearch("");
            setSelectedMembersForImport([]);
            setImportMemberRole("member");
            setImportDailyLimit("2000");
          }
          setAddMemberOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入成员</DialogTitle>
          </DialogHeader>
          {(() => {
            const mockData = getMockData();
            // 获取企业所有成员
            const enterpriseMembers = mockData.members.filter(
              (m) => m.enterprise_id === enterprise?.id
            );
            // 筛选出未在当前部门的成员（且不是 admin 角色的企业管理员）
            const currentOrgMemberPhones = members.map(m => m.user_phone);
            const availableMembers = enterpriseMembers
              .filter(m => !currentOrgMemberPhones.includes(m.user_phone) && m.role !== "admin")
              .map(m => {
                const user = mockData.users.find(u => u.phone === m.user_phone);
                return {
                  phone: m.user_phone,
                  name: user?.name || m.user_phone,
                };
              })
              .filter(m => 
                !importMemberSearch || 
                m.name.toLowerCase().includes(importMemberSearch.toLowerCase()) ||
                m.phone.includes(importMemberSearch)
              );
            
            const selectedMemberDetails = selectedMembersForImport.map(phone => {
              const user = mockData.users.find(u => u.phone === phone);
              return { phone, name: user?.name || phone };
            });
            
            return (
              <div className="space-y-4 py-2">
                {/* 双栏选择区域 */}
                <div className="grid grid-cols-2 gap-4 h-64">
                  {/* 左侧：可选成员 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b text-sm text-gray-600">
                      从用户池选择成员
                    </div>
                    <div className="p-2 border-b">
                      <Input
                        placeholder="搜索姓名或手机号"
                        value={importMemberSearch}
                        onChange={(e) => setImportMemberSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-80px)]">
                      {availableMembers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">
                          暂无可用成员
                        </div>
                      ) : (
                        availableMembers.map(m => {
                          const isSelected = selectedMembersForImport.includes(m.phone);
                          return (
                            <div
                              key={m.phone}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedMembersForImport(prev => prev.filter(p => p !== m.phone));
                                } else {
                                  setSelectedMembersForImport(prev => [...prev, m.phone]);
                                }
                              }}
                            >
                              <Checkbox checked={isSelected} />
                              <span className="text-sm flex-1">{m.name}</span>
                              <span className="text-xs text-gray-400">
                                {m.phone.slice(0, 3)}****{m.phone.slice(-4)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* 右侧：已选成员 */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-sm text-gray-600">已选择：{selectedMembersForImport.length}人</span>
                      {selectedMembersForImport.length > 0 && (
                        <button 
                          className="text-xs text-blue-500 hover:text-blue-600"
                          onClick={() => setSelectedMembersForImport([])}
                        >
                          清空已选
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto h-[calc(100%-40px)]">
                      {selectedMemberDetails.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">
                          请选择成员
                        </div>
                      ) : (
                        selectedMemberDetails.map(m => (
                          <div key={m.phone} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                            <span className="text-sm">{m.name}</span>
                            <button
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => setSelectedMembersForImport(prev => prev.filter(p => p !== m.phone))}
                            >
                              <span className="text-lg leading-none">×</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 角色和单日上限设置 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">角色</Label>
                    <Select value={importMemberRole} onValueChange={setImportMemberRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">普通成员</SelectItem>
                        <SelectItem value="org_admin">部门管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600">单日上限（元）</Label>
                    <Input
                      type="number"
                      value={importDailyLimit}
                      onChange={(e) => setImportDailyLimit(e.target.value)}
                      min={0}
                    />
                  </div>
                </div>
                
                {/* 提示信息 */}
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• 以上为尚未分配至本部门的成员</p>
                  <p>• 如需添加新成员，请先在「成员管理」页面创建</p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setImportMemberSearch("");
                setSelectedMembersForImport([]);
                setImportMemberRole("member");
                setImportDailyLimit("2000");
                setAddMemberOpen(false);
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleImportMembers}
              disabled={selectedMembersForImport.length === 0}
            >
              导入 ({selectedMembersForImport.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberOpen} onOpenChange={(open) => {
        if (!open) {
          setEditMember(null);
          setEditMemberRole("member");
        }
        setEditMemberOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑成员</DialogTitle>
          </DialogHeader>
          {editMember && (
            <div className="space-y-4 py-2">
              {/* 成员手机号 - 只读 */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">成员手机号</Label>
                <Input
                  value={editMember.user_phone}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
              </div>
              {/* 姓名 - 只读 */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">姓名</Label>
                <Input
                  value={editMember.name || "未命名"}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
              </div>
              {/* 角色 - 可编辑 */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">角色</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="memberRole"
                      value="org_admin"
                      checked={editMemberRole === "org_admin"}
                      onChange={(e) => setEditMemberRole(e.target.value as "org_admin")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">部门管理员</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="memberRole"
                      value="member"
                      checked={editMemberRole === "member"}
                      onChange={(e) => setEditMemberRole(e.target.value as "member")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">普通成员</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditMember(null);
              setEditMemberRole("member");
              setEditMemberOpen(false);
            }}>
              取消
            </Button>
            <Button onClick={handleEditMemberRole}>确定</Button>
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
