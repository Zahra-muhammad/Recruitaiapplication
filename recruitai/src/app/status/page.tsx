import StatusLookupForm from "@/components/StatusLookupForm";
import { requestStatusLinks } from "./actions";

export default function CheckStatusPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">Check your application status</h1>
      <p className="text-sm text-zinc-500 mt-2">
        Enter the email you applied with and we&apos;ll send you private links to every
        application — no account needed.
      </p>
      <StatusLookupForm lookupAction={requestStatusLinks} />
    </div>
  );
}
