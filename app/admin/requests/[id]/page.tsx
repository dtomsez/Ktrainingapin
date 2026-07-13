import { notFound } from "next/navigation";
import { getRequestById } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";
import { findOverlaps } from "@/lib/overlap";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  COURSE_TYPE_LABELS,
  parsePositions,
  formatDateRange,
} from "@/lib/labels";
import AdminNav from "../../AdminNav";
import DecisionForm from "./DecisionForm";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const myLevel = await requireAdmin();
  const { id } = await params;
  const request = await getRequestById(Number(id));
  if (!request) notFound();
  await logEvent("VIEW_REQUEST", { actor: approverByStep(myLevel)?.name, requestNo: request.requestNo });

  const overlaps = await findOverlaps(request.id);
  const traineePositions = parsePositions(request.traineePositions);

  const slotLabel = (s: (typeof request.slots)[number]) =>
    `ทางเลือกที่ ${s.slotNo}: ${formatDateRange(s.startDate, s.endDate)} เวลา ${s.startTime}–${s.endTime} น. · รวม ${s.totalHours} ชม.`;

  const overlapText = (slotId: number) => {
    const hits = overlaps.get(slotId);
    if (!hits?.length) return null;
    return `ทับซ้อนกับ ${hits
      .map((h) => `${h.requestNo} ${h.courseName} (${STATUS_LABELS[h.status]})`)
      .join(", ")}`;
  };

  const visibleSlots = request.selectedSlotId
    ? request.slots.filter((s) => s.id === request.selectedSlotId)
    : request.slots;

  // คำตัดสินของแต่ละระดับ (ปัจจุบัน)
  const decisionOf = (step: number) => request.actions.find((a) => a.step === step) ?? null;
  const myDecision = (decisionOf(myLevel)?.decision as "APPROVE" | "REJECT" | undefined) ?? null;
  const isMyTurn = request.status === `PENDING_${myLevel}`;
  const canAct = isMyTurn || myDecision !== null;

  const slotOptions = request.slots.map((s) => ({
    id: s.id,
    label: slotLabel(s),
    overlapWarning: overlapText(s.id),
  }));

  return (
    <div>
      <AdminNav active="queue" />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="card animate-fade-up delay-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-mono text-xs text-slate-500">{request.requestNo}</div>
                <h1 className="text-2xl font-bold">{request.courseName}</h1>
                <div className="text-sm text-slate-500">{COURSE_TYPE_LABELS[request.courseType]}</div>
              </div>
              <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_COLORS[request.status]}`}>
                {STATUS_LABELS[request.status]}
              </span>
            </div>

            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">ผู้กรอกข้อมูล</dt>
                <dd>
                  {request.requesterName}
                  {request.employeeId && <span className="text-slate-400"> · รหัส {request.employeeId}</span>}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">ตำแหน่ง / เบอร์ติดต่อ</dt>
                <dd>
                  {request.position} · {request.phone}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">สังกัดสายงาน</dt>
                <dd>{request.businessLine || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">สำนักงานเขต/ทีมขึ้นตรงสายงานเครือข่ายฯ/สำนักงานใหญ่</dt>
                <dd>{request.department}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">กลุ่มเครือข่าย/สำนักงานภาค/ทีมขึ้นตรงสายงานเครือข่ายฯ/สำนักงานใหญ่</dt>
                <dd>{request.networkGroup || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">จำนวนผู้เข้าประชุม/อบรม</dt>
                <dd>{request.participants} คน</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-1 font-medium text-slate-500">ตำแหน่งผู้เข้ารับการประชุม/อบรม</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {traineePositions.length > 0 ? (
                    traineePositions.map((p) => (
                      <span key={p} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-500">วัตถุประสงค์ในการขอจัดประชุม/อบรม</dt>
                <dd className="whitespace-pre-wrap">{request.objective}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-500">ผลที่คาดว่าจะได้รับ</dt>
                <dd className="whitespace-pre-wrap">{request.expectedResult}</dd>
              </div>
            </dl>
          </div>

          <div className="card animate-fade-up delay-2">
            <h2 className="mb-3 text-lg font-semibold text-sky-700">
              {request.selectedSlotId ? "วันที่ที่ถูกเลือก" : "วันที่ที่เสนอ"}
            </h2>
            <ul className="space-y-2 text-sm">
              {visibleSlots.map((s) => {
                const warning = overlapText(s.id);
                return (
                  <li
                    key={s.id}
                    className={`rounded-xl border px-3 py-2.5 transition-all duration-200 hover:translate-x-1 ${warning ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="font-medium">{slotLabel(s)}</div>
                    {warning && (
                      <div className="mt-1 text-xs font-medium text-amber-800">
                        <span className="mr-1 inline-block animate-wiggle">⚠️</span>
                        {warning}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* คำตัดสินปัจจุบันของผู้อนุมัติทั้ง 3 ระดับ */}
          <div className="card animate-fade-up delay-3">
            <h2 className="mb-3 text-lg font-semibold text-sky-700">สถานะการพิจารณาแต่ละระดับ</h2>
            <ul className="space-y-2 text-sm">
              {[1, 2, 3].map((step) => {
                const a = decisionOf(step);
                const name = approverByStep(step)?.name ?? `ระดับ ${step}`;
                const waiting = request.status === `PENDING_${step}`;
                return (
                  <li key={step} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div>
                      <div className="font-medium">{name}</div>
                      {a?.comment && <div className="text-xs text-slate-500">&ldquo;{a.comment}&rdquo;</div>}
                      {a && (
                        <div className="text-xs text-slate-400">{new Date(a.decidedAt).toLocaleString("th-TH")}</div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a?.decision === "APPROVE"
                          ? "bg-green-100 text-green-700"
                          : a?.decision === "REJECT"
                            ? "bg-red-100 text-red-700"
                            : waiting
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {a?.decision === "APPROVE" ? "อนุมัติ" : a?.decision === "REJECT" ? "ปฏิเสธ" : waiting ? "กำลังพิจารณา" : "รอคิว"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div>
          <DecisionForm
            requestId={request.id}
            myLevel={myLevel}
            myName={approverByStep(myLevel)?.name ?? `ระดับ ${myLevel}`}
            currentDecision={myDecision}
            canAct={canAct}
            needSlot={myLevel === 1}
            slotOptions={slotOptions}
          />
        </div>
      </div>
    </div>
  );
}
