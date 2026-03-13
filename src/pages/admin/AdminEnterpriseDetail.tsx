import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Wallet,
  TrendingDown,
  Key,
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Plus,
  UserCircle,
  Pencil,
  UserCheck,
  DollarSign,
  UserX,
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
  memberCount?: number;
  adminName?: string | null;
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
  redeem_code: "兑换码",
  consume: "消耗",
  adjust: "调整",
};

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
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary>({ balance: 0, total_consumed: 0 });
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [balanceRecords, setBalanceRecords] = useState<BalanceRecord[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgRightTab, setOrgRightTab] = useState<"members" | "sub-orgs">("members");
  const [loading, setLoading] = useState(true);

  // Recharge dialog
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);

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
  const [editMemberAction, setEditMemberAction] = useState<"role" | "limit" | null>(null);
  const [editMemberRole, setEditMemberRole] = useState("member");
  const [editMemberLimit, setEditMemberLimit] = useState("");
  const [editMemberLoading, setEditMemberLoading] = useState(false);

  // Ban confirm dialog
  const [banOpen, setBanOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<Member | null>(null);
  const [banLoading, setBanLoading] = useState(false);

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
      supabase.from("enterprise_balances").select("balance,total_consumed").eq("enterprise_id", id).maybeSingle(),
      supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("enterprise_id", id),
      supabase.from("members").select("id,user_phone,role,status,daily_limit,organization_id").eq("enterprise_id", id),
      supabase.from("balance_records").select("id,amount,type,operator,remark,created_at").eq("enterprise_id", id).order("created_at", { ascending: false }),
      supabase.from("organizations").select("id,name,status,admin_phone,monthly_budget,current_month_budget").eq("enterprise_id", id).order("created_at", { ascending: true }),
    ]);

    setEnterprise(ent || null);
    setCert(certData || null);
    setBalanceSummary({ balance: bal?.balance ?? 0, total_consumed: bal?.total_consumed ?? 0 });
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

      setOrgs((orgData || []).map((o) => ({
        ...o,
        memberCount: orgMemberCount[o.id] || 0,
        adminName: o.admin_phone ? (nameMap[o.admin_phone] || null) : null,
      })));
    } else {
      setMembers([]);
      setOrgs(orgData || []);
    }

    if (orgData && orgData.length > 0 && !selectedOrgId) {
      setSelectedOrgId(orgData[0].id);
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // Auto-switch tab when selected org changes
  useEffect(() => {
    const currentOrgMembers = members.filter((m) => m.organization_id === selectedOrgId);
    const currentSubOrgs = orgs.filter((o) => o.id !== selectedOrgId);
    const currentHasMembers = currentOrgMembers.length > 0;
    const currentHasSubOrgs = currentSubOrgs.length > 0;
    if (!currentHasMembers && currentHasSubOrgs) {
      setOrgRightTab("sub-orgs");
    } else {
      setOrgRightTab("members");
    }
  }, [selectedOrgId, members, orgs]);

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "请输入有效金额", variant: "destructive" });
      return;
    }
    setRechargeLoading(true);
    const { error } = await supabase.rpc("admin_recharge_enterprise", {
      p_enterprise_id: id!,
      p_amount: amount,
      p_operator: session?.phone || "admin",
      p_remark: rechargeRemark || null,
    });
    setRechargeLoading(false);
    if (error) {
      toast({ title: "充值失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `充值成功 ¥${amount.toFixed(2)}` });
      setRechargeOpen(false);
      setRechargeAmount("");
      setRechargeRemark("");
      fetchAll();
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
    if (!editMemberTarget || !editMemberAction) return;
    setEditMemberLoading(true);
    let error: { message: string } | null = null;
    if (editMemberAction === "role") {
      const res = await supabase.from("members").update({ role: editMemberRole }).eq("id", editMemberTarget.id);
      error = res.error;
    } else if (editMemberAction === "limit") {
      const limit = editMemberLimit !== "" ? parseFloat(editMemberLimit) : null;
      const res = await supabase.from("members").update({ daily_limit: limit }).eq("id", editMemberTarget.id);
      error = res.error;
    }
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
    const [res1, res2] = await Promise.all([
      supabase.from("members").delete().eq("id", banTarget.id),
      supabase.from("users").update({ status: "banned" } as never).eq("phone", banTarget.user_phone),
    ]);
    setBanLoading(false);
    if (res1.error || res2.error) {
      toast({ title: "操作失败", description: res1.error?.message || res2.error?.message, variant: "destructive" });
    } else {
      toast({ title: "已移除成员并禁用账号" });
      setBanOpen(false);
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
  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const subOrgs = orgs.filter((o) => o.id !== selectedOrgId);
  const hasMembers = orgMembers.length > 0;
  const hasSubOrgs = subOrgs.length > 0;

  const summaryCards = [
    {
      label: "可用余额",
      value: `¥${balanceSummary.balance.toFixed(2)}`,
      icon: <Wallet className="w-5 h-5" />,
      color: "text-primary bg-primary/10",
    },
    {
      label: "历史消耗",
      value: `¥${balanceSummary.total_consumed.toFixed(2)}`,
      icon: <TrendingDown className="w-5 h-5" />,
      color: "text-destructive bg-destructive/10",
    },
    {
      label: "API Key 总数",
      value: String(apiKeyCount),
      icon: <Key className="w-5 h-5" />,
      color: "text-secondary-foreground bg-secondary",
    },
    {
      label: "成员总数",
      value: `${memberCount} 人`,
      icon: <Users className="w-5 h-5" />,
      color: "text-primary bg-primary/10",
    },
  ];

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
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-semibold text-foreground">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

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
                <Button size="sm" onClick={() => { setRechargeOpen(true); setRechargeAmount(""); setRechargeRemark(""); }}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  手动充值
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
                  {/* Left: Org list */}
                  <div className="border-r">
                    <div className="px-4 py-3 border-b bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">组织列表 ({orgs.length})</p>
                    </div>
                    <div className="overflow-y-auto">
                      {orgs.map((org) => {
                        const budget = org.current_month_budget ?? org.monthly_budget;
                        const consumed = 0;
                        const usageRatio = budget != null && budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0;
                        return (
                          <button
                            key={org.id}
                            className={`w-full text-left px-4 py-3.5 border-b last:border-0 transition-colors ${
                              selectedOrgId === org.id ? "bg-primary/10" : "hover:bg-muted/40"
                            }`}
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            {/* Row 1: name + status badge + edit icon */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <p className={`font-semibold text-sm truncate flex-1 ${selectedOrgId === org.id ? "text-primary" : "text-foreground"}`}>
                                {org.name}
                              </p>
                              <Badge
                                variant={org.status === "active" ? "outline" : "secondary"}
                                className="text-[10px] px-1.5 py-0 shrink-0"
                              >
                                {org.status === "active" ? "已启用" : "已停用"}
                              </Badge>
                              <span
                                role="button"
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
                              </span>
                            </div>

                            {/* Row 2: admin */}
                            <div className="flex items-center gap-1 mb-1">
                              <UserCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {org.admin_phone
                                  ? (org.adminName ? `${org.adminName} · ${maskPhone(org.admin_phone)}` : maskPhone(org.admin_phone))
                                  : "未设置管理员"}
                              </span>
                            </div>

                            {/* Row 3: member count */}
                            <div className="flex items-center gap-1 mb-1.5">
                              <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">{org.memberCount ?? 0} 名成员</span>
                            </div>

                            {/* Row 4: budget */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>本月预算</span>
                              <span className="font-medium text-foreground">
                                {budget != null ? `¥${budget.toFixed(0)}` : "无限制"}
                              </span>
                            </div>

                            {/* Row 5: usage bar */}
                            {budget != null && budget > 0 && (
                              <div className="flex items-center gap-2">
                                <Progress value={usageRatio} className="h-1.5 flex-1" />
                                <span className="text-[10px] text-muted-foreground w-7 text-right">{usageRatio.toFixed(0)}%</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Tabbed panel */}
                  <div className="flex flex-col">
                    {/* Header with tabs */}
                    <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {selectedOrg?.name}
                      </p>
                      {hasSubOrgs ? (
                        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                          <button
                            onClick={() => setOrgRightTab("members")}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              orgRightTab === "members"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            直属成员 {hasMembers ? `(${orgMembers.length})` : "(0)"}
                          </button>
                          <button
                            onClick={() => setOrgRightTab("sub-orgs")}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              orgRightTab === "sub-orgs"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            下属子部门 ({subOrgs.length})
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          直属成员 ({orgMembers.length})
                        </span>
                      )}
                    </div>

                    {/* Tab: 直属成员 */}
                    {orgRightTab === "members" && (
                      <>
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
                                    {m.status === "active" ? "正常" : "停用"}
                                  </Badge>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="修改角色"
                                    onClick={() => {
                                      setEditMemberTarget(m);
                                      setEditMemberAction("role");
                                      setEditMemberRole(m.role);
                                      setEditMemberOpen(true);
                                    }}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="修改限额"
                                    onClick={() => {
                                      setEditMemberTarget(m);
                                      setEditMemberAction("limit");
                                      setEditMemberLimit(m.daily_limit != null ? String(m.daily_limit) : "");
                                      setEditMemberOpen(true);
                                    }}
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="移除并封禁"
                                    onClick={() => {
                                      setBanTarget(m);
                                      setBanOpen(true);
                                    }}
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Tab: 下属子部门 */}
                    {orgRightTab === "sub-orgs" && (
                      <>
                        <div className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr] gap-3 px-5 py-2.5 bg-muted/20 text-xs font-medium text-muted-foreground border-b">
                          <span>部门名称</span>
                          <span>管理员</span>
                          <span>本月预算上限</span>
                          <span>使用率</span>
                        </div>
                        {subOrgs.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
                            暂无下属子部门
                          </div>
                        ) : (
                          <div className="overflow-y-auto">
                            {subOrgs.map((o) => {
                              const budget = o.monthly_budget;
                              const consumed = o.current_month_budget ?? 0;
                              const usageRatio = budget && budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0;
                              return (
                                <div key={o.id} className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr] gap-3 px-5 py-3 border-b last:border-0 text-sm items-center">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground">{o.name}</p>
                                    <Badge variant={o.status === "active" ? "outline" : "secondary"} className="text-xs">
                                      {o.status === "active" ? "正常" : "停用"}
                                    </Badge>
                                  </div>
                                  <div>
                                    {o.admin_phone ? (
                                      <>
                                        <p className="text-sm text-foreground">{o.adminName || "用户"}</p>
                                        <p className="text-xs text-muted-foreground">{maskPhone(o.admin_phone)}</p>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">未设置</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {budget != null ? `¥${budget.toFixed(0)}` : "无限制"}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {budget != null && budget > 0 ? (
                                      <>
                                        <Progress value={usageRatio} className="h-1.5 flex-1" />
                                        <span className="text-[10px] text-muted-foreground w-7 text-right">{usageRatio.toFixed(0)}%</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>手动充值</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>充值金额（元）</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="请输入金额"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="充值备注…"
                rows={2}
                value={rechargeRemark}
                onChange={(e) => setRechargeRemark(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeOpen(false)}>取消</Button>
            <Button onClick={handleRecharge} disabled={rechargeLoading}>
              {rechargeLoading ? "处理中…" : "确认充值"}
            </Button>
          </DialogFooter>
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
              {editMemberAction === "role" ? "修改角色" : "修改限额"} · {editMemberTarget?.name || "用户"} {editMemberTarget ? maskPhone(editMemberTarget.user_phone) : ""}
            </DialogTitle>
          </DialogHeader>
          {editMemberAction === "role" && (
            <div className="space-y-2">
              <Label>选择角色</Label>
              <RadioGroup value={editMemberRole} onValueChange={setEditMemberRole} className="flex gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="member" id="role-member" />
                  <Label htmlFor="role-member" className="font-normal cursor-pointer">普通成员</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="admin" id="role-admin" />
                  <Label htmlFor="role-admin" className="font-normal cursor-pointer">组织管理员</Label>
                </div>
              </RadioGroup>
            </div>
          )}
          {editMemberAction === "limit" && (
            <div className="space-y-1.5">
              <Label>单日调用金额上限（元，留空表示无限制）</Label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="如：500"
                value={editMemberLimit}
                onChange={(e) => setEditMemberLimit(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberOpen(false)}>取消</Button>
            <Button onClick={handleEditMember} disabled={editMemberLoading}>
              {editMemberLoading ? "保存中…" : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Confirm Dialog */}
      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除并封禁用户</AlertDialogTitle>
            <AlertDialogDescription>
              将把 <strong>{banTarget?.name || "用户"} ({banTarget ? maskPhone(banTarget.user_phone) : ""})</strong> 从该组织移除，并在全平台禁用其账号。此操作不可撤销，确认继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBanMember}
              disabled={banLoading}
            >
              {banLoading ? "处理中…" : "确认移除并封禁"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
