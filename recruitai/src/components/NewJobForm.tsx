"use client";

import { useCallback, useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import SalaryFields from "@/components/SalaryFields";
import BiasChecker from "@/components/BiasChecker";
import SalaryEstimateHint from "@/components/SalaryEstimateHint";
import type { JobDraft } from "@/lib/jobImport";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400";

const MAX_JD_BYTES = 4 * 1024 * 1024;

export default function NewJobForm({
  createAction,
  importAction,
}: {
  createAction: (formData: FormData) => Promise<void>;
  importAction: (formData: FormData) => Promise<{ draft: JobDraft } | { error: string }>;
}) {
  const [draft, setDraft] = useState<JobDraft | null>(null);
  // Bumped on each import so the uncontrolled fields re-mount with the new values.
  const [version, setVersion] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();

  const onDrop = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setFileName(file.name);
      startImport(async () => {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const result = await importAction(fd);
          if ("error" in result) {
            setError(result.error);
          } else {
            setDraft(result.draft);
            setVersion((v) => v + 1);
          }
        } catch {
          setError("Couldn't read this job description. Please try again, or fill in the form by hand.");
        }
      });
    },
    [importAction]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const tooBig = rejections.some((r) => r.errors.some((e) => e.code === "file-too-large"));
      setError(tooBig ? "That file is over 4MB." : "Upload a single PDF or Word (.docx) file.");
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: MAX_JD_BYTES,
    multiple: false,
    disabled: importing,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-indigo-400 bg-indigo-50" : "border-zinc-300 bg-white hover:border-zinc-400"
        } ${importing ? "opacity-70 cursor-wait" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-zinc-800">
          {importing
            ? `Reading ${fileName ?? "job description"}…`
            : "Have a job description? Drop the PDF or Word file here to fill in the form"}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {importing
            ? "This takes about 15-30 seconds."
            : "Everything stays editable — review the fields before you create the job."}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {draft && !importing && (
        <div className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <p className="font-medium">Filled in from {fileName}. Please check every field before creating the job.</p>
          {draft.notes.length > 0 && (
            <ul className="mt-1 text-xs text-emerald-800 list-disc list-inside space-y-0.5">
              {draft.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form key={version} action={createAction} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Job title</label>
          <input
            name="title"
            required
            defaultValue={draft?.title}
            placeholder="e.g. Founding Sales Lead, Software Engineer, Head of Marketing"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
          <textarea
            name="description"
            required
            rows={draft ? 12 : 4}
            defaultValue={draft?.description}
            placeholder="What is this role, and what does success look like in the first 6 months?"
            className={inputClass}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Location</label>
            <input
              name="location"
              placeholder="e.g. Remote, San Francisco (hybrid), London"
              defaultValue={draft?.location ?? "Remote"}
              className={inputClass}
            />
            <p className="text-xs text-zinc-400 mt-1">Shown on the public job posting.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Seniority level</label>
            <select name="seniority" defaultValue={draft?.seniority ?? "MID"} className={`${inputClass} bg-white`}>
              <option value="ENTRY">Entry-level</option>
              <option value="MID">Mid-level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
            <p className="text-xs text-zinc-400 mt-1">Used as a filter on the public job board.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Annual salary range</label>
          <SalaryFields
            defaultMin={draft?.salaryMin}
            defaultMax={draft?.salaryMax}
            defaultCurrency={draft?.salaryCurrency}
          />
          <SalaryEstimateHint />
          <p className="text-xs text-zinc-400 mt-1">
            Required — shown prominently on the posting. Most job seekers skip listings without pay.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Current stage</label>
          <select name="stage" defaultValue={draft?.stage ?? "pre_product"} className={`${inputClass} bg-white`}>
            <option value="pre_product">Pre-product</option>
            <option value="early_users">Early users</option>
            <option value="scaling">Scaling</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Key skills / requirements</label>
          <textarea
            name="keySkills"
            required
            rows={draft ? 6 : 3}
            defaultValue={draft?.keySkills}
            placeholder={"e.g. React, Node.js, AWS\n— or one requirement per line:\n3+ years running paid acquisition campaigns"}
            className={inputClass}
          />
          <p className="text-xs text-zinc-400 mt-1">
            Comma-separated skills, or one requirement per line. Used to score candidate CVs and to
            show applicants which requirements they match.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">What this person needs to own first</label>
          <textarea
            name="whatTheyOwnFirst"
            required
            rows={draft ? 5 : 3}
            defaultValue={draft?.whatTheyOwnFirst}
            placeholder="e.g. Build the outbound sales pipeline from scratch, own our first 10 enterprise deals"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Additional stage context <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="stageContext"
            defaultValue={draft?.stageContext}
            placeholder="e.g. seed-stage, 3 people, pre-Series A"
            className={inputClass}
          />
        </div>

        <BiasChecker />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            Create job
          </button>
        </div>
      </form>
    </div>
  );
}
