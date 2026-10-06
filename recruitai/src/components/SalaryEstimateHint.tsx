"use client";

import { useEffect, useRef, useState } from "react";
import { estimateSalary, type SalaryEstimate } from "@/lib/salaryEstimate";
import { formatSalaryRange } from "@/lib/salary";

// Sits under the salary fields on the job form and follows what the
// recruiter types in title / seniority / location / currency. A hint only —
// it never fills the salary fields in.
export default function SalaryEstimateHint() {
  const ref = useRef<HTMLDivElement>(null);
  const [estimate, setEstimate] = useState<SalaryEstimate | null>(null);
  const [hasTitle, setHasTitle] = useState(false);
  const [entered, setEntered] = useState<{ min: number; max: number } | null>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const value = (name: string) => {
      const el = form.elements.namedItem(name);
      return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
        ? el.value
        : "";
    };
    const update = () => {
      const title = value("title").trim();
      setHasTitle(title.length > 0);
      setEstimate(
        title
          ? estimateSalary({ title, seniority: value("seniority"), location: value("location"), currency: value("salaryCurrency") })
          : null
      );
      const min = Number(value("salaryMin"));
      const max = Number(value("salaryMax"));
      setEntered(min > 0 && max > 0 ? { min, max } : null);
    };
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);

  // An entered range far below the estimate is most often a monthly figure.
  const looksMonthly = !!(estimate && entered && entered.max < estimate.min * 0.35);

  return (
    <div ref={ref} className="mt-2 text-xs" aria-live="polite">
      {estimate ? (
        <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-md px-3 py-2">
          <p className="text-zinc-700">
            <span className="font-medium">Estimated range:</span>{" "}
            {formatSalaryRange(estimate.min, estimate.max, estimate.currency)}
          </p>
          <p className="text-zinc-500 mt-0.5">Based on: {estimate.basis.join(" · ")}</p>
          <p className="text-amber-700 mt-1">
            Estimated — verify against current market data. These are rough built-in figures, not a live market feed.
          </p>
          {looksMonthly && (
            <p className="text-red-700 mt-1">
              The range you entered is far below this estimate. Is it a monthly figure? Salaries here are annual.
            </p>
          )}
        </div>
      ) : (
        hasTitle && (
          <p className="text-zinc-400">
            No estimate for this title — try a more standard role name (e.g. &quot;Marketing Manager&quot;).
          </p>
        )
      )}
    </div>
  );
}
