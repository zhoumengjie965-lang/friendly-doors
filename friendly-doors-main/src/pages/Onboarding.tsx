import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentPhone, getPendingInvitations, getUserEnterprises, getPersonalWorkspace, createPersonalWorkspace } from "@/lib/auth";

// 本地存储 Key
const WS_TYPE_KEY = "ACT_WS_TYPE";
const WS_ID_KEY = "ACT_WS_ID";
const SHOW_INVITATION_MODAL_KEY = "SHOW_INVITATION_MODAL";
const PENDING_INVITATIONS_KEY = "PENDING_INVITATIONS";
const SHOW_SWITCH_MODAL_KEY = "SHOW_SPACE_SWITCH_MODAL";
const NEW_ENT_KEY = "NEW_ENTERPRISE_IDS";

export default function Onboarding() {
  const navigate = useNavigate();

  useEffect(() => {
    const phone = getCurrentPhone();
    if (!phone) {
      navigate("/login");
      return;
    }

    (async () => {
      // 1. 检查待处理邀请
      const invitations = await getPendingInvitations(phone);
      const hasInvitations = invitations.length > 0;

      // 2. 获取用户空间列表
      const [enterpriseMembers, personalWorkspace] = await Promise.all([
        getUserEnterprises(phone),
        getPersonalWorkspace(phone),
      ]);

      const enterpriseList = enterpriseMembers.filter((m: any) => m.enterprises);
      const totalSpaces = enterpriseList.length + (personalWorkspace ? 1 : 0);

      // 3. 根据空间数量分流
      if (totalSpaces === 0 && !hasInvitations) {
        // 空间数 = 0 且无邀请 → 进入引导页
        navigate("/welcome");
        return;
      }

      // 有待处理邀请的新用户：先创建/获取个人空间，再进入个人空间
      if (hasInvitations) {
        let pws = personalWorkspace;
        if (!pws) {
          // 自动创建个人空间
          pws = await createPersonalWorkspace(phone);
        }
        
        // 设置个人空间标记
        localStorage.setItem(WS_TYPE_KEY, "personal");
        localStorage.setItem(WS_ID_KEY, pws.id);
        localStorage.setItem("ai_gateway_last_workspace_type", "personal");
        
        // 存储邀请信息，用于在个人空间显示激活弹窗
        localStorage.setItem(SHOW_INVITATION_MODAL_KEY, "true");
        localStorage.setItem(PENDING_INVITATIONS_KEY, JSON.stringify(invitations));
        
        navigate("/workspace");
        return;
      }

      // 4. 无邀请，按正常逻辑分流
      if (totalSpaces === 1) {
        // 空间数 = 1 → 直接进入对应空间
        if (enterpriseList.length === 1) {
          const ent = enterpriseList[0].enterprises;
          localStorage.setItem(WS_TYPE_KEY, "enterprise");
          localStorage.setItem(WS_ID_KEY, ent.id);
          localStorage.setItem("ai_gateway_last_workspace_type", "enterprise");
          localStorage.setItem("ai_gateway_last_enterprise", ent.id);
        } else if (personalWorkspace) {
          localStorage.setItem(WS_TYPE_KEY, "personal");
          localStorage.setItem(WS_ID_KEY, personalWorkspace.id);
          localStorage.setItem("ai_gateway_last_workspace_type", "personal");
        }
        navigate("/workspace");
      } else {
        // 空间数 > 1 → 检测是否有24小时内新加入的企业
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        const newEnterprises = enterpriseList.filter((m: any) => {
          const joinedAt = m.created_at ? new Date(m.created_at).getTime() : 0;
          return now - joinedAt < oneDay;
        });

        if (newEnterprises.length > 0) {
          // 有未激活企业 → 进入个人空间 + 弹窗提醒
          localStorage.setItem(WS_TYPE_KEY, "personal");
          localStorage.setItem(WS_ID_KEY, personalWorkspace?.id || "");
          localStorage.setItem("ai_gateway_last_workspace_type", "personal");
          localStorage.setItem(SHOW_SWITCH_MODAL_KEY, "true");
          localStorage.setItem(NEW_ENT_KEY, JSON.stringify(newEnterprises.map((m: any) => ({
            id: m.enterprises.id,
            name: m.enterprises.name,
            role: m.role,
          }))));
        } else {
          // 没有新企业 → 尝试恢复上次的空间
          const lastType = localStorage.getItem("ai_gateway_last_workspace_type");
          if (lastType === "personal" && personalWorkspace) {
            localStorage.setItem(WS_TYPE_KEY, "personal");
            localStorage.setItem(WS_ID_KEY, personalWorkspace.id);
          } else {
            const lastId = localStorage.getItem("ai_gateway_last_enterprise");
            const found = enterpriseList.find((m: any) => m.enterprises.id === lastId);
            if (found) {
              localStorage.setItem(WS_TYPE_KEY, "enterprise");
              localStorage.setItem(WS_ID_KEY, found.enterprises.id);
              localStorage.setItem("ai_gateway_last_enterprise", found.enterprises.id);
            } else {
              // 默认进入第一个企业
              localStorage.setItem(WS_TYPE_KEY, "enterprise");
              localStorage.setItem(WS_ID_KEY, enterpriseList[0].enterprises.id);
              localStorage.setItem("ai_gateway_last_enterprise", enterpriseList[0].enterprises.id);
            }
          }
        }
        navigate("/workspace");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">正在加载工作空间...</p>
      </div>
    </div>
  );
}
