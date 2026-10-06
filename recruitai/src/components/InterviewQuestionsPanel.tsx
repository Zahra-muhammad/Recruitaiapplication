"use client";

import { useState, useTransition } from "react";

export interface InterviewQuestionItem {
  question: string;
  reason: string;
}

// Generated interview questions as an editable list. Generating saves them;
// edits are saved explicitly so nothing changes behind the recruiter's back.
export default function InterviewQuestionsPanel({
  initialQuestions,
  generateAction,
  saveAction,
}: {
  initialQuestions: InterviewQuestionItem[] | null;
  generateAction: () => Promise<InterviewQuestionItem[]>;
  saveAction: (questions: InterviewQuestionItem[]) => Promise<void>;
}) {
  const [items, setItems] = useState<InterviewQuestionItem[] | null>(initialQuestions);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<void>) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await task();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function generate() {
    if (dirty && !window.confirm("Replace your edited questions with a fresh set?")) return;
    run(async () => {
      setItems(await generateAction());
      setDirty(false);
    });
  }

  function update(index: number, question: string) {
    setItems((prev) => (prev ?? []).map((q, i) => (i === index ? { ...q, question } : q)));
    setDirty(true);
  }

  function remove(index: number) {
    setItems((prev) => (prev ?? []).filter((_, i) => i !== index));
    setDirty(true);
  }

  function add() {
    setItems((prev) => [...(prev ?? []), { question: "", reason: "Added by recruiter" }]);
    setDirty(true);
  }

  function save() {
    run(async () => {
      await saveAction(items ?? []);
      setDirty(false);
      setNotice("Saved.");
    });
  }

  async function copyAll() {
    const text = (items ?? []).map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setError("Couldn't copy — select the text manually instead.");
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Interview questions</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Aimed at this candidate&apos;s specific gaps and concerns. Edit freely before the interview.
          </p>
        </div>
        {items && (
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="text-xs font-medium text-indigo-700 hover:underline disabled:opacity-50"
          >
            Regenerate
          </button>
        )}
      </div>

      {!items ? (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="mt-4 bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate interview questions"}
        </button>
      ) : (
        <>
          <ol className="mt-4 space-y-3">
            {items.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-sm text-zinc-400 tabular-nums pt-2 w-5 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={q.question}
                    onChange={(e) => update(i, e.target.value)}
                    rows={2}
                    maxLength={1000}
                    aria-label={`Interview question ${i + 1}`}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                  {q.reason && <p className="text-[11px] text-zinc-400 mt-0.5">Probes: {q.reason}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove question ${i + 1}`}
                  className="text-zinc-400 hover:text-red-600 text-sm pt-2 shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <button type="button" onClick={add} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
              + Add question
            </button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={copyAll} className="text-xs font-medium text-zinc-600 hover:text-zinc-900">
                Copy all
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || !dirty}
                className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
            </div>
          </div>
        </>
      )}

      {(notice || error) && (
        <p className={`text-xs mt-2 ${error ? "text-red-600" : "text-emerald-700"}`}>{error ?? notice}</p>
      )}
    </div>
  );
}
