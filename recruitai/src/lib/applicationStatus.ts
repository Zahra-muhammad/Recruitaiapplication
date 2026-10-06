export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  IN_REVIEW: "In review",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer extended",
  HIRED: "Hired",
  NOT_MOVING_FORWARD: "Not moving forward",
};

export const APPLICATION_STATUS_STYLES: Record<string, string> = {
  RECEIVED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  INTERVIEWING: "bg-violet-50 text-violet-700 border-violet-200",
  OFFER: "bg-blue-50 text-blue-700 border-blue-200",
  HIRED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_MOVING_FORWARD: "bg-red-50 text-red-700 border-red-200",
};

export const APPLICATION_STATUS_ORDER = [
  "RECEIVED",
  "IN_REVIEW",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "NOT_MOVING_FORWARD",
] as const;

// The "happy path" stages shown as a progress stepper to applicants.
// NOT_MOVING_FORWARD is a terminal state shown separately, not a step.
export const APPLICATION_PROGRESS_STEPS = [
  "RECEIVED",
  "IN_REVIEW",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
] as const;
