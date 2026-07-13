import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const approvers = [
  { name: "ผู้อนุมัติท่านที่ 1", email: "approver1@company.co.th", stepOrder: 1 },
  { name: "ผู้อนุมัติท่านที่ 2", email: "approver2@company.co.th", stepOrder: 2 },
  { name: "ผู้อนุมัติท่านที่ 3", email: "approver3@company.co.th", stepOrder: 3 },
];

// ตัวเลือกเริ่มต้นของ dropdown แต่ละชุด — แก้ไข/เพิ่ม/ลบได้ที่หน้า Data Control
const options: Record<string, string[]> = {
  BUSINESS_LINE: ["สายงานปฏิบัติการ", "สายงานขายและการตลาด", "สายงานการเงิน", "สายงานทรัพยากรบุคคล", "สายงานเทคโนโลยีสารสนเทศ"],
  DISTRICT: ["สำนักงานเขต 1", "สำนักงานเขต 2", "สำนักงานเขต 3", "สำนักงานเขต 4", "สำนักงานใหญ่"],
  NETWORK_GROUP: ["กลุ่มเครือข่ายภาคกลาง", "กลุ่มเครือข่ายภาคเหนือ", "กลุ่มเครือข่ายภาคตะวันออกเฉียงเหนือ", "กลุ่มเครือข่ายภาคใต้", "สำนักภาคกรุงเทพฯ"],
  POSITION: ["ผู้บริหาร", "ผู้จัดการ", "หัวหน้างาน", "พนักงานอาวุโส", "พนักงานทั่วไป", "พนักงานใหม่"],
};

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  for (const a of approvers) {
    await prisma.approver.upsert({
      where: { email: a.email },
      update: { name: a.name, stepOrder: a.stepOrder },
      create: { ...a, passwordHash },
    });
  }
  for (const [category, names] of Object.entries(options)) {
    for (const name of names) {
      await prisma.optionItem.upsert({
        where: { category_name: { category, name } },
        update: {},
        create: { category, name },
      });
    }
  }
  console.log("Seeded 3 approvers + dropdown options (4 categories)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
