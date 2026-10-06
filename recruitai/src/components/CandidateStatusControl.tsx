"use client";

import { useState, useTransition } from "react";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_ORDER,
  APPLICATION_STATUS_STYLES,
} from "@/lib/applicationStatus";

export default function CandidateStatusControl({
  currentStatus,
  isApplicant,
  hasEmail,
  rejectionDraft,
  setStatusAction,
}: {
  currentStatus: string;
  // Only people who applied themselves get status updates/messages.
  isApplicant: boolean;
  hasEmail: boolean;
  rejectionDraft: string;
  setStatusAction: (formData: FormData) => Promise<void>;
}) {
  const [composingRejection, setComposingRejection] = useState(false);
  const [message, setMessage] = useState(rejectionDraft);
  const [sendMessage, setSendMessage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(status: string, note?: string) {
    setError(null);
    const formData = new FormData();
    formData.set("status", status);
    if (note) formData.set("message", note);
    startTransition(async () => {
      try {
        await setStatusAction(formData);
        setComposingRejection(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleClick(status: string) {
    if (status === currentStatus || pending) return;
    if (status === "NOT_MOVING_FORWARD" && isApplicant) {
      setComposingRejection(true);
      return;
    }
    submit(status);
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-zinc-900">Status</h2>
        <p className="text-xs text-zinc-400">
          {isApplicant
            ? "Shown to the applicant — never the score or verdict."
            : "Internal only — this candidate was uploaded, not applied."}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {APPLICATION_STATUS_ORDER.map((s) => {
          const active = s === currentStatus;
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleClick(s)}
              disabled={pending}
              aria-pressed={active}
              className={`text-xs font-medium rounded-full border px-3 py-1.5 transition-colors disabled:opacity-60 ${
                active
                  ? `${APPLICATION_STATUS_STYLES[s]} ring-2 ring-offset-1 ring-zinc-300`
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {APPLICATION_STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {composingRejection && (
        <div className="border-t border-zinc-100 pt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={sendMessage}
              onChange={(e) => setSendMessage(e.target.checked)}
              className="accent-indigo-600"
            />
            Send the applicant this note{hasEmail ? " (by email and on their status page)" : " (on their status page)"}
          </label>
          {sendMessage && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setComposingRejection(false)}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || (sendMessage && !message.trim())}
              onClick={() => submit("NOT_MOVING_FORWARD", sendMessage ? message : undefined)}
              className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {pending ? "Saving…" : sendMessage ? "Send & mark not moving forward" : "Mark not moving forward"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
