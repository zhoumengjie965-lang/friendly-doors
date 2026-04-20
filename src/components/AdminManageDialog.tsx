import { useEffect, useState } from "react";
import { getMockData } from "@/lib/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// 手机号脱敏函数
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseId: string;
  currentPhone: string;
  onUpdate: () => void;
}

interface Member {
  id: string;
  user_phone: string;
  role: string;
  name?: string;
  orgs?: string[];
  uid?: string;
}

export default function AdminManageDialog({
  open,
  onOpenChange,
  enterpriseId,
  currentPhone,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  const admins = members.filter((m) => m.role === "admin");

  useEffect(() => {
    if (open) {
      loadMembers();
      setSelected("");
    }
  }, [open]);

  const loadMembers = () => {
    // 强制清除缓存，重新获取最新 mock 数据
    localStorage.removeItem('ai_gateway_mock_data');
    const mockData = getMockData();
    // 获取企业成员
    const enterpriseMembers = mockData.members.filter(
      m => m.enterprise_id === enterpriseId && !m.organization_id
    );
    // 获取组织成员
    const orgMembers = mockData.members.filter(
      m => m.enterprise_id === enterpriseId && m.organization_id
    );
    // 合并去重
    const allMembers = [...enterpriseMembers, ...orgMembers];
    const uniquePhones = [...new Set(allMembers.map(m => m.user_phone))];
    
    const enrichedMembers: Member[] = uniquePhones.map(phone => {
      const member = allMembers.find(m => m.user_phone === phone);
      const user = mockData.users.find(u => u.phone === phone);
      // 获取该成员所属的所有组织
      const memberOrgs = mockData.members
        .filter(m => m.user_phone === phone && m.organization_id)
        .map(m => {
          const org = mockData.organizations.find(o => o.id === m.organization_id);
          return org?.name || "未知部门";
        });
      // 确定角色（优先 admin，其次是 org_admin，最后是 member）
      const memberWithAdmin = allMembers.find(m => m.user_phone === phone && m.role === "admin");
      const memberWithOrgAdmin = allMembers.find(m => m.user_phone === phone && m.role === "org_admin");
      const role = memberWithAdmin ? "admin" : (memberWithOrgAdmin ? "org_admin" : (member?.role || "member"));
      // 处理 UID，去掉 UID: 前缀
      const rawUid = user?.uid || "-";
      const uid = rawUid.startsWith("UID:") ? rawUid.slice(4) : rawUid;
      
      return {
        id: member?.id || phone,
        user_phone: phone,
        role,
        name: user?.name || "未命名",
        orgs: memberOrgs.length > 0 ? memberOrgs : ["默认部门"],
        uid: uid,
      };
    });
    
    setMembers(enrichedMembers);
  };

  const handleAddAdmin = async () => {
    if (!selected) return;
    setLoading(true);
    // 使用 mock 数据更新
    const mockData = getMockData();
    const memberIndex = mockData.members.findIndex(m => m.id === selected);
    if (memberIndex !== -1) {
      mockData.members[memberIndex].role = "admin";
      localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
    }
    setLoading(false);
    toast({ title: "成功", description: "已添加管理员" });
    setSelected("");
    loadMembers();
    onUpdate();
  };

  const handleTransferAdmin = async () => {
    if (!selected) return;
    setLoading(true);
    // 使用 mock 数据更新
    const mockData = getMockData();
    // Promote new admin
    const newAdminIndex = mockData.members.findIndex(m => m.id === selected);
    if (newAdminIndex !== -1) {
      mockData.members[newAdminIndex].role = "admin";
    }
    // Demote self
    const selfIndex = mockData.members.findIndex(
      m => m.enterprise_id === enterpriseId && m.user_phone === currentPhone
    );
    if (selfIndex !== -1) {
      mockData.members[selfIndex].role = "member";
    }
    localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
    setLoading(false);
    toast({ title: "成功", description: "管理员已转移" });
    onOpenChange(false);
    onUpdate();
  };

  const handleRemoveAdmin = async () => {
    if (!selected) return;
    if (admins.length <= 1) {
      toast({ title: "操作失败", description: "至少需要保留一名管理员", variant: "destructive" });
      return;
    }
    setLoading(true);
    // 使用 mock 数据更新
    const mockData = getMockData();
    const memberIndex = mockData.members.findIndex(m => m.id === selected);
    if (memberIndex !== -1) {
      mockData.members[memberIndex].role = "member";
      localStorage.setItem("ai_gateway_mock_data", JSON.stringify(mockData));
    }
    setLoading(false);
    toast({ title: "成功", description: "已移除管理员权限" });
    setSelected("");
    loadMembers();
    onUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管理员管理</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="add" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="add" className="flex-1">新增管理员</TabsTrigger>
            <TabsTrigger value="transfer" className="flex-1">转移管理员</TabsTrigger>
            <TabsTrigger value="remove" className="flex-1">移除管理员</TabsTrigger>
          </TabsList>

          {/* Add Admin */}
          <TabsContent value="add" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">从现有成员中选择一位提升为管理员</p>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="选择成员" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => {
                  const isAdmin = m.role === "admin";
                  const isOrgAdmin = m.role === "org_admin";
                  const isDisabled = isAdmin; // 企业管理员不可选择
                  return (
                    <div
                      key={m.id}
                      onClick={() => !isDisabled && setSelected(m.id)}
                      className={`relative flex flex-col px-3 py-2 cursor-pointer hover:bg-accent ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : selected === m.id ? 'bg-accent' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.name}（{maskPhone(m.user_phone)}）</span>
                        {isAdmin && <Badge variant="secondary" className="text-xs">企业管理员</Badge>}
                        {isOrgAdmin && <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">部门管理员</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        UID：{m.uid} | 所在部门：{m.orgs?.join("，") || "默认部门"}
                      </span>
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <Button onClick={handleAddAdmin} disabled={!selected || loading} className="w-full">
              确认新增
            </Button>
          </TabsContent>

          {/* Transfer Admin */}
          <TabsContent value="transfer" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              选择新管理员后，您将被降级为普通成员
            </p>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="选择新管理员" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => {
                  const isAdmin = m.role === "admin";
                  const isOrgAdmin = m.role === "org_admin";
                  const isDisabled = isAdmin; // 企业管理员不可选择
                  return (
                    <div
                      key={m.id}
                      onClick={() => !isDisabled && setSelected(m.id)}
                      className={`relative flex flex-col px-3 py-2 cursor-pointer hover:bg-accent ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : selected === m.id ? 'bg-accent' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{m.name}（{maskPhone(m.user_phone)}）</span>
                        {isAdmin && <Badge variant="secondary" className="text-xs">企业管理员</Badge>}
                        {isOrgAdmin && <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">部门管理员</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        UID：{m.uid} | 所在部门：{m.orgs?.join("，") || "默认部门"}
                      </span>
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <Button onClick={handleTransferAdmin} disabled={!selected || loading} variant="destructive" className="w-full">
              确认转移
            </Button>
          </TabsContent>

          {/* Remove Admin */}
          <TabsContent value="remove" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              移除管理员权限（至少保留一名管理员）
            </p>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="选择管理员" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((m) => m.role === "admin" || m.role === "org_admin")
                  .filter((m) => m.user_phone !== currentPhone)
                  .map((m) => {
                    const isAdmin = m.role === "admin";
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelected(m.id)}
                        className={`relative flex flex-col px-3 py-2 cursor-pointer hover:bg-accent ${selected === m.id ? 'bg-accent' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m.name}（{maskPhone(m.user_phone)}）</span>
                          {isAdmin && <Badge variant="secondary" className="text-xs">企业管理员</Badge>}
                          {!isAdmin && <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">部门管理员</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          UID：{m.uid} | 所在部门：{m.orgs?.join("，") || "默认部门"}
                        </span>
                      </div>
                    );
                  })}
              </SelectContent>
            </Select>
            <Button onClick={handleRemoveAdmin} disabled={!selected || loading} variant="destructive" className="w-full">
              确认移除
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
