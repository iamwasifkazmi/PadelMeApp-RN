/**
 * HTTPS origin used in shared invite links (Universal Links / Android App Links).
 * Keep in sync with:
 * - `android/app/src/main/AndroidManifest.xml` (https intent-filter `android:host`)
 * - `ios/PadelMeApp/PadelMeApp.entitlements` (`applinks:` entries)
 * - Your server: `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
 */
export const INVITE_WEB_ORIGIN = "https://mipadel.app";

export function inviteWebHostname(): string {
  try {
    return new URL(INVITE_WEB_ORIGIN).hostname;
  } catch {
    return "mipadel.app";
  }
}

/** Example: https://mipadel.app/invite/inv_abc */
export function buildWebInviteUrl(token: string): string {
  const base = INVITE_WEB_ORIGIN.replace(/\/$/, "");
  return `${base}/invite/${encodeURIComponent(token)}`;
}
