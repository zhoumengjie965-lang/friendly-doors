import { useEffect, useState } from "react";
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
      if (enterprises.length > 0) {
        navigate("/workspace");
        return;
      }

      navigate("/no-enterprise");
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
