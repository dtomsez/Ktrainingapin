import * as store from "./store";
import { approverById, approverByStep, type Approver } from "./approvers";

// ชั้นข้อมูลระดับโดเมน — ประกอบข้อมูลจากตาราง Google Sheets ให้เป็น object แบบที่หน้าเว็บใช้
// (แทนที่ Prisma client เดิมทั้งหมด)

export interface DateSlot {
  id: number;
  requestId: number;
  slotNo: number;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  deductLunch: boolean;
  totalHours: number;
}

export interface ApprovalAction {
  id: number;
  requestId: number;
  approverId: number;
  step: number;
  decision: string; // APPROVE | REJECT
  comment: string | null;
  decidedAt: Date;
  approver: Approver;
}

export interface TrainingRequest {
  _index: number; // ตำแหน่งแถวในตาราง Requests (ใช้ตอนอัปเดต)
  id: number;
  requestNo: string;
  employeeId: string;
  requesterName: string;
  businessLine: string;
  department: string;
  networkGroup: string;
  position: string;
  traineePositions: string; // JSON array ของชื่อตำแหน่ง
  phone: string;
  courseName: string;
  courseType: string; // ONLINE | ONSITE
  objective: string;
  participants: number;
  expectedResult: string;
  status: string; // PENDING_1 | PENDING_2 | PENDING_3 | APPROVED | REJECTED
  selectedSlotId: number | null;
  createdAt: Date;
  slots: DateSlot[];
  selectedSlot: DateSlot | null;
  actions: ApprovalAction[];
}

export interface OptionItem {
  _index: number;
  id: number;
  category: string;
  name: string;
}

// ===== parse helpers =====
const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const boolOf = (s: string): boolean => String(s).toUpperCase() === "TRUE" || s === "1";
const idx = (name: keyof typeof store.TABLES | string) => {
  const header = store.TABLES[name];
  const map: Record<string, number> = {};
  header.forEach((h, i) => (map[h] = i));
  return map;
};

function parseSlot(r: store.Row): DateSlot {
  const c = idx("Slots");
  return {
    id: num(r[c.id]),
    requestId: num(r[c.requestId]),
    slotNo: num(r[c.slotNo]),
    startDate: new Date(r[c.startDate]),
    endDate: new Date(r[c.endDate]),
    startTime: r[c.startTime],
    endTime: r[c.endTime],
    deductLunch: boolOf(r[c.deductLunch]),
    totalHours: num(r[c.totalHours]),
  };
}

function parseAction(r: store.Row): ApprovalAction {
  const c = idx("Actions");
  const approverId = num(r[c.approverId]);
  return {
    id: num(r[c.id]),
    requestId: num(r[c.requestId]),
    approverId,
    step: num(r[c.step]),
    decision: r[c.decision],
    comment: r[c.comment] || null,
    decidedAt: new Date(r[c.decidedAt]),
    approver: approverById(approverId) ?? { id: approverId, name: `ผู้อนุมัติ #${approverId}`, email: "", stepOrder: num(r[c.step]) },
  };
}

function buildRequest(
  r: store.Row,
  rowIndex: number,
  slotsByReq: Map<number, DateSlot[]>,
  actionsByReq: Map<number, ApprovalAction[]>
): TrainingRequest {
  const c = idx("Requests");
  const id = num(r[c.id]);
  const selectedSlotId = r[c.selectedSlotId] ? num(r[c.selectedSlotId]) : null;
  const slots = (slotsByReq.get(id) ?? []).sort((a, b) => a.slotNo - b.slotNo);
  const actions = (actionsByReq.get(id) ?? []).sort((a, b) => a.step - b.step);
  return {
    _index: rowIndex,
    id,
    requestNo: r[c.requestNo],
    employeeId: r[c.employeeId],
    requesterName: r[c.requesterName],
    businessLine: r[c.businessLine],
    department: r[c.department],
    networkGroup: r[c.networkGroup],
    position: r[c.position],
    traineePositions: r[c.traineePositions] || "[]",
    phone: r[c.phone],
    courseName: r[c.courseName],
    courseType: r[c.courseType],
    objective: r[c.objective],
    participants: num(r[c.participants]),
    expectedResult: r[c.expectedResult],
    status: r[c.status] || "PENDING_1",
    selectedSlotId,
    createdAt: r[c.createdAt] ? new Date(r[c.createdAt]) : new Date(0),
    slots,
    selectedSlot: selectedSlotId ? slots.find((s) => s.id === selectedSlotId) ?? null : null,
    actions,
  };
}

// ===== requests =====

// โหลดคำขอทั้งหมด พร้อม slots + actions (อ่าน 3 ตารางในครั้งเดียว)
export async function loadAllRequests(): Promise<TrainingRequest[]> {
  await store.ensureReady();
  const { Requests, Slots, Actions } = await store.batchRead(["Requests", "Slots", "Actions"]);

  const slotsByReq = new Map<number, DateSlot[]>();
  for (const row of Slots) {
    if (!row[0]) continue;
    const s = parseSlot(row);
    const list = slotsByReq.get(s.requestId) ?? [];
    list.push(s);
    slotsByReq.set(s.requestId, list);
  }

  const actionsByReq = new Map<number, ApprovalAction[]>();
  for (const row of Actions) {
    if (!row[0]) continue;
    const a = parseAction(row);
    const list = actionsByReq.get(a.requestId) ?? [];
    list.push(a);
    actionsByReq.set(a.requestId, list);
  }

  const out: TrainingRequest[] = [];
  Requests.forEach((row, i) => {
    if (!row[0]) return; // ข้ามแถวว่าง
    out.push(buildRequest(row, i, slotsByReq, actionsByReq));
  });
  return out;
}

export async function getRequestByNo(no: string): Promise<TrainingRequest | null> {
  const all = await loadAllRequests();
  return all.find((r) => r.requestNo === no) ?? null;
}

export async function getRequestById(id: number): Promise<TrainingRequest | null> {
  const all = await loadAllRequests();
  return all.find((r) => r.id === id) ?? null;
}

function nextId(rows: store.Row[]): number {
  let max = 0;
  for (const r of rows) {
    if (!r[0]) continue;
    max = Math.max(max, num(r[0]));
  }
  return max + 1;
}

function requestToRow(req: {
  id: number;
  requestNo: string;
  employeeId: string;
  requesterName: string;
  businessLine: string;
  department: string;
  networkGroup: string;
  position: string;
  traineePositions: string;
  phone: string;
  courseName: string;
  courseType: string;
  objective: string;
  participants: number;
  expectedResult: string;
  status: string;
  selectedSlotId: number | null;
  createdAt: Date;
}): store.Row {
  return [
    String(req.id), req.requestNo, req.employeeId, req.requesterName, req.businessLine,
    req.department, req.networkGroup, req.position, req.traineePositions, req.phone,
    req.courseName, req.courseType, req.objective, String(req.participants), req.expectedResult,
    req.status, req.selectedSlotId != null ? String(req.selectedSlotId) : "", req.createdAt.toISOString(),
  ];
}

export interface NewRequestInput {
  employeeId: string;
  requesterName: string;
  businessLine: string;
  department: string;
  networkGroup: string;
  position: string;
  traineePositions: string[];
  phone: string;
  courseName: string;
  courseType: string;
  objective: string;
  participants: number;
  expectedResult: string;
  slots: {
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    deductLunch: boolean;
    totalHours: number;
  }[];
}

// สร้างคำขอใหม่ + slots ที่เสนอ คืนค่า { id, requestNo }
export async function createRequest(input: NewRequestInput): Promise<{ id: number; requestNo: string }> {
  await store.ensureReady();
  const { Requests, Slots } = await store.batchRead(["Requests", "Slots"]);

  const id = nextId(Requests);
  const year = new Date().getFullYear();
  const prefix = `TR-${year}-`;
  let maxNo = 0;
  for (const r of Requests) {
    const no = r[idx("Requests").requestNo];
    if (no?.startsWith(prefix)) maxNo = Math.max(maxNo, num(no.slice(prefix.length)));
  }
  const requestNo = `${prefix}${String(maxNo + 1).padStart(4, "0")}`;

  const now = new Date();
  await store.appendRows("Requests", [
    requestToRow({
      id,
      requestNo,
      employeeId: input.employeeId,
      requesterName: input.requesterName,
      businessLine: input.businessLine,
      department: input.department,
      networkGroup: input.networkGroup,
      position: input.position,
      traineePositions: JSON.stringify(input.traineePositions),
      phone: input.phone,
      courseName: input.courseName,
      courseType: input.courseType,
      objective: input.objective,
      participants: input.participants,
      expectedResult: input.expectedResult,
      status: "PENDING_1",
      selectedSlotId: null,
      createdAt: now,
    }),
  ]);

  let slotId = nextId(Slots);
  const slotRows: store.Row[] = input.slots.map((s, i) => [
    String(slotId++), String(id), String(i + 1), s.startDate.toISOString(), s.endDate.toISOString(),
    s.startTime, s.endTime, s.deductLunch ? "TRUE" : "FALSE", String(s.totalHours),
  ]);
  await store.appendRows("Slots", slotRows);

  return { id, requestNo };
}

// อัปเดตสถานะ / slot ที่เคาะแล้วของคำขอ
export async function updateRequest(
  id: number,
  patch: { status?: string; selectedSlotId?: number | null }
): Promise<void> {
  const all = await loadAllRequests();
  const req = all.find((r) => r.id === id);
  if (!req) throw new Error("ไม่พบคำขอที่ต้องการอัปเดต");
  const merged = {
    ...req,
    status: patch.status ?? req.status,
    selectedSlotId: patch.selectedSlotId !== undefined ? patch.selectedSlotId : req.selectedSlotId,
  };
  await store.updateRow("Requests", req._index, requestToRow(merged));
}

// ตั้งค่าคำตัดสินของผู้อนุมัติ 1 ระดับ (แต่ละระดับมีได้ 1 คำตัดสิน — upsert)
// แก้/เปลี่ยนใจได้: อนุมัติ↔ปฏิเสธ
export async function setDecision(input: {
  requestId: number;
  step: number;
  decision: string; // APPROVE | REJECT
  comment: string | null;
}): Promise<void> {
  await store.ensureReady();
  const rows = await store.readTable("Actions");
  const c = idx("Actions");
  const approver = approverByStep(input.step);
  const rowIndex = rows.findIndex(
    (r) => r[0] && num(r[c.requestId]) === input.requestId && num(r[c.step]) === input.step
  );
  const id = rowIndex >= 0 && rows[rowIndex][0] ? rows[rowIndex][0] : String(nextId(rows));
  const row: store.Row = [
    id, String(input.requestId), String(approver?.id ?? input.step), String(input.step),
    input.decision, input.comment ?? "", new Date().toISOString(),
  ];
  if (rowIndex >= 0) await store.updateRow("Actions", rowIndex, row);
  else await store.appendRows("Actions", [row]);
}

// ยกเลิกคำตัดสินของระดับหนึ่ง (เคลียร์แถวให้ว่าง)
export async function clearDecision(requestId: number, step: number): Promise<void> {
  await store.ensureReady();
  const rows = await store.readTable("Actions");
  const c = idx("Actions");
  const rowIndex = rows.findIndex(
    (r) => r[0] && num(r[c.requestId]) === requestId && num(r[c.step]) === step
  );
  if (rowIndex >= 0) await store.updateRow("Actions", rowIndex, ["", "", "", "", "", "", ""]);
}

// คำนวณสถานะคำขอใหม่จากคำตัดสินปัจจุบันของทั้ง 3 ระดับ
//  - มีระดับใดปฏิเสธ = ปฏิเสธทันที
//  - อนุมัติครบ 3 = อนุมัติ
//  - ไม่งั้น = รอระดับแรกที่ยังไม่อนุมัติ
// selectedSlot จะถูกล้างถ้าระดับ 1 ไม่ได้อยู่สถานะอนุมัติ
export async function recomputeStatus(requestId: number): Promise<string> {
  const req = await getRequestById(requestId);
  if (!req) throw new Error("ไม่พบคำขอ");
  const dec: Record<number, string> = {};
  for (const a of req.actions) dec[a.step] = a.decision;

  let status: string;
  if ([1, 2, 3].some((k) => dec[k] === "REJECT")) status = "REJECTED";
  else if ([1, 2, 3].every((k) => dec[k] === "APPROVE")) status = "APPROVED";
  else status = `PENDING_${[1, 2, 3].find((k) => dec[k] !== "APPROVE")}`;

  const selectedSlotId = dec[1] === "APPROVE" ? req.selectedSlotId : null;
  await updateRequest(requestId, { status, selectedSlotId });
  return status;
}

// ===== options (dropdown) =====

export async function getOptions(): Promise<OptionItem[]> {
  await store.ensureReady();
  const rows = await store.readTable("Options");
  const c = idx("Options");
  const out: OptionItem[] = [];
  rows.forEach((r, i) => {
    if (!r[0]) return;
    out.push({ _index: i, id: num(r[c.id]), category: r[c.category], name: r[c.name] });
  });
  return out;
}

// เพิ่มตัวเลือกใหม่ คืน false ถ้ามีอยู่แล้ว
export async function addOption(category: string, name: string): Promise<boolean> {
  await store.ensureReady();
  const rows = await store.readTable("Options");
  const c = idx("Options");
  const exists = rows.some((r) => r[0] && r[c.category] === category && r[c.name] === name);
  if (exists) return false;
  const id = nextId(rows);
  await store.appendRows("Options", [[String(id), category, name]]);
  return true;
}

// ลบตัวเลือก (เคลียร์แถวให้ว่าง — parse ข้ามแถวที่ไม่มี id)
export async function deleteOption(id: number): Promise<void> {
  await store.ensureReady();
  const rows = await store.readTable("Options");
  const c = idx("Options");
  const rowIndex = rows.findIndex((r) => r[0] && num(r[c.id]) === id);
  if (rowIndex < 0) return;
  await store.updateRow("Options", rowIndex, ["", "", ""]);
}
