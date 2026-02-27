import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Clock, ShieldAlert, ShieldX, FileCheck } from "lucide-react";

interface Props {
  enterpriseId: string;
  isAdmin: boolean;
  onUpdate: () => void;
}

interface Certification {
  id: string;
  status: string;
  company_name: string | null;
  credit_code: string | null;
  legal_person: string | null;
  business_license_url: string | null;
  submitted_at: string | null;
}

type StatusKey = "uncertified" | "pending" | "certified" | "rejected";

const PREVIEW_LABELS: { key: StatusKey; label: string }[] = [
  { key: "uncertified", label: "未认证" },
  { key: "pending", label: "审核中" },
  { key: "certified", label: "已认证" },
  { key: "rejected", label: "被拒绝" },
];

export default function CertificationSection({ enterpriseId, isAdmin, onUpdate }: Props) {
  const { toast } = useToast();
  const [cert, setCert] = useState<Certification | null>(null);
  const [realStatus, setRealStatus] = useState<StatusKey>("uncertified");
  const [previewStatus, setPreviewStatus] = useState<StatusKey>("uncertified");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    credit_code: "",
    legal_person: "",
    business_license_url: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCert = async () => {
    const { data } = await supabase
      .from("enterprise_certifications")
      .select("*")
      .eq("enterprise_id", enterpriseId)
      .maybeSingle();
    if (data) {
      setCert(data as Certification);
      setRealStatus(data.status as StatusKey);
      setPreviewStatus(data.status as StatusKey);
    } else {
      setCert(null);
      setRealStatus("uncertified");
      setPreviewStatus("uncertified");
    }
  };

  useEffect(() => {
    loadCert();
  }, [enterpriseId]);

  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.credit_code.trim() || !form.legal_person.trim()) {
      toast({ title: "请填写必填项", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    if (cert) {
      await supabase
        .from("enterprise_certifications")
        .update({
          status: "pending",
          company_name: form.company_name.trim(),
          credit_code: form.credit_code.trim(),
          legal_person: form.legal_person.trim(),
          business_license_url: form.business_license_url.trim() || null,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", cert.id);
    } else {
      await supabase.from("enterprise_certifications").insert({
        enterprise_id: enterpriseId,
        status: "pending",
        company_name: form.company_name.trim(),
        credit_code: form.credit_code.trim(),
        legal_person: form.legal_person.trim(),
        business_license_url: form.business_license_url.trim() || null,
        submitted_at: new Date().toISOString(),
      });
    }

    setSubmitting(false);
    setDialogOpen(false);
    toast({ title: "提交成功", description: "认证申请已提交，请等待审核" });
    loadCert();
    onUpdate();
  };

  const openCertDialog = () => {
    setForm({
      company_name: cert?.company_name || "",
      credit_code: cert?.credit_code || "",
      legal_person: cert?.legal_person || "",
      business_license_url: cert?.business_license_url || "",
    });
    setDialogOpen(true);
  };

  // Mock cert data for preview when status is "certified" but no real cert
  const displayCert: Certification = cert || {
    id: "preview",
    status: "certified",
    company_name: "示例科技有限公司",
    credit_code: "91110000XXXXXXXXXX",
    legal_person: "张三",
    business_license_url: "https://example.com/license.jpg",
    submitted_at: null,
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, hsl(224,76%,48%), hsl(262,60%,58%))" }} />
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">企业认证</h2>
          {/* Preview switcher */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PREVIEW_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreviewStatus(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  previewStatus === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <CardContent className="pt-3 pb-6">
          {previewStatus === "uncertified" && (
            <div className="rounded-xl bg-muted/40 border border-border px-6 py-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ShieldAlert className="w-10 h-10 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-lg font-semibold text-foreground">企业尚未认证</p>
                  <p className="text-sm text-muted-foreground mt-0.5">完成认证后可享受完整服务权益，提升企业可信度</p>
                </div>
              </div>
              {isAdmin && (
                <Button onClick={openCertDialog} className="shrink-0">立即认证</Button>
              )}
            </div>
          )}

          {previewStatus === "pending" && (
            <div className="rounded-xl border px-6 py-7 flex items-center gap-4"
              style={{ background: "hsl(45 100% 96%)", borderColor: "hsl(45 90% 85%)" }}>
              <Clock className="w-10 h-10 shrink-0" style={{ color: "hsl(38 92% 50%)" }} />
              <div>
                <p className="text-lg font-semibold text-foreground">认证审核中</p>
                <p className="text-sm text-muted-foreground mt-0.5">材料已提交，请耐心等待人工审核，通常需 1–3 个工作日</p>
              </div>
            </div>
          )}

          {previewStatus === "certified" && (
            <div className="rounded-xl border px-6 py-5"
              style={{ background: "hsl(142 70% 97%)", borderColor: "hsl(142 60% 85%)" }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" style={{ color: "hsl(142 60% 40%)" }} />
                  <span className="font-semibold text-foreground">认证状态</span>
                  <span className="flex items-center gap-1 text-sm font-medium" style={{ color: "hsl(142 60% 40%)" }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: "hsl(142 60% 40%)" }} />
                    已认证
                  </span>
                </div>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={openCertDialog}>重新认证</Button>
                )}
              </div>
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="企业注册名称" value={displayCert.company_name} />
                <InfoRow label="统一社会信用代码" value={displayCert.credit_code} />
                <InfoRow label="法人姓名" value={displayCert.legal_person} />
                <InfoRow
                  label="营业执照"
                  value={displayCert.business_license_url ? "已上传" : "未上传"}
                  highlight={!!displayCert.business_license_url}
                />
              </div>
            </div>
          )}

          {previewStatus === "rejected" && (
            <div className="rounded-xl border px-6 py-7 flex items-center justify-between gap-4"
              style={{ background: "hsl(0 100% 97%)", borderColor: "hsl(0 80% 88%)" }}>
              <div className="flex items-center gap-4">
                <ShieldX className="w-10 h-10 shrink-0" style={{ color: "hsl(0 72% 51%)" }} />
                <div>
                  <p className="text-lg font-semibold text-foreground">认证未通过</p>
                  <p className="text-sm text-muted-foreground mt-0.5">请检查提交材料后重新申请，如有疑问请联系客服</p>
                </div>
              </div>
              {isAdmin && (
                <Button onClick={openCertDialog} variant="destructive" className="shrink-0">重新认证</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certification Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>企业认证申请</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>企业注册名称 <span className="text-destructive">*</span></Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="请输入企业注册名称"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>统一社会信用代码 <span className="text-destructive">*</span></Label>
              <Input
                value={form.credit_code}
                onChange={(e) => setForm({ ...form, credit_code: e.target.value })}
                placeholder="请输入统一社会信用代码"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>法人姓名 <span className="text-destructive">*</span></Label>
              <Input
                value={form.legal_person}
                onChange={(e) => setForm({ ...form, legal_person: e.target.value })}
                placeholder="请输入法人姓名"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>营业执照（可选）</Label>
              <Input
                value={form.business_license_url}
                onChange={(e) => setForm({ ...form, business_license_url: e.target.value })}
                placeholder="请输入营业执照链接"
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? "提交中..." : "提交认证"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-background/60 px-4 py-3 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-green-600" : "text-foreground"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
