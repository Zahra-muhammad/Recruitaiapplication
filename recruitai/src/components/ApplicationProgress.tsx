import { APPLICATION_PROGRESS_STEPS, APPLICATION_STATUS_LABELS } from "@/lib/applicationStatus";

// Applicant-facing progress stepper. Status only — never score or verdict.
export default function ApplicationProgress({
  status,
  updatedAt,
}: {
  status: string;
  updatedAt: Date;
}) {
  const closed = status === "NOT_MOVING_FORWARD";
  const currentIndex = APPLICATION_PROGRESS_STEPS.indexOf(
    status as (typeof APPLICATION_PROGRESS_STEPS)[number]
  );

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      {closed ? (
        <p className="text-sm text-zinc-700">
          This application is no longer moving forward. If the team left you a note, it&apos;s in
          the messages below.
        </p>
      ) : (
        <ol className="flex items-center gap-1">
          {APPLICATION_PROGRESS_STEPS.map((step, i) => {
            const done = i <= currentIndex;
            return (
              <li key={step} className="flex-1 min-w-0">
                <div className={`h-1.5 rounded-full ${done ? "bg-blue-600" : "bg-zinc-200"}`} />
                <p
                  className={`mt-1.5 text-[11px] truncate ${
                    i === currentIndex ? "font-semibold text-zinc-900" : done ? "text-zinc-600" : "text-zinc-400"
                  }`}
                >
                  {APPLICATION_STATUS_LABELS[step]}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-zinc-400 mt-3">Last updated {updatedAt.toLocaleDateString()}</p>
    </div>
  );
}
