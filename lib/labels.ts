export const STATUS_LABELS: Record<string, string> = {
  PENDING_1: "รอผู้อนุมัติท่านที่ 1",
  PENDING_2: "รอผู้อนุมัติท่านที่ 2",
  PENDING_3: "รอผู้อนุมัติท่านที่ 3",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING_1: "bg-amber-100 text-amber-800",
  PENDING_2: "bg-amber-100 text-amber-800",
  PENDING_3: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export const COURSE_TYPE_LABELS: Record<string, string> = {
  ONLINE: "Online (ออนไลน์)",
  ONSITE: "Onsite (ในสถานที่)",
  // ค่าเดิมก่อนปรับฟอร์ม — คงไว้ให้คำขอเก่าแสดงผลได้
  IN_HOUSE: "In-house (จัดภายใน)",
  PUBLIC: "Public (ส่งอบรมภายนอก)",
};

// หมวดหมู่ตัวเลือก dropdown ในหน้า Data Control
export const OPTION_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "BUSINESS_LINE", label: "สังกัดสายงาน", icon: "🏢" },
  { key: "DISTRICT", label: "สำนักงานเขต/ทีมขึ้นตรงสายงานเครือข่ายฯ/สำนักงานใหญ่", icon: "📍" },
  { key: "NETWORK_GROUP", label: "กลุ่มเครือข่าย/สำนักงานภาค/ทีมขึ้นตรงสายงานเครือข่ายฯ/สำนักงานใหญ่", icon: "🌐" },
  { key: "POSITION", label: "ตำแหน่งผู้เข้ารับการประชุม/อบรม", icon: "👥" },
];

// ตำแหน่งผู้เข้าอบรมเก็บเป็น JSON array ใน SQLite (ไม่มี native array)
export function parsePositions(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pendingStep(status: string): number | null {
  const m = status.match(/^PENDING_(\d)$/);
  return m ? Number(m[1]) : null;
}

export function formatThaiDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = formatThaiDate(start);
  const e = formatThaiDate(end);
  return s === e ? s : `${s} – ${e}`;
}
