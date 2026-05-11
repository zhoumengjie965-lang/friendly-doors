import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Search, ExternalLink, Zap, Ban, ChevronDown, Plus, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminSession } from "@/lib/adminAuth";

const MODEL_ACCESS_OPTIONS = [
  { value: "国内", label: "国内" },
  { value: "国际", label: "国际" },
];

// 分组可搜索下拉选择器
const GROUP_OPTIONS = [
  { value: "basic", name: "basic", remark: "试用客户", discountChannels: "gemini高速折扣通道 (x0.75)、grok高速折扣通道 (x0.85)、openai高速折扣通道 (x0.85)" },
  { value: "openai-basic", name: "openai-basic", remark: "正式客户", discountChannels: "openai高速折扣通道 (x0.85)" },
  { value: "grok-fast", name: "grok-fast", remark: "正式客户", discountChannels: "grok高速折扣通道 (x0.85)" },
  { value: "claudetest", name: "claude-test", remark: "正式客户", discountChannels: "claude高速折扣通道 (x0.85)" },
  { value: "vip-ep", name: "vip-ep", remark: "正式客户", discountChannels: "gemini高速折扣通道 (x0.75)、grok高速折扣通道 (x0.85)" },
  { value: "suno", name: "suno", remark: "正式客户", discountChannels: "suno高速折扣通道 (x0.8)" },
  { value: "gemini-fast", name: "gemini-fast", remark: "正式客户", discountChannels: "gemini高速折扣通道 (x0.75)" },
  { value: "vip-dp", name: "vip-dp", remark: "互联内结客户", discountChannels: "gemini高速折扣通道 (x0.75)、grok高速折扣通道 (x0.85)、claude高速折扣通道 (x0.85)" },
];

function GroupCombobox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = GROUP_OPTIONS.find((g) => g.value === value);
  const displayText = selected
    ? `${selected.name} (${selected.remark})`
    : "请选择分组";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm hover:bg-gray-100">
          <span className={value ? "" : "text-muted-foreground"}>{displayText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="搜索分组..." />
          <CommandEmpty>未找到匹配的分组</CommandEmpty>
          <CommandGroup>
            {GROUP_OPTIONS.map((group) => {
              return (
                <CommandItem
                  key={group.value}
                  value={group.name}
                  onSelect={() => {
                    onChange(group.value);
                    setOpen(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === group.value ? "opacity-100" : "opacity-0"}`} />
                  <span>{group.name} ({group.remark})</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Multi-select dropdown component for model access
function ModelAccessSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tagValue: string) => {
    if (value.includes(tagValue)) {
      onChange(value.filter((v) => v !== tagValue));
    } else {
      onChange([...value, tagValue]);
    }
  };

  const removeTag = (tagValue: string) => {
    onChange(value.filter((v) => v !== tagValue));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full min-h-[40px] px-3 py-2 border rounded-md bg-white flex items-center justify-between gap-2 hover:border-gray-400 transition-colors"
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground text-sm">请选择模型访问权限</span>
          ) : (
            value.map((tag) => (
              <Badge
                key={tag}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 text-xs flex items-center gap-1"
              >
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                />
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg py-1">
            {MODEL_ACCESS_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                  value.includes(option.value) ? "bg-blue-50/50" : ""
                }`}
                onClick={() => toggleTag(option.value)}
              >
                <span className="text-sm">{option.label}</span>
                {value.includes(option.value) && (
                  <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface AdminInfo {
  phone: string;
  name: string | null;
  user_type?: "formal" | "test";
}

interface Enterprise {
  id: string;
  name: string;
  owner_phone: string;
  enterprise_code: string;
  created_at: string;
  cert_status: string;
  balance: number;
  total_consumed: number;
  org_count: number;
  member_count: number;
  api_key_count: number;
  admins: AdminInfo[];
  enterprise_type?: "formal" | "test";
}

const CERT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uncertified: { label: "未认证", variant: "secondary" },
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "outline" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

// 绿色标签组件 - 企业标签
function GreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}
    </span>
  );
}

// 绿色标签组件 - 用户标签
function UserGreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}管理员
    </span>
  );
}

function AdminCell({ admins }: { admins: AdminInfo[] }) {
  if (admins.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const first = admins[0];
  const extra = admins.length - 1;

  const adminList = (
    <div className="flex items-start gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground leading-4 truncate">{first.name || "用户"}</p>
        <p className="text-xs text-muted-foreground leading-4">{maskPhone(first.phone)}</p>
      </div>
      {extra > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium cursor-default">
                +{extra}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-48">
              <div className="space-y-1.5">
                {admins.map((a) => (
                  <div key={a.phone}>
                    <p className="text-xs font-medium">{a.name || "用户"}</p>
                    <p className="text-xs text-muted-foreground">{maskPhone(a.phone)}</p>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  return adminList;
}

// 带标签的管理员单元格
function AdminCellWithTag({ admins }: { admins: AdminInfo[] }) {
  if (admins.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const first = admins[0];
  const extra = admins.length - 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">{first.name || "用户"}</span>
        <UserGreenTag type={first.user_type} name={first.name || "用户"} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{maskPhone(first.phone)}</span>
        {extra > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium cursor-default">
                  +{extra}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-48">
                <div className="space-y-1.5">
                  {admins.map((a) => (
                    <div key={a.phone}>
                      <p className="text-xs font-medium">{a.name || "用户"}</p>
                      <p className="text-xs text-muted-foreground">{maskPhone(a.phone)}</p>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

export default function AdminEnterprises() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const session = getAdminSession();

  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<string | null>(null);
  const [onlyWithTag, setOnlyWithTag] = useState(false);

  // Quick recharge dialog
  const [rechargeTarget, setRechargeTarget] = useState<Enterprise | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeRemark, setRechargeRemark] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Add enterprise dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    enterpriseName: "",
    adminPhone: "",
    modelAccess: ["国际"] as string[],
    remarkType: "测试",
    remarkName: "",
  });

  // 备注类型选项
  const REMARK_TYPE_OPTIONS = ["测试", "正式", "内部", "演示"];
  const [addingEnterprise, setAddingEnterprise] = useState(false);

  // Edit enterprise sheet state
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Enterprise | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    group: "default",
    modelAccess: ["国际"] as string[],
    remark: "",
  });
  const [savingEnterprise, setSavingEnterprise] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: ents, error } = await supabase
      .from("enterprises")
      .select("id,name,owner_phone,enterprise_code,created_at")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("获取企业数据失败:", error);
      setLoading(false);
      return;
    }

    if (!ents) { setLoading(false); return; }

    const ids = ents.map((e) => e.id);
    const [
      { data: certs },
      { data: balances },
      { data: orgs },
      { data: members },
      { data: adminMembers },
      { data: apiKeys },
    ] = await Promise.all([
      supabase.from("enterprise_certifications").select("enterprise_id,status").in("enterprise_id", ids),
      supabase.from("enterprise_balances").select("enterprise_id,balance,total_consumed").in("enterprise_id", ids),
      supabase.from("organizations").select("enterprise_id").in("enterprise_id", ids),
      supabase.from("members").select("enterprise_id").in("enterprise_id", ids),
      supabase.from("members").select("enterprise_id,user_phone").in("enterprise_id", ids).eq("role", "admin"),
      supabase.from("api_keys").select("enterprise_id").in("enterprise_id", ids),
    ]);

    // Fetch user names for admin members + enterprise owners
    const ownerPhones = ents.map((e) => e.owner_phone);
    const adminPhones = [...new Set([
      ...ownerPhones,
      ...(adminMembers || []).map((m) => m.user_phone),
    ])];
    const { data: userRecords } = adminPhones.length > 0
      ? await supabase.from("users").select("phone,name").in("phone", adminPhones)
      : { data: [] };

    const nameMap = Object.fromEntries((userRecords || []).map((u) => [u.phone, u.name]));

    // Group admins by enterprise: owner first, then org admins
    const adminsMap: Record<string, AdminInfo[]> = {};
    for (const e of ents) {
      adminsMap[e.id] = [{ phone: e.owner_phone, name: nameMap[e.owner_phone] ?? null, user_type: "test" }];
    }
    for (const m of adminMembers || []) {
      // avoid duplicating if owner is also an org admin
      if (!adminsMap[m.enterprise_id]) adminsMap[m.enterprise_id] = [];
      if (!adminsMap[m.enterprise_id].find((a) => a.phone === m.user_phone)) {
        adminsMap[m.enterprise_id].push({ phone: m.user_phone, name: nameMap[m.user_phone] ?? null, user_type: "test" });
      }
    }

    const certMap = Object.fromEntries((certs || []).map((c) => [c.enterprise_id, c.status]));
    const balMap = Object.fromEntries((balances || []).map((b) => [b.enterprise_id, b]));
    const orgCount = (orgs || []).reduce((acc, o) => { acc[o.enterprise_id] = (acc[o.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);
    const memberCount = (members || []).reduce((acc, m) => { acc[m.enterprise_id] = (acc[m.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);
    const apiKeyCount = (apiKeys || []).reduce((acc, k) => { acc[k.enterprise_id] = (acc[k.enterprise_id] || 0) + 1; return acc; }, {} as Record<string, number>);

    setEnterprises(ents.map((e) => ({
      ...e,
      cert_status: certMap[e.id] || "uncertified",
      balance: balMap[e.id]?.balance ?? 0,
      total_consumed: balMap[e.id]?.total_consumed ?? 0,
      org_count: orgCount[e.id] ?? 0,
      member_count: memberCount[e.id] ?? 0,
      api_key_count: apiKeyCount[e.id] ?? 0,
      admins: adminsMap[e.id] ?? [],
      enterprise_type: "test",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRecharge = async () => {
    if (!rechargeTarget || !rechargeAmount) return;
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "请输入有效金额", variant: "destructive" });
      return;
    }
    setRechargeLoading(true);
    const { error } = await supabase.rpc("admin_recharge_enterprise", {
      p_enterprise_id: rechargeTarget.id,
      p_amount: amount,
      p_operator: session?.phone || "admin",
      p_remark: rechargeRemark || null,
    });
    setRechargeLoading(false);
    if (error) {
      toast({ title: "充值失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `已为「${rechargeTarget.name}」充值 ¥${amount.toFixed(2)}` });
      setRechargeTarget(null);
      setRechargeAmount("");
      setRechargeRemark("");
      fetchData();
    }
  };

  const filtered = enterprises.filter(
    (e) => {
      const matchSearch = e.name.includes(search) ||
        e.owner_phone.includes(search) ||
        e.enterprise_code.includes(search);
      const matchCert = certFilter ? e.cert_status === certFilter : true;
      const matchTag = onlyWithTag ? e.enterprise_type !== undefined : true;
      return matchSearch && matchCert && matchTag;
    }
  );

  const handleAddEnterprise = async () => {
    if (!addForm.enterpriseName.trim()) {
      toast({ title: "请输入企业名称", variant: "destructive" });
      return;
    }
    if (!addForm.adminPhone.trim()) {
      toast({ title: "请输入企业管理员手机号/用户ID", variant: "destructive" });
      return;
    }
    if (!addForm.remarkName.trim()) {
      toast({ title: "请输入用户真实名字", variant: "destructive" });
      return;
    }

    // 组合备注：类型-用户真实名字
    const remark = `${addForm.remarkType}-${addForm.remarkName}`;

    setAddingEnterprise(true);
    try {
      // 验证管理员是否存在
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("phone")
        .or(`phone.eq.${addForm.adminPhone.trim()},id.eq.${addForm.adminPhone.trim()}`)
        .maybeSingle();

      if (userError || !userData) {
        toast({ title: "管理员不存在", description: "请检查手机号或用户ID是否正确", variant: "destructive" });
        setAddingEnterprise(false);
        return;
      }

      // 创建企业
      const { data: enterpriseData, error: enterpriseError } = await supabase
        .from("enterprises")
        .insert({
          name: addForm.enterpriseName.trim(),
          owner_phone: userData.phone,
          remark: remark,
        })
        .select()
        .single();

      if (enterpriseError) {
        toast({ title: "创建失败", description: enterpriseError.message, variant: "destructive" });
        setAddingEnterprise(false);
        return;
      }

      // 创建企业余额记录
      await supabase.from("enterprise_balances").insert({
        enterprise_id: enterpriseData.id,
        balance: 0,
        total_consumed: 0,
      });

      // 将管理员添加为成员
      await supabase.from("members").insert({
        enterprise_id: enterpriseData.id,
        user_phone: userData.phone,
        role: "owner",
      });

      toast({ title: "企业创建成功", description: `企业「${addForm.enterpriseName}」已添加` });
      setAddDialogOpen(false);
      setAddForm({ enterpriseName: "", adminPhone: "", modelAccess: ["国际"], remarkType: "测试", remarkName: "" });
      fetchData(); // 刷新企业列表
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setAddingEnterprise(false);
    }
  };

  const COLS = "grid-cols-[2fr_1.5fr_1fr_1.2fr_1fr_80px_100px_88px]";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">企业管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">共 {enterprises.length} 家企业</p>
          </div>
          <Button
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            添加企业
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索企业名称 / 手机号…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="onlyWithTag"
              checked={onlyWithTag}
              onCheckedChange={(checked) => setOnlyWithTag(checked as boolean)}
            />
            <Label htmlFor="onlyWithTag" className="text-sm text-muted-foreground cursor-pointer">
              仅展示有标签的企业
            </Label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className={`grid ${COLS} gap-3 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b`}>
          <span>企业名称</span>
          <span>企业管理员</span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground focus:outline-none">
              认证状态
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setCertFilter(null)}>
                {certFilter === null ? "✓ " : "  "}全部
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("uncertified")}>
                {certFilter === "uncertified" ? "✓ " : "  "}未认证
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("approved")}>
                {certFilter === "approved" ? "✓ " : "  "}已认证
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("pending")}>
                {certFilter === "pending" ? "✓ " : "  "}待审核
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCertFilter("rejected")}>
                {certFilter === "rejected" ? "✓ " : "  "}未通过
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span>余额 / 历史消耗</span>
          <span>部门 / 成员</span>
          <span>API Key</span>
          <span>注册时间</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((e) => {
            const certBadge = CERT_STATUS[e.cert_status] || CERT_STATUS.uncertified;
            return (
              <div key={e.id} className={`grid ${COLS} gap-3 px-5 py-3.5 items-center text-sm border-b last:border-0 hover:bg-muted/20 transition-colors`}>
                {/* 企业名称 */}
                <div
                  className="cursor-pointer group min-w-0"
                  onClick={() => navigate(`/admin/enterprises/${e.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{e.name}</p>
                    <GreenTag type={e.enterprise_type} name={e.name} />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{e.enterprise_code}</p>
                </div>

                {/* 企业管理员 */}
                <div className="min-w-0">
                  <AdminCellWithTag admins={e.admins} />
                </div>

                {/* 认证状态 */}
                <span>
                  <Badge variant={certBadge.variant} className="text-xs">{certBadge.label}</Badge>
                </span>

                {/* 余额 / 总消耗 */}
                <div className="text-xs leading-5">
                  <span className="text-foreground font-medium">¥{e.balance.toFixed(2)}</span>
                  <span className="text-muted-foreground"> / ¥{e.total_consumed.toFixed(2)}</span>
                </div>

                {/* 部门 / 成员 */}
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{e.org_count}</span> 部门 ·{" "}
                  <span className="text-foreground font-medium">{e.member_count}</span> 人
                </div>

                {/* API Key 数量 */}
                <div className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{e.api_key_count}</span> 个
                </div>

                {/* 注册时间 */}
                <div className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="查看详情"
                    onClick={() => navigate(`/admin/enterprises/${e.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                    title="编辑企业"
                    onClick={() => {
                      setEditTarget(e);
                      setEditForm({
                        name: e.name,
                        group: "default",
                        modelAccess: ["国际"],
                        remark: "",
                      });
                      setEditSheetOpen(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="禁用企业"
                    onClick={() => toast({ title: "功能开发中", description: "禁用企业功能即将上线" })}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Recharge Dialog */}
      <Dialog open={!!rechargeTarget} onOpenChange={(open) => { if (!open) setRechargeTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>快速充值</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-1">
            <p className="text-sm text-muted-foreground">企业：<span className="text-foreground font-medium">{rechargeTarget?.name}</span></p>
          </div>
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
            <Button variant="outline" onClick={() => setRechargeTarget(null)}>取消</Button>
            <Button onClick={handleRecharge} disabled={rechargeLoading}>
              {rechargeLoading ? "处理中…" : "确认充值"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Enterprise Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">新建</span>
                <DialogTitle className="text-base font-semibold">添加企业</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {/* 表单字段 */}
            <div className="space-y-4">
              {/* 企业名称 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  企业名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入企业名称"
                  value={addForm.enterpriseName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, enterpriseName: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              {/* 企业管理员 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  企业管理员 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入手机号或用户ID"
                  value={addForm.adminPhone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, adminPhone: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              {/* 模型访问权限 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  模型访问权限 <span className="text-red-500">*</span>
                </Label>
                <ModelAccessSelect
                  value={addForm.modelAccess}
                  onChange={(access) => setAddForm((prev) => ({ ...prev, modelAccess: access }))}
                />
              </div>

              {/* 备注 */}
              <div className="space-y-1.5">
                <Label className="text-sm">
                  备注 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={addForm.remarkType}
                    onValueChange={(value) => setAddForm((prev) => ({ ...prev, remarkType: value }))}
                  >
                    <SelectTrigger className="w-[100px] h-10 bg-gray-50/50 border-gray-200">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {REMARK_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="请输入用户真实名字（仅管理员可见）"
                    value={addForm.remarkName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, remarkName: e.target.value }))}
                    className="h-10 bg-gray-50/50 border-gray-200 flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">备注格式：类型-用户真实名字</p>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => {
                setAddDialogOpen(false);
                setAddForm({ enterpriseName: "", adminPhone: "", modelAccess: ["国际"], remarkType: "测试", remarkName: "" });
              }}
            >
              取消
            </Button>
            <Button
              className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAddEnterprise}
              disabled={addingEnterprise}
            >
              {addingEnterprise ? "创建中…" : "确认"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Enterprise Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="sm:max-w-md p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">编辑</span>
              <SheetTitle className="text-base font-semibold">编辑企业</SheetTitle>
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-5">
            {/* 企业名称 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                企业名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入企业名称"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-10 bg-gray-50/50 border-gray-200"
              />
            </div>

            {/* 分组 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                分组 <span className="text-red-500">*</span>
              </Label>
              <GroupCombobox
                value={editForm.group}
                onChange={(value) => setEditForm((prev) => ({ ...prev, group: value }))}
              />
              {editForm.group && (
                <p className="text-xs text-muted-foreground mt-1">
                  对应令牌分组：{GROUP_OPTIONS.find((g) => g.value === editForm.group)?.discountChannels}
                </p>
              )}
            </div>

            {/* 模型访问权限 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                模型访问权限 <span className="text-red-500">*</span>
              </Label>
              <ModelAccessSelect
                value={editForm.modelAccess}
                onChange={(access) => setEditForm((prev) => ({ ...prev, modelAccess: access }))}
              />
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                备注 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="请输入备注（仅管理员可见）"
                value={editForm.remark}
                onChange={(e) => setEditForm((prev) => ({ ...prev, remark: e.target.value }))}
                className="h-10 bg-gray-50/50 border-gray-200"
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => setEditSheetOpen(false)}
            >
              取消
            </Button>
            <Button
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!editTarget || !editForm.name.trim()) {
                  toast({ title: "请输入企业名称", variant: "destructive" });
                  return;
                }
                if (!editForm.remark.trim()) {
                  toast({ title: "请输入备注", variant: "destructive" });
                  return;
                }
                setSavingEnterprise(true);
                try {
                  const { error } = await supabase
                    .from("enterprises")
                    .update({ name: editForm.name.trim() })
                    .eq("id", editTarget.id);

                  if (error) {
                    toast({ title: "保存失败", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "保存成功", description: `企业「${editForm.name}」已更新` });
                    setEditSheetOpen(false);
                    setEditTarget(null);
                    fetchData();
                  }
                } catch (err: any) {
                  toast({ title: "保存失败", description: err.message || "未知错误", variant: "destructive" });
                } finally {
                  setSavingEnterprise(false);
                }
              }}
              disabled={savingEnterprise}
            >
              {savingEnterprise ? "保存中…" : "保存"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
