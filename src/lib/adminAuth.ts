import { supabase } from "@/integrations/supabase/client";

const ADMIN_SESSION_KEY = "admin_session";

export interface AdminSession {
  id: string;
  phone: string;
  name: string | null;
  role: string;
}

function hashPassword(password: string): string {
  // Simple SHA-256 via Web Crypto API is async; for demo we use a deterministic encode.
  // In production, use bcrypt via edge function. Here we do a btoa hash for demo purposes.
  return btoa(encodeURIComponent(password));
}

export async function adminLogin(
  phone: string,
  password: string
): Promise<{ session: AdminSession | null; error: string | null }> {
  const passwordHash = hashPassword(password);

  const { data, error } = await supabase.rpc("verify_admin_login", {
    p_phone: phone,
    p_password_hash: passwordHash,
  });

  if (error) return { session: null, error: error.message };

  const rows = data as AdminSession[] | null;
  if (!rows || rows.length === 0) {
    return { session: null, error: "账号或密码错误" };
  }

  const session = rows[0];
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return { session, error: null };
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminSession(): AdminSession | null {
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function isAdminLoggedIn(): boolean {
  return getAdminSession() !== null;
}
