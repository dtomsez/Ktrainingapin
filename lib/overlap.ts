import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/hours";

export interface SlotLike {
  id: number;
  requestId: number;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
}

export interface OverlapHit {
  requestId: number;
  requestNo: string;
  courseName: string;
  status: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
}

function dateRangesIntersect(a: SlotLike, b: SlotLike): boolean {
  const aStart = new Date(a.startDate).setHours(0, 0, 0, 0);
  const aEnd = new Date(a.endDate).setHours(0, 0, 0, 0);
  const bStart = new Date(b.startDate).setHours(0, 0, 0, 0);
  const bEnd = new Date(b.endDate).setHours(0, 0, 0, 0);
  return aStart <= bEnd && bStart <= aEnd;
}

function timeRangesIntersect(a: SlotLike, b: SlotLike): boolean {
  return (
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
  );
}

export function slotsOverlap(a: SlotLike, b: SlotLike): boolean {
  return dateRangesIntersect(a, b) && timeRangesIntersect(a, b);
}

// Slot ที่ "มีผล" ของคำขอ: ถ้าเคาะวันแล้วใช้เฉพาะ slot นั้น ไม่งั้นนับทุก slot ที่เสนอมา
type RequestWithSlots<T extends SlotLike> = {
  selectedSlotId: number | null;
  slots: T[];
};

export function effectiveSlots<T extends SlotLike>(req: RequestWithSlots<T>): T[] {
  if (req.selectedSlotId) {
    return req.slots.filter((s) => s.id === req.selectedSlotId);
  }
  return req.slots;
}

// หาว่า slot แต่ละอันของคำขอนี้ ชนกับคำขออื่น (ที่ยังไม่ถูกปฏิเสธ) อันไหนบ้าง
export async function findOverlaps(requestId: number): Promise<Map<number, OverlapHit[]>> {
  const target = await prisma.trainingRequest.findUnique({
    where: { id: requestId },
    include: { slots: true },
  });
  const result = new Map<number, OverlapHit[]>();
  if (!target) return result;

  const others = await prisma.trainingRequest.findMany({
    where: { id: { not: requestId }, status: { not: "REJECTED" } },
    include: { slots: true },
  });

  for (const slot of effectiveSlots(target)) {
    const hits: OverlapHit[] = [];
    for (const other of others) {
      for (const os of effectiveSlots(other)) {
        if (slotsOverlap(slot, os)) {
          hits.push({
            requestId: other.id,
            requestNo: other.requestNo,
            courseName: other.courseName,
            status: other.status,
            startDate: os.startDate,
            endDate: os.endDate,
            startTime: os.startTime,
            endTime: os.endTime,
          });
        }
      }
    }
    if (hits.length) result.set(slot.id, hits);
  }
  return result;
}
