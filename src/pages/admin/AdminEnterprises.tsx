import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Enterprise {
  id: string;
  name: string;
  owner_phone: string;
  enterprise_code: string;
  created_at: string;
  cert?: {
    status: string;
    company_name: string | null;
    credit_code: string | null;
    legal_person: string | null;
    submitted_at: string | null;
  };
  balance?: number;
  member_count?: number;
}

const CERT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  uncertified: { label: "未认证", variant: "secondary" },
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "outline" },
  rejected: { label: "已拒绝", variant: "destructive" },
};

export default function AdminEnterprises() {
  const { toast } = useToast();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: ents } = await supabase
      .from("enterprises")
      .select("id,name,owner_phone,enterprise_code,created_at")
      .order("created_at", { ascending: false });

    if (!ents) { setLoading(false); return; }

    const ids = ents.map((e) => e.id);
    const [{ data: certs }, { data: balances }, { data: members }] = await Promise.all([
      supabase.from("enterprise_certifications").select("enterprise_id,status,company_name,credit_code,legal_person,submitted_at").in("enterprise_id", ids),
      supabase.from("enterprise_balances").select("enterprise_id,balance").in("enterprise_id", ids),
      supabase.from("members").select("enterprise_id").in("enterprise_id", ids),
    ]);

    const certMap = Object.fromEntries((certs || []).map((c) => [c.enterprise_id, c]));
    const balMap = Object.fromEntries((balances || []).map((b) => [b.enterprise_id, b.balance]));
    const memberCount = (members || []).reduce((acc, m) => {
      acc[m.enterprise_id] = (acc[m.enterprise_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setEnterprises(
      ents.map((e) => ({
        ...e,
        cert: certMap[e.id],
        balance: balMap[e.id] ?? 0,
        member_count: memberCount[e.id] ?? 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleReview = async (enterpriseId: string, status: "approved" | "rejected") => {
    setReviewLoading(enterpriseId + status);
    const { error } = await supabase.rpc("admin_review_certification", {
      p_enterprise_id: enterpriseId,
      p_status: status,
    });
    setReviewLoading(null);
    if (error) {
      toast({ title: "操作失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "已通过认证" : "已拒绝认证" });
      fetchData();
    }
  };

  const filtered = enterprises.filter(
    (e) =>
      e.name.includes(search) ||
      e.owner_phone.includes(search) ||
      e.enterprise_code.includes(search)
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">企业管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">共 {enterprises.length} 家企业</p>
        </div>
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索企业名、手机号…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>企业名称</span>
          <span>负责人</span>
          <span>认证状态</span>
          <span>余额 (¥)</span>
          <span>成员数</span>
          <span></span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          filtered.map((e) => {
            const certStatus = e.cert?.status || "uncertified";
            const certBadge = CERT_STATUS[certStatus] || CERT_STATUS.uncertified;
            const isExpand = expanded === e.id;

            return (
              <div key={e.id} className="border-b last:border-0">
                {/* Row */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3.5 items-center text-sm">
                  <div>
                    <p className="font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.enterprise_code}</p>
                  </div>
                  <span className="text-muted-foreground">{e.owner_phone}</span>
                  <span>
                    <Badge variant={certBadge.variant} className="text-xs">{certBadge.label}</Badge>
                  </span>
                  <span className="text-foreground">¥ {(e.balance || 0).toFixed(2)}</span>
                  <span className="text-muted-foreground">{e.member_count} 人</span>
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setExpanded(isExpand ? null : e.id)}
                  >
                    详情 {isExpand ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpand && (
                  <div className="px-5 pb-4 pt-1 bg-muted/30 border-t text-sm space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">注册时间</p>
                        <p>{new Date(e.created_at).toLocaleString("zh-CN")}</p>
                      </div>
                      {e.cert && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">公司名称</p>
                            <p>{e.cert.company_name || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">统一信用代码</p>
                            <p>{e.cert.credit_code || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">法人</p>
                            <p>{e.cert.legal_person || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">提交时间</p>
                            <p>{e.cert.submitted_at ? new Date(e.cert.submitted_at).toLocaleString("zh-CN") : "—"}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {certStatus === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary border-primary/20 hover:bg-primary/10"
                          disabled={reviewLoading === e.id + "approved"}
                          onClick={() => handleReview(e.id, "approved")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          通过认证
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10"
                          disabled={reviewLoading === e.id + "rejected"}
                          onClick={() => handleReview(e.id, "rejected")}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          拒绝认证
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
