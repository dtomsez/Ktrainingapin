import { getOptions, loadAllRequests } from "@/lib/db";
import { requireLevel1 } from "@/lib/adminAuth";
import { approverByStep } from "@/lib/approvers";
import { logEvent } from "@/lib/log";
import { parsePositions, OPTION_CATEGORIES } from "@/lib/labels";
import AdminNav from "../AdminNav";
import AddOptionForm from "./AddOptionForm";
import { deleteOption } from "./actions";

export const dynamic = "force-dynamic";

export default async function DataControlPage() {
  const level = await requireLevel1();
  await logEvent("VIEW_DATACONTROL", { actor: approverByStep(level)?.name });
  const items = await getOptions();
  const requests = await loadAllRequests();

  // นับการใช้งานของแต่ละตัวเลือก เพื่อบอกผลกระทบก่อนลบ
  const usage = new Map<string, number>(); // key = category|name
  const bump = (category: string, name: string) => {
    if (!name) return;
    const key = `${category}|${name}`;
    usage.set(key, (usage.get(key) ?? 0) + 1);
  };
  for (const r of requests) {
    bump("BUSINESS_LINE", r.businessLine);
    bump("DISTRICT", r.department);
    bump("NETWORK_GROUP", r.networkGroup);
    for (const p of parsePositions(r.traineePositions)) bump("POSITION", p);
  }

  return (
    <div>
      <AdminNav active="data" />

      <div className="animate-fade-up delay-1 mb-6">
        <h1 className="text-2xl font-bold">
          ⚙️ <span className="gradient-text">Data Control</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          จัดการตัวเลือก dropdown ทั้งหมดที่แสดงในแบบฟอร์มขอจัดประชุม/อบรม
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {OPTION_CATEGORIES.map((cat, ci) => {
          const list = items.filter((i) => i.category === cat.key);
          return (
            <div key={cat.key} className="card card-hover animate-fade-up" style={{ animationDelay: `${0.1 + ci * 0.08}s` }}>
              <h2 className="mb-1 text-lg font-semibold text-sky-700">
                {cat.icon} {cat.label}
              </h2>
              <p className="mb-4 text-xs text-slate-400">{list.length} ตัวเลือก</p>
              <div className="mb-4">
                <AddOptionForm category={cat.key} placeholder="เพิ่มตัวเลือกใหม่..." />
              </div>
              {list.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีตัวเลือก</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((o, i) => {
                    const used = usage.get(`${cat.key}|${o.name}`) ?? 0;
                    return (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-700">
                            {i + 1}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{o.name}</div>
                            <div className="text-xs text-slate-400">
                              {used > 0 ? `ถูกใช้ใน ${used} คำขอ` : "ยังไม่ถูกใช้"}
                            </div>
                          </div>
                        </div>
                        <form action={deleteOption}>
                          <input type="hidden" name="id" value={o.id} />
                          <button className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 hover:shadow-sm active:scale-95">
                            🗑️ ลบ
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
