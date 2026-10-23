"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades a section up into place the first time it scrolls into view.
 * Renders fully visible immediately for prefers-reduced-motion, and if
 * JavaScript hasn't run yet (first paint), so content is never hidden from a
 * user or a crawler without script support.
 */
export default function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !ref.current) return;

    setVisible(false);
    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(16px)",
        transition: `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
