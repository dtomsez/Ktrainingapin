import { getRequestByNo } from "@/lib/db";
import { logEvent } from "@/lib/log";
import { COURSE_TYPE_LABELS, parsePositions, formatDateRange } from "@/lib/labels";

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

  // แสดงเฉพาะผลลัพธ์: อนุมัติ / ปฏิเสธ / อยู่ระหว่างพิจารณา (ถ้าระดับใดปฏิเสธ = ปฏิเสธทันที)
  const isApproved = request?.status === "APPROVED";
  const isRejected = request?.status === "REJECTED";
  const statusLabel = isApproved ? "อนุมัติแล้ว" : isRejected ? "ปฏิเสธ" : "อยู่ระหว่างการพิจารณา";
  const statusColor = isApproved
    ? "bg-green-100 text-green-800"
    : isRejected
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800 animate-pulse-soft";

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

      {query && !request && (
        <div className="card animate-pop-in border-red-200 bg-red-50/90 text-red-700">
          ไม่พบคำขอเลขที่ <b className="font-mono">{query}</b> — กรุณาตรวจสอบเลขที่คำขออีกครั้ง
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
            <span className={`animate-pop-in rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          {/* ผลลัพธ์แบบเรียบง่าย: อนุมัติ / ปฏิเสธ / กำลังพิจารณา */}
          {isApproved && request.selectedSlot ? (
            <div className="animate-pop-in rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 text-sm text-green-800 shadow-sm">
              ✅ คำขอได้รับการอนุมัติแล้ว · วันที่จัด: <b>{formatDateRange(request.selectedSlot.startDate, request.selectedSlot.endDate)}</b>{" "}
              เวลา {request.selectedSlot.startTime}–{request.selectedSlot.endTime} น. (รวม {request.selectedSlot.totalHours} ชั่วโมง)
            </div>
          ) : isRejected ? (
            <div className="animate-pop-in rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-800 shadow-sm">
              ✕ คำขอนี้ไม่ได้รับการอนุมัติ
            </div>
          ) : (
            <div className="animate-pop-in rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
              ⏳ คำขออยู่ระหว่างการพิจารณา กรุณารอผลการอนุมัติ
            </div>
          )}

          <div>
            <h3 className="mb-3 font-semibold">{isApproved ? "วันที่จัด" : "วันที่ที่เสนอ"}</h3>
            <ul className="space-y-2 text-sm">
              {(isApproved && request.selectedSlot ? [request.selectedSlot] : request.slots).map((s, i) => (
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
