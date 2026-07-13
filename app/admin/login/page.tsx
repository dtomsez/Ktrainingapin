"use client";

import { useActionState } from "react";
import { loginAdmin } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, undefined);

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card animate-pop-in relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-blue-900" />
        <div className="mb-6 text-center">
          <div className="mascot-badge mx-auto mb-3 h-16 w-16 rounded-2xl shadow-lg shadow-sky-500/40 ring-2 ring-white transition-transform duration-300 hover:rotate-6 hover:scale-105" aria-hidden />
          <h1 className="text-xl font-bold">สำหรับผู้อนุมัติ</h1>
          <p className="mt-1 text-sm text-slate-500">กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน</p>
        </div>
        {state?.error && (
          <div className="animate-pop-in mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {state.error}
          </div>
        )}
        <form action={formAction} className="space-y-4">
          <div>
            <label className="field-label">รหัสผ่าน</label>
            <input name="password" type="password" required autoFocus className="field-input" placeholder="••••••••" />
          </div>
          <button disabled={pending} className="btn-primary w-full">
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                กำลังตรวจสอบ...
              </>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
