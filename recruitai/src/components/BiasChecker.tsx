"use client";

import { useRef, useState } from "react";
import { applyBiasSuggestion, checkJobPostingBias, type BiasFlag } from "@/lib/biasCheck";

// Form fields scanned, with the labels shown next to each flag.
const FIELD_LABELS: Record<string, string> = {
  title: "Job title",
  description: "Description",
  keySkills: "Key skills",
  whatTheyOwnFirst: "What they own first",
  stageContext: "Stage context",
};

const CATEGORY_STYLES: Record<string, string> = {
  "Gender-coded": "bg-violet-50 text-violet-700 border-violet-200",
  "Age-coded": "bg-blue-50 text-blue-700 border-blue-200",
  "Unnecessarily narrow": "bg-amber-50 text-amber-700 border-amber-200",
  "Aggressive tone": "bg-red-50 text-red-700 border-red-200",
};

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

// Sits inside the job form. Reads the current field values on demand and
// suggests rewrites — the recruiter applies (or dismisses) each one; the
// text is never changed automatically.
export default function BiasChecker() {
  const ref = useRef<HTMLDivElement>(null);
  const [flags, setFlags] = useState<BiasFlag[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [appliedCount, setAppliedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function fieldElement(name: string): FieldElement | null {
    const form = ref.current?.closest("form");
    const el = form?.elements.namedItem(name);
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null;
  }

  function scan() {
    const values: Record<string, string> = {};
    for (const name of Object.keys(FIELD_LABELS)) values[name] = fieldElement(name)?.value ?? "";
    setFlags(checkJobPostingBias(values));
    setError(null);
  }

  function apply(flag: BiasFlag) {
    const el = fieldElement(flag.field);
    if (!el) return;
    const text = el.value;
    // Use the scanned position if the text there is unchanged; otherwise the
    // first remaining occurrence of the phrase.
    const start = text.slice(flag.start, flag.end) === flag.phrase ? flag.start : text.indexOf(flag.phrase);
    if (start === -1) {
      setError(`"${flag.phrase}" is no longer in ${FIELD_LABELS[flag.field]} — run the check again.`);
      return;
    }
    el.value = applyBiasSuggestion(text, start, flag.phrase, flag.suggestion);
    setAppliedCount((n) => n + 1);
    scan();
  }

  function dismiss(flag: BiasFlag) {
    setDismissed((prev) => new Set(prev).add(flag.id));
  }

  const visible = (flags ?? []).filter((f) => !dismissed.has(f.id));

  return (
    <div ref={ref} className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-zinc-900">Inclusive language check</p>
          <p className="text-xs text-zinc-500">
            Scans the title, description, and requirements. Nothing changes unless you apply a suggestion.
          </p>
        </div>
        <button
          type="button"
          onClick={scan}
          className="text-sm font-medium rounded-md px-3 py-1.5 border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 transition-colors"
        >
          {flags ? "Check again" : "Check for biased language"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      {flags && (
        <div className="mt-3">
          {visible.length === 0 ? (
            <p className="text-sm text-emerald-700">
              ✓ No flagged phrases{appliedCount > 0 ? ` — ${appliedCount} suggestion${appliedCount === 1 ? "" : "s"} applied` : ""}.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500 mb-2">
                {visible.length} phrase{visible.length === 1 ? "" : "s"} to review
                {appliedCount > 0 ? ` · ${appliedCount} applied` : ""}
              </p>
              <ul className="space-y-2">
                {visible.map((f) => (
                  <li key={f.id} className="bg-white border border-zinc-200 rounded-md p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-medium rounded-full border px-2 py-0.5 ${CATEGORY_STYLES[f.category]}`}>
                        {f.category}
                      </span>
                      <span className="text-[11px] text-zinc-400">{FIELD_LABELS[f.field]}</span>
                    </div>
                    <p className="text-sm text-zinc-900 mt-1.5">
                      <span className="line-through decoration-red-400">{f.phrase}</span>
                      {" → "}
                      <span className="font-medium text-emerald-700">{f.suggestion}</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{f.explanation}</p>
                    <p className="text-[11px] text-zinc-400 mt-1 italic">{f.context}</p>
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => apply(f)}
                        className="text-xs font-medium text-indigo-700 hover:underline"
                      >
                        Apply suggestion
                      </button>
                      <button type="button" onClick={() => dismiss(f)} className="text-xs text-zinc-500 hover:underline">
                        Keep as is
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
