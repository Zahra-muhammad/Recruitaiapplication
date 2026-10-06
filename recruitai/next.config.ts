import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) resolves its worker file relative to its own
  // package directory at runtime. If Turbopack/webpack bundles it, that
  // relative path breaks ("Cannot find module .../pdf.worker.mjs"). Keeping
  // it external makes Node load it normally from node_modules instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      // Applications post the CV through a Server Action (default cap 1MB).
      // 4MB stays under Vercel's 4.5MB request limit; the apply form checks
      // the same limit client-side (MAX_CV_BYTES in ApplyGate).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
