"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pendingStep } from "@/lib/labels";
import { notifyApprover } from "@/lib/email";
import { requireAdmin } from "@/lib/adminAuth";

// ผู้อนุมัติของขั้นปัจจุบันอิงจากสถานะคำขอ — เข้าถึงได้เฉพาะผู้ที่ใส่รหัสผ่านแล้วเท่านั้น
export async function decide(_prev: { error?: string } | undefined, formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get("requestId"));
  const decision = String(formData.get("decision")); // APPROVE | REJECT
  const comment = String(formData.get("comment") ?? "").trim();
  const slotId = formData.get("slotId") ? Number(formData.get("slotId")) : null;

  const request = await prisma.trainingRequest.findUnique({
    where: { id: requestId },
    include: { slots: true },
  });
  if (!request) return { error: "ไม่พบคำขอ" };

  const step = pendingStep(request.status);
  if (!step) return { error: "คำขอนี้ถูกพิจารณาเสร็จสิ้นแล้ว" };

  const approver = await prisma.approver.findUnique({ where: { stepOrder: step } });
  if (!approver) return { error: `ไม่พบข้อมูลผู้อนุมัติท่านที่ ${step}` };

  if (decision === "REJECT") {
    if (!comment) return { error: "กรุณาระบุเหตุผลในการปฏิเสธ" };
    await prisma.$transaction([
      prisma.trainingRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } }),
      prisma.approvalAction.create({
        data: { requestId, approverId: approver.id, step, decision: "REJECT", comment },
      }),
    ]);
  } else if (decision === "APPROVE") {
    let selectedSlotId = request.selectedSlotId;
    if (step === 1) {
      if (!slotId || !request.slots.some((s) => s.id === slotId)) {
        return { error: "กรุณาเลือกวันที่ (Slot) ที่จะใช้จัดอบรมก่อนอนุมัติ" };
      }
      selectedSlotId = slotId;
    }
    const nextStatus = step === 3 ? "APPROVED" : `PENDING_${step + 1}`;
    await prisma.$transaction([
      prisma.trainingRequest.update({
        where: { id: requestId },
        data: { status: nextStatus, selectedSlotId },
      }),
      prisma.approvalAction.create({
        data: {
          requestId,
          approverId: approver.id,
          step,
          decision: "APPROVE",
          comment: comment || null,
        },
      }),
    ]);
    try {
      if (step < 3) {
        const next = await prisma.approver.findUnique({ where: { stepOrder: step + 1 } });
        if (next) await notifyApprover(next, request);
      }
    } catch (e) {
      console.error("Email sending failed:", e);
    }
  } else {
    return { error: "คำสั่งไม่ถูกต้อง" };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);
  redirect("/admin?done=1");
}
