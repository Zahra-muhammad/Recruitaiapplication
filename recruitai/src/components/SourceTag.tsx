const SOURCE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  RECRUITER_UPLOADED: "Uploaded by recruiter",
};

const SOURCE_STYLES: Record<string, string> = {
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200",
  RECRUITER_UPLOADED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export default function SourceTag({ source }: { source: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
        SOURCE_STYLES[source] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"
      }`}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}
