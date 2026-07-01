import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key, Plus, Copy, Check, Trash2, MoreVertical, Pencil, Power, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 管理 API 凭证数据类型（AKSK 模式）
interface ManageCredential {
  id: string;
  name: string;
  access_key: string;
  access_key_hint: string;
  secret_key: string;
  status: "active" | "disabled";
}

const MOCK_CREDENTIALS: ManageCredential[] = [
  {
    id: "1",
    name: "默认管理凭证",
    access_key: "AK-OR-V1-Dicr2RmN4x3b7k9p0PM6p",
    access_key_hint: "AK-OR-V1-Dicr2***********PM6p",
    secret_key: "",
    status: "active",
  },
];

interface ManageApiCredentialsProps {
  showBackButton?: boolean;
}

export default function ManageApiCredentials({ showBackButton = true }: ManageApiCredentialsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [credentials, setCredentials] = useState<ManageCredential[]>(MOCK_CREDENTIALS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [disableId, setDisableId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ credential: ManageCredential; accessKey: string; secretKey: string } | null>(null);

  const [editingCredential, setEditingCredential] = useState<ManageCredential | null>(null);
  const [editName, setEditName] = useState("");

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "已复制" });
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast({ title: "请输入凭证名称", variant: "destructive" });
      return;
    }
    const randomHex = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const accessKey = `AK-OR-V1-${randomHex()}`;
    const secretKey = `SK-OR-V1-${randomHex()}`;
    const maskedAccessKey = `${accessKey.slice(0, 12)}${"*".repeat(accessKey.length - 16)}${accessKey.slice(-4)}`;
    const newCred: ManageCredential = {
      id: String(Date.now()),
      name: newName.trim(),
      access_key: accessKey,
      access_key_hint: maskedAccessKey,
      secret_key: "",
      status: "active",
    };
    setCredentials((prev) => [...prev, newCred]);
    setNewlyCreatedKey({ credential: newCred, accessKey, secretKey });
    setIsCreateOpen(false);
    setNewName("");
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const cred = credentials.find((c) => c.id === deleteId);
    setCredentials((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    toast({ title: "已删除", description: `管理凭证「${cred?.name}」已删除` });
  };

  const handleToggleStatus = (id: string) => {
    const cred = credentials.find((c) => c.id === id);
    if (cred?.status === "active") {
      setDisableId(id);
    } else {
      setCredentials((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: "active" } : c
        )
      );
      toast({ title: "已启用" });
    }
  };

  const confirmDisable = () => {
    if (!disableId) return;
    const cred = credentials.find((c) => c.id === disableId);
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === disableId ? { ...c, status: "disabled" } : c
      )
    );
    setDisableId(null);
    toast({ title: "已禁用", description: `管理凭证「${cred?.name}」已禁用` });
  };

  const openEdit = (cred: ManageCredential) => {
    setEditingCredential(cred);
    setEditName(cred.name);
  };

  const handleEditSave = () => {
    if (!editingCredential || !editName.trim()) {
      toast({ title: "请输入凭证名称", variant: "destructive" });
      return;
    }
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === editingCredential.id
          ? { ...c, name: editName.trim() }
          : c
      )
    );
    setEditingCredential(null);
    setEditName("");
    toast({ title: "保存成功" });
  };

  return (
    <div className="p-6 space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={() => navigate("/workspace/keys")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-xl font-bold text-foreground">管理 API 凭证</h1>
      </div>

      {/* 页面说明 */}
      <div className="rounded-lg bg-blue-50 border border-blue-200/50 px-4 py-3 text-sm leading-relaxed space-y-1">
        <p className="text-muted-foreground">管理 API 凭证用于调用平台管理类 API，例如查询模型列表、API Key 用量、余额、账单等数据，不用于直接调用模型，也不支持充值、修改折扣、调整模型范围等高风险操作。</p>
        <p className="text-muted-foreground">每个账号最多可创建 2 个管理 API 凭证，便于日常调用和密钥轮换。<a href="/docs/management-api" className="text-blue-600 hover:text-blue-800 underline">查看管理 API 文档</a></p>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-foreground">凭证列表</h2>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          创建凭证
        </Button>
      </div>

      {/* 凭证列表 */}
      {credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Key className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-sm">暂无管理 API 凭证</p>
          <Button variant="outline" className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            创建第一个凭证
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">名称</TableHead>
                <TableHead>Access Key</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[80px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((cred) => (
                <TableRow key={cred.id}>
                  <TableCell className="font-medium">{cred.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">{cred.access_key_hint}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(cred.id, cred.access_key)}>
                        {copiedId === cred.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cred.status === "active" ? "default" : "secondary"}>
                      {cred.status === "active" ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(cred)}>
                          <Pencil className="w-3.5 h-3.5 mr-2" />编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(cred.id)}>
                          {cred.status === "active" ? (
                            <><PowerOff className="w-3.5 h-3.5 mr-2" />禁用</>
                          ) : (
                            <><Power className="w-3.5 h-3.5 mr-2" />启用</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(cred.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" />删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 创建凭证弹窗 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建管理 API 凭证</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>凭证名称</Label>
              <Input placeholder="例如：用量查询凭证" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑凭证弹窗 */}
      <Dialog open={!!editingCredential} onOpenChange={(open) => { if (!open) setEditingCredential(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑管理 API 凭证</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>凭证名称</Label>
              <Input placeholder="例如：用量查询凭证" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCredential(null)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleEditSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该管理 API 凭证吗？删除后配置不可恢复，生效中的凭证将立即取消。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 禁用确认弹窗 */}
      <AlertDialog open={!!disableId} onOpenChange={(open) => { if (!open) setDisableId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>您确定禁用此密钥吗？</AlertDialogTitle>
            <AlertDialogDescription>
              禁用前请确认该密钥没有被使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-600 text-white hover:bg-blue-700" onClick={confirmDisable}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 新建凭证一次性展示弹窗 */}
      <Dialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>创建管理 API 凭证</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">管理 API 凭证已创建成功，请立即复制并妥善保存。</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Access Key</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border border-border">
                <code className="flex-1 text-sm font-mono break-all">{newlyCreatedKey?.accessKey}</code>
                <Button variant="ghost" size="icon" onClick={() => handleCopy("new-ak", newlyCreatedKey?.accessKey || "")}>
                  {copiedId === "new-ak" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Secret Key</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border border-border">
                <code className="flex-1 text-sm font-mono break-all">{newlyCreatedKey?.secretKey}</code>
                <Button variant="ghost" size="icon" onClick={() => handleCopy("new-sk", newlyCreatedKey?.secretKey || "")}>
                  {copiedId === "new-sk" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-red-500 font-semibold">
              Secret Key 仅在创建成功时展示一次，关闭弹窗后将无法再次查看。如不慎泄露，请立即停用或删除该凭证。
            </p>
            <p className="text-sm text-muted-foreground">
              该凭证仅用于调用平台管理类 API，例如查询模型列表、API Key 用量、余额和账单等数据，不可用于直接调用模型。
            </p>
          </div>
          <DialogFooter>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setNewlyCreatedKey(null)}>我已复制并保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
