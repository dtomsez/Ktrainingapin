// การคำนวณชั่วโมงอบรม: ชม./วัน = (เวลาเลิก - เวลาเริ่ม) - พักเที่ยง 1 ชม. (ถ้าติ๊ก) × จำนวนวัน
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const s = new Date(startDate);
  const e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export function calcSlotHours(input: {
  startDate: string | Date;
  endDate: string | Date;
  startTime: string;
  endTime: string;
  deductLunch: boolean;
}): { days: number; hoursPerDay: number; totalHours: number } | null {
  if (!input.startDate || !input.endDate || !input.startTime || !input.endTime) return null;
  const days = daysBetween(input.startDate, input.endDate);
  if (days < 1) return null;
  let minutes = timeToMinutes(input.endTime) - timeToMinutes(input.startTime);
  if (input.deductLunch) minutes -= 60;
  if (minutes <= 0) return null;
  const hoursPerDay = Math.round((minutes / 60) * 100) / 100;
  const totalHours = Math.round(hoursPerDay * days * 100) / 100;
  return { days, hoursPerDay, totalHours };
}
