// Thin wrapper around the Anthropic SDK for the scoring pipeline: one
// structured-output call per step, with every failure surfaced as an
// AiCallError (never swallowed into a default value).

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Override with SCORING_MODEL (e.g. "claude-sonnet-5-5" for lower cost).
export const SCORING_MODEL = process.env.SCORING_MODEL || "claude-opus-5-5";

export class AiCallError extends Error {}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiCallError("ANTHROPIC_API_KEY is not set — add it to .env locally and to Vercel's environment variables.");
  }
  // 2-minute cap per attempt; the SDK retries 429/5xx/network errors twice.
  client ??= new Anthropic({ timeout: 120_000, maxRetries: 2 });
  return client;
}

const debug = () => process.env.SCORING_DEBUG === "1";

export async function callStructured<S extends z.ZodType>(opts: {
  label: string;
  system: string;
  user: string;
  schema: S;
  effort: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const started = Date.now();
  if (debug()) console.info(`[ai:${opts.label}] system:\n${opts.system}\n[ai:${opts.label}] user:\n${opts.user}`);

  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: SCORING_MODEL,
      max_tokens: 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
      // If a safety classifier declines (unlikely for CVs), the API re-runs
      // the request on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    console.error(`[ai:${opts.label}] request failed after ${Date.now() - started}ms`, err);
    if (err instanceof Anthropic.AuthenticationError) throw new AiCallError("The Anthropic API key was rejected.");
    if (err instanceof Anthropic.RateLimitError) throw new AiCallError("The AI service is rate-limiting requests — retry in a minute.");
    if (err instanceof Anthropic.APIConnectionTimeoutError) throw new AiCallError("The AI service timed out.");
    if (err instanceof Anthropic.APIError) throw new AiCallError(`The AI service returned an error (${err.status ?? "network"}).`);
    throw new AiCallError("The AI response could not be read.");
  }

  const ms = Date.now() - started;
  console.info(
    `[ai:${opts.label}]`,
    JSON.stringify({ model: response.model, ms, stop: response.stop_reason, usage: response.usage })
  );
  if (debug()) {
    const raw = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    console.info(`[ai:${opts.label}] raw response:\n${raw}`);
  }

  if (response.stop_reason === "refusal") throw new AiCallError("The AI declined to assess this CV.");
  if (response.stop_reason === "max_tokens") throw new AiCallError("The AI response was cut off before it finished.");
  if (!response.parsed_output) throw new AiCallError("The AI returned a response that didn't match the expected format.");
  return response.parsed_output;
}
