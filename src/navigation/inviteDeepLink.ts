import { inviteWebHostnames } from "../config/deepLinks";

function isInviteWebHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (inviteWebHostnames().some((known) => known.toLowerCase() === h)) return true;
  /** Cloud Run custom domains end with .run.app */
  return h.endsWith(".run.app");
}

/** Google OAuth returns via com.googleusercontent.apps.* — not an invite link. */
export function isGoogleSignInCallbackUrl(url: string): boolean {
  return /^com\.googleusercontent\.apps[\w-]*:/i.test(url.trim());
}

/** Parse invite token from custom scheme, HTTPS invite URLs, ?token=, or /invite/ paths. */
export function parseInviteDeepLink(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (isGoogleSignInCallbackUrl(trimmed)) return null;

  try {
    const u = new URL(trimmed);
    if (
      (u.protocol === "mipadel:" || u.protocol === "padelme:") &&
      u.hostname === "invite" &&
      u.pathname.length > 1
    ) {
      return decodeURIComponent(u.pathname.replace(/^\//, ""));
    }
    if ((u.protocol === "https:" || u.protocol === "http:") && isInviteWebHost(u.hostname)) {
      const m = u.pathname.match(/^\/invite\/([^/]+)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
      const q = u.searchParams.get("token");
      if (q) return decodeURIComponent(q);
    }
  } catch {
    // ignore
  }

  const seg = trimmed.match(/(?:^|\/)(?:invite)\/([^/?#]+)/i);
  if (seg?.[1]) return decodeURIComponent(seg[1]);

  return null;
}
