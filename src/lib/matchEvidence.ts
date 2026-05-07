/** Multiple photos stored in `Match.evidenceUrl` as newline-separated `data:image/...` entries. */

export function parseEvidenceBlob(blob: string | null | undefined): string[] {
  if (!blob?.trim()) return [];
  return blob
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeEvidenceBlob(parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join("\n");
}
