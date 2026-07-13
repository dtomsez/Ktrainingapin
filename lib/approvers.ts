// ผู้อนุมัติ 3 ระดับ กำหนดตายตัว — แต่ละระดับมีรหัสผ่านของตัวเอง (ดู lib/adminAuth.ts)
// ใช้แสดงชื่อในประวัติการอนุมัติ และปลายทางอีเมลแจ้งเตือน
export interface Approver {
  id: number;
  name: string;
  email: string;
  stepOrder: number;
}

export const APPROVERS: Approver[] = [
  { id: 1, name: "ผู้อนุมัติลำดับที่ 1 (ทีม HR เครือข่ายฯ)", email: "approver1@company.co.th", stepOrder: 1 },
  { id: 2, name: "ผู้อนุมัติลำดับที่ 2 (ผู้บริหารทีมสนับสนุนฯ)", email: "approver2@company.co.th", stepOrder: 2 },
  { id: 3, name: "ผู้อนุมัติลำดับที่ 3 (ผู้บริหารทีม RTI)", email: "approver3@company.co.th", stepOrder: 3 },
];

export function approverByStep(step: number): Approver | null {
  return APPROVERS.find((a) => a.stepOrder === step) ?? null;
}

export function approverById(id: number): Approver | null {
  return APPROVERS.find((a) => a.id === id) ?? null;
}
