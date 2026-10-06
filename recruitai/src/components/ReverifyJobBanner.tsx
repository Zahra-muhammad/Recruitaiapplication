import { AUTO_CLOSE_AFTER_DAYS, daysSince } from "@/lib/jobVerification";

// "Still hiring for this role?" nudge for postings not re-confirmed in 14+
// days. One click confirms; ignoring it auto-closes the posting at 30 days.
export default function ReverifyJobBanner({
  jobTitle,
  lastVerifiedActive,
  confirmAction,
  showTitle = false,
}: {
  jobTitle: string;
  lastVerifiedActive: Date;
  confirmAction: () => Promise<void>;
  showTitle?: boolean;
}) {
  const days = daysSince(lastVerifiedActive);
  const daysLeft = Math.max(0, AUTO_CLOSE_AFTER_DAYS - days);

  return (
    <form
      action={confirmAction}
      className="flex items-center justify-between gap-3 flex-wrap bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
    >
      <p className="text-sm text-amber-900">
        Still hiring{showTitle ? <> for <span className="font-medium">{jobTitle}</span></> : " for this role"}?{" "}
        <span className="text-amber-800/80">
          Last confirmed {days} days ago — it closes automatically in {daysLeft} day{daysLeft === 1 ? "" : "s"}.
        </span>
      </p>
      <button
        type="submit"
        className="shrink-0 text-sm font-medium bg-amber-600 text-white rounded-md px-3 py-1.5 hover:bg-amber-700 transition-colors"
      >
        Confirm it&apos;s still open
      </button>
    </form>
  );
}
