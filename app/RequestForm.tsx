"use client";

import { useState } from "react";
import Link from "next/link";
import { calcSlotHours } from "@/lib/hours";

interface SlotForm {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  deductLunch: boolean;
}

const emptySlot = (): SlotForm => ({
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "16:00",
  deductLunch: true,
});

const CONFETTI_COLORS = ["#00a9e0", "#0077c8", "#003f87", "#f59e0b", "#10b981", "#67e8f9"];

export interface FormOptions {
  businessLines: string[];
  districts: string[];
  networkGroups: string[];
  positions: string[];
}

// Dropdown เลือกได้หลายรายการ สำหรับตำแหน่งผู้เข้ารับการประชุม/อบรม
function MultiSelectDropdown({
  options,
  selected,
  onToggle,
  placeholder,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="field-input flex cursor-pointer items-center justify-between text-left"
      >
        <span className={selected.length ? "text-slate-900" : "text-slate-400"}>
          {selected.length ? selected.join(", ") : placeholder}
        </span>
        <span className={`ml-2 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <>
          {/* คลิกนอก dropdown เพื่อปิด */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="animate-pop-in absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-sky-500/10">
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">
                ยังไม่มีตัวเลือก — เพิ่มได้ที่หน้า Data Control
              </div>
            )}
            {options.map((o) => {
              const checked = selected.includes(o);
              return (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                    checked ? "bg-sky-50 font-medium text-sky-700" : "hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-sky-600"
                    checked={checked}
                    onChange={() => onToggle(o)}
                  />
                  {o}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function RequestForm({ options }: { options: FormOptions }) {
  const [form, setForm] = useState({
    employeeId: "",
    requesterName: "",
    businessLine: "",
    department: "",
    networkGroup: "",
    position: "",
    phone: "",
    courseName: "",
    courseType: "ONSITE",
    objective: "",
    participants: "",
    expectedResult: "",
  });
  const [slots, setSlots] = useState<SlotForm[]>([emptySlot()]);
  const [traineePositions, setTraineePositions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ requestNo: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const setSlot = (i: number, patch: Partial<SlotForm>) =>
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const togglePosition = (p: string) =>
    setTraineePositions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (traineePositions.length === 0) {
      setError("กรุณาเลือกตำแหน่งผู้เข้ารับการประชุม/อบรมอย่างน้อย 1 ตำแหน่ง");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, slots, traineePositions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      setSuccess({ requestNo: data.requestNo });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="card animate-pop-in relative mx-auto max-w-xl overflow-hidden text-center">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="confetti"
            style={{
              left: `${4 + i * 5.3}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 6) * 0.12}s`,
              animationDuration: `${1.4 + (i % 4) * 0.3}s`,
            }}
            aria-hidden
          />
        ))}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/40">
          <svg viewBox="0 0 32 32" className="h-10 w-10" fill="none">
            <path d="M8 17l6 6 11-13" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="check-draw" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold">ส่งคำขอเรียบร้อยแล้ว</h1>
        <p className="mt-2 text-slate-600">
          เลขที่คำขอของคุณคือ{" "}
          <span className="gradient-text font-mono text-lg font-bold">{success.requestNo}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          ระบบได้แจ้งผู้อนุมัติท่านที่ 1 ให้พิจารณาแล้ว · จดเลขที่คำขอไว้เพื่อติดตามสถานะ
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href={`/track?no=${success.requestNo}`} className="btn-primary">
            ติดตามสถานะคำขอการจัดประชุม/อบรม
          </Link>
          <button className="btn-secondary" onClick={() => window.location.reload()}>
            ยื่นคำขอใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Hero */}
      <div className="hero-mascot animate-fade-up py-10 text-center">
        <div className="hero-mascot-img" aria-hidden />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            แบบฟอร์ม<span className="gradient-text">การขอจัดประชุม / อบรม</span>
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-lg font-medium text-slate-600">
            สำหรับพนักงานสายงานเครือข่ายธุรกิจขนาดเล็กและรายย่อย
          </p>
        </div>
      </div>

      {error && (
        <div className="animate-pop-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          ⚠️ {error}
        </div>
      )}

      <section className="card card-hover animate-fade-up delay-1">
        <div className="mb-5 flex items-center gap-3">
          <span className="section-badge">1</span>
          <h2 className="text-lg font-semibold">รายละเอียดผู้กรอกข้อมูล</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">รหัสพนักงาน *</label>
            <input required className="field-input" value={form.employeeId} onChange={set("employeeId")} />
          </div>
          <div>
            <label className="field-label">ชื่อ-นามสกุล *</label>
            <input required className="field-input" value={form.requesterName} onChange={set("requesterName")} />
          </div>
          <div>
            <label className="field-label">ตำแหน่ง *</label>
            <input required className="field-input" value={form.position} onChange={set("position")} />
          </div>
          <div>
            <label className="field-label">สังกัดสายงาน *</label>
            <select required className="field-input" value={form.businessLine} onChange={set("businessLine")}>
              <option value="" disabled>
                — เลือกสังกัดสายงาน —
              </option>
              {options.businessLines.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">สำนักงานเขต/ทีมขึ้นตรงสายงานเครือข่ายฯ/สำนักงานใหญ่ *</label>
            <select required className="field-input" value={form.department} onChange={set("department")}>
              <option value="" disabled>
                — กรุณาเลือก —
              </option>
              {options.districts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">กลุ่มเครือข่าย/สำนักงานภาค/ทีมขึ้นตรงสายงานเครือข่ายฯ/สำนักงานใหญ่ *</label>
            <select required className="field-input" value={form.networkGroup} onChange={set("networkGroup")}>
              <option value="" disabled>
                — กรุณาเลือก —
              </option>
              {options.networkGroups.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">เบอร์ติดต่อ *</label>
            <input required className="field-input" value={form.phone} onChange={set("phone")} placeholder="08x-xxx-xxxx" />
          </div>
        </div>
      </section>

      <section className="card card-hover animate-fade-up delay-2">
        <div className="mb-5 flex items-center gap-3">
          <span className="section-badge">2</span>
          <h2 className="text-lg font-semibold">รายละเอียดการขอจัดประชุม/อบรม</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">ชื่อหลักสูตรที่ขอจัดประชุม/อบรม *</label>
            <input required className="field-input" value={form.courseName} onChange={set("courseName")} placeholder="เช่น Excel ขั้นสูงสำหรับการวิเคราะห์ข้อมูล" />
          </div>
          <div>
            <label className="field-label">รูปแบบการขอจัดประชุม / อบรม *</label>
            <div className="flex gap-3">
              {(
                [
                  { value: "ONSITE", label: "🏢 Onsite", desc: "ในสถานที่" },
                  { value: "ONLINE", label: "💻 Online", desc: "ออนไลน์" },
                ] as const
              ).map((t) => (
                <label
                  key={t.value}
                  className={`flex-1 cursor-pointer rounded-xl border-2 px-4 py-2.5 text-center transition-all duration-200 active:scale-95 ${
                    form.courseType === t.value
                      ? "border-sky-500 bg-gradient-to-br from-sky-50 to-blue-50 font-semibold text-sky-700 shadow-md shadow-sky-500/20"
                      : "border-slate-200 text-slate-500 hover:border-sky-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="courseType"
                    value={t.value}
                    className="sr-only"
                    checked={form.courseType === t.value}
                    onChange={() => setForm({ ...form, courseType: t.value })}
                  />
                  <span className="block">{t.label}</span>
                  <span className="block text-xs font-normal opacity-70">{t.desc}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">วัตถุประสงค์ในการขอจัดประชุม/อบรม *</label>
            <textarea required rows={3} className="field-input" value={form.objective} onChange={set("objective")} placeholder="อธิบายเหตุผลและวัตถุประสงค์ของการประชุม/อบรม" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">ผลที่คาดว่าจะได้รับ *</label>
            <textarea required rows={3} className="field-input" value={form.expectedResult} onChange={set("expectedResult")} placeholder="เช่น พนักงานสามารถใช้ Excel วิเคราะห์ข้อมูลยอดขายได้ด้วยตนเอง" />
          </div>
        </div>
      </section>

      <section className="card card-hover animate-fade-up delay-3">
        <div className="mb-1 flex items-center gap-3">
          <span className="section-badge">3</span>
          <h2 className="text-lg font-semibold">วันที่ขอจัดประชุม/อบรม</h2>
        </div>
        <p className="mb-5 ml-12 text-sm text-slate-500">
          กรุณาระบุวันที่สำรองกรณี Slot เต็ม (เสนอได้สูงสุด 2 ทางเลือก) · ระบบคำนวณจำนวนชั่วโมงให้อัตโนมัติ
        </p>
        <div className="space-y-4">
          {slots.map((slot, i) => {
            const calc = calcSlotHours(slot);
            return (
              <div key={i} className="animate-pop-in rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50/40 p-4 transition-shadow duration-300 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      {i + 1}
                    </span>
                    {i === 0 ? "วันที่หลัก" : "วันที่สำรอง"}
                  </span>
                  {i > 0 && (
                    <button type="button" className="cursor-pointer text-sm text-red-500 transition-colors hover:text-red-700 hover:underline" onClick={() => setSlots(slots.filter((_, idx) => idx !== i))}>
                      ✕ ลบทางเลือกนี้
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="field-label">วันที่เริ่มต้น *</label>
                    <input required type="date" className="field-input" value={slot.startDate} onChange={(e) => setSlot(i, { startDate: e.target.value, endDate: slot.endDate || e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">วันที่สิ้นสุด *</label>
                    <input required type="date" min={slot.startDate} className="field-input" value={slot.endDate} onChange={(e) => setSlot(i, { endDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">เวลาเริ่ม *</label>
                    <input required type="time" className="field-input" value={slot.startTime} onChange={(e) => setSlot(i, { startTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">เวลาเลิก *</label>
                    <input required type="time" className="field-input" value={slot.endTime} onChange={(e) => setSlot(i, { endTime: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" className="accent-sky-600" checked={slot.deductLunch} onChange={(e) => setSlot(i, { deductLunch: e.target.checked })} />
                    หักพักเที่ยง 1 ชั่วโมง
                  </label>
                  <div className="text-sm">
                    {calc ? (
                      <span key={calc.totalHours} className="animate-pop-in inline-block rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-3.5 py-1.5 font-semibold text-white shadow-md shadow-sky-500/30">
                        ⏱️ {calc.days} วัน × {calc.hoursPerDay} ชม./วัน = รวม {calc.totalHours} ชั่วโมง
                      </span>
                    ) : (
                      <span className="text-slate-400">กรอกวันที่และเวลาเพื่อคำนวณชั่วโมง</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {slots.length < 2 && (
          <button type="button" className="btn-secondary mt-4" onClick={() => setSlots([...slots, emptySlot()])}>
            + เพิ่มวันที่สำรอง ({slots.length}/2)
          </button>
        )}
      </section>

      <section className="card card-hover animate-fade-up delay-4">
        <div className="mb-5 flex items-center gap-3">
          <span className="section-badge">4</span>
          <h2 className="text-lg font-semibold">รายละเอียดผู้เข้ารับการประชุม/อบรม</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">
              ตำแหน่งผู้เข้ารับการประชุม/อบรม * <span className="font-normal text-slate-400">(เลือกได้หลายตำแหน่ง)</span>
            </label>
            <MultiSelectDropdown
              options={options.positions}
              selected={traineePositions}
              onToggle={togglePosition}
              placeholder="— เลือกตำแหน่ง —"
            />
            {traineePositions.length > 0 && (
              <p className="animate-pop-in mt-2 text-xs text-sky-600">
                เลือกแล้ว {traineePositions.length} ตำแหน่ง
              </p>
            )}
          </div>
          <div>
            <label className="field-label">จำนวนผู้เข้าประชุม/อบรม (คน) *</label>
            <input required type="number" min={1} className="field-input" value={form.participants} onChange={set("participants")} />
          </div>
        </div>
      </section>

      <div className="animate-fade-up delay-5 flex justify-end pb-4">
        <button type="submit" disabled={submitting} className="btn-primary px-8 py-3 text-base">
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              กำลังส่งคำขอ...
            </>
          ) : (
            <>🚀 ส่งคำขอจัดประชุม/อบรม</>
          )}
        </button>
      </div>
    </form>
  );
}
