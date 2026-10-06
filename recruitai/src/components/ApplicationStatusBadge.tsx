import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_STYLES } from "@/lib/applicationStatus";

export default function ApplicationStatusBadge({ status }: { status: string }) {
  const style = APPLICATION_STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${style}`}
    >
      {APPLICATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
