// 纯前端 Mock 数据系统 - 使用 localStorage 持久化
// 固定测试账号: 18217795009

const MOCK_DATA_KEY = "ai_gateway_mock_data";
const CURRENT_PHONE_KEY = "ai_gateway_phone";
const MOCK_DATA_VERSION = "2.2"; // 数据版本，修改mock数据时更新此版本号

// ===== 数据类型定义 =====
export interface MockUser {
  id: string;
  phone: string;
  email?: string;
  name: string | null;
  avatar: string | null;
  created_at: string;
  uid?: string;
  remark?: string;
  user_type?: "formal" | "test";
}

export interface MockEnterprise {
  id: string;
  name: string;
  enterprise_code: string;
  owner_phone: string;
  created_at: string;
  updated_at: string;
  remark?: string;
  enterprise_type?: "formal" | "test";
}

export interface MockOrganization {
  id: string;
  enterprise_id: string;
  name: string;
  parent_id: string | null;
  level: number;
  path: string;
  status?: string;
  monthly_budget?: number | null;
  current_month_budget?: number | null;
  admin_phone?: string | null;
  // 预算设置相关字段
  default_monthly_budget?: number | null;
  budget_override?: number | null;
  alert_enabled?: boolean;
  alert_threshold?: number;
  key_template_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockMember {
  id: string;
  user_phone: string;
  enterprise_id: string;
  organization_id: string | null;
  role: "admin" | "org_admin" | "member";
  status?: string;
  daily_limit?: number | null;
  budget_type?: "monthly" | "daily" | "unlimited"; // 预算类型：按月循环/按日循环/不限制
  created_at: string;
}

export interface MockApiKey {
  id: string;
  name: string;
  key: string;
  enterprise_id: string;
  user_phone: string;
  status: "active" | "disabled";
  models: string[];
  groups?: string[]; // 多分组，按优先级排序
  group_name?: string | null; // 兼容旧数据
  rate_limit: number;
  monthly_quota: number;
  used_quota: number;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  enterprise_id: string | null;
  is_public: boolean;
  config: Record<string, any>;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface MockInvitation {
  id: string;
  enterprise_id: string;
  organization_id: string | null;
  inviter_phone: string;
  invitee_phone: string;
  invite_code: string;
  role: "admin" | "org_admin" | "member";
  status: "pending" | "accepted" | "rejected";
  max_uses: number;
  use_count: number;
  expires_at: string;
  created_at: string;
}

export interface MockKeyTemplate {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  config: {
    groups: string[];
    expires: string;
    quota: string;
    unlimited: boolean;
    models: string[];
    ipWhitelist: string;
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockDeptModelPolicy {
  id: string;
  enterprise_id: string;
  name: string;
  // 绑定的部门列表
  bound_org_ids: string[];
  // null = 全部允许；非空数组 = 仅允许列表中的模型
  allowed_models: string[] | null;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface MockAuditLog {
  id: string;
  enterprise_id: string;
  action: string;
  operator: string;
  detail: Record<string, any>;
  created_at: string;
}

interface MockData {
  users: MockUser[];
  enterprises: MockEnterprise[];
  organizations: MockOrganization[];
  members: MockMember[];
  apiKeys: MockApiKey[];
  models: MockModel[];
  invitations: MockInvitation[];
  keyTemplates: MockKeyTemplate[];
  deptModelPolicies: MockDeptModelPolicy[];
  auditLogs: MockAuditLog[];
}

// ===== 工具函数 =====
function generateId(): string {
  return "${Date.now()}_${Math.random().toString(36).substr(2, 9)}";
}

function generateEnterpriseCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateApiKey(): string {
  return `ak_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNow(): string {
  return new Date().toISOString();
}

function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getPastDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// ===== 初始数据 - 丰富的测试数据 =====
const TEST_PHONE = "18217795009";
const OTHER_USERS = [
  { phone: "13800138001", name: "张三" },
  { phone: "13800138002", name: "李四" },
  { phone: "13800138003", name: "王五" },
  { phone: "13800138004", name: "赵六" },
  { phone: "13800138005", name: "钱七" },
  { phone: "13800138006", name: "孙八" },
  { phone: "13800138007", name: "周九" },
  { phone: "13800138008", name: "吴十" },
];

const initialData: MockData = {
  users: [
    {
      id: "user_1",
      phone: TEST_PHONE,
      name: "测试管理员",
      avatar: null,
      created_at: getNow(),
      uid: "UID:100001",
      remark: "超级管理员账号",
      user_type: "test",
    },
    {
      id: "user_formal_1",
      phone: "13900139001",
      name: "正式用户A",
      avatar: null,
      created_at: getNow(),
      uid: "UID:200001",
      remark: "正式客户",
      user_type: "formal",
    },
    {
      id: "user_formal_2",
      phone: "13900139002",
      name: "正式用户B",
      avatar: null,
      created_at: getNow(),
      uid: "UID:200002",
    },
    {
      id: "user_test_1",
      phone: "13900139003",
      name: "测试用户C",
      avatar: null,
      created_at: getNow(),
      uid: "UID:300001",
      user_type: "test",
    },
    {
      id: "user_test_2",
      phone: "13900139004",
      name: "测试用户D",
      avatar: null,
      created_at: getNow(),
      uid: "UID:300002",
    },
    ...OTHER_USERS.map((u, i) => ({
      id: `user_${i + 2}`,
      phone: u.phone,
      name: u.name,
      avatar: null,
      created_at: getNow(),
      uid: `UID:${100002 + i}`,
    })),
    // 仅有邮箱的用户（用于测试导入成员弹窗）
    {
      id: "user_email_1",
      phone: "-",
      email: "zhoul@company.com",
      name: "周八",
      avatar: null,
      created_at: getNow(),
      uid: "UID:400001",
      user_type: "formal",
    },
    {
      id: "user_email_2",
      phone: "-",
      email: "wuji@company.com",
      name: "吴九",
      avatar: null,
      created_at: getNow(),
      uid: "UID:400002",
      user_type: "formal",
    },
    // 同时有手机号和邮箱的用户
    {
      id: "user_both_1",
      phone: "13100131007",
      email: "zhengshi@company.com",
      name: "郑十",
      avatar: null,
      created_at: getNow(),
      uid: "UID:500001",
      user_type: "formal",
    },
  ],
  enterprises: [
    {
      id: "ent_1",
      name: "我的测试企业",
      enterprise_code: "TEST001",
      owner_phone: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
      remark: "测试环境企业",
      enterprise_type: "test",
    },
    {
      id: "ent_formal_1",
      name: "正式客户企业A",
      enterprise_code: "FRML001",
      owner_phone: "13900139001",
      created_at: getNow(),
      updated_at: getNow(),
      remark: "正式客户",
      enterprise_type: "formal",
    },
    {
      id: "ent_formal_2",
      name: "正式客户企业B",
      enterprise_code: "FRML002",
      owner_phone: "13900139002",
      created_at: getNow(),
      updated_at: getNow(),
      enterprise_type: "formal",
    },
    {
      id: "ent_test_2",
      name: "测试企业C",
      enterprise_code: "TEST002",
      owner_phone: "13900139003",
      created_at: getNow(),
      updated_at: getNow(),
      remark: "内部测试",
      enterprise_type: "test",
    },
    {
      id: "ent_no_type",
      name: "普通企业D",
      enterprise_code: "NORM001",
      owner_phone: "13900139004",
      created_at: getNow(),
      updated_at: getNow(),
    },
  ],
  organizations: [
    // 根级部门
    {
      id: "org_root",
      enterprise_id: "ent_1",
      name: "默认组织",
      parent_id: null,
      level: 1,
      path: "org_root",
      status: "active",
      monthly_budget: 50000,
      current_month_budget: 12500,
      admin_phone: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    // 一级部门
    {
      id: "org_tech",
      enterprise_id: "ent_1",
      name: "技术研发部",
      parent_id: "org_root",
      level: 2,
      path: "org_root.org_tech",
      status: "active",
      monthly_budget: 20000,
      current_month_budget: 8000,
      admin_phone: "13800138001",
      key_template_id: "tpl_tech",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "org_product",
      enterprise_id: "ent_1",
      name: "产品运营部",
      parent_id: "org_root",
      level: 2,
      path: "org_root.org_product",
      status: "active",
      monthly_budget: 15000,
      current_month_budget: 3000,
      admin_phone: "13800138002",
      key_template_id: "tpl_biz",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "org_market",
      enterprise_id: "ent_1",
      name: "市场销售部",
      parent_id: "org_root",
      level: 2,
      path: "org_root.org_market",
      status: "active",
      monthly_budget: 10000,
      current_month_budget: 500,
      admin_phone: "13800138003",
      key_template_id: "tpl_biz",
      created_at: getNow(),
      updated_at: getNow(),
    },
    // 技术部子部门
    {
      id: "org_frontend",
      enterprise_id: "ent_1",
      name: "前端开发组",
      parent_id: "org_tech",
      level: 3,
      path: "org_root.org_tech.org_frontend",
      status: "active",
      monthly_budget: 8000,
      current_month_budget: 3200,
      admin_phone: "13800138004",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "org_backend",
      enterprise_id: "ent_1",
      name: "后端开发组",
      parent_id: "org_tech",
      level: 3,
      path: "org_root.org_tech.org_backend",
      status: "active",
      monthly_budget: 8000,
      current_month_budget: 4000,
      admin_phone: "13800138005",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "org_ai",
      enterprise_id: "ent_1",
      name: "AI算法组",
      parent_id: "org_tech",
      level: 3,
      path: "org_root.org_tech.org_ai",
      status: "active",
      monthly_budget: 12000,
      current_month_budget: 6000,
      admin_phone: "13800138006",
      key_template_id: "tpl_ai",
      created_at: getNow(),
      updated_at: getNow(),
    },
    // 产品运营部子部门
    {
      id: "org_pm",
      enterprise_id: "ent_1",
      name: "产品经理组",
      parent_id: "org_product",
      level: 3,
      path: "org_root.org_product.org_pm",
      status: "active",
      monthly_budget: 5000,
      current_month_budget: 1000,
      admin_phone: "13800138002",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "org_ops",
      enterprise_id: "ent_1",
      name: "运营推广组",
      parent_id: "org_product",
      level: 3,
      path: "org_root.org_product.org_ops",
      status: "active",
      monthly_budget: 6000,
      current_month_budget: 1500,
      admin_phone: "13800138007",
      created_at: getNow(),
      updated_at: getNow(),
    },
  ],
  members: [
    // 企业管理员
    {
      id: "member_admin",
      user_phone: TEST_PHONE,
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "admin",
      status: "active",
      created_at: getNow(),
    },
    // 企业直属成员（可作为部门管理员候选人）
    {
      id: "member_root_1",
      user_phone: "13800138001",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 1000,
      budget_type: "monthly",
      created_at: getNow(),
    },
    {
      id: "member_root_2",
      user_phone: "13800138002",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 800,
      budget_type: "daily",
      created_at: getNow(),
    },
    {
      id: "member_root_3",
      user_phone: "13800138003",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 800,
      budget_type: "unlimited",
      created_at: getNow(),
    },
    {
      id: "member_root_4",
      user_phone: "13800138004",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 1000,
      budget_type: "monthly",
      created_at: getNow(),
    },
    {
      id: "member_root_5",
      user_phone: "13800138005",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 600,
      created_at: getNow(),
    },
    {
      id: "member_root_6",
      user_phone: "13800138006",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 1200,
      created_at: getNow(),
    },
    // 技术研发部成员
    {
      id: "member_tech_1",
      user_phone: "13800138001",
      enterprise_id: "ent_1",
      organization_id: "org_tech",
      role: "org_admin",
      status: "active",
      daily_limit: 1000,
      budget_type: "daily",
      created_at: getNow(),
    },
    {
      id: "member_tech_2",
      user_phone: "13800138004",
      enterprise_id: "ent_1",
      organization_id: "org_frontend",
      role: "member",
      status: "active",
      daily_limit: 800,
      budget_type: "monthly",
      created_at: getNow(),
    },
    {
      id: "member_tech_3",
      user_phone: "13800138005",
      enterprise_id: "ent_1",
      organization_id: "org_backend",
      role: "member",
      status: "active",
      daily_limit: 800,
      budget_type: "unlimited",
      created_at: getNow(),
    },
    {
      id: "member_tech_4",
      user_phone: "13800138006",
      enterprise_id: "ent_1",
      organization_id: "org_ai",
      role: "org_admin",
      status: "active",
      daily_limit: 1200,
      budget_type: "daily",
      created_at: getNow(),
    },
    // 普通成员 - 前端组
    {
      id: "member_fe_1",
      user_phone: "13800138008",
      enterprise_id: "ent_1",
      organization_id: "org_frontend",
      role: "member",
      status: "active",
      daily_limit: 500,
      budget_type: "unlimited",
      created_at: getNow(),
    },
    // 产品运营部成员
    {
      id: "member_pm_1",
      user_phone: "13800138002",
      enterprise_id: "ent_1",
      organization_id: "org_product",
      role: "org_admin",
      status: "active",
      daily_limit: 600,
      budget_type: "monthly",
      created_at: getNow(),
    },
    {
      id: "member_ops_1",
      user_phone: "13800138007",
      enterprise_id: "ent_1",
      organization_id: "org_ops",
      role: "member",
      status: "active",
      daily_limit: 700,
      budget_type: "daily",
      created_at: getNow(),
    },
    // 市场销售部成员
    {
      id: "member_market_1",
      user_phone: "13800138003",
      enterprise_id: "ent_1",
      organization_id: "org_market",
      role: "org_admin",
      status: "active",
      daily_limit: 500,
      budget_type: "unlimited",
      created_at: getNow(),
    },
    // 仅有邮箱的企业直属成员（未分配部门）
    {
      id: "member_email_1",
      user_phone: "-",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 800,
      budget_type: "daily",
      created_at: getNow(),
    },
    {
      id: "member_email_2",
      user_phone: "-",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 600,
      budget_type: "monthly",
      created_at: getNow(),
    },
    // 同时有手机号和邮箱的成员
    {
      id: "member_both_1",
      user_phone: "13100131007",
      enterprise_id: "ent_1",
      organization_id: "org_root",
      role: "member",
      status: "active",
      daily_limit: 1000,
      budget_type: "unlimited",
      created_at: getNow(),
    },
  ],
  apiKeys: [
    {
      id: "key_1",
      name: "生产环境密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: TEST_PHONE,
      status: "active",
      models: ["gpt-4", "gpt-3.5-turbo"],
      groups: ["Claude-原厂直连（×0.85）", "Claude-Code（×0.9）", "A-通用渠道-全站模型可用（×0.95）"],
      rate_limit: 1000,
      monthly_quota: 10000,
      used_quota: 2345,
      expires_at: getFutureDate(365),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_2",
      name: "测试环境密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: TEST_PHONE,
      status: "active",
      models: ["gpt-3.5-turbo"],
      groups: ["官方价格（×1.0）", "生产通道（×0.95）", "测试环境（×0.8）", "开发环境（×0.7）", "内部工具（×0.5）"],
      rate_limit: 100,
      monthly_quota: 1000,
      used_quota: 123,
      expires_at: getFutureDate(30),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_3",
      name: "前端组密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138004",
      status: "active",
      models: ["gpt-3.5-turbo", "claude-3"],
      groups: ["GPT-4专线（×0.88）", "通用模型池（×0.92）", "经济型通道（×0.75）"],
      rate_limit: 500,
      monthly_quota: 5000,
      used_quota: 2100,
      expires_at: getFutureDate(180),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_4",
      name: "AI组密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138006",
      status: "active",
      models: ["gpt-4", "claude-3"],
      groups: ["Claude-3优先（×0.82）", "GPT-4-Turbo（×0.9）", "多模型聚合（×0.85）", "备用通道（×0.95）", "海外节点（×0.78）"],
      rate_limit: 2000,
      monthly_quota: 20000,
      used_quota: 8500,
      expires_at: getFutureDate(365),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_5",
      name: "后端服务密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138005",
      status: "active",
      models: ["gpt-4", "gpt-3.5-turbo", "claude-3-sonnet"],
      rate_limit: 5000,
      monthly_quota: 50000,
      used_quota: 12500,
      expires_at: getFutureDate(90),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_6",
      name: "数据组密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138007",
      status: "disabled",
      models: ["gpt-3.5-turbo"],
      rate_limit: 200,
      monthly_quota: 2000,
      used_quota: 0,
      expires_at: getFutureDate(7),
      last_used_at: null,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_7",
      name: "运维监控密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138008",
      status: "active",
      models: ["gpt-3.5-turbo", "gemini-pro"],
      rate_limit: 300,
      monthly_quota: 3000,
      used_quota: 2800,
      expires_at: getFutureDate(60),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_8",
      name: "客服系统密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138009",
      status: "active",
      models: ["gpt-3.5-turbo", "claude-3-haiku"],
      rate_limit: 800,
      monthly_quota: 8000,
      used_quota: 4560,
      expires_at: getFutureDate(180),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_9",
      name: "内部工具密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: TEST_PHONE,
      status: "disabled",
      models: ["gpt-4"],
      rate_limit: 100,
      monthly_quota: null,
      used_quota: 500,
      expires_at: null,
      last_used_at: getPastDate(2),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_10",
      name: "营销自动化密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138010",
      status: "active",
      models: ["gpt-4", "gpt-3.5-turbo", "claude-3"],
      rate_limit: 1500,
      monthly_quota: 15000,
      used_quota: 9200,
      expires_at: getFutureDate(120),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_11",
      name: "研发测试密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138011",
      status: "active",
      models: ["gpt-3.5-turbo"],
      rate_limit: 50,
      monthly_quota: 500,
      used_quota: 125,
      expires_at: getFutureDate(14),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "key_12",
      name: "财务报表密钥",
      key: generateApiKey(),
      enterprise_id: "ent_1",
      user_phone: "13800138012",
      status: "active",
      models: ["gpt-4", "gpt-4-turbo"],
      rate_limit: 400,
      monthly_quota: 8000,
      used_quota: 3200,
      expires_at: getFutureDate(200),
      last_used_at: getNow(),
      created_at: getNow(),
      updated_at: getNow(),
    },
  ],
  models: [
    {
      id: "model_1",
      name: "GPT-4",
      provider: "openai",
      model_id: "gpt-4",
      enterprise_id: null,
      is_public: true,
      config: { temperature: 0.7, max_tokens: 4096 },
      status: "active",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "model_2",
      name: "GPT-3.5 Turbo",
      provider: "openai",
      model_id: "gpt-3.5-turbo",
      enterprise_id: null,
      is_public: true,
      config: { temperature: 0.7, max_tokens: 2048 },
      status: "active",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "model_3",
      name: "Claude 3 Opus",
      provider: "anthropic",
      model_id: "claude-3-opus",
      enterprise_id: null,
      is_public: true,
      config: { temperature: 0.5, max_tokens: 4096 },
      status: "active",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "model_4",
      name: "Claude 3 Sonnet",
      provider: "anthropic",
      model_id: "claude-3-sonnet",
      enterprise_id: null,
      is_public: true,
      config: { temperature: 0.5, max_tokens: 4096 },
      status: "active",
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "model_5",
      name: "企业自定义模型",
      provider: "custom",
      model_id: "enterprise-model-v1",
      enterprise_id: "ent_1",
      is_public: false,
      config: { temperature: 0.8, max_tokens: 8192, custom_endpoint: "https://api.example.com" },
      status: "active",
      created_at: getNow(),
      updated_at: getNow(),
    },
  ],
  invitations: [
    {
      id: "inv_1",
      enterprise_id: "ent_1",
      organization_id: "org_frontend",
      inviter_phone: TEST_PHONE,
      invitee_phone: "13900139001",
      invite_code: generateInviteCode(),
      role: "member",
      status: "pending",
      max_uses: 1,
      use_count: 0,
      expires_at: getFutureDate(7),
      created_at: getNow(),
    },
    {
      id: "inv_2",
      enterprise_id: "ent_1",
      organization_id: "org_backend",
      inviter_phone: TEST_PHONE,
      invitee_phone: "13900139002",
      invite_code: generateInviteCode(),
      role: "member",
      status: "pending",
      max_uses: 1,
      use_count: 0,
      expires_at: getFutureDate(7),
      created_at: getNow(),
    },
  ],
  keyTemplates: [
    {
      id: "tpl_tech",
      enterprise_id: "ent_1",
      name: "研发部模板",
      description: "技术研发部门专用，开放高端模型",
      config: {
        groups: ["生产通道（×0.95）", "开发环境（×0.8）"],
        expires: "",
        quota: "",
        unlimited: true,
        models: ["gpt-4o", "claude-3-5-sonnet", "gpt-4o-mini"],
        ipWhitelist: "",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "tpl_ai",
      enterprise_id: "ent_1",
      name: "AI算法组模板",
      description: "AI算法研究专用，全模型开放，额度充足",
      config: {
        groups: ["生产通道（×0.95）"],
        expires: "",
        quota: "",
        unlimited: true,
        models: ["gpt-4o", "claude-3-5-sonnet", "gemini-1.5-pro", "gemini-1.5-flash"],
        ipWhitelist: "192.168.1.0/24",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "tpl_biz",
      enterprise_id: "ent_1",
      name: "业务部门模板",
      description: "产品/运营/市场使用，限制为低成本模型",
      config: {
        groups: ["生产通道（×0.95）"],
        expires: "",
        quota: "500",
        unlimited: false,
        models: ["gpt-4o-mini", "claude-3-haiku"],
        ipWhitelist: "",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "tpl_test",
      enterprise_id: "ent_1",
      name: "测试环境模板",
      description: "测试环境专用，低额度",
      config: {
        groups: ["测试环境（×0.85）"],
        expires: "",
        quota: "100",
        unlimited: false,
        models: ["gpt-4o-mini"],
        ipWhitelist: "",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "tpl_outsource",
      enterprise_id: "ent_1",
      name: "外包驻场模板",
      description: "外包人员专用，限制 IP 段，仅低成本模型",
      config: {
        groups: ["生产通道（×0.95）"],
        expires: "",
        quota: "300",
        unlimited: false,
        models: ["gpt-4o-mini", "claude-3-haiku"],
        ipWhitelist: "10.0.5.0/24",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "tpl_temp_project",
      enterprise_id: "ent_1",
      name: "临时项目模板",
      description: "短期项目专用，设置过期时间与额度上限",
      config: {
        groups: ["生产通道（×0.95）"],
        expires: "2026-12-31",
        quota: "1000",
        unlimited: false,
        models: ["gpt-4o", "gpt-4o-mini"],
        ipWhitelist: "",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "tpl_customer_service",
      enterprise_id: "ent_1",
      name: "客服部门模板",
      description: "客服部门专用，仅开放对话模型，限额 200",
      config: {
        groups: ["生产通道（×0.95）"],
        expires: "",
        quota: "200",
        unlimited: false,
        models: ["gpt-4o-mini"],
        ipWhitelist: "203.0.113.10",
      },
      created_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
  ],
  deptModelPolicies: [
    {
      id: "dmp_tech",
      enterprise_id: "ent_1",
      name: "研发部模型策略",
      bound_org_ids: ["org_root", "org_tech"],
      allowed_models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "claude-3-5-sonnet", "claude-3-haiku", "claude-3-opus", "claude-3-sonnet", "deepseek-chat", "deepseek-coder", "qwen-max", "qwen-plus", "glm-4", "glm-4-flash"],
      updated_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
    {
      id: "dmp_market",
      enterprise_id: "ent_1",
      name: "市场部模型策略",
      bound_org_ids: ["org_market"],
      allowed_models: ["gpt-4o-mini", "gpt-3.5-turbo", "claude-3-haiku", "glm-4-flash", "qwen-turbo", "deepseek-coder"],
      updated_by: TEST_PHONE,
      created_at: getNow(),
      updated_at: getNow(),
    },
  ],
  auditLogs: [],
};

// ===== 数据管理函数 =====
export function initMockData(): void {
  const existing = localStorage.getItem(MOCK_DATA_KEY);
  const savedVersion = localStorage.getItem(`${MOCK_DATA_KEY}_version`);
  
  // 如果没有数据或版本不匹配，重置数据
  if (!existing || savedVersion !== MOCK_DATA_VERSION) {
    localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(initialData));
    localStorage.setItem(`${MOCK_DATA_KEY}_version`, MOCK_DATA_VERSION);
    console.log("[MockData] 初始化mock数据完成 (版本:", MOCK_DATA_VERSION, ")");
  }
}

export function getMockData(): MockData {
  initMockData();
  const data = localStorage.getItem(MOCK_DATA_KEY);
  if (!data) return initialData;
  const parsed = JSON.parse(data);
  // 确保所有字段都存在（兼容旧版本数据）
  return {
    users: parsed.users ?? [],
    enterprises: parsed.enterprises ?? [],
    organizations: parsed.organizations ?? [],
    members: parsed.members ?? [],
    apiKeys: parsed.apiKeys ?? [],
    models: parsed.models ?? [],
    invitations: parsed.invitations ?? [],
    keyTemplates: parsed.keyTemplates ?? [],
    deptModelPolicies: parsed.deptModelPolicies ?? [],
    auditLogs: parsed.auditLogs ?? [],
  };
}

export function saveMockData(data: MockData): void {
  localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(data));
}

export function resetMockData(): void {
  localStorage.setItem(MOCK_DATA_KEY, JSON.stringify(initialData));
  localStorage.setItem(`${MOCK_DATA_KEY}_version`, MOCK_DATA_VERSION);
  console.log("[MockData] 重置mock数据完成 (版本:", MOCK_DATA_VERSION, ")");
}

// ===== 用户相关 API =====
export async function getOrCreateUser(phone: string): Promise<MockUser> {
  await delay(300);
  const data = getMockData();
  let user = data.users.find((u) => u.phone === phone);

  if (!user) {
    user = {
      id: generateId(),
      phone,
      name: null,
      avatar: null,
      created_at: getNow(),
    };
    data.users.push(user);
    saveMockData(data);
  }

  return user;
}

export async function updateUser(
  phone: string,
  updates: Partial<Pick<MockUser, "name" | "avatar">>
): Promise<MockUser> {
  await delay(200);
  const data = getMockData();
  const userIndex = data.users.findIndex((u) => u.phone === phone);

  if (userIndex === -1) {
    throw new Error("用户不存在");
  }

  data.users[userIndex] = { ...data.users[userIndex], ...updates };
  saveMockData(data);
  return data.users[userIndex];
}

// ===== 企业相关 API =====
export async function createEnterprise(
  name: string,
  phone: string
): Promise<MockEnterprise> {
  await delay(400);
  const data = getMockData();

  // 检查限制
  const ownedCount = data.enterprises.filter(
    (e) => e.owner_phone === phone
  ).length;
  if (ownedCount >= 3) {
    throw new Error("每人最多创建3个企业");
  }

  // 创建企业
  const enterprise: MockEnterprise = {
    id: generateId(),
    name,
    enterprise_code: generateEnterpriseCode(),
    owner_phone: phone,
    created_at: getNow(),
    updated_at: getNow(),
  };
  data.enterprises.push(enterprise);

  // 创建默认组织
  const defaultOrg: MockOrganization = {
    id: generateId(),
    enterprise_id: enterprise.id,
    name: "默认组织",
    parent_id: null,
    level: 1,
    path: "",
    status: "active",
    created_at: getNow(),
    updated_at: getNow(),
  };
  defaultOrg.path = defaultOrg.id;
  data.organizations.push(defaultOrg);

  // 添加创建者为管理员
  const member: MockMember = {
    id: generateId(),
    user_phone: phone,
    enterprise_id: enterprise.id,
    organization_id: defaultOrg.id,
    role: "admin",
    status: "active",
    created_at: getNow(),
  };
  data.members.push(member);

  saveMockData(data);
  return enterprise;
}

export async function getUserEnterprises(phone: string): Promise<
  Array<{
    id: string;
    role: string;
    enterprise_id: string;
    organization_id: string;
    enterprises: MockEnterprise;
    organizations: MockOrganization | null;
  }>
> {
  await delay(300);
  const data = getMockData();
  const members = data.members.filter((m) => m.user_phone === phone);

  return members.map((m) => {
    const enterprise = data.enterprises.find((e) => e.id === m.enterprise_id);
    const organization = data.organizations.find(
      (o) => o.id === m.organization_id
    );
    return {
      id: m.id,
      role: m.role,
      enterprise_id: m.enterprise_id,
      organization_id: m.organization_id || "",
      enterprises: enterprise!,
      organizations: organization || null,
    };
  });
}

export async function getEnterpriseById(id: string): Promise<MockEnterprise | null> {
  await delay(200);
  const data = getMockData();
  return data.enterprises.find((e) => e.id === id) || null;
}

export async function updateEnterprise(
  id: string,
  updates: Partial<Pick<MockEnterprise, "name">>
): Promise<MockEnterprise> {
  await delay(200);
  const data = getMockData();
  const index = data.enterprises.findIndex((e) => e.id === id);
  if (index === -1) throw new Error("企业不存在");

  data.enterprises[index] = {
    ...data.enterprises[index],
    ...updates,
    updated_at: getNow(),
  };
  saveMockData(data);
  return data.enterprises[index];
}

export async function deleteEnterprise(id: string): Promise<void> {
  await delay(300);
  const data = getMockData();
  
  // 删除企业及其关联数据
  data.enterprises = data.enterprises.filter((e) => e.id !== id);
  data.organizations = data.organizations.filter((o) => o.enterprise_id !== id);
  data.members = data.members.filter((m) => m.enterprise_id !== id);
  data.apiKeys = data.apiKeys.filter((k) => k.enterprise_id !== id);
  data.invitations = data.invitations.filter((i) => i.enterprise_id !== id);
  
  saveMockData(data);
}

// ===== 组织相关 API =====
export async function getEnterpriseOrganizations(
  enterpriseId: string
): Promise<MockOrganization[]> {
  await delay(200);
  const data = getMockData();
  return data.organizations.filter((o) => o.enterprise_id === enterpriseId);
}

export async function createOrganization(
  enterpriseId: string,
  name: string,
  parentId: string | null,
  extra?: { monthly_budget?: number | null; admin_phone?: string | null; status?: string }
): Promise<MockOrganization> {
  await delay(300);
  const data = getMockData();

  const parent = parentId
    ? data.organizations.find((o) => o.id === parentId)
    : null;

  const organization: MockOrganization = {
    id: generateId(),
    enterprise_id: enterpriseId,
    name,
    parent_id: parentId,
    level: parent ? parent.level + 1 : 1,
    path: parent ? `${parent.path}.${generateId()}` : generateId(),
    status: extra?.status || "active",
    monthly_budget: extra?.monthly_budget ?? null,
    admin_phone: extra?.admin_phone ?? null,
    created_at: getNow(),
    updated_at: getNow(),
  };

  data.organizations.push(organization);
  saveMockData(data);
  return organization;
}

export async function updateOrganization(
  id: string,
  updates: Partial<Pick<MockOrganization, "name" | "parent_id" | "status" | "monthly_budget" | "admin_phone" | "default_monthly_budget" | "budget_override" | "alert_enabled" | "alert_threshold">>
): Promise<MockOrganization> {
  await delay(200);
  const data = getMockData();
  const index = data.organizations.findIndex((o) => o.id === id);
  if (index === -1) throw new Error("组织不存在");

  const org = data.organizations[index];
  
  // 如果更改了父组织，更新层级和路径
  if (updates.parent_id !== undefined && updates.parent_id !== org.parent_id) {
    const parent = updates.parent_id
      ? data.organizations.find((o) => o.id === updates.parent_id)
      : null;
    org.level = parent ? parent.level + 1 : 1;
    org.path = parent ? `${parent.path}.${org.id}` : org.id;
    org.parent_id = updates.parent_id;
  }

  if (updates.name !== undefined) org.name = updates.name;
  if (updates.status !== undefined) org.status = updates.status;
  if (updates.monthly_budget !== undefined) org.monthly_budget = updates.monthly_budget;
  if (updates.admin_phone !== undefined) org.admin_phone = updates.admin_phone;
  
  org.updated_at = getNow();
  data.organizations[index] = org;
  saveMockData(data);
  return org;
}

export async function deleteOrganization(id: string): Promise<void> {
  await delay(300);
  const data = getMockData();
  
  // 检查是否有子组织
  const hasChildren = data.organizations.some((o) => o.parent_id === id);
  if (hasChildren) {
    throw new Error("请先删除子组织");
  }
  
  data.organizations = data.organizations.filter((o) => o.id !== id);
  saveMockData(data);
}

// ===== 成员相关 API =====
export async function getEnterpriseMembers(enterpriseId: string): Promise<
  Array<{
    id: string;
    user_phone: string;
    role: string;
    organization_id: string | null;
    enterprise_id: string;
    status?: string;
    daily_limit?: number | null;
    created_at: string;
    users?: { phone: string; name: string | null; avatar: string | null };
    organizations?: { id: string; name: string } | null;
  }>
> {
  await delay(300);
  const data = getMockData();
  const members = data.members.filter((m) => m.enterprise_id === enterpriseId);

  return members.map((m) => {
    const user = data.users.find((u) => u.phone === m.user_phone);
    const org = data.organizations.find((o) => o.id === m.organization_id);
    return {
      ...m,
      users: user
        ? {
            phone: user.phone,
            name: user.name,
            avatar: user.avatar,
          }
        : undefined,
      organizations: org ? { id: org.id, name: org.name } : null,
    };
  });
}

export async function getOrganizationMembers(organizationId: string): Promise<
  Array<{
    id: string;
    user_phone: string;
    role: string;
    status?: string;
    daily_limit?: number | null;
    created_at: string;
    users?: { phone: string; name: string | null };
  }>
> {
  await delay(200);
  const data = getMockData();
  const members = data.members.filter((m) => m.organization_id === organizationId);

  return members.map((m) => {
    const user = data.users.find((u) => u.phone === m.user_phone);
    return {
      ...m,
      users: user ? { phone: user.phone, name: user.name } : undefined,
    };
  });
}

export async function addMember(
  enterpriseId: string,
  organizationId: string,
  userPhone: string,
  role: "admin" | "org_admin" | "member" = "member",
  extra?: { daily_limit?: number; status?: string }
): Promise<MockMember> {
  await delay(300);
  const data = getMockData();

  // 检查是否已存在
  const existing = data.members.find(
    (m) => m.user_phone === userPhone && m.enterprise_id === enterpriseId
  );
  if (existing) {
    throw new Error("该用户已是企业成员");
  }

  const member: MockMember = {
    id: generateId(),
    user_phone: userPhone,
    enterprise_id: enterpriseId,
    organization_id: organizationId,
    role,
    status: extra?.status || "active",
    daily_limit: extra?.daily_limit ?? null,
    created_at: getNow(),
  };

  data.members.push(member);
  saveMockData(data);
  return member;
}

export async function updateMember(
  memberId: string,
  updates: Partial<Pick<MockMember, "role" | "organization_id" | "status" | "daily_limit">>
): Promise<MockMember> {
  await delay(200);
  const data = getMockData();
  const index = data.members.findIndex((m) => m.id === memberId);
  if (index === -1) throw new Error("成员不存在");

  data.members[index] = { ...data.members[index], ...updates };
  saveMockData(data);
  return data.members[index];
}

export async function removeMember(memberId: string): Promise<void> {
  await delay(200);
  const data = getMockData();
  data.members = data.members.filter((m) => m.id !== memberId);
  saveMockData(data);
}

// ===== API Key 相关 API =====
export async function getEnterpriseApiKeys(
  enterpriseId: string
): Promise<MockApiKey[]> {
  await delay(200);
  const data = getMockData();
  return data.apiKeys.filter((k) => k.enterprise_id === enterpriseId);
}

export async function createApiKey(
  enterpriseId: string,
  phone: string,
  config: {
    name: string;
    models: string[];
    rate_limit: number;
    monthly_quota: number;
    expires_days?: number;
  }
): Promise<MockApiKey> {
  await delay(300);
  const data = getMockData();

  const apiKey: MockApiKey = {
    id: generateId(),
    name: config.name,
    key: generateApiKey(),
    enterprise_id: enterpriseId,
    user_phone: phone,
    status: "active",
    models: config.models,
    rate_limit: config.rate_limit,
    monthly_quota: config.monthly_quota,
    used_quota: 0,
    expires_at: config.expires_days ? getFutureDate(config.expires_days) : null,
    last_used_at: null,
    created_at: getNow(),
    updated_at: getNow(),
  };

  data.apiKeys.push(apiKey);
  saveMockData(data);
  return apiKey;
}

export async function updateApiKey(
  id: string,
  updates: Partial<
    Pick<
      MockApiKey,
      | "name"
      | "status"
      | "models"
      | "rate_limit"
      | "monthly_quota"
      | "expires_at"
    >
  >
): Promise<MockApiKey> {
  await delay(200);
  const data = getMockData();
  const index = data.apiKeys.findIndex((k) => k.id === id);
  if (index === -1) throw new Error("API Key不存在");

  data.apiKeys[index] = {
    ...data.apiKeys[index],
    ...updates,
    updated_at: getNow(),
  };
  saveMockData(data);
  return data.apiKeys[index];
}

export async function deleteApiKey(id: string): Promise<void> {
  await delay(200);
  const data = getMockData();
  data.apiKeys = data.apiKeys.filter((k) => k.id !== id);
  saveMockData(data);
}

// ===== 模型相关 API =====
export async function getAllModels(): Promise<MockModel[]> {
  await delay(200);
  const data = getMockData();
  const phone = localStorage.getItem(CURRENT_PHONE_KEY);
  
  // 获取用户的企业ID
  const userEnterprises = data.members
    .filter((m) => m.user_phone === phone)
    .map((m) => m.enterprise_id);

  // 返回公共模型 + 用户企业的私有模型
  return data.models.filter(
    (m) => m.is_public || (m.enterprise_id && userEnterprises.includes(m.enterprise_id))
  );
}

export async function getEnterpriseCustomModels(
  enterpriseId: string
): Promise<MockModel[]> {
  await delay(200);
  const data = getMockData();
  return data.models.filter(
    (m) => !m.is_public && m.enterprise_id === enterpriseId
  );
}

export async function createCustomModel(
  enterpriseId: string,
  config: {
    name: string;
    provider: string;
    model_id: string;
    modelConfig: Record<string, any>;
  }
): Promise<MockModel> {
  await delay(300);
  const data = getMockData();

  const model: MockModel = {
    id: generateId(),
    name: config.name,
    provider: config.provider,
    model_id: config.model_id,
    enterprise_id: enterpriseId,
    is_public: false,
    config: config.modelConfig,
    status: "active",
    created_at: getNow(),
    updated_at: getNow(),
  };

  data.models.push(model);
  saveMockData(data);
  return model;
}

export async function updateModel(
  id: string,
  updates: Partial<Pick<MockModel, "name" | "config" | "status">>
): Promise<MockModel> {
  await delay(200);
  const data = getMockData();
  const index = data.models.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("模型不存在");

  data.models[index] = {
    ...data.models[index],
    ...updates,
    updated_at: getNow(),
  };
  saveMockData(data);
  return data.models[index];
}

export async function deleteModel(id: string): Promise<void> {
  await delay(200);
  const data = getMockData();
  data.models = data.models.filter((m) => m.id !== id);
  saveMockData(data);
}

// ===== 邀请相关 API =====
export async function getPendingInvitations(phone: string): Promise<
  Array<{
    id: string;
    enterprise_id: string;
    organization_id: string | null;
    inviter_phone: string;
    invitee_phone: string;
    invite_code: string;
    role: string;
    status: string;
    max_uses: number;
    use_count: number;
    expires_at: string;
    created_at: string;
    enterprises?: { name: string; enterprise_code: string };
  }>
> {
  await delay(300);
  const data = getMockData();
  const now = getNow();
  
  const invitations = data.invitations.filter(
    (i) =>
      i.invitee_phone === phone &&
      i.status === "pending" &&
      i.expires_at > now
  );

  return invitations.map((inv) => {
    const enterprise = data.enterprises.find((e) => e.id === inv.enterprise_id);
    return {
      ...inv,
      enterprises: enterprise
        ? {
            name: enterprise.name,
            enterprise_code: enterprise.enterprise_code,
          }
        : undefined,
    };
  });
}

export async function createInvitation(
  enterpriseId: string,
  inviterPhone: string,
  config: {
    invitee_phone: string;
    organization_id?: string;
    role?: "admin" | "org_admin" | "member";
    max_uses?: number;
    expires_days?: number;
  }
): Promise<MockInvitation> {
  await delay(300);
  const data = getMockData();

  const invitation: MockInvitation = {
    id: generateId(),
    enterprise_id: enterpriseId,
    organization_id: config.organization_id || null,
    inviter_phone: inviterPhone,
    invitee_phone: config.invitee_phone,
    invite_code: generateInviteCode(),
    role: config.role || "member",
    status: "pending",
    max_uses: config.max_uses || 1,
    use_count: 0,
    expires_at: getFutureDate(config.expires_days || 7),
    created_at: getNow(),
  };

  data.invitations.push(invitation);
  saveMockData(data);
  return invitation;
}

export async function acceptInvitation(
  invitationId: string,
  phone: string
): Promise<void> {
  await delay(300);
  const data = getMockData();
  const invitation = data.invitations.find((i) => i.id === invitationId);

  if (!invitation) throw new Error("邀请不存在");
  if (invitation.status !== "pending") throw new Error("邀请已处理");
  if (new Date(invitation.expires_at) < new Date()) throw new Error("邀请已过期");
  if (invitation.use_count >= invitation.max_uses) throw new Error("邀请次数已用完");
  if (invitation.invitee_phone !== phone) throw new Error("该邀请不属于您");

  // 检查是否已经是成员
  const existingMember = data.members.find(
    (m) => m.user_phone === phone && m.enterprise_id === invitation.enterprise_id
  );
  if (existingMember) throw new Error("您已加入该企业");

  // 添加成员
  const member: MockMember = {
    id: generateId(),
    user_phone: phone,
    enterprise_id: invitation.enterprise_id,
    organization_id: invitation.organization_id,
    role: invitation.role,
    status: "active",
    created_at: getNow(),
  };
  data.members.push(member);

  // 更新邀请
  invitation.status = "accepted";
  invitation.use_count += 1;
  
  saveMockData(data);
}

export async function rejectInvitation(invitationId: string): Promise<void> {
  await delay(200);
  const data = getMockData();
  const invitation = data.invitations.find((i) => i.id === invitationId);
  
  if (!invitation) throw new Error("邀请不存在");
  if (invitation.status !== "pending") throw new Error("邀请已处理");
  
  invitation.status = "rejected";
  saveMockData(data);
}

export async function joinByCode(code: string, phone: string): Promise<void> {
  await delay(300);
  const data = getMockData();
  const invitation = data.invitations.find(
    (i) => i.invite_code === code.toUpperCase()
  );

  if (!invitation) throw new Error("邀请码无效");
  if (invitation.status === "rejected") throw new Error("邀请已被拒绝");
  if (new Date(invitation.expires_at) < new Date()) throw new Error("邀请已过期");
  if (invitation.use_count >= invitation.max_uses) throw new Error("邀请次数已用完");

  // 检查是否已经是成员
  const existingMember = data.members.find(
    (m) => m.user_phone === phone && m.enterprise_id === invitation.enterprise_id
  );
  if (existingMember) throw new Error("您已加入该企业");

  // 添加成员
  const member: MockMember = {
    id: generateId(),
    user_phone: phone,
    enterprise_id: invitation.enterprise_id,
    organization_id: invitation.organization_id,
    role: "member",
    status: "active",
    created_at: getNow(),
  };
  data.members.push(member);

  // 更新邀请
  invitation.use_count += 1;
  if (invitation.use_count >= invitation.max_uses) {
    invitation.status = "accepted";
  }
  
  saveMockData(data);
}

// ===== 个人工作空间 API =====
export async function createPersonalWorkspace(phone: string): Promise<{
  id: string;
  user_phone: string;
  name: string;
  created_at: string;
}> {
  await delay(200);
  const WORKSPACE_KEY = `personal_workspace_${phone}`;
  const existing = localStorage.getItem(WORKSPACE_KEY);
  
  if (existing) {
    return JSON.parse(existing);
  }

  const workspace = {
    id: `personal_${phone}_${Date.now()}`,
    user_phone: phone,
    name: "我的空间",
    created_at: getNow(),
  };

  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  return workspace;
}

export function getPersonalWorkspace(phone: string): {
  id: string;
  user_phone: string;
  name: string;
  created_at: string;
} | null {
  const WORKSPACE_KEY = `personal_workspace_${phone}`;
  const data = localStorage.getItem(WORKSPACE_KEY);
  return data ? JSON.parse(data) : null;
}

// ===== Key 配置模板 API =====
export async function listKeyTemplates(enterpriseId: string) {
  await delay(200);
  const data = getMockData();
  const templates = data.keyTemplates.filter(t => t.enterprise_id === enterpriseId);
  return templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    config: t.config,
    created_at: t.created_at,
    updated_at: t.updated_at,
    bound_orgs: data.organizations.filter(o => o.key_template_id === t.id).length,
  }));
}

export async function createKeyTemplate(args: {
  enterprise_id: string;
  name: string;
  description: string | null;
  config: any;
  bound_org_ids: string[] | null;
  created_by?: string;
}) {
  await delay(200);
  const data = getMockData();
  const tpl: MockKeyTemplate = {
    id: "tpl_" + Date.now(),
    enterprise_id: args.enterprise_id,
    name: args.name,
    description: args.description,
    config: args.config,
    created_by: args.created_by || null,
    created_at: getNow(),
    updated_at: getNow(),
  };
  data.keyTemplates.push(tpl);
  // 绑定部门
  if (args.bound_org_ids && args.bound_org_ids.length > 0) {
    data.organizations.forEach(o => {
      if (args.bound_org_ids!.includes(o.id)) {
        o.key_template_id = tpl.id;
      }
    });
  }
  saveMockData(data);
  return tpl;
}

export async function updateKeyTemplate(args: {
  id: string;
  name: string;
  description: string | null;
  config: any;
  bound_org_ids: string[] | null;
}) {
  await delay(200);
  const data = getMockData();
  const tpl = data.keyTemplates.find(t => t.id === args.id);
  if (!tpl) throw new Error("模板不存在");
  tpl.name = args.name;
  tpl.description = args.description;
  tpl.config = args.config;
  tpl.updated_at = getNow();
  // 重新计算绑定：原来绑在本模板但不在新列表 → 解绑
  data.organizations.forEach(o => {
    if (o.key_template_id === args.id && (!args.bound_org_ids || !args.bound_org_ids.includes(o.id))) {
      o.key_template_id = null;
    }
  });
  // 新列表里的部门 → 绑到本模板（覆盖其他模板绑定）
  if (args.bound_org_ids && args.bound_org_ids.length > 0) {
    data.organizations.forEach(o => {
      if (args.bound_org_ids!.includes(o.id)) {
        o.key_template_id = args.id;
      }
    });
  }
  saveMockData(data);
  return tpl;
}

export async function deleteKeyTemplate(id: string) {
  await delay(200);
  const data = getMockData();
  const idx = data.keyTemplates.findIndex(t => t.id === id);
  if (idx === -1) return;
  data.keyTemplates.splice(idx, 1);
  // 解绑部门
  data.organizations.forEach(o => {
    if (o.key_template_id === id) o.key_template_id = null;
  });
  saveMockData(data);
}

export async function copyKeyTemplate(id: string) {
  await delay(200);
  const data = getMockData();
  const orig = data.keyTemplates.find(t => t.id === id);
  if (!orig) throw new Error("模板不存在");
  const tpl: MockKeyTemplate = {
    id: "tpl_" + Date.now(),
    enterprise_id: orig.enterprise_id,
    name: orig.name + "（副本）",
    description: orig.description,
    config: JSON.parse(JSON.stringify(orig.config)),
    created_by: orig.created_by,
    created_at: getNow(),
    updated_at: getNow(),
  };
  data.keyTemplates.push(tpl);
  saveMockData(data);
  return tpl;
}

export async function getMemberKeyTemplate(phone: string, enterpriseId: string) {
  await delay(100);
  const data = getMockData();
  const member = data.members.find(m => m.user_phone === phone && m.enterprise_id === enterpriseId && m.status === "active");
  if (!member || !member.organization_id) return null;
  const org = data.organizations.find(o => o.id === member.organization_id);
  if (!org || !org.key_template_id) return null;
  const tpl = data.keyTemplates.find(t => t.id === org.key_template_id);
  return tpl ? tpl.config : null;
}

export async function getOrgKeyTemplate(orgId: string) {
  await delay(100);
  const data = getMockData();
  const org = data.organizations.find(o => o.id === orgId);
  if (!org || !org.key_template_id) return null;
  const tpl = data.keyTemplates.find(t => t.id === org.key_template_id);
  return tpl ? tpl.config : null;
}

export async function getOrgsWithTemplate(enterpriseId: string) {
  await delay(100);
  const data = getMockData();
  return data.organizations
    .filter(o => o.enterprise_id === enterpriseId && o.status === "active")
    .map(o => ({ id: o.id, name: o.name, key_template_id: o.key_template_id || null }));
}

// ===== 部门模型访问策略 API =====

// 获取企业下所有策略
export async function listDeptModelPolicies(enterpriseId: string): Promise<MockDeptModelPolicy[]> {
  await delay(100);
  const data = getMockData();
  return (data.deptModelPolicies || []).filter((p) => p.enterprise_id === enterpriseId);
}

// 创建策略
export async function createDeptModelPolicy(
  enterpriseId: string,
  name: string,
  boundOrgIds: string[],
  allowedModels: string[] | null,
  operatorPhone: string
): Promise<MockDeptModelPolicy> {
  await delay(200);
  const data = getMockData();
  const policy: MockDeptModelPolicy = {
    id: generateId(),
    enterprise_id: enterpriseId,
    name,
    bound_org_ids: boundOrgIds,
    allowed_models: allowedModels,
    updated_by: operatorPhone,
    created_at: getNow(),
    updated_at: getNow(),
  };
  data.deptModelPolicies.push(policy);

  // 记录审计日志
  const orgNames = data.organizations
    .filter((o) => boundOrgIds.includes(o.id))
    .map((o) => o.name);
  data.auditLogs.push({
    id: generateId(),
    enterprise_id: enterpriseId,
    action: "创建部门模型访问策略",
    operator: operatorPhone,
    detail: { policy_name: name, bound_orgs: orgNames, allowed_models: allowedModels },
    created_at: getNow(),
  });

  saveMockData(data);
  return policy;
}

// 更新策略
export async function updateDeptModelPolicy(
  enterpriseId: string,
  policyId: string,
  name: string,
  boundOrgIds: string[],
  allowedModels: string[] | null,
  operatorPhone: string
): Promise<MockDeptModelPolicy> {
  await delay(200);
  const data = getMockData();
  const idx = data.deptModelPolicies.findIndex(
    (p) => p.id === policyId && p.enterprise_id === enterpriseId
  );
  if (idx === -1) throw new Error("策略不存在");

  const previous = data.deptModelPolicies[idx];
  const previousModels = previous.allowed_models;
  const previousOrgs = previous.bound_org_ids;

  data.deptModelPolicies[idx].name = name;
  data.deptModelPolicies[idx].bound_org_ids = boundOrgIds;
  data.deptModelPolicies[idx].allowed_models = allowedModels;
  data.deptModelPolicies[idx].updated_by = operatorPhone;
  data.deptModelPolicies[idx].updated_at = getNow();
  const policy = data.deptModelPolicies[idx];

  // 记录审计日志
  const orgNames = data.organizations
    .filter((o) => boundOrgIds.includes(o.id))
    .map((o) => o.name);
  data.auditLogs.push({
    id: generateId(),
    enterprise_id: enterpriseId,
    action: "修改部门模型访问策略",
    operator: operatorPhone,
    detail: {
      policy_id: policyId,
      policy_name: name,
      bound_orgs: orgNames,
      previous_allowed_models: previousModels,
      new_allowed_models: allowedModels,
      previous_bound_org_ids: previousOrgs,
      new_bound_org_ids: boundOrgIds,
    },
    created_at: getNow(),
  });

  saveMockData(data);
  return policy;
}

// 删除策略
export async function deleteDeptModelPolicy(
  enterpriseId: string,
  policyId: string,
  operatorPhone: string
): Promise<void> {
  await delay(150);
  const data = getMockData();
  const policy = data.deptModelPolicies.find(
    (p) => p.id === policyId && p.enterprise_id === enterpriseId
  );
  if (!policy) throw new Error("策略不存在");

  data.deptModelPolicies = data.deptModelPolicies.filter((p) => p.id !== policyId);

  data.auditLogs.push({
    id: generateId(),
    enterprise_id: enterpriseId,
    action: "删除部门模型访问策略",
    operator: operatorPhone,
    detail: { policy_id: policyId, policy_name: policy.name },
    created_at: getNow(),
  });

  saveMockData(data);
}

// 同步获取部门的模型访问策略（用于调用链路校验）
export function getDeptModelPolicySync(enterpriseId: string, orgId: string): MockDeptModelPolicy | null {
  const data = getMockData();
  if (!Array.isArray(data.deptModelPolicies)) return null;
  return (
    data.deptModelPolicies.find(
      (p) => p.enterprise_id === enterpriseId && p.bound_org_ids?.includes(orgId)
    ) || null
  );
}

// 统计策略影响的部门数量和 API Key 数量
export function getPolicyImpact(
  enterpriseId: string,
  boundOrgIds: string[]
): { deptCount: number; keyCount: number } {
  const data = getMockData();
  const memberPhones = new Set(
    (data.members || [])
      .filter(
        (member) =>
          member.enterprise_id === enterpriseId &&
          !!member.organization_id &&
          boundOrgIds.includes(member.organization_id)
      )
      .map((member) => member.user_phone)
  );
  const keyCount = (data.apiKeys || []).filter(
    (key) => key.enterprise_id === enterpriseId && memberPhones.has(key.user_phone)
  ).length;
  return { deptCount: boundOrgIds.length, keyCount };
}

// 获取用户所属部门允许的模型列表（null 表示全部允许）
export function getAllowedModelsForUser(phone: string, enterpriseId: string): string[] | null {
  const data = getMockData();
  if (!data || !Array.isArray(data.members)) return null;
  const member = data.members.find(
    (m) => m.user_phone === phone && m.enterprise_id === enterpriseId && m.status === "active"
  );
  if (!member || !member.organization_id) return null;
  if (!Array.isArray(data.deptModelPolicies)) return null;
  const policy = data.deptModelPolicies.find(
    (p) => p.enterprise_id === enterpriseId && p.bound_org_ids?.includes(member.organization_id)
  );
  return policy?.allowed_models ?? null;
}

// 获取用户所属部门允许的模型列表（异步版本）
export async function getAllowedModelsForUserAsync(phone: string, enterpriseId: string): Promise<string[] | null> {
  await delay(100);
  return getAllowedModelsForUser(phone, enterpriseId);
}

// 获取部门模型策略审计日志
export async function getDeptModelPolicyAuditLogs(enterpriseId: string): Promise<MockAuditLog[]> {
  await delay(200);
  const data = getMockData();
  return (data.auditLogs || [])
    .filter((log) => log.enterprise_id === enterpriseId && log.action.includes("部门模型访问策略"))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// 初始化
try {
  initMockData();
} catch (e) {
  console.error("[MockData] 初始化失败:", e);
}
