import { getRequestByNo } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { STATUS_LABELS, STATUS_COLORS, COURSE_TYPE_LABELS, pendingStep, parsePositions, formatDateRange } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  const query = no?.trim().toUpperCase();
  const request = query ? await getRequestByNo(query) : null;
  if (query) {
    await logEvent("TRACK", { requestNo: query, detail: request ? "พบคำขอ" : "ไม่พบคำขอ" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="animate-fade-up py-4 text-center">
        <h1 className="text-3xl font-bold">
          ติดตาม<span className="gradient-text">สถานะคำขอการจัดประชุม/อบรม</span>
        </h1>
      </div>

      <form className="card card-hover animate-fade-up delay-1 flex gap-3" action="/track">
        <input
          name="no"
          defaultValue={no ?? ""}
          className="field-input font-mono"
          placeholder="TR-2026-0001"
          required
        />
        <button className="btn-primary shrink-0">🔍 ค้นหา</button>
      </form>

      {no && !request && (
        <div className="card animate-pop-in border-red-200 bg-red-50/90 text-red-700">
          ไม่พบคำขอเลขที่ <b className="font-mono">{no}</b> — กรุณาตรวจสอบเลขที่คำขออีกครั้ง
        </div>
      )}

      {request && (
        <div className="card animate-fade-up delay-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-sm text-slate-500">{request.requestNo}</div>
              <h2 className="text-xl font-bold">{request.courseName}</h2>
              <div className="text-sm text-slate-500">
                {COURSE_TYPE_LABELS[request.courseType]} · โดย {request.requesterName} ({request.department} / {request.position})
              </div>
              {parsePositions(request.traineePositions).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {parsePositions(request.traineePositions).map((p) => (
                    <span key={p} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className={`animate-pop-in rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ${STATUS_COLORS[request.status]} ${request.status.startsWith("PENDING") ? "animate-pulse-soft" : ""}`}>
              {STATUS_LABELS[request.status]}
            </span>
          </div>

          {request.status === "APPROVED" && request.selectedSlot && (
            <div className="animate-pop-in rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 text-sm text-green-800 shadow-sm">
              ✅ วันที่ได้รับอนุมัติ: <b>{formatDateRange(request.selectedSlot.startDate, request.selectedSlot.endDate)}</b>{" "}
              เวลา {request.selectedSlot.startTime}–{request.selectedSlot.endTime} น. (รวม {request.selectedSlot.totalHours} ชั่วโมง)
            </div>
          )}

          <div>
            <h3 className="mb-4 font-semibold">ลำดับการอนุมัติ</h3>
            <ol className="space-y-0">
              {[1, 2, 3].map((step) => {
                const action = request.actions.find((a) => a.step === step);
                const current = pendingStep(request.status) === step;
                const skipped = request.status === "REJECTED" && !action;
                return (
                  <li key={step} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {step < 3 && (
                      <span
                        className={`timeline-bar absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-0.5 rounded ${
                          action?.decision === "APPROVE" ? "bg-gradient-to-b from-green-400 to-green-200" : "bg-slate-200"
                        }`}
                        style={{ animationDelay: `${step * 0.15}s` }}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`animate-pop-in relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md transition-transform hover:scale-110 ${
                        action?.decision === "APPROVE"
                          ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-500/40"
                          : action?.decision === "REJECT"
                            ? "bg-gradient-to-br from-red-400 to-red-600 text-white shadow-red-500/40"
                            : current
                              ? "animate-pulse-soft bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-amber-500/40"
                              : "bg-slate-200 text-slate-500"
                      }`}
                      style={{ animationDelay: `${step * 0.12}s` }}
                    >
                      {action?.decision === "APPROVE" ? "✓" : action?.decision === "REJECT" ? "✕" : step}
                    </span>
                    <div>
                      <div className="text-sm font-medium">
                        ผู้อนุมัติท่านที่ {step}
                        {action && <span className="text-slate-500"> — {action.approver.name}</span>}
                      </div>
                      <div className="text-sm text-slate-500">
                        {action
                          ? `${action.decision === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"}เมื่อ ${new Date(action.decidedAt).toLocaleString("th-TH")}${action.comment ? ` · "${action.comment}"` : ""}`
                          : current
                            ? "กำลังรอพิจารณา..."
                            : skipped
                              ? "ไม่ถึงขั้นตอนนี้"
                              : "รอขั้นตอนก่อนหน้า"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">วันที่ที่เสนอ</h3>
            <ul className="space-y-2 text-sm">
              {request.slots.map((s, i) => (
                <li
                  key={s.id}
                  className={`animate-fade-up rounded-xl border px-4 py-2.5 transition-all duration-200 hover:translate-x-1 ${
                    request.selectedSlotId === s.id
                      ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 font-semibold text-green-800 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                  style={{ animationDelay: `${0.25 + i * 0.1}s` }}
                >
                  ทางเลือกที่ {s.slotNo}: {formatDateRange(s.startDate, s.endDate)} เวลา {s.startTime}–{s.endTime} น. · รวม {s.totalHours} ชม.
                  {request.selectedSlotId === s.id && " ← วันที่ถูกเลือก"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
