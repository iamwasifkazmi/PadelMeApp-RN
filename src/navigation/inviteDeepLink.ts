import { inviteWebHostname } from "../config/deepLinks";

/** Parse invite token from custom scheme, HTTPS invite URLs, ?token=, or /invite/ paths. */
export function parseInviteDeepLink(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  const q = trimmed.match(/[?&]token=([^&]+)/);
  if (q?.[1]) return decodeURIComponent(q[1]);

  try {
    const u = new URL(trimmed);
    if (
      (u.protocol === "mipadel:" || u.protocol === "padelme:") &&
      u.hostname === "invite" &&
      u.pathname.length > 1
    ) {
      return decodeURIComponent(u.pathname.replace(/^\//, ""));
    }
    const host = inviteWebHostname();
    if ((u.protocol === "https:" || u.protocol === "http:") && u.hostname === host) {
      const m = u.pathname.match(/^\/invite\/([^/]+)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
  } catch {
    // ignore
  }

  const seg = trimmed.match(/(?:^|\/)(?:invite)\/([^/?#]+)/i);
  if (seg?.[1]) return decodeURIComponent(seg[1]);

  return null;
}
