import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getResellerDemoState } from "@/lib/resellerDemo";
import AdminUsers from "./AdminUsers";
import AdminEnterprises from "./AdminEnterprises";

export default function AdminResellerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === id);

  if (!reseller) return <div className="p-6"><Button variant="ghost" onClick={() => navigate("/admin/console/resellers")}><ArrowLeft className="w-4 h-4 mr-2" />返回代理商列表</Button><div className="mt-20 text-center text-muted-foreground">代理商不存在或已被删除</div></div>;

  return <div className="p-6 space-y-5">
    <Button variant="ghost" className="-ml-2" onClick={() => navigate("/admin/console/resellers")}><ArrowLeft className="w-4 h-4 mr-2" />退出代理商视角</Button>
    <div className="border rounded-xl bg-card px-5 py-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center overflow-hidden shrink-0">{reseller.logoDataUrl ? <img src={reseller.logoDataUrl} alt={`${reseller.name} Logo`} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}</div>
      <h1 className="text-xl font-semibold">{reseller.name}管理中心</h1>
      <a href={`https://${reseller.domain}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline">{reseller.domain}<ExternalLink className="w-4 h-4" /></a>
    </div>
    <Tabs defaultValue="users"><TabsList><TabsTrigger value="users">用户管理</TabsTrigger><TabsTrigger value="enterprises">企业管理</TabsTrigger></TabsList>
      <TabsContent value="users" className="mt-4 -mx-6"><AdminUsers resellerScopeId={reseller.id} /></TabsContent>
      <TabsContent value="enterprises" className="mt-4 -mx-6"><AdminEnterprises resellerScopeId={reseller.id} /></TabsContent>
    </Tabs>
  </div>;
}
