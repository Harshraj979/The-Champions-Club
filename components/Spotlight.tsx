"use client";
import { useRef, type MouseEvent, type ReactNode } from "react";

// Magic UI's Magic Card pattern: a spotlight follows the cursor across
// the card and the surface lights up where it passes. Volt-tinted here,
// sized to their default 200px glow. Purely decorative, so no aria role.
export default function Spotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <div ref={ref} onMouseMove={onMove} className={`spot ${className}`}>
      {children}
    </div>
  );
}
