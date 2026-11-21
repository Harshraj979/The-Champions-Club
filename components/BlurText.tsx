"use client";
import { motion } from "framer-motion";

// React Bits' BlurText pattern: the headline arrives word by word, each
// word un-blurring and settling up into place. The full sentence stays
// available to screen readers; the animated words are decorative copies.
export default function BlurText({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span aria-label={text} role="text">
      <span aria-hidden="true">
        {words.map((w, i) => (
          <motion.span
            key={i}
            style={{ display: "inline-block" }}
            initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.12 + i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
