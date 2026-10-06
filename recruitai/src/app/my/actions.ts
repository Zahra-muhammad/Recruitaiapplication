"use server";

import { applicantSignOut } from "@/applicantAuth";

export async function applicantSignOutAction() {
  await applicantSignOut({ redirectTo: "/apply-login" });
}
