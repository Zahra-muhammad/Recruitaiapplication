import { randomBytes } from "crypto";

// Secret for the public /applications/[token] page. Possessing it is what
// proves someone is the applicant, so it must be unguessable (192 bits).
export function newStatusToken(): string {
  return randomBytes(24).toString("hex");
}
