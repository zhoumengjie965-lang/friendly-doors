// 纯前端 Mock 认证 - 不再依赖 Supabase
// 固定测试账号: 18217795009 (验证码: 123456)

import {
  getOrCreateUser,
  getPendingInvitations as mockGetPendingInvitations,
  getUserEnterprises as mockGetUserEnterprises,
  acceptInvitation as mockAcceptInvitation,
  rejectInvitation as mockRejectInvitation,
  joinByCode as mockJoinByCode,
  createEnterprise as mockCreateEnterprise,
  createPersonalWorkspace as mockCreatePersonalWorkspace,
  getPersonalWorkspace as mockGetPersonalWorkspace,
} from "./mockData";

const STORAGE_KEY = "ai_gateway_phone";

export function getCurrentPhone(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setCurrentPhone(phone: string) {
  localStorage.setItem(STORAGE_KEY, phone);
}

export function clearCurrentPhone() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function loginWithPhone(phone: string): Promise<void> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // 确保用户存在
  await getOrCreateUser(phone);
  
  setCurrentPhone(phone);
}

export async function getPendingInvitations(phone: string) {
  return mockGetPendingInvitations(phone);
}

export async function getUserEnterprises(phone: string) {
  console.log("[getUserEnterprises] 从 mock 数据获取:", phone);
  const result = await mockGetUserEnterprises(phone);
  console.log("[getUserEnterprises] 结果:", result);
  return result;
}

export async function acceptInvitation(invitationId: string, phone: string) {
  return mockAcceptInvitation(invitationId, phone);
}

export async function rejectInvitation(invitationId: string) {
  return mockRejectInvitation(invitationId);
}

export async function joinByCode(code: string, phone: string) {
  return mockJoinByCode(code, phone);
}

export async function createEnterprise(name: string, phone: string) {
  return mockCreateEnterprise(name, phone);
}

export async function createPersonalWorkspace(phone: string) {
  return mockCreatePersonalWorkspace(phone);
}

export function getPersonalWorkspace(phone: string) {
  return mockGetPersonalWorkspace(phone);
}
