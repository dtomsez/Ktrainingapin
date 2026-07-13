import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ระบบรหัสผ่านฝั่งผู้อนุมัติ: รหัสผ่านเดียวร่วมกัน (ตั้งค่าใน .env → ADMIN_PASSWORD)
// เมื่อใส่ถูก จะได้ cookie ที่เซ็นด้วย HMAC — หน้า ยื่นคำขอ/ติดตามสถานะ เปิดสาธารณะไม่เกี่ยวกับระบบนี้

export const ADMIN_COOKIE = "ktb_admin_auth";

const secret = () => process.env.SESSION_SECRET ?? "apinya-training-request-secret-change-me-32ch";

export function adminToken(): string {
  return createHmac("sha256", secret()).update("admin-access").digest("hex");
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "krungthai123";
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === adminToken();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
