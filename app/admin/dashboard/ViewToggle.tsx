import Link from "next/link";

// ปุ่มสลับมุมมอง Dashboard รายเดือน / รายปี
export default function ViewToggle({ active, monthHref, yearHref }: { active: "month" | "year"; monthHref: string; yearHref: string }) {
  const cls = (isActive: boolean) =>
    isActive
      ? "rounded-lg px-4 py-1.5 text-sm font-semibold bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30"
      : "rounded-lg px-4 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-sky-700";
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <Link href={monthHref} className={cls(active === "month")}>
        📅 รายเดือน
      </Link>
      <Link href={yearHref} className={cls(active === "year")}>
        🗓️ รายปี
      </Link>
    </div>
  );
}
