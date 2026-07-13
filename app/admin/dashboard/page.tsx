import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { timeToMinutes } from "@/lib/hours";
import { effectiveSlots } from "@/lib/overlap";
import { STATUS_LABELS } from "@/lib/labels";
import { buildMonthEvents, summarizeMonth, dayKey } from "@/lib/dashboard";
import AdminNav from "../AdminNav";
import CountUp from "./CountUp";
import ViewToggle from "./ViewToggle";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  await requireAdmin();
  const { m } = await searchParams;

  const now = new Date();
  const [year, month] = (m && /^\d{4}-\d{2}$/.test(m) ? m : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // last day of month
  const daysInMonth = monthEnd.getDate();

  const allRequests = await prisma.trainingRequest.findMany({ include: { slots: true } });
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

  // สรุปภาพรวมสถานะทั้งหมด (เลขรวมทุกช่วงเวลา)
  const count = (s: string) => allRequests.filter((r) => r.status === s).length;
  const pendingTotal = count("PENDING_1") + count("PENDING_2") + count("PENDING_3");

  // ตัวเลขเฉพาะเดือนที่กำลังดู: นับคำขอที่มีวันจัด (slot ที่มีผล) คาบเกี่ยวเดือนนี้
  const monthEndOfDay = new Date(year, month, 0, 23, 59, 59, 999);
  const monthReqs = allRequests.filter((req) =>
    effectiveSlots(req).some(
      (s) => new Date(s.startDate) <= monthEndOfDay && new Date(s.endDate) >= monthStart
    )
  );
  const monthPending = monthReqs.filter((r) => r.status.startsWith("PENDING")).length;
  const monthApproved = monthReqs.filter((r) => r.status === "APPROVED").length;
  const monthRejected = monthReqs.filter((r) => r.status === "REJECTED").length;

  // ชั่วโมงรวมทุกช่วงเวลา (ไว้เทียบกับชั่วโมงของเดือนนี้)
  const allHours =
    Math.round(
      requests.reduce((sum, r) => sum + effectiveSlots(r).reduce((s2, sl) => s2 + sl.totalHours, 0), 0) * 100
    ) / 100;

  const prevM = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, "0")}`;
  const nextM = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;
  const monthName = monthStart.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const monthOnly = monthStart.toLocaleDateString("th-TH", { month: "long" });
  const firstWeekday = monthStart.getDay(); // 0 = อาทิตย์
  const todayKey = dayKey(new Date());

  const statCards = [
    {
      label: "คำขอทั้งหมด",
      icon: "📄",
      iconBg: "from-sky-500 to-blue-600",
      value: <CountUp value={allRequests.length} />,
      color: "text-slate-900",
      sub: `เดือน${monthOnly}: ${monthReqs.length} คำขอ`,
    },
    {
      label: "รอการอนุมัติ",
      icon: "⏳",
      iconBg: "from-amber-400 to-orange-500",
      value: <CountUp value={pendingTotal} />,
      color: "text-amber-600",
      sub: `เดือน${monthOnly}: ${monthPending} คำขอ`,
    },
    {
      label: "อนุมัติแล้ว / ปฏิเสธ",
      icon: "✅",
      iconBg: "from-emerald-400 to-green-600",
      value: (
        <>
          <span className="text-green-600">
            <CountUp value={count("APPROVED")} />
          </span>
          <span className="text-slate-300"> / </span>
          <span className="text-red-500">
            <CountUp value={count("REJECTED")} />
          </span>
        </>
      ),
      color: "",
      sub: `เดือน${monthOnly}: ${monthApproved} / ${monthRejected}`,
    },
    {
      label: `ชั่วโมงประชุม/อบรมเดือนนี้ (${summary.courses.length} หลักสูตร)`,
      icon: "⏱️",
      iconBg: "from-sky-400 to-blue-600",
      value: <CountUp value={summary.totalHours} suffix=" ชม." />,
      color: "gradient-text",
      sub: `รวมทุกช่วงเวลา: ${allHours} ชม.`,
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
          <div key={c.label} className="card card-hover animate-fade-up flex items-center gap-4" style={{ animationDelay: `${0.08 + i * 0.08}s` }}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow-lg ${c.iconBg}`}>
              {c.icon}
            </div>
            <div>
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {c.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* สรุปประจำเดือน: หลักสูตร + ชั่วโมงต่อตำแหน่ง */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card card-hover animate-fade-up delay-2">
          <h2 className="mb-3 text-lg font-semibold text-sky-700">
            📚 หลักสูตรที่ประชุม/อบรมเดือนนี้ ({summary.courses.length})
          </h2>
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

        <div className="card card-hover animate-fade-up delay-3">
          <h2 className="mb-3 text-lg font-semibold text-sky-700">👥 ชั่วโมงประชุม/อบรมรวมต่อตำแหน่ง</h2>
          {summary.positionHours.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">ไม่มีข้อมูลในเดือนนี้</p>
          ) : (
            <div className="space-y-2.5">
              {summary.positionHours.map(([pos, hours]) => {
                const max = summary.positionHours[0][1];
                return (
                  <div key={pos}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{pos}</span>
                      <span className="font-semibold text-sky-700">{hours} ชม.</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="timeline-bar h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
                        style={{ width: `${Math.max((hours / max) * 100, 4)}%`, transformOrigin: "left" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
