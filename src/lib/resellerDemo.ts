export type ResellerStatus = "enabled" | "disabled";

export interface DemoReseller {
  id: string;
  code: string;
  name: string;
  domain: string;
  status: ResellerStatus;
  remark: string;
  logoDataUrl?: string;
  createdAt: string;
  balance?: number;
  totalFunded?: number;
  totalCustomerRecharge?: number;
  actualCustomerConsumed?: number;
  customerDiscount?: number;
  commissionRate?: number;
  creditLimit?: number;
  creditBalance?: number;
  modelAccess?: string[];
  rebateRates?: {
    text: number;
    video: number;
    audio: number;
    music: number;
  };
}

export interface DemoResellerRebateBill {
  id: string;
  resellerId: string;
  period: string;
  consumptionAfterDiscount: number;
  rebateAmount: number;
  status: "pending" | "confirmed" | "paid";
  createdAt: string;
}

export interface DemoLedgerEntry {
  id: string;
  resellerId: string;
  type: "platform_funding" | "customer_recharge" | "adjustment" | "commission" | "credit_adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  targetType?: "user" | "enterprise";
  targetId?: string;
  targetName?: string;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface DemoResellerBill {
  id: string;
  resellerId: string;
  customerType: "user" | "enterprise";
  customerName: string;
  customerId: string;
  period: string;
  originalAmount: number;
  discount: number;
  settlementAmount: number;
  actualConsumed: number;
  status: "pending" | "paid";
  createdAt: string;
}

export interface DemoUserAssignment {
  phone: string;
  name: string;
  resellerId: string | null;
  status: "active" | "banned";
  createdAt: string;
  locallyCreated?: boolean;
  balance?: number;
  discount?: number;
  modelAccess?: string[];
  group?: string;
}

export interface DemoEnterpriseAssignment {
  enterpriseId: string;
  resellerId: string | null;
  balance?: number;
  discount?: number;
}

export interface DemoMigration {
  id: string;
  objectType: "user" | "enterprise";
  objectId: string;
  fromResellerId: string | null;
  toResellerId: string | null;
  reason: string;
  affectedPhones: string[];
  createdAt: string;
}

interface DemoState {
  resellers: DemoReseller[];
  users: DemoUserAssignment[];
  enterprises: DemoEnterpriseAssignment[];
  resellerAdmins: Array<{ resellerId: string; phone: string; role: string }>;
  migrations: DemoMigration[];
  ledger: DemoLedgerEntry[];
  bills: DemoResellerBill[];
  rebateBills: DemoResellerRebateBill[];
}

const STORAGE_KEY = "friendly_doors_reseller_demo_v1";

const initialState: DemoState = {
  resellers: [
    { id: "agent-001", code: "AGENT-A", name: "代理商A", domain: "a.friendlydoors.cn", status: "enabled", remark: "重点合作伙伴", createdAt: "2026-06-01T09:00:00.000Z", balance: 86500, creditLimit: 20000, creditBalance: 20000, totalFunded: 120000, totalCustomerRecharge: 33500, actualCustomerConsumed: 18760, customerDiscount: 0.92, commissionRate: 0.08 },
    { id: "agent-002", code: "AGENT-B", name: "代理商B", domain: "b.friendlydoors.cn", status: "enabled", remark: "华东区域", createdAt: "2026-06-12T09:00:00.000Z", balance: 42800, totalFunded: 60000, totalCustomerRecharge: 17200, actualCustomerConsumed: 9420, customerDiscount: 0.95, commissionRate: 0.05 },
    { id: "agent-003", code: "AGENT-C", name: "代理商C", domain: "c.friendlydoors.cn", status: "disabled", remark: "暂停合作", createdAt: "2026-07-01T09:00:00.000Z", balance: 0, totalFunded: 10000, totalCustomerRecharge: 10000, customerDiscount: 1, commissionRate: 0 },
    { id: "agent-004", code: "AGENT-D", name: "云启科技", domain: "yunqi.friendlydoors.cn", status: "enabled", remark: "华南区域", createdAt: "2026-07-08T09:00:00.000Z" },
    { id: "agent-005", code: "AGENT-E", name: "星河数智", domain: "xinghe.friendlydoors.cn", status: "enabled", remark: "重点合作伙伴", createdAt: "2026-07-15T09:00:00.000Z" },
    { id: "agent-006", code: "AGENT-F", name: "北辰云服", domain: "beichen.friendlydoors.cn", status: "enabled", remark: "华北区域", createdAt: "2026-07-22T09:00:00.000Z" },
    { id: "agent-007", code: "AGENT-G", name: "智联未来", domain: "zhilian.friendlydoors.cn", status: "disabled", remark: "合同续签中", createdAt: "2026-08-01T09:00:00.000Z" },
    { id: "agent-008", code: "AGENT-H", name: "海纳算力", domain: "haina.friendlydoors.cn", status: "enabled", remark: "新签约", createdAt: "2026-08-08T09:00:00.000Z" },
  ],
  users: [
    { phone: "13800138001", name: "张三", resellerId: "agent-001", status: "active", createdAt: "2026-06-02T09:00:00.000Z" },
    { phone: "13800138002", name: "李四", resellerId: "agent-002", status: "active", createdAt: "2026-06-13T09:00:00.000Z", balance: 3600 },
    { phone: "13800138003", name: "王芳", resellerId: "agent-002", status: "active", createdAt: "2026-06-14T02:25:18.000Z", balance: 1280 },
    { phone: "13800138004", name: "赵磊", resellerId: "agent-002", status: "active", createdAt: "2026-06-15T06:42:36.000Z", balance: 8500 },
    { phone: "13800138005", name: "孙悦", resellerId: "agent-002", status: "banned", createdAt: "2026-06-18T08:16:09.000Z", balance: 0 },
    { phone: "13800138006", name: "刘洋", resellerId: "agent-002", status: "active", createdAt: "2026-06-20T01:08:52.000Z", balance: 920 },
    { phone: "13800138007", name: "陈静", resellerId: "agent-002", status: "active", createdAt: "2026-06-22T10:31:45.000Z", balance: 2450 },
    { phone: "13800138011", name: "周敏", resellerId: "agent-004", status: "active", createdAt: "2026-07-09T09:00:00.000Z" },
    { phone: "13800138012", name: "陈晨", resellerId: "agent-004", status: "active", createdAt: "2026-07-10T09:00:00.000Z" },
    { phone: "13800138013", name: "林浩", resellerId: "agent-004", status: "banned", createdAt: "2026-07-11T09:00:00.000Z" },
    { phone: "13800138021", name: "许文", resellerId: "agent-005", status: "active", createdAt: "2026-07-16T09:00:00.000Z" },
    { phone: "13800138022", name: "沈悦", resellerId: "agent-005", status: "active", createdAt: "2026-07-17T09:00:00.000Z" },
    { phone: "13800138023", name: "韩松", resellerId: "agent-005", status: "active", createdAt: "2026-07-18T09:00:00.000Z" },
    { phone: "13800138024", name: "叶宁", resellerId: "agent-005", status: "active", createdAt: "2026-07-19T09:00:00.000Z" },
    { phone: "13800138031", name: "唐宁", resellerId: "agent-006", status: "active", createdAt: "2026-07-23T09:00:00.000Z" },
    { phone: "13800138032", name: "程远", resellerId: "agent-006", status: "active", createdAt: "2026-07-24T09:00:00.000Z" },
    { phone: "13800138041", name: "陆洋", resellerId: "agent-007", status: "banned", createdAt: "2026-08-02T09:00:00.000Z" },
    { phone: "13800138051", name: "江岚", resellerId: "agent-008", status: "active", createdAt: "2026-08-09T09:00:00.000Z" },
    { phone: "13800138052", name: "白帆", resellerId: "agent-008", status: "active", createdAt: "2026-08-10T09:00:00.000Z" },
  ],
  enterprises: [
    { enterpriseId: "mock-001", resellerId: "agent-001" },
    { enterpriseId: "mock-002", resellerId: "agent-002" },
    { enterpriseId: "demo-ent-004-1", resellerId: "agent-004" },
    { enterpriseId: "demo-ent-004-2", resellerId: "agent-004" },
    { enterpriseId: "demo-ent-005-1", resellerId: "agent-005" },
    { enterpriseId: "demo-ent-005-2", resellerId: "agent-005" },
    { enterpriseId: "demo-ent-005-3", resellerId: "agent-005" },
    { enterpriseId: "demo-ent-006-1", resellerId: "agent-006" },
    { enterpriseId: "demo-ent-008-1", resellerId: "agent-008" },
  ],
  resellerAdmins: [],
  migrations: [],
  ledger: [
    { id: "ledger-001", resellerId: "agent-001", type: "platform_funding", amount: 100000, balanceBefore: 0, balanceAfter: 100000, operator: "admin", remark: "首期合作款入账", createdAt: "2026-06-01T09:10:00.000Z" },
    { id: "ledger-002", resellerId: "agent-001", type: "customer_recharge", amount: -13500, balanceBefore: 100000, balanceAfter: 86500, targetType: "enterprise", targetId: "mock-001", targetName: "凯世通企业", operator: "agent_a", remark: "客户账户充值", createdAt: "2026-06-05T03:20:18.000Z" },
    { id: "ledger-005", resellerId: "agent-001", type: "adjustment", amount: -5000, balanceBefore: 86500, balanceAfter: 81500, operator: "finance_zhou", remark: "合同额度人工调减", createdAt: "2026-06-08T06:35:42.000Z" },
    { id: "ledger-006", resellerId: "agent-001", type: "credit_adjustment", amount: 20000, balanceBefore: 0, balanceAfter: 20000, operator: "admin", remark: "合作授信额度调整", createdAt: "2026-06-10T02:18:36.000Z" },
    { id: "ledger-003", resellerId: "agent-002", type: "platform_funding", amount: 60000, balanceBefore: 0, balanceAfter: 60000, operator: "admin", remark: "合作款充值", createdAt: "2026-06-12T09:20:00.000Z" },
    { id: "ledger-004", resellerId: "agent-002", type: "customer_recharge", amount: -14300, balanceBefore: 60000, balanceAfter: 45700, targetType: "user", targetId: "13800138002", targetName: "李四", operator: "agent_b", remark: "客户测试额度充值", createdAt: "2026-06-15T02:35:26.000Z" },
  ],
  bills: [
    { id: "RB202608001", resellerId: "agent-001", customerType: "enterprise", customerName: "凯世通企业", customerId: "mock-001", period: "2026-07", originalAmount: 8600, discount: 0.9, settlementAmount: 7740, actualConsumed: 7428.6, status: "paid", createdAt: "2026-08-01T02:10:00.000Z" },
    { id: "RB202608002", resellerId: "agent-001", customerType: "user", customerName: "张三", customerId: "13800138001", period: "2026-07", originalAmount: 3200, discount: 0.95, settlementAmount: 3040, actualConsumed: 2815.2, status: "paid", createdAt: "2026-08-01T02:15:00.000Z" },
    { id: "RB202608003", resellerId: "agent-001", customerType: "enterprise", customerName: "远航研发中心", customerId: "demo-ent-001-2", period: "2026-08", originalAmount: 6100, discount: 0.88, settlementAmount: 5368, actualConsumed: 4516.2, status: "pending", createdAt: "2026-08-15T03:20:00.000Z" },
    { id: "RB202608011", resellerId: "agent-002", customerType: "user", customerName: "李四", customerId: "13800138002", period: "2026-07", originalAmount: 4600, discount: 0.92, settlementAmount: 4232, actualConsumed: 3980.4, status: "paid", createdAt: "2026-08-01T03:10:00.000Z" },
    { id: "RB202608012", resellerId: "agent-002", customerType: "enterprise", customerName: "华东测试企业", customerId: "mock-002", period: "2026-08", originalAmount: 7800, discount: 0.9, settlementAmount: 7020, actualConsumed: 5440.8, status: "pending", createdAt: "2026-08-15T04:00:00.000Z" },
  ],
  rebateBills: [
    { id: "REBATE-2026-05-A", resellerId: "agent-001", period: "2026-05", consumptionAfterDiscount: 0.0844, rebateAmount: 0.01, status: "paid", createdAt: "2026-06-03T10:00:00.000Z" },
    { id: "REBATE-2026-06-A", resellerId: "agent-001", period: "2026-06", consumptionAfterDiscount: 4910.7638, rebateAmount: 640.93, status: "confirmed", createdAt: "2026-07-03T10:00:00.000Z" },
    { id: "REBATE-2026-06-B", resellerId: "agent-002", period: "2026-06", consumptionAfterDiscount: 2860.5, rebateAmount: 314.66, status: "paid", createdAt: "2026-07-03T11:00:00.000Z" },
    { id: "REBATE-2026-07-B", resellerId: "agent-002", period: "2026-07", consumptionAfterDiscount: 3980.4, rebateAmount: 438.84, status: "confirmed", createdAt: "2026-08-03T11:00:00.000Z" },
  ],
};

const cloneInitial = (): DemoState => JSON.parse(JSON.stringify(initialState));

export function getResellerDemoState(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const state = cloneInitial();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
  try {
    const parsed = JSON.parse(raw);
    parsed.resellers = (parsed.resellers || []).map((item: DemoReseller & { contact?: string }, index: number) => ({
      ...item,
      remark: item.remark ?? item.contact ?? "",
      logoDataUrl: item.logoDataUrl || "",
      balance: item.balance ?? Math.max(0, 50000 - index * 4300),
      totalFunded: item.totalFunded ?? Math.max(10000, 80000 - index * 5000),
      totalCustomerRecharge: item.totalCustomerRecharge ?? Math.max(0, 30000 - index * 700),
      actualCustomerConsumed: item.actualCustomerConsumed ?? Math.round((item.totalCustomerRecharge ?? Math.max(0, 30000 - index * 700)) * 0.56),
      customerDiscount: item.customerDiscount ?? 0.95,
      commissionRate: item.commissionRate ?? 0.05,
      creditLimit: item.id === "agent-001" && !parsed.ledger?.some((entry: DemoLedgerEntry) => entry.id === "ledger-006") ? 20000 : (item.creditLimit ?? 0),
      creditBalance: item.id === "agent-001" && !parsed.ledger?.some((entry: DemoLedgerEntry) => entry.id === "ledger-006") ? 20000 : (item.creditBalance ?? 0),
      rebateRates: item.rebateRates ?? { text: 0.1, video: 0.5, audio: 0.4, music: 0.4 },
    }));
    initialState.resellers.forEach((item) => { if (!parsed.resellers.some((saved: DemoReseller) => saved.id === item.id)) parsed.resellers.push({ ...item }); });
    parsed.users = parsed.users || [];
    initialState.users.forEach((item) => { if (!parsed.users.some((saved: DemoUserAssignment) => saved.phone === item.phone)) parsed.users.push({ ...item }); });
    parsed.enterprises = parsed.enterprises || [];
    initialState.enterprises.forEach((item) => { if (!parsed.enterprises.some((saved: DemoEnterpriseAssignment) => saved.enterpriseId === item.enterpriseId)) parsed.enterprises.push({ ...item }); });
    parsed.ledger = parsed.ledger || [];
    parsed.ledger = parsed.ledger.map((item: DemoLedgerEntry) => ({
      ...item,
      operator: item.operator === "平台管理员" ? "admin" : item.operator === "代理商管理员" ? (item.resellerId === "agent-001" ? "agent_a" : "agent_b") : item.operator,
    }));
    initialState.ledger.forEach((item) => { if (!parsed.ledger.some((saved: DemoLedgerEntry) => saved.id === item.id)) parsed.ledger.push({ ...item }); });
    parsed.bills = parsed.bills || [];
    initialState.bills.forEach((item) => { if (!parsed.bills.some((saved: DemoResellerBill) => saved.id === item.id)) parsed.bills.push({ ...item }); });
    parsed.rebateBills = parsed.rebateBills || [];
    initialState.rebateBills.forEach((item) => { if (!parsed.rebateBills.some((saved: DemoResellerRebateBill) => saved.id === item.id)) parsed.rebateBills.push({ ...item }); });
    parsed.rebateBills = parsed.rebateBills.filter((item: DemoResellerRebateBill) => !item.period.includes("Q")).map((item: DemoResellerRebateBill) => {
      const rate = parsed.resellers.find((reseller: DemoReseller) => reseller.id === item.resellerId)?.commissionRate ?? 0;
      return { ...item, rebateAmount: Number((item.consumptionAfterDiscount * rate).toFixed(2)) };
    });
    return { ...cloneInitial(), ...parsed };
  } catch {
    return cloneInitial();
  }
}

function save(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("reseller-demo-changed"));
}

export function resetResellerDemo() {
  save(cloneInitial());
}

export function upsertReseller(input: Omit<DemoReseller, "id" | "createdAt"> & { id?: string }) {
  const state = getResellerDemoState();
  const duplicate = state.resellers.find((item) => item.domain.toLowerCase() === input.domain.toLowerCase() && item.id !== input.id);
  if (duplicate) throw new Error("该域名已绑定其他代理商");
  if (input.id) {
    state.resellers = state.resellers.map((item) => item.id === input.id ? { ...item, ...input } as DemoReseller : item);
  } else {
    state.resellers.unshift({ ...input, id: `agent-${Date.now()}`, createdAt: new Date().toISOString() });
  }
  save(state);
}

export function setResellerStatus(id: string, status: ResellerStatus) {
  const state = getResellerDemoState();
  state.resellers = state.resellers.map((item) => item.id === id ? { ...item, status } : item);
  save(state);
}

export function getUserAssignment(phone: string) {
  return getResellerDemoState().users.find((item) => item.phone === phone);
}

export function addDemoUser(input: { phone: string; name: string; resellerId: string | null; modelAccess?: string[]; group?: string }) {
  const state = getResellerDemoState();
  if (state.users.some((item) => item.phone === input.phone)) throw new Error("该手机号已存在，不能重复添加到其他代理商");
  if (input.resellerId && !state.resellers.some((item) => item.id === input.resellerId && item.status === "enabled")) throw new Error("只能添加到已启用的代理商");
  state.users.unshift({ ...input, status: "active", createdAt: new Date().toISOString(), locallyCreated: true });
  save(state);
}

export function setDemoUserStatus(phone: string, status: "active" | "banned") {
  const state = getResellerDemoState();
  const existing = state.users.find((item) => item.phone === phone);
  if (existing) existing.status = status;
  else state.users.push({ phone, name: phone, resellerId: null, status, createdAt: new Date().toISOString() });
  save(state);
}

export function deleteDemoUser(phone: string) {
  const state = getResellerDemoState();
  state.users = state.users.filter((item) => item.phone !== phone);
  save(state);
}

export function setEnterpriseAssignment(enterpriseId: string, resellerId: string | null) {
  const state = getResellerDemoState();
  const existing = state.enterprises.find((item) => item.enterpriseId === enterpriseId);
  if (existing) existing.resellerId = resellerId;
  else state.enterprises.push({ enterpriseId, resellerId });
  save(state);
}

export function preflightEnterpriseMigration(input: { enterpriseId: string; memberPhones: string[]; linkedEnterprises: Array<{ phone: string; enterpriseId: string; enterpriseName: string }> }) {
  const conflicts = input.linkedEnterprises.filter((item) => item.enterpriseId !== input.enterpriseId);
  return { ok: conflicts.length === 0, conflicts, affectedPhones: [...new Set(input.memberPhones)] };
}

export function migrateEnterprise(input: { enterpriseId: string; memberPhones: string[]; toResellerId: string | null; reason: string }) {
  const state = getResellerDemoState();
  const enterprise = state.enterprises.find((item) => item.enterpriseId === input.enterpriseId);
  const from = enterprise?.resellerId ?? null;
  if (enterprise) enterprise.resellerId = input.toResellerId;
  else state.enterprises.push({ enterpriseId: input.enterpriseId, resellerId: input.toResellerId });
  input.memberPhones.forEach((phone) => {
    const user = state.users.find((item) => item.phone === phone);
    if (user) user.resellerId = input.toResellerId;
    else state.users.push({ phone, name: phone, resellerId: input.toResellerId, status: "active", createdAt: new Date().toISOString() });
  });
  state.migrations.unshift({ id: `migration-${Date.now()}`, objectType: "enterprise", objectId: input.enterpriseId, fromResellerId: from, toResellerId: input.toResellerId, reason: input.reason, affectedPhones: input.memberPhones, createdAt: new Date().toISOString() });
  save(state);
}

export function preflightUserMigration(phone: string, enterpriseRefs: Array<{ id: string; name: string }>) {
  if (enterpriseRefs.length) return { ok: false, blockers: enterpriseRefs.map((item) => `用户仍关联企业「${item.name}」`), affectedPhones: [phone] };
  return { ok: true, blockers: [] as string[], affectedPhones: [phone] };
}

export function migrateUser(phone: string, toResellerId: string | null, reason: string) {
  const state = getResellerDemoState();
  const target = state.users.find((item) => item.phone === phone);
  const from = target?.resellerId ?? null;
  if (target) target.resellerId = toResellerId;
  else state.users.push({ phone, name: phone, resellerId: toResellerId, status: "active", createdAt: new Date().toISOString() });
  state.migrations.unshift({ id: `migration-${Date.now()}`, objectType: "user", objectId: phone, fromResellerId: from, toResellerId, reason, affectedPhones: [phone], createdAt: new Date().toISOString() });
  save(state);
}

export function getResellerName(id: string | null | undefined, state = getResellerDemoState()) {
  if (!id) return "平台直客";
  return state.resellers.find((item) => item.id === id)?.name || "未知代理商";
}

export function fundReseller(resellerId: string, amount: number, remark: string) {
  if (!Number.isFinite(amount) || amount === 0) throw new Error("请输入有效金额");
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === resellerId);
  if (!reseller) throw new Error("代理商不存在");
  const before = reseller.balance || 0;
  const after = before + amount;
  if (after < 0) throw new Error("调整后余额不能小于 0");
  reseller.balance = after;
  reseller.totalFunded = (reseller.totalFunded || 0) + Math.max(0, amount);
  state.ledger.unshift({ id: `ledger-${Date.now()}`, resellerId, type: amount > 0 ? "platform_funding" : "adjustment", amount, balanceBefore: before, balanceAfter: after, operator: "admin", remark: remark || (amount > 0 ? "平台入账" : "平台余额调整"), createdAt: new Date().toISOString() });
  save(state);
}

export function rechargeCustomer(input: { resellerId: string; amount: number; targetType: "user" | "enterprise"; targetId: string; targetName: string; remark?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("充值金额必须大于 0");
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === input.resellerId);
  if (!reseller) throw new Error("代理商不存在");
  const cashBefore = reseller.balance || 0;
  const creditBefore = reseller.creditBalance || 0;
  const before = cashBefore + creditBefore;
  if (before < input.amount) throw new Error(`代理商可用总额度不足，当前可用 ¥${before.toFixed(2)}`);
  const cashUsed = Math.min(cashBefore, input.amount);
  reseller.balance = cashBefore - cashUsed;
  reseller.creditBalance = creditBefore - (input.amount - cashUsed);
  reseller.totalCustomerRecharge = (reseller.totalCustomerRecharge || 0) + input.amount;
  if (input.targetType === "user") {
    const target = state.users.find((item) => item.phone === input.targetId);
    if (target) target.balance = (target.balance || 0) + input.amount;
  } else {
    const target = state.enterprises.find((item) => item.enterpriseId === input.targetId);
    if (target) target.balance = (target.balance || 0) + input.amount;
  }
  state.ledger.unshift({ id: `ledger-${Date.now()}`, resellerId: input.resellerId, type: "customer_recharge", amount: -input.amount, balanceBefore: before, balanceAfter: before - input.amount, targetType: input.targetType, targetId: input.targetId, targetName: input.targetName, operator: "agent_operator", remark: input.remark || "客户账户充值", createdAt: new Date().toISOString() });
  save(state);
}

export function updateResellerFinanceSettings(resellerId: string, commissionRate: number) {
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === resellerId);
  if (!reseller) throw new Error("代理商不存在");
  reseller.commissionRate = commissionRate;
  save(state);
}

export function updateResellerRebateRates(resellerId: string, rates: DemoReseller["rebateRates"]) {
  if (!rates || Object.values(rates).some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("返佣折扣必须在 0% 到 100% 之间");
  }
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === resellerId);
  if (!reseller) throw new Error("代理商不存在");
  reseller.rebateRates = rates;
  save(state);
}

export function setCustomerDiscount(type: "user" | "enterprise", id: string, discount: number) {
  if (!Number.isFinite(discount) || discount <= 0 || discount > 1) throw new Error("折扣必须大于 0 且不超过 100%");
  const state = getResellerDemoState();
  if (type === "user") {
    const target = state.users.find((item) => item.phone === id);
    if (!target) throw new Error("用户不存在");
    target.discount = discount;
  } else {
    const target = state.enterprises.find((item) => item.enterpriseId === id);
    if (!target) throw new Error("企业不存在");
    target.discount = discount;
  }
  save(state);
}

export function setResellerCredit(resellerId: string, targetBalance: number, remark: string) {
  if (!Number.isFinite(targetBalance) || targetBalance < 0) throw new Error("授信额度不能小于 0");
  const state = getResellerDemoState();
  const reseller = state.resellers.find((item) => item.id === resellerId);
  if (!reseller) throw new Error("代理商不存在");
  const before = reseller.creditBalance || 0;
  reseller.creditBalance = targetBalance;
  reseller.creditLimit = Math.max(reseller.creditLimit || 0, targetBalance);
  state.ledger.unshift({ id: `ledger-${Date.now()}`, resellerId, type: "credit_adjustment", amount: targetBalance - before, balanceBefore: before, balanceAfter: targetBalance, operator: "admin", remark: remark || "调整代理商剩余授信额度", createdAt: new Date().toISOString() });
  save(state);
}
