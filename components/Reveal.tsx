"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { ReactNode } from "react";

// A section rises and fades in when it scrolls into view (the whileInView
// pattern the component libraries build on). The timer is a safety net:
// if the scroll trigger never fires (screenshot tools, odd embeds), the
// content still appears. Motion is a bonus, never a gate on content.
export default function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFallback(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const show = inView || fallback;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={show ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
