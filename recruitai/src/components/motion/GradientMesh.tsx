"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const BLOBS = [
  "absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-indigo-400/40 blur-3xl",
  "absolute top-10 -right-10 w-[380px] h-[380px] rounded-full bg-violet-400/40 blur-3xl",
  "absolute bottom-0 left-1/3 w-[440px] h-[440px] rounded-full bg-blue-400/30 blur-3xl",
  "absolute bottom-10 right-1/4 w-[300px] h-[300px] rounded-full bg-fuchsia-300/30 blur-3xl",
];

export default function GradientMesh({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const blobs = ref.current.querySelectorAll(".mesh-blob");
      blobs.forEach((blob, i) => {
        gsap.to(blob, {
          x: () => gsap.utils.random(-60, 60),
          y: () => gsap.utils.random(-40, 40),
          scale: () => gsap.utils.random(0.9, 1.15),
          duration: () => gsap.utils.random(9, 15),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.5,
        });
      });
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {BLOBS.map((cls, i) => (
        <div key={i} className={`mesh-blob ${cls}`} />
      ))}
    </div>
  );
}
