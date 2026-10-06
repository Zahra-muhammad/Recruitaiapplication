"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export default function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      if (prefersReducedMotion()) {
        ref.current.textContent = value.toString();
        return;
      }
      const obj = { val: 0 };
      gsap.to(obj, {
        val: value,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
        onUpdate: () => {
          if (ref.current) ref.current.textContent = Math.round(obj.val).toString();
        },
      });
    },
    { scope: ref, dependencies: [value] }
  );

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
