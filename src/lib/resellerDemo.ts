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
}

export interface DemoUserAssignment {
  phone: string;
  name: string;
  resellerId: string | null;
  status: "active" | "banned";
  createdAt: string;
  locallyCreated?: boolean;
}

export interface DemoEnterpriseAssignment {
  enterpriseId: string;
  resellerId: string | null;
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
}

const STORAGE_KEY = "friendly_doors_reseller_demo_v1";

const initialState: DemoState = {
  resellers: [
    { id: "agent-001", code: "AGENT-A", name: "代理商A", domain: "a.friendlydoors.cn", status: "enabled", remark: "重点合作伙伴", createdAt: "2026-06-01T09:00:00.000Z" },
    { id: "agent-002", code: "AGENT-B", name: "代理商B", domain: "b.friendlydoors.cn", status: "enabled", remark: "华东区域", createdAt: "2026-06-12T09:00:00.000Z" },
    { id: "agent-003", code: "AGENT-C", name: "代理商C", domain: "c.friendlydoors.cn", status: "disabled", remark: "暂停合作", createdAt: "2026-07-01T09:00:00.000Z" },
    { id: "agent-004", code: "AGENT-D", name: "云启科技", domain: "yunqi.friendlydoors.cn", status: "enabled", remark: "华南区域", createdAt: "2026-07-08T09:00:00.000Z" },
    { id: "agent-005", code: "AGENT-E", name: "星河数智", domain: "xinghe.friendlydoors.cn", status: "enabled", remark: "重点合作伙伴", createdAt: "2026-07-15T09:00:00.000Z" },
    { id: "agent-006", code: "AGENT-F", name: "北辰云服", domain: "beichen.friendlydoors.cn", status: "enabled", remark: "华北区域", createdAt: "2026-07-22T09:00:00.000Z" },
    { id: "agent-007", code: "AGENT-G", name: "智联未来", domain: "zhilian.friendlydoors.cn", status: "disabled", remark: "合同续签中", createdAt: "2026-08-01T09:00:00.000Z" },
    { id: "agent-008", code: "AGENT-H", name: "海纳算力", domain: "haina.friendlydoors.cn", status: "enabled", remark: "新签约", createdAt: "2026-08-08T09:00:00.000Z" },
  ],
  users: [
    { phone: "13800138001", name: "张三", resellerId: "agent-001", status: "active", createdAt: "2026-06-02T09:00:00.000Z" },
    { phone: "13800138002", name: "李四", resellerId: "agent-002", status: "active", createdAt: "2026-06-13T09:00:00.000Z" },
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
    parsed.resellers = (parsed.resellers || []).map((item: DemoReseller & { contact?: string }) => ({ ...item, remark: item.remark ?? item.contact ?? "", logoDataUrl: item.logoDataUrl || "" }));
    initialState.resellers.forEach((item) => { if (!parsed.resellers.some((saved: DemoReseller) => saved.id === item.id)) parsed.resellers.push({ ...item }); });
    parsed.users = parsed.users || [];
    initialState.users.forEach((item) => { if (!parsed.users.some((saved: DemoUserAssignment) => saved.phone === item.phone)) parsed.users.push({ ...item }); });
    parsed.enterprises = parsed.enterprises || [];
    initialState.enterprises.forEach((item) => { if (!parsed.enterprises.some((saved: DemoEnterpriseAssignment) => saved.enterpriseId === item.enterpriseId)) parsed.enterprises.push({ ...item }); });
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

export function addDemoUser(input: { phone: string; name: string; resellerId: string | null }) {
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
