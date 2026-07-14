import { requireLevel1 } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { getLogs, logEvent, EVENT_LABELS } from "@/lib/log";
import AdminNav from "../AdminNav";
import CountUp from "../dashboard/CountUp";

export const dynamic = "force-dynamic";

// สีป้ายกำกับตามประเภทเหตุการณ์
const EVENT_STYLES: Record<string, string> = {
  SUBMIT: "bg-sky-100 text-sky-800",
  TRACK: "bg-slate-100 text-slate-700",
  LOGIN_SUCCESS: "bg-green-100 text-green-800",
  LOGIN_FAIL: "bg-red-100 text-red-800",
  APPROVE: "bg-green-100 text-green-800",
  REJECT: "bg-red-100 text-red-800",
  OPTION_ADD: "bg-blue-100 text-blue-800",
  OPTION_DELETE: "bg-orange-100 text-orange-800",
  EXPORT: "bg-emerald-100 text-emerald-800",
  VIEW_QUEUE: "bg-slate-100 text-slate-600",
  VIEW_REQUEST: "bg-slate-100 text-slate-600",
  VIEW_DASHBOARD: "bg-slate-100 text-slate-600",
  VIEW_DATACONTROL: "bg-slate-100 text-slate-600",
  VIEW_LOGS: "bg-slate-100 text-slate-600",
};

export default async function LogsPage() {
  const level = await requireLevel1();
  await logEvent("VIEW_LOGS", { actor: approverByStep(level)?.name });
  const logs = await getLogs();

  const now = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

  const todayCount = logs.filter((l) => isToday(l.timestamp)).length;
  const submitCount = logs.filter((l) => l.event === "SUBMIT").length;
  const decisionCount = logs.filter((l) => l.event === "APPROVE" || l.event === "REJECT").length;

  // สรุปจำนวนตามประเภทเหตุการณ์ (เรียงมาก→น้อย)
  const byEvent = new Map<string, number>();
  for (const l of logs) byEvent.set(l.event, (byEvent.get(l.event) ?? 0) + 1);
  const eventStats = [...byEvent.entries()].sort((a, b) => b[1] - a[1]);
  const maxEvent = eventStats[0]?.[1] ?? 1;

  const recent = logs.slice(0, 200);

  const statCards = [
    { label: "กิจกรรมทั้งหมด", icon: "🧾", iconBg: "from-sky-500 to-blue-600", value: logs.length, color: "text-slate-900" },
    { label: "กิจกรรมวันนี้", icon: "📆", iconBg: "from-amber-400 to-orange-500", value: todayCount, color: "text-amber-600" },
    { label: "ยื่นคำขอ (ครั้ง)", icon: "📝", iconBg: "from-sky-400 to-blue-600", value: submitCount, color: "gradient-text" },
    { label: "การพิจารณา (ครั้ง)", icon: "⚖️", iconBg: "from-emerald-400 to-green-600", value: decisionCount, color: "text-green-600" },
  ];

  return (
    <div>
      <AdminNav active="logs" />

      <div className="animate-fade-up mb-6">
        <h1 className="text-2xl font-bold">
          🧾 <span className="gradient-text">สรุป Log กิจกรรม</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">บันทึกกิจกรรมจากทุกหน้าของระบบ (เรียงล่าสุดก่อน)</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => (
          <div key={c.label} className="card card-hover animate-fade-up flex items-center gap-4" style={{ animationDelay: `${0.08 + i * 0.08}s` }}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl shadow-lg ${c.iconBg}`}>
              {c.icon}
            </div>
            <div>
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className={`text-2xl font-bold ${c.color}`}>
                <CountUp value={c.value} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* สรุปตามประเภทเหตุการณ์ */}
        <div className="card card-hover animate-fade-up delay-2 self-start">
          <h2 className="mb-3 text-lg font-semibold text-sky-700">📊 แยกตามประเภท</h2>
          {eventStats.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
          ) : (
            <div className="space-y-2.5">
              {eventStats.map(([ev, n]) => (
                <div key={ev}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{EVENT_LABELS[ev] ?? ev}</span>
                    <span className="font-semibold text-sky-700">{n}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="timeline-bar h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
                      style={{ width: `${Math.max((n / maxEvent) * 100, 4)}%`, transformOrigin: "left" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ตารางกิจกรรมล่าสุด */}
        <div className="card animate-fade-up delay-3 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-100 to-sky-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">เวลา</th>
                <th className="px-4 py-3">เหตุการณ์</th>
                <th className="px-4 py-3">ผู้ใช้ / IP</th>
                <th className="px-4 py-3">เลขที่คำขอ</th>
                <th className="px-4 py-3">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 transition-colors duration-150 hover:bg-sky-50/50">
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">
                    {l.timestamp.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EVENT_STYLES[l.event] ?? "bg-slate-100 text-slate-600"}`}>
                      {EVENT_LABELS[l.event] ?? l.event}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{l.actor || "-"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.requestNo || "-"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{l.detail || "-"}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    ยังไม่มีกิจกรรมในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
