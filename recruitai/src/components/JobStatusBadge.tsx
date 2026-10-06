const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  CLOSED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export default function JobStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
