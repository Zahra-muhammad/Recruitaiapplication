import SalaryFields from "@/components/SalaryFields";
import BiasChecker from "@/components/BiasChecker";
import SalaryEstimateHint from "@/components/SalaryEstimateHint";
import { createJob } from "../actions";

export default function NewJobPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">New job posting</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Fields tailored to early-stage/founding hires, for any function — these drive candidate scoring.
      </p>

      <form action={createJob} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Job title
          </label>
          <input
            name="title"
            required
            placeholder="e.g. Founding Sales Lead, Software Engineer, Head of Marketing"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="What is this role, and what does success look like in the first 6 months?"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Location
            </label>
            <input
              name="location"
              placeholder="e.g. Remote, San Francisco (hybrid), London"
              defaultValue="Remote"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
            <p className="text-xs text-zinc-400 mt-1">
              Shown on the public job posting.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Seniority level
            </label>
            <select
              name="seniority"
              defaultValue="MID"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            >
              <option value="ENTRY">Entry-level</option>
              <option value="MID">Mid-level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
            <p className="text-xs text-zinc-400 mt-1">
              Used as a filter on the public job board.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Annual salary range
          </label>
          <SalaryFields />
          <SalaryEstimateHint />
          <p className="text-xs text-zinc-400 mt-1">
            Required — shown prominently on the posting. Most job seekers skip listings without pay.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Current stage
          </label>
          <select
            name="stage"
            defaultValue="pre_product"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          >
            <option value="pre_product">Pre-product</option>
            <option value="early_users">Early users</option>
            <option value="scaling">Scaling</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Key skills / requirements
          </label>
          <textarea
            name="keySkills"
            required
            rows={3}
            placeholder={"e.g. React, Node.js, AWS\n— or one requirement per line:\n3+ years running paid acquisition campaigns"}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Comma-separated skills, or one requirement per line. Used to score candidate CVs and to
            show applicants which requirements they match.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            What this person needs to own first
          </label>
          <textarea
            name="whatTheyOwnFirst"
            required
            rows={3}
            placeholder="e.g. Build the outbound sales pipeline from scratch, own our first 10 enterprise deals"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Additional stage context <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            name="stageContext"
            placeholder="e.g. seed-stage, 3 people, pre-Series A"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
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
