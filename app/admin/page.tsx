import Link from "next/link";
import { loadAllRequests } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";
import { STATUS_LABELS, STATUS_COLORS, formatDateRange } from "@/lib/labels";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminQueuePage() {
  const level = await requireAdmin();
  await logEvent("VIEW_QUEUE", { actor: approverByStep(level)?.name });
  const all = await loadAllRequests();
  const pending = all
    .filter((r) => r.status.startsWith("PENDING"))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const finished = all
    .filter((r) => r.status === "APPROVED" || r.status === "REJECTED")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);

  return (
    <div>
      <AdminNav active="queue" />

      <div className="animate-fade-up delay-1 mb-5 flex items-center gap-3">
        <h1 className="text-2xl font-bold">คำขอที่รอการอนุมัติ</h1>
        {pending.length > 0 && (
          <span className="animate-pulse-soft inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 text-sm font-bold text-white shadow-md shadow-amber-500/40">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="card animate-fade-up delay-2 mb-8 py-10 text-center text-slate-500">
          <div className="mb-2 text-4xl">🎉</div>
          ไม่มีคำขอค้างพิจารณา
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {pending.map((r, i) => (
            <Link
              key={r.id}
              href={`/admin/requests/${r.id}`}
              className="card card-hover animate-fade-up group block"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{r.requestNo}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="text-lg font-bold transition-colors group-hover:text-sky-700">{r.courseName}</div>
                  <div className="text-sm text-slate-500">
                    {r.requesterName} · {r.department} / {r.position} · {r.participants} คน
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {r.selectedSlot
                      ? `วันที่เคาะแล้ว: ${formatDateRange(r.selectedSlot.startDate, r.selectedSlot.endDate)} (${r.selectedSlot.totalHours} ชม.)`
                      : `เสนอ ${r.slots.length} ทางเลือก: ${r.slots.map((s) => formatDateRange(s.startDate, s.endDate)).join(" | ")}`}
                  </div>
                </div>
                <span className="btn-primary transition-transform duration-200 group-hover:translate-x-1">พิจารณา →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="animate-fade-up delay-3 mb-3 text-lg font-semibold text-slate-700">คำขอที่พิจารณาเสร็จแล้ว (ล่าสุด)</h2>
      <div className="card animate-fade-up delay-4 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-sky-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">เลขที่</th>
              <th className="px-4 py-3">หลักสูตร</th>
              <th className="px-4 py-3">ผู้ขอ</th>
              <th className="px-4 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {finished.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 transition-colors duration-150 hover:bg-sky-50/50">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/admin/requests/${r.id}`} className="text-sky-600 transition-colors hover:text-sky-800 hover:underline">
                    {r.requestNo}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.courseName}</td>
                <td className="px-4 py-3">{r.requesterName}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
              </tr>
            ))}
            {finished.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  ยังไม่มีคำขอที่พิจารณาเสร็จ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
