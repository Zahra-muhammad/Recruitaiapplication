"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// True if the OS asks for reduced motion, or the visitor chose "Reduced" in
// the site's Settings menu (see src/lib/siteSettings.ts).
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export { gsap, ScrollTrigger };
