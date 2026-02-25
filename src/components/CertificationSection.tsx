import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Clock, ShieldAlert, ShieldX } from "lucide-react";

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

export default function CertificationSection({ enterpriseId, isAdmin, onUpdate }: Props) {
  const { toast } = useToast();
  const [cert, setCert] = useState<Certification | null>(null);
  const [status, setStatus] = useState("uncertified");
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
      setStatus(data.status);
    } else {
      setCert(null);
      setStatus("uncertified");
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
      // Update existing
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
      // Insert new
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

  const statusConfig: Record<string, { icon: React.ReactNode; badge: string; badgeVariant: "default" | "secondary" | "destructive" | "outline"; text: string }> = {
    uncertified: {
      icon: <ShieldAlert className="w-5 h-5 text-muted-foreground" />,
      badge: "未认证",
      badgeVariant: "secondary",
      text: "该企业尚未认证",
    },
    pending: {
      icon: <Clock className="w-5 h-5 text-yellow-500" />,
      badge: "审核中",
      badgeVariant: "outline",
      text: "认证审核中，请等待后台人工审核",
    },
    certified: {
      icon: <ShieldCheck className="w-5 h-5 text-green-500" />,
      badge: "已认证",
      badgeVariant: "default",
      text: "企业已通过认证",
    },
    rejected: {
      icon: <ShieldX className="w-5 h-5 text-destructive" />,
      badge: "认证失败",
      badgeVariant: "destructive",
      text: "认证未通过，您可以重新提交申请",
    },
  };

  const config = statusConfig[status] || statusConfig.uncertified;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">企业认证</CardTitle>
            <Badge variant={config.badgeVariant} className="gap-1.5">
              {config.icon}
              {config.badge}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status === "certified" && cert ? (
            <div className="space-y-3">
              <InfoRow label="企业注册名称" value={cert.company_name} />
              <InfoRow label="统一社会信用代码" value={cert.credit_code} />
              <InfoRow label="法人信息" value={cert.legal_person} />
              {cert.business_license_url && (
                <InfoRow label="营业执照" value={cert.business_license_url} />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{config.text}</p>
              {isAdmin && (status === "uncertified" || status === "rejected") && (
                <Button
                  onClick={() => {
                    setForm({
                      company_name: cert?.company_name || "",
                      credit_code: cert?.credit_code || "",
                      legal_person: cert?.legal_person || "",
                      business_license_url: cert?.business_license_url || "",
                    });
                    setDialogOpen(true);
                  }}
                >
                  {status === "rejected" ? "重新认证" : "立即认证"}
                </Button>
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
              <Label>法人信息 <span className="text-destructive">*</span></Label>
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

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
