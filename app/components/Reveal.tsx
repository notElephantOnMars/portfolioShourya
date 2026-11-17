"use client";

import { useEffect, useRef } from "react";

// A section that fades and slides up the first time it scrolls into view (the .reveal / .in styles in globals.css).
export function Reveal({ className, id, children }: { className: string; id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className={`${className} reveal`} id={id}>
      {children}
    </section>
  );
}
