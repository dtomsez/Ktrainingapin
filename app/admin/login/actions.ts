"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, adminPassword } from "@/lib/adminAuth";
import { logEvent } from "@/lib/log";

export async function loginAdmin(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== adminPassword()) {
    await logEvent("LOGIN_FAIL");
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }
  await logEvent("LOGIN_SUCCESS");
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, adminToken(), {
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
