"use client";

import { useEffect, useRef, useState } from "react";

// ตัวเลขวิ่งจาก 0 ไปยังค่าจริงตอนโหลดหน้า
export default function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(value * eased * 100) / 100);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return (
    <span>
      {Number.isInteger(value) ? Math.round(display) : display}
      {suffix}
    </span>
  );
}
