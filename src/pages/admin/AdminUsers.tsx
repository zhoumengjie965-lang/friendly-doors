import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, X, UserCircle, Eye, EyeOff, Shield, ChevronDown, RotateCcw, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface EnterpriseRef { id: string; name: string; role: string; enterprise_type?: "formal" | "test"; }

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  status: string;
  enterprises: EnterpriseRef[];
  personal_balance: number;
  personal_total: number;
  group: string;
  role: string;
  invite_count: number;
  invite_revenue: number;
  inviter: string | null;
  user_type?: "formal" | "test";
}

interface MemberDetail {
  id: string;
  enterprise_id: string;
  enterprise_name: string;
  org_name: string | null;
  role: string;
}

interface DrawerDetail {
  personal_enterprise_id: string | null;
  personal_balance: number;
  personal_total: number;
  members: MemberDetail[];
}

const MODEL_ACCESS_OPTIONS = [
  { value: "国内", label: "国内" },
  { value: "国际", label: "国际" },
];



// 备注类型选项
const REMARK_TYPE_OPTIONS = ["正式用户", "内结用户", "测试用户", "测试用户（付费）", "研发", "演示", "其他"];

// 绿色标签组件 - 用户标签
function GreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}
    </span>
  );
}

// 绿色标签组件 - 企业标签
function EnterpriseGreenTag({ type, name }: { type?: "formal" | "test"; name: string }) {
  const prefix = type === "formal" ? "正式用户" : "测试用户";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
      {prefix}-{name}
    </span>
  );
}

// 用户分组配置
const GROUP_OPTIONS = [
  { value: "basic", name: "basic", remark: "试用客户", models: ["Gemini 1.5", "Grok", "GPT-4o"], discountChannels: "gemini高速折扣通道 (x0.75)、grok高速折扣通道 (x0.85)、openai高速折扣通道 (x0.85)", rebateEnabled: false },
  { value: "openai-basic", name: "openai-basic", remark: "正式客户", models: ["GPT-4o"], discountChannels: "openai高速折扣通道 (x0.85)", rebateEnabled: false },
  { value: "grok-fast", name: "grok-fast", remark: "正式客户", models: ["Grok"], discountChannels: "grok高速折扣通道 (x0.85)", rebateEnabled: false },
  { value: "claudetest", name: "claude-test", remark: "正式客户", models: ["Claude 3.5"], discountChannels: "claude高速折扣通道 (x0.85)", rebateEnabled: false },
  { value: "vip-ep", name: "vip-ep", remark: "正式客户", models: ["Gemini 1.5", "Grok"], discountChannels: "gemini高速折扣通道 (x0.75)、grok高速折扣通道 (x0.85)", rebateEnabled: true },
  { value: "suno", name: "suno", remark: "正式客户", models: ["Suno"], discountChannels: "suno高速折扣通道 (x0.8)", rebateEnabled: false },
  { value: "gemini-fast", name: "gemini-fast", remark: "正式客户", models: ["Gemini 1.5"], discountChannels: "gemini高速折扣通道 (x0.75)", rebateEnabled: false },
  { value: "vip-dp", name: "vip-dp", remark: "互联内结客户", models: ["Gemini 1.5", "Grok", "Claude 3.5"], discountChannels: "gemini高速折扣通道 (x0.75)、grok高速折扣通道 (x0.85)、claude高速折扣通道 (x0.85)", rebateEnabled: true },
];

// 分组可搜索下拉选择器
function GroupCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // 标签类型选项
  const TAG_TYPE_OPTIONS = [
    { value: "all", label: "全部标签" },
    { value: "正式用户", label: "正式用户" },
    { value: "内结用户", label: "内结用户" },
    { value: "测试用户", label: "测试用户" },
    { value: "测试用户（付费）", label: "测试用户（付费）" },
    { value: "研发", label: "研发" },
    { value: "演示", label: "演示" },
    { value: "其他", label: "其他" },
    { value: "none", label: "无标签" },
  ];

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<DrawerDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editBalance, setEditBalance] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);

  // Edit user form state
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
    displayName: "",
    remarkType: "正式用户",
    remarkName: "",
    voucherEnabled: false,
    group: "default",
    modelAccess: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  // Voucher config dialog state
  const [voucherConfigOpen, setVoucherConfigOpen] = useState(false);
  const [voucherConfigTarget, setVoucherConfigTarget] = useState<UserRow | null>(null);
  const [voucherTypeTab, setVoucherTypeTab] = useState<"billing" | "other">("billing");
  const [voucherConfigForm, setVoucherConfigForm] = useState({
    enabled: false,
    groupDiscounts: {} as Record<string, number>,
    expiryDays: 60,
    remark: "",
  });
  const [savingVoucherConfig, setSavingVoucherConfig] = useState(false);
  // mock 存储：已保存的代金券配置（页面内有效）
  const [voucherConfigMap, setVoucherConfigMap] = useState<Record<string, { enabled: boolean; voucherType: string }>>({});
  // mock 存储完整配置，用于打开时回填
  const [voucherConfigStore, setVoucherConfigStore] = useState<Record<string, { enabled: boolean; groupDiscounts: Record<string, number>; expiryDays: number; remark: string }>>({});
  const [voucherConfigEditing, setVoucherConfigEditing] = useState(false);

  const openVoucherConfig = (user: UserRow) => {
    setVoucherConfigTarget(user);
    setVoucherTypeTab("billing");
    setSavingVoucherConfig(false);
    // 从 mock 存储加载已有配置
    const saved = voucherConfigStore[user.id];
    if (saved) {
      setVoucherConfigForm({
        enabled: saved.enabled,
        groupDiscounts: saved.groupDiscounts,
        expiryDays: saved.expiryDays,
        remark: saved.remark,
      });
      setVoucherConfigEditing(false);
    } else {
      setVoucherConfigForm({
        enabled: false,
        groupDiscounts: {},
        expiryDays: 60,
        remark: "",
      });
      setVoucherConfigEditing(true);
    }
    setVoucherConfigOpen(true);
  };

  const handleToggleEnabled = () => {
    if (!voucherConfigTarget) return;
    const newEnabled = !voucherConfigForm.enabled;
    setVoucherConfigForm((prev) => ({ ...prev, enabled: newEnabled }));
    // 如果已有保存的配置，直接同步更新 mock store
    if (voucherConfigStore[voucherConfigTarget.id]) {
      setVoucherConfigStore((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: { ...prev[voucherConfigTarget.id], enabled: newEnabled },
      }));
      setVoucherConfigMap((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: { enabled: newEnabled, voucherType: voucherTypeTab },
      }));
    }
  };

  const handleSaveVoucherConfig = async () => {
    if (!voucherConfigTarget) return;
    setSavingVoucherConfig(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      // 保存到 mock 存储
      setVoucherConfigStore((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: {
          enabled: voucherConfigForm.enabled,
          groupDiscounts: { ...voucherConfigForm.groupDiscounts },
          expiryDays: voucherConfigForm.expiryDays,
          remark: voucherConfigForm.remark,
        },
      }));
      setVoucherConfigMap((prev) => ({
        ...prev,
        [voucherConfigTarget.id]: { enabled: voucherConfigForm.enabled, voucherType: voucherTypeTab },
      }));
      toast({ title: "保存成功", description: `用户「${voucherConfigTarget.name || voucherConfigTarget.phone}」的代金券配置已更新` });
      setVoucherConfigEditing(false);
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setSavingVoucherConfig(false);
    }
  };

  // Add user dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    displayName: "",
    password: "",
    remarkType: "正式用户",
    remarkName: "",
    voucherEnabled: false,
    group: GROUP_OPTIONS[0]?.value || "",
    modelAccess: ["国际"] as string[],
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: usersData, error } = await supabase
      .from("users")
      .select("id,phone,name,created_at,status")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取用户数据失败:", error);
      toast({ title: "获取用户数据失败", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!usersData || usersData.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const phones = usersData.map((u) => u.phone);

    const { data: membersData, error: membersError } = await supabase
      .from("members")
      .select("user_phone,role,enterprise_id")
      .in("user_phone", phones);
    if (membersError) console.error("获取成员数据失败:", membersError);

    const enterpriseIds = [...new Set((membersData || []).map((m) => m.enterprise_id))];
    const { data: enterprises, error: entError } = enterpriseIds.length > 0
      ? await supabase.from("enterprises").select("id,name,owner_phone").in("id", enterpriseIds)
      : { data: [], error: null };
    if (entError) console.error("获取企业数据失败:", entError);

    const { data: ownedEnterprises, error: ownedError } = await supabase
      .from("enterprises")
      .select("id,owner_phone")
      .in("owner_phone", phones);
    if (ownedError) console.error("获取所属企业失败:", ownedError);

    const ownedIds = (ownedEnterprises || []).map((e) => e.id);
    const { data: balances, error: balError } = ownedIds.length > 0
      ? await supabase.from("enterprise_balances").select("enterprise_id,balance,total_consumed").in("enterprise_id", ownedIds)
      : { data: [], error: null };
    if (balError) console.error("获取余额数据失败:", balError);

    const entMap: Record<string, string> = Object.fromEntries(
      (enterprises || []).map((e) => [e.id, e.name])
    );

    const membersByPhone: Record<string, EnterpriseRef[]> = {};
    (membersData || []).forEach((m) => {
      if (!membersByPhone[m.user_phone]) membersByPhone[m.user_phone] = [];
      membersByPhone[m.user_phone].push({
        id: m.enterprise_id,
        name: entMap[m.enterprise_id] || "未知企业",
        role: m.role,
        enterprise_type: "test",
      });
    });

    const balanceMap: Record<string, { balance: number; total: number }> = {};
    (balances || []).forEach((b) => {
      balanceMap[b.enterprise_id] = { balance: b.balance || 0, total: b.total_consumed || 0 };
    });

    const ownerBalanceMap: Record<string, { balance: number; total: number }> = {};
    (ownedEnterprises || []).forEach((e) => {
      const bal = balanceMap[e.id] || { balance: 0, total: 0 };
      ownerBalanceMap[e.owner_phone] = {
        balance: (ownerBalanceMap[e.owner_phone]?.balance || 0) + bal.balance,
        total: (ownerBalanceMap[e.owner_phone]?.total || 0) + bal.total,
      };
    });

    setUsers(
      usersData.map((u) => {
        const userEnts = membersByPhone[u.phone] || [];
        const ownerBal = ownerBalanceMap[u.phone] || { balance: 0, total: 0 };
        const isOwner = userEnts.some((e) => e.role === "owner");
        return {
          ...u,
          enterprises: userEnts,
          personal_balance: ownerBal.balance,
          personal_total: ownerBal.total,
          group: "default",
          role: isOwner ? "企业主" : (userEnts.length > 0 ? "成员" : "普通用户"),
          invite_count: 0,
          invite_revenue: 0,
          inviter: null,
          user_type: "test",
        };
      })
    );
    setLoading(false);
  };

  const fetchDrawerDetail = async (phone: string) => {
    setDrawerLoading(true);
    setDrawerDetail(null);

    const { data: ownedEnts } = await supabase
      .from("enterprises")
      .select("id")
      .eq("owner_phone", phone);
    const personalEntId = ownedEnts?.[0]?.id || null;

    let personalBalance = 0;
    let personalTotal = 0;
    if (personalEntId) {
      const { data: bal } = await supabase
        .from("enterprise_balances")
        .select("balance,total_consumed")
        .eq("enterprise_id", personalEntId)
        .maybeSingle();
      personalBalance = bal?.balance || 0;
      personalTotal = bal?.total_consumed || 0;
    }

    const { data: membersRaw } = await supabase
      .from("members")
      .select("id,enterprise_id,organization_id,role")
      .eq("user_phone", phone);

    if (!membersRaw || membersRaw.length === 0) {
      setDrawerDetail({ personal_enterprise_id: personalEntId, personal_balance: personalBalance, personal_total: personalTotal, members: [] });
      setDrawerLoading(false);
      return;
    }

    const entIds = [...new Set(membersRaw.map((m) => m.enterprise_id))];
    const { data: ents } = await supabase.from("enterprises").select("id,name").in("id", entIds);
    const entMap: Record<string, string> = Object.fromEntries((ents || []).map((e) => [e.id, e.name]));

    const orgIds = membersRaw.map((m) => m.organization_id).filter(Boolean) as string[];
    const { data: orgs } = orgIds.length > 0
      ? await supabase.from("organizations").select("id,name").in("id", orgIds)
      : { data: [] };
    const orgMap: Record<string, string> = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));

    const members: MemberDetail[] = membersRaw.map((m) => ({
      id: m.id,
      enterprise_id: m.enterprise_id,
      enterprise_name: entMap[m.enterprise_id] || "未知企业",
      org_name: m.organization_id ? (orgMap[m.organization_id] || null) : null,
      role: m.role,
    }));

    setDrawerDetail({ personal_enterprise_id: personalEntId, personal_balance: personalBalance, personal_total: personalTotal, members });
    setDrawerLoading(false);
  };

  const openDrawer = (user: UserRow) => {
    setDrawerUser(user);
    setEditBalance("");
    // 解析备注格式 "类型_输入信息"
    const mockRemark = "正式用户_测试备注"; // 实际应从用户数据中获取
    const parts = mockRemark.split("_");
    const type = parts[0] && REMARK_TYPE_OPTIONS.includes(parts[0]) ? parts[0] : "正式用户";
    const name = parts.slice(1).join("_") || "";
    setEditForm({
      username: user.name || "",
      password: "",
      displayName: user.name || "",
      remarkType: type,
      remarkName: name,
      voucherEnabled: false,
      group: user.group || "default",
      modelAccess: ["国际"],
    });
    setShowPassword(false);
    setDrawerOpen(true);
    fetchDrawerDetail(user.phone);
  };

  const handleToggleStatus = async (user: UserRow) => {
    const newStatus = user.status === "active" ? "banned" : "active";
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    if (drawerUser?.id === user.id) setDrawerUser((prev) => prev ? { ...prev, status: newStatus } : prev);
    await supabase.from("users").update({ status: newStatus }).eq("id", user.id);
    toast({ title: newStatus === "active" ? "已启用" : "已禁用", description: `用户 ${user.name || user.phone} 已${newStatus === "active" ? "启用" : "禁用"}` });
  };

  const handlePromote = async (user: UserRow) => {
    toast({ title: "提升用户", description: `用户 ${user.name || user.phone} 权限提升功能开发中` });
  };

  const handleDemote = async (user: UserRow) => {
    toast({ title: "降级用户", description: `用户 ${user.name || user.phone} 权限降级功能开发中` });
  };

  const handleSaveBalance = async () => {
    if (!drawerDetail?.personal_enterprise_id) return;
    const val = parseFloat(editBalance);
    if (isNaN(val)) return;
    setSavingBalance(true);
    await supabase.from("enterprise_balances")
      .update({ balance: val })
      .eq("enterprise_id", drawerDetail.personal_enterprise_id);
    setDrawerDetail((prev) => prev ? { ...prev, personal_balance: val } : prev);
    setSavingBalance(false);
    setEditBalance("");
    toast({ title: "已保存", description: `个人余额已更新为 ¥${val.toFixed(2)}` });
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("members").delete().eq("id", memberId);
    setDrawerDetail((prev) => prev
      ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) }
      : prev
    );
    if (drawerUser) {
      setUsers((prev) => prev.map((u) => u.phone === drawerUser.phone
        ? { ...u, enterprises: u.enterprises.filter((e) => e.id !== drawerDetail?.members.find((m) => m.id === memberId)?.enterprise_id) }
        : u
      ));
    }
    toast({ title: "已解除", description: "用户已从该企业移除" });
  };

  const handleAddUser = async () => {
    if (!addForm.username.trim()) {
      toast({ title: "请输入用户名", variant: "destructive" });
      return;
    }
    if (!addForm.password.trim()) {
      toast({ title: "请输入密码", variant: "destructive" });
      return;
    }

    // 组合备注：类型_输入信息（选填）
    const remark = addForm.remarkName.trim() ? `${addForm.remarkType}_${addForm.remarkName}` : "";

    setAddingUser(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: `${addForm.username.trim()}@friendlydoors.local`,
        password: addForm.password.trim(),
        options: {
          data: {
            name: addForm.displayName.trim() || addForm.username.trim(),
            remark: remark,
          },
        },
      });

      if (error) {
        toast({ title: "创建失败", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "用户创建成功", description: `用户 ${addForm.username} 已添加` });
      setAddDialogOpen(false);
      setAddForm({ username: "", displayName: "", password: "", remarkType: "正式用户", remarkName: "", voucherEnabled: false, group: GROUP_OPTIONS[0]?.value || "", modelAccess: ["国际"] });
      fetchAll();
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message || "未知错误", variant: "destructive" });
    } finally {
      setAddingUser(false);
    }
  };

  const handleSearch = () => {
    fetchAll();
  };

  const handleReset = () => {
    setSearch("");
    setGroupFilter("all");
    fetchAll();
  };

  const filtered = users
    .filter((u) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        u.id.toLowerCase().includes(searchLower) ||
        (u.name || "").toLowerCase().includes(searchLower) ||
        u.phone.includes(search)
      );
    })
    .filter((u) => {
      if (groupFilter === "all") return true;
      return u.group === groupFilter;
    })
    .filter((u) => {
      // 标签筛选逻辑
      if (tagFilter === "none") {
        return u.user_type === undefined;
      } else if (tagFilter !== "all") {
        return u.user_type !== undefined;
      }
      return true;
    });

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { owner: "企业主", org_admin: "组织管理员", member: "成员" };
    return map[role] || role;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">用户管理</h1>
            <p className="text-sm text-muted-foreground mt-0.5">共 {users.length} 名用户</p>
          </div>
        </div>
        <Button
          className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          添加用户
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-lg border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="支持搜索用户的ID、用户名、显示名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-32 h-9 bg-white">
            <SelectValue placeholder="选择分组" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分组</SelectItem>
            <SelectItem value="default">default</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="enterprise">企业用户</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-white">
            <SelectValue placeholder="标签筛选" />
          </SelectTrigger>
          <SelectContent>
            {TAG_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-9" onClick={handleSearch}>
          查询
        </Button>
        <Button variant="ghost" className="h-9" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          重置
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[60px_100px_80px_160px_80px_80px_140px_100px_90px_1fr] text-xs font-medium text-muted-foreground border-b bg-gray-50/50">
          <span className="px-3 py-3">ID</span>
          <span className="px-3 py-3">用户名</span>
          <span className="px-3 py-3">状态</span>
          <span className="px-3 py-3">个人空间剩余额度/总额度</span>
          <span className="px-3 py-3">分组</span>
          <span className="px-3 py-3">角色</span>
          <span className="px-3 py-3">所属企业空间</span>
          <span className="px-3 py-3">注册时间</span>
          <span className="px-3 py-3">邀请信息</span>
          <span className="px-3 py-3 text-center">操作</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((u, index) => (
            <div
              key={u.id}
              className={`grid grid-cols-[60px_100px_80px_160px_80px_80px_140px_100px_90px_1fr] border-b last:border-0 text-sm items-center hover:bg-gray-50/50 ${index % 2 === 1 ? "bg-gray-50/30" : ""}`}
            >
              <span className="text-muted-foreground px-3 py-3.5 font-mono text-xs truncate">
                {u.id.slice(0, 6)}
              </span>
              <span className="text-foreground px-3 py-3.5 truncate">
                <span className="font-medium">{u.name || u.phone}</span>
                <GreenTag type={u.user_type} name={u.name || u.phone} />
              </span>
              <span className="px-3 py-3.5">
                {u.status === "active" ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">已启用</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">已禁用</Badge>
                )}
              </span>
              <span className="text-muted-foreground tabular-nums px-3 py-3.5 text-xs">
                <span className="text-green-600">¥{formatNumber(u.personal_balance)}</span>
                <span className="text-gray-400"> / </span>
                <span>¥{formatNumber(u.personal_total)}</span>
              </span>
              <span className="px-3 py-3.5">
                <Badge variant="secondary" className="text-xs font-normal">{u.group}</Badge>
              </span>
              <span className="text-muted-foreground px-3 py-3.5 text-xs">{u.role}</span>
              <span className="text-muted-foreground px-3 py-3.5 text-xs truncate">
                {u.enterprises.length === 0 ? (
                  "-"
                ) : u.enterprises.length === 1 ? (
                  <span className="inline-flex items-center gap-1">
                    {u.enterprises[0].name}
                    <EnterpriseGreenTag type={u.enterprises[0].enterprise_type} name={u.enterprises[0].name} />
                  </span>
                ) : (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default inline-flex items-center gap-1">
                          {u.enterprises[0].name}
                          <EnterpriseGreenTag type={u.enterprises[0].enterprise_type} name={u.enterprises[0].name} />
                          <span className="text-xs bg-muted rounded px-1 py-0.5">+{u.enterprises.length - 1}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <ul className="space-y-1 text-xs">
                          {u.enterprises.map((e) => (
                            <li key={e.id}>{e.name}</li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
              <span className="text-muted-foreground px-3 py-3.5 text-xs">
                {new Date(u.created_at).toLocaleDateString("zh-CN")}
              </span>
              <span className="text-muted-foreground px-3 py-3.5 text-xs truncate">
                {u.invite_count}人/¥{formatNumber(u.invite_revenue)}
              </span>
              <div className="flex items-center justify-center gap-1 px-3 py-3.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs ${u.status === "banned" ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}`}
                  onClick={() => handleToggleStatus(u)}
                >
                  {u.status === "banned" ? "启用" : "禁用"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => openDrawer(u)}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => handlePromote(u)}
                >
                  提升
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                  onClick={() => handleDemote(u)}
                >
                  降级
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
                  onClick={() => openVoucherConfig(u)}
                >
                  代金券配置
                  {voucherConfigMap[u.id] && (
                    <span className={`ml-1 inline-flex items-center gap-0.5 px-1 py-0 rounded text-[10px] font-medium ${voucherConfigMap[u.id].enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1 h-1 rounded-full ${voucherConfigMap[u.id].enabled ? "bg-green-500" : "bg-gray-400"}`}></span>
                      {voucherConfigMap[u.id].enabled ? "已启用" : "已配置"}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">编辑</span>
                <SheetTitle className="text-base font-semibold">编辑用户</SheetTitle>
              </div>
            </div>
          </SheetHeader>

          {drawerUser && (
            <div className="px-6 py-5 space-y-6">
              {/* Section A: 基本信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">基本信息</p>
                    <p className="text-xs text-muted-foreground">用户的基本账户信息</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-gray-50/30">
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      用户名 <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={editForm.username}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="h-10 pr-8"
                      />
                      {editForm.username && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, username: "" }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">密码</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="请输入新的密码，最短 8 位"
                        value={editForm.password}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">显示名称</Label>
                    <Input
                      value={editForm.displayName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">备注</Label>
                    <div className="flex gap-2">
                      <Select
                        value={editForm.remarkType}
                        onValueChange={(value) => setEditForm((prev) => ({ ...prev, remarkType: value }))}
                      >
                        <SelectTrigger className="w-[130px] h-10 bg-white">
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
                        placeholder="请输入信息（仅管理员可见）"
                        value={editForm.remarkName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, remarkName: e.target.value }))}
                        className="h-10 flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-400">备注格式：类型_输入信息</p>
                  </div>
                </div>
              </div>

              {/* Section B: 权限设置 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">权限设置</p>
                    <p className="text-xs text-muted-foreground">用户分组和额度管理</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-gray-50/30">
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

                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      模型访问权限 <span className="text-red-500">*</span>
                    </Label>
                    <ModelAccessSelect
                      value={editForm.modelAccess}
                      onChange={(access) => setEditForm((prev) => ({ ...prev, modelAccess: access }))}
                    />
                  </div>
                </div>
              </div>

              {/* Section C: 空间关联管理 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">空间关联管理</h3>

                {drawerLoading ? (
                  <p className="text-sm text-muted-foreground">加载中…</p>
                ) : drawerDetail ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">个人空间</p>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">当前余额</span>
                          <span className="font-semibold tabular-nums">¥{drawerDetail.personal_balance.toFixed(2)}</span>
                        </div>
                        {drawerDetail.personal_enterprise_id ? (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">修改余额</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={editBalance}
                                onChange={(e) => setEditBalance(e.target.value)}
                                placeholder={drawerDetail.personal_balance.toFixed(2)}
                                className="h-8 text-sm"
                              />
                              <Button size="sm" variant="outline" onClick={handleSaveBalance} disabled={savingBalance || !editBalance} className="h-8 shrink-0">
                                {savingBalance ? "保存中…" : "保存"}
                              </Button>
                            </div>
                            <p className="text-xs text-blue-500/70 mt-1">此操作仅影响个人钱包，不影响企业配额</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/60">该用户尚未创建企业空间</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">企业空间</p>
                      {drawerDetail.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground/60 italic">未加入任何企业</p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                            <span>企业名称</span>
                            <span>所属组织</span>
                            <span>角色</span>
                            <span></span>
                          </div>
                          {drawerDetail.members.map((m) => (
                            <div key={m.id} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 px-3 py-2.5 border-b last:border-0 text-sm items-center">
                              <span className="truncate font-medium">{m.enterprise_name}</span>
                              <span className="text-muted-foreground truncate">{m.org_name || "—"}</span>
                              <span className="text-muted-foreground text-xs">{roleLabel(m.role)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                                onClick={() => handleRemoveMember(m.id)}
                              >
                                解绑
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* 底部按钮 */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="h-9 px-4"
                  onClick={() => setDrawerOpen(false)}
                >
                  取消
                </Button>
                <Button
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    if (!editForm.username.trim()) {
                      toast({ title: "请输入用户名", variant: "destructive" });
                      return;
                    }
                    if (!editForm.group.trim()) {
                      toast({ title: "请选择分组", variant: "destructive" });
                      return;
                    }
                    setSavingUser(true);
                    setTimeout(() => {
                      setSavingUser(false);
                      toast({ title: "保存成功", description: `用户「${editForm.username}」的分组已更新为「${editForm.group}」` });
                      setDrawerOpen(false);
                    }, 500);
                  }}
                  disabled={savingUser}
                >
                  {savingUser ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">新建</span>
                <DialogTitle className="text-base font-semibold">添加用户</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">用户信息</p>
                <p className="text-xs text-muted-foreground">创建新用户账户</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  用户名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入用户名"
                  value={addForm.username}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">显示名称</Label>
                <Input
                  placeholder="请输入显示名称"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">
                  密码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  placeholder="请输入密码"
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="h-10 bg-gray-50/50 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">备注</Label>
                <div className="flex gap-2">
                  <Select
                    value={addForm.remarkType}
                    onValueChange={(value) => setAddForm((prev) => ({ ...prev, remarkType: value }))}
                  >
                    <SelectTrigger className="w-[130px] h-10 bg-gray-50/50 border-gray-200">
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
                    placeholder="请输入信息（仅管理员可见）"
                    value={addForm.remarkName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, remarkName: e.target.value }))}
                    className="h-10 bg-gray-50/50 border-gray-200 flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">备注格式：类型_输入信息</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">
                  模型访问权限 <span className="text-red-500">*</span>
                </Label>
                <ModelAccessSelect
                  value={addForm.modelAccess}
                  onChange={(access) => setAddForm((prev) => ({ ...prev, modelAccess: access }))}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 px-4"
              onClick={() => {
                setAddDialogOpen(false);
                setAddForm({ username: "", displayName: "", password: "", remarkType: "正式用户", remarkName: "", voucherEnabled: false, group: GROUP_OPTIONS[0]?.value || "", modelAccess: ["国际"] });
              }}
            >
              取消
            </Button>
            <Button
              className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAddUser}
              disabled={addingUser}
            >
              {addingUser ? "创建中…" : "确认"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voucher Config Dialog */}
      <Dialog open={voucherConfigOpen} onOpenChange={setVoucherConfigOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-semibold">代金券配置</DialogTitle>
            </div>
          </DialogHeader>

          {/* 客户信息 */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-foreground">客户名称：{voucherConfigTarget?.name || voucherConfigTarget?.phone}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">配置对象：个人空间</span>
            </div>
          </div>

          {/* 选择代金券类型 */}
          <div className="px-6 pb-1 border-b">
            <div className="flex items-end gap-4">
              <span className="text-sm font-medium text-foreground mb-2">选择代金券类型</span>
              <div className="flex gap-1 bg-gray-100 rounded-t-md p-1">
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    voucherTypeTab === "billing"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setVoucherTypeTab("billing")}
                >
                  账期返券
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    voucherTypeTab === "other"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setVoucherTypeTab("other")}
                >
                  其他类型
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {voucherTypeTab === "billing" && (
              <>
                {/* 返券说明 */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  返券说明：启用后，客户调用模型仍按实际价格扣费；月度账单生成后，系统根据本配置计算应返券金额。每个用户仅允许存在一套账期返券配置，修改账期返券配置后仅对后续生成的账单生效。
                </p>

                {/* 启用状态 */}
                <div className="flex items-center justify-between py-1">
                  <Label className="text-sm font-medium">启用状态</Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={voucherConfigForm.enabled}
                    onClick={handleToggleEnabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      voucherConfigForm.enabled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        voucherConfigForm.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 返券折扣配置 */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">返券比例配置</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    请填写需返还给客户的比例，而非客户实际支付折扣。例：客户按 7 折结算，应填写返券比例 30%。
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_100px] gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                      <span>令牌分组</span>
                      <span className="text-right">返券比例</span>
                    </div>
                    {GROUP_OPTIONS.map((group) => {
                      const discount = voucherConfigForm.groupDiscounts[group.value] || 0;
                      return (
                        <div key={group.value} className="grid grid-cols-[1fr_100px] gap-2 px-3 py-2.5 border-b last:border-0 items-center">
                          <span className="text-sm">
                            {group.name}
                            <span className="text-xs text-muted-foreground ml-1">({group.models.join(", ")})</span>
                          </span>
                          <div className="flex items-center gap-1 justify-end">
                            {voucherConfigEditing ? (
                              <>
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="0"
                                  value={discount || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setVoucherConfigForm((prev) => ({
                                      ...prev,
                                      groupDiscounts: {
                                        ...prev.groupDiscounts,
                                        [group.value]: isNaN(val) ? 0 : val,
                                      },
                                    }));
                                  }}
                                  className="h-7 w-16 text-sm text-right"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground w-16 text-right pr-1">{discount || 0}%</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 备注 */}
                <div className="space-y-1.5">
                  <Label className="text-sm">备注</Label>
                  {voucherConfigEditing ? (
                    <Textarea
                      placeholder="请输入备注"
                      rows={3}
                      value={voucherConfigForm.remark}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setVoucherConfigForm((prev) => ({ ...prev, remark: e.target.value }))
                      }
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground min-h-[1.5rem]">
                      {voucherConfigForm.remark || "无备注"}
                    </p>
                  )}
                </div>
              </>
            )}

            {voucherTypeTab === "other" && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                更多代金券类型即将开放，敬请期待
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 flex-col items-stretch gap-3">
            {voucherConfigEditing && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>修改后的折扣不适用于已出账的账单，将从下次账单开始生效。</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              {voucherConfigEditing ? (
                <>
                  <Button
                    variant="outline"
                    className="h-9 px-4"
                    onClick={() => {
                      const saved = voucherConfigTarget ? voucherConfigStore[voucherConfigTarget.id] : null;
                      if (saved) {
                        setVoucherConfigForm({
                          enabled: saved.enabled,
                          groupDiscounts: saved.groupDiscounts,
                          expiryDays: saved.expiryDays,
                          remark: saved.remark,
                        });
                      } else {
                        setVoucherConfigForm({
                          enabled: false,
                          groupDiscounts: {},
                          expiryDays: 60,
                          remark: "",
                        });
                      }
                      setVoucherConfigEditing(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSaveVoucherConfig}
                    disabled={savingVoucherConfig}
                  >
                    {savingVoucherConfig ? "保存中…" : "保存配置"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="h-9 px-4 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  onClick={() => setVoucherConfigEditing(true)}
                >
                  编辑配置
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
