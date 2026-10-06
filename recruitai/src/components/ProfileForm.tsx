"use client";

import { useCallback, useState, useTransition, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";

export interface ProfileDefaults {
  name: string;
  phone: string;
  headline: string;
  skills: string;
  linkedinUrl: string;
  portfolioUrl: string;
  seniority: string;
  location: string;
  desiredTitle: string;
  yearsOfExperience: string;
  workAuthorization: string;
  remotePreference: string;
  noticePeriod: string;
  salaryExpectation: string;
  savedCoverNote: string;
  hasSavedCv: boolean;
}

export default function ProfileForm({
  defaults,
  updateProfileAction,
}: {
  defaults: ProfileDefaults;
  updateProfileAction: (formData: FormData) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
      setSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    multiple: false,
    disabled: pending,
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    if (file) formData.set("cv", file);

    startTransition(async () => {
      try {
        await updateProfileAction(formData);
        setSuccess(true);
        setFile(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5"
    >
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
          Profile saved.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Full name</label>
          <input
            name="name"
            required
            defaultValue={defaults.name}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Phone <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            defaultValue={defaults.phone}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Headline <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <input
          name="headline"
          defaultValue={defaults.headline}
          disabled={pending}
          placeholder="e.g. Senior Product Designer"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Skills <span className="text-zinc-400 font-normal">(optional, comma-separated)</span>
          </label>
          <input
            name="skills"
            defaultValue={defaults.skills}
            disabled={pending}
            placeholder="e.g. Figma, React, SQL"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Experience level <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            name="seniority"
            defaultValue={defaults.seniority}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">Prefer not to say</option>
            <option value="ENTRY">Entry-level</option>
            <option value="MID">Mid-level</option>
            <option value="SENIOR">Senior</option>
            <option value="LEAD">Lead</option>
            <option value="EXECUTIVE">Executive</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            LinkedIn <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="linkedinUrl"
            defaultValue={defaults.linkedinUrl}
            disabled={pending}
            placeholder="https://linkedin.com/in/…"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Portfolio / website <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="portfolioUrl"
            defaultValue={defaults.portfolioUrl}
            disabled={pending}
            placeholder="https://…"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Location <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="location"
            defaultValue={defaults.location}
            disabled={pending}
            placeholder="e.g. Dubai, UAE"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Years of experience <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="yearsOfExperience"
            type="number"
            min={0}
            defaultValue={defaults.yearsOfExperience}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Desired job title <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <input
          name="desiredTitle"
          defaultValue={defaults.desiredTitle}
          disabled={pending}
          placeholder="What role are you looking for?"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Remote preference <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            name="remotePreference"
            defaultValue={defaults.remotePreference}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">Prefer not to say</option>
            <option value="REMOTE_ONLY">Remote only</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ON_SITE">On-site</option>
            <option value="FLEXIBLE">Flexible</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Notice period <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            name="noticePeriod"
            defaultValue={defaults.noticePeriod}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">Prefer not to say</option>
            <option value="IMMEDIATE">Immediately available</option>
            <option value="TWO_WEEKS">2 weeks</option>
            <option value="ONE_MONTH">1 month</option>
            <option value="MORE_THAN_ONE_MONTH">More than 1 month</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Work authorization <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            name="workAuthorization"
            defaultValue={defaults.workAuthorization}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">Prefer not to say</option>
            <option value="AUTHORIZED">Authorized, no sponsorship needed</option>
            <option value="REQUIRES_SPONSORSHIP">Requires visa sponsorship</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Salary expectation <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="salaryExpectation"
            defaultValue={defaults.salaryExpectation}
            disabled={pending}
            placeholder="e.g. $90k–110k"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Saved CV (PDF or Word) <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-blue-200 hover:border-blue-300 bg-white"
          } ${pending ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <p className="text-sm font-medium text-zinc-700">
            {file
              ? `Selected: ${file.name}`
              : isDragActive
              ? "Drop your CV here"
              : "Drag & drop a CV (PDF or Word), or click to select"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {defaults.hasSavedCv
              ? "✓ You already have a CV on file — upload a new one to replace it."
              : "Save a CV once, then reuse it to apply faster."}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Default cover note <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          name="savedCoverNote"
          rows={4}
          defaultValue={defaults.savedCoverNote}
          disabled={pending}
          placeholder="A short note you can reuse across applications."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 text-white text-sm font-medium rounded-md px-5 py-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
