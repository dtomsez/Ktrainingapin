import fs from "fs";
import path from "path";
import { getAccessToken } from "./googleAuth";

// ชั้นเข้าถึงข้อมูลระดับล่าง — เก็บข้อมูลเป็น "ตาราง" (แต่ละแท็บใน Google Sheet)
// มี 2 ไดรเวอร์:
//   - Google Sheets (production): ตั้ง env GOOGLE_SHEETS_SPREADSHEET_ID + Service Account
//   - ไฟล์ JSON ในเครื่อง (dev fallback): ใช้เมื่อยังไม่ตั้ง env ข้างต้น เพื่อพัฒนา/ทดสอบได้ทันที
// แต่ละแถวเก็บเป็น array ของ string (ตรงกับรูปแบบ Sheets API)

export type Row = string[];

// ลำดับคอลัมน์ของแต่ละตาราง (แถวแรกของแท็บคือ header ชุดนี้)
export const TABLES: Record<string, string[]> = {
  Requests: [
    "id", "requestNo", "employeeId", "requesterName", "businessLine", "department",
    "networkGroup", "position", "traineePositions", "phone", "courseName", "courseType",
    "objective", "participants", "expectedResult", "status", "selectedSlotId", "createdAt",
  ],
  Slots: ["id", "requestId", "slotNo", "startDate", "endDate", "startTime", "endTime", "deductLunch", "totalHours"],
  Actions: ["id", "requestId", "approverId", "step", "decision", "comment", "decidedAt"],
  Options: ["id", "category", "name"],
  Logs: ["id", "timestamp", "event", "actor", "requestNo", "detail"],
};

export type TableName = keyof typeof TABLES;

// ตัวเลือก dropdown เริ่มต้น (seed ครั้งแรกถ้าแท็บ Options ยังว่าง)
export const DEFAULT_OPTIONS: Record<string, string[]> = {
  BUSINESS_LINE: ["สายงานปฏิบัติการ", "สายงานขายและการตลาด", "สายงานการเงิน", "สายงานทรัพยากรบุคคล", "สายงานเทคโนโลยีสารสนเทศ"],
  DISTRICT: ["สำนักงานเขต 1", "สำนักงานเขต 2", "สำนักงานเขต 3", "สำนักงานเขต 4", "สำนักงานใหญ่"],
  NETWORK_GROUP: ["กลุ่มเครือข่ายภาคกลาง", "กลุ่มเครือข่ายภาคเหนือ", "กลุ่มเครือข่ายภาคตะวันออกเฉียงเหนือ", "กลุ่มเครือข่ายภาคใต้", "สำนักภาคกรุงเทพฯ"],
  POSITION: ["ผู้บริหาร", "ผู้จัดการ", "หัวหน้างาน", "พนักงานอาวุโส", "พนักงานทั่วไป", "พนักงานใหม่"],
};

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
export const useSheets = !!(
  SPREADSHEET_ID &&
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
  process.env.GOOGLE_PRIVATE_KEY
);

// ===== helpers =====
function colLetter(n: number): string {
  // แปลงจำนวนคอลัมน์ (1-based) เป็นตัวอักษร A..Z (ทุกตารางไม่เกิน 26 คอลัมน์)
  return String.fromCharCode(64 + n);
}

function pad(row: Row, len: number): Row {
  const r = row.slice(0, len);
  while (r.length < len) r.push("");
  return r;
}

// ===== Google Sheets driver =====
async function sheetsApi(pathAndQuery: string, init?: RequestInit): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${pathAndQuery}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets API ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

// ===== File driver (dev fallback) =====
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function fileReadAll(): Record<string, Row[]> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function fileWriteAll(data: Record<string, Row[]>) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===== ensure/seed (รันครั้งเดียวต่อ instance) =====
let readyPromise: Promise<void> | null = null;

export function ensureReady(): Promise<void> {
  if (!readyPromise) readyPromise = doEnsure();
  return readyPromise;
}

async function doEnsure(): Promise<void> {
  if (useSheets) {
    const meta = await sheetsApi(`?fields=sheets.properties.title`);
    const existing = new Set<string>((meta.sheets ?? []).map((s: any) => s.properties.title));
    const toAdd = Object.keys(TABLES).filter((t) => !existing.has(t));
    if (toAdd.length) {
      await sheetsApi(`:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })),
        }),
      });
      // เขียน header ให้แท็บที่เพิ่งสร้าง
      for (const name of toAdd) {
        const header = TABLES[name];
        await sheetsApi(
          `/values/${encodeURIComponent(`${name}!A1:${colLetter(header.length)}1`)}?valueInputOption=RAW`,
          { method: "PUT", body: JSON.stringify({ values: [header] }) }
        );
      }
    }
  } else {
    const data = fileReadAll();
    let changed = false;
    for (const name of Object.keys(TABLES)) {
      if (!data[name]) {
        data[name] = [];
        changed = true;
      }
    }
    if (changed) fileWriteAll(data);
  }

  // seed ตัวเลือก dropdown ถ้ายังว่าง
  const options = await readTable("Options");
  if (options.length === 0) {
    let id = 1;
    const rows: Row[] = [];
    for (const [category, names] of Object.entries(DEFAULT_OPTIONS)) {
      for (const name of names) rows.push([String(id++), category, name]);
    }
    if (rows.length) await appendRows("Options", rows);
  }
}

// ===== public low-level ops =====

// อ่านทุกแถวข้อมูล (ไม่รวม header) ของตารางเดียว
export async function readTable(name: TableName | string): Promise<Row[]> {
  const header = TABLES[name];
  if (useSheets) {
    const data = await sheetsApi(`/values/${encodeURIComponent(name)}`);
    const values: Row[] = data.values ?? [];
    return values.slice(1).map((r) => pad(r ?? [], header.length));
  }
  const all = fileReadAll();
  return (all[name] ?? []).map((r) => pad(r, header.length));
}

// อ่านหลายตารางพร้อมกัน (Sheets ใช้ batchGet = 1 ครั้ง)
export async function batchRead(names: (TableName | string)[]): Promise<Record<string, Row[]>> {
  if (useSheets) {
    const query = names.map((n) => `ranges=${encodeURIComponent(n)}`).join("&");
    const data = await sheetsApi(`/values:batchGet?${query}`);
    const ranges: any[] = data.valueRanges ?? [];
    const out: Record<string, Row[]> = {};
    names.forEach((n, i) => {
      const values: Row[] = ranges[i]?.values ?? [];
      out[n] = values.slice(1).map((r) => pad(r ?? [], TABLES[n].length));
    });
    return out;
  }
  const all = fileReadAll();
  const out: Record<string, Row[]> = {};
  for (const n of names) out[n] = (all[n] ?? []).map((r) => pad(r, TABLES[n].length));
  return out;
}

// เพิ่มแถวต่อท้าย
export async function appendRows(name: TableName | string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  if (useSheets) {
    await sheetsApi(
      `/values/${encodeURIComponent(name)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: rows }) }
    );
    return;
  }
  const all = fileReadAll();
  all[name] = [...(all[name] ?? []), ...rows];
  fileWriteAll(all);
}

// แก้ไขแถวข้อมูลลำดับที่ index (0-based ไม่รวม header)
export async function updateRow(name: TableName | string, index: number, row: Row): Promise<void> {
  const header = TABLES[name];
  const padded = pad(row, header.length);
  if (useSheets) {
    const sheetRow = index + 2; // +1 header, +1 เพราะ Sheets เริ่มที่ 1
    const range = `${name}!A${sheetRow}:${colLetter(header.length)}${sheetRow}`;
    await sheetsApi(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [padded] }),
    });
    return;
  }
  const all = fileReadAll();
  const rows = all[name] ?? [];
  rows[index] = padded;
  all[name] = rows;
  fileWriteAll(all);
}
