import { JWT } from "google-auth-library";

// สร้าง JWT client จาก Service Account เพื่อขอ access token ให้ Google Sheets API
// ต้องตั้ง env: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
let cached: JWT | null = null;

function client(): JWT {
  if (cached) return cached;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Vercel/env เก็บ private key แบบมี \n เป็นตัวอักษร ต้องแปลงกลับเป็นขึ้นบรรทัดจริง
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error("ไม่พบ GOOGLE_SERVICE_ACCOUNT_EMAIL หรือ GOOGLE_PRIVATE_KEY");
  }
  cached = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return cached;
}

export async function getAccessToken(): Promise<string> {
  const token = await client().getAccessToken();
  if (!token.token) throw new Error("ขอ access token จาก Google ไม่สำเร็จ");
  return token.token;
}
