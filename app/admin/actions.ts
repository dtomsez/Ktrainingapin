"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRequestById, setDecision, clearDecision, updateRequest, recomputeStatus } from "@/lib/db";
import { approverByStep } from "@/lib/approvers";
import { pendingStep } from "@/lib/labels";
import { notifyApprover } from "@/lib/email";
import { requireAdmin } from "@/lib/adminAuth";
import { logEvent } from "@/lib/log";

// ผู้อนุมัติแต่ละระดับพิจารณาเฉพาะระดับของตนเอง (อิงจากรหัสผ่านที่ล็อกอิน)
// action: APPROVE | REJECT | UNDO — แก้/ยกเลิก/เปลี่ยนใจภายหลังได้
export async function decide(_prev: { error?: string } | undefined, formData: FormData) {
  const level = await requireAdmin();
  const requestId = Number(formData.get("requestId"));
  const action = String(formData.get("action")); // APPROVE | REJECT | UNDO
  const comment = String(formData.get("comment") ?? "").trim();
  const slotId = formData.get("slotId") ? Number(formData.get("slotId")) : null;

  const request = await getRequestById(requestId);
  if (!request) return { error: "ไม่พบคำขอ" };

  const approver = approverByStep(level);
  if (!approver) return { error: "ไม่พบข้อมูลผู้อนุมัติ" };

  const current = request.actions.find((a) => a.step === level)?.decision ?? null;
  const isMyTurn = request.status === `PENDING_${level}`;

  if (action === "UNDO") {
    if (!current) return { error: "ยังไม่มีคำตัดสินให้ยกเลิก" };
    await clearDecision(requestId, level);
    const newStatus = await recomputeStatus(requestId);
    await logEvent(current === "APPROVE" ? "APPROVE" : "REJECT", {
      actor: approver.name,
      requestNo: request.requestNo,
      detail: `ยกเลิกคำตัดสินเดิม (${current === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"}) → สถานะใหม่ ${newStatus}`,
    });
  } else if (action === "APPROVE" || action === "REJECT") {
    // อนุมัติ/ปฏิเสธได้ ถ้าถึงคิวของเรา หรือกำลังแก้คำตัดสินเดิมของเรา
    if (!isMyTurn && !current) {
      return { error: "ยังไม่ถึงคิวการพิจารณาของคุณ (ต้องรอระดับก่อนหน้าอนุมัติก่อน)" };
    }
    if (action === "REJECT" && !comment) return { error: "กรุณาระบุเหตุผลในการปฏิเสธ" };

    if (action === "APPROVE" && level === 1) {
      const useSlot = slotId ?? request.selectedSlotId;
      if (!useSlot || !request.slots.some((s) => s.id === useSlot)) {
        return { error: "กรุณาเลือกวันที่ (Slot) ที่จะใช้จัดอบรมก่อนอนุมัติ" };
      }
      await updateRequest(requestId, { selectedSlotId: useSlot });
    }

    await setDecision({
      requestId,
      step: level,
      decision: action,
      comment: comment || null,
    });
    const newStatus = await recomputeStatus(requestId);

    await logEvent(action, {
      actor: approver.name,
      requestNo: request.requestNo,
      detail: current ? `แก้คำตัดสินเป็น ${action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"} → ${newStatus}` : `${action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"} → ${newStatus}`,
    });

    // อนุมัติแล้วเลื่อนไปคิวถัดไป → แจ้งผู้อนุมัติระดับถัดไป
    if (action === "APPROVE") {
      const nextStep = pendingStep(newStatus);
      if (nextStep) {
        try {
          const next = approverByStep(nextStep);
          if (next) {
            await notifyApprover(next, {
              requestNo: request.requestNo,
              courseName: request.courseName,
              requesterName: request.requesterName,
              id: request.id,
            });
          }
        } catch (e) {
          console.error("Email sending failed:", e);
        }
      }
    }
  } else {
    return { error: "คำสั่งไม่ถูกต้อง" };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/requests/${requestId}`);
  redirect(`/admin/requests/${requestId}?done=1`);
}
