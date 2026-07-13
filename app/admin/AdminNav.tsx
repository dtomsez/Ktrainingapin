import Link from "next/link";
import { logoutAdmin } from "./login/actions";

export default function AdminNav({ active }: { active: "queue" | "dashboard" | "data" | "logs" }) {
  const tabClass = (isActive: boolean) =>
    isActive
      ? "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 bg-gradient-to-r from-sky-600 to-blue-700 transition-all duration-200"
      : "rounded-xl px-4 py-2 text-sm font-semibold bg-white/80 border border-slate-300 text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700 hover:shadow-md";

  return (
    <div className="animate-fade-up mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin" className={tabClass(active === "queue")}>
          📋 คิวอนุมัติ
        </Link>
        <Link href="/admin/dashboard" className={tabClass(active === "dashboard")}>
          📊 Dashboard
        </Link>
        <Link href="/admin/data-control" className={tabClass(active === "data")}>
          ⚙️ Data Control
        </Link>
        <Link href="/admin/logs" className={tabClass(active === "logs")}>
          🧾 Log
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/api/export"
          className="rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-100 hover:shadow-md"
        >
          ⬇️ ดาวน์โหลด Excel
        </a>
        <form action={logoutAdmin}>
          <button className="cursor-pointer text-sm text-red-500 transition-colors hover:text-red-700 hover:underline">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
