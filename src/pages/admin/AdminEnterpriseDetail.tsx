import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Plus,
  UserCircle,
  Pencil,
  Power,
  ChevronRight,
  ChevronDown,
  FolderTree,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "@/lib/adminAuth";

interface EnterpriseDetail {
  id: string;
  name: string;
  owner_phone: string;
  enterprise_code: string;
  created_at: string;
}

interface Cert {
  status: string;
  company_name: string | null;
  credit_code: string | null;
  legal_person: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

interface BalanceSummary {
  balance: number;
  credit_balance: number;
  credit_limit: number;
  total_consumed: number;
}

interface BalanceRecord {
  id: string;
  amount: number;
  type: string;
  operator: string | null;
  remark: string | null;
  created_at: string;
}

interface Org {
  id: string;
  name: string;
  status: string;
  admin_phone: string | null;
  monthly_budget: number | null;
  current_month_budget: number | null;
  parent_id: string | null;
  memberCount?: number;
  adminName?: string | null;
  children?: Org[];
  level?: number;
}

interface Member {
  id: string;
  user_phone: string;
  role: string;
  status: string;
  daily_limit: number | null;
  organization_id: string | null;
  name?: string;
}

const CERT_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  uncertified: { label: "未认证", variant: "secondary", icon: <ShieldAlert className="w-4 h-4" /> },
  pending: { label: "待审核", variant: "default", icon: <Clock className="w-4 h-4" /> },
  approved: { label: "已通过", variant: "outline", icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
  rejected: { label: "已拒绝", variant: "destructive", icon: <XCircle className="w-4 h-4" /> },
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  recharge: "充值",
  credit_adjust: "授信调额",
  redeem_code: "兑换码",
  consume: "消耗",
  adjust: "调整",
};

// Demo data for when no real orgs exist yet
const DEMO_ORGS: Org[] = [
  { 
    id: "demo-1", 
    name: "产品部门", 
    status: "active", 
    admin_phone: "13800138001", 
    monthly_budget: 20000, 
    current_month_budget: 8400, 
    parent_id: null,
    memberCount: 12, 
    adminName: "陈志远",
    level: 0,
    children: [
      { id: "demo-2", name: "AA", status: "active", admin_phone: "13912340001", monthly_budget: 6000, current_month_budget: 5800, parent_id: "demo-1", memberCount: 5, adminName: "林晓雨", level: 1 },
      { id: "demo-3", name: "AAA", status: "active", admin_phone: "13612340002", monthly_budget: 8000, current_month_budget: 2100, parent_id: "demo-1", memberCount: 6, adminName: "王磊", level: 1 },
      { id: "demo-4", name: "部门A", status: "active", admin_phone: null, monthly_budget: null, current_month_budget: 0, parent_id: "demo-1", memberCount: 3, adminName: null, level: 1 },
      { id: "demo-5", name: "ABV", status: "active", admin_phone: "18800110022", monthly_budget: 12000, current_month_budget: 3200, parent_id: "demo-1", memberCount: 9, adminName: "张晴", level: 1 },
    ]
  },
];
const DEMO_MEMBERS: Member[] = [
  { id: "dm-1", user_phone: "13800138001", role: "admin",  status: "active", daily_limit: 500,  organization_id: "demo-1", name: "陈志远" },
  { id: "dm-2", user_phone: "13912340001", role: "member", status: "active", daily_limit: 200,  organization_id: "demo-1", name: "林晓雨" },
  { id: "dm-3", user_phone: "13612340002", role: "member", status: "active", daily_limit: null, organization_id: "demo-1", name: "王磊" },
  { id: "dm-4", user_phone: "18800110022", role: "admin",  status: "active", daily_limit: 300,  organization_id: "demo-5", name: "张晴" },
  { id: "dm-5", user_phone: "13311220033", role: "member", status: "active", daily_limit: 150,  organization_id: "demo-5", name: "刘伟强" },
  { id: "dm-6", user_phone: "13700000001", role: "member", status: "active", daily_limit: 200,  organization_id: "demo-5", name: "赵小明" },
];

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

export default function AdminEnterpriseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const session = getAdminSession();

  const [enterprise, setEnterprise] = useState<EnterpriseDetail | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [cert, setCert] = useState<Cert | null>(null);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary>({ balance: 0, credit_balance: 0, credit_limit: 0, total_consumed: 0 });
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [balanceRecords, setBalanceRecords] = useState<BalanceRecord[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Recharge dialog
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeType, setRechargeType] = useState<"balance" | "credit">("balance");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  // Credit-specific states
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState("");
  const [restoreClicked, setRestoreClicked] = useState(false);

  const openRechargeDialog = (type: "balance" | "credit" = "balance") => {
    setRechargeType(type);
    setRechargeAmount("");
    setRechargeRemark("");
    if (type === "credit") {
      const isFirstTime = (balanceSummary.credit_limit ?? 0) === 0;
      setEditingLimit(isFirstTime);
      setLimitDraft("");
      setRestoreClicked(false);
    } else {
      setEditingLimit(false);
      setLimitDraft("");
      setRestoreClicked(false);
    }
    setRechargeOpen(true);
  };

  // Certification review
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  // Edit Org dialog
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [editOrgTarget, setEditOrgTarget] = useState<Org | null>(null);
  const [editOrgBudget, setEditOrgBudget] = useState("");
  const [editOrgDailyLimit, setEditOrgDailyLimit] = useState("");
  const [editOrgLoading, setEditOrgLoading] = useState(false);

  // Edit Member dialog
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editMemberTarget, setEditMemberTarget] = useState<Member | null>(null);
  const [editMemberRole, setEditMemberRole] = useState("member");
  const [editMemberLimit, setEditMemberLimit] = useState("");
  const [editMemberLoading, setEditMemberLoading] = useState(false);

  // Ban confirm dialog
  const [banOpen, setBanOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<Member | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  // Disable/Enable Org dialog
  const [disableOrgOpen, setDisableOrgOpen] = useState(false);
  const [disableOrgTarget, setDisableOrgTarget] = useState<Org | null>(null);
  const [disableOrgLoading, setDisableOrgLoading] = useState(false);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);

    const [
      { data: ent },
      { data: certData },
      { data: bal },
      { count: keyCount },
      { data: mems },
      { data: records },
      { data: orgData },
    ] = await Promise.all([
      supabase.from("enterprises").select("*").eq("id", id).single(),
      supabase.from("enterprise_certifications").select("status,company_name,credit_code,legal_person,submitted_at,reviewed_at").eq("enterprise_id", id).maybeSingle(),
      supabase.from("enterprise_balances").select("balance,credit_balance,credit_limit,total_consumed").eq("enterprise_id", id).maybeSingle(),
      supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("enterprise_id", id),
      supabase.from("members").select("id,user_phone,role,status,daily_limit,organization_id").eq("enterprise_id", id),
      supabase.from("balance_records").select("id,amount,type,operator,remark,created_at").eq("enterprise_id", id).order("created_at", { ascending: false }),
      supabase.from("organizations").select("id,name,status,admin_phone,monthly_budget,current_month_budget,parent_id").eq("enterprise_id", id).order("created_at", { ascending: true }),
    ]);

    setEnterprise(ent || null);
    setCert(certData || null);
    setBalanceSummary({ balance: bal?.balance ?? 0, credit_balance: bal?.credit_balance ?? 0, credit_limit: bal?.credit_limit ?? 0, total_consumed: bal?.total_consumed ?? 0 });
    setApiKeyCount(keyCount ?? 0);
    setBalanceRecords(records || []);

    // Enrich members with user names + compute org member counts
    const rawMembers = mems || [];
    setMemberCount(rawMembers.length);

    // Collect all phones needed: owner + members + org admin_phones
    const ownerPhone = ent?.owner_phone;
    const memberPhones = rawMembers.map((m) => m.user_phone);
    const orgAdminPhones = (orgData || []).map((o) => o.admin_phone).filter(Boolean) as string[];
    const allPhones = [...new Set([...(ownerPhone ? [ownerPhone] : []), ...memberPhones, ...orgAdminPhones])];

    if (allPhones.length > 0) {
      const { data: users } = await supabase.from("users").select("phone,name").in("phone", allPhones);
      const nameMap = Object.fromEntries((users || []).map((u) => [u.phone, u.name]));
      if (ownerPhone) setOwnerName(nameMap[ownerPhone] ?? null);
      setMembers(rawMembers.map((m) => ({ ...m, name: nameMap[m.user_phone] || undefined })));

      // Compute member count per org
      const orgMemberCount = rawMembers.reduce((acc, m) => {
        if (m.organization_id) acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build org tree structure
      const orgList = (orgData || []).map((o) => ({
        ...o,
        memberCount: orgMemberCount[o.id] || 0,
        adminName: o.admin_phone ? (nameMap[o.admin_phone] || null) : null,
        children: [] as Org[],
        level: 0,
      }));

      // Build tree
      const orgMap = new Map<string, Org>();
      const rootOrgs: Org[] = [];
      
      orgList.forEach(o => orgMap.set(o.id, o));
      
      orgList.forEach(o => {
        if (o.parent_id && orgMap.has(o.parent_id)) {
          const parent = orgMap.get(o.parent_id)!;
          parent.children = parent.children || [];
          parent.children.push(o);
          o.level = parent.level! + 1;
        } else {
          rootOrgs.push(o);
        }
      });

      setOrgs(rootOrgs);

      // Auto-expand root orgs
      setExpandedOrgIds(new Set(rootOrgs.map(o => o.id)));

      // Fall back to demo data if this enterprise has no orgs yet
      if (!orgData || orgData.length === 0) {
        setOrgs(DEMO_ORGS);
        setMembers(DEMO_MEMBERS);
        setSelectedOrgId("demo-1");
      } else if (!selectedOrgId && rootOrgs.length > 0) {
        setSelectedOrgId(rootOrgs[0].id);
      }
    } else {
      setMembers([]);
      setOrgs(orgData || []);
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);



  const handleRecharge = async () => {
    const operator = session?.phone || "admin";
    const extraRemark = "";
    const currentLimit = balanceSummary.credit_limit ?? 0;

    setRechargeLoading(true);
    try {
      if (rechargeType === "balance") {
        const inputVal = parseFloat(rechargeAmount);
        if (isNaN(inputVal)) {
          toast({ title: "请输入有效金额", variant: "destructive" });
          setRechargeLoading(false);
          return;
        }
        const delta = inputVal;
        const { error } = await supabase.rpc("admin_recharge_enterprise", {
          p_enterprise_id: id!,
          p_amount: delta,
          p_operator: operator,
          p_type: "balance",
          p_extra_remark: extraRemark || null,
        });
        if (error) throw error;
        toast({ title: `已充值余额 ¥${delta.toFixed(2)}` });
      } else {
        // credit mode: three mutually exclusive scenarios
        const isFirstTime = currentLimit === 0;
        const newLimitVal = parseFloat(limitDraft);

        if (isFirstTime) {
          // A: 首次开授信
          if (limitDraft === "" || isNaN(newLimitVal) || newLimitVal < 0) {
            toast({ title: "请输入有效的初始授信额度", variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          // set limit and balance both to newLimitVal
          const { error: err1 } = await supabase.rpc("admin_set_credit_limit", {
            p_enterprise_id: id!,
            p_new_limit: newLimitVal,
            p_operator: operator,
            p_extra_remark: null,
          });
          if (err1) throw err1;
          const { error: err2 } = await supabase.rpc("admin_set_credit_balance", {
            p_enterprise_id: id!,
            p_new_balance: newLimitVal,
            p_operator: operator,
            p_extra_remark: extraRemark || null,
          });
          if (err2) throw err2;
          toast({ title: `初始授信已设置至 ¥${newLimitVal.toFixed(2)}` });
        } else if (!isNaN(newLimitVal) && Math.abs(newLimitVal - currentLimit) >= 0.01) {
          // B: 修改初始额度
          if (limitDraft === "" || isNaN(newLimitVal) || newLimitVal < 0) {
            toast({ title: "请输入有效的初始授信额度", variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          if (Math.abs(newLimitVal - currentLimit) < 0.01) {
            toast({ title: "初始额度未变化", variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          // 校验：新额度不能小于剩余授信额度
          const currentCreditBalance = balanceSummary.credit_balance ?? 0;
          if (newLimitVal < currentCreditBalance - 0.01) {
            toast({ title: `初始授信额度不能小于剩余授信额度 ¥${currentCreditBalance.toFixed(2)}`, variant: "destructive" });
            setRechargeLoading(false);
            return;
          }
          const { error } = await supabase.rpc("admin_set_credit_limit", {
            p_enterprise_id: id!,
            p_new_limit: newLimitVal,
            p_operator: operator,
            p_extra_remark: extraRemark || null,
          });
          if (error) throw error;
          toast({ title: `已调整初始授信至 ¥${newLimitVal.toFixed(2)}` });
        } else if (restoreClicked) {
          // C: 恢复至初始额度
          const { error } = await supabase.rpc("admin_set_credit_balance", {
            p_enterprise_id: id!,
            p_new_balance: currentLimit,
            p_operator: operator,
            p_extra_remark: extraRemark || null,
          });
          if (error) throw error;
          toast({ title: `剩余授信已恢复至 ¥${currentLimit.toFixed(2)}` });
        } else {
          setRechargeLoading(false);
          return;
        }
      }
      setRechargeOpen(false);
      setRechargeAmount("");
      setRechargeRemark("");
      setEditingLimit(false);
      setLimitDraft("");
      setRestoreClicked(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: "操作失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    setReviewLoading(status);
    const { error } = await supabase.rpc("admin_review_certification", {
      p_enterprise_id: id!,
      p_status: status,
    });
    setReviewLoading(null);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "已通过认证" : "已拒绝认证" });
      fetchAll();
    }
  };

  const handleEditOrg = async () => {
    if (!editOrgTarget) return;
    setEditOrgLoading(true);
    const budget = editOrgBudget !== "" ? parseFloat(editOrgBudget) : null;
    const { error } = await supabase
      .from("organizations")
      .update({ current_month_budget: budget })
      .eq("id", editOrgTarget.id);
    if (!error && editOrgDailyLimit !== "") {
      const limit = parseFloat(editOrgDailyLimit);
      if (!isNaN(limit)) {
        await supabase
          .from("members")
          .update({ daily_limit: limit })
          .eq("organization_id", editOrgTarget.id);
      }
    }
    setEditOrgLoading(false);
    if (error) {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "组织设置已更新" });
      setEditOrgOpen(false);
      fetchAll();
    }
  };

  const handleEditMember = async () => {
    if (!editMemberTarget) return;
    setEditMemberLoading(true);

    // Update both role and daily_limit
    const limit = editMemberLimit !== "" ? parseFloat(editMemberLimit) : null;
    const { error } = await supabase
      .from("members")
      .update({ role: editMemberRole, daily_limit: limit })
      .eq("id", editMemberTarget.id);

    setEditMemberLoading(false);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "成员信息已更新" });
      setEditMemberOpen(false);
      fetchAll();
    }
  };

  const handleBanMember = async () => {
    if (!banTarget) return;
    setBanLoading(true);
    const newStatus = banTarget.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("members")
      .update({ status: newStatus })
      .eq("id", banTarget.id);
    setBanLoading(false);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "active" ? "成员已启用" : "成员已禁用" });
      setBanOpen(false);
      fetchAll();
    }
  };

  const handleDisableOrg = async () => {
    if (!disableOrgTarget) return;
    setDisableOrgLoading(true);
    const newStatus = disableOrgTarget.status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("organizations")
      .update({ status: newStatus })
      .eq("id", disableOrgTarget.id);
    setDisableOrgLoading(false);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "active" ? "组织已启用" : "组织已禁用" });
      setDisableOrgOpen(false);
      setDisableOrgTarget(null);
      fetchAll();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-muted-foreground">加载中…</div>
    );
  }

  if (!enterprise) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 gap-3">
        <p className="text-muted-foreground">企业不存在</p>
        <Button variant="outline" onClick={() => navigate("/admin/enterprises")}>返回列表</Button>
      </div>
    );
  }

  const certStatus = cert?.status || "uncertified";
  const certCfg = CERT_STATUS_CONFIG[certStatus] || CERT_STATUS_CONFIG.uncertified;
  const orgMembers = members.filter((m) => m.organization_id === selectedOrgId);
  
  // Helper function to find org in tree
  const findOrgInTree = (orgList: Org[], id: string): Org | null => {
    for (const org of orgList) {
      if (org.id === id) return org;
      if (org.children) {
        const found = findOrgInTree(org.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  // Helper function to get all child orgs
  const getChildOrgs = (org: Org): Org[] => {
    const children: Org[] = [];
    if (org.children) {
      for (const child of org.children) {
        children.push(child);
        children.push(...getChildOrgs(child));
      }
    }
    return children;
  };
  
  const selectedOrg = selectedOrgId ? findOrgInTree(orgs, selectedOrgId) : null;
  const subOrgs = selectedOrg ? getChildOrgs(selectedOrg) : [];
  const hasMembers = orgMembers.length > 0;
  const hasSubOrgs = subOrgs.length > 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-card">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/admin/enterprises")}>
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <div className="w-px h-4 bg-border" />
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">{enterprise.name}</h1>
        <Badge variant={certCfg.variant} className="text-xs ml-1">
          {certCfg.label}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{enterprise.enterprise_code}</span>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="info">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="finance">财务对账</TabsTrigger>
            <TabsTrigger value="org">组织架构</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Info */}
          <TabsContent value="info" className="mt-4 space-y-4">
            {/* Basic Info Card */}
            <div className="bg-card border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">企业基本信息</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">企业名称</p>
                  <p className="font-medium text-foreground">{enterprise.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">企业 ID</p>
                  <p className="font-mono text-foreground">{enterprise.enterprise_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">创建时间</p>
                  <p className="text-foreground">{new Date(enterprise.created_at).toLocaleString("zh-CN")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">企业管理员</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-primary border border-primary/20">
                      <UserCircle className="w-3.5 h-3.5" />
                      {`${ownerName || "用户"} · ${maskPhone(enterprise.owner_phone)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Certification Card — always shown */}
            <div className="bg-card border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">企业认证</h3>
              {certStatus === "uncertified" && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-muted/40 text-center">
                  <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">该企业尚未提交认证</p>
                </div>
              )}
              {certStatus === "pending" && cert && (
                <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">待审核</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      { label: "公司名称", value: cert.company_name || "—" },
                      { label: "统一信用代码", value: cert.credit_code || "—" },
                      { label: "法定代表人", value: cert.legal_person || "—" },
                      { label: "提交时间", value: cert.submitted_at ? new Date(cert.submitted_at).toLocaleString("zh-CN") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="text-primary border-primary/20 hover:bg-primary/10" disabled={reviewLoading === "approved"} onClick={() => handleReview("approved")}>
                      <CheckCircle className="w-4 h-4 mr-1.5" />通过认证
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10" disabled={reviewLoading === "rejected"} onClick={() => handleReview("rejected")}>
                      <XCircle className="w-4 h-4 mr-1.5" />拒绝认证
                    </Button>
                  </div>
                </div>
              )}
              {certStatus === "approved" && cert && (
                <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">已通过认证</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      { label: "公司名称", value: cert.company_name || "—" },
                      { label: "统一信用代码", value: cert.credit_code || "—" },
                      { label: "法定代表人", value: cert.legal_person || "—" },
                      { label: "提交时间", value: cert.submitted_at ? new Date(cert.submitted_at).toLocaleString("zh-CN") : "—" },
                      { label: "审核时间", value: cert.reviewed_at ? new Date(cert.reviewed_at).toLocaleString("zh-CN") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {certStatus === "rejected" && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">认证已被拒绝</p>
                    {cert?.reviewed_at && <p className="text-xs text-muted-foreground mt-0.5">审核时间：{new Date(cert.reviewed_at).toLocaleString("zh-CN")}</p>}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Finance */}
          <TabsContent value="finance" className="mt-4">
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-sm font-semibold text-foreground">充值 / 消费记录</h3>
                <Button size="sm" onClick={() => openRechargeDialog()}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  添加金额
                </Button>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_2fr] gap-4 px-5 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>时间</span>
                <span>类型</span>
                <span>金额 (¥)</span>
                <span>操作人</span>
                <span>备注</span>
              </div>

              {balanceRecords.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">暂无记录</div>
              ) : (
                balanceRecords.map((r) => (
                  <div key={r.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_2fr] gap-4 px-5 py-3 text-sm border-b last:border-0 items-center">
                    <span className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString("zh-CN")}</span>
                    <span>
                      <Badge variant={r.type === "recharge" ? "outline" : r.type === "consume" ? "destructive" : "secondary"} className="text-xs">
                        {RECORD_TYPE_LABELS[r.type] || r.type}
                      </Badge>
                    </span>
                    <span className={`font-medium ${r.amount >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {r.amount >= 0 ? "+" : ""}¥{r.amount.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-xs">{r.operator || "—"}</span>
                    <span className="text-muted-foreground text-xs truncate">{r.remark || "—"}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Org Structure */}
          <TabsContent value="org" className="mt-4">
            <div className="bg-card border rounded-xl overflow-hidden">
              {orgs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">该企业暂未创建组织</div>
              ) : (
                <div className="grid grid-cols-[280px_1fr] min-h-[400px]">
                  {/* Left: Org Tree */}
                  <div className="border-r">
                    <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">组织架构</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{orgs.length} 个部门</span>
                    </div>
                    <div className="overflow-y-auto">
                      {(() => {
                        // Helper function to count total orgs
                        const countAllOrgs = (orgList: Org[]): number => {
                          return orgList.reduce((acc, o) => acc + 1 + (o.children?.length || 0), 0);
                        };

                        // Recursive render function
                        const renderOrgTree = (orgList: Org[]) => {
                          return orgList.map((org) => {
                            const isExpanded = expandedOrgIds.has(org.id);
                            const hasChildren = org.children && org.children.length > 0;
                            const isSelected = selectedOrgId === org.id;
                            
                            return (
                              <div key={org.id}>
                                <div
                                  className={`flex items-center gap-1 px-3 py-2.5 border-b hover:bg-muted/30 cursor-pointer transition-colors ${
                                    isSelected ? "bg-primary/10" : ""
                                  }`}
                                  style={{ paddingLeft: `${12 + (org.level || 0) * 16}px` }}
                                  onClick={() => setSelectedOrgId(org.id)}
                                >
                                  {/* Expand/Collapse button */}
                                  {hasChildren ? (
                                    <button
                                      className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newExpanded = new Set(expandedOrgIds);
                                        if (isExpanded) {
                                          newExpanded.delete(org.id);
                                        } else {
                                          newExpanded.add(org.id);
                                        }
                                        setExpandedOrgIds(newExpanded);
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="w-5" />
                                  )}
                                  
                                  {/* Org name */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${isSelected ? "text-primary font-medium" : "text-foreground"}`}>
                                      {org.name}
                                    </p>
                                  </div>
                                  
                                  {/* Status badge */}
                                  <Badge
                                    variant={org.status === "active" ? "outline" : "secondary"}
                                    className="text-[10px] px-1.5 py-0 shrink-0"
                                  >
                                    {org.status === "active" ? "正常" : "已禁用"}
                                  </Badge>
                                  
                                  {/* Edit button */}
                                  <button
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditOrgTarget(org);
                                      setEditOrgBudget(org.current_month_budget != null ? String(org.current_month_budget) : "");
                                      setEditOrgDailyLimit("");
                                      setEditOrgOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>

                                  {/* Disable/Enable button */}
                                  <button
                                    className={`p-1 rounded hover:bg-muted transition-colors shrink-0 ${
                                      org.status === "active"
                                        ? "text-muted-foreground hover:text-destructive"
                                        : "text-muted-foreground hover:text-green-600"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDisableOrgTarget(org);
                                      setDisableOrgOpen(true);
                                    }}
                                    title={org.status === "active" ? "停用组织" : "启用组织"}
                                  >
                                    <Power className="w-3 h-3" />
                                  </button>
                                </div>
                                
                                {/* Render children if expanded */}
                                {isExpanded && hasChildren && renderOrgTree(org.children!)}
                              </div>
                            );
                          });
                        };
                        
                        return renderOrgTree(orgs);
                      })()}
                    </div>
                  </div>

                  {/* Right: Member panel */}
                  <div className="flex flex-col">
                    {/* Header */}
                    <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {selectedOrg?.name}
                        </p>
                        {hasSubOrgs && (
                          <span className="text-xs text-muted-foreground">
                            ({subOrgs.length} 个子部门)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        直属成员 ({orgMembers.length})
                      </span>
                    </div>

                    {/* Member list */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-3 px-5 py-2.5 bg-muted/20 text-xs font-medium text-muted-foreground border-b">
                      <span>成员</span>
                      <span>角色</span>
                      <span>单日上限</span>
                      <span>状态</span>
                      <span>操作</span>
                    </div>
                    {orgMembers.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
                        该组织暂无成员
                      </div>
                    ) : (
                      <div className="overflow-y-auto">
                        {orgMembers.map((m) => (
                          <div key={m.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-3 px-5 py-3 border-b last:border-0 text-sm items-center">
                            <div>
                              <p className="font-medium text-foreground">{m.name || "用户"}</p>
                              <p className="text-xs text-muted-foreground">{maskPhone(m.user_phone)}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {m.role === "admin" ? "部门管理员" : "普通成员"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {m.daily_limit != null ? `¥${m.daily_limit}` : "无限制"}
                            </span>
                            <span>
                              <Badge
                                variant={m.status === "active" ? "outline" : "secondary"}
                                className="text-xs"
                              >
                                {m.status === "active" ? "正常" : "已禁用"}
                              </Badge>
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Edit button */}
                              <button
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="编辑"
                                onClick={() => {
                                  setEditMemberTarget(m);
                                  setEditMemberRole(m.role);
                                  setEditMemberLimit(m.daily_limit != null ? String(m.daily_limit) : "");
                                  setEditMemberOpen(true);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {/* Disable/Enable button */}
                              <button
                                className={`p-1.5 rounded hover:bg-muted transition-colors ${
                                  m.status === "active"
                                    ? "text-muted-foreground hover:text-destructive"
                                    : "text-muted-foreground hover:text-green-600"
                                }`}
                                title={m.status === "active" ? "禁用" : "启用"}
                                onClick={() => {
                                  setBanTarget(m);
                                  setBanOpen(true);
                                }}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recharge Dialog */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加金额</DialogTitle>
          </DialogHeader>
          {(() => {
            const currentBalance = rechargeType === "balance" ? balanceSummary.balance : balanceSummary.credit_balance;
            const creditLimit = balanceSummary.credit_limit ?? 0;
            const isFirstTime = rechargeType === "credit" && creditLimit === 0;
            const amountNum = parseFloat(rechargeAmount);
            // balance 模式：输入值为增量
            const delta = isNaN(amountNum) ? 0 : amountNum;
            const newBalance = currentBalance + delta;

            // credit 模式下的派生值
            const newLimitDraft = parseFloat(limitDraft);
            const limitChanged = limitDraft !== "" && !isNaN(newLimitDraft) && Math.abs(newLimitDraft - creditLimit) >= 0.01;
            const alreadyAtLimit = Math.abs(currentBalance - creditLimit) < 0.01;

            // 提交按钮禁用条件
            let submitDisabled = rechargeLoading;
            let previewRemark: string | null = null;
            if (rechargeType === "balance") {
              submitDisabled = submitDisabled || rechargeAmount === "" || isNaN(amountNum) || amountNum === 0;
              if (!submitDisabled) {
                const actionLabel = delta >= 0 ? "充值" : "扣减";
                previewRemark = `${actionLabel}余额 ¥${Math.abs(delta).toFixed(2)}，余额由 ¥${currentBalance.toFixed(2)} 调整至 ¥${newBalance.toFixed(2)}`;
              }
            } else {
              if (isFirstTime) {
                submitDisabled = submitDisabled || limitDraft === "" || isNaN(newLimitDraft) || newLimitDraft < 0;
                if (!submitDisabled) {
                  previewRemark = `初始授信设置至 ¥${newLimitDraft.toFixed(2)}`;
                }
              } else if (limitChanged) {
                const currentCreditBalance = balanceSummary.credit_balance ?? 0;
                submitDisabled = submitDisabled || newLimitDraft < currentCreditBalance - 0.01;
                if (!submitDisabled) {
                  previewRemark = `调整初始授信至 ¥${newLimitDraft.toFixed(2)}`;
                }
              } else if (restoreClicked) {
                submitDisabled = submitDisabled || false;
                previewRemark = `恢复授信至 ¥${creditLimit.toFixed(2)}`;
              } else {
                submitDisabled = true;
              }
            }
            const finalRemark = previewRemark;

            return (
              <>
                <div className="space-y-1.5 py-1 text-sm">
                  <p className="text-muted-foreground">
                    企业：<span className="text-foreground font-medium">{enterprise?.name}</span>
                  </p>
                  {rechargeType === "balance" ? (
                    <p className="text-muted-foreground">
                      当前余额：
                      <span className="text-foreground font-medium tabular-nums">¥{currentBalance.toFixed(2)}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      当前剩余授信：
                      <span className="text-foreground font-medium tabular-nums">¥{currentBalance.toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>充值类型</Label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="detailRechargeType"
                          value="balance"
                          checked={rechargeType === "balance"}
                          onChange={() => {
                            setRechargeType("balance");
                            setRechargeAmount("");
                            setEditingLimit(false);
                            setLimitDraft("");
                            setRestoreClicked(false);
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium">充值余额</p>
                          <p className="text-xs text-muted-foreground">普通现金余额，可直接消费</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border rounded-md hover:border-blue-300 hover:bg-blue-50/30 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                        <input
                          type="radio"
                          name="detailRechargeType"
                          value="credit"
                          checked={rechargeType === "credit"}
                          onChange={() => {
                            const firstTime = (balanceSummary.credit_limit ?? 0) === 0;
                            setRechargeType("credit");
                            setRechargeAmount("");
                            setEditingLimit(firstTime);
                            setLimitDraft("");
                            setRestoreClicked(false);
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <p className="text-sm font-medium">授信额度</p>
                          <p className="text-xs text-muted-foreground">先用后付额度，账期后结算</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  {rechargeType === "balance" ? (
                    <div className="space-y-1.5">
                      <Label>充值金额 <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="请输入充值金额（支持负数）"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        新余额：
                        <span className="text-foreground">¥{currentBalance.toFixed(2)}</span>
                        {delta !== 0 && (
                          <>
                            <span className="mx-1">{delta >= 0 ? "+" : "-"}</span>
                            <span className="text-foreground">¥{Math.abs(delta).toFixed(2)}</span>
                            <span className="mx-1">=</span>
                            <span className={`font-semibold ${newBalance < 0 ? "text-red-600" : "text-foreground"}`}>¥{newBalance.toFixed(2)}</span>
                          </>
                        )}
                        {delta === 0 && rechargeAmount !== "" && (
                          <>
                            <span className="mx-1">+</span>
                            <span className="text-foreground">¥0.00</span>
                            <span className="mx-1">=</span>
                            <span className="text-foreground font-semibold">¥{newBalance.toFixed(2)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* 初始授信额度（就地编辑） */}
                      <div className="space-y-1.5">
                        <Label>初始授信额度 {isFirstTime && <span className="text-red-500">*</span>}</Label>
                        {editingLimit ? (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                placeholder={isFirstTime ? "请输入初始授信额度" : "请输入新的初始授信额度"}
                                value={limitDraft}
                                onChange={(e) => setLimitDraft(e.target.value)}
                                className="pl-7"
                                autoFocus
                              />
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                              onClick={() => setEditingLimit(false)}
                              disabled={rechargeLoading || limitDraft === "" || isNaN(newLimitDraft) || newLimitDraft < 0 || (!isFirstTime && (!limitChanged || newLimitDraft < (balanceSummary.credit_balance ?? 0) - 0.01))}
                              title="确认"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            {!isFirstTime && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                onClick={() => {
                                  setEditingLimit(false);
                                  setLimitDraft("");
                                }}
                                disabled={rechargeLoading}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium tabular-nums">¥{(limitDraft !== "" && !isNaN(newLimitDraft) ? newLimitDraft : creditLimit).toFixed(2)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setLimitDraft(String(limitDraft !== "" && !isNaN(newLimitDraft) ? newLimitDraft : creditLimit));
                                setEditingLimit(true);
                                setRestoreClicked(false);
                              }}
                              disabled={rechargeLoading}
                              title="编辑初始授信额度"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        {editingLimit && !isFirstTime && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">修改初始额度不影响当前剩余额度</p>
                            {(() => {
                              const v = parseFloat(limitDraft);
                              const cb = balanceSummary.credit_balance ?? 0;
                              if (!isNaN(v) && v < cb - 0.01) {
                                return <p className="text-xs text-red-500">新值不能小于剩余授信额度</p>;
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* 剩余授信（只读展示 + 恢复按钮） */}
                      {!isFirstTime && (
                        <>
                          <div className="rounded-md bg-muted/40 px-3 py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">剩余授信额度</p>
                              <p className="text-lg font-semibold tabular-nums text-foreground">¥{(restoreClicked ? creditLimit : currentBalance).toFixed(2)}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => {
                                if (restoreClicked) {
                                  setRestoreClicked(false);
                                } else {
                                  setRestoreClicked(true);
                                  setEditingLimit(false);
                                  setLimitDraft("");
                                }
                              }}
                              disabled={rechargeLoading || alreadyAtLimit}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {restoreClicked ? "取消恢复" : "恢复至初始额度"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className="rounded-md bg-muted/50 border px-3 py-2 space-y-1">
                    <p className="text-xs text-muted-foreground">备注预览</p>
                    <p className="text-xs text-foreground break-words">{finalRemark}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRechargeOpen(false)} disabled={rechargeLoading}>取消</Button>
                  <Button onClick={handleRecharge} disabled={submitDisabled}>
                    {rechargeLoading ? "处理中…" : "确认保存"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Org Dialog */}
      <Dialog open={editOrgOpen} onOpenChange={setEditOrgOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑组织 · {editOrgTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>本月预算额度（元，留空表示无限制）</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="如：10000"
                value={editOrgBudget}
                onChange={(e) => setEditOrgBudget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>单日消耗上限（元，将应用到该组织所有成员）</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="如：500，留空不修改"
                value={editOrgDailyLimit}
                onChange={(e) => setEditOrgDailyLimit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrgOpen(false)}>取消</Button>
            <Button onClick={handleEditOrg} disabled={editOrgLoading}>
              {editOrgLoading ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberOpen} onOpenChange={setEditMemberOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              编辑成员 · {editMemberTarget?.name || "用户"} {editMemberTarget ? maskPhone(editMemberTarget.user_phone) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>角色</Label>
              <RadioGroup value={editMemberRole} onValueChange={setEditMemberRole} className="flex gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="member" id="role-member" />
                  <Label htmlFor="role-member" className="font-normal cursor-pointer">普通成员</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="admin" id="role-admin" />
                  <Label htmlFor="role-admin" className="font-normal cursor-pointer">部门管理员</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label>单日预算上限（元，留空表示无限制）</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="如：500"
                value={editMemberLimit}
                onChange={(e) => setEditMemberLimit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberOpen(false)}>取消</Button>
            <Button onClick={handleEditMember} disabled={editMemberLoading}>
              {editMemberLoading ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable/Enable Member Confirm Dialog */}
      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banTarget?.status === "active" ? "禁用成员" : "启用成员"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              确认要{banTarget?.status === "active" ? "禁用" : "启用"}成员 <strong>{banTarget?.name || "用户"} ({banTarget ? maskPhone(banTarget.user_phone) : ""})</strong> 吗？
              {banTarget?.status === "active" && " 禁用后该成员将无法继续使用相关功能。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={banTarget?.status === "active" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={handleBanMember}
              disabled={banLoading}
            >
              {banLoading ? "处理中…" : (banTarget?.status === "active" ? "确认禁用" : "确认启用")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable/Enable Org Confirm Dialog */}
      <AlertDialog open={disableOrgOpen} onOpenChange={setDisableOrgOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disableOrgTarget?.status === "active" ? "禁用组织" : "启用组织"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              确认要{disableOrgTarget?.status === "active" ? "禁用" : "启用"}组织 <strong>{disableOrgTarget?.name}</strong> 吗？
              {disableOrgTarget?.status === "active" && " 禁用后该组织成员将无法继续使用相关功能。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className={disableOrgTarget?.status === "active" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={handleDisableOrg}
              disabled={disableOrgLoading}
            >
              {disableOrgLoading ? "处理中…" : (disableOrgTarget?.status === "active" ? "确认禁用" : "确认启用")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
