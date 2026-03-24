// Mock auth using localStorage + Supabase for data persistence
// Phone-based login: any phone + code "123456"

import { supabase } from "@/integrations/supabase/client";

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
  // Ensure user record exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (!existing) {
    await supabase.from("users").insert({ phone });
  }

  setCurrentPhone(phone);
}

export async function getPendingInvitations(phone: string) {
  const { data } = await supabase
    .from("invitations")
    .select("*, enterprises(name, enterprise_code)")
    .eq("invitee_phone", phone)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
  return data || [];
}

export async function getUserEnterprises(phone: string) {
  const { data } = await supabase
    .from("members")
    .select("*, enterprises(id, name, enterprise_code), organizations(id, name)")
    .eq("user_phone", phone);
  return data || [];
}

export async function acceptInvitation(invitationId: string, phone: string) {
  // Get invitation details
  const { data: inv } = await supabase
    .from("invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (!inv) throw new Error("邀请不存在");
  if (inv.status !== "pending") throw new Error("邀请已处理");
  if (new Date(inv.expires_at) < new Date()) throw new Error("邀请已过期");
  if (inv.use_count >= inv.max_uses) throw new Error("邀请次数已用完");

  // Check if already member
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("user_phone", phone)
    .eq("enterprise_id", inv.enterprise_id)
    .maybeSingle();
  if (existing) throw new Error("您已加入该企业");

  // Add member
  await supabase.from("members").insert({
    user_phone: phone,
    enterprise_id: inv.enterprise_id,
    organization_id: inv.organization_id,
    role: "member",
  });

  // Update invitation
  await supabase
    .from("invitations")
    .update({ status: "accepted", use_count: inv.use_count + 1 })
    .eq("id", invitationId);
}

export async function rejectInvitation(invitationId: string) {
  await supabase
    .from("invitations")
    .update({ status: "rejected" })
    .eq("id", invitationId);
}

export async function joinByCode(code: string, phone: string) {
  const { data: inv } = await supabase
    .from("invitations")
    .select("*")
    .eq("invite_code", code.toUpperCase())
    .maybeSingle();

  if (!inv) throw new Error("邀请码无效");
  if (inv.status === "rejected" || inv.status === "accepted") {
    // For multi-use codes, check use_count
    if (inv.use_count >= inv.max_uses) throw new Error("邀请链接次数已用完");
  }
  if (new Date(inv.expires_at) < new Date()) throw new Error("邀请链接已过期");
  if (inv.use_count >= inv.max_uses) throw new Error("邀请链接次数已用完");

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("user_phone", phone)
    .eq("enterprise_id", inv.enterprise_id)
    .maybeSingle();
  if (existing) throw new Error("您已加入该企业");

  await supabase.from("members").insert({
    user_phone: phone,
    enterprise_id: inv.enterprise_id,
    organization_id: inv.organization_id,
    role: "member",
  });

  await supabase
    .from("invitations")
    .update({ use_count: inv.use_count + 1 })
    .eq("id", inv.id);
}

export async function createEnterprise(name: string, phone: string) {
  // Check limit
  const { data: owned } = await supabase
    .from("enterprises")
    .select("id")
    .eq("owner_phone", phone);
  if (owned && owned.length >= 3) throw new Error("每人最多创建3个企业");

  // Create enterprise
  const { data: enterprise, error } = await supabase
    .from("enterprises")
    .insert({ name, owner_phone: phone })
    .select()
    .single();
  if (error || !enterprise) throw new Error("创建企业失败");

  // Create default organization
  const { data: org } = await supabase
    .from("organizations")
    .insert({ enterprise_id: enterprise.id, name: "默认组织" })
    .select()
    .single();

  // Add creator as admin
  await supabase.from("members").insert({
    user_phone: phone,
    enterprise_id: enterprise.id,
    organization_id: org?.id || null,
    role: "admin",
  });

  return enterprise;
}

// 创建个人工作空间（localStorage 版本，无需数据库迁移）
export async function createPersonalWorkspace(phone: string) {
  const WORKSPACE_KEY = `personal_workspace_${phone}`;

  // 检查是否已存在
  const existing = localStorage.getItem(WORKSPACE_KEY);
  if (existing) {
    return JSON.parse(existing);
  }

  // 创建个人空间（仅存储在本地）
  const workspace = {
    id: `personal_${phone}_${Date.now()}`,
    user_phone: phone,
    name: "我的空间",
    created_at: new Date().toISOString(),
  };

  // 保存到 localStorage
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));

  return workspace;
}

// 获取个人工作空间（localStorage 版本）
export function getPersonalWorkspace(phone: string) {
  const WORKSPACE_KEY = `personal_workspace_${phone}`;
  const data = localStorage.getItem(WORKSPACE_KEY);
  return data ? JSON.parse(data) : null;
}
