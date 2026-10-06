"use client";

import { useCallback, useState, useTransition, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";

export interface QualificationResult {
  matched: string[];
  missing: string[];
  qualified: boolean;
  tips: string[];
}

// Matches serverActions.bodySizeLimit in next.config.ts (the CV is posted
// through a Server Action), leaving room for the other form fields.
const MAX_CV_BYTES = 3.8 * 1024 * 1024;

export interface ApplicantDefaults {
  name: string;
  email: string;
  phone: string;
  coverNote: string;
  hasSavedCv: boolean;
}

export default function ApplyGate({
  jobId,
  checkFitAction,
  applyAction,
  quickApplyAction,
  applicantDefaults,
}: {
  jobId: string;
  checkFitAction: (jobId: string, formData: FormData) => Promise<QualificationResult>;
  applyAction: (jobId: string, formData: FormData) => Promise<void>;
  quickApplyAction?: (jobId: string) => Promise<QualificationResult>;
  applicantDefaults?: ApplicantDefaults;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [useSavedCv, setUseSavedCv] = useState(applicantDefaults?.hasSavedCv ?? false);
  const [result, setResult] = useState<QualificationResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const [applying, startApplying] = useTransition();
  const [quickApplying, startQuickApplying] = useTransition();

  // Only resolves if they didn't pass the skill-match gate (on success the
  // server action redirects), so the result always renders as feedback.
  function handleQuickApply() {
    if (!quickApplyAction) return;
    setCheckError(null);
    setUseSavedCv(true);
    startQuickApplying(async () => {
      try {
        setResult(await quickApplyAction(jobId));
      } catch (err) {
        setCheckError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      setUseSavedCv(false);
      setResult(null);
      setCheckError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const tooBig = rejections.some((r) => r.errors.some((e) => e.code === "file-too-large"));
      setCheckError(tooBig ? "That PDF is over 4MB — please upload a smaller version." : "Please upload a single PDF file.");
    },
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_CV_BYTES,
    multiple: false,
    disabled: checking || applying,
  });

  function buildCvFormData(): FormData {
    const formData = new FormData();
    if (useSavedCv) {
      formData.set("useSavedCv", "true");
    } else if (file) {
      formData.set("cv", file);
    }
    return formData;
  }

  function handleCheck() {
    setCheckError(null);
    if (!file && !useSavedCv) {
      setCheckError("Please attach your CV as a PDF first.");
      return;
    }

    startChecking(async () => {
      try {
        const res = await checkFitAction(jobId, buildCvFormData());
        setResult(res);
      } catch (err) {
        setCheckError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  function handleApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApplyError(null);

    const formData = new FormData(e.currentTarget);
    if (useSavedCv) {
      formData.set("useSavedCv", "true");
    } else if (file) {
      formData.set("cv", file);
    }

    startApplying(async () => {
      try {
        await applyAction(jobId, formData);
      } catch (err) {
        setApplyError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  function resetCheck() {
    setFile(null);
    setResult(null);
    setCheckError(null);
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Check your fit to apply</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Drop your CV below. If you&apos;re a good match, you can apply right after — if not,
          we&apos;ll tell you what&apos;s missing.
        </p>
      </div>

      {checkError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {checkError}
        </div>
      )}

      {quickApplyAction && applicantDefaults?.hasSavedCv && !result && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-white">
            <p className="text-sm font-semibold">Apply in one click</p>
            <p className="text-xs text-white/80">
              Uses the CV and details saved on your profile — nothing to re-upload or retype.
            </p>
          </div>
          <button
            type="button"
            onClick={handleQuickApply}
            disabled={quickApplying || checking}
            className="shrink-0 bg-white text-blue-700 text-sm font-semibold rounded-md px-4 py-2 hover:bg-blue-50 transition-colors disabled:opacity-60"
          >
            {quickApplying ? "Applying…" : "⚡ Apply with my profile"}
          </button>
        </div>
      )}

      {applicantDefaults?.hasSavedCv && !result && (
        <label className="flex items-center gap-2 text-sm text-zinc-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useSavedCv}
            onChange={(e) => {
              setUseSavedCv(e.target.checked);
              if (e.target.checked) setFile(null);
            }}
            disabled={checking}
            className="accent-blue-600"
          />
          Use the CV saved on my profile
        </label>
      )}

      {!useSavedCv && !result && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-zinc-300 hover:border-zinc-400 bg-white"
          } ${checking ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <p className="text-sm font-medium text-zinc-700">
            {file
              ? `Selected: ${file.name}`
              : isDragActive
              ? "Drop your CV here"
              : "Drag & drop your CV (PDF), or click to select"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">PDF only, one file.</p>
        </div>
      )}

      {!result && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking || (!file && !useSavedCv)}
            className="bg-blue-600 text-white text-sm font-medium rounded-md px-5 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {checking ? "Checking…" : "Check my fit"}
          </button>
        </div>
      )}

      {result && !result.qualified && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              You&apos;re not quite matching this role&apos;s requirements yet.
            </p>
          </div>

          {result.matched.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-emerald-700 mb-1.5">Skills you match</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.matched.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-1"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-amber-700 mb-1.5">
                Skills this role is looking for that aren&apos;t on your CV
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.missing.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-1"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-zinc-900 mb-1.5">
              How to improve your CV for this role
            </h3>
            <ul className="text-sm text-zinc-600 space-y-1.5 list-disc list-inside">
              {result.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={resetCheck}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Try again with an updated CV
          </button>
        </div>
      )}

      {result && result.qualified && (
        <div className="space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
            <p className="text-sm font-medium text-emerald-900">
              ✓ You&apos;re a good match for this role — you can apply below.
            </p>
          </div>

          {result.matched.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-emerald-700 mb-1.5">Skills you match</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.matched.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-1"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missing.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-amber-700 mb-1.5">
                Also listed for this role, but not found on your CV
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.missing.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-1"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">
                If you do have experience with these, mention it in your cover note.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={resetCheck}
            className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
          >
            Use a different CV
          </button>

          <form onSubmit={handleApply} className="pt-4 border-t border-zinc-200 space-y-5">
            <h3 className="text-base font-semibold text-zinc-900">Apply now</h3>

            {applyError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {applyError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Full name</label>
                <input
                  name="name"
                  required
                  defaultValue={applicantDefaults?.name}
                  disabled={applying}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={applicantDefaults?.email}
                  disabled={applying}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Phone <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={applicantDefaults?.phone}
                  disabled={applying}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Qualifications{" "}
                <span className="text-zinc-400 font-normal">(optional — list any you have)</span>
              </label>
              <textarea
                name="qualifications"
                rows={3}
                disabled={applying}
                placeholder="Degrees, certifications, years of relevant experience, licenses, etc."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Cover note <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="coverNote"
                rows={3}
                defaultValue={applicantDefaults?.coverNote}
                disabled={applying}
                placeholder="Anything you'd like us to know?"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={applying}
                className="bg-blue-600 text-white text-sm font-medium rounded-md px-5 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {applying ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
