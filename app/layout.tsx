import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const font = IBM_Plex_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "แบบฟอร์มการขอจัดประชุม/อบรม สำหรับพนักงานสายงานเครือข่ายธุรกิจขนาดเล็กและรายย่อย",
  description: "แบบฟอร์มขอจัดประชุม/อบรม พร้อมระบบอนุมัติและ Dashboard วิเคราะห์",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>
        {/* พื้นหลังตกแต่ง: ตารางจุด + วงกลมเบลอลอยช้าๆ */}
        <div className="bg-grid" aria-hidden />
        <div className="orb orb-a animate-float h-96 w-96" style={{ top: "-8rem", left: "-8rem" }} aria-hidden />
        <div className="orb orb-b animate-float h-96 w-96" style={{ top: "30%", right: "-10rem", animationDelay: "-3s" }} aria-hidden />
        <div className="orb orb-c animate-float h-80 w-80" style={{ bottom: "-6rem", left: "35%", animationDelay: "-6s" }} aria-hidden />
        {/* มาสคอตน้องนกกรุงไทย จาง ๆ เป็นลายน้ำ */}
        <div className="mascot-watermark" aria-hidden />

        <header className="glass sticky top-0 z-50">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="group flex max-w-md items-center gap-2 font-bold">
              <span className="mascot-badge inline-block h-8 w-8 shrink-0 rounded-full shadow-sm ring-2 ring-white/70 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden />
              <span className="gradient-text text-sm leading-snug">
                แบบฟอร์มการขอจัดประชุม/อบรม สำหรับพนักงานสายงานเครือข่ายธุรกิจขนาดเล็กและรายย่อย
              </span>
            </Link>
            <nav className="flex gap-5 text-sm font-medium text-slate-600">
              <Link href="/" className="nav-link">
                ยื่นคำขอ
              </Link>
              <Link href="/track" className="nav-link">
                ติดตามสถานะ
              </Link>
              <Link href="/admin" className="nav-link">
                สำหรับผู้อนุมัติ
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-center text-xs text-slate-400">
          แบบฟอร์มการขอจัดประชุม/อบรม สำหรับพนักงานสายงานเครือข่ายธุรกิจขนาดเล็กและรายย่อย
        </footer>
      </body>
    </html>
  );
}
