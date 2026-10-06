"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

interface UploadResult {
  fileName: string;
  status: "ok" | "error";
  error?: string;
}

export default function CvUploadDropzone({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setResults(null);

      const formData = new FormData();
      for (const file of acceptedFiles) {
        formData.append("files", file);
      }

      try {
        const res = await fetch(`/api/jobs/${jobId}/candidates`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        router.refresh();
      } catch {
        setResults([{ fileName: "Upload", status: "error", error: "Network error" }]);
      } finally {
        setUploading(false);
      }
    },
    [jobId, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-300 hover:border-zinc-400 bg-white"
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-zinc-700">
          {uploading
            ? "Uploading and scoring…"
            : isDragActive
            ? "Drop PDFs here"
            : "Drag & drop CVs (PDF), or click to browse"}
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Multiple files supported — each will be parsed, scored, and ranked automatically.
        </p>
      </div>

      {results && results.length > 0 && (
        <div className="mt-3 space-y-1">
          {results.map((r, i) => (
            <div
              key={i}
              className={`text-xs rounded-md px-3 py-1.5 border ${
                r.status === "ok"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-700 border-red-100"
              }`}
            >
              {r.status === "ok" ? "✓" : "✗"} {r.fileName}
              {r.error ? ` — ${r.error}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
