"use server";

import { AuthError } from "next-auth";
import { applicantSignIn } from "@/applicantAuth";

export async function applicantLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "") || "/my";

  try {
    await applicantSignIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      throw new Error("Invalid email or password.");
    }
    throw err;
  }
}
