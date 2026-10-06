const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

export function guessNameFromText(text: string): string | null {
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (!firstLine) return null;
  if (firstLine.length > 60) return null;
  if (firstLine.includes("@")) return null;
  if (/\d{3,}/.test(firstLine)) return null;

  return firstLine;
}

export function nameFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.pdf$/i, "");
  const spaced = withoutExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
