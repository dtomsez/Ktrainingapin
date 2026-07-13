"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OPTION_CATEGORIES } from "@/lib/labels";
import { requireAdmin } from "@/lib/adminAuth";

const validCategory = (c: string) => OPTION_CATEGORIES.some((o) => o.key === c);

export async function addOption(_prev: { error?: string; category?: string } | undefined, formData: FormData) {
  await requireAdmin();
  const category = String(formData.get("category") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!validCategory(category)) return { error: "หมวดหมู่ไม่ถูกต้อง", category };
  if (!name) return { error: "กรุณากรอกชื่อตัวเลือก", category };
  const exists = await prisma.optionItem.findUnique({ where: { category_name: { category, name } } });
  if (exists) return { error: `มี "${name}" อยู่แล้ว`, category };
  await prisma.optionItem.create({ data: { category, name } });
  revalidatePath("/admin/data-control");
  revalidatePath("/");
  return { category };
}

export async function deleteOption(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.optionItem.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/data-control");
  revalidatePath("/");
}
