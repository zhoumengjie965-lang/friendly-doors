import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMockData, createOrganization } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { Search, X, User } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseUID: string;
  existingMembers: { user_phone: string; role: string }[];
  onCreated: () => void;
}

export default function CreateOrgDialog({ open, onOpenChange, enterpriseUID, existingMembers, onCreated }: Props) {
  const [orgName, setOrgName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [orgAdminPhone, setOrgAdminPhone] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string, { name: string; UID: string }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<{ user_phone: string; role: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || existingMembers.length === 0) return;
    const phones = existingMembers.map(m => m.user_phone);
    const mockData = getMockData();
    const map: Record<string, { name: string; UID: string }> = {};
    mockData.users.filter(u => phones.includes(u.phone)).forEach(u => {
      map[u.phone] = { name: u.name || u.phone, UID: u.id };
    });
    setUserMap(map);
  }, [open, existingMembers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setFilteredMembers(existingMembers);
    }
  }, [open, existingMembers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(existingMembers);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = existingMembers.filter(m => {
      const user = userMap[m.user_phone];
      const name = (user?.name || "").toLowerCase();
      const phone = m.user_phone.toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
    setFilteredMembers(filtered);
  }, [searchQuery, existingMembers, userMap]);

  const handleCreate = async () => {
    if (!orgName.trim()) {
      toast({ title: "请填写部门名称", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await createOrganization(
        enterpriseUID, 
        orgName.trim(), 
        null,
        {
          monthly_budget: monthlyBudget ? Number(monthlyBudget) : null,
          admin_phone: orgAdminPhone,
          status: "active"
        }
      );
      toast({ title: "创建成功", description: `部门「${orgName}」已创建` });
      setOrgName("");
      setMonthlyBudget("");
      setOrgAdminPhone(null);
      setSearchQuery("");
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "创建失败", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (phone: string) => {
    setOrgAdminPhone(phone);
    setShowDropdown(false);
    setSearchQuery("");
  };

  const handleClearAdmin = () => {
    setOrgAdminPhone(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建部门</DialogTitle>
          <DialogDescription>填写以下信息创建新的部门</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>部门名称 <span className="text-destructive">*</span></Label>
            <Input placeholder="请输入部门名称" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>默认月预算（元/月）</Label>
            <Input type="number" placeholder="留空表示不限制" value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} min={0} />
          </div>
          <div className="space-y-2" ref={dropdownRef}>
            <Label>设置部门管理员</Label>
            {orgAdminPhone ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-sm text-foreground">{userMap[orgAdminPhone]?.name || orgAdminPhone}</span>
                </div>
                <button onClick={handleClearAdmin} className="text-muted-foreground hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="搜索姓名或手机号" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} className="pl-9" />
                {showDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">暂无可选成员</div>
                    ) : (
                      filteredMembers.map((m) => {
                        const user = userMap[m.user_phone];
                        return (
                          <button key={m.user_phone} onClick={() => handleSelectMember(m.user_phone)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent text-left transition-colors">
                            <span className="font-semibold text-sm text-foreground">{user?.name || m.user_phone}</span>
                            {m.role === "admin" && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0 ml-2">企业管理员</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>取消</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={loading}>{loading ? "创建中..." : "创建部门"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}