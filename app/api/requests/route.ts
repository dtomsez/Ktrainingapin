import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequest } from "@/lib/db";
import { approverByStep } from "@/lib/approvers";
import { calcSlotHours } from "@/lib/hours";
import { notifyApprover } from "@/lib/email";
import { logEvent } from "@/lib/log";

const slotSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  deductLunch: z.boolean(),
});

const requestSchema = z.object({
  employeeId: z.string().min(1, "กรุณากรอกรหัสพนักงาน"),
  requesterName: z.string().min(1, "กรุณากรอกชื่อ-นามสกุล"),
  businessLine: z.string().min(1, "กรุณาเลือกสังกัดสายงาน"),
  department: z.string().min(1, "กรุณาเลือกสังกัดหน่วยงาน"),
  networkGroup: z.string().optional().default(""),
  position: z.string().min(1, "กรุณากรอกตำแหน่ง"),
  phone: z.string().min(1, "กรุณากรอกเบอร์ติดต่อ"),
  courseName: z.string().min(1, "กรุณากรอกชื่อหลักสูตร"),
  courseType: z.enum(["ONLINE", "ONSITE"]),
  objective: z.string().min(1, "กรุณากรอกวัตถุประสงค์ในการขอจัดประชุม/อบรม"),
  participants: z.coerce.number().int().min(1, "จำนวนผู้เข้าประชุม/อบรมต้องมากกว่า 0"),
  expectedResult: z.string().min(1, "กรุณากรอกผลที่คาดว่าจะได้รับ"),
  traineePositions: z
    .array(z.string().min(1))
    .min(1, "กรุณาเลือกตำแหน่งผู้เข้ารับการประชุม/อบรมอย่างน้อย 1 ตำแหน่ง"),
  slots: z.array(slotSchema).min(1, "ต้องเสนอวันที่อย่างน้อย 1 ทางเลือก").max(2),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const slotRows = [];
  for (const [i, s] of data.slots.entries()) {
    const calc = calcSlotHours(s);
    if (!calc) {
      return NextResponse.json(
        { error: `ทางเลือกที่ ${i + 1}: วันที่/เวลาไม่ถูกต้อง (เวลาเลิกต้องหลังเวลาเริ่ม)` },
        { status: 400 }
      );
    }
    slotRows.push({
      startDate: new Date(s.startDate),
      endDate: new Date(s.endDate),
      startTime: s.startTime,
      endTime: s.endTime,
      deductLunch: s.deductLunch,
      totalHours: calc.totalHours,
    });
  }

  const created = await createRequest({
    employeeId: data.employeeId,
    requesterName: data.requesterName,
    businessLine: data.businessLine,
    department: data.department,
    networkGroup: data.networkGroup,
    position: data.position,
    phone: data.phone,
    traineePositions: data.traineePositions,
    courseName: data.courseName,
    courseType: data.courseType,
    objective: data.objective,
    participants: data.participants,
    expectedResult: data.expectedResult,
    slots: slotRows,
  });

  await logEvent("SUBMIT", {
    requestNo: created.requestNo,
    detail: `${data.requesterName} · ${data.courseName}`,
  });

  const approver1 = approverByStep(1);
  try {
    if (approver1) {
      await notifyApprover(approver1, {
        requestNo: created.requestNo,
        courseName: data.courseName,
        requesterName: data.requesterName,
        id: created.id,
      });
    }
  } catch (e) {
    console.error("Email sending failed:", e);
  }

  return NextResponse.json({ requestNo: created.requestNo });
}
