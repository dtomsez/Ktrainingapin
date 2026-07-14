"use server";

import { revalidatePath } from "next/cache";
import { addOption as addOptionDb, deleteOption as deleteOptionDb, getOptions } from "@/lib/db";
import { OPTION_CATEGORIES } from "@/lib/labels";
import { requireLevel1 } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";

const validCategory = (c: string) => OPTION_CATEGORIES.some((o) => o.key === c);

export async function addOption(_prev: { error?: string; category?: string } | undefined, formData: FormData) {
  const level = await requireLevel1();
  const category = String(formData.get("category") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!validCategory(category)) return { error: "หมวดหมู่ไม่ถูกต้อง", category };
  if (!name) return { error: "กรุณากรอกชื่อตัวเลือก", category };
  const added = await addOptionDb(category, name);
  if (!added) return { error: `มี "${name}" อยู่แล้ว`, category };
  await logEvent("OPTION_ADD", { actor: approverByStep(level)?.name, detail: `${category}: ${name}` });
  revalidatePath("/admin/data-control");
  revalidatePath("/");
  return { category };
}

export async function deleteOption(formData: FormData) {
  const level = await requireLevel1();
  const id = Number(formData.get("id"));
  if (!id) return;
  const removed = (await getOptions()).find((o) => o.id === id);
  await deleteOptionDb(id);
  await logEvent("OPTION_DELETE", { actor: approverByStep(level)?.name, detail: removed ? `${removed.category}: ${removed.name}` : `#${id}` });
  revalidatePath("/admin/data-control");
  revalidatePath("/");
}
