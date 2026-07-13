// ส่งอีเมลผ่าน Resend เมื่อมี RESEND_API_KEY — ถ้าไม่มี (dev) จะ log ลง console แทน
// หมายเหตุ: ฟอร์มไม่เก็บอีเมลผู้ขอแล้ว จึงแจ้งเตือนเฉพาะฝั่งผู้อนุมัติ
// ผู้ขอติดตามผลได้จากหน้า /track ด้วยเลขที่คำขอ
export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `\n===== [DEV EMAIL] =====\nTo: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, "")}\n=======================\n`
    );
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Training Request <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export function emailLayout(body: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#0077c8;margin-top:0">ระบบขอจัดประชุม/อบรม</h2>
  ${body}
  <p style="color:#6b7280;font-size:12px;margin-top:24px">อีเมลนี้ส่งอัตโนมัติจากระบบขอจัดอบรม กรุณาอย่าตอบกลับ</p>
</div>`;
}

export async function notifyApprover(approver: { email: string; name: string }, req: {
  requestNo: string;
  courseName: string;
  requesterName: string;
  id: number;
}) {
  await sendEmail(
    approver.email,
    `[${req.requestNo}] คำขอจัดประชุม/อบรมรอการอนุมัติจากคุณ`,
    emailLayout(
      `<p>เรียนคุณ ${approver.name}</p>
       <p>คำขอจัดประชุม/อบรมหลักสูตร <b>${req.courseName}</b> (${req.requestNo}) โดย ${req.requesterName} รอการพิจารณาจากคุณ</p>
       <p><a href="${appUrl()}/admin/requests/${req.id}">เปิดดูและอนุมัติคำขอ</a></p>`
    )
  );
}
