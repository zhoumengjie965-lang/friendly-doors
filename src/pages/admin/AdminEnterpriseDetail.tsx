import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  const [cert, setCert] = useState<Cert | null>(null);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary>({ balance: 0, total_consumed: 0 });
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [balanceRecords, setBalanceRecords] = useState<BalanceRecord[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Recharge dialog
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Certification review
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

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

    // Collect all phones needed: members + org admin_phones
    const memberPhones = rawMembers.map((m) => m.user_phone);
    const adminPhones = (orgData || []).map((o) => o.admin_phone).filter(Boolean) as string[];
    const allPhones = [...new Set([...memberPhones, ...adminPhones])];

    if (allPhones.length > 0) {
      const { data: users } = await supabase.from("users").select("phone,name").in("phone", allPhones);
      const nameMap = Object.fromEntries((users || []).map((u) => [u.phone, u.name]));
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

  const summaryCards = [
    {
      label: "企业当前余额",
      value: `¥${balanceSummary.balance.toFixed(2)}`,
      icon: <Wallet className="w-5 h-5" />,
      color: "text-primary bg-primary/10",
    },
    {
      label: "总消耗额度",
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
          <TabsContent value="info" className="mt-4">
            <div className="bg-card border rounded-xl p-5 space-y-5">
              <h3 className="text-sm font-semibold text-foreground">企业基本信息</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  { label: "企业名称", value: enterprise.name },
                  { label: "唯一 ID", value: <span className="font-mono text-xs">{enterprise.id}</span> },
                  { label: "企业码", value: <span className="font-mono">{enterprise.enterprise_code}</span> },
                  { label: "负责人手机", value: enterprise.owner_phone },
                  { label: "注册时间", value: new Date(enterprise.created_at).toLocaleString("zh-CN") },
                  { label: "认证状态", value: <Badge variant={certCfg.variant} className="text-xs">{certCfg.label}</Badge> },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {cert && certStatus !== "uncertified" && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">企业认证信息</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      {[
                        { label: "公司名称", value: cert.company_name || "—" },
                        { label: "统一信用代码", value: cert.credit_code || "—" },
                        { label: "法定代表人", value: cert.legal_person || "—" },
                        { label: "提交时间", value: cert.submitted_at ? new Date(cert.submitted_at).toLocaleString("zh-CN") : "—" },
                        { label: "审核时间", value: cert.reviewed_at ? new Date(cert.reviewed_at).toLocaleString("zh-CN") : "—" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                    {certStatus === "pending" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary border-primary/20 hover:bg-primary/10"
                          disabled={reviewLoading === "approved"}
                          onClick={() => handleReview("approved")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          通过认证
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          disabled={reviewLoading === "rejected"}
                          onClick={() => handleReview("rejected")}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          拒绝认证
                        </Button>
                      </div>
                    )}
                  </div>
                </>
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
                        const consumed = 0; // consumed tracked at enterprise level; org-level not stored separately
                        const usageRatio = budget != null && budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0;
                        return (
                          <button
                            key={org.id}
                            className={`w-full text-left px-4 py-3.5 border-b last:border-0 transition-colors ${
                              selectedOrgId === org.id
                                ? "bg-primary/10"
                                : "hover:bg-muted/40"
                            }`}
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            {/* Row 1: name + status badge */}
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

                            {/* Row 5: usage bar (only if budget set) */}
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

                  {/* Right: Members of selected org */}
                  <div className="flex flex-col">
                    <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {selectedOrg?.name} · 成员 ({orgMembers.length})
                      </p>
                    </div>

                    {/* Member table header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-2.5 bg-muted/20 text-xs font-medium text-muted-foreground border-b">
                      <span>成员</span>
                      <span>角色</span>
                      <span>单日上限</span>
                      <span>状态</span>
                    </div>

                    {orgMembers.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
                        该组织暂无成员
                      </div>
                    ) : (
                      <div className="overflow-y-auto">
                        {orgMembers.map((m) => (
                          <div key={m.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b last:border-0 text-sm items-center">
                            <div>
                              {m.name && <p className="font-medium text-foreground">{m.name}</p>}
                              <p className="text-xs text-muted-foreground">{maskPhone(m.user_phone)}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {m.role === "admin" ? "组织管理员" : "普通成员"}
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
    </div>
  );
}
