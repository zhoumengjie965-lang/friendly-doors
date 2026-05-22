import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Upload,
  Download,
  Search,
  FileSpreadsheet,
  Loader2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────

// 用户池中的用户
interface UserPoolMember {
  id: string;
  uid: string; // 系统生成的UID
  phone: string; // 完整手机号
  name: string; // 管理员填写的备注名
  username: string; // 系统用户名/登录名
  status: "active" | "inactive" | "pending";
  joinTime: string;
  departments: { name: string; role: string }[]; // 加入的部门及角色
  apiKeyCount: number; // 名下 API Key 数量
}

// 脱敏手机号
function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────

// 部门列表（组织树）
const DEPARTMENTS = [
  { id: "all", name: "全部部门" },
  { id: "1", name: "技术部" },
  { id: "2", name: "产品部" },
  { id: "3", name: "市场部" },
  { id: "4", name: "运营部" },
  { id: "5", name: "财务部" },
  { id: "6", name: "人事部" },
];

const MOCK_USERS: UserPoolMember[] = [
  { 
    id: "1", 
    uid: "UID:100001", 
    phone: "13800138001", 
    name: "张三", 
    username: "zhangsan001",
    status: "active", 
    joinTime: "2024-01-15 09:30:25", 
    departments: [
      { name: "技术部", role: "admin" },
      { name: "产品部", role: "成员" }
    ],
    apiKeyCount: 12
  },
  { 
    id: "2", 
    uid: "UID:100002", 
    phone: "13900139002", 
    name: "李四", 
    username: "lisi002",
    status: "active", 
    joinTime: "2024-02-20 14:15:08", 
    departments: [
      { name: "市场部", role: "成员" }
    ],
    apiKeyCount: 5
  },
  { 
    id: "3", 
    uid: "UID:100003", 
    phone: "13700137003", 
    name: "王五", 
    username: "wangwu003",
    status: "pending", 
    joinTime: "2024-04-10 11:45:33", 
    departments: [],
    apiKeyCount: 0
  },
  { 
    id: "4", 
    uid: "UID:100004", 
    phone: "13600136004", 
    name: "赵六", 
    username: "zhaoliu004",
    status: "inactive", 
    joinTime: "2024-03-05 16:20:47", 
    departments: [
      { name: "运营部", role: "成员" }
    ],
    apiKeyCount: 3
  },
];

// ─── Components ──────────────────────────────────────────────────────────

export default function MemberManagement() {
  const [users, setUsers] = useState<UserPoolMember[]>(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Add member form state - 只保留手机号和姓名
  const [addForm, setAddForm] = useState({
    phone: "",
    name: "",
  });
  const [detectedDisplayName, setDetectedDisplayName] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ phone?: string; name?: string }>({});

  // Edit member form state
  const [editForm, setEditForm] = useState<UserPoolMember | null>(null);

  // 确认弹窗状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserPoolMember | null>(null);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [enableConfirmOpen, setEnableConfirmOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<UserPoolMember | null>(null);

  // 批量选择状态
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  // 查看已删除成员
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [deletedUsers] = useState<UserPoolMember[]>([]);

  const filteredUsers = users.filter(
    (u) => {
      // 部门筛选
      const matchesDepartment = selectedDepartment === "all" || 
        u.departments.some(d => d.name === DEPARTMENTS.find(dept => dept.id === selectedDepartment)?.name);
      
      // 搜索筛选
      const matchesSearch = 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery) ||
        u.uid.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDepartment && matchesSearch;
    }
  );

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  // 切换单个选择
  const toggleSelectUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    setUsers(users.filter(u => !selectedUserIds.includes(u.id)));
    setSelectedUserIds([]);
    setBatchDeleteDialogOpen(false);
    toast({
      title: "批量删除成功",
      description: `已删除 ${selectedUserIds.length} 位成员`,
    });
  };

  // Check if phone exists when user finishes typing
  const handlePhoneBlur = () => {
    if (!addForm.phone || addForm.phone.length < 11) return;
    
    setTimeout(() => {
      const exists = parseInt(addForm.phone.slice(-1)) % 2 === 0;
      if (exists) {
        setDetectedDisplayName("已有用户");
      } else {
        setDetectedDisplayName(null);
      }
    }, 500);
  };

  const handleAddMember = () => {
    const errors: { phone?: string; name?: string } = {};
    if (!addForm.phone) {
      errors.phone = "请输入手机号";
    }
    if (!addForm.name) {
      errors.name = "请输入姓名";
    }
    
    setFormErrors(errors);
    
    if (errors.phone || errors.name) {
      return;
    }

    const now = new Date();
    const joinTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newUser: UserPoolMember = {
      id: Date.now().toString(),
      uid: `UID:${Math.floor(100000 + Math.random() * 900000)}`,
      phone: addForm.phone,
      name: addForm.name,
      username: addForm.phone, // 默认用户名为手机号
      status: "pending",
      joinTime: joinTimeStr,
      departments: [],
      apiKeyCount: 0,
    };

    setUsers([newUser, ...users]);
    setAddDialogOpen(false);
    setAddForm({ phone: "", name: "" });
    setDetectedDisplayName(null);
    setImportResult(null);
    setFormErrors({});
    
    toast({
      title: "添加成功",
      description: `已成功添加成员 ${addForm.name} 到用户池`,
    });
  };

  const handleEditMember = () => {
    if (!editForm) return;
    
    setUsers(users.map(u => u.id === editForm.id ? editForm : u));
    setEditDialogOpen(false);
    setEditForm(null);
    
    toast({
      title: "修改成功",
      description: `已成功修改成员 ${editForm.name} 的信息`,
    });
  };

  const handleDialogClose = () => {
    setAddDialogOpen(false);
    setAddForm({ phone: "", name: "" });
    setDetectedDisplayName(null);
    setImportResult(null);
    setFormErrors({});
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditForm(null);
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (user: UserPoolMember) => {
    setDeleteTarget(user);
    setDeleteConfirmOpen(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setUsers(users.filter(u => u.id !== deleteTarget.id));
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    toast({
      title: "已删除",
      description: `成员 ${deleteTarget.name} 已从用户池移除`,
    });
  };

  // 打开禁用确认弹窗
  const openDisableConfirm = (user: UserPoolMember) => {
    setStatusTarget(user);
    setDisableConfirmOpen(true);
  };

  // 打开启用确认弹窗
  const openEnableConfirm = (user: UserPoolMember) => {
    setStatusTarget(user);
    setEnableConfirmOpen(true);
  };

  // 确认禁用
  const confirmDisable = () => {
    if (!statusTarget) return;
    setUsers(users.map(u => u.id === statusTarget.id ? { ...u, status: "inactive" } : u));
    setDisableConfirmOpen(false);
    toast({
      title: "已禁用",
      description: `成员 ${statusTarget.name} 已被全局禁用`,
    });
    setStatusTarget(null);
  };

  // 确认启用
  const confirmEnable = () => {
    if (!statusTarget) return;
    setUsers(users.map(u => u.id === statusTarget.id ? { ...u, status: "active" } : u));
    setEnableConfirmOpen(false);
    toast({
      title: "已启用",
      description: `成员 ${statusTarget.name} 已被全局启用`,
    });
    setStatusTarget(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    setTimeout(() => {
      setUploading(false);
      setImportResult({
        success: 12,
        failed: 3,
        errors: [
          "第5行：手机号格式不正确",
          "第8行：该手机号已存在于系统中",
          "第15行：姓名为空",
        ],
      });
      
      const now = new Date();
      const joinTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newUsers: UserPoolMember[] = [
        { id: Date.now().toString(), uid: `UID:${Math.floor(100000 + Math.random() * 900000)}`, phone: "13500001111", name: "批量用户1", username: "bulkuser001", status: "pending", joinTime: joinTimeStr, departments: [], apiKeyCount: 0 },
        { id: (Date.now() + 1).toString(), uid: `UID:${Math.floor(100000 + Math.random() * 900000)}`, phone: "13500002222", name: "批量用户2", username: "bulkuser002", status: "pending", joinTime: joinTimeStr, departments: [], apiKeyCount: 0 },
      ];
      setUsers([...newUsers, ...users]);
    }, 2000);
  };

  const downloadTemplate = () => {
    const csvContent = "手机号,姓名\n13800138000,张三\n13900139000,李四";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "成员导入模板.csv";
    link.click();
    
    toast({
      title: "模板下载成功",
      description: "请按照模板格式填写后上传",
    });
  };

  const getStatusBadge = (status: UserPoolMember["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">正常</Badge>;
      case "inactive":
        return <Badge variant="outline" className="text-red-500 border-red-200">禁用</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">待激活</Badge>;
      default:
        return null;
    }
  };

  // 获取角色显示（多个部门时只显示最高角色）
  const getRoleDisplay = (user: UserPoolMember) => {
    // 检查是否是企业管理员（通过 departments 中是否有 admin 角色）
    const isEnterpriseAdmin = user.departments.some(d => d.role === "admin" || d.role === "企业管理员");
    if (isEnterpriseAdmin) {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">企业管理员</Badge>;
    }
    if (user.departments.length === 0) return <span className="text-muted-foreground">-</span>;
    const hasAdmin = user.departments.some(d => d.role === "部门管理员" || d.role === "管理员");
    if (hasAdmin) return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">部门管理员</Badge>;
    return <Badge variant="outline" className="text-gray-600">成员</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">成员管理</h1>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加成员
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            批量导入
          </Button>
          <Button
            variant="outline"
            disabled={selectedUserIds.length === 0}
            onClick={() => setBatchDeleteDialogOpen(true)}
          >
            批量删除
            {selectedUserIds.length > 0 && ` (${selectedUserIds.length})`}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {/* 部门筛选 */}
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部部门" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 搜索框 */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、手机号或UID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      {!showDeletedUsers && <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-medium">成员列表</CardTitle>
              <span className="text-sm text-muted-foreground">共 {filteredUsers.length} 位成员</span>
            </div>
            <button
              onClick={() => setShowDeletedUsers(true)}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              已删除成员
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead className="w-12 text-center">序号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>账号信息</TableHead>
                <TableHead>加入部门</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>加入时间</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    暂无成员
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => (
                  <TableRow key={user.id}>
                    {/* 选择框 */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    {/* 序号列 */}
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {/* 姓名列：管理员填写的备注名 */}
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                    </TableCell>
                    {/* 账号信息列：脱敏手机号 + UID */}
                    <TableCell>
                      <div>{maskPhone(user.phone)}</div>
                      <div className="text-xs text-muted-foreground">{user.uid}</div>
                    </TableCell>
                    {/* 加入部门：显示部门名称，多个时主部门+n */}
                    <TableCell>
                      {user.departments.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : user.departments.length === 1 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-pointer">{user.departments[0].name}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-sm">部门ID：{user.departments[0].id}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                {user.departments[0].name}
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  +{user.departments.length - 1}
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="space-y-1">
                                {user.departments.map((dept, idx) => (
                                  <div key={idx} className="text-sm">{dept.name}（ID：{dept.id}）</div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    {/* 角色：最高角色 */}
                    <TableCell>{getRoleDisplay(user)}</TableCell>
                    {/* 状态 */}
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    {/* 加入时间 */}
                    <TableCell className="text-muted-foreground">{user.joinTime}</TableCell>
                    {/* 操作 */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-3 text-sm">
                        <button 
                          onClick={() => { setEditForm({ ...user }); setEditDialogOpen(true); }}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          编辑
                        </button>
                        <button 
                          onClick={() => user.status === "inactive" ? openEnableConfirm(user) : openDisableConfirm(user)}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {user.status === "inactive" ? "启用" : "禁用"}
                        </button>
                        <button 
                          onClick={() => openDeleteConfirm(user)}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>}

      {/* Add Member Dialog - 简化版：只保留手机号和姓名 */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        if (!open) handleDialogClose();
        else setAddDialogOpen(true);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                <span className="text-red-500">*</span> 手机号
              </Label>
              <Input
                placeholder="请输入手机号"
                value={addForm.phone}
                onChange={(e) => {
                  setAddForm({ ...addForm, phone: e.target.value });
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                }}
                onBlur={handlePhoneBlur}
                className={formErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {formErrors.phone && (
                <p className="text-xs text-red-500">{formErrors.phone}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                <span className="text-red-500">*</span> 姓名
              </Label>
              <Input
                placeholder="请输入姓名"
                value={addForm.name}
                onChange={(e) => {
                  setAddForm({ ...addForm, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                }}
                className={formErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            {/* Detected Display Name Hint */}
            {detectedDisplayName && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>检测到该手机号已有账号，原昵称为「{detectedDisplayName}」，您填写的姓名将覆盖显示</span>
              </div>
            )}

            {/* 说明文字 */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
              <p>• 添加后的成员将进入用户池，成员登录并进入企业空间后即可激活账号。</p>
              <p>• 请在"部门管理"中为其分配部门和角色，即可使用企业资源。</p>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddMember}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) handleEditDialogClose();
        else setEditDialogOpen(true);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑成员</DialogTitle>
          </DialogHeader>
          
          {editForm && (
            <div className="space-y-4 py-4">
              {/* 字段1：企业内姓名 - 可编辑 */}
              <div className="space-y-1.5">
                <Label className="text-xs">企业内姓名</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="请输入姓名"
                />
              </div>

              {/* 字段2：手机号 - 只读展示（完整展示） */}
              <div className="space-y-1.5">
                <Label className="text-xs">手机号</Label>
                <Input value={editForm.phone} disabled className="bg-muted/50 text-muted-foreground border-muted" />
              </div>

              {/* 字段3：UID - 只读展示 */}
              <div className="space-y-1.5">
                <Label className="text-xs">UID</Label>
                <Input value={editForm.uid} disabled className="bg-muted/50 text-muted-foreground border-muted" />
              </div>

              {/* 字段4：加入部门情况 - 仅展示 */}
              <div className="space-y-1.5">
                <Label className="text-xs">加入部门情况</Label>
                {editForm.departments.length === 0 ? (
                  <div className="text-sm text-muted-foreground px-3 py-2 border rounded-md bg-muted/50">
                    未加入任何部门
                  </div>
                ) : (
                  <div className="space-y-1">
                    {editForm.departments.map((dept, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between text-sm px-3 py-2 border rounded-md bg-muted/30"
                      >
                        <span>{dept.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {dept.role === "admin" || dept.role === "企业管理员" ? "-" : (dept.role === "org_admin" || dept.role === "部门管理员" ? "部门管理员" : "成员")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditMember}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量导入成员</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">上传 CSV/Excel 文件</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      请确保文件格式与模板一致
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <Download className="w-4 h-4 mr-2" />
                      下载模板
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {uploading ? "上传中..." : "选择文件"}
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                导入说明
              </h5>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>手机号和姓名为必填项</li>
                <li>如手机号已注册，将自动关联已有账号</li>
                <li>导入后的成员将进入用户池，请在部门管理中赋权</li>
                <li>单次最多导入 500 条记录</li>
              </ul>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                      <p className="text-sm text-green-700">导入成功</p>
                    </CardContent>
                  </Card>
                  <Card className={cn(
                    importResult.failed > 0 ? "bg-red-50 border-red-200" : "bg-gray-50"
                  )}>
                    <CardContent className="p-4 text-center">
                      <X className={cn(
                        "w-8 h-8 mx-auto mb-2",
                        importResult.failed > 0 ? "text-red-600" : "text-gray-400"
                      )} />
                      <p className={cn(
                        "text-2xl font-bold",
                        importResult.failed > 0 ? "text-red-600" : "text-gray-600"
                      )}>{importResult.failed}</p>
                      <p className={cn(
                        "text-sm",
                        importResult.failed > 0 ? "text-red-700" : "text-gray-500"
                      )}>导入失败</p>
                    </CardContent>
                  </Card>
                </div>

                {importResult.errors.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium text-red-600">
                        错误详情
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-32 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 text-sm text-red-600 border-b last:border-0 flex items-center gap-2"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              {deleteTarget && `确认从企业中删除成员「${deleteTarget.name}」？`}
            </DialogTitle>
          </DialogHeader>
          
          {deleteTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                删除后，该成员将彻底失去企业权限，其名下所有部门的 Key 将被清空且不可恢复。
              </p>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">成员：</span>
                  <span className="font-medium text-foreground">{deleteTarget.name} ({deleteTarget.uid})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">名下 API Key：</span>
                  <span className="font-medium text-foreground">{deleteTarget.apiKeyCount} 个</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                注：调用历史记录仍将保留用于统计审计。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 全局禁用确认弹窗 */}
      <Dialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">🚫</span>
              {statusTarget && `确认禁用成员「${statusTarget.name}」？`}
            </DialogTitle>
          </DialogHeader>
          
          {statusTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                禁用后，该成员将无法登录本企业空间，所有 API Key 将立即停止调用，且名下所有部门的权限将同步失效，重新启用后可恢复。
              </p>

              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">成员：</span>
                  <span className="font-medium text-foreground">{statusTarget.name} ({statusTarget.uid})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">涉及部门：</span>
                  <span className="font-medium text-foreground">
                    {statusTarget.departments.length > 0 ? statusTarget.departments.map(d => d.name).join("、") : "未分配"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">涉及 Key：</span>
                  <span className="font-medium text-foreground">{statusTarget.apiKeyCount} 个</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                注：此操作不影响该成员的个人账号，仅限制其在本企业空间内的活动。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisableConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDisable}>
              确认禁用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 全局启用确认弹窗 */}
      <Dialog open={enableConfirmOpen} onOpenChange={setEnableConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">ℹ️</span>
              {statusTarget && `确认启用成员「${statusTarget.name}」？`}
            </DialogTitle>
          </DialogHeader>
          
          {statusTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-foreground">
                启用后，该成员将恢复对本企业空间的访问权限，各部门名下的 Key 将同步恢复可用。
              </p>
              
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">成员：</span>
                  <span className="font-medium text-foreground">{statusTarget.name} ({statusTarget.uid})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">所属部门：</span>
                  <span className="font-medium text-foreground">
                    {statusTarget.departments.length > 0 ? statusTarget.departments.map(d => d.name).join("、") : "未分配"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                注：开启后，请检查该成员在各部门的权限分配是否依然准确。
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnableConfirmOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmEnable}>
              确认启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认弹窗 */}
      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              确认批量删除成员？
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              删除后，选中的 {selectedUserIds.length} 位成员将彻底失去企业权限，其名下所有部门的 Key 将被清空且不可恢复。
            </p>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">待删除成员数：</span>
                <span className="font-medium text-foreground">{selectedUserIds.length} 人</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              注：调用历史记录仍将保留用于统计审计。
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBatchDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 已删除成员列表 */}
      {showDeletedUsers && (
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">已删除成员</CardTitle>
              <button
                onClick={() => setShowDeletedUsers(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                返回成员列表
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">序号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>账号信息</TableHead>
                  <TableHead>加入部门</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>删除时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      暂无已删除成员记录
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <div>{maskPhone(user.phone)}</div>
                        <div className="text-xs text-muted-foreground">{user.uid}</div>
                      </TableCell>
                      <TableCell>
                        {user.departments.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : user.departments.length === 1 ? (
                          <span>{user.departments[0].name}</span>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help inline-flex items-center gap-1">
                                  {user.departments[0].name}
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                    +{user.departments.length - 1}
                                  </span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="space-y-1">
                                  {user.departments.map((dept, idx) => (
                                    <div key={idx} className="text-sm">{dept.name}</div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell>{getRoleDisplay(user)}</TableCell>
                      <TableCell className="text-muted-foreground">{user.joinTime}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
