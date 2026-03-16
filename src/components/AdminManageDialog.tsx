import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
  const nonAdmins = members.filter((m) => m.role !== "admin");

  useEffect(() => {
    if (open) {
      loadMembers();
      setSelected("");
    }
  }, [open]);

  const loadMembers = async () => {
    const { data } = await supabase
      .from("members")
      .select("id, user_phone, role")
      .eq("enterprise_id", enterpriseId);
    setMembers(data || []);
  };

  const handleAddAdmin = async () => {
    if (!selected) return;
    setLoading(true);
    const { error } = await supabase
      .from("members")
      .update({ role: "admin" })
      .eq("id", selected);
    setLoading(false);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "成功", description: "已添加管理员" });
      setSelected("");
      loadMembers();
      onUpdate();
    }
  };

  const handleTransferAdmin = async () => {
    if (!selected) return;
    setLoading(true);
    // Promote new admin
    const { error: e1 } = await supabase
      .from("members")
      .update({ role: "admin" })
      .eq("id", selected);
    // Demote self
    const { error: e2 } = await supabase
      .from("members")
      .update({ role: "member" })
      .eq("enterprise_id", enterpriseId)
      .eq("user_phone", currentPhone);
    setLoading(false);
    if (e1 || e2) {
      toast({ title: "操作失败", description: (e1 || e2)?.message, variant: "destructive" });
    } else {
      toast({ title: "成功", description: "管理员已转移" });
      onOpenChange(false);
      onUpdate();
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selected) return;
    if (admins.length <= 1) {
      toast({ title: "操作失败", description: "至少需要保留一名管理员", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("members")
      .update({ role: "member" })
      .eq("id", selected);
    setLoading(false);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "成功", description: "已移除管理员权限" });
      setSelected("");
      loadMembers();
      onUpdate();
    }
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
                {nonAdmins.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.user_phone}</SelectItem>
                ))}
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
                {nonAdmins.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.user_phone}</SelectItem>
                ))}
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
                {admins
                  .filter((m) => m.user_phone !== currentPhone)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.user_phone}</SelectItem>
                  ))}
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
