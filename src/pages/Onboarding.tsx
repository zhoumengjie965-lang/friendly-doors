import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentPhone, getPendingInvitations, getUserEnterprises } from "@/lib/auth";

export default function Onboarding() {
  const navigate = useNavigate();

  useEffect(() => {
    const phone = getCurrentPhone();
    if (!phone) {
      navigate("/login");
      return;
    }

    (async () => {
      const invitations = await getPendingInvitations(phone);
      if (invitations.length > 0) {
        navigate("/invitations");
        return;
      }

      const enterprises = await getUserEnterprises(phone);
      // 无论是否有企业，都直接进入 workspace
      // 首次登录标记用于显示欢迎提示
      if (enterprises.length === 0) {
        sessionStorage.setItem("first_login", "true");
      }
      navigate("/workspace");
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">正在加载...</p>
      </div>
    </div>
  );
}
