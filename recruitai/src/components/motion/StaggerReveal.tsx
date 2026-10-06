"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

// Re-plays a stagger fade-in for the wrapped element's direct children
// whenever `deps` changes — e.g. a filtered results grid re-animating in
// each time the filter set changes, not just on first mount.
export default function StaggerReveal({
  children,
  className,
  deps = [],
}: {
  children: ReactNode;
  className?: string;
  deps?: unknown[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const items = ref.current.children;
      if (items.length === 0) return;
      gsap.fromTo(
        items,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
      );
    },
    { scope: ref, dependencies: deps }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
