import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// บน Vercel filesystem ของ function เป็น read-only — ก๊อปฐานข้อมูล SQLite ที่ bundle มา
// ไปไว้ที่ /tmp (เขียนได้) แล้วชี้ DATABASE_URL ไปที่นั่น
// หมายเหตุ: ข้อมูลบน /tmp เป็นแบบชั่วคราว (หายเมื่อ redeploy/เครื่องใหม่) —
// สำหรับใช้งานจริงถาวรให้ตั้ง DATABASE_URL เป็น Postgres และเปลี่ยน provider ใน schema.prisma
if (process.env.VERCEL && (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:"))) {
  const bundled = path.join(process.cwd(), "prisma", "dev.db");
  const writable = "/tmp/dev.db";
  if (!fs.existsSync(writable) && fs.existsSync(bundled)) {
    fs.copyFileSync(bundled, writable);
  }
  process.env.DATABASE_URL = `file:${writable}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
