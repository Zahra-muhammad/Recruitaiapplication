"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export default function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      rotateY: x * 8,
      rotateX: -y * 8,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 800,
    });
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}
