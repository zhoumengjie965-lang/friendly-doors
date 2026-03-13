import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, NavLink } from "react-router-dom";
import { getAdminSession, adminLogout } from "@/lib/adminAuth";
import {
  LayoutDashboard,
  Building2,
  Users,
  Ticket,
  BarChart3,
  Cpu,
  LogOut,
  Shield,
  ChevronRight,
  FileText,
  Network,
  Layers,
  Settings,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDashboard from "./AdminDashboard";
import AdminEnterprises from "./AdminEnterprises";
import AdminUsers from "./AdminUsers";
import AdminBilling from "./AdminBilling";
import AdminModels from "./AdminModels";

import AdminCallLogs from "./AdminCallLogs";
import AdminChannels from "./AdminChannels";
import AdminModelDeploy from "./AdminModelDeploy";
import AdminSettings from "./AdminSettings";
import AdminEnterpriseDetail from "./AdminEnterpriseDetail";
import AdminResourceStats from "./AdminResourceStats";
import AdminTokens from "./AdminTokens";

const NAV_GROUPS = [
  {
    label: "控制台",
    items: [
      { label: "资源统计", icon: BarChart3, path: "resource-stats" },
      { label: "调用日志", icon: FileText, path: "call-logs" },
      { label: "令牌管理", icon: KeyRound, path: "tokens" },
    ],
  },
  {
    label: "运营管理",
    items: [
      { label: "企业管理", icon: Building2, path: "enterprises" },
      { label: "用户管理", icon: Users, path: "users" },
      { label: "兑换码管理", icon: Ticket, path: "billing" },
    ],
  },
  {
    label: "配置管理",
    items: [
      { label: "渠道管理", icon: Network, path: "channels" },
      { label: "模型管理", icon: Cpu, path: "models" },
      { label: "模型部署", icon: Layers, path: "model-deploy" },
      { label: "系统设置", icon: Settings, path: "settings" },
    ],
  },
];
...
          
          <Route path="*" element={<Navigate to="resource-stats" replace />} />
        </Routes>
      </main>
    </div>
  );
}
