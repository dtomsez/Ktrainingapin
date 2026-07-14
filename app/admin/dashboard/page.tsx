import Link from "next/link";
import { loadAllRequests } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";
import { timeToMinutes } from "@/lib/hours";
import { effectiveSlots } from "@/lib/overlap";
import { STATUS_LABELS } from "@/lib/labels";
import { buildMonthEvents, summarizeMonth, dayKey } from "@/lib/dashboard";
import AdminNav from "../AdminNav";
import CountUp from "./CountUp";
import ViewToggle from "./ViewToggle";
import { DonutChart, TrendChart, RadarChart } from "./Charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const level = await requireAdmin();
  await logEvent("VIEW_DASHBOARD", { actor: approverByStep(level)?.name, detail: "รายเดือน" });
  const { m } = await searchParams;

  const now = new Date();
  const [year, month] = (m && /^\d{4}-\d{2}$/.test(m) ? m : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // last day of month
  const daysInMonth = monthEnd.getDate();

  const allRequests = await loadAllRequests();
  const requests = allRequests.filter((r) => r.status !== "REJECTED");

  const byDay = buildMonthEvents(requests, year, month);
  const summary = summarizeMonth(byDay);

  // วันไหนมี event จากคนละคำขอที่ช่วงเวลาชนกัน = วันทับซ้อน
  const overlapDays = new Set<string>();
  for (const [key, events] of byDay) {
    outer: for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (
          a.requestId !== b.requestId &&
          timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
          timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
        ) {
          overlapDays.add(key);
          break outer;
        }
      }
    }
  }

  // ตัวเลขเฉพาะเดือนที่กำลังดู: นับคำขอที่มีวันจัด (slot ที่มีผล) คาบเกี่ยวเดือนนี้เท่านั้น
  const monthEndOfDay = new Date(year, month, 0, 23, 59, 59, 999);
  const monthReqs = allRequests.filter((req) =>
    effectiveSlots(req).some(
      (s) => new Date(s.startDate) <= monthEndOfDay && new Date(s.endDate) >= monthStart
    )
  );
  const monthPending = monthReqs.filter((r) => r.status.startsWith("PENDING")).length;
  const monthApproved = monthReqs.filter((r) => r.status === "APPROVED").length;
  const monthRejected = monthReqs.filter((r) => r.status === "REJECTED").length;

  const prevM = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, "0")}`;
  const nextM = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;
  const monthName = monthStart.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const monthOnly = monthStart.toLocaleDateString("th-TH", { month: "long" });
  const firstWeekday = monthStart.getDay(); // 0 = อาทิตย์
  const todayKey = dayKey(new Date());

  // ข้อมูลกราฟเดือนนี้
  const monthStatusSegments = [
    { label: "อนุมัติ", value: monthApproved, color: "#10b981" },
    { label: "ปฏิเสธ", value: monthRejected, color: "#f43f5e" },
    { label: "รอพิจารณา", value: monthPending, color: "#f59e0b" },
  ];
  const radarAxes = summary.positionHours.map(([p, h]) => ({ label: p, value: h }));
  const dailyPoints = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const evs = byDay.get(dayKey(new Date(year, month - 1, day))) ?? [];
    const hours = Math.round(evs.reduce((s, e) => s + e.hoursPerDay, 0) * 100) / 100;
    return { label: `${day}`, value: hours };
  });
  const dailyLabelEvery = Math.max(1, Math.ceil(daysInMonth / 10));

  const statCards = [
    {
      label: `คำขอเดือน${monthOnly}`,
      icon: "📄",
      accent: "accent-sky",
      value: <CountUp value={monthReqs.length} />,
    },
    {
      label: "รอการอนุมัติ",
      icon: "⏳",
      accent: "accent-amber",
      value: <CountUp value={monthPending} />,
    },
    {
      label: "อนุมัติแล้ว / ปฏิเสธ",
      icon: "✅",
      accent: "accent-green",
      value: (
        <>
          <span className="text-emerald-600">
            <CountUp value={monthApproved} />
          </span>
          <span className="text-slate-300"> / </span>
          <span className="text-rose-500">
            <CountUp value={monthRejected} />
          </span>
        </>
      ),
    },
    {
      label: `ชั่วโมงประชุม/อบรมเดือนนี้ (${summary.courses.length} หลักสูตร)`,
      icon: "⏱️",
      accent: "accent-violet",
      value: (
        <>
          <CountUp value={summary.totalHours} />
          <span className="unit">ชม.</span>
        </>
      ),
    },
  ];

  return (
    <div>
      <AdminNav active="dashboard" />

      <div className="animate-fade-up mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          📊 <span className="gradient-text">Dashboard</span>
        </h1>
        <ViewToggle active="month" monthHref={`/admin/dashboard?m=${year}-${String(month).padStart(2, "0")}`} yearHref={`/admin/dashboard/yearly?y=${year}`} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => (
          <div key={c.label} className={`stat-tile animate-fade-up ${c.accent}`} style={{ animationDelay: `${0.08 + i * 0.08}s` }}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Bento: กราฟสรุปเดือนนี้ */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="bento-card animate-fade-up delay-2 self-start">
          <div className="bento-title">🍩 สัดส่วนสถานะเดือนนี้</div>
          {monthReqs.length > 0 ? (
            <DonutChart segments={monthStatusSegments} centerLabel="คำขอ" centerValue={monthReqs.length} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">ไม่มีคำขอในเดือนนี้</p>
          )}
        </div>

        <div className="bento-card animate-fade-up delay-2 self-start">
          <div className="bento-title">🕸️ ชั่วโมงอบรมต่อตำแหน่งเดือนนี้</div>
          {radarAxes.length >= 3 ? (
            <RadarChart axes={radarAxes} unit=" ชม." />
          ) : summary.positionHours.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {summary.positionHours.map(([pos, hours]) => {
                const max = summary.positionHours[0][1];
                return (
                  <div key={pos}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{pos}</span>
                      <span className="font-semibold text-sky-700">{hours} ชม.</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="timeline-bar h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500" style={{ width: `${Math.max((hours / max) * 100, 4)}%`, transformOrigin: "left" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">ไม่มีข้อมูลในเดือนนี้</p>
          )}
        </div>

        <div className="bento-card animate-fade-up delay-3 self-start">
          <div className="bento-title">📚 หลักสูตรที่ประชุม/อบรมเดือนนี้ ({summary.courses.length})</div>
          {summary.courses.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">ไม่มีการประชุม/อบรมในเดือนนี้</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.courses.map((c) => (
                <li key={c.requestId} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-all duration-200 hover:translate-x-1">
                  <div>
                    <Link href={`/admin/requests/${c.requestId}`} className="font-medium text-slate-800 hover:text-sky-700 hover:underline">
                      {c.courseName}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {c.positions.map((p) => (
                        <span key={p} className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                    {c.hours} ชม.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* แนวโน้มชั่วโมงรายวันในเดือน */}
      <div className="mb-6 bento-card animate-fade-up delay-3">
        <div className="bento-title">📈 ชั่วโมงประชุม/อบรมรายวัน (เดือน{monthOnly})</div>
        <TrendChart points={dailyPoints} unit="ชม." showPointLabels={false} labelEvery={dailyLabelEvery} />
      </div>

      <div className="card animate-fade-up delay-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/admin/dashboard?m=${prevM}`} className="btn-secondary">
            ← เดือนก่อน
          </Link>
          <h2 className="text-xl font-bold">
            🗓️ ปฏิทินการประชุม/อบรม เดือน<span className="gradient-text">{monthName}</span>
          </h2>
          <Link href={`/admin/dashboard?m=${nextM}`} className="btn-secondary">
            เดือนถัดไป →
          </Link>
        </div>

        <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-gradient-to-br from-green-300 to-emerald-400" /> อนุมัติแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-gradient-to-br from-amber-200 to-amber-400" /> รอพิจารณา
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border-2 border-red-400" /> วันที่มีเวลาทับซ้อนกัน
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div key={d} className="py-1 text-center text-xs font-semibold text-slate-500">
              {d}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = dayKey(new Date(year, month - 1, day));
            const events = byDay.get(key) ?? [];
            const hasOverlap = overlapDays.has(key);
            const isToday = key === todayKey;
            return (
              <div
                key={day}
                className={`min-h-24 rounded-xl border p-1.5 text-xs transition-all duration-200 hover:shadow-md ${
                  hasOverlap
                    ? "overlap-day border-2 border-red-400 bg-red-50"
                    : isToday
                      ? "border-sky-400 bg-sky-50/70 shadow-sm"
                      : "border-slate-200 bg-white hover:border-sky-200"
                }`}
              >
                <div className={`mb-1 flex items-center gap-1 font-semibold ${hasOverlap ? "text-red-600" : isToday ? "text-sky-600" : "text-slate-400"}`}>
                  {isToday ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-[10px] text-white shadow-sm">
                      {day}
                    </span>
                  ) : (
                    day
                  )}
                  {hasOverlap && <span className="inline-block animate-wiggle">⚠️</span>}
                </div>
                <div className="space-y-1">
                  {events.map((e, idx) => (
                    <Link
                      key={idx}
                      href={`/admin/requests/${e.requestId}`}
                      title={`${e.requestNo} · ${STATUS_LABELS[e.status]}`}
                      className={`event-pill ${
                        e.approved
                          ? "bg-gradient-to-r from-green-200 to-emerald-200 text-green-900 hover:shadow-emerald-500/30"
                          : "bg-gradient-to-r from-amber-200 to-yellow-200 text-amber-900 hover:shadow-amber-500/30"
                      }`}
                    >
                      <div className="font-semibold">{e.courseName}</div>
                      <div className="opacity-75">
                        {e.positionLabel} · {e.startTime}–{e.endTime} ({e.hoursPerDay} ชม.)
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
