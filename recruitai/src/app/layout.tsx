import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SETTINGS_BOOT_SCRIPT } from "@/lib/siteSettings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RecruitAI",
  description: "Rank job candidates without reading every CV.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies saved theme / text size / motion before first paint, so
            there's no flash of the wrong theme (see src/lib/siteSettings.ts). */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
      </head>
      <body
        className="min-h-full flex flex-col bg-zinc-50 text-zinc-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
