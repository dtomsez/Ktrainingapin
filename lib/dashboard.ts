import type { TrainingRequest, DateSlot } from "@/lib/db";
import { effectiveSlots } from "@/lib/overlap";
import { parsePositions } from "@/lib/labels";

export type RequestWithSlots = TrainingRequest & { slots: DateSlot[] };

export interface DayEvent {
  requestId: number;
  requestNo: string;
  courseName: string;
  positions: string[];
  positionLabel: string;
  status: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  hoursPerDay: number;
  approved: boolean;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// กระจายคำขอลงรายวันของเดือนที่กำหนด (ใช้ slot ที่มีผล: slot ที่เคาะแล้ว หรือทุก slot ที่เสนอ)
export function buildMonthEvents(
  requests: RequestWithSlots[],
  year: number,
  month: number
): Map<string, DayEvent[]> {
  const byDay = new Map<string, DayEvent[]>();
  for (const req of requests) {
    const positions = parsePositions(req.traineePositions);
    for (const slot of effectiveSlots(req)) {
      const days =
        Math.round(
          (new Date(slot.endDate).setHours(0, 0, 0, 0) - new Date(slot.startDate).setHours(0, 0, 0, 0)) / 86400000
        ) + 1;
      const hoursPerDay = Math.round((slot.totalHours / days) * 100) / 100;
      const cur = new Date(slot.startDate);
      cur.setHours(0, 0, 0, 0);
      const end = new Date(slot.endDate);
      end.setHours(0, 0, 0, 0);
      while (cur <= end) {
        if (cur.getFullYear() === year && cur.getMonth() === month - 1) {
          const key = dayKey(cur);
          const list = byDay.get(key) ?? [];
          list.push({
            requestId: req.id,
            requestNo: req.requestNo,
            courseName: req.courseName,
            positions,
            positionLabel: positions.length > 0 ? positions.join(", ") : req.position,
            status: req.status,
            startTime: slot.startTime,
            endTime: slot.endTime,
            totalHours: slot.totalHours,
            hoursPerDay,
            approved: req.status === "APPROVED",
          });
          byDay.set(key, list);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }
  return byDay;
}

export interface MonthSummary {
  courses: { requestId: number; courseName: string; hours: number; positions: string[] }[];
  positionHours: [string, number][]; // เรียงชั่วโมงมาก → น้อย
  totalHours: number;
}

// สรุปเดือน: กี่หลักสูตร มีตำแหน่งอะไรบ้าง แต่ละตำแหน่งรวมกี่ชั่วโมง (นับเฉพาะชั่วโมงที่ตกในเดือนนั้น)
export function summarizeMonth(byDay: Map<string, DayEvent[]>): MonthSummary {
  const courseMap = new Map<number, { requestId: number; courseName: string; hours: number; positions: string[] }>();
  const posHours = new Map<string, number>();
  let totalHours = 0;
  for (const events of byDay.values()) {
    for (const e of events) {
      totalHours += e.hoursPerDay;
      const c =
        courseMap.get(e.requestId) ??
        { requestId: e.requestId, courseName: e.courseName, hours: 0, positions: e.positions };
      c.hours = Math.round((c.hours + e.hoursPerDay) * 100) / 100;
      courseMap.set(e.requestId, c);
      const targets = e.positions.length > 0 ? e.positions : ["ไม่ระบุตำแหน่ง"];
      for (const p of targets) {
        posHours.set(p, Math.round(((posHours.get(p) ?? 0) + e.hoursPerDay) * 100) / 100);
      }
    }
  }
  return {
    courses: [...courseMap.values()],
    positionHours: [...posHours.entries()].sort((a, b) => b[1] - a[1]),
    totalHours: Math.round(totalHours * 100) / 100,
  };
}
