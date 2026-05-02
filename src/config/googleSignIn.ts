/**
 * Google Sign-In — OAuth client IDs from Google Cloud Console (APIs & Services → Credentials).
 *
 * Required: **Web application** client ID (used by the native SDK for `idToken` and by the backend to verify tokens).
 * Optional: **iOS** client ID if you configure without `GoogleService-Info.plist`, or to match your iOS OAuth client.
 *
 * Backend: set `GOOGLE_OAUTH_CLIENT_IDS` to a comma-separated list of the same Web + iOS + Android client IDs
 * whose tokens you accept (see `docs/google-sign-in-setup.md`).
 */
export const GOOGLE_WEB_CLIENT_ID = "";

/** Optional; leave empty if you use GoogleService-Info.plist for iOS. */
export const GOOGLE_IOS_CLIENT_ID = "";
