// CV file storage. In production (Vercel) files go to Vercel Blob as PRIVATE
// blobs — never reachable by URL, only read back server-side through the
// authenticated CV route. Locally, with no BLOB_READ_WRITE_TOKEN set, they're
// written to ./uploads so development needs no cloud account.
//
// Keys are stored on Candidate.cvFileUrl / Applicant.savedCvFileUrl, e.g.
// "<jobId>/<uuid>.pdf" or "applicants/<applicantId>/<uuid>.pdf".

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { get, put } from "@vercel/blob";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

function blobStorageEnabled(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) {
    // Vercel's filesystem is read-only and wiped between requests — writing
    // CVs to disk there would silently lose them.
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — connect a Vercel Blob store to this project.");
  }
  return false;
}

// Keys always use "/" — rows created on Windows before this module may hold
// "\" separators, which would be a different key in blob storage.
export function normalizeStorageKey(key: string): string {
  return key.replace(/\\/g, "/").replace(/^\/+/, "");
}

function localPath(key: string): string {
  const full = path.join(UPLOADS_ROOT, key);
  if (!full.startsWith(UPLOADS_ROOT + path.sep)) throw new Error("Invalid file key");
  return full;
}

export async function saveUpload(key: string, data: Buffer, contentType = "application/pdf"): Promise<string> {
  const normalized = normalizeStorageKey(key);
  if (blobStorageEnabled()) {
    await put(normalized, data, { access: "private", contentType, addRandomSuffix: false });
  } else {
    const full = localPath(normalized);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  return normalized;
}

// The file's bytes, or null if it doesn't exist.
export async function readUpload(key: string): Promise<Buffer | null> {
  const normalized = normalizeStorageKey(key);
  if (blobStorageEnabled()) {
    const result = await get(normalized, { access: "private" });
    if (!result?.stream) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  const full = localPath(normalized); // throws on keys escaping ./uploads
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}
