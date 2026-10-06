"use client";

import { useState, useTransition, useRef, type FormEvent } from "react";

export interface MessageItem {
  id: string;
  sender: "RECRUITER" | "APPLICANT";
  senderName: string;
  body: string;
  createdAt: string;
}

export default function MessageThread({
  messages,
  sendAction,
  selfSender,
  accent = "indigo",
  suggestions = [],
  subtitle,
}: {
  messages: MessageItem[];
  sendAction: (formData: FormData) => Promise<void>;
  selfSender: "RECRUITER" | "APPLICANT";
  accent?: "indigo" | "blue";
  // One-click starters that fill the input (recruiter side).
  suggestions?: string[];
  subtitle?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const accentClass = accent === "indigo" ? "bg-indigo-600" : "bg-blue-600";
  const ringClass = accent === "indigo" ? "focus:ring-indigo-500/20 focus:border-indigo-400" : "focus:ring-blue-500/20 focus:border-blue-400";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const body = formData.get("body");
    if (!body || !String(body).trim()) {
      setError("Type a message first.");
      return;
    }

    startTransition(async () => {
      try {
        await sendAction(formData);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100">
        <h3 className="text-sm font-semibold text-zinc-900">Messages</h3>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const isSelf = m.sender === selfSender;
            return (
              <div key={m.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isSelf ? `${accentClass} text-white` : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${isSelf ? "text-white/70" : "text-zinc-400"}`}>
                    {m.senderName} · {m.createdAt}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="border-t border-zinc-100 px-3 pt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = s;
                  inputRef.current.focus();
                }
              }}
              className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1 hover:border-zinc-400 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form ref={formRef} onSubmit={handleSubmit} className="border-t border-zinc-100 p-3 flex gap-2">
        <input
          ref={inputRef}
          name="body"
          maxLength={5000}
          placeholder="Type a message…"
          disabled={pending}
          className={`flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ringClass}`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`${accentClass} text-white text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50`}
        >
          {pending ? "…" : "Send"}
        </button>
      </form>
      {error && <p className="px-4 pb-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
