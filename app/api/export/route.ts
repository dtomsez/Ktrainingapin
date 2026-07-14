import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { loadAllRequests } from "@/lib/db";
import { currentLevel } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";
import { STATUS_LABELS, COURSE_TYPE_LABELS, parsePositions, formatDateRange } from "@/lib/labels";

export const dynamic = "force-dynamic";

// ดาวน์โหลดข้อมูลคำขอทั้งหมดเป็นไฟล์ Excel — เฉพาะผู้ที่ใส่รหัสผ่านผู้อนุมัติแล้ว
export async function GET(req: Request) {
  const level = await currentLevel();
  if (level === null) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  // เฉพาะผู้อนุมัติลำดับที่ 1 เท่านั้นที่ดาวน์โหลด Excel ได้
  if (level !== 1) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  const requests = (await loadAllRequests()).sort((a, b) => a.id - b.id);
  await logEvent("EXPORT", { actor: approverByStep(level)?.name, detail: `${requests.length} คำขอ` });

  const wb = new ExcelJS.Workbook();
  wb.creator = "ระบบขอจัดประชุม/อบรม";
  const ws = wb.addWorksheet("คำขอทั้งหมด");

  ws.columns = [
    { header: "เลขที่คำขอ", key: "requestNo", width: 15 },
    { header: "วันที่ยื่น", key: "createdAt", width: 14 },
    { header: "สถานะ", key: "status", width: 20 },
    { header: "ชื่อหลักสูตร", key: "courseName", width: 36 },
    { header: "ประเภท", key: "courseType", width: 16 },
    { header: "รหัสพนักงาน", key: "employeeId", width: 13 },
    { header: "ผู้กรอกข้อมูล", key: "requesterName", width: 20 },
    { header: "ตำแหน่งผู้กรอก", key: "position", width: 20 },
    { header: "สังกัดสายงาน", key: "businessLine", width: 24 },
    { header: "สำนักงานเขต/ทีมขึ้นตรงฯ", key: "department", width: 24 },
    { header: "กลุ่มเครือข่าย/สำนักงานภาคฯ", key: "networkGroup", width: 28 },
    { header: "เบอร์ติดต่อ", key: "phone", width: 14 },
    { header: "จำนวนผู้เข้าประชุม/อบรม (คน)", key: "participants", width: 14 },
    { header: "ตำแหน่งผู้เข้าประชุม/อบรม", key: "traineePositions", width: 30 },
    { header: "วันที่จัด (ที่เคาะแล้ว)", key: "selectedDate", width: 26 },
    { header: "วันที่ที่เสนอทั้งหมด", key: "proposedDates", width: 46 },
    { header: "ชั่วโมงรวม", key: "totalHours", width: 11 },
    { header: "วัตถุประสงค์", key: "objective", width: 40 },
    { header: "ผลที่คาดว่าจะได้รับ", key: "expectedResult", width: 40 },
    { header: "ประวัติการอนุมัติ", key: "approvalHistory", width: 44 },
  ];

  // หัวตารางโทนสีกรุงไทย
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0077C8" } };
    cell.border = { bottom: { style: "medium", color: { argb: "FF003F87" } } };
  });

  const slotText = (s: { startDate: Date; endDate: Date; startTime: string; endTime: string; totalHours: number }) =>
    `${formatDateRange(s.startDate, s.endDate)} เวลา ${s.startTime}–${s.endTime} น. (${s.totalHours} ชม.)`;

  for (const r of requests) {
    const effective = r.selectedSlot ?? r.slots[0];
    ws.addRow({
      requestNo: r.requestNo,
      createdAt: new Date(r.createdAt).toLocaleDateString("th-TH"),
      status: STATUS_LABELS[r.status] ?? r.status,
      courseName: r.courseName,
      courseType: COURSE_TYPE_LABELS[r.courseType] ?? r.courseType,
      employeeId: r.employeeId,
      requesterName: r.requesterName,
      position: r.position,
      businessLine: r.businessLine,
      department: r.department,
      networkGroup: r.networkGroup,
      phone: r.phone,
      participants: r.participants,
      traineePositions: parsePositions(r.traineePositions).join(", "),
      selectedDate: r.selectedSlot ? slotText(r.selectedSlot) : "ยังไม่เคาะวัน",
      proposedDates: r.slots.map((s) => `ทางเลือก ${s.slotNo}: ${slotText(s)}`).join(" | "),
      totalHours: effective?.totalHours ?? 0,
      objective: r.objective,
      expectedResult: r.expectedResult,
      approvalHistory: r.actions
        .map(
          (a) =>
            `ขั้นที่ ${a.step} ${a.decision === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"}โดย ${a.approver.name} (${new Date(a.decidedAt).toLocaleDateString("th-TH")})${a.comment ? ` "${a.comment}"` : ""}`
        )
        .join(" | "),
    });
  }

  // จัดสไตล์แถวข้อมูล: สลับสีพื้น + ขอบบาง
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    if (n % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F9FF" } };
      });
    }
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="training-requests-${today}.xlsx"`,
    },
  });
}
