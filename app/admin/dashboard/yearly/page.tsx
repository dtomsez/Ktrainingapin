import Link from "next/link";
import { loadAllRequests } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";
import { buildMonthEvents, summarizeMonth, THAI_MONTHS } from "@/lib/dashboard";
import AdminNav from "../../AdminNav";
import CountUp from "../CountUp";
import ViewToggle from "../ViewToggle";

export const dynamic = "force-dynamic";

export default async function YearlyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const level = await requireAdmin();
  await logEvent("VIEW_DASHBOARD", { actor: approverByStep(level)?.name, detail: "รายปี" });
  const { y } = await searchParams;
  const year = y && /^\d{4}$/.test(y) ? Number(y) : new Date().getFullYear();
  const thaiYear = year + 543;

  const requests = (await loadAllRequests()).filter((r) => r.status !== "REJECTED");

  // สรุปทั้ง 12 เดือนของปี
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const summary = summarizeMonth(buildMonthEvents(requests, year, month));
    return { month, summary };
  });

  // รวมทั้งปี
  const yearCourseIds = new Set<number>();
  const yearPosHours = new Map<string, number>();
  let yearHours = 0;
  for (const { summary } of months) {
    yearHours += summary.totalHours;
    for (const c of summary.courses) yearCourseIds.add(c.requestId);
    for (const [p, h] of summary.positionHours) {
      yearPosHours.set(p, Math.round(((yearPosHours.get(p) ?? 0) + h) * 100) / 100);
    }
  }
  yearHours = Math.round(yearHours * 100) / 100;
  const yearPositions = [...yearPosHours.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <AdminNav active="dashboard" />

      <div className="animate-fade-up mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          📊 Dashboard <span className="gradient-text">รายปี {thaiYear}</span>
        </h1>
        <ViewToggle active="year" monthHref="/admin/dashboard" yearHref={`/admin/dashboard/yearly?y=${year}`} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card card-hover animate-fade-up delay-1 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-xl shadow-lg">
            📚
          </div>
          <div>
            <div className="text-xs text-slate-500">หลักสูตรทั้งปี</div>
            <div className="text-2xl font-bold">
              <CountUp value={yearCourseIds.size} suffix=" หลักสูตร" />
            </div>
          </div>
        </div>
        <div className="card card-hover animate-fade-up delay-2 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl shadow-lg">
            ⏱️
          </div>
          <div>
            <div className="text-xs text-slate-500">ชั่วโมงประชุม/อบรมทั้งปี</div>
            <div className="gradient-text text-2xl font-bold">
              <CountUp value={yearHours} suffix=" ชม." />
            </div>
          </div>
        </div>
        <div className="card card-hover animate-fade-up delay-3 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-xl shadow-lg">
            👥
          </div>
          <div>
            <div className="text-xs text-slate-500">ตำแหน่งที่เข้าประชุม/อบรม</div>
            <div className="text-2xl font-bold text-green-600">
              <CountUp value={yearPositions.length} suffix=" ตำแหน่ง" />
            </div>
          </div>
        </div>
      </div>

      {yearPositions.length > 0 && (
        <div className="card card-hover animate-fade-up delay-3 mb-6">
          <h2 className="mb-3 text-lg font-semibold text-sky-700">👥 ชั่วโมงประชุม/อบรมรวมต่อตำแหน่ง (ทั้งปี {thaiYear})</h2>
          <div className="flex flex-wrap gap-2">
            {yearPositions.map(([p, h]) => (
              <span key={p} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800">
                {p} <b>{h} ชม.</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card animate-fade-up delay-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/admin/dashboard/yearly?y=${year - 1}`} className="btn-secondary">
            ← ปี {thaiYear - 1}
          </Link>
          <h2 className="text-xl font-bold">
            🗓️ สรุปการประชุม/อบรมรายเดือน ปี <span className="gradient-text">{thaiYear}</span>
          </h2>
          <Link href={`/admin/dashboard/yearly?y=${year + 1}`} className="btn-secondary">
            ปี {thaiYear + 1} →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-100 to-sky-50 text-left text-slate-600">
              <tr>
                <th className="rounded-l-lg px-4 py-3">เดือน</th>
                <th className="px-4 py-3 text-center">จำนวนหลักสูตร</th>
                <th className="px-4 py-3">ตำแหน่งและชั่วโมงประชุม/อบรม</th>
                <th className="rounded-r-lg px-4 py-3 text-right">ชั่วโมงรวม</th>
              </tr>
            </thead>
            <tbody>
              {months.map(({ month, summary }, i) => {
                const hasData = summary.courses.length > 0;
                return (
                  <tr
                    key={month}
                    className={`animate-fade-up border-t border-slate-100 transition-colors duration-150 hover:bg-sky-50/50 ${!hasData ? "opacity-50" : ""}`}
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/dashboard?m=${year}-${String(month).padStart(2, "0")}`}
                        className="text-sky-600 transition-colors hover:text-sky-800 hover:underline"
                      >
                        {THAI_MONTHS[month - 1]}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasData ? (
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-2 text-xs font-bold text-white shadow-sm">
                          {summary.courses.length}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasData ? (
                        <div className="flex flex-wrap gap-1.5">
                          {summary.positionHours.map(([p, h]) => (
                            <span key={p} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                              {p} · {h} ชม.
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">ไม่มีการประชุม/อบรม</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {hasData ? `${summary.totalHours} ชม.` : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-sky-200 bg-sky-50/60 font-bold">
                <td className="px-4 py-3">รวมทั้งปี</td>
                <td className="px-4 py-3 text-center">{yearCourseIds.size}</td>
                <td className="px-4 py-3 text-slate-500">{yearPositions.length} ตำแหน่ง</td>
                <td className="gradient-text px-4 py-3 text-right">{yearHours} ชม.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
