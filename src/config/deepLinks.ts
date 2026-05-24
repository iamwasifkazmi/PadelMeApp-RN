import { APP_ORIGIN, INVITE_LINK_ORIGIN } from "./domain";

/**
 * HTTPS origin used in shared invite links (Universal Links / Android App Links).
 * Keep in sync with:
 * - `android/app/src/main/AndroidManifest.xml` (https intent-filter `android:host`)
 * - `ios/PadelMeApp/PadelMeApp.entitlements` (`applinks:` entries)
 * - Backend `GET /.well-known/apple-app-site-association` on the same host
 */
export const INVITE_WEB_ORIGIN = INVITE_LINK_ORIGIN;

/** All hosts that may carry `/invite/:token` deep links. */
export function inviteWebHostnames(): string[] {
  const hosts = new Set<string>();
  for (const origin of [INVITE_WEB_ORIGIN, APP_ORIGIN]) {
    try {
      hosts.add(new URL(origin).hostname);
    } catch {
      /* ignore */
    }
  }
  return [...hosts];
}

/** Primary host for parsers (first configured origin). */
export function inviteWebHostname(): string {
  const list = inviteWebHostnames();
  if (list.length) return list[0];
  try {
    return new URL(INVITE_WEB_ORIGIN).hostname;
  } catch {
    return "api.mipadel.co.uk";
  }
}

/** Example: https://…/invite/inv_abc */
export function buildWebInviteUrl(token: string): string {
  const base = INVITE_WEB_ORIGIN.replace(/\/$/, "");
  return `${base}/invite/${encodeURIComponent(token)}`;
}
