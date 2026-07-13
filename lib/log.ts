import { headers } from "next/headers";
import * as store from "./store";

// บันทึก Log กิจกรรมจากทุกหน้า ลงแท็บ Logs และมีหน้าสรุปที่ /admin/logs (เฉพาะผู้อนุมัติ)
export type LogEvent =
  | "SUBMIT" // ยื่นคำขอใหม่
  | "TRACK" // ค้นหาสถานะคำขอ
  | "LOGIN_SUCCESS"
  | "LOGIN_FAIL"
  | "APPROVE"
  | "REJECT"
  | "OPTION_ADD"
  | "OPTION_DELETE"
  | "EXPORT" // ดาวน์โหลด Excel
  | "VIEW_QUEUE"
  | "VIEW_REQUEST"
  | "VIEW_DASHBOARD"
  | "VIEW_DATACONTROL"
  | "VIEW_LOGS";

export const EVENT_LABELS: Record<string, string> = {
  SUBMIT: "ยื่นคำขอใหม่",
  TRACK: "ค้นหาสถานะคำขอ",
  LOGIN_SUCCESS: "เข้าสู่ระบบสำเร็จ",
  LOGIN_FAIL: "เข้าสู่ระบบไม่สำเร็จ",
  APPROVE: "อนุมัติคำขอ",
  REJECT: "ปฏิเสธคำขอ",
  OPTION_ADD: "เพิ่มตัวเลือก",
  OPTION_DELETE: "ลบตัวเลือก",
  EXPORT: "ดาวน์โหลด Excel",
  VIEW_QUEUE: "เปิดหน้าคิวอนุมัติ",
  VIEW_REQUEST: "เปิดดูรายละเอียดคำขอ",
  VIEW_DASHBOARD: "เปิดหน้า Dashboard",
  VIEW_DATACONTROL: "เปิดหน้า Data Control",
  VIEW_LOGS: "เปิดหน้าสรุป Log",
};

export interface LogRow {
  id: string;
  timestamp: Date;
  event: string;
  actor: string;
  requestNo: string;
  detail: string;
}

async function actorInfo(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    return ip || "ไม่ทราบ IP";
  } catch {
    return "system";
  }
}

// บันทึก 1 เหตุการณ์ — ห้ามทำให้หน้าเว็บพังถ้า log ล้มเหลว
export async function logEvent(
  event: LogEvent,
  opts?: { actor?: string; requestNo?: string; detail?: string }
): Promise<void> {
  try {
    const actor = await actorInfo(opts?.actor);
    const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await store.appendRows("Logs", [
      [id, new Date().toISOString(), event, actor, opts?.requestNo ?? "", opts?.detail ?? ""],
    ]);
  } catch (e) {
    console.error("logEvent failed:", e);
  }
}

// อ่าน Log ทั้งหมด เรียงใหม่→เก่า
export async function getLogs(): Promise<LogRow[]> {
  await store.ensureReady();
  const rows = await store.readTable("Logs");
  const out: LogRow[] = [];
  for (const r of rows) {
    if (!r[0]) continue;
    out.push({
      id: r[0],
      timestamp: new Date(r[1]),
      event: r[2],
      actor: r[3],
      requestNo: r[4],
      detail: r[5],
    });
  }
  out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return out;
}
