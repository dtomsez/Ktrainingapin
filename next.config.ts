import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // แนบไฟล์ฐานข้อมูล SQLite (สร้างตอน build) เข้าไปใน serverless bundle ของทุก route
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
    "/**/*": ["./prisma/dev.db"],
  },
};

export default nextConfig;
