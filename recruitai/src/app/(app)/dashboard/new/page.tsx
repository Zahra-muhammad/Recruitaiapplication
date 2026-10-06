import NewJobForm from "@/components/NewJobForm";
import { createJob, importJobDescription } from "../actions";

// Reading an uploaded job description with AI can take ~30 seconds.
export const maxDuration = 120;

export default function NewJobPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">New job posting</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Fields tailored to early-stage/founding hires, for any function — these drive candidate scoring.
      </p>

      <NewJobForm createAction={createJob} importAction={importJobDescription} />
    </div>
  );
}
