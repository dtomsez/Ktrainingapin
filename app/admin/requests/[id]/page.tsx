import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { findOverlaps } from "@/lib/overlap";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  COURSE_TYPE_LABELS,
  pendingStep,
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
  await requireAdmin();
  const { id } = await params;
  const request = await prisma.trainingRequest.findUnique({
    where: { id: Number(id) },
    include: {
      slots: { orderBy: { slotNo: "asc" } },
      selectedSlot: true,
      actions: { include: { approver: true }, orderBy: { step: "asc" } },
    },
  });
  if (!request) notFound();

  const overlaps = await findOverlaps(request.id);
  const step = pendingStep(request.status);
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

          {request.actions.length > 0 && (
            <div className="card animate-fade-up delay-3">
              <h2 className="mb-3 text-lg font-semibold text-sky-700">ประวัติการพิจารณา</h2>
              <ul className="space-y-2 text-sm">
                {request.actions.map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <b>ขั้นที่ {a.step}</b> — {a.approver.name}{" "}
                    <span className={a.decision === "APPROVE" ? "text-green-700" : "text-red-700"}>
                      {a.decision === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ"}
                    </span>{" "}
                    · {new Date(a.decidedAt).toLocaleString("th-TH")}
                    {a.comment && <div className="text-slate-500">&ldquo;{a.comment}&rdquo;</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          {step ? (
            <DecisionForm
              requestId={request.id}
              step={step}
              mustPickSlot={step === 1 && !request.selectedSlotId}
              slotOptions={visibleSlots.map((s) => ({
                id: s.id,
                label: slotLabel(s),
                overlapWarning: overlapText(s.id),
              }))}
            />
          ) : (
            <div className="card animate-fade-up delay-2 text-sm text-slate-500">
              คำขอนี้ถูกพิจารณาเสร็จสิ้นแล้ว
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
