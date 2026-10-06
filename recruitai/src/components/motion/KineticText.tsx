"use client";

import { useRef, createElement } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export default function KineticText({
  text,
  className,
  as = "h1",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "p";
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.fromTo(
        ref.current.querySelectorAll(".kinetic-word"),
        { opacity: 0, y: 28, rotateX: -35 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.9,
          delay,
          stagger: 0.06,
          ease: "power4.out",
        }
      );
    },
    { scope: ref }
  );

  return createElement(
    as,
    { ref, className, style: { perspective: 600 } },
    words.map((w, i) =>
      createElement(
        "span",
        {
          key: i,
          className: "kinetic-word inline-block will-change-transform",
          style: { marginRight: "0.28em" },
        },
        w
      )
    )
  );
}
