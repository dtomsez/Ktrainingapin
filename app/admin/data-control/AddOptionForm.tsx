"use client";

import { useActionState, useEffect, useRef } from "react";
import { addOption } from "./actions";

export default function AddOptionForm({ category, placeholder }: { category: string; placeholder: string }) {
  const [state, formAction, pending] = useActionState(addOption, undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // ล้างช่องกรอกเมื่อเพิ่มสำเร็จ
  useEffect(() => {
    if (state && !state.error && inputRef.current) inputRef.current.value = "";
  }, [state]);

  return (
    <div>
      <form action={formAction} className="flex gap-3">
        <input type="hidden" name="category" value={category} />
        <input ref={inputRef} name="name" required className="field-input" placeholder={placeholder} />
        <button disabled={pending} className="btn-primary shrink-0">
          {pending ? "กำลังเพิ่ม..." : "+ เพิ่ม"}
        </button>
      </form>
      {state?.error && state.category === category && (
        <p className="animate-pop-in mt-2 text-sm text-red-600">⚠️ {state.error}</p>
      )}
    </div>
  );
}
