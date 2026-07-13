"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRequestById, updateRequest, createAction } from "@/lib/db";
import { approverByStep } from "@/lib/approvers";
import { pendingStep } from "@/lib/labels";
import { notifyApprover } from "@/lib/email";
import { requireAdmin } from "@/lib/adminAuth";
import { logEvent } from "@/lib/log";

// ผู้อนุมัติของขั้นปัจจุบันอิงจากสถานะคำขอ — เข้าถึงได้เฉพาะผู้ที่ใส่รหัสผ่านแล้วเท่านั้น
export async function decide(_prev: { error?: string } | undefined, formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get("requestId"));
  const decision = String(formData.get("decision")); // APPROVE | REJECT
  const comment = String(formData.get("comment") ?? "").trim();
  const slotId = formData.get("slotId") ? Number(formData.get("slotId")) : null;

  const request = await getRequestById(requestId);
  if (!request) return { error: "ไม่พบคำขอ" };

  const step = pendingStep(request.status);
  if (!step) return { error: "คำขอนี้ถูกพิจารณาเสร็จสิ้นแล้ว" };

  const approver = approverByStep(step);
  if (!approver) return { error: `ไม่พบข้อมูลผู้อนุมัติท่านที่ ${step}` };

  if (decision === "REJECT") {
    if (!comment) return { error: "กรุณาระบุเหตุผลในการปฏิเสธ" };
    await updateRequest(requestId, { status: "REJECTED" });
    await createAction({ requestId, approverId: approver.id, step, decision: "REJECT", comment });
    await logEvent("REJECT", {
      actor: approver.name,
      requestNo: request.requestNo,
      detail: `ขั้นที่ ${step} · ${comment}`,
    });
  } else if (decision === "APPROVE") {
    let selectedSlotId = request.selectedSlotId;
    if (step === 1) {
      if (!slotId || !request.slots.some((s) => s.id === slotId)) {
        return { error: "กรุณาเลือกวันที่ (Slot) ที่จะใช้จัดอบรมก่อนอนุมัติ" };
      }
      selectedSlotId = slotId;
    }
    const nextStatus = step === 3 ? "APPROVED" : `PENDING_${step + 1}`;
    await updateRequest(requestId, { status: nextStatus, selectedSlotId });
    await createAction({
      requestId,
      approverId: approver.id,
      step,
      decision: "APPROVE",
      comment: comment || null,
    });
    await logEvent("APPROVE", {
      actor: approver.name,
      requestNo: request.requestNo,
      detail: step === 3 ? "อนุมัติครบ 3 ขั้น" : `ขั้นที่ ${step} → ส่งต่อขั้นที่ ${step + 1}`,
    });
    try {
      if (step < 3) {
        const next = approverByStep(step + 1);
        if (next) {
          await notifyApprover(next, {
            requestNo: request.requestNo,
            courseName: request.courseName,
            requesterName: request.requesterName,
            id: request.id,
          });
        }
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
