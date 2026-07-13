"use client";

import { useActionState, useState } from "react";
import { decide } from "../../actions";

interface SlotOption {
  id: number;
  label: string;
  overlapWarning: string | null;
}

export default function DecisionForm({
  requestId,
  step,
  mustPickSlot,
  slotOptions,
}: {
  requestId: number;
  step: number;
  mustPickSlot: boolean;
  slotOptions: SlotOption[];
}) {
  const [state, formAction, pending] = useActionState(decide, undefined);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");

  return (
    <form action={formAction} className="card animate-fade-up delay-2 sticky top-20 space-y-4">
      <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-blue-800" />
      <h2 className="pt-1 text-lg font-semibold text-sky-700">การพิจารณา (ผู้อนุมัติท่านที่ {step})</h2>
      <input type="hidden" name="requestId" value={requestId} />

      {state?.error && (
        <div className="animate-pop-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠️ {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <label
          className={`flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-center font-semibold transition-all duration-200 active:scale-95 ${
            decision === "APPROVE"
              ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 text-green-700 shadow-md shadow-green-500/20"
              : "border-slate-200 text-slate-400 hover:border-green-300 hover:text-green-600"
          }`}
        >
          <input type="radio" name="decision" value="APPROVE" className="sr-only" checked={decision === "APPROVE"} onChange={() => setDecision("APPROVE")} />
          ✓ อนุมัติ
        </label>
        <label
          className={`flex-1 cursor-pointer rounded-xl border-2 px-4 py-3 text-center font-semibold transition-all duration-200 active:scale-95 ${
            decision === "REJECT"
              ? "border-red-500 bg-gradient-to-br from-red-50 to-rose-100 text-red-700 shadow-md shadow-red-500/20"
              : "border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-600"
          }`}
        >
          <input type="radio" name="decision" value="REJECT" className="sr-only" checked={decision === "REJECT"} onChange={() => setDecision("REJECT")} />
          ✕ ปฏิเสธ
        </label>
      </div>

      {decision === "APPROVE" && mustPickSlot && (
        <div className="animate-fade-up">
          <div className="field-label">เลือกวันที่ที่จะใช้จัดอบรม (ในฐานะผู้อนุมัติท่านที่ 1) *</div>
          <div className="space-y-2">
            {slotOptions.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-md has-checked:border-sky-500 has-checked:bg-sky-50 has-checked:shadow-md has-checked:shadow-sky-500/20"
              >
                <input type="radio" name="slotId" value={s.id} required className="mt-1 accent-sky-600" />
                <span>
                  {s.label}
                  {s.overlapWarning && (
                    <span className="mt-1 block rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      <span className="mr-1 inline-block animate-wiggle">⚠️</span>
                      {s.overlapWarning}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="field-label">
          {decision === "REJECT" ? "เหตุผลในการปฏิเสธ *" : "ความเห็นเพิ่มเติม (ถ้ามี)"}
        </label>
        <textarea
          name="comment"
          rows={3}
          required={decision === "REJECT"}
          className="field-input"
          placeholder={decision === "REJECT" ? "เช่น งบประมาณเกินกำหนด / วันที่ทับซ้อนกับกิจกรรมอื่น" : ""}
        />
      </div>

      <button disabled={pending} className={`btn-primary w-full ${decision === "APPROVE" ? "btn-success" : "btn-danger"}`}>
        {pending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            กำลังบันทึก...
          </>
        ) : decision === "APPROVE" ? (
          "✓ ยืนยันการอนุมัติ"
        ) : (
          "✕ ยืนยันการปฏิเสธ"
        )}
      </button>
    </form>
  );
}
