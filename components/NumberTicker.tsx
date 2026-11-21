"use client";
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { inr } from "@/lib/format";

// Magic UI's NumberTicker pattern: when the figure scrolls into view it
// counts up from zero with a spring and lands on the real value, formatted
// as rupees. Until it starts, it shows the value itself, so the number is
// never wrong on screen.
export default function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1400, bounce: 0 });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = inr(Math.round(v));
    });
    return unsub;
  }, [spring]);

  return <span ref={ref}>{inr(value)}</span>;
}
