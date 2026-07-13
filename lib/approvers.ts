// ผู้อนุมัติ 3 ท่าน กำหนดตายตัว (เดิมเก็บในตาราง Approver ของ Prisma)
// ใช้แสดงชื่อในประวัติการอนุมัติ และปลายทางอีเมลแจ้งเตือน
// เข้าใช้งานฝั่งผู้อนุมัติผ่านรหัสผ่านเดียวร่วมกัน (lib/adminAuth.ts)
export interface Approver {
  id: number;
  name: string;
  email: string;
  stepOrder: number;
}

export const APPROVERS: Approver[] = [
  { id: 1, name: "ผู้อนุมัติท่านที่ 1", email: "approver1@company.co.th", stepOrder: 1 },
  { id: 2, name: "ผู้อนุมัติท่านที่ 2", email: "approver2@company.co.th", stepOrder: 2 },
  { id: 3, name: "ผู้อนุมัติท่านที่ 3", email: "approver3@company.co.th", stepOrder: 3 },
];

export function approverByStep(step: number): Approver | null {
  return APPROVERS.find((a) => a.stepOrder === step) ?? null;
}

export function approverById(id: number): Approver | null {
  return APPROVERS.find((a) => a.id === id) ?? null;
}
