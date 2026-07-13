"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, cookieValue, levelForPassword } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";

export async function loginAdmin(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const level = levelForPassword(password);
  if (level === null) {
    await logEvent("LOGIN_FAIL");
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  await logEvent("LOGIN_SUCCESS", { actor: approverByStep(level)?.name });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, cookieValue(level), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 ชั่วโมง
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
