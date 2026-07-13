import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// ระบบรหัสผ่านฝั่งผู้อนุมัติ: แยกรหัสของแต่ละระดับ (1/2/3)
// ใส่ถูก → ได้ cookie ที่ระบุระดับ + เซ็นด้วย HMAC (ปลอมไม่ได้)
// หน้า ยื่นคำขอ/ติดตามสถานะ เปิดสาธารณะ ไม่เกี่ยวกับระบบนี้
// รหัสผ่านตั้งผ่าน env: APPROVER1_PASSWORD, APPROVER2_PASSWORD, APPROVER3_PASSWORD

export const ADMIN_COOKIE = "ktb_admin_auth";

const secret = () => process.env.SESSION_SECRET ?? "apinya-training-request-secret-change-me-32ch";

// รหัสผ่านเริ่มต้นของแต่ละระดับ (ควร override ด้วย env บน production)
const DEFAULT_PASSWORDS: Record<number, string> = {
  1: "hr123",
  2: "support123",
  3: "rti123",
};

export function passwordForLevel(level: number): string {
  return process.env[`APPROVER${level}_PASSWORD`] ?? DEFAULT_PASSWORDS[level];
}

// จับคู่รหัสผ่านกับระดับผู้อนุมัติ — คืน null ถ้าไม่ตรงระดับใดเลย
export function levelForPassword(password: string): number | null {
  for (const level of [1, 2, 3]) {
    if (password && password === passwordForLevel(level)) return level;
  }
  return null;
}

function tokenForLevel(level: number): string {
  return createHmac("sha256", secret()).update(`approver-access-${level}`).digest("hex");
}

// ค่า cookie = "<level>:<token>"
export function cookieValue(level: number): string {
  return `${level}:${tokenForLevel(level)}`;
}

// อ่านระดับผู้อนุมัติจาก cookie (ตรวจลายเซ็น) — คืน null ถ้าไม่ล็อกอิน/ปลอม
export async function currentLevel(): Promise<number | null> {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  const [levelStr, token] = raw.split(":");
  const level = Number(levelStr);
  if (![1, 2, 3].includes(level)) return null;
  return token === tokenForLevel(level) ? level : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await currentLevel()) !== null;
}

// ใช้ในหน้า admin ทั่วไป — ผู้อนุมัติระดับใดก็เข้าได้ คืนระดับของผู้ล็อกอิน
export async function requireAdmin(): Promise<number> {
  const level = await currentLevel();
  if (level === null) redirect("/admin/login");
  return level;
}
